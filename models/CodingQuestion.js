const mongoose = require('mongoose');

const codingQuestionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    topic: {
        type: String,
        required: true,
        index: true
    },
    problem: {
        type: String,
        required: true
    },
    examples: {
        type: String,
        required: true
    },
    expectedTime: {
        type: Number, // Time in minutes
        required: true,
        default: 10
    }
}, { timestamps: true });

module.exports = mongoose.model('CodingQuestion', codingQuestionSchema);
