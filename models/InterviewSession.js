const mongoose = require('mongoose');

const interviewSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    questions: [{
        type: String
    }],
    answers: [{
        question: String,
        answer: String,
        confidenceScore: Number,
        communicationScore: Number,
        logicScore: Number,
        feedback: String,
        idealAnswer: String
    }],
    status: {
        type: String,
        enum: ['In Progress', 'Completed'],
        default: 'In Progress'
    }
}, { timestamps: true });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);