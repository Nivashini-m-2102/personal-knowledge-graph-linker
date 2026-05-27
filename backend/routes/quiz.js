const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const SystemState = require('../services/systemState');
const QuizGenerator = require('../services/quizGenerator');

// GET generate quiz
router.get('/generate', protect, async (req, res) => {
  try {
    const count = parseInt(req.query.count || '5', 10);
    const type = req.query.type || 'general'; // 'general', 'weak', 'concept'
    const nodeId = req.query.nodeId;

    const state = await SystemState.loadUserState(req.user._id);

    if (state.nodes.length === 0) {
      return res.status(400).json({ error: 'No concepts available for quiz' });
    }

    let quiz = [];

    if (type === 'weak' && state.weakTopics.length > 0) {
      quiz = QuizGenerator.generateWeakTopicQuiz(state.conceptAccuracy, state, count);
    } else if (type === 'concept' && nodeId) {
      quiz = QuizGenerator.generateConceptQuiz(nodeId, state, count);
    } else {
      quiz = QuizGenerator.generateQuiz(state, count);
    }

    res.json({
      type,
      quizzes: quiz,
      count: quiz.length,
      totalConcepts: state.totalConcepts
    });
  } catch (error) {
    console.error('Quiz Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// POST submit quiz answer
router.post('/submit-answer', protect, async (req, res) => {
  try {
    const { quizId, question, selectedAnswer, correct, sourceNode } = req.body;

    if (!question || !selectedAnswer || !correct) {
      return res.status(400).json({ error: 'Missing quiz data' });
    }

    const scoring = QuizGenerator.scoreAnswer({ question, correct }, selectedAnswer);

    const scoreValue = scoring.isCorrect ? 1 : 0;
    const result = {
      isCorrect: scoring.isCorrect,
      feedback: scoring.feedback,
      correct: scoring.correct,
      selected: scoring.selected
    };

    if (sourceNode) {
      await SystemState.updateProgress(req.user._id, sourceNode, { score: scoreValue, total: 1 });
    }

    res.json(result);
  } catch (error) {
    console.error('Quiz Submit Error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

// POST submit quiz session
router.post('/submit-session', protect, async (req, res) => {
  try {
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'No answers provided' });
    }

    let totalCorrect = 0;
    const resultsPerConcept = {};

    for (const answer of answers) {
      const { concept, isCorrect } = answer;
      if (isCorrect) {
        totalCorrect += 1;
      }

      if (concept) {
        resultsPerConcept[concept] = resultsPerConcept[concept] || { correct: 0, total: 0 };
        resultsPerConcept[concept].total += 1;
        if (isCorrect) {
          resultsPerConcept[concept].correct += 1;
        }
      }
    }

    for (const [concept, result] of Object.entries(resultsPerConcept)) {
      await SystemState.updateProgress(req.user._id, concept, {
        score: result.correct,
        total: result.total
      });
    }

    const state = await SystemState.loadUserState(req.user._id);

    const overallAccuracy = Math.round((totalCorrect / answers.length) * 100);

    res.json({
      success: true,
      sessionResults: {
        totalQuestions: answers.length,
        correct: totalCorrect,
        accuracy: overallAccuracy,
        conceptResults: resultsPerConcept
      },
      userProgress: {
        progressPercentage: state.progressPercentage,
        completedCount: state.completedCount,
        totalConcepts: state.totalConcepts,
        weakTopics: state.weakTopics.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Quiz Session Error:', error);
    res.status(500).json({ error: 'Failed to submit quiz session' });
  }
});

// GET quiz history
router.get('/history', protect, async (req, res) => {
  try {
    const state = await SystemState.loadUserState(req.user._id);

    const history = Object.keys(state.quizScores)
      .map((concept) => ({
        concept,
        ...state.quizScores[concept]
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);

    res.json({
      totalAttempts: history.length,
      history,
      averageAccuracy: history.length > 0
        ? Math.round(history.reduce((a, b) => a + (b.accuracy || 0), 0) / history.length)
        : 0
    });
  } catch (error) {
    console.error('Quiz History Error:', error);
    res.status(500).json({ error: 'Failed to retrieve quiz history' });
  }
});

module.exports = router;
