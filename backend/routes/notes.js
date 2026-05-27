const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const generateNotes = require('../services/notesGenerator');
const { renderPdf } = require('../services/pdfService');
const Node = require('../models/Node');
const Edge = require('../models/Edge');

router.post('/pdf', protect, async (req, res) => {
  try {
    const userId = req.user._id; // FIXED (was .id)

    const nodes = await Node.find({ user: userId }).lean();
    const edges = await Edge.find({ user: userId }).populate('from to').lean();

    if (!nodes.length) {
      return res.status(400).json({ error: "No data to generate notes" });
    }

    const html = generateNotes(nodes, edges);

    const pdfBuffer = await renderPdf(html);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
      'Content-Disposition': 'inline; filename="NeuroMap-AI-Notes.pdf"' // INLINE FIX
    });

    res.end(pdfBuffer);

  } catch (err) {
    console.error('PDF ERROR:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const nodes = await Node.find({ user: userId }).lean();
    const edges = await Edge.find({ user: userId }).populate('from to').lean();
    const html = generateNotes(nodes, edges);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('Notes generation failed:', err);
    return res.status(500).json({ error: 'Failed to generate notes.' });
  }
});

module.exports = router;
