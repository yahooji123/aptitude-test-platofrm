const mongoose = require('mongoose');

const EnglishProgressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    word: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EnglishWord',
        required: true
    },
    topic: { // Denormalized for easier querying
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EnglishTopic',
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    correctCount: {
        type: Number,
        default: 0
    },
    incorrectCount: {
        type: Number,
        default: 0
    },
    lastAttemptDate: {
        type: Date,
        default: Date.now
    },
    nextReviewDate: { // For Spaced Repetition Logic (Optional)
        type: Date
    },
    status: {
        type: String,
        enum: ['new', 'learning', 'mastered'],
        default: 'new'
    }
});

module.exports = mongoose.model('EnglishProgress', EnglishProgressSchema);
