const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const SystemState = require('../services/systemState');
const SemanticSearch = require('../services/searchEngine');
const QuizGenerator = require('../services/quizGenerator');

router.post('/', protect, async (req, res) => {
  try {
    const message = (req.body.message || '').trim();
    const selectedNodeId = req.body.selectedNodeId;

    if (!message && !selectedNodeId) {
      return res.json({ reply: 'Ask me about your learning concepts or tell me which concept you want to explore.' });
    }

    const state = await SystemState.loadUserState(req.user._id);

    if (state.nodes.length === 0) {
      return res.json({ reply: '📚 Upload documents first to generate your knowledge graph. Once you do, I can help you learn!' });
    }

    let reply = '';
    let selectedNode = null;

    if (selectedNodeId) {
      selectedNode = state.nodesById[selectedNodeId];
    } else if (message) {
      const searchResults = SemanticSearch.searchNodes(message, state.nodes, 1);
      if (searchResults.length > 0) {
        selectedNode = searchResults[0];
      }
    }

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('quiz') || lowerMessage.includes('test')) {
      if (selectedNode) {
        const quiz = QuizGenerator.generateConceptQuiz(selectedNode.id || selectedNode._id?.toString(), state, 1);
        if (quiz.length > 0) {
          const q = quiz[0];
          reply = `🧠 Quick Quiz\n\n${q.question}\n\n`;
          q.options.forEach((opt, idx) => {
            reply += `${String.fromCharCode(65 + idx)}) ${opt}\n`;
          });
          reply += `\n💡 Hint: ${q.hint}`;
        }
      } else {
        reply = '📚 Select a concept from your graph to take a quiz about it.';
      }
    } else if (lowerMessage.includes('next') || lowerMessage.includes('learn')) {
      reply = `📖 Your Next Learning Step:\n`;
      if (state.completedCount === 0) {
        const mainConcepts = state.nodes.filter((n) => n.type === 'main');
        if (mainConcepts.length > 0) {
          reply += `Start with <b>${mainConcepts[0].label}</b>. This is a core topic in your knowledge graph.`;
        }
      } else {
        const completed = new Set(state.completedNormalized);
        const incomplete = state.nodes.filter((n) => !completed.has(n.label.toLowerCase()));
        if (incomplete.length > 0) {
          reply += `Continue with <b>${incomplete[0].label}</b>. You're making great progress!`;
        } else {
          reply += 'Congratulations! You have completed all concepts in your knowledge graph.';
        }
      }
    } else if (lowerMessage.includes('progress') || lowerMessage.includes('status')) {
      reply = `📊 Your Learning Progress\nProgress: ${state.progressPercentage}% (${state.completedCount}/${state.totalConcepts} concepts)\n\n`;

      if (state.weakTopics.length > 0) {
        reply += `⚠️ Topics to review:\n`;
        state.weakTopics.slice(0, 3).forEach((topic) => {
          reply += `• ${topic.concept}: ${topic.accuracy}% accuracy\n`;
        });
      } else {
        reply += `✅ Great job! You're doing well on all topics!`;
      }
    } else if (selectedNode) {
      const context = SystemState.getTutorContext(selectedNode.id || selectedNode._id?.toString(), state);
      let explanation = '';
      if (selectedNode.type === 'main') {
        explanation = `<b>${selectedNode.label}</b> is a core concept. It forms the foundation for understanding this topic area.`;
      } else if (selectedNode.type === 'sub') {
        explanation = `<b>${selectedNode.label}</b> is a supporting concept that strengthens your understanding of the main ideas.`;
      } else {
        explanation = `<b>${selectedNode.label}</b> is a contextual concept that adds depth and nuance to your learning.`;
      }

      if (context.completedNeighbors.length > 0) {
        explanation += `\n\n✅ You have already learned: ${context.completedNeighbors.map((n) => n.label).join(', ')}`;
      }

      if (context.pendingNeighbors.length > 0) {
        explanation += `\n\n📖 Related topics to explore next: ${context.pendingNeighbors.slice(0, 3).map((n) => n.label).join(', ')}`;
      }

      if (context.similarNodes && context.similarNodes.length > 0) {
        explanation += `\n\n🔗 Other concepts in this cluster: ${context.similarNodes.slice(0, 3).map(n => n.label).join(', ')}`;
      }

      reply = `📚 Concept Explanation\n${explanation}`;
    } else {
      reply = '💭 I did not understand. Try asking about a specific concept, request a quiz, or ask what to learn next.';
    }

    res.json({ reply, selectedNode });
  } catch (error) {
    console.error('AI Route Error:', error);
    res.status(500).json({ reply: 'Sorry, I encountered an error. Please try again.' });
  }
});

module.exports = router;