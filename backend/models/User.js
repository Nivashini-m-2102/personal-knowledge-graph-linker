const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    learnedConcepts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Node' }],
    learningStreak: { type: Number, default: 0 },
    lastLoginDate: { type: Date }
});

module.exports = mongoose.model('User', UserSchema);
