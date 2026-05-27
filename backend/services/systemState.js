const Node = require('../models/Node');
const Edge = require('../models/Edge');
const Progress = require('../models/Progress');

class SystemState {
  static async loadUserState(userId) {
    try {
      const [nodes, edges, progress] = await Promise.all([
        Node.find({ user: userId }),
        Edge.find({ user: userId }),
        Progress.findOne({ user: userId })
      ]);

      const nodeSet = new Set(nodes.map((n) => n._id.toString()));
      const validEdges = edges.filter((e) => nodeSet.has(e.from.toString()) && nodeSet.has(e.to.toString()));

      const connectedNodeIds = new Set();
      validEdges.forEach((edge) => {
        connectedNodeIds.add(edge.from.toString());
        connectedNodeIds.add(edge.to.toString());
      });

      const connectedNodes = nodes.filter((n) => connectedNodeIds.has(n._id.toString()));
      const mainNodes = nodes.filter((n) => n.type === 'main');
      const allConnectedIds = new Set([...connectedNodeIds, ...mainNodes.map((n) => n._id.toString())]);
      const validNodes = nodes.filter((n) => allConnectedIds.has(n._id.toString()));

      const nodesById = {};
      validNodes.forEach((node) => {
        nodesById[node._id.toString()] = {
          id: node._id.toString(),
          label: node.label,
          type: node.type,
          description: node.description,
          score: node.score || 1
        };
      });

      const edgesByNode = {};
      validEdges.forEach((edge) => {
        const fromId = edge.from.toString();
        const toId = edge.to.toString();

        if (!edgesByNode[fromId]) edgesByNode[fromId] = [];
        if (!edgesByNode[toId]) edgesByNode[toId] = [];

        edgesByNode[fromId].push({ to: toId, label: edge.label });
        edgesByNode[toId].push({ to: fromId, label: edge.label });
      });

      const completed = progress?.completed || [];
      const completedNormalized = new Set(completed.map((c) => c.toLowerCase()));

      const quizScores = progress?.quizScores ? Object.fromEntries(progress.quizScores) : {};
      const conceptAccuracy = progress?.conceptAccuracy ? Object.fromEntries(progress.conceptAccuracy) : {};

      const totalConcepts = validNodes.length;
      const completedCount = validNodes.filter((n) => completedNormalized.has(n.label.toLowerCase())).length;
      const progressPercentage = totalConcepts > 0 ? Math.round((completedCount / totalConcepts) * 100) : 0;

      const weakTopics = Object.keys(conceptAccuracy)
        .map((concept) => ({
          concept,
          accuracy: conceptAccuracy[concept]
        }))
        .filter((item) => item.accuracy < 60)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 5);

      return {
        userId,
        nodes: validNodes,
        nodesById,
        edges: validEdges,
        edgesByNode,
        completed,
        completedNormalized,
        quizScores,
        conceptAccuracy,
        progressPercentage,
        completedCount,
        totalConcepts,
        weakTopics
      };
    } catch (error) {
      console.error('Error loading system state:', error);
      throw error;
    }
  }

  static getNodeNeighbors(nodeId, state) {
    const neighbors = [];
    const edges = state.edgesByNode[nodeId] || [];

    edges.forEach((edge) => {
      const neighbor = state.nodesById[edge.to];
      if (neighbor) {
        neighbors.push({
          ...neighbor,
          edgeLabel: edge.label
        });
      }
    });

    return neighbors;
  }

  static findNodeByLabel(label, state) {
    const normalized = label.toLowerCase().trim();
    return state.nodes.find((n) => n.label.toLowerCase() === normalized);
  }

  static getClusterNodes(nodeId, state, maxDistance = 2) {
    const visited = new Set();
    const cluster = [];
    const queue = [{ id: nodeId, distance: 0 }];

    while (queue.length > 0) {
      const { id, distance } = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);

      const node = state.nodesById[id];
      if (node) {
        cluster.push(node);
      }

      if (distance < maxDistance) {
        const neighbors = state.edgesByNode[id] || [];
        neighbors.forEach((edge) => {
          if (!visited.has(edge.to)) {
            queue.push({ id: edge.to, distance: distance + 1 });
          }
        });
      }
    }

    return cluster;
  }

  static getTutorContext(nodeId, state) {
    const node = state.nodesById[nodeId];
    if (!node) return null;

    const neighbors = this.getNodeNeighbors(nodeId, state);
    const completedNeighbors = neighbors.filter((n) => state.completedNormalized.has(n.label.toLowerCase()));
    const pendingNeighbors = neighbors.filter((n) => !state.completedNormalized.has(n.label.toLowerCase()));

    const nodeCluster = this.getClusterNodes(nodeId, state, 1);
    const similarNodes = nodeCluster.filter((n) => n.id !== nodeId && n.type === node.type);

    return {
      current: node,
      neighbors,
      completedNeighbors,
      pendingNeighbors,
      similarNodes,
      isCompleted: state.completedNormalized.has(node.label.toLowerCase()),
      relatedProgress: {
        completedCount: completedNeighbors.length,
        totalRelated: neighbors.length
      }
    };
  }

  static async updateProgress(userId, concept, result = {}) {
    try {
      let progress = await Progress.findOne({ user: userId });
      if (!progress) {
        progress = new Progress({
          user: userId,
          completed: [],
          quizScores: {},
          conceptAccuracy: {}
        });
      }

      const normalized = concept.toLowerCase();
      if (!progress.completed.some((c) => c.toLowerCase() === normalized)) {
        progress.completed.push(concept);
      }

      if (result.score !== undefined && result.total !== undefined) {
        const accuracy = Math.round((result.score / result.total) * 100);
        
        // Use Map.set() for Mongoose
        progress.quizScores.set(concept, {
          score: result.score,
          total: result.total,
          accuracy,
          timestamp: new Date()
        });

        progress.conceptAccuracy.set(concept, accuracy);
      }

      await progress.save();
      return progress;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }
}

module.exports = SystemState;
