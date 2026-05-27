const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const parseFile = async (filePath, mimetype) => {
  try {
    let text = '';

    if (mimetype === 'application/pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      text = data.text || '';
    } else if (mimetype.includes('wordprocessingml.document')) {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value || '';
    } else if (mimetype === 'text/plain') {
      text = fs.readFileSync(filePath, 'utf8');
    } else {
      text = '';
    }

    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\u00A0\u2000-\u206F]/g, ' ')
      .replace(/[^\u0000-\u007F\n]/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/ +/g, ' ')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n')
      .trim();

    return text;
  } catch (err) {
    console.error('PARSE ERROR:', err);
    return '';
  }
};

async function extractFromText(text) {
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u00A0\u2000-\u206F]/g, ' ')
    .replace(/[^\u0000-\u007F\n]/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();

  return { text: cleaned };
}

module.exports = { parseFile, extractFromText };