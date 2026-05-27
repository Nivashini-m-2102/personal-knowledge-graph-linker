const { cosineSimilarity } = require('./embeddingService');

function buildRelationEdges(labels, embeddings, hierarchy) {

  const edges = [];
  const nodes = hierarchy.nodes;

  /* ---------------- 1. TREE EDGES ---------------- */
  Object.values(nodes).forEach(n => {
    if (n.parent) {
      edges.push({
        from: n.parent,
        to: n.label,
        label: "hierarchy"
      });
    }
  });

  /* ---------------- 2. SEMANTIC LINKS ---------------- */
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {

      const a = labels[i];
      const b = labels[j];

      const sim = cosineSimilarity(embeddings[i], embeddings[j]);

      if (sim > 0.75) {
        edges.push({
          from: a,
          to: b,
          label: "related"
        });
      }
    }
  }

  /* ---------------- 3. REMOVE DUPLICATES ---------------- */
  const seen = new Set();

  return edges.filter(e => {
    const key = `${e.from}-${e.to}-${e.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = { buildRelationEdges };