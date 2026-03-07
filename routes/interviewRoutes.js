const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const InterviewSession = require('../models/InterviewSession');
const User = require('../models/User');
const { generateInterviewQuestions, evaluateInterviewAnswer, translateInterviewText } = require('../utils/aiService');

router.use(protect);
router.use(authorize('student'));

// @desc    Show Setup Page
// @route   GET /interview/setup
router.get('/setup', (req, res) => {
    res.render('interview/setup');
});

// @desc    Start Interview Session
// @route   POST /interview/start
router.post('/start', async (req, res) => {
    try {
        const { subject, count } = req.body;
        const totalQuestions = parseInt(count) || 5;

        // Deduct setup credit (optional, but let's check general aiCredits if needed)
        // Here we just let them start. AI credits can be checked during evaluation.

        const questions = await generateInterviewQuestions(subject, totalQuestions);

        if (!questions || !Array.isArray(questions)) {
            return res.status(500).render('error', { user: req.user, code: 500, message: 'AI failed to generate questions. Please try again.' });
        }

        const session = new InterviewSession({
            user: req.user._id,
            subject,
            totalQuestions,
            questions,
            answers: []
        });

        await session.save();
        res.redirect(`/interview/session/${session._id}`);

    } catch (err) {
        console.error(err);
        res.status(500).render('error', { user: req.user, code: 500, message: 'Server Error' });
    }
});

// @desc    Show Current Interview Question
// @route   GET /interview/session/:id
router.get('/session/:id', async (req, res) => {
    try {
        const session = await InterviewSession.findOne({ _id: req.params.id, user: req.user._id });
        if (!session) return res.status(404).render('error', { user: req.user, code: 404, message: 'Interview not found.' });

        if (session.status === 'Completed') {
            return res.redirect(`/interview/result/${session._id}`);
        }

        const currentQIndex = session.answers.length;
        const currentQuestion = session.questions[currentQIndex];

        res.render('interview/session', {
            session,
            currentQuestion,
            currentQIndex,
            total: session.totalQuestions,
            user: req.user
        });
    } catch(err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @desc    Submit Answer & Evaluate
// @route   POST /interview/session/:id/submit
router.post('/session/:id/submit', async (req, res) => {
    try {
        const { answer } = req.body;
        const session = await InterviewSession.findOne({ _id: req.params.id, user: req.user._id });
        if (!session) return res.status(404).send('Session not found.');

        if (session.status === 'Completed') {
            return res.redirect(`/interview/result/${session._id}`);
        }

        const user = await User.findById(req.user._id);

        const currentQIndex = session.answers.length;
        const currentQuestion = session.questions[currentQIndex];

        // Evaluate answer
        const evaluation = await evaluateInterviewAnswer(currentQuestion, answer);

        let confScore = 0, commScore = 0, logScore = 0, feedback = "AI Evaluation Failed.", idealAnswer = "Not generated.";
        if (evaluation) {
            confScore = evaluation.confidenceScore || 0;
            commScore = evaluation.communicationScore || 0;
            logScore = evaluation.logicScore || 0;
            feedback = evaluation.feedback || "Good attempt.";
            idealAnswer = evaluation.idealAnswer || "Sample ideal answer not available.";
            
            // Deduct AI credits for evaluation
            if (user.aiCredits > 0) {
                user.aiCredits -= 1;
                user.totalAiRequests = (user.totalAiRequests || 0) + 1;
                await user.save();
            }
        }

        session.answers.push({
            question: currentQuestion,
            answer: answer,
            confidenceScore: confScore,
            communicationScore: commScore,
            logicScore: logScore,
            feedback: feedback,
            idealAnswer: idealAnswer
        });

        if (session.answers.length >= session.totalQuestions) {
            session.status = 'Completed';
        }

        await session.save();

        if (session.status === 'Completed') {
            res.redirect(`/interview/result/${session._id}`);
        } else {
            res.redirect(`/interview/session/${session._id}`);
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @desc    Show Results
// @route   GET /interview/result/:id
router.get('/result/:id', async (req, res) => {
    try {
        const session = await InterviewSession.findOne({ _id: req.params.id, user: req.user._id });
        if (!session) return res.status(404).render('error', { user: req.user, code: 404, message: 'Session not found.' });

        res.render('interview/result', { session, user: req.user });
    } catch(err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @desc    Translate text to Hindi
// @route   POST /interview/translate
router.post('/translate', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'No text provided' });
        
        const translated = await translateInterviewText(text);
        if (!translated) return res.status(500).json({ success: false, error: 'AI Translation failed' });

        res.json({ success: true, translation: translated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

module.exports = router;