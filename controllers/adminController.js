const Question = require('../models/Question');
const TestConfig = require('../models/TestConfig');
const Result = require('../models/Result');
const User = require('../models/User'); // Import User for profile management
const SystemSetting = require('../models/SystemSetting'); // Import SystemSetting

// @desc    Get Admin Dashboard
// @route   GET /admin/dashboard
const getDashboard = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const topics = await Question.distinct('topic');
        const questionCount = await Question.countDocuments();
        
        // Paginate Tests
        const [tests, totalTests] = await Promise.all([
            TestConfig.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            TestConfig.countDocuments()
        ]);
        
        const totalPages = Math.ceil(totalTests / limit);

        // Fetch System Settings
        let smartPracticeMode = await SystemSetting.findOne({ key: 'smartPracticeMode' }).lean();
        
        res.render('admin/dashboard', { 
            topics, 
            questionCount, 
            tests,
            smartPracticeMode: smartPracticeMode ? smartPracticeMode.value : false,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { user: req.user, code: 500, message: 'Server Error' });
    }
};

// @desc    Toggle System Setting
// @route   POST /admin/settings/toggle
const toggleSetting = async (req, res) => {
    const { key } = req.body;
    try {
        let setting = await SystemSetting.findOne({ key });
        if (!setting) {
            setting = new SystemSetting({ key, value: true }); // Default create as true if toggled first time
        } else {
            setting.value = !setting.value;
        }
        await setting.save();
        res.json({ success: true, newValue: setting.value });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
};

// @desc    Get Create Test Page
// @route   GET /admin/tests/create
const getCreateTest = async (req, res) => {
    try {
        const topics = await Question.distinct('topic');
        res.render('admin/create_test', { topics });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Create New Test
// @route   POST /admin/tests/create
const createTest = async (req, res) => {
    const { 
        title, 
        topics, // array or single string
        duration, 
        easyCount, mediumCount, hardCount, 
        correctMark, incorrectMark,
        category,
        tags,
        startDate, // New
        endDate,   // New
        isAdaptive // New
    } = req.body;

    // Normalize topics to array
    let topicArray = [];
    if (topics) {
        topicArray = Array.isArray(topics) ? topics : [topics];
    } else {
        // Handle case where no topics are selected
        // We could redirect back with error, or just use empty array (if allowed)
        // For now, let's catch it in try/catch or just define empty
        topicArray = []; 
    }
    
    // Ensure numbers
    const easy = parseInt(easyCount) || 0;
    const medium = parseInt(mediumCount) || 0;
    const hard = parseInt(hardCount) || 0;
    
    // Adaptive Logic Adjustment
    let totalQuestions = 0;
    if (isAdaptive) {
        // If adaptive, check if specific total was sent or calculate from parts (if fallback)
        // Note: The UI for adaptive might send 'adaptiveTotalQuestions'
        const adaptiveTotal = parseInt(req.body.adaptiveTotalQuestions) || 0;
        if (adaptiveTotal > 0) {
            totalQuestions = adaptiveTotal;
        } else {
             // Fallback if they hacked UI or something
             totalQuestions = easy + medium + hard;
        }
    } else {
        totalQuestions = easy + medium + hard;
    }

    try {
        if (topicArray.length === 0) {
            // Can't create test without topics
            return res.status(400).send('Please select at least one topic.');
        }

        // Tag splitting (comma separated)
        const tagArray = tags ? tags.split(',').map(t => t.trim()) : [];

        // Safe Date Parsing
        let start = undefined;
        let end = undefined;

        if (startDate && startDate.trim() !== '') {
            start = new Date(startDate);
            // Check for Invalid Date
            if (isNaN(start.getTime())) start = undefined;
        }

        if (endDate && endDate.trim() !== '') {
            end = new Date(endDate);
            if (isNaN(end.getTime())) end = undefined;
        }

        const newTest = {
            title,
            topics: topicArray,
            duration: parseInt(duration),
            totalQuestions,
            difficultyDistribution: {
                easy,
                medium,
                hard
            },
            markingScheme: {
                correct: parseFloat(correctMark),
                incorrect: parseFloat(incorrectMark)
            },
            category,
            tags: tagArray,
            isAdaptive: isAdaptive === 'on',
            startDate: start,
            endDate: end
        };

        await TestConfig.create(newTest);

        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


// @desc    Get Questions page (List + Add Form)
// @route   GET /admin/questions
const getQuestions = async (req, res) => {
    const topic = req.query.topic || 'All';
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    let query = {};
    if (topic !== 'All') {
        query.topic = topic;
    }

    try {
        const [questions, total] = await Promise.all([
            Question.find(query).sort({createdAt: -1}).skip(skip).limit(limit).lean(),
            Question.countDocuments(query)
        ]);

        const topics = await Question.distinct('topic');
        const totalPages = Math.ceil(total / limit);

        res.render('admin/questions', { 
            questions, 
            topics, 
            selectedTopic: topic,
            currentPage: page,
            totalPages 
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { user: req.user, code: 500, message: 'Server Error' });
    }
};

// @desc    Add a Question
// @route   POST /admin/questions
const addQuestion = async (req, res) => {
    const { questionText, option1, option2, option3, option4, correctOption, topic, difficulty } = req.body;

    try {
        // Validate Inputs
        if (!questionText || !option1 || !option2 || !option3 || !option4 || correctOption === undefined || !topic) {
             // In a real app we'd flash an error, for now we redirect (could be improved)
             return res.redirect('/admin/questions'); 
        }

        await Question.create({
            questionText,
            options: [option1, option2, option3, option4],
            correctOption: parseInt(correctOption),
            topic,
            difficulty: difficulty || 'medium'
        });
        res.redirect('/admin/questions');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete a Question
// @route   POST /admin/questions/delete/:id
const deleteQuestion = async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.redirect('/admin/questions');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Get Bulk Add Questions Page
// @route   GET /admin/questions/bulk
const getBulkAdd = (req, res) => {
    res.render('admin/bulk_questions');
};

// @desc    Process Bulk Add Questions
// @route   POST /admin/questions/bulk
const postBulkAdd = async (req, res) => {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, message: 'No questions provided' });
    }

    try {
        // Insert many
        // Assuming validation is handled by frontend or partial backend checks
        // Mongoose insertMany is efficient
        const result = await Question.insertMany(questions);
        
        res.json({ success: true, count: result.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get Edit Test Page
// @route   GET /admin/tests/edit/:id
const getEditTest = async (req, res) => {
    try {
        const test = await TestConfig.findById(req.params.id);
        if(!test) return res.redirect('/admin/dashboard');

        const topics = await Question.distinct('topic');
        
        // Count questions per topic for the UI sliders (helper data)
        const topicCounts = {};
        for (let t of topics) {
            topicCounts[t] = {
                easy: await Question.countDocuments({ topic: t, difficulty: 'easy' }),
                medium: await Question.countDocuments({ topic: t, difficulty: 'medium' }),
                hard: await Question.countDocuments({ topic: t, difficulty: 'hard' })
            };
        }

        res.render('admin/edit_test', { test, topics, topicCounts });
    } catch (error) {
         console.error(error);
         res.status(500).send('Server Error');
    }
};

// @desc    Update Test Config
// @route   POST /admin/tests/edit/:id
const postEditTest = async (req, res) => {
    try {
        const { title, duration, category, isAdaptive, tags, topics, easyCount, mediumCount, hardCount, correctMark, incorrectMark, startDate, endDate } = req.body;
        
        let topicArray = topics;
        if (!topics) {
            topicArray = []; // Handle no topics selected case
        } else if (!Array.isArray(topics)) {
            topicArray = [topics];
        }

        const difficultyDistribution = {
            easy: parseInt(easyCount),
            medium: parseInt(mediumCount),
            hard: parseInt(hardCount)
        };
        const totalQuestions = difficultyDistribution.easy + difficultyDistribution.medium + difficultyDistribution.hard;

        // Tag splitting
        const tagArray = tags ? tags.split(',').map(t => t.trim()) : [];

        // Safe Date Parsing
        let start = null;
        let end = null;

        if (startDate && startDate.trim() !== '') {
            const s = new Date(startDate);
            if (!isNaN(s.getTime())) start = s;
        }

        if (endDate && endDate.trim() !== '') {
            const e = new Date(endDate);
            if (!isNaN(e.getTime())) end = e;
        }

        // Build Update Object securely
        const updateOperation = {
            $set: {
                title,
                duration: parseInt(duration),
                category,
                tags: tagArray,
                topics: topicArray,
                difficultyDistribution,
                totalQuestions,
                markingScheme: {
                    correct: parseFloat(correctMark),
                    incorrect: parseFloat(incorrectMark)
                },
                isAdaptive: isAdaptive === 'on'
            },
            $unset: {}
        };

        // Handle Start Date
        if (start) {
            updateOperation.$set.startDate = start;
        } else {
            updateOperation.$unset.startDate = 1;
        }

        // Handle End Date
        if (end) {
            updateOperation.$set.endDate = end;
        } else {
            updateOperation.$unset.endDate = 1;
        }

        // Clean up empty $unset if not needed to avoid Mongo errors
        if (Object.keys(updateOperation.$unset).length === 0) {
        console.log("Update Operation:", JSON.stringify(updateOperation, null, 2));

            delete updateOperation.$unset;
        }

        await TestConfig.findByIdAndUpdate(req.params.id, updateOperation);

        res.redirect('/admin/dashboard');
    } catch (error) {
         console.error(error);
         res.status(500).send('Server Error');
    }
};

// @desc    Delete Test
// @route   POST /admin/tests/delete/:id
const deleteTest = async (req, res) => {
    try {
        await TestConfig.findByIdAndDelete(req.params.id);
        await Result.deleteMany({ testConfig: req.params.id }); 
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};


// @desc    Get Profile Page
// @route   GET /admin/profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('admin/profile', { user, success: null, error: null });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Update Profile
// @route   POST /admin/profile
const updateProfile = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const user = await User.findById(req.user._id);
        
        if (user) {
            user.name = name || user.name;
            user.email = email || user.email;
            if (password && password.trim() !== '') {
                user.password = password; 
            }
            await user.save();
            res.render('admin/profile', { user, success: 'Profile updated successfully!', error: null });
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error(error);
        res.render('admin/profile', { user: req.user, success: null, error: 'Could not update profile.' });
    }
};

// @desc    Delete Account
// @route   POST /admin/profile/delete
const deleteAccount = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user._id);
        res.clearCookie('token');
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Get All Students
// @route   GET /admin/students
const getStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).sort({ createdAt: -1 });
        res.render('admin/students', { students });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Get Edit Student Page
// @route   GET /admin/student/edit/:id
const getEditStudent = async (req, res) => {
    try {
        const student = await User.findById(req.params.id);
        if (!student) return res.status(404).render('error', { message: 'Student not found' });
        res.render('admin/edit_student', { student });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

// @desc    Update Student
// @route   POST /admin/student/edit/:id
const postEditStudent = async (req, res) => {
    try {
        const { name, email, newPassword } = req.body;
        const student = await User.findById(req.params.id);
        
        if (!student) return res.status(404).render('error', { message: 'Student not found' });

        student.name = name;
        student.email = email;

        if (newPassword && newPassword.trim() !== "") {
            student.password = newPassword; 
        }

        await student.save();
        res.redirect('/admin/students');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { message: 'Error updating student' });
    }
};

// @desc    Delete Student
// @route   POST /admin/students/delete/:id
const deleteStudent = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        // Also remove results associated with student to keep DB clean
        await Result.deleteMany({ user: req.params.id });
        res.redirect('/admin/students');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete Multiple Questions
// @route   POST /admin/questions/delete-bulk
const deleteQuestionsBulk = async (req, res) => {
    const { questionIds } = req.body;
    
    // questionIds could be a string if only one selected, or array if multiple
    let idsToDelete = [];
    if (Array.isArray(questionIds)) {
        idsToDelete = questionIds;
    } else if (questionIds) {
        idsToDelete = [questionIds];
    }

    if (idsToDelete.length === 0) {
        return res.redirect('/admin/questions');
    }

    try {
        await Question.deleteMany({ _id: { $in: idsToDelete } });
        res.redirect('/admin/questions');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete Questions by Topic
// @route   POST /admin/questions/delete-topic
const deleteQuestionsByTopic = async (req, res) => {
    const { topic } = req.body;
    
    if (!topic) {
        return res.redirect('/admin/questions');
    }

    try {
        await Question.deleteMany({ topic: topic });
        res.redirect('/admin/questions');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getDashboard,
    toggleSetting, // New Export
    getQuestions,
    addQuestion,
    deleteQuestion,
    deleteQuestionsBulk,
    deleteQuestionsByTopic,
    getCreateTest,
    createTest,
    getBulkAdd,
    postBulkAdd,
    getEditTest,
    postEditTest,
    deleteTest,
    getProfile,
    updateProfile,
    deleteAccount,
    getStudents,
    getEditStudent,
    postEditStudent,
    deleteStudent,
    deleteQuestionsBulk,
    deleteQuestionsByTopic
};

