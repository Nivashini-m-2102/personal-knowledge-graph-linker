const mongoose = require('mongoose');

const edgeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Node',
    required: true
  },

  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Node',
    required: true
  },

  // ✅ FIX: Allow all relation types used in pipeline
  label: {
    type: String,
    enum: [
      'strong',
      'structure',
      'related',
      'context',
      'conceptual',
      'definition',
      'hierarchy',     // ✅ ADDED (fixes your error)
      'dependency',
      'association'
    ],
    default: 'related'
  }

}, { timestamps: true });

module.exports = mongoose.model('Edge', edgeSchema);