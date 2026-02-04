const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true
    },
    options: [{
        type: String,
        required: true
    }],
    correctOption: {
        type: Number, // Index of the correct option (0, 1, 2, 3)
        required: true
    },
    topic: {
        type: String,
        required: true,
        index: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
