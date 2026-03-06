const mongoose = require('mongoose');

const essaySubmissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EssayTopic',
        required: true
    },
    essayContent: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Draft', 'Pending Evaluation', 'Checked'],
        default: 'Pending Evaluation'
    },
    liveAiCredits: {
        type: Number,
        default: 5
    },
    score: {
        type: Number,
        default: null
    },
    feedback: {
        type: String,
        default: ''
    },
    maxMarks: {
        type: Number,
        default: 10
    },
    highlightedText: {
        type: String,
        default: ''
    },
    aiCredits: {
        type: Number,
        default: 3
    },
    aiHindiTranslation: {
        type: String,
        default: null
    },
    aiDifficultWords: {
        type: String,
        default: null
    },
    aiGrammarExplanation: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('EssaySubmission', essaySubmissionSchema);
