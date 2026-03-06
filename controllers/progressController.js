const CodingQuestion = require('../models/CodingQuestion');
const CodingTopic = require('../models/CodingTopic');
const CodingProgress = require('../models/CodingProgress');

exports.getDashboard = async (req, res) => {
    try {
        const topics = await CodingTopic.find();
        let userProgress = await CodingProgress.findOne({ userId: req.user._id });
        
        let solvedIds = [];
        if (userProgress && userProgress.seenQuestions) {
            solvedIds = userProgress.seenQuestions.map(id => id.toString());
        }

        const stats = [];
        let totalQuestionsAnyTopic = 0;
        let totalSolvedAnyTopic = 0;

        for (let t of topics) {
            const topicQs = await CodingQuestion.find({ topic: t.name });
            const totalForTopic = topicQs.length;
            let solvedForTopic = 0;

            topicQs.forEach(q => {
                if (solvedIds.includes(q._id.toString())) {
                    solvedForTopic++;
                }
            });

            totalQuestionsAnyTopic += totalForTopic;
            totalSolvedAnyTopic += solvedForTopic;

            const completionPercent = totalForTopic > 0 ? Math.round((solvedForTopic / totalForTopic) * 100) : 0;

            stats.push({
                topic: t.name,
                total: totalForTopic,
                solved: solvedForTopic,
                percent: completionPercent
            });
        }

        res.render('progress/dashboard', {
            user: req.user,
            stats,
            overall: {
                total: totalQuestionsAnyTopic,
                solved: totalSolvedAnyTopic,
                percent: totalQuestionsAnyTopic > 0 ? Math.round((totalSolvedAnyTopic / totalQuestionsAnyTopic) * 100) : 0
            }
        });
    } catch (err) {
        console.error(err);
        res.render('error', { message: 'Failed to load progress dashboard', user: req.user });
    }
};
