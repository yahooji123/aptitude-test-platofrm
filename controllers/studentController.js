const Question = require('../models/Question');
const Result = require('../models/Result');
const TestConfig = require('../models/TestConfig');
const TestSession = require('../models/TestSession');
const User = require('../models/User'); // Import User model for profile management

// @desc    Get Student Dashboard
// @route   GET /student/dashboard
const getDashboard = async (req, res) => {
    try {
        // Fetch active test configurations
        const tests = await TestConfig.find({ isActive: true }).sort({ createdAt: -1 });
        
        // Also fetch topics for legacy "Practice Mode" if needed, OR just use tests
        // For strict adherence to new requirement, we show tests/practice sets
        res.render('student/dashboard', { tests });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Get Practice Questions (Legacy / Quick Practice)
// @route   GET /student/practice?topic=arrays
const getPractice = async (req, res) => {
    const topic = req.query.topic;
    if (!topic) return res.redirect('/student/dashboard');

    try {
        const questions = await Question.find({ topic });
        res.render('student/practice', { topic, questions });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Start Test (Get Questions)
// @route   GET /student/test?testId=XYZ
const startTest = async (req, res) => {
    const testId = req.query.testId;
    
    try {
        const test = await TestConfig.findById(testId);
        if (!test) return res.redirect('/student/dashboard');

        // Check if test is active/scheduled
        const now = new Date();
        const startTime = test.startDate ? new Date(test.startDate) : null;
        const endTime = test.endDate ? new Date(test.endDate) : null;

        if (startTime && startTime > now) {
            return res.status(403).send(`
                <html>
                <body style="background:#0d1117; color:#c9d1d9; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; flex-direction:column;">
                    <h2 style="color:#58a6ff;">Test Not Started</h2>
                    <p>This test is scheduled to start on ${startTime.toLocaleString()}.</p>
                    <a href="/student/dashboard" style="color:#fff; text-decoration:underline;">Back to Dashboard</a>
                </body>
                </html>
            `);
        }
        if (endTime && endTime < now) {
            return res.status(403).send(`
                <html>
                <body style="background:#0d1117; color:#c9d1d9; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; flex-direction:column;">
                    <h2 style="color:#f85149;">Test Ended</h2>
                    <p>This test closed on ${endTime.toLocaleString()}.</p>
                    <a href="/student/dashboard" style="color:#fff; text-decoration:underline;">Back to Dashboard</a>
                </body>
                </html>
            `);
        }

        // Check for existing active session
        const existingSession = await TestSession.findOne({ 
            user: req.user._id, 
            testConfig: testId, 
            status: 'inprogress' 
        });

        let questions;
        let remainingSeconds;

        if (existingSession) {
            // Restore existing session
            // Fetch questions maintaining order
            const sessionQuestions = await Question.find({ _id: { $in: existingSession.questions } });
            // Reorder questions to match the saved order
            questions = existingSession.questions.map(id => sessionQuestions.find(q => q._id.toString() === id.toString()));

            const durationMs = test.duration * 60 * 1000;
            const elapsedMs = new Date() - existingSession.startTime;
            remainingSeconds = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));
        } else {
            // Create New Session
            // Logic to randomly pick questions based on distribution
            const easyQ = await Question.aggregate([
                { $match: { topic: { $in: test.topics }, difficulty: 'easy' } },
                { $sample: { size: test.difficultyDistribution.easy } }
            ]);

            const mediumQ = await Question.aggregate([
                { $match: { topic: { $in: test.topics }, difficulty: 'medium' } },
                { $sample: { size: test.difficultyDistribution.medium } }
            ]);

            const hardQ = await Question.aggregate([
                { $match: { topic: { $in: test.topics }, difficulty: 'hard' } },
                { $sample: { size: test.difficultyDistribution.hard } }
            ]);

            questions = [...easyQ, ...mediumQ, ...hardQ];

            await TestSession.create({
                user: req.user._id,
                testConfig: testId,
                questions: questions.map(q => q._id),
                startTime: new Date()
            });

            remainingSeconds = test.duration * 60;
        }

        // Return view with questions (rendered as a test)
        // Passing 'test' object for config details (duration, marking scheme etc)
        res.render('student/test', { test, questions, remainingSeconds });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Submit Test
// @route   POST /student/test/submit
const submitTest = async (req, res) => {
    const { answers, testId, timeTaken } = req.body; 
    
    try {
        const test = await TestConfig.findById(testId);
        if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

        // Mark session as completed
        await TestSession.findOneAndUpdate(
            { user: req.user._id, testConfig: testId, status: 'inprogress' },
            { status: 'completed' }
        );

        let score = 0;
        let correctAnswers = 0;
        let incorrectAnswers = 0;
        let skippedAnswers = 0;
        
        const questionIds = Object.keys(answers);
        const questionsToCheck = await Question.find({ _id: { $in: questionIds } });
        
        questionsToCheck.forEach(q => {
            const selectedOption = parseInt(answers[q._id.toString()]);
            if (!isNaN(selectedOption)) {
                if (selectedOption === q.correctOption) {
                    score += test.markingScheme.correct;
                    correctAnswers++;
                } else {
                    score += test.markingScheme.incorrect; // Adding negative number
                    incorrectAnswers++;
                }
            } 
        });

        const totalQuestions = test.totalQuestions; 
        skippedAnswers = totalQuestions - (correctAnswers + incorrectAnswers);

        // Attempt Count Logic
        const existingAttempts = await Result.countDocuments({ user: req.user._id, testConfig: test._id });
        const attemptNumber = existingAttempts + 1;

        const result = await Result.create({
            user: req.user._id,
            testConfig: test._id,
            score: parseFloat(score.toFixed(2)), // Handle float precision
            totalQuestions,
            correctAnswers,
            incorrectAnswers,
            skippedAnswers,
            timeTaken: timeTaken || 0,
            topic: test.title, // Keep for backward compatibility or display
            attemptNumber
        });

        res.json({ success: true, resultId: result._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get Single Result Detail
// @route   GET /student/result/:id
const getResultDetail = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id)
            .populate('user', 'name')
            .populate('testConfig'); // Needed to check category
            
        if (!result) {
            return res.redirect('/student/history');
        }

        const isPractice = result.testConfig.category === 'Practice Set';
        let leaderboard = [];
        let rank = 0;
        let percentile = 0; 
        let classAverage = 0;
        let previousResult = null;
        let attemptHistory = [];

        // --- Validated Accuracy & Time Metrics (Common) ---
        const attemptedQuestions = result.correctAnswers + result.incorrectAnswers;
        const accuracy = attemptedQuestions > 0 
            ? ((result.correctAnswers / attemptedQuestions) * 100).toFixed(0) 
            : 0;
        
        const avgTimePerQuestion = attemptedQuestions > 0
            ? (result.timeTaken / attemptedQuestions).toFixed(1)
            : (result.timeTaken / (result.totalQuestions || 1)).toFixed(1);

        if (isPractice) {
            // --- Practice Mode Logic (Self-Focused) ---
            
            // 1. Fetch Full Attempt History (For Trend Analysis)
            attemptHistory = await Result.find({
                user: req.user._id,
                testConfig: result.testConfig._id
            }).sort({ createdAt: 1 }); // Oldest first for trend graph

            // 2. Fetch Leaderboard (Passive - for the link only)
            leaderboard = await Result.find({ 
                testConfig: result.testConfig._id,
                attemptNumber: 1
            })
            .sort({ score: -1, timeTaken: 1 })
            .limit(5)
            .populate('user', 'name');

        } else {
            // --- Test Mode Logic (Competitive) ---

            // Leaderboard (First Attempts)
            leaderboard = await Result.find({ 
                testConfig: result.testConfig._id,
                attemptNumber: 1
            })
                .sort({ score: -1, timeTaken: 1 })
                .limit(5)
                .populate('user', 'name');

            // Rank (Against First Attempts)
            const betterScores = await Result.countDocuments({
                testConfig: result.testConfig._id,
                attemptNumber: 1,
                $or: [
                    { score: { $gt: result.score } },
                    { score: result.score, timeTaken: { $lt: result.timeTaken } }
                ]
            });
            rank = betterScores + 1;

            // Percentile 
            const totalTestTakers = await Result.countDocuments({ 
                testConfig: result.testConfig._id,
                attemptNumber: 1 
            });
            percentile = totalTestTakers > 1 ? ((totalTestTakers - rank) / totalTestTakers) * 100 : 100;

            // Improvement (Immediate Previous)
            previousResult = await Result.findOne({ 
                user: req.user._id, 
                testConfig: result.testConfig._id,
                createdAt: { $lt: result.createdAt }
            }).sort({ createdAt: -1 });

            // Class Average
            const aggArgs = [
                { $match: { testConfig: result.testConfig._id, attemptNumber: 1 } },
                { $group: { _id: null, avgScore: { $avg: '$score' } } }
            ];
            const avgResult = await Result.aggregate(aggArgs);
            classAverage = avgResult.length ? avgResult[0].avgScore : 0;
        }

        res.render('student/result_analysis', {
            result,
            testConfig: result.testConfig,
            isPractice,
            attemptHistory,
            leaderboard,
            rank,
            percentile: typeof percentile === 'number' ? percentile.toFixed(1) : percentile,
            previousResult,
            classAverage: typeof classAverage === 'number' ? classAverage.toFixed(1) : classAverage,
            accuracy,
            avgTimePerQuestion
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Get Results History
// @route   GET /student/results
const getResults = async (req, res) => {
    try {
        const results = await Result.find({ user: req.user._id }).sort({ date: -1 });
        res.render('student/history', { results });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Get Profile Page
// @route   GET /student/profile
const getProfile = async (req, res) => {
    try {
        // req.user is set by auth middleware, but let's fetch fresh data
        const user = await User.findById(req.user._id);
        res.render('student/profile', { user, success: null, error: null });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Update Profile
// @route   POST /student/profile
const updateProfile = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const user = await User.findById(req.user._id);
        
        if (user) {
            user.name = name || user.name;
            user.email = email || user.email;
            if (password && password.trim() !== '') {
                user.password = password; // Will be hashed in pre save hook
            }

            const updatedUser = await user.save();
            
            res.render('student/profile', { user: updatedUser, success: 'Profile updated successfully!', error: null });
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error(error);
        res.render('student/profile', { user: req.user, success: null, error: 'Could not update profile (Email might be taken)' });
    }
};

// @desc    Delete Account
// @route   POST /student/profile/delete
const deleteAccount = async (req, res) => {
    try {
        // Clean up user data
        await Result.deleteMany({ user: req.user._id });
        await TestSession.deleteMany({ user: req.user._id });
        await User.findByIdAndDelete(req.user._id);

        res.clearCookie('token');
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getDashboard,
    getPractice,
    startTest,
    submitTest,
    getResults,
    getResultDetail,
    getProfile,
    updateProfile,
    deleteAccount
};
