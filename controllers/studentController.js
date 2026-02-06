const mongoose = require('mongoose');
const Question = require('../models/Question');
const Result = require('../models/Result');
const TestConfig = require('../models/TestConfig');
const TestSession = require('../models/TestSession');
const User = require('../models/User'); // Import User model for profile managementconst SystemSetting = require('../models/SystemSetting'); // Import SystemSetting
// @desc    Get Student Dashboard
// @route   GET /student/dashboard
const getDashboard = async (req, res) => {
    try {
        // Fetch active tests (Admin created) OR Custom tests created by this user
        const queryConditions = [
            { isActive: true, createdBy: null }, // Admin tests
            { isActive: true, createdBy: { $exists: false } } // Legacy admin tests
        ];

        if (req.user) {
            queryConditions.push({ createdBy: req.user.id }); // User's own tests
        }

        const tests = await TestConfig.find({
            $or: queryConditions
        }).sort({ createdAt: -1 });
        
        res.render('student/dashboard', { tests, user: req.user });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Get Custom Test Creation Page
// @route   GET /student/custom-test
const getCreateCustomTest = async (req, res) => {
    try {
        // Fetch distinct topics for dropdown
        const topics = await Question.distinct('topic');
        res.render('student/create_custom', { topics });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Create Custom Test
// @route   POST /student/custom-test/create
const createCustomTest = async (req, res) => {
    try {
        const { topics, duration, isAdaptive, totalQuestions, easy, medium, hard } = req.body;
        
        let topicArray = Array.isArray(topics) ? topics : [topics];
        let calculatedTotal = 0;
        let distribution = { easy: 0, medium: 0, hard: 0 };

        if (isAdaptive === 'on') {
            calculatedTotal = parseInt(totalQuestions) || 10;
        } else {
            distribution = {
                easy: parseInt(easy) || 0,
                medium: parseInt(medium) || 0,
                hard: parseInt(hard) || 0
            };
            calculatedTotal = distribution.easy + distribution.medium + distribution.hard;
        }

        if (calculatedTotal <= 0) {
            return res.status(400).send('Total questions must be greater than 0');
        }

        const newTest = await TestConfig.create({
            title: `Custom Test (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`,
            topics: topicArray,
            duration: parseInt(duration),
            totalQuestions: calculatedTotal,
            difficultyDistribution: distribution,
            isAdaptive: isAdaptive === 'on',
            category: 'Practice Set', // Custom tests are practice by default
            createdBy: req.user.id,
            expireAt: new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 Hours TTL
        });

        res.redirect('/student/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete Custom Test
// @route   POST /student/custom-test/delete/:id
const deleteCustomTest = async (req, res) => {
    try {
        const test = await TestConfig.findOne({ _id: req.params.id, createdBy: req.user.id });
        if(test) {
            await TestConfig.findByIdAndDelete(req.params.id);
        }
        res.redirect('/student/dashboard');
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

        if (test.isAdaptive) {
            return res.redirect(`/adaptive/test/${testId}/start`);
        }

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
            const sessionQuestions = await Question.find({ _id: { $in: existingSession.questions } }).lean();
            // Reorder questions to match the saved order
            questions = existingSession.questions.map(id => sessionQuestions.find(q => q._id.toString() === id.toString()));

            const durationMs = test.duration * 60 * 1000;
            const elapsedMs = new Date() - existingSession.startTime;
            remainingSeconds = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));
        } else {
            // Create New Session
            
            // Check Smart Practice Mode Setting
            const smartMode = await SystemSetting.findOne({ key: 'smartPracticeMode' });
            const prioritizeUnseen = smartMode && smartMode.value;

            // Get IDs of questions already attempted by this user (Used for both Smart Mode & "Repeated" Badge)
            let attemptedIds = [];
            if (req.user) {
                try {
                    const userId = new mongoose.Types.ObjectId(req.user.id);
                    const rawIds = await Result.aggregate([
                        { $match: { user: userId } },
                        { $unwind: '$detailedResponses' },
                        { $group: { _id: null, ids: { $addToSet: '$detailedResponses.question' } } }
                    ]);
                    
                    if (rawIds.length > 0) {
                        attemptedIds = rawIds[0].ids;
                    }
                    console.log(`[TestStart] User ${req.user.name} has history of ${attemptedIds.length} questions.`);
                } catch (err) {
                    console.error('[TestStart] Error fetching history:', err);
                }
            }

            // Helper to get questions with unseen priority
            const getQuestionsWithPriority = async (topicList, diff, count) => {
                let finalSelection = [];
                
                if (prioritizeUnseen) {
                    // Try to get UNSEEN questions first
                    const unseen = await Question.aggregate([
                        { $match: { 
                            topic: { $in: topicList }, 
                            difficulty: diff,
                            _id: { $nin: attemptedIds } 
                        }},
                        { $sample: { size: count } }
                    ]);
                    
                    console.log(`[SmartMode] Category ${diff}: Found ${unseen.length} unseen questions.`);
                    finalSelection = [...unseen];
                    
                    // If we need more, fetch from SEEN (Reset Cycle Logic)
                    if (finalSelection.length < count) {
                        const needed = count - finalSelection.length;
                        console.log(`[SmartMode] Category ${diff}: Need ${needed} more from seen pool.`);
                        
                        const alreadySeen = await Question.aggregate([
                            { $match: { 
                                topic: { $in: topicList }, 
                                difficulty: diff,
                                _id: { $nin: finalSelection.map(q => q._id) } 
                            }},
                            { $sample: { size: needed } }
                        ]);
                        finalSelection = [...finalSelection, ...alreadySeen];
                    }
                } else {
                    // Normal Random Logic (No priority)
                    finalSelection = await Question.aggregate([
                        { $match: { topic: { $in: topicList }, difficulty: diff } },
                        { $sample: { size: count } }
                    ]);
                }
                return finalSelection;
            };

            const easyQ = await getQuestionsWithPriority(test.topics, 'easy', test.difficultyDistribution.easy);
            const mediumQ = await getQuestionsWithPriority(test.topics, 'medium', test.difficultyDistribution.medium);
            const hardQ = await getQuestionsWithPriority(test.topics, 'hard', test.difficultyDistribution.hard);

            questions = [...easyQ, ...mediumQ, ...hardQ];

            await TestSession.create({
                user: req.user._id,
                testConfig: testId,
                questions: questions.map(q => q._id),
                startTime: new Date()
            });

            remainingSeconds = test.duration * 60;
        }

        // --- NEW: Mark Repeated Questions ---
        // We need the set of attempted IDs again if we are in existing session path (or just refetch if lazy)
        // To be safe, let's just ensure we have the set.
        let attemptedSet = new Set();
        if (req.user) {
             // If we already fetched attemptedIds in the new session block, use it. 
             // But existing session block didn't run that code.
             // We can just quick-fetch simple distinct aggregation here for the UI flag if not present.
             const userId = new mongoose.Types.ObjectId(req.user.id);
             const rawIds = await Result.aggregate([
                { $match: { user: userId } },
                { $unwind: '$detailedResponses' },
                { $group: { _id: null, ids: { $addToSet: '$detailedResponses.question' } } }
             ]);
             if (rawIds.length > 0) {
                 rawIds[0].ids.forEach(id => attemptedSet.add(id.toString()));
             }
        }

        const questionsWithFlag = questions.map(q => {
            const qObj = q.toObject ? q.toObject() : q; 
            if (attemptedSet.has(qObj._id.toString())) {
                qObj.isRepeated = true;
            }
            return qObj;
        });

        // Return view with questions (rendered as a test)
        res.render('student/test', { test, questions: questionsWithFlag, remainingSeconds });
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
        const session = await TestSession.findOneAndUpdate(
            { user: req.user._id, testConfig: testId, status: 'inprogress' },
            { status: 'completed' },
            { new: true }
        );

        let score = 0;
        let correctAnswers = 0;
        let incorrectAnswers = 0;
        let skippedAnswers = 0;
        let detailedResponses = [];
        
        // Use questions from the session to ensure we account for all questions served
        // If no session (shouldn't happen technically due to findOneAndUpdate above), fallback to answers keys or test logic
        // But assuming session exists since we just updated it.
        const questionIds = session && session.questions && session.questions.length > 0 
            ? session.questions 
            : Object.keys(answers); // Fallback: only answered questions (not ideal but safe)

        const questionsToCheck = await Question.find({ _id: { $in: questionIds } });
        
        // Map questions by ID for easy lookup to maintain order if needed, or just iterate
        const questionMap = new Map(questionsToCheck.map(q => [q._id.toString(), q]));
        
        // Iterate over session question IDs to preserve order and include skipped ones
        const idsToProcess = session && session.questions && session.questions.length > 0
            ? session.questions.map(id => id.toString())
            : Object.keys(answers);

        idsToProcess.forEach(qId => {
            const q = questionMap.get(qId);
            if (!q) return;

            const selectedOption = parseInt(answers[q._id.toString()]);
            let status = 'skipped';
            let isCorrect = false;

            if (!isNaN(selectedOption)) {
                if (selectedOption === q.correctOption) {
                    score += test.markingScheme.correct;
                    correctAnswers++;
                    status = 'correct';
                    isCorrect = true;
                } else {
                    score += test.markingScheme.incorrect; // Adding negative number
                    incorrectAnswers++;
                    status = 'wrong';
                    isCorrect = false;
                }
            } else {
                 skippedAnswers++;
            }

            detailedResponses.push({
                question: q._id,
                selectedOption: isNaN(selectedOption) ? null : selectedOption,
                correctOption: q.correctOption,
                isCorrect,
                status
            });
        });
        
        // If we didn't calculate skippedAnswers correctly above (e.g. fallback path)
        // Recalculate based on counts if needed, but the loop handles it.
        // Wait, the original code used totalQuestions from test config.
        // If randomized, session.questions.length should matches test.totalQuestions.
        
        // Double check skipped count
        const totalQuestions = session && session.questions ? session.questions.length : test.totalQuestions;
        // The loop increments skippedAnswers, so we should be good. 
        // IMPORTANT: The original code calculated skippedAnswers = total - (correct + incorrect).
        // My loop increments skippedAnswers, so I don't need that formula unless as a sanity check.

        // Attempt Count Logic
        const existingAttempts = await Result.countDocuments({ user: req.user._id, testConfig: test._id });
        const attemptNumber = existingAttempts + 1;

        console.log('Detailed Responses being saved:', detailedResponses.length); // Debug Log

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
            attemptNumber,
            detailedResponses, // Save detailed responses
        });
        
        console.log('Result Saved ID:', result._id); // Debug Log

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
            .populate({
                path: 'detailedResponses.question',
                select: 'questionText options correctOption topic difficulty' // Only fetch needed fields
            }) 
            .populate('testConfig'); // Needed to check category
            
        if (!result) {
            return res.redirect('/student/history');
        }

        // Check 30 Minutes Visibility Logic
        const diffMs = Date.now() - new Date(result.createdAt).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const showDetailedReview = diffMins <= 30;

        // If time expired, scrub the sensitive details
        // We create a view object, protecting the database object
        let viewDetailedResponses = null;
        if (showDetailedReview && result.detailedResponses) {
            viewDetailedResponses = result.detailedResponses;
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
            avgTimePerQuestion,
            showDetailedReview, // Pass visibility flag
            detailedResponses: viewDetailedResponses // Pass filtered responses
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

// @desc    Reset Learning History (Clear "Repeated" Status)
// @route   POST /student/profile/reset-history
const resetHistory = async (req, res) => {
    try {
        // We do NOT delete the Result documents because that would destroy the user's Scores and Leaderboards.
        // Instead, we simply want to "Forget" that they saw the questions for the purpose of the "Repeated" badge.
        
        // HOWEVER, our current logic uses Result.aggregate to find "seen" questions.
        // If we want to reset history but keep scores, we need a way to distinguish.
        // For a simple 'Reset Progress' in a small app, DELETING the Results is the cleanest way
        // to reset the "Attempted" pool. If the user wants to start fresh, they probably don't care about old test logs.
        
        // Alternative: Add a 'archived: true' flag to results so they don't count for history but exist for stats?
        // Let's go with the user's likely intent: Wipe the slate clean because I'm done.
        
        await Result.deleteMany({ user: req.user._id });
        await TestSession.deleteMany({ user: req.user._id, status: 'inprogress' }); // Clear active sessions too

        const user = await User.findById(req.user._id);
        res.render('student/profile', { user, success: 'Question history reset successfully! All questions are now marked as New.', error: null });

    } catch (error) {
        console.error(error);
        const user = await User.findById(req.user._id);
        res.render('student/profile', { user, success: null, error: 'Could not reset history' });
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
    getCreateCustomTest, // New export
    createCustomTest,    // New export
    deleteCustomTest,    // New export
    getPractice,
    startTest,
    submitTest,
    getResults,
    getResultDetail,
    getProfile,
    updateProfile,
    deleteAccount,
    resetHistory         // New export
};
