const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const SystemState = require('../services/systemState');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, async (req, res) => {
  try {
    const state = await SystemState.loadUserState(req.user._id);
    const progress = await Progress.findOne({ user: req.user._id });

    res.json({
      completed: state.completed,
      quizScores: state.quizScores,
      conceptAccuracy: state.conceptAccuracy,
      progressPercentage: state.progressPercentage,
      completedCount: state.completedCount,
      totalConcepts: state.totalConcepts,
      weakTopics: state.weakTopics
    });
  } catch (err) {
    console.error('Progress GET Error:', err);
    res.status(500).json({ error: 'Unable to retrieve progress' });
  }
});

router.get('/:userId', protect, async (req, res) => {
  try {
    if (req.params.userId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const state = await SystemState.loadUserState(req.user._id);

    res.json({
      completed: state.completed,
      completedCount: state.completedCount,
      totalConcepts: state.totalConcepts,
      progressPercentage: state.progressPercentage,
      quizScores: state.quizScores,
      conceptAccuracy: state.conceptAccuracy,
      weakTopics: state.weakTopics
    });
  } catch (err) {
    console.error('Progress GET Error:', err);
    res.status(500).json({ error: 'Unable to retrieve progress' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const concept = (req.body.concept || '').trim();

    if (!concept) {
      return res.status(400).json({ error: 'Missing concept to mark complete' });
    }

    const progress = await SystemState.updateProgress(userId, concept);
    const state = await SystemState.loadUserState(userId);

    res.json({
      success: true,
      completed: state.completed,
      progressPercentage: state.progressPercentage,
      completedCount: state.completedCount,
      totalConcepts: state.totalConcepts
    });
  } catch (err) {
    console.error('Progress POST Error:', err);
    res.status(500).json({ error: 'Progress error' });
  }
});

router.post('/quiz-result', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { concept, score, total, sourceNode } = req.body;

    if (!concept || score === undefined || !total) {
      return res.status(400).json({ error: 'Missing quiz result data' });
    }

    const progress = await SystemState.updateProgress(userId, concept, { score, total });
    const state = await SystemState.loadUserState(userId);

    res.json({
      success: true,
      concept,
      accuracy: Math.round((score / total) * 100),
      quizScores: state.quizScores,
      conceptAccuracy: state.conceptAccuracy,
      weakTopics: state.weakTopics
    });
  } catch (err) {
    console.error('Quiz Result Error:', err);
    res.status(500).json({ error: 'Failed to record quiz result' });
  }
});

module.exports = router;