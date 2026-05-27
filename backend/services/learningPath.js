function generateLearningPath(nodes) {
  const nodeMap = new Map(nodes.map((n) => [n.label, n]));
  const graph = new Map();
  const indegree = new Map();

  nodes.forEach((node) => {
    graph.set(node.label, []);
    indegree.set(node.label, 0);
  });

  nodes.forEach((node) => {
    const prereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
    prereqs.forEach((req) => {
      if (nodeMap.has(req)) {
        graph.get(req).push(node.label);
        indegree.set(node.label, (indegree.get(node.label) || 0) + 1);
      }
    });
  });

  const typeOrder = { main: 0, sub: 1, related: 2 };
  const queue = nodes
    .filter((node) => (indegree.get(node.label) || 0) === 0)
    .sort((a, b) => {
      const typeDiff = (typeOrder[a.type] || 3) - (typeOrder[b.type] || 3);
      if (typeDiff !== 0) return typeDiff;
      return (b.importance || b.score || 0) - (a.importance || a.score || 0);
    })
    .map((node) => node.label);

  const path = [];
  const queueItems = [...queue];

  while (queueItems.length > 0) {
    const current = queueItems.shift();
    path.push(current);

    graph.get(current).forEach((neighbor) => {
      indegree.set(neighbor, indegree.get(neighbor) - 1);
      if (indegree.get(neighbor) === 0) {
        queueItems.push(neighbor);
      }
    });
  }

  const missing = nodes.filter((node) => !path.includes(node.label));
  if (missing.length) {
    const fallback = missing
      .sort((a, b) => {
        const typeDiff = (typeOrder[a.type] || 3) - (typeOrder[b.type] || 3);
        if (typeDiff !== 0) return typeDiff;
        return (b.importance || b.score || 0) - (a.importance || a.score || 0);
      })
      .map((node) => node.label);
    fallback.forEach((label) => path.push(label));
  }

  return path.map((label, index) => {
    const node = nodeMap.get(label) || {};
    if (index === 0) return `Start with ${label}`;
    if (node.type === 'related') return `Finally explore ${label}`;
    return `Then learn ${label}`;
  });
}

module.exports = generateLearningPath;