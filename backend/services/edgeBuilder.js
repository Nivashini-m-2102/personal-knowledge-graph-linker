const Edge = require('../models/Edge');
const Node = require('../models/Node');

function normalizeLabel(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordSet(label) {
  return new Set(normalizeLabel(label).split(' ').filter(Boolean));
}

function jaccardSimilarity(a, b) {
  const A = wordSet(a);
  const B = wordSet(b);
  const union = new Set([...A, ...B]);
  if (!union.size) return 0;

  let intersection = 0;
  for (const token of A) {
    if (B.has(token)) intersection += 1;
  }

  return intersection / union.size;
}

function sentenceOverlapScore(a, b, sentencesMap) {
  const aIndex = new Set(sentencesMap[a] || []);
  const bIndex = sentencesMap[b] || [];
  if (!aIndex.size || !bIndex.length) return 0;

  let overlap = 0;
  for (const idx of bIndex) {
    if (aIndex.has(idx)) overlap += 1;
  }

  return overlap;
}

function containsConcept(a, b) {
  const A = wordSet(a);
  const B = wordSet(b);
  if (!B.size) return false;
  return [...B].every((token) => A.has(token));
}

async function createEdgeSafe(userId, nodeMap, fromLabel, toLabel, labelStr) {
  if (fromLabel === toLabel) return;
  const from = nodeMap.get(fromLabel);
  const to = nodeMap.get(toLabel);
  if (!from || !to) return;

  const exists = await Edge.findOne({
    user: userId,
    $or: [
      { from, to },
      { from: to, to: from }
    ]
  });
  
  if (exists) return;

  await Edge.create({ user: userId, from, to, label: labelStr });
}

function calculateScore(a, b, sentencesMap) {
  const similarity = jaccardSimilarity(a, b);
  const overlap = sentenceOverlapScore(a, b, sentencesMap);
  const containment = containsConcept(a, b) || containsConcept(b, a);
  return (similarity * 5) + (overlap * 2) + (containment ? 3 : 0);
}

async function buildStructuredEdges(userId, nodeMap, concepts, sentencesMap = {}) {
  const { main, sub, related } = concepts;
  const selectedEdges = [];
  const degrees = new Map([...main, ...sub, ...related].map(label => [label, 0]));

  // 1. Connect Main nodes to each other if they are highly similar
  for (let i = 0; i < main.length; i++) {
    for (let j = i + 1; j < main.length; j++) {
      const score = calculateScore(main[i], main[j], sentencesMap);
      if (score > 3) {
        selectedEdges.push({ from: main[i], to: main[j], label: 'related_core' });
        degrees.set(main[i], degrees.get(main[i]) + 1);
        degrees.set(main[j], degrees.get(main[j]) + 1);
      }
    }
  }

  // 2. Connect each Sub node to the BEST matching Main node
  for (const s of sub) {
    let bestMain = null;
    let bestScore = -1;
    for (const m of main) {
      const score = calculateScore(s, m, sentencesMap);
      if (score > bestScore) {
        bestScore = score;
        bestMain = m;
      }
    }
    if (bestMain && bestScore > 0) {
      selectedEdges.push({ from: bestMain, to: s, label: 'supports' });
      degrees.set(bestMain, degrees.get(bestMain) + 1);
      degrees.set(s, degrees.get(s) + 1);
    } else if (main.length > 0) {
       selectedEdges.push({ from: main[0], to: s, label: 'supports' });
       degrees.set(main[0], degrees.get(main[0]) + 1);
       degrees.set(s, degrees.get(s) + 1);
    }
  }

  // 3. Connect each Related node to the BEST matching Sub node (or Main node)
  for (const r of related) {
    let bestTarget = null;
    let bestScore = -1;

    for (const s of sub) {
      const score = calculateScore(r, s, sentencesMap);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = s;
      }
    }
    
    for (const m of main) {
      const score = calculateScore(r, m, sentencesMap) * 0.8;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = m;
      }
    }

    if (bestTarget && bestScore > 0) {
      selectedEdges.push({ from: bestTarget, to: r, label: 'context' });
      degrees.set(bestTarget, degrees.get(bestTarget) + 1);
      degrees.set(r, degrees.get(r) + 1);
    }
  }

  // 4. Create the selected edges in DB
  for (const edge of selectedEdges) {
    await createEdgeSafe(userId, nodeMap, edge.from, edge.to, edge.label);
  }

  // 5. Prune isolated nodes (nodes with 0 degree)
  for (const s of sub) {
    if (degrees.get(s) === 0) {
      const nodeId = nodeMap.get(s);
      if (nodeId) await Node.findByIdAndDelete(nodeId);
    }
  }
  for (const r of related) {
    if (degrees.get(r) === 0) {
      const nodeId = nodeMap.get(r);
      if (nodeId) await Node.findByIdAndDelete(nodeId);
    }
  }
}

module.exports = {
  buildStructuredEdges,
  createEdgeSafe
};
