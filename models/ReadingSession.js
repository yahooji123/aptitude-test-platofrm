const mongoose = require('mongoose');

const readingSessionSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true // Only one active session per user
    },
    passageIds: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ReadingPassage' 
    }],
    createdAt: { 
        type: Date, 
        default: Date.now,
        expires: 3600 * 24 // Auto-expire after 24 hours to prevent stuck sessions
    }
});

module.exports = mongoose.model('ReadingSession', readingSessionSchema);
