const EssaySubmission = require('../models/EssaySubmission');
const ExamRegistration = require('../models/ExamRegistration');
const Faculty = require('../models/Faculty');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// GET /faculty/register
exports.getRegister = (req, res) => {
    res.render('faculty/register', { error: null, success: null });
};

// POST /faculty/register
exports.postRegister = async (req, res) => {
    try {
        const { name, email, qualification, experience } = req.body;
        
        let faculty = await Faculty.findOne({ email });
        if (faculty) {
            return res.render('faculty/register', { 
                error: 'Faculty with this email already exists', 
                success: null 
            });
        }

        faculty = await Faculty.create({
            name,
            email,
            qualification,
            experience,
            status: 'pending' // Initial status
        });

        res.render('faculty/register', { 
            success: 'Registration successful! Wait for admin approval.',
            error: null 
        });

    } catch (error) {
        console.error(error);
        res.render('faculty/register', { error: 'Server error', success: null });
    }
};

// GET /faculty/status
exports.getStatus = (req, res) => {
    res.render('faculty/status', { faculty: null, error: null });
};

// POST /faculty/status
exports.postStatus = async (req, res) => {
    try {
        const { email } = req.body;
        const faculty = await Faculty.findOne({ email });

        if (!faculty) {
            return res.render('faculty/status', { faculty: null, error: 'Application not found with this email' });
        }

        res.render('faculty/status', { faculty, error: null });

    } catch (error) {
        console.error(error);
        res.render('faculty/status', { faculty: null, error: 'Server error check status' });
    }
};

// POST /faculty/setup-password/:id
exports.setupPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const faculty = await Faculty.findById(req.params.id);

        if (!faculty) return res.send('No faculty found');
        if (faculty.status !== 'approved') return res.send('Not approved yet');

        faculty.password = password;
        await faculty.save();

        res.redirect('/faculty/login?msg=success');
    } catch (error) {
        console.error(error);
        res.send('Server Error');
    }
};


// GET /faculty/login
exports.getLogin = (req, res) => {
    res.render('faculty/login', { error: null, msg: req.query.msg });
};

// POST /faculty/login
exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const faculty = await Faculty.findOne({ email });

        if (!faculty || !(await faculty.matchPassword(password))) {
            return res.render('faculty/login', { error: 'Invalid Credentials', msg: null });
        }
        
        if (faculty.status !== 'approved') {
            return res.render('faculty/login', { error: 'Account not approved yet or banned', msg: null });
        }

        const token = generateToken(faculty._id);
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        };

        res.cookie('facultyToken', token, cookieOptions);
        res.redirect('/faculty/dashboard');

    } catch (err) {
        console.error(err);
        res.render('faculty/login', { error: 'Server error', msg: null });
    }
};

// GET /faculty/dashboard
exports.getDashboard = async (req, res) => {
    try {
        const pendingEssays = await EssaySubmission.find({ status: 'Pending Evaluation' })
            .populate('user', 'name')
            .populate('topic', 'topic')
            .sort({ createdAt: -1 })
            .lean();
            
        const pendingExams = await ExamRegistration.find({ submittedAt: { $exists: true }, graded: false })
            .populate('examId', 'title')
            .sort({ submittedAt: -1 })
            .lean();
            
        const completedCount = await EssaySubmission.countDocuments({ status: 'Checked' }) + 
                               await ExamRegistration.countDocuments({ graded: true });

        res.render('faculty/dashboard', { 
            faculty: req.faculty, 
            pendingEssays, 
            pendingExams,
            pendingCount: pendingEssays.length + pendingExams.length,
            completedCount
        });
    } catch (error) {
        res.send('Server Error');
    }
};

// GET /faculty/logout
exports.logout = (req, res) => {
    res.clearCookie('facultyToken');
    res.redirect('/faculty/login');
};


exports.getEvaluateEssay = async (req, res) => {
    try {
        const submission = await EssaySubmission.findById(req.params.id)
            .populate('user', 'name')
            .populate('topic', 'topic');
            
        if (!submission) return res.redirect('/faculty/dashboard');
        
        res.render('faculty/evaluate_essay', { faculty: req.faculty, submission });
    } catch (error) {
        console.error(error);
        res.send('Server Error');
    }
};

exports.postEvaluateEssay = async (req, res) => {
    try {
        const { score, feedback } = req.body;
        const submission = await EssaySubmission.findById(req.params.id);
        
        if (submission) {
            submission.score = parseFloat(score);
            submission.feedback = feedback;
            submission.status = 'Checked';
            await submission.save();
        }
        res.redirect('/faculty/dashboard');
    } catch (error) {
        console.error(error);
        res.send('Server Error');
    }
};

exports.getEvaluateExam = async (req, res) => {
    try {
        const registration = await ExamRegistration.findById(req.params.id)
            .populate('examId');
            
        if (!registration) return res.redirect('/faculty/dashboard');
        
        res.render('faculty/evaluate_exam', { faculty: req.faculty, registration });
    } catch (error) {
        console.error(error);
        res.send('Server Error');
    }
};

exports.postEvaluateExam = async (req, res) => {
    try {
        const { marks, remarks } = req.body;
        const registration = await ExamRegistration.findById(req.params.id);
        
        if (registration) {
            registration.marks = parseFloat(marks);
            registration.remarks = remarks;
            registration.graded = true;
            await registration.save();
        }
        res.redirect('/faculty/dashboard');
    } catch (error) {
        console.error(error);
        res.send('Server Error');
    }
};
