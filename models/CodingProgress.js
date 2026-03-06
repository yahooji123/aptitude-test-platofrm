const mongoose = require('mongoose');

const codingProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    seenQuestions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodingQuestion'
    }]
}, { timestamps: true });

module.exports = mongoose.model('CodingProgress', codingProgressSchema);
