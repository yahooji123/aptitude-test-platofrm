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
        required: true
    },
    status: {
        type: String,
        enum: ['Pending Evaluation', 'Checked'],
        default: 'Pending Evaluation'
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
    }
}, { timestamps: true });

module.exports = mongoose.model('EssaySubmission', essaySubmissionSchema);
