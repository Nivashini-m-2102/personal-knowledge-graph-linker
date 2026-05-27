const use = require('@tensorflow-models/universal-sentence-encoder');
const tf = require('@tensorflow/tfjs');

let modelPromise = null;

async function getModel() {
  if (!modelPromise) {
    modelPromise = use.load();
  }
  return modelPromise;
}

function normalizeVector(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm > 0 ? vector.map((value) => value / norm) : vector;
}

async function embedTexts(texts) {
  const model = await getModel();
  const embeddings = await model.embed(texts);
  const raw = await embeddings.array();
  embeddings.dispose();
  return raw.map(normalizeVector);
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

module.exports = {
  embedTexts,
  cosineSimilarity
};