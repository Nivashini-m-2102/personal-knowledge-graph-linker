function selectRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

class QuizGenerator {
  static generateQuiz(state, count = 5) {
    if (!state || !state.nodes || state.nodes.length === 0) {
      return [];
    }

    const questions = [];
    const usedConcepts = new Set();

    const mainNodes = state.nodes.filter((n) => n.type === 'main');
    const subNodes = state.nodes.filter((n) => n.type === 'sub');
    const relatedNodes = state.nodes.filter((n) => n.type === 'related');

    const candidates = [...mainNodes, ...subNodes, ...relatedNodes];

    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      if (questions.length >= count) break;

      const sourceNode = selectRandomItems(candidates, 1)[0];
      if (!sourceNode || usedConcepts.has(sourceNode.label)) continue;
      usedConcepts.add(sourceNode.label);

      const neighbors = (state.edgesByNode[sourceNode._id?.toString() || sourceNode.id] || [])
        .map((edge) => state.nodesById[edge.to])
        .filter(Boolean);

      if (neighbors.length === 0) continue;

      const correctNode = selectRandomItems(neighbors, 1)[0];
      if (!correctNode) continue;

      const questionTypes = ['definition', 'relation', 'hierarchy'];
      const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

      let question = '';
      let correct = correctNode.label;

      if (questionType === 'definition') {
        question = `Which of these concepts is most directly related to <strong>${sourceNode.label}</strong>?`;
      } else if (questionType === 'relation') {
        if (sourceNode.type === 'main' && correctNode.type === 'sub') {
          question = `<strong>${sourceNode.label}</strong> is a main concept. Which is a supporting topic for it?`;
        } else if (sourceNode.type === 'sub' && correctNode.type === 'related') {
          question = `<strong>${sourceNode.label}</strong> is a supporting topic. Which contextual concept complements it?`;
        } else {
          question = `Which concept is connected to <strong>${sourceNode.label}</strong> in the knowledge graph?`;
        }
      } else {
        question = `In the learning hierarchy, what is a concept related to <strong>${sourceNode.label}</strong>?`;
      }

      const wrongAnswers = state.nodes
        .filter((n) => n.label !== sourceNode.label && n.label !== correctNode.label && n.type === correctNode.type)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((n) => n.label);

      while (wrongAnswers.length < 3) {
        const extra = state.nodes.find((n) => !wrongAnswers.includes(n.label) && n.label !== correct && n.label !== sourceNode.label);
        if (!extra) break;
        wrongAnswers.push(extra.label);
      }

      const options = [correct, ...wrongAnswers.slice(0, 3)].sort(() => Math.random() - 0.5);

      questions.push({
        id: `quiz-${Date.now()}-${i}`,
        question,
        options,
        correct,
        type: questionType,
        sourceNode: sourceNode.label,
        hint: `${correctNode.label} is directly related to ${sourceNode.label} in your knowledge graph`
      });
    }

    return questions.slice(0, count);
  }

  static generateConceptQuiz(nodeId, state, count = 3) {
    if (!state || !state.nodesById) {
      return [];
    }

    const node = state.nodesById[nodeId];
    if (!node) return [];

    const neighbors = (state.edgesByNode[nodeId] || [])
      .map((edge) => state.nodesById[edge.to])
      .filter(Boolean);

    if (neighbors.length === 0) return [];

    const questions = [];

    for (let i = 0; i < Math.min(count, neighbors.length); i++) {
      const correctNeighbor = neighbors[i];

      const wrongAnswers = state.nodes
        .filter((n) => n.label !== node.label && n.label !== correctNeighbor.label && n.type === correctNeighbor.type && !neighbors.some((nb) => nb.label === n.label))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [correctNeighbor.label, ...wrongAnswers.map((n) => n.label)].sort(() => Math.random() - 0.5);

      let questionText = '';
      if (node.type === 'main') {
        questionText = `Which concept supports the main topic <strong>${node.label}</strong>?`;
      } else if (node.type === 'sub') {
        questionText = `Which concept is related to the supporting topic <strong>${node.label}</strong>?`;
      } else {
        questionText = `Which concept is connected to <strong>${node.label}</strong>?`;
      }

      questions.push({
        id: `concept-quiz-${Date.now()}-${i}`,
        question: questionText,
        options,
        correct: correctNeighbor.label,
        hint: `${correctNeighbor.label} is directly connected to ${node.label}`,
        sourceNode: node.label
      });
    }

    return questions;
  }

  static scoreAnswer(question, selectedAnswer) {
    const isCorrect = selectedAnswer.toLowerCase().trim() === question.correct.toLowerCase().trim();
    return {
      isCorrect,
      correct: question.correct,
      selected: selectedAnswer,
      feedback: isCorrect ? '✅ Correct! Well done!' : `❌ Incorrect. The correct answer is ${question.correct}.`
    };
  }

  static generateWeakTopicQuiz(conceptAccuracy, state, count = 5) {
    const weakTopics = Object.keys(conceptAccuracy)
      .map((concept) => ({
        concept,
        accuracy: conceptAccuracy[concept]
      }))
      .filter((item) => item.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);

    const questions = [];

    for (const weakTopic of weakTopics) {
      if (questions.length >= count) break;

      const node = state.nodes.find((n) => n.label === weakTopic.concept);
      if (!node) continue;

      const nodeId = node._id?.toString() || node.id;
      const neighbors = (state.edgesByNode[nodeId] || [])
        .map((edge) => state.nodesById[edge.to])
        .filter(Boolean);

      if (neighbors.length === 0) continue;

      const correctNeighbor = neighbors[0];

      const wrongAnswers = state.nodes
        .filter((n) => n.label !== node.label && n.label !== correctNeighbor.label && n.type === correctNeighbor.type)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((n) => n.label);

      const options = [correctNeighbor.label, ...wrongAnswers].sort(() => Math.random() - 0.5);

      questions.push({
        id: `weak-quiz-${Date.now()}-${questions.length}`,
        question: `Review: Which concept is related to <strong>${node.label}</strong>? (Your accuracy: ${weakTopic.accuracy}%)`,
        options,
        correct: correctNeighbor.label,
        isRemediationQuestion: true,
        sourceNode: node.label,
        currentAccuracy: weakTopic.accuracy
      });
    }

    return questions;
  }
}

module.exports = QuizGenerator;