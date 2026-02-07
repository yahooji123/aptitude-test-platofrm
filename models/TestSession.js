const mongoose = require('mongoose');

const testSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    testConfig: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestConfig',
        required: true
    },
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    }],
    startTime: {
        type: Date,
        default: Date.now
    },
    // Adaptive Fields
    isAdaptive: {
        type: Boolean,
        default: false
    },
    currentDifficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    responses: [{
        question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
        selectedOption: Number,
        correctOption: Number,
        isCorrect: Boolean,
        timeTaken: Number
    }],
    status: {
        type: String,
        enum: ['inprogress', 'completed'],
        default: 'inprogress'
    }
});

module.exports = mongoose.model('TestSession', testSessionSchema);
