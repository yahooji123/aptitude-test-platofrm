const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    options: { type: [String], required: true }, // Array of 4 strings
    correctOption: { type: Number, required: true }, // 0-3 index
    explanation: { type: String, default: 'No explanation provided.' }
});

const readingPassageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    questions: { 
        type: [questionSchema], 
        validate: [arrayLimit, '{PATH} exceeds the limit of 5'] 
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

function arrayLimit(val) {
    return val.length <= 5;
}

module.exports = mongoose.model('ReadingPassage', readingPassageSchema);
