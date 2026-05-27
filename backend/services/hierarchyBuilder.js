const { cosineSimilarity } = require('./embeddingService');

function buildHierarchy(labels, embeddings) {
  const nodes = {};

  // INIT
  labels.forEach(label => {
    nodes[label] = {
      label,
      parent: null,
      children: [],
      depth: 0,
      clusterId: -1,
      importance: 1,
      type: "related"
    };
  });

  /* ---------------- STEP 1: PARENT DETECTION ---------------- */
  for (let i = 0; i < labels.length; i++) {
    for (let j = 0; j < labels.length; j++) {

      if (i === j) continue;

      const a = labels[i];
      const b = labels[j];

      const sim = cosineSimilarity(embeddings[i], embeddings[j]);

      // RULE 1: substring (VERY STRONG)
      if (b.includes(a) && b.length > a.length) {
        nodes[b].parent = a;
      }

      // RULE 2: semantic similarity
      if (sim > 0.72) {
        if (a.split(" ").length < b.split(" ").length) {
          nodes[b].parent = a;
        }
      }
    }
  }

  /* ---------------- STEP 2: CHILD LINK ---------------- */
  Object.values(nodes).forEach(n => {
    if (n.parent && nodes[n.parent]) {
      nodes[n.parent].children.push(n.label);
    }
  });

  /* ---------------- STEP 3: DEPTH ASSIGN ---------------- */
  function setDepth(label, depth) {
    nodes[label].depth = depth;
    nodes[label].children.forEach(child => setDepth(child, depth + 1));
  }

  Object.values(nodes).forEach(n => {
    if (!n.parent) setDepth(n.label, 0);
  });

  /* ---------------- STEP 4: TYPE ---------------- */
  Object.values(nodes).forEach(n => {
    if (n.depth === 0) n.type = "main";
    else if (n.depth === 1) n.type = "sub";
    else n.type = "related";
  });

  /* ---------------- STEP 5: IMPORTANCE ---------------- */
  Object.values(nodes).forEach(n => {
    n.importance = 1 + n.children.length * 0.5;
  });

  /* ---------------- STEP 6: CLUSTER ---------------- */
  let clusterId = 0;

  Object.values(nodes).forEach(n => {
    if (n.depth === 0) {
      assignCluster(n.label, clusterId);
      clusterId++;
    }
  });

  function assignCluster(label, id) {
    nodes[label].clusterId = id;
    nodes[label].children.forEach(child => assignCluster(child, id));
  }

  return { nodes };
}

module.exports = { buildHierarchy };