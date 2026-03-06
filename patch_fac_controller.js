const fs = require('fs');

let content = fs.readFileSync('controllers/facultyController.js', 'utf8');

if (!content.includes('EssaySubmission')) {
    content = "const EssaySubmission = require('../models/EssaySubmission');\n" + 
              "const ExamRegistration = require('../models/ExamRegistration');\n" + 
              content;
}

content = content.replace(
    /exports\.getDashboard = async \(req, res\) => \{[\s\S]*?res\.render\('faculty\/dashboard'[\s\S]*?\} catch \(error\) \{/m,
    `exports.getDashboard = async (req, res) => {
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
    } catch (error) {`
);

// Add Evaluation Handlers if not exist
if (!content.includes('getEvaluateEssay')) {
    content += `

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
`;
}

fs.writeFileSync('controllers/facultyController.js', content);
