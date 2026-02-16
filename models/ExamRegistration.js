const mongoose = require('mongoose');

const examRegistrationSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    rollNumber: {
        type: String,
        required: true,
        trim: true
    },
    dob: {
        type: Date, // Date of Birth
        required: true
    },
    // Generate a unique registration number/ID for this specific exam session
    registrationNumber: {
        type: String,
        required: true,
        unique: true
    },
    submission: { type: String, default: '' },
    submittedAt: { type: Date },
    startedAt: { type: Date }, // When the student started the exam
    suspiciousActivityCount: { type: Number, default: 0 },
    registeredAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ExamRegistration', examRegistrationSchema);
