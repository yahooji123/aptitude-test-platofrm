const EssayTopic = require('../models/EssayTopic');
const EssaySubmission = require('../models/EssaySubmission');

// --- ADMIN CONTROLLERS ---

// GET Admin Essay Dashboard (Manage Topics)
exports.getAdminEssayDashboard = async (req, res) => {
    try {
        const topics = await EssayTopic.find().sort({ createdAt: -1 });
        res.render('essay/admin_dashboard', { topics });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// POST Bulk Add Topics
exports.addBulkTopics = async (req, res) => {
    try {
        const { topicsText } = req.body; // Expecting newline separated string
        if (!topicsText) return res.redirect('/essay/admin/dashboard');

        const lines = topicsText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        const operations = lines.map(topic => ({
            insertOne: {
                document: { topic, createdBy: req.user._id }
            }
        }));

        if (operations.length > 0) {
            await EssayTopic.bulkWrite(operations);
        }
        
        res.redirect('/essay/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// POST Toggle Topic Status
exports.toggleTopicStatus = async (req, res) => {
    try {
        const topic = await EssayTopic.findById(req.params.id);
        if (topic) {
            topic.isActive = !topic.isActive;
            await topic.save();
        }
        res.redirect('/essay/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// POST Delete Topic
exports.deleteTopic = async (req, res) => {
    try {
        await EssayTopic.findByIdAndDelete(req.params.id);
        // Also delete associated submissions to keep DB clean
        await EssaySubmission.deleteMany({ topic: req.params.id }); 
        res.redirect('/essay/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// POST Delete All Topics
exports.deleteAllTopics = async (req, res) => {
    try {
        await EssayTopic.deleteMany({});
        await EssaySubmission.deleteMany({});
        res.redirect('/essay/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// POST Delete Selected Topics (Bulk)
exports.deleteSelectedTopics = async (req, res) => {
    try {
        const { topicIds } = req.body; // Expecting array of IDs
        if (topicIds) {
            // Determine if it's an array or single string (if only one checked)
            const idsToDelete = Array.isArray(topicIds) ? topicIds : [topicIds];
            
            await EssayTopic.deleteMany({ _id: { $in: idsToDelete } });
            await EssaySubmission.deleteMany({ topic: { $in: idsToDelete } });
        }
        res.redirect('/essay/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// GET Submissions List
exports.getAdminSubmissions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const [submissions, total] = await Promise.all([
            EssaySubmission.find()
                .populate('user', 'name email')
                .populate('topic', 'topic')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            EssaySubmission.countDocuments()
        ]);
        
        const totalPages = Math.ceil(total / limit);
        
        res.render('essay/admin_submissions', { 
            submissions,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// GET Evaluate Submission
exports.getEvaluatePage = async (req, res) => {
    try {
        const submission = await EssaySubmission.findById(req.params.id)
            .populate('user', 'name')
            .populate('topic', 'topic');
            
        if (!submission) return res.redirect('/essay/admin/submissions');
        
        res.render('essay/admin_evaluate', { submission });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// POST Submit Evaluation
exports.submitEvaluation = async (req, res) => {
    try {
        const { score, feedback } = req.body;
        const submission = await EssaySubmission.findById(req.params.id);
        
        if (submission) {
            submission.score = parseFloat(score);
            submission.feedback = feedback;
            submission.status = 'Checked';
            await submission.save();
        }
        res.redirect('/essay/admin/submissions');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// POST Delete Submission
exports.deleteSubmission = async (req, res) => {
    try {
        await EssaySubmission.findByIdAndDelete(req.params.id);
        res.redirect('/essay/admin/submissions');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// --- STUDENT CONTROLLERS ---

// GET Student Essay Dashboard
exports.getStudentEssayDashboard = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const [submissions, total] = await Promise.all([
            EssaySubmission.find({ user: req.user._id })
                .populate('topic', 'topic')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            EssaySubmission.countDocuments({ user: req.user._id })
        ]);
        
        const totalPages = Math.ceil(total / limit);

        res.render('essay/student_dashboard', { 
            submissions,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// GET Start Random Essay (Redirects to persistent URL)
exports.startEssayTest = async (req, res) => {
    try {
        const { mode } = req.query; // 'exam' or 'practice'

        // Find a random ACTIVE topic
        const count = await EssayTopic.countDocuments({ isActive: true });
        if (count === 0) return res.send('No essay topics available. Please ask admin to add some.');

        const random = Math.floor(Math.random() * count);
        const topic = await EssayTopic.findOne({ isActive: true }).skip(random);

        if (!topic) return res.redirect('/essay/student/dashboard');

        // Redirect to a specific URL so refreshing doesn't change the topic
        res.redirect(`/essay/student/write/${topic._id}?mode=${mode || 'practice'}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// GET Render Write Page (Persistent URL)
exports.renderWritePage = async (req, res) => {
    try {
        const topic = await EssayTopic.findById(req.params.id);
        if (!topic) return res.redirect('/essay/student/dashboard');

        const mode = req.query.mode || 'practice';
        
        // Pass topic and mode to the view
        res.render('essay/write', { topic, mode });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// POST Submit Essay
exports.submitEssay = async (req, res) => {
    try {
        const { topicId, essayContent } = req.body;
        
        // Idempotency: Prevent double submission of same content
        const duplicate = await EssaySubmission.findOne({
            user: req.user._id,
            topic: topicId,
            essayContent
        });

        if (duplicate) {
             return res.redirect('/essay/student/dashboard');
        }

        await EssaySubmission.create({
            user: req.user._id,
            topic: topicId,
            essayContent
        });

        res.redirect('/essay/student/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// GET View Result
exports.getViewResult = async (req, res) => {
    try {
        const submission = await EssaySubmission.findOne({ 
            _id: req.params.id, 
            user: req.user._id 
        }).populate('topic', 'topic');
        
        if (!submission) return res.redirect('/essay/student/dashboard');
        
        res.render('essay/view_result', { submission });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};
