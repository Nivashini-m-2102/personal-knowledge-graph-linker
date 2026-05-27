const nlp = require('compromise');
const { parseStructure } = require('./documentStructure');

/* ---------------- STOPWORDS ---------------- */
const stopwords = new Set([
  'the','is','in','at','of','a','an','and','or','to','for','on','with',
  'this','that','these','those','from','by','about','as','be','was','are',
  'it','its','which','what','when','where','why','how',
  'unit','chapter','introduction','definition','example','notes','page','section',
  'figure','table','problem','exercise','summary','background','method',
  'lecture','slide','pdf','content','conclusion','result','analysis','overview',
  'topic','material','information','course','text','learning','subject','study'
]);

/* ---------------- IMPORTANT TERMS ---------------- */
const ACRONYMS = new Set([
  'CPU','GPU','OS','API','DBMS','SQL','HTTP','TCP','UDP','RAM','ROM','AI','ML'
]);

const TECHNICAL_TERMS = new Set([
  'machine learning',
  'operating system',
  'cpu scheduling',
  'process management',
  'memory management',
  'file system',
  'deadlock',
  'thread synchronization',
  'virtual memory',
  'neural network',
  'supervised learning',
  'unsupervised learning',
  'classification',
  'regression',
  'round robin scheduling',
  'first come first serve',
  'shortest job first'
]);

/* ---------------- CLEAN ---------------- */
function clean(text) {
  return text
    .replace(/\r\n|\n|\r/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/* ---------------- TOKENIZE ---------------- */
function tokenize(text) {
  return text
    .split(/\s+/)
    .filter(w => w && !stopwords.has(w));
}

/* ---------------- MERGE PHRASES ---------------- */
function generateNGrams(tokens) {
  const phrases = new Set();

  for (let i = 0; i < tokens.length; i++) {
    for (let len = 2; len <= 4; len++) {
      if (i + len <= tokens.length) {
        const phrase = tokens.slice(i, i + len).join(' ');
        phrases.add(phrase);
      }
    }
  }

  return Array.from(phrases);
}

/* ---------------- NOUN PHRASES ---------------- */
function extractNounPhrases(sentence) {
  const doc = nlp(sentence);
  const phrases = new Set();

  doc.nouns().out('array').forEach(p => {
    phrases.add(clean(p));
  });

  doc.match('(#Adjective|#Noun){1,4}').out('array').forEach(p => {
    phrases.add(clean(p));
  });

  return Array.from(phrases);
}

/* ---------------- STRICT FILTER ---------------- */
function isValidConcept(phrase, freq) {
  if (!phrase) return false;

  const words = phrase.split(' ');

  /* ❌ REMOVE single weak words */
  if (words.length === 1) {
    if (ACRONYMS.has(words[0].toUpperCase())) return true;
    return false;
  }

  /* ❌ REMOVE short phrases */
  if (phrase.length < 5) return false;

  /* ❌ REMOVE stopword phrases */
  if (words.some(w => stopwords.has(w))) return false;

  /* ❌ REMOVE garbage */
  if (/^\d+$/.test(phrase)) return false;

  /* ❌ REMOVE low frequency */
  if (freq < 2 && words.length < 3) return false;

  return true;
}

/* ---------------- MAIN FUNCTION ---------------- */
function extractConcepts(text) {

  const structure = parseStructure(text);
  const blocks = structure.blocks;

  const frequency = {};
  const sentenceMap = {};
  const exampleMap = {};
  const sectionMap = {};

  let sentenceIndex = 0;
  let currentHeading = [];

  blocks.forEach(block => {

    if (block.type === 'heading' || block.type === 'subheading') {
      if (!block.generic) currentHeading = block.path;
      return;
    }

    const sentences = block.text.split(/[.?!]/).map(s => s.trim()).filter(Boolean);

    sentences.forEach(sentence => {

      const cleaned = clean(sentence);
      const tokens = tokenize(cleaned);

      const candidates = new Set();

      /* noun phrases */
      extractNounPhrases(sentence).forEach(p => candidates.add(p));

      /* n-grams */
      generateNGrams(tokens).forEach(p => candidates.add(p));

      candidates.forEach(p => {
        if (!p) return;

        frequency[p] = (frequency[p] || 0) + 1;

        if (!sentenceMap[p]) sentenceMap[p] = new Set();
        sentenceMap[p].add(sentenceIndex);

        if (!exampleMap[p]) exampleMap[p] = sentence;

        sectionMap[p] = currentHeading;
      });

      sentenceIndex++;
    });
  });

  /* ---------------- FILTER + SCORE ---------------- */
  let concepts = Object.keys(frequency)
    .filter(p => isValidConcept(p, frequency[p]))
    .sort((a, b) => frequency[b] - frequency[a]);

  /* ---------------- REMOVE SUBSTRINGS ---------------- */
  const finalConcepts = [];

  concepts.forEach(c => {
    let keep = true;

    for (let f of finalConcepts) {
      if (f.includes(c) && c.split(' ').length < f.split(' ').length) {
        keep = false;
        break;
      }
    }

    if (keep) finalConcepts.push(c);
  });

  /* ---------------- FORCE IMPORTANT TERMS ---------------- */
  TECHNICAL_TERMS.forEach(term => {
    if (!finalConcepts.includes(term)) {
      finalConcepts.push(term);
    }
  });

  const top = finalConcepts.slice(0, 40);

  return {
    labels: top,
    sentencesMap: Object.fromEntries(
      top.map(t => [t, Array.from(sentenceMap[t] || [])])
    ),
    sentenceExamples: exampleMap,
    sectionMap
  };
}

module.exports = extractConcepts;