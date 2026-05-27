const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const SystemState = require('../services/systemState');
const SemanticSearch = require('../services/searchEngine');

// GET search results
router.get('/', protect, async (req, res) => {
  try {
    const query = req.query.q || '';

    if (!query || query.length < 2) {
      return res.json({
        results: [],
        message: 'Enter at least 2 characters to search'
      });
    }

    const state = await SystemState.loadUserState(req.user._id);

    if (state.nodes.length === 0) {
      return res.json({
        results: [],
        message: 'No concepts found. Upload documents first.'
      });
    }

    const results = SemanticSearch.searchNodes(query, state.nodes, 10);

    const enrichedResults = results.map((node) => {
      const neighbors = (state.edgesByNode[node.id || node._id?.toString()] || [])
        .map((edge) => state.nodesById[edge.to])
        .filter(Boolean)
        .slice(0, 3);

      return {
        id: node.id || node._id?.toString(),
        label: node.label,
        type: node.type,
        description: node.description,
        score: node.searchScore,
        isCompleted: state.completedNormalized.has(node.label.toLowerCase()),
        relatedConcepts: neighbors.map((n) => n.label),
        connectedCount: (state.edgesByNode[node.id || node._id?.toString()] || []).length
      };
    });

    res.json({
      query,
      results: enrichedResults,
      count: enrichedResults.length
    });
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET autocomplete suggestions
router.get('/autocomplete', protect, async (req, res) => {
  try {
    const query = req.query.q || '';

    const state = await SystemState.loadUserState(req.user._id);

    if (state.nodes.length === 0) {
      return res.json({ suggestions: [] });
    }

    const suggestions = SemanticSearch.autocomplete(query, state.nodes, 8);

    res.json({
      suggestions: suggestions.map((s) => ({
        label: s.label,
        id: s.id,
        type: s.type
      }))
    });
  } catch (error) {
    console.error('Autocomplete Error:', error);
    res.status(500).json({ error: 'Autocomplete failed' });
  }
});

// GET related concepts
router.get('/related/:nodeId', protect, async (req, res) => {
  try {
    const nodeId = req.params.nodeId;
    const state = await SystemState.loadUserState(req.user._id);

    const node = state.nodesById[nodeId];
    if (!node) {
      return res.status(404).json({ error: 'Concept not found' });
    }

    const neighbors = (state.edgesByNode[nodeId] || [])
      .map((edge) => state.nodesById[edge.to])
      .filter(Boolean);

    const related = {
      concept: node,
      related: neighbors.map((n) => ({
        label: n.label,
        type: n.type,
        isCompleted: state.completedNormalized.has(n.label.toLowerCase())
      })),
      cluster: SystemState.getClusterNodes(nodeId, state, 2)
    };

    res.json(related);
  } catch (error) {
    console.error('Related Concepts Error:', error);
    res.status(500).json({ error: 'Failed to get related concepts' });
  }
});

module.exports = router;
