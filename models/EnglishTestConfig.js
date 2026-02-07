const mongoose = require('mongoose');

const EnglishTestConfigSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        trim: true
    },
    description: { 
        type: String,
        trim: true 
    },
    topic: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'EnglishTopic',
        required: true 
    },
    questionCount: { 
        type: Number, 
        default: 10 
    },
    duration: { 
        type: Number, 
        default: 15 // in minutes
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User'
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('EnglishTestConfig', EnglishTestConfigSchema);
