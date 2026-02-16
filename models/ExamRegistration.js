const mongoose = require('mongoose');

const examRegistrationSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional for now to support legacy or guest registrations if needed
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
    submissionFiles: [{ type: String }], // Array of URLs for multiple image uploads
    submissionFile: { type: String, default: null }, // Legacy field (optional)
    submittedAt: { type: Date },
    startedAt: { type: Date }, // When the student started the exam
    suspiciousActivityCount: { type: Number, default: 0 },
    marks: { type: Number, default: null },
    remarks: { type: String, default: '' },
    graded: { type: Boolean, default: false },
    registeredAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ExamRegistration', examRegistrationSchema);
