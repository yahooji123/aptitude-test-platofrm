const mongoose = require('mongoose');

const readingResultSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    passages: [{
        passageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReadingPassage' },
        answers: [Number], // User's selected indices like [0, 2, 1, 3, 0] (-1 if skipped, though we'll force answer)
        passageScore: Number
    }],
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 20 },
    completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReadingResult', readingResultSchema);
