function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalizeText(text).split(' ').filter(Boolean);
}

function jaccardSimilarity(a, b) {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  const intersection = [...tokensA].filter((token) => tokensB.has(token)).length;
  const union = new Set([...tokensA, ...tokensB]).size;

  return union === 0 ? 0 : intersection / union;
}

function levenshteinDistance(a, b) {
  const an = a.length;
  const bn = b.length;
  const dp = Array.from({ length: an + 1 }, () => Array(bn + 1).fill(0));

  for (let i = 0; i <= an; i++) dp[i][0] = i;
  for (let j = 0; j <= bn; j++) dp[0][j] = j;

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[an][bn];
}

function stringSimilarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

class SemanticSearch {
  static searchNodes(query, nodes, limit = 10) {
    if (!query || !nodes || nodes.length === 0) {
      return [];
    }

    const normalized = normalizeText(query);
    const queryTokens = tokenize(query);

    const scored = nodes.map((node) => {
      const label = node.label.toLowerCase();

      let score = 0;

      if (normalized === normalizeText(node.label)) {
        score = 100;
      } else if (label.includes(normalized) || normalized.includes(label)) {
        score = 80;
      } else {
        const tokenOverlap = queryTokens.filter((token) => label.includes(token)).length / Math.max(1, queryTokens.length);
        const jaccard = jaccardSimilarity(query, node.label) * 70;
        const stringSim = stringSimilarity(normalized, normalizeText(node.label)) * 60;

        score = tokenOverlap * 50 + jaccard + stringSim;
      }

      if (node.type === 'main') {
        score *= 1.2;
      } else if (node.type === 'sub') {
        score *= 1.1;
      }

      return {
        ...node,
        searchScore: score
      };
    });

    return scored
      .filter((node) => node.searchScore > 10)
      .sort((a, b) => b.searchScore - a.searchScore)
      .slice(0, limit);
  }

  static findBestMatch(query, nodes) {
    const results = this.searchNodes(query, nodes, 1);
    return results.length > 0 ? results[0] : null;
  }

  static autocomplete(query, nodes, limit = 5) {
    if (!query || query.length < 2) {
      return nodes.slice(0, limit).map((n) => ({
        label: n.label,
        id: n.id || n._id,
        type: n.type
      }));
    }

    const results = this.searchNodes(query, nodes, limit);
    return results.map((n) => ({
      label: n.label,
      id: n.id || n._id,
      type: n.type,
      score: n.searchScore
    }));
  }

  static getRelated(nodeLabel, nodes, edges, limit = 5) {
    const node = nodes.find((n) => n.label.toLowerCase() === nodeLabel.toLowerCase());
    if (!node) return [];

    const nodeId = node._id?.toString() || node.id;
    const connectedIds = new Set();

    edges.forEach((edge) => {
      const fromId = edge.from?.toString() || edge.from;
      const toId = edge.to?.toString() || edge.to;

      if (fromId === nodeId) {
        connectedIds.add(toId);
      }
      if (toId === nodeId) {
        connectedIds.add(fromId);
      }
    });

    const related = nodes
      .filter((n) => {
        const nId = n._id?.toString() || n.id;
        return connectedIds.has(nId);
      })
      .sort((a, b) => (b.score || 1) - (a.score || 1))
      .slice(0, limit);

    return related;
  }
}

module.exports = SemanticSearch;
