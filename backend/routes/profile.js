const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const SystemState = require('../services/systemState');
const QuizGenerator = require('../services/quizGenerator');

// GET user profile with analytics
router.get('/', protect, async (req, res) => {
  try {
    const state = await SystemState.loadUserState(req.user._id);

    const quizAttempts = Object.keys(state.quizScores).length;
    const averageAccuracy = state.weakTopics.length === 0
      ? 100
      : Math.round(
          Object.values(state.conceptAccuracy).reduce((a, b) => a + b, 0) / Object.keys(state.conceptAccuracy).length
        );

    const learningVelocity = state.completedCount === 0 ? 0 : Math.round((state.completedCount / state.totalConcepts) * 100);

    const strongTopics = state.nodes
      .filter((n) => state.conceptAccuracy[n.label] && state.conceptAccuracy[n.label] >= 80)
      .map((n) => ({
        concept: n.label,
        accuracy: state.conceptAccuracy[n.label],
        type: n.type
      }));

    res.json({
      user: {
        username: req.user.username,
        email: req.user.email
      },
      learning: {
        progressPercentage: state.progressPercentage,
        completedCount: state.completedCount,
        totalConcepts: state.totalConcepts,
        completedTopics: state.completed,
        pendingTopics: state.nodes
          .filter((n) => !state.completedNormalized.has(n.label.toLowerCase()))
          .map((n) => n.label)
      },
      quizPerformance: {
        totalAttempts: quizAttempts,
        averageAccuracy,
        quizScores: state.quizScores
      },
      analyticsinsights: {
        learningVelocity,
        strongTopics: strongTopics.slice(0, 5),
        weakTopics: state.weakTopics.slice(0, 5),
        recommendedNextTopics: state.nodes
          .filter((n) => !state.completedNormalized.has(n.label.toLowerCase()))
          .sort((a, b) => (b.score || 1) - (a.score || 1))
          .slice(0, 5)
          .map((n) => ({
            label: n.label,
            type: n.type,
            score: n.score
          }))
      }
    });
  } catch (error) {
    console.error('Profile GET Error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// GET profile summary
router.get('/summary', protect, async (req, res) => {
  try {
    const state = await SystemState.loadUserState(req.user._id);

    const summary = {
      progress: `${state.progressPercentage}%`,
      completed: state.completedCount,
      total: state.totalConcepts,
      quizzes: Object.keys(state.quizScores).length,
      accuracy: Math.round(
        Object.keys(state.conceptAccuracy).length > 0
          ? Object.values(state.conceptAccuracy).reduce((a, b) => a + b, 0) / Object.keys(state.conceptAccuracy).length
          : 0
      ),
      status:
        state.progressPercentage === 100
          ? '🏆 Mastery'
          : state.progressPercentage >= 75
          ? '🎯 Advanced'
          : state.progressPercentage >= 50
          ? '📚 Intermediate'
          : state.progressPercentage >= 25
          ? '🌱 Beginner'
          : '🚀 Just Started'
    };

    res.json(summary);
  } catch (error) {
    console.error('Profile Summary Error:', error);
    res.status(500).json({ error: 'Failed to retrieve summary' });
  }
});

// GET weak topics with remediation quiz
router.get('/remediation-quiz', protect, async (req, res) => {
  try {
    const state = await SystemState.loadUserState(req.user._id);

    if (state.weakTopics.length === 0) {
      return res.json({
        message: 'All topics are mastered! No remediation needed.',
        quiz: []
      });
    }

    const quiz = QuizGenerator.generateWeakTopicQuiz(state.conceptAccuracy, state, 5);

    res.json({
      message: `Focus on these ${quiz.length} weak topics`,
      weakTopics: state.weakTopics.slice(0, 5),
      quiz
    });
  } catch (error) {
    console.error('Remediation Quiz Error:', error);
    res.status(500).json({ error: 'Failed to generate remediation quiz' });
  }
});

// POST record learning session
router.post('/learning-session', protect, async (req, res) => {
  try {
    const { topicsReviewed, duration, difficulty } = req.body;

    if (!topicsReviewed || !Array.isArray(topicsReviewed)) {
      return res.status(400).json({ error: 'Missing session data' });
    }

    const state = await SystemState.loadUserState(req.user._id);

    for (const topic of topicsReviewed) {
      await SystemState.updateProgress(req.user._id, topic);
    }

    const updatedState = await SystemState.loadUserState(req.user._id);

    res.json({
      success: true,
      sessionStats: {
        topicsReviewed: topicsReviewed.length,
        duration: duration || 0,
        difficulty: difficulty || 'medium',
        progressBefore: state.progressPercentage,
        progressAfter: updatedState.progressPercentage
      }
    });
  } catch (error) {
    console.error('Learning Session Error:', error);
    res.status(500).json({ error: 'Failed to record session' });
  }
});

module.exports = router;
