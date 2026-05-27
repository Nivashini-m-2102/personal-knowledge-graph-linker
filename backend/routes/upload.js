
const express = require('express');
const router = express.Router();
const multer = require('multer');

const { protect } = require('../middleware/authMiddleware');
const { parseFile } = require('../services/fileParser');
const extractConcepts = require('../services/conceptExtractor');
const buildGraph = require('../services/graphBuilder');

// Multer setup
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// 🔥 FIXED ROUTE
router.post('/', protect, upload.array('files', 20), async (req, res) => {
    try {
        console.log("FILES RECEIVED:", req.files?.length);
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        let totalConceptsExtracted = 0;

        for (const file of req.files) {
            console.log("PROCESSING:", file.originalname);

            const text = await parseFile(file.path, file.mimetype);

            if (!text || text.trim().length === 0) {
                console.log("EMPTY FILE SKIPPED");
                continue;
            }

            const concepts = extractConcepts(text);

            const total = concepts.labels ? concepts.labels.length : 0;
            console.log("TOTAL CONCEPTS:", total);

            totalConceptsExtracted += total;

            // 🔥 IMPORTANT FIX
            if (total > 0) {
                await buildGraph(req.user._id, concepts, file.originalname);
            } else {
                console.log("NO CONCEPTS FOUND - SKIPPING GRAPH");
            }
        }

        res.json({
            message: 'Upload processed successfully',
            conceptsFound: totalConceptsExtracted
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Server error during upload' });
    }
});

module.exports = router;