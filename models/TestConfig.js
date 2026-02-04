const mongoose = require('mongoose');

const testConfigSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    topics: [{ type: String, required: true }], // Array of topics included
    duration: { type: Number, required: true }, // in minutes
    totalQuestions: { type: Number, required: true },
    difficultyDistribution: {
        easy: { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        hard: { type: Number, default: 0 }
    },
    markingScheme: {
        correct: { type: Number, default: 1 },
        incorrect: { type: Number, default: 0 }
    },
    category: { type: String, enum: ['Test', 'Practice Set'], default: 'Test' },
    tags: [{ type: String }], // 'Beginner', 'Interview Prep', 'Marathon'
    isActive: { type: Boolean, default: true },
    isAdaptive: { type: Boolean, default: false }, // New Adaptive Flag
    startDate: { type: Date },
    endDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('TestConfig', testConfigSchema);
