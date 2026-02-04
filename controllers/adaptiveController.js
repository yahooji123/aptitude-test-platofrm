const TestConfig = require('../models/TestConfig');
const TestSession = require('../models/TestSession');
const Question = require('../models/Question');
const Result = require('../models/Result');

// Helper: Determine next difficulty
const getNextDifficulty = (currentDiff, wasCorrect) => {
    if (wasCorrect) {
        if (currentDiff === 'easy') return 'medium';
        if (currentDiff === 'medium') return 'hard';
        return 'hard'; // Cap at hard
    } else {
        if (currentDiff === 'hard') return 'medium';
        if (currentDiff === 'medium') return 'easy';
        return 'easy'; // Floor at easy
    }
};

// @desc    Start or Continue Adaptive Test
// @route   GET /adaptive/test/:testId/start
const startAdaptiveTest = async (req, res) => {
    try {
        const { testId } = req.params;
        const test = await TestConfig.findById(testId);
        
        if (!test || !test.isActive || !test.isAdaptive) {
            return res.redirect('/adaptive/student/dashboard');
        }

        // Check scheduling
        const now = new Date();
        const startTime = test.startDate ? new Date(test.startDate) : null;
        const endTime = test.endDate ? new Date(test.endDate) : null;

        if (startTime && startTime > now) {
            return res.status(403).send("Test has not started yet.");
        }
        if (endTime && endTime < now) {
            return res.status(403).send("Test has ended.");
        }

        // Check for existing in-progress session based on testConfig AND adaptive flag logic
        // Note: We search for existing session with 'inprogress' status
        let session = await TestSession.findOne({
            user: req.user._id,
            testConfig: testId,
            status: 'inprogress'
        });

        if (!session) {
            // Start new session
            session = await TestSession.create({
                user: req.user._id,
                testConfig: testId,
                isAdaptive: true,
                currentDifficulty: 'medium', // Start at medium
                questions: [],
                responses: [],
                startTime: new Date()
            });
        }

        res.redirect(`/adaptive/test/${testId}/runner`);

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Get Test Runner Page (Loads current Question)
// @route   GET /adaptive/test/:testId/runner
const getAdaptiveTestRunner = async (req, res) => {
    try {
        const { testId } = req.params;
        const session = await TestSession.findOne({
            user: req.user._id,
            testConfig: testId,
            status: 'inprogress'
        }).populate('testConfig');

        if (!session) return res.redirect('/adaptive/student/dashboard');

        // Check if time is up
        const timeElapsed = (new Date() - session.startTime) / 1000 / 60; // minutes
        if (timeElapsed >= session.testConfig.duration) {
            return await finishAdaptiveTest(session, req, res, 'Time Up');
        }

        // Check if max questions reached
        if (session.responses.length >= session.testConfig.totalQuestions) {
             return await finishAdaptiveTest(session, req, res, 'Completed');
        }

        // Determine the next question to show
        let currentQuestionId = null;
        const lastQuestionId = session.questions[session.questions.length - 1];
        
        // Check if last question was answered
        const lastQuestionAnswered = session.responses.some(r => r.question.toString() === lastQuestionId?.toString());
        
        if (lastQuestionId && !lastQuestionAnswered) {
             // Case: Page reload, resume on same question
             currentQuestionId = lastQuestionId;
        } else {
            // Case: Fetch NEW Question
            const seenIds = session.questions;

            // Try to find a question with current difficulty
            const nextQ = await Question.aggregate([
                { $match: { 
                    topic: { $in: session.testConfig.topics },
                    difficulty: session.currentDifficulty,
                    _id: { $nin: seenIds }
                }},
                { $sample: { size: 1 } }
            ]);

            if (nextQ.length > 0) {
                currentQuestionId = nextQ[0]._id;
                session.questions.push(currentQuestionId);
                await session.save();
            } else {
                // FALLBACK: If no questions of that difficulty, try ANY difficulty not seen
                const fallbackQ = await Question.aggregate([
                    { $match: { 
                        topic: { $in: session.testConfig.topics },
                        _id: { $nin: seenIds }
                    }},
                    { $sample: { size: 1 } }
                ]);
                
                if (fallbackQ.length > 0) {
                    currentQuestionId = fallbackQ[0]._id;
                    session.questions.push(currentQuestionId);
                    await session.save();
                } else {
                    // No more questions at all? Finish early.
                    return await finishAdaptiveTest(session, req, res, 'No more questions');
                }
            }
        }

        const question = await Question.findById(currentQuestionId);
        
        // Calculate remaining time in seconds
        const durationSec = session.testConfig.duration * 60;
        const elapsedSec = Math.floor((new Date() - session.startTime) / 1000);
        const remainingSec = Math.max(0, durationSec - elapsedSec);

        res.render('adaptive/test_runner', {
            test: session.testConfig,
            question,
            session,
            remainingSec,
            currentQuestionNum: session.responses.length + 1,
            totalQuestions: session.testConfig.totalQuestions
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Submit Answer (AJAX)
// @route   POST /adaptive/test/:testId/submit-answer
const submitAdaptiveAnswer = async (req, res) => {
    try {
        const { testId } = req.params;
        const { questionId, selectedOption, timeTaken } = req.body;

        const session = await TestSession.findOne({
            user: req.user._id,
            testConfig: testId,
            status: 'inprogress'
        });
        
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const question = await Question.findById(questionId);
        const isCorrect = question.correctOption === parseInt(selectedOption);

        // Record response
        session.responses.push({
            question: questionId,
            selectedOption: parseInt(selectedOption),
            isCorrect,
            timeTaken: timeTaken || 0
        });

        // Update Adaptation
        const newDifficulty = getNextDifficulty(session.currentDifficulty, isCorrect);
        session.currentDifficulty = newDifficulty;
        
        await session.save();

        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

// Helper to finish test
const finishAdaptiveTest = async (session, req, res, reason) => {
    session.status = 'completed';
    await session.save();

    const testConfig = session.testConfig;
    let score = 0;
    let correct = 0;
    let wrong = 0;

    session.responses.forEach(r => {
        if (r.isCorrect) {
            score += testConfig.markingScheme.correct;
            correct++;
        } else {
            score -= testConfig.markingScheme.incorrect;
            wrong++;
        }
    });

    const result = await Result.create({
        user: session.user,
        testConfig: session.testConfig._id,
        score,
        totalQuestions: session.responses.length,
        correctAnswers: correct,
        wrongAnswers: wrong,
        attemptNumber: await Result.countDocuments({ user: session.user, testConfig: session.testConfig._id }) + 1,
        timeTaken: Math.min((new Date() - session.startTime) / 1000 / 60, testConfig.duration)
    });

    res.redirect(`/student/result/${result._id}`);
};

// @desc    Get Adaptive Student Dashboard
// @route   GET /adaptive/student/dashboard
const getStudentAdaptiveDashboard = async (req, res) => {
    try {
        const tests = await TestConfig.find({ 
            isActive: true,
            isAdaptive: true 
        }).sort({ createdAt: -1 });
        
        res.render('adaptive/student_dashboard', { tests });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// @desc    Get Adaptive Admin Dashboard
// @route   GET /adaptive/admin/dashboard
const getAdminAdaptiveDashboard = async (req, res) => {
    try {
        const questionCount = await Question.countDocuments();
        const topics = await Question.distinct('topic');
        const tests = await TestConfig.find({ isAdaptive: true }).sort({ createdAt: -1 });

        res.render('adaptive/admin_dashboard', { 
            tests, 
            questionCount, 
            topics
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getStudentAdaptiveDashboard,
    getAdminAdaptiveDashboard,
    startAdaptiveTest,
    getAdaptiveTestRunner,
    submitAdaptiveAnswer
};
