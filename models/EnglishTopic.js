const mongoose = require('mongoose');

const EnglishTopicSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['Vocabulary', 'Grammar', 'Tenses', 'Verbs', 'Other'],
        default: 'Vocabulary'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('EnglishTopic', EnglishTopicSchema);
