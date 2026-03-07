const mongoose = require('mongoose');

const apiUsageSchema = new mongoose.Schema({
    keyAlias: { type: String, required: true, unique: true },
    keyPrefix: { type: String, required: true },
    provider: { type: String, enum: ['Gemini', 'Groq'], default: 'Gemini' },
    requestCount: { type: Number, default: 0 },
    isExhausted: { type: Boolean, default: false },
    lastUsed: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ApiUsage', apiUsageSchema);