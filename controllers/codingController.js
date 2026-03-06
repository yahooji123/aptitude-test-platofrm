const CodingQuestion = require('../models/CodingQuestion');
const CodingTopic = require('../models/CodingTopic');
const CodingProgress = require('../models/CodingProgress');

// Admin: Add a new coding question
exports.addQuestion = async (req, res) => {
    try {
        const { title, topic, problem, examples, expectedTime } = req.body;
        
        const newQuestion = new CodingQuestion({
            title,
            topic,
            problem,
            examples,
            expectedTime: parseInt(expectedTime) || 10
        });

        await newQuestion.save();
        res.redirect('/coding/admin?success=1');
    } catch (err) {
        console.error(err);
        const questions = await CodingQuestion.find().sort({ createdAt: -1 });
        const topics = await CodingTopic.find();
        res.render('coding/admin_dashboard', {
            questions,
            topics: topics.map(t => t.name),
            user: req.user,
            error_msg: 'Error adding question: ' + err.message
        });
    }
};

// Admin: Add a new coding topic
exports.addTopic = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) throw new Error('Topic name required');
        await CodingTopic.create({ name: name.trim() });
        res.redirect('/coding/admin/topics?success=1');
    } catch (err) {
        console.error(err);
        const topics = await CodingTopic.find().sort({ createdAt: -1 });
        res.render('coding/topics_dashboard', {
            topics,
            user: req.user,
            error_msg: 'Error adding topic: ' + err.message
        });
    }
};

// Admin: Dashboard to view/manage questions
exports.getAdminDashboard = async (req, res) => {
    try {
        const questions = await CodingQuestion.find().sort({ createdAt: -1 });
        const topicsList = await CodingTopic.find();
        const topics = topicsList.map(t => t.name);
        
        const success_msg = req.query.success ? 'Question added successfully' : null;

        res.render('coding/admin_dashboard', {
            questions,
            topics,
            user: req.user,
            success_msg
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Server Error', user: req.user });
    }
};

// Admin: List all topics
exports.getTopicsDashboard = async (req, res) => {
    try {
        const topics = await CodingTopic.find().sort({ createdAt: -1 });
        const success_msg = req.query.success ? 'Topic added successfully!' : null;
        res.render('coding/topics_dashboard', {
            topics,
            user: req.user,
            success_msg,
            error_msg: null
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Server Error', user: req.user });
    }
};

// Admin: View specific topic questions for bulk actions
exports.viewTopicQuestions = async (req, res) => {
    try {
        const topicName = req.params.topicName;
        const questions = await CodingQuestion.find({ topic: topicName }).sort({ createdAt: -1 });
        const success_msg = req.query.success ? `Deleted ${req.query.success} questions successfully!` : null;

        res.render('coding/topic_questions', {
            topicName,
            questions,
            user: req.user,
            success_msg,
            error_msg: null
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Server Error finding topic questions', user: req.user });
    }
};

// Admin: Delete Topic
exports.deleteTopic = async (req, res) => {
    try {
        const { topicName } = req.params;
        await CodingTopic.findOneAndDelete({ name: topicName });
        // Optionally, ask if we want to delete questions inside it too. For now let's also wipe its questions.
        await CodingQuestion.deleteMany({ topic: topicName });
        res.redirect('/coding/admin?success=Topic_Deleted');
    } catch (err) {
        console.error(err);
        res.redirect('/coding/admin?error=Delete_Failed');
    }
};

// Admin: Bulk delete questions
exports.deleteMultipleQuestions = async (req, res) => {
    try {
        let { questionIds, topicName } = req.body;
        if (!questionIds) {
            return res.redirect(`/coding/admin/topics/${topicName}/questions`);
        }
        
        // Convert to array if single string
        if (!Array.isArray(questionIds)) {
            questionIds = [questionIds];
        }

        const result = await CodingQuestion.deleteMany({ _id: { $in: questionIds } });
        res.redirect(`/coding/admin/topics/${topicName}/questions?success=${result.deletedCount}`);
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Failed to delete questions', user: req.user });
    }
};

// Admin: Bulk add questions via text parsing
exports.bulkAddQuestions = async (req, res) => {
    try {
        const { questionsText } = req.body;
        if (!questionsText) throw new Error("No text provided");
        
        let questionsParsed = 0;
        const blocks = questionsText.split(/(?=Title:)/i).filter(b => b.trim().length > 0);
        
        for (const block of blocks) {
            const titleMatch = block.match(/Title:\s*(.*)/i);
            const topicMatch = block.match(/Topic:\s*(.*)/i);
            
            // Fix duplicate example text capturing by being more precise with Problem match end boundaries
            const problemMatch = block.match(/Problem:\s*([\s\S]*?)(?=Example|Examples:|Expected Time:|$)/i);
            const exampleMatch = block.match(/(?:Example(?:\s*\d)?:|Examples:\s*\n)[\s\S]*?(?=Expected Time:|$)/i);
            const timeMatch = block.match(/Expected Time:\s*(\d+)/i);
            
            if (titleMatch && topicMatch && problemMatch) {
                // Ensure topic exists (optional, could auto-create)
                const topicName = topicMatch[1].trim();
                let topicObj = await CodingTopic.findOne({ name: { $regex: new RegExp(`^${topicName}$`, 'i') } });
                if (!topicObj) {
                    topicObj = await CodingTopic.create({ name: topicName });
                }
                
                // Extract examples text directly and default expectedTime safely
                let parsedExample = exampleMatch ? exampleMatch[0].trim() : "None";
                // Optionally remove leading "Examples:" or "Example:" keywords so we don't have duplicate text mapping
                parsedExample = parsedExample.replace(/^(Examples:|Example(?:\s*\d)?:\s*)/i, '').trim();

                let expectedTime = 10;
                if (timeMatch && !isNaN(parseInt(timeMatch[1]))) {
                    expectedTime = parseInt(timeMatch[1]);
                }
                
                await CodingQuestion.create({
                    title: titleMatch[1].trim(),
                    topic: topicObj.name,
                    problem: problemMatch[1].trim(),
                    examples: parsedExample,
                    expectedTime: expectedTime
                });
                questionsParsed++;
            }
        }
        res.redirect(`/coding/admin?success=${questionsParsed}`);
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Bulk add failed: ' + err.message, user: req.user });
    }
};

// Admin: Show bulk add form
exports.getBulkAddForm = async (req, res) => {
    try {
        res.render('coding/bulk_add', { user: req.user });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error loading page', user: req.user });
    }
};

// Student: Dashboard to select topic and start practice
exports.getStudentDashboard = async (req, res) => {
    try {
        const topics = await CodingTopic.find();
        
        let userProgress = await CodingProgress.findOne({ userId: req.user._id });
        const seenCount = userProgress ? userProgress.seenQuestions.length : 0;
        
        res.render('coding/student_dashboard', {
            topics,
            user: req.user,
            seenCount,
            error_msg: req.query.error === 'no_questions' ? 'No new questions found for selected topics or all completed!' : null
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Server Error', user: req.user });
    }
};

// Student: Generate and Start Practice
exports.startTest = async (req, res) => {
    try {
        let { topics, count } = req.body;
        const numQuestions = parseInt(count) || 5;

        // Force arrays if single select
        if (!Array.isArray(topics)) {
            topics = [topics];
        }
        
        if (!topics || topics.length === 0) {
            return res.redirect('/coding?error=no_topics');
        }

        // Get user progress
        let userProgress = await CodingProgress.findOne({ userId: req.user._id });
        let seenIds = userProgress ? userProgress.seenQuestions : [];

        // Build aggregation pipeline to fetch UNSEEN questions randomly
        let pipeline = [
            { $match: { 
                topic: { $in: topics },
                _id: { $nin: seenIds }
             } },
            { $sample: { size: numQuestions } }
        ];

        let questions = await CodingQuestion.aggregate(pipeline);

        if (questions.length === 0) {
            // Check if ANY questions exist for these topics
            const totalExists = await CodingQuestion.countDocuments({ topic: { $in: topics } });
            if (totalExists === 0) {
                return res.redirect('/coding?error=no_questions');
            }

            // AUTO-REPEAT: The user has seen all questions in these topics!
            // Let's clear their seen state for ONLY these topics
            const topicQuestions = await CodingQuestion.find({ topic: { $in: topics } }, '_id');
            const topicQIds = topicQuestions.map(q => q._id);
            
            if (userProgress) {
                userProgress.seenQuestions = userProgress.seenQuestions.filter(id => !topicQIds.some(tId => tId.equals(id)));
                await userProgress.save();
                seenIds = userProgress.seenQuestions;
            }

            // Re-fetch now that we cleared it
            pipeline = [
                { $match: { 
                    topic: { $in: topics },
                    _id: { $nin: seenIds }
                 } },
                { $sample: { size: numQuestions } }
            ];
            questions = await CodingQuestion.aggregate(pipeline);
        }

        res.render('coding/test_runner', {
            questions,
            topicStr: topics.join(', '),
            user: req.user
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error generating practice session', user: req.user });
    }
};

// Student: Mark question as seen via ajax
exports.markSeen = async (req, res) => {
    try {
        const { questionId } = req.body;
        if (!questionId) return res.status(400).json({ error: 'Missing id' });

        await CodingProgress.findOneAndUpdate(
            { userId: req.user._id },
            { $addToSet: { seenQuestions: questionId } },
            { upsert: true }
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Mark seen error:", err);
        res.status(500).json({ error: 'Server validation error' });
    }
};

// Student: Reset Progress
exports.resetProgress = async (req, res) => {
    try {
        const { topicToReset } = req.body;
        const userProgress = await CodingProgress.findOne({ userId: req.user._id });
        
        if (userProgress) {
            if (topicToReset === 'ALL') {
                await CodingProgress.findOneAndDelete({ userId: req.user._id });
            } else {
                // Find all question IDs belonging to the chosen topic
                const qIds = await CodingQuestion.find({ topic: topicToReset }, '_id');
                const idsToRemove = qIds.map(q => q._id);
                
                // Keep only IDs that are NOT in the idsToRemove array
                userProgress.seenQuestions = userProgress.seenQuestions.filter(id => !idsToRemove.some(rId => rId.equals(id)));
                await userProgress.save();
            }
        }
        
        res.redirect('/coding');
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Error resetting progress', user: req.user });
    }
};
