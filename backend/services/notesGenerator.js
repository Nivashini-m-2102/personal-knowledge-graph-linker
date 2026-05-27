function extractDefinition(label, contextSentences) {
  if (!contextSentences || !contextSentences.length) return '';
  const candidate = contextSentences.find((sentence) => sentence.toLowerCase().includes('is a') || sentence.toLowerCase().includes('refers to'));
  return candidate || contextSentences[0];
}

function extractFormulas(text) {
  if (!text) return [];
  const matches = text.match(/\$?\b([A-Za-z0-9]+\s*=?\s*[A-Za-z0-9\^_\*\/\+\-]+)\b/g);
  return matches ? Array.from(new Set(matches)).slice(0, 3) : [];
}

function buildMermaidDiagram(nodes, edges) {
  const lines = ['flowchart TB'];
  const topNodes = nodes.filter((node) => node.type === 'main' || node.type === 'sub');

  topNodes.forEach((node) => {
    lines.push(`  ${node._id}([${node.label}])`);
  });

  edges.forEach((edge) => {
    if (edge.from && edge.to) {
      const fromId = edge.from._id || edge.from;
      const toId = edge.to._id || edge.to;
      lines.push(`  ${fromId} -->|${edge.label}| ${toId}`);
    }
  });

  return lines.join('\n');
}

function safeText(text) {
  if (!text) return '';
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateNotes(nodes, edges) {
  const noteCards = nodes.map((node) => {
    const outgoing = edges.filter((edge) => edge.from.toString() === node._id.toString());
    const inbound = edges.filter((edge) => edge.to.toString() === node._id.toString());
    const related = Array.from(new Set([...outgoing.map((e) => e.to.label), ...inbound.map((e) => e.from.label)])).slice(0, 6);
    const definition = extractDefinition(node.label, node.contextSentences || []);
    const formulas = extractFormulas((node.contextSentences || []).join(' '));

    return {
      title: node.label,
      summary: node.description || `Key idea: ${node.label}`,
      definition: definition || `Definition not found automatically for ${node.label}.`,
      prerequisites: node.prerequisites || [],
      related: related.length ? related : ['None'],
      formulas,
      examples: node.contextSentences || [],
      domain: node.domain || 'General',
      type: node.type || 'concept'
    };
  });

  const diagram = buildMermaidDiagram(nodes, edges);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Knowledge Graph Notes</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #222; background: #fafafa; }
    h1 { margin-bottom: 12px; font-size: 2rem; }
    .card { background: #fff; border: 1px solid #ddd; border-radius: 12px; margin-bottom: 18px; padding: 18px; box-shadow: 0 6px 18px rgba(0,0,0,0.04); }
    .card h2 { margin: 0 0 8px; font-size: 1.3rem; }
    .card p { margin: 6px 0; line-height: 1.5; }
    .meta { font-size: 0.9rem; color: #555; }
    .badge { display: inline-block; margin-right: 6px; background: #eef; color: #244; padding: 4px 8px; border-radius: 10px; }
    pre { background: #111; color: #ade8ff; padding: 12px; border-radius: 10px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Semantic Knowledge Graph Notes</h1>
  ${noteCards.map((card) => `
  <div class="card">
    <h2>${safeText(card.title)}</h2>
    <p class="meta"><span class="badge">${safeText(card.domain)}</span><span class="badge">${safeText(card.type)}</span></p>
    <p><strong>Summary:</strong> ${safeText(card.summary)}</p>
    <p><strong>Definition:</strong> ${safeText(card.definition)}</p>
    <p><strong>Prerequisites:</strong> ${safeText(card.prerequisites.join(', ') || 'None')}</p>
    <p><strong>Related concepts:</strong> ${safeText(card.related.join(', '))}</p>
    ${card.formulas.length ? `<p><strong>Formulas:</strong> ${safeText(card.formulas.join(', '))}</p>` : ''}
    ${card.examples.length ? `<p><strong>Example sentence:</strong> ${safeText(card.examples[0])}</p>` : ''}
  </div>`).join('')}

  <div class="card">
    <h2>Graph diagram</h2>
    <pre>${safeText(diagram)}</pre>
    <p class="meta">Use a Mermaid renderer to visualize this flowchart from the exported text.</p>
  </div>
</body>
</html>`;

  return html;
}

module.exports = generateNotes;