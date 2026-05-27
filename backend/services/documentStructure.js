const GENERIC_HEADINGS = [
  /^unit\s*\d+/i,
  /^chapter\s*\d+/i,
  /^introduction$/i,
  /^overview$/i,
  /^basics$/i,
  /^important$/i,
  /^definitions?$/i,
  /^summary$/i,
  /^conclusion$/i,
  /^references?$/i,
  /^objectives?$/i,
  /^learning outcomes?$/i,
  /^course content$/i,
  /^example(s)?$/i,
  /^exercise(s)?$/i,
  /^problem(s)?$/i,
  /^lecture(s)?$/i,
  /^notes?$/i
];

function isGenericHeading(text) {
  return GENERIC_HEADINGS.some((pattern) => pattern.test(text.trim()));
}

function cleanLine(line) {
  return line
    .replace(/\r/g, '')
    .replace(/[\u00A0\u2000-\u206F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectHeadingLevel(line) {
  if (/^\s*\d+(\.\d+)*\s+/.test(line)) {
    return 1;
  }
  if (/^\s*\*|^\s*\u2022|^\s*[-+]\s+/.test(line)) {
    return 0;
  }
  if (/^[A-Z0-9][A-Z0-9\s]{3,}$/.test(line) && line === line.toUpperCase()) {
    return 1;
  }
  if (/^\s{2,}/.test(line)) {
    return 2;
  }
  return 0;
}

function parseStructure(text) {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((line) => line.length > 0);

  const blocks = [];
  let currentHeading = null;
  let currentPath = [];

  lines.forEach((line) => {
    const level = detectHeadingLevel(line);
    if (level === 1 && !line.match(/^\s*[-*\u2022]/)) {
      const heading = line.replace(/^\d+(\.\d+)*\s+/, '').trim();
      const generic = isGenericHeading(heading);
      currentHeading = { text: heading, generic, level: 1 };
      currentPath = generic ? currentPath : [heading];
      blocks.push({ type: 'heading', text: heading, generic, level: 1, path: [...currentPath] });
      return;
    }

    if (level === 2) {
      const heading = line.trim();
      const generic = isGenericHeading(heading);
      if (!generic) {
        currentPath = [...currentPath.slice(0, 1), heading];
      }
      blocks.push({ type: 'subheading', text: heading, generic, level: 2, path: [...currentPath] });
      return;
    }

    if (/^\s*[-*\u2022\d]+[\).\s]+/.test(line)) {
      blocks.push({ type: 'bullet', text: line.replace(/^\s*[-*\u2022\d]+[\).\s]+/, '').trim(), generic: false, level: 0, path: [...currentPath] });
      return;
    }

    blocks.push({ type: 'paragraph', text: line, generic: false, level: 0, path: [...currentPath] });
  });

  return {
    blocks,
    headings: blocks.filter((block) => block.type === 'heading' || block.type === 'subheading')
  };
}

function getClosestHeadingPath(index, blocks) {
  for (let i = index; i >= 0; i -= 1) {
    if (blocks[i].type === 'heading' || blocks[i].type === 'subheading') {
      return blocks[i].path;
    }
  }
  return [];
}

module.exports = {
  parseStructure,
  isGenericHeading,
  getClosestHeadingPath
};