const mongoose = require('mongoose');

const testSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    testConfig: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestConfig',
        required: true
    },
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    }],
    startTime: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['inprogress', 'completed'],
        default: 'inprogress'
    }
});

module.exports = mongoose.model('TestSession', testSessionSchema);
