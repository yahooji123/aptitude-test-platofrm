const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    correctAnswers: {
        type: Number,
        default: 0
    },
    incorrectAnswers: {
        type: Number,
        default: 0
    },
    skippedAnswers: {
        type: Number,
        default: 0
    },
    timeTaken: { // in seconds
        type: Number,
        default: 0
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    topic: {
        type: String
    },
    testConfig: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestConfig'
    },
    attemptNumber: {
        type: Number,
        default: 1
    },
    detailedResponses: [{
        question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question'
        },
        selectedOption: Number,
        correctOption: Number,
        isCorrect: Boolean,
        status: {
            type: String,
            enum: ['correct', 'wrong', 'skipped']
        }
    }],
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
