const Node = require('../models/Node');
const { createEdgeSafe } = require('./edgeBuilder');
const { buildHierarchy } = require('./hierarchyBuilder');
const { buildRelationEdges } = require('./relationExtractor');
const { embedTexts } = require('./embeddingService');

const ACRONYMS = new Set(['CPU','GPU','OS','API','DBMS','SQL','HTTP','TCP','UDP','RAM','ROM','AI','ML','NLP','JSON','XML','UX','UI']);

function normalizeLabel(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(label) {
  return label
    .split(' ')
    .map((word) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function detectDomain(label) {
  const text = label.toLowerCase();
  if (/\b(operating system|cpu scheduling|process management|memory management|file system|kernel|thread|deadlock|virtual memory|os)\b/.test(text)) {
    return 'OS';
  }
  if (/\b(machine learning|supervised learning|unsupervised learning|classification|regression|neural network|deep learning|algorithm|model)\b/.test(text)) {
    return 'ML';
  }
  if (/\b(database|dbms|sql|transaction|normalization|indexing|query|table)\b/.test(text)) {
    return 'DBMS';
  }
  if (/\b(network|tcp|ip|routing|protocol|packet|socket|http|udp)\b/.test(text)) {
    return 'Networking';
  }
  return 'General';
}

function createDescription(label, type, domain, parent) {
  const base =
    type === 'main'
      ? `Core concept: ${label}. This is a central topic in your semantic knowledge graph.`
      : type === 'sub'
      ? `Support concept: ${label}. This builds on a main topic and structures the learning path.`
      : `Related concept: ${label}. This is contextually connected to the graph cluster.`;

  const parentText = parent ? ` It is connected to ${titleCase(parent)} as part of the learning hierarchy.` : '';
  return `${base} Domain: ${domain}.${parentText}`;
}

async function buildGraph(userId, concepts, sourceFile) {
  const labels = Array.from(new Set((concepts.labels || []).map((label) => normalizeLabel(label)))).filter(Boolean);
  if (!labels.length) return false;

  const embeddings = await embedTexts(labels);
  const hierarchy = buildHierarchy(labels, embeddings, concepts.sectionMap || {});
  const edges = buildRelationEdges(labels, embeddings, hierarchy, concepts.sentencesMap || {}, concepts.sentenceExamples || {});
  const nodeMap = new Map();

  for (const rawLabel of labels) {
    const formatted = titleCase(rawLabel);
    const metadata = hierarchy.nodes[rawLabel] || { type: 'related', importance: 1, parent: null };
    const type = metadata.type;
    const score = Math.max(1, Math.round(metadata.importance * 2));
    const domain = detectDomain(rawLabel);
    const description = createDescription(formatted, type, domain, metadata.parent);
    const contextSentences = Object.keys(concepts.sentenceExamples || {}).includes(rawLabel)
      ? [concepts.sentenceExamples[rawLabel]]
      : [];

    let node = await Node.findOne({ user: userId, label: formatted });

    if (!node) {
      node = await Node.create({
        user: userId,
        label: formatted,
        type,
        description,
        sourceFile,
        score,
        importance: metadata.importance,
        domain,
        prerequisites: metadata.parent ? [titleCase(metadata.parent)] : [],
        contextSentences
      });
    } else {
      const changed =
        node.type !== type ||
        node.score !== score ||
        node.description !== description ||
        node.importance !== metadata.importance ||
        node.domain !== domain ||
        node.sourceFile !== sourceFile ||
        JSON.stringify(node.contextSentences || []) !== JSON.stringify(contextSentences);

      if (changed) {
        node.type = type;
        node.description = description;
        node.score = score;
        node.importance = metadata.importance;
        node.domain = domain;
        node.sourceFile = sourceFile;
        node.prerequisites = metadata.parent ? [titleCase(metadata.parent)] : [];
        node.contextSentences = contextSentences;
        await node.save();
      }
    }

    nodeMap.set(rawLabel, node._id);
  }

  for (const edge of edges) {
    await createEdgeSafe(userId, nodeMap, edge.from, edge.to, edge.label);
  }

  return true;
}

module.exports = buildGraph;