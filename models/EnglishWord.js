const mongoose = require('mongoose');

const EnglishWordSchema = new mongoose.Schema({
    word: {
        type: String,
        required: true,
        trim: true
    },
    hindiMeaning: {
        type: String,
        required: true,
        trim: true
    },
    topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EnglishTopic',
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('EnglishWord', EnglishWordSchema);
