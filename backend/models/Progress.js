const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completed: [String],
  quizScores: {
    type: Map,
    of: {
      score: Number,
      total: Number,
      accuracy: Number,
      timestamp: Date,
      attempts: [{ score: Number, total: Number, timestamp: Date }]
    },
    default: {}
  },
  conceptAccuracy: {
    type: Map,
    of: Number,
    default: {}
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

progressSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Progress', progressSchema);