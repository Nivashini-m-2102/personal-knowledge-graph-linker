let network;
let allNodes = [];
let allEdges = [];
let completed = [];
let currentLearningPath = [];

window.onload = async () => {
  await loadDashboard();
  const searchBox = document.getElementById('searchBox');
  if (searchBox) {
    searchBox.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        searchConcept();
      }
    });
  }
};

async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return null;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {})
  };

  if (options.body != null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  return res;
}

async function loadDashboard() {
  const graphRes = await fetchWithAuth('/api/graph');
  const progressRes = await fetchWithAuth('/api/progress');
  if (!graphRes || !progressRes) return;

  const graphData = await graphRes.json();
  const progressData = await progressRes.json();

  allNodes = graphData.nodes || [];
  allEdges = graphData.edges || [];
  completed = progressData.completed || [];
  currentLearningPath = graphData.learningPath || [];

  if (!allNodes.length) {
    document.getElementById('learningPath').innerHTML = '<p>Upload documents to generate graph</p>';
    return;
  }

  drawGraph(graphData);
  renderLearningPath(currentLearningPath);
  updateProgress();
  refreshGraphCompletion();
  renderNodeInfo();
  showRecommendations();
}

function drawGraph(data) {
  const container = document.getElementById('graph-container');

  const clusterColors = [
    '#FF6B6B',
    '#4DA6FF',
    '#33CC66',
    '#F59E0B',
    '#8B5CF6',
    '#0EA5E9',
    '#F97316',
    '#14B8A6'
  ];

  const domainColors = {
    OS: '#0EA5E9',
    ML: '#8B5CF6',
    DBMS: '#F59E0B',
    Networking: '#14B8A6',
    General: '#6B7280'
  };

  const positionedNodes = data.nodes.map((node) => {
    const clusterIndex = Number(node.group.replace('cluster-', '')) || 0;
    const clusterColor = clusterColors[clusterIndex % clusterColors.length] || '#6B7280';
    const domainColor = domainColors[node.domain] || clusterColor;

    return {
      ...node,
      shape: 'dot',
      size: 18 + Math.min(22, (node.importance || node.score || 1) * 6),
      color: {
        background: isConceptCompleted(node.label) ? '#22c55e' : domainColor,
        border: '#ffffff',
        highlight: {
          background: '#ffffff',
          border: '#000000'
        }
      },
      font: { color: '#fff', multi: 'html', align: 'center' },
      borderWidth: isConceptCompleted(node.label) ? 4 : 2,
      shadow: {
        enabled: true,
        color: 'rgba(0,0,0,0.18)',
        size: 10,
        x: 0,
        y: 6
      }
    };
  });

  const edgesArray = data.edges.map((e) => ({
    from: e.from,
    to: e.to,
    width: e.width || 2,
    length: e.length || 220,
    color: e.color || '#9CA3AF',
    smooth: {
      enabled: true,
      type: 'dynamic'
    },
    arrows: {
      to: { enabled: true, scaleFactor: 0.5 }
    }
  }));

  const nodes = new vis.DataSet(positionedNodes);
  const edges = new vis.DataSet(edgesArray);

  network = new vis.Network(container, { nodes, edges }, {
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -120,
        centralGravity: 0.01,
        springLength: 120,
        springConstant: 0.08,
        damping: 0.4
      },
      stabilization: {
        enabled: true,
        iterations: 500,
        updateInterval: 25
      }
    },
    interaction: {
      hover: true,
      dragNodes: true,
      zoomView: true,
      multiselect: false
    },
    edges: {
      smooth: true,
      color: { inherit: false }
    },
    nodes: {
      scaling: {
        min: 18,
        max: 40
      }
    }
  });

  network.on('selectNode', (event) => {
    const nodeId = event.nodes[0];
    const node = allNodes.find((n) => n.id === nodeId);
    if (node) {
      showNodeInfo(node);
      highlightNode(node.id);
    }
  });
}

function isConceptCompleted(label) {
  const normalized = label.toLowerCase();
  return completed.some(item => item.toLowerCase() === normalized);
}

function nodeStyle(node) {
  const isCompleted = isConceptCompleted(node.label);
  const domainColors = {
    OS: '#0EA5E9',
    ML: '#8B5CF6',
    DBMS: '#F59E0B',
    Networking: '#14B8A6',
    General: '#6B7280'
  };
  const baseColor = domainColors[node.domain] || '#6B7280';
  return {
    id: node.id,
    color: {
      background: isCompleted ? '#22c55e' : baseColor,
      border: isCompleted ? '#10B981' : '#ffffff',
      highlight: {
        background: '#ffffff',
        border: '#000000'
      }
    },
    borderWidth: isCompleted ? 4 : 2,
    font: { color: '#fff', multi: 'html' }
  };
}

function refreshGraphCompletion() {
  if (!network || !allNodes.length) return;
  const updates = allNodes.map(node => nodeStyle(node));
  network.body.data.nodes.update(updates);
}

function highlightNode(nodeId) {
  if (!network) return;
  const allIds = allNodes.map((n) => n.id);
  const domainColors = {
    OS: '#0EA5E9',
    ML: '#8B5CF6',
    DBMS: '#F59E0B',
    Networking: '#14B8A6',
    General: '#6B7280'
  };
  const updates = allIds.map((id) => {
    const node = allNodes.find((n) => n.id === id);
    const baseColor = domainColors[node.domain] || '#6B7280';

    return {
      id,
      color: {
        background: isConceptCompleted(node.label) ? '#22c55e' : baseColor,
        border: id === nodeId ? '#fbbf24' : isConceptCompleted(node.label) ? '#10B981' : '#ffffff'
      }
    };
  });
  network.body.data.nodes.update(updates);
}

function showRecommendations() {
  const container = document.getElementById('recommendations');
  const suggestions = buildRecommendations();
  const header = '<h4>✨ Recommendations</h4>';

  if (!suggestions.length) {
    container.innerHTML = `${header}<p>No recommendations available yet. Mark a concept as complete to get a next step.</p>`;
    return;
  }

  const list = suggestions.map(item => `
    <div class="recommendation-item" onclick="focusRecommendation('${item.label.replace(/'/g, "\\'")}')">
      <strong>${item.label}</strong> · ${item.reason}
    </div>
  `).join('');

  container.innerHTML = `${header}${list}`;
}

function buildRecommendations() {
  const incomplete = allNodes.filter(n => !isConceptCompleted(n.label));

  return incomplete
    .filter(n => n.prerequisites && n.prerequisites.every(p =>
      completed.map(c => c.toLowerCase()).includes(p.toLowerCase())
    ))
    .slice(0, 5)
    .map(n => ({
      label: n.label,
      reason: 'Next logical concept (prerequisite satisfied)'
    }));
}

function focusRecommendation(label) {
  const node = allNodes.find(n => n.label === label);
  if (!node || !network) return;
  network.selectNodes([node.id]);
  network.focus(node.id, { scale: 1.3, animation: { duration: 300 } });
  showNodeInfo(node);
}

function showQuiz() {
  const quiz = buildQuizQuestions(allNodes, allEdges);
  const container = document.getElementById('recommendations');
  if (!quiz.length) {
    container.innerHTML = '<h4>🧠 Quiz</h4><p>No quiz available. Upload graph data first.</p>';
    return;
  }
  container.innerHTML = '<h4>🧠 Quiz</h4>';
  quiz.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `<p><strong>${index + 1}. ${item.question}</strong></p>`;

    item.options.forEach(option => {
      const button = document.createElement('button');
      button.innerText = option;
      button.className = 'quiz-option';
      button.onclick = () => checkAnswer(button, item.correct, option, card, item);
      card.appendChild(button);
    });

    card.appendChild(document.createElement('div'));
    container.appendChild(card);
  });
}

function checkAnswer(button, correct, selected, card, item) {
  const buttons = card.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.innerText === correct) {
      btn.style.background = '#22c55e';
      btn.style.color = '#fff';
    }
  });
  if (selected !== correct) {
    button.style.background = '#ef4444';
    button.style.color = '#fff';
  }

  const result = document.createElement('p');
  result.style.marginTop = '10px';
  result.style.fontSize = '14px';
  result.innerHTML = selected === correct ? 'Correct ✅' : `Incorrect ❌ — correct answer: <strong>${correct}</strong>`;
  card.appendChild(result);
}

async function downloadNotesPDF() {
  try {
    const API_BASE = "http://localhost:5000";

async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  return res;
}
    if (!res) return;
    if (!res.ok) {
      const text = await res.text();
      console.error('Notes download failed', res.status, text);
      if (res.status === 401) {
        alert('Session expired or not logged in. Please log in again.');
      } else {
        alert('Unable to download AI notes PDF. See console for details.');
      }
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NeuroMap-AI-Notes.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Notes download failed', error);
    alert('Unable to download AI notes PDF. Check the console for more information.');
  }
}


function renderLearningPath(path) {
  const div = document.getElementById('learningPath');
  div.innerHTML = '';

  path.forEach((step, i) => {
    const concept = step.replace(/Start with |Then learn |Finally explore /g, '').trim();
    const isDone = isConceptCompleted(concept);

    const container = document.createElement('div');
    container.className = 'path-step';

    const title = document.createElement('h4');
    title.style.color = isDone ? '#22c55e' : '#ffffff';
    title.innerText = `${i + 1}. ${step}`;

    const actionRow = document.createElement('div');
    actionRow.style.marginTop = '6px';

    if (isDone) {
      const doneLabel = document.createElement('span');
      doneLabel.style.color = '#22c55e';
      doneLabel.style.fontSize = '12px';
      doneLabel.innerText = '✔ Completed';
      actionRow.appendChild(doneLabel);
    } else {
      const button = document.createElement('button');
      button.className = 'glass-btn complete-btn';
      button.style.padding = '6px 10px';
      button.style.fontSize = '11px';
      button.innerText = 'Mark Complete';
      button.addEventListener('click', () => markDone(concept));
      actionRow.appendChild(button);
    }

    container.appendChild(title);
    container.appendChild(actionRow);
    div.appendChild(container);
  });
}

function updateProgress() {
  const total = allNodes.length || 1;
  const uniqueCompleted = [...new Set(completed)];
  const percent = Math.floor((uniqueCompleted.length / total) * 100);

  document.getElementById('progressText').innerText = `${percent}%`;
  document.getElementById('progressFill').style.width = `${percent}%`;
}

async function markDone(concept) {
  try {
    const res = await fetchWithAuth('/api/progress', {
      method: 'POST',
      body: JSON.stringify({ concept })
    });
    const data = await res.json();
    if (res.ok) {
      completed = data.completed || [...completed, concept];
      renderLearningPath(currentLearningPath);
      updateProgress();
      refreshGraphCompletion();
      showRecommendations();
    }
  } catch (error) {
    console.error('Progress update failed', error);
  }
}

function showNodeInfo(node) {
  const neighbors = allEdges
    .filter((e) => e.from === node.id || e.to === node.id)
    .map((e) => (e.from === node.id ? e.to : e.from));
  const labels = neighbors
    .map((id) => allNodes.find((n) => n.id === id)?.label)
    .filter(Boolean);

  const prereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
  const infoPanel = document.getElementById('nodeInfo');
  infoPanel.innerHTML = `
    <h4>${node.label}</h4>
    <p><strong>Type:</strong> ${node.type || node.group}</p>
    <p><strong>Domain:</strong> ${node.domain || 'General'}</p>
    <p><strong>Importance:</strong> ${node.importance || node.score || 1}</p>
    <p><strong>Connected nodes:</strong> ${labels.slice(0, 6).join(', ') || 'None'}</p>
    <p><strong>Prerequisites:</strong> ${prereqs.length ? prereqs.join(', ') : 'None'}</p>
    <p><strong>Summary:</strong> ${node.type === 'main' ? 'Core concept in your knowledge cloud.' : node.type === 'sub' ? 'Supporting concept linked to the central ideas.' : 'Contextual concept that belongs to a related cluster.'}</p>
  `;
}

function renderNodeInfo() {
  const infoPanel = document.getElementById('nodeInfo');
  if (!allNodes.length) {
    infoPanel.innerHTML = 'Click a node to see concept details.';
    return;
  }
  const main = allNodes.find(n => n.group === 'main');
  if (main) {
    showNodeInfo(main);
  }
}

function searchConcept() {
  const input = document.getElementById('searchBox');
  const query = (input.value || '').trim().toLowerCase();
  if (!query || !network) return;

  const tokens = query.split(/\s+/).filter(Boolean);
  let best = null;
  let bestScore = 0;

  allNodes.forEach(node => {
    const label = node.label.toLowerCase();
    const groupName = (node.group || '').toLowerCase();
    let score = 0;
    tokens.forEach(token => {
      if (label.includes(token)) score += 2;
      if (label === token) score += 5;
      if (groupName.includes(token)) score += 1;
    });
    const labelTokens = label.split(' ');
    labelTokens.forEach(token => {
      if (tokens.includes(token)) score += 1;
    });
    if (score > bestScore) {
      bestScore = score;
      best = node;
    }
  });

  if (!best) {
    document.getElementById('recommendations').innerHTML = '<p>No matching concept found.</p>';
    return;
  }

  network.selectNodes([best.id]);
  network.focus(best.id, {
    scale: 1.2,
    animation: { duration: 500 }
  });
  highlightNode(best.id);
  showNodeInfo(best);
}

function buildQuizQuestions(nodes, edges) {
  const questions = [];
  const usedKeys = new Set();
  const edgePool = edges.map(edge => {
    const from = nodes.find(n => n.id === edge.from);
    const to = nodes.find(n => n.id === edge.to);
    return from && to ? { edge, from, to } : null;
  }).filter(Boolean);

  edgePool.sort(() => Math.random() - 0.5);

  for (const item of edgePool) {
    if (questions.length >= 5) break;
    const { edge, from, to } = item;
    let question = '';
    let correct = '';
    let options = [];

    if (from.group === 'main' && to.group === 'sub') {
      question = `Which concept is a supporting topic for <strong>${from.label}</strong>?`;
      correct = to.label;
      options = nodes.filter(n => n.id !== to.id && n.group === 'sub').sort(() => Math.random() - 0.5).slice(0, 3).map(n => n.label);
    } else if (from.group === 'sub' && to.group === 'related') {
      question = `Which concept is directly related to <strong>${from.label}</strong>?`;
      correct = to.label;
      options = nodes.filter(n => n.id !== to.id && n.group === 'related').sort(() => Math.random() - 0.5).slice(0, 3).map(n => n.label);
    } else {
      continue;
    }

    if (!question || !correct || options.length < 3) continue;
    const key = `${question}|${correct}`;
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);

    const allOptions = [correct, ...options].slice(0, 4);
    while (allOptions.length < 4) {
      const extra = nodes.find(n => !allOptions.includes(n.label) && n.label !== correct);
      if (!extra) break;
      allOptions.push(extra.label);
    }

    questions.push({
      question,
      correct,
      options: allOptions.sort(() => Math.random() - 0.5)
    });
  }

  if (questions.length < 3) {
    const fallbackNodes = [...nodes].sort(() => Math.random() - 0.5).slice(0, 5);
    fallbackNodes.forEach(node => {
      if (questions.length >= 5) return;
      const distractors = nodes.filter(n => n.label !== node.label).sort(() => Math.random() - 0.5).slice(0, 3).map(n => n.label);
      questions.push({
        question: node.group === 'main'
          ? `Which of these is a main concept in your learning graph?`
          : node.group === 'sub'
          ? `Which of these is a supporting sub-topic in your graph?`
          : `Which of these is a related contextual concept?`,
        correct: node.label,
        options: [node.label, ...distractors].sort(() => Math.random() - 0.5)
      });
    });
  }

  return questions;
}

async function generateNotesPDF() {
    const res = await fetchWithAuth("/api/notes/pdf", {
        method: "POST"
    });

    if (!res || !res.ok) {
        alert("PDF failed");
        return;
    }

    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);

    // IMPORTANT: open in new tab
    window.open(url, "_blank");
}

function showNotes() {
  const notes = generateNotes(allNodes, allEdges);
  const win = window.open('', '_blank');
  win.document.write(`<pre style="font-family:system-ui; white-space: pre-wrap;">${notes}</pre>`);
}

