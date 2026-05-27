const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['main', 'sub', 'related'], default: 'sub' },
    score: { type: Number, default: 1 },
    importance: { type: Number, default: 1 },
    domain: { type: String, default: 'General' },
    prerequisites: { type: [String], default: [] },
    contextSentences: { type: [String], default: [] },
    description: { type: String, default: '' },
    sourceFile: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Node', NodeSchema);
