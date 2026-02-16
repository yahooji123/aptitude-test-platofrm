const Exam = require('../models/Exam');
const ExamRegistration = require('../models/ExamRegistration');
const crypto = require('crypto');

// --- Admin Controllers ---

exports.getCreateExam = (req, res) => {
    res.render('exam/admin/create_exam', {
        title: 'Create New Exam'
    });
};

exports.createExam = async (req, res) => {
    try {
        const { title, date, startTime, endTime, instructions, questionPaperContent } = req.body;

        // Parse date and times
        // Assuming date is in YYYY-MM-DD format
        // times are in HH:MM format
        
        const examDate = new Date(date);
        
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);

        const newExam = new Exam({
            title,
            date: examDate,
            startTime: startDateTime,
            endTime: endDateTime,
            instructions,
            questionPaperContent
        });

        await newExam.save();
        res.redirect('/exams/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Error creating exam' });
    }
};

exports.getAdminDashboard = async (req, res) => {
    try {
        const exams = await Exam.find().sort({ date: -1 });
        res.render('exam/admin/dashboard', { exams });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

// --- Student Controllers ---

exports.getExamList = async (req, res) => {
    try {
        // Show all exams, sorted by date (newest first)
        const exams = await Exam.find({}).sort({ date: -1 });
        res.render('exam/student/list', { exams });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

exports.getRegister = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).render('error', { message: 'Exam not found' });
        
        res.render('exam/student/register', { exam });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

exports.postRegister = async (req, res) => {
    try {
        const { studentName, rollNumber, dob } = req.body;
        const examId = req.params.id;

        // generated registration number
        const registrationNumber = `REG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newRegistration = new ExamRegistration({
            examId,
            studentName,
            rollNumber,
            dob: new Date(dob),
            registrationNumber
        });

        await newRegistration.save();

        // Redirect to card view
        res.redirect(`/exams/card/${newRegistration._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Registration failed' });
    }
};

exports.getEditExam = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).render('error', { message: 'Exam not found' });
        
        res.render('exam/admin/edit_exam', { exam });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

exports.postEditExam = async (req, res) => {
    try {
        const { title, date, startTime, endTime, instructions, questionPaperContent } = req.body;
        
        const examDate = new Date(date);
        
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);

        await Exam.findByIdAndUpdate(req.params.id, {
            title,
            date: examDate,
            startTime: startDateTime,
            endTime: endDateTime,
            instructions,
            questionPaperContent
        });

        res.redirect('/exams/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Error updating exam' });
    }
};

exports.deleteExam = async (req, res) => {
    try {
        await Exam.findByIdAndDelete(req.params.id);
        // We really should also delete related registrations
        await ExamRegistration.deleteMany({ examId: req.params.id });
        
        res.redirect('/exams/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Error deleting exam' });
    }
};

exports.getStudentCard = async (req, res) => {
    try {
        const registration = await ExamRegistration.findById(req.params.regId).populate('examId');
        if (!registration) return res.status(404).render('error', { message: 'Registration not found' });

        res.render('exam/student/card', { registration });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

exports.getExamLogin = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).render('error', { message: 'Exam not found' });

        res.render('exam/student/login', { exam });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

exports.postExamLogin = async (req, res) => {
    try {
        const { registrationNumber, dob } = req.body;
        const examId = req.params.id;

        const registration = await ExamRegistration.findOne({ 
            registrationNumber, 
            examId
        }).populate('examId');

        if (!registration) {
            return res.render('exam/student/login', { exam: await Exam.findById(examId), error: 'Invalid Registration Number' });
        }

        // Compare DOB (ignoring time if possible, or direct compare)
        // Usually DOB is stored as date, let's normalize check
        const inputDob = new Date(dob);
        if (registration.dob.toISOString().split('T')[0] !== inputDob.toISOString().split('T')[0]) {
             return res.render('exam/student/login', { exam: await Exam.findById(examId), error: 'Invalid Date of Birth' });
        }

        // Check if exam is live or upcoming
        // For simplicity, we just pass the registration ID to the attempt page or create a session
        // Here we can use a simple query params or session-based approach, query param is easier for now but less secure. 
        // Let's use a query param `regId` for simplicity as session setup might be complex in existing app without knowing session middleware details.
        
        res.redirect(`/exams/${examId}/attempt?regId=${registration._id}`);
    } catch (err) {
         console.error(err);
         res.status(500).render('error', { message: 'Login Error' });
    }
};

exports.getAttemptExam = async (req, res) => {
    try {
        const { regId } = req.query;
        const examId = req.params.id;
        
        const registration = await ExamRegistration.findById(regId).populate('examId');
        
        if (!registration || registration.examId._id.toString() !== examId) {
             return res.redirect(`/exams/${examId}/login`);
        }

        const exam = registration.examId;
        const now = new Date();
        
        // Check timing
        let status = 'waiting';
        let timeLeft = 0; // seconds

        if (now < exam.startTime) {
            status = 'waiting';
            timeLeft = (exam.startTime - now) / 1000;
        } else if (now >= exam.startTime && now <= exam.endTime) {
            status = 'live';
            timeLeft = (exam.endTime - now) / 1000;
        } else {
            status = 'ended';
            timeLeft = 0;
        }

        res.render('exam/student/attempt', { 
            exam, 
            registration, 
            status, 
            timeLeft: Math.floor(timeLeft)
        });

    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Error loading exam' });
    }
};

exports.postSubmitExam = async (req, res) => {
    try {
        const { regId, submission } = req.body;
        
        await ExamRegistration.findByIdAndUpdate(regId, {
            submission,
            submittedAt: new Date()
        });
        
        res.redirect('/exams');
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Submission failed' });
    }
};

exports.getExamRegistrations = async (req, res) => {
    try {
        const examId = req.params.examId;
        const exam = await Exam.findById(examId);
        const registrations = await ExamRegistration.find({ examId }).sort({ studentName: 1 });
        
        res.render('exam/admin/registrations', { exam, registrations });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Error fetching registrations' });
    }
};

exports.deleteExamRegistration = async (req, res) => {
    try {
        const regId = req.params.regId;
        const registration = await ExamRegistration.findByIdAndDelete(regId);
        
        if (registration) {
            res.redirect(`/exams/admin/registrations/${registration.examId}`);
        } else {
            res.status(404).render('error', { message: 'Registration not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Error deleting registration' });
    }
};
