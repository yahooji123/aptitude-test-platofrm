const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    items: [
         {
            type: String
         }
    ],
    // Store times as strings like "10:00" or Date objects. 
    // Usually easier to store combined Date or just time strings if the date is separate.
    // Let's use Date objects for start and end to simplify duration calculation and comparisons.
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    instructions: {
        type: String,
        required: true
    },
    questionPaperContent: {
        type: String, // This will store the pasted text
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Exam', examSchema);
