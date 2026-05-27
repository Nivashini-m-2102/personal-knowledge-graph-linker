const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Node = require('../models/Node');
const Edge = require('../models/Edge');
const generateLearningPath = require('../services/learningPath');

function edgeWeight(label) {
  if (label === 'strong') return 3;
  if (label === 'structure') return 2;
  return 1;
}

function normalizeId(id) {
  return id.toString();
}

function detectCommunities(nodes, edges) {
  const nodeIds = nodes.map((n) => normalizeId(n._id));
  const cluster = {};
  const neighbors = nodeIds.reduce((map, id) => {
    map[id] = {};
    return map;
  }, {});

  edges.forEach((edge) => {
    const from = normalizeId(edge.from);
    const to = normalizeId(edge.to);
    const weight = edgeWeight(edge.label);
    if (!neighbors[from] || !neighbors[to]) return;

    neighbors[from][to] = (neighbors[from][to] || 0) + weight;
    neighbors[to][from] = (neighbors[to][from] || 0) + weight;
  });

  nodeIds.forEach((id) => {
    cluster[id] = id;
  });

  for (let iter = 0; iter < 5; iter += 1) {
    let changed = false;
    for (const nodeId of nodeIds) {
      const scores = {};
      Object.entries(neighbors[nodeId]).forEach(([neighborId, weight]) => {
        const neighborCluster = cluster[neighborId];
        scores[neighborCluster] = (scores[neighborCluster] || 0) + weight;
      });

      const bestCluster = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
      if (bestCluster && bestCluster[0] !== cluster[nodeId]) {
        cluster[nodeId] = bestCluster[0];
        changed = true;
      }
    }
    if (!changed) break;
  }

  const componentIndex = {};
  let nextClusterId = 1;
  Object.values(cluster).forEach((clusterName) => {
    if (componentIndex[clusterName] === undefined) {
      componentIndex[clusterName] = nextClusterId;
      nextClusterId += 1;
    }
  });

  const result = {};
  Object.entries(cluster).forEach(([nodeId, groupName]) => {
    result[nodeId] = componentIndex[groupName];
  });

  return result;
}

function nodesConnectedByEdges(edges) {
  const ids = new Set();
  edges.forEach((edge) => {
    ids.add(normalizeId(edge.from));
    ids.add(normalizeId(edge.to));
  });
  return ids;
}

// @route GET /api/graph
router.get('/', protect, async (req, res) => {
  try {
    const nodes = await Node.find({ user: req.user._id });
    const edges = await Edge.find({ user: req.user._id });

    const connectedIds = nodesConnectedByEdges(edges);
    const filteredNodes = nodes.filter((node) => connectedIds.has(normalizeId(node._id)) || node.type === 'main');
    const nodeSet = new Set(filteredNodes.map((node) => normalizeId(node._id)));
    const filteredEdges = edges.filter((edge) => nodeSet.has(normalizeId(edge.from)) && nodeSet.has(normalizeId(edge.to)));

    const communityMap = detectCommunities(filteredNodes, filteredEdges);

    const visNodes = filteredNodes.map((n) => ({
      id: n._id.toString(),
      label: n.label,
      title: n.description || n.label,
      group: `cluster-${communityMap[n._id.toString()] || 0}`,
      type: n.type,
      score: n.score || 1,
      importance: n.importance || 1,
      domain: n.domain || 'General',
      prerequisites: n.prerequisites || []
    }));

    const visEdges = filteredEdges.map((e) => ({
      id: e._id.toString(),
      from: e.from.toString(),
      to: e.to.toString(),
      label: e.label,
      arrows: 'to',
      width: edgeWeight(e.label),
      length: e.label === 'strong' ? 140 : e.label === 'structure' ? 180 : 240,
      color: e.label === 'strong' ? '#ffffff' : e.label === 'context' ? '#8b8b8b' : '#a3bffa'
    }));

    const learningPath = generateLearningPath(visNodes);

    const clusters = {};
    filteredNodes.forEach((node) => {
      const clusterId = communityMap[node._id.toString()] || 0;
      clusters[clusterId] = clusters[clusterId] || [];
      clusters[clusterId].push(node.label);
    });

    res.json({ nodes: visNodes, edges: visEdges, learningPath, clusters });
  } catch (error) {
    console.error('Graph Route Error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
