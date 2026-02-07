const EnglishTopic = require('../models/EnglishTopic');
const EnglishWord = require('../models/EnglishWord');
const EnglishProgress = require('../models/EnglishProgress');
const EnglishTestConfig = require('../models/EnglishTestConfig');
const SystemSetting = require('../models/SystemSetting');

// --- Admin Controllers ---

exports.getAdminDashboard = async (req, res) => {
    try {
        const topics = await EnglishTopic.find().sort({ createdAt: -1 });
        const wordsCount = await EnglishWord.countDocuments();
        const tests = await EnglishTestConfig.find().populate('topic').sort({ createdAt: -1 });
        res.render('english/admin_dashboard', { topics, wordsCount, tests, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getCreateTest = async (req, res) => {
    try {
        const topics = await EnglishTopic.find({ isActive: true });
        res.render('english/create_test', { topics, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.createTest = async (req, res) => {
    try {
        const { title, description, topicId, questionCount, duration } = req.body;
        
        await EnglishTestConfig.create({
            title,
            description,
            topic: topicId,
            questionCount: parseInt(questionCount),
            duration: parseInt(duration)
        });

        res.redirect('/english/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.deleteTest = async (req, res) => {
    try {
        await EnglishTestConfig.findByIdAndDelete(req.params.id);
        res.redirect('/english/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.createTopic = async (req, res) => {
    try {
        const { name, category, description } = req.body;
        await EnglishTopic.create({ name, category, description });
        res.redirect('/english/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.deleteTopic = async (req, res) => {
    try {
        const { id } = req.params;
        await EnglishTopic.findByIdAndDelete(id);
        await EnglishWord.deleteMany({ topic: id });
        res.redirect('/english/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getManageWords = async (req, res) => {
    try {
        const { topicId } = req.params;
        const { search, difficulty } = req.query; // Capture query parameters

        const topic = await EnglishTopic.findById(topicId);
        
        // Build search query
        let query = { topic: topicId };
        
        if (search) {
            query.$or = [
                { word: { $regex: search, $options: 'i' } },
                { hindiMeaning: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (difficulty) {
            query.difficulty = difficulty;
        }

        const words = await EnglishWord.find(query);
        
        res.render('english/manage_words', { 
            topic, 
            words, 
            user: req.user,
            query: { search, difficulty } // Pass current filters back to view
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// Bulk Upload Logic
exports.bulkAddWords = async (req, res) => {
    try {
        const { topicId, wordsData } = req.body;
        
        // Format Expectation: "Word = Meaning" per line
        const lines = wordsData.split(/\r?\n/);
        const newWords = [];

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;
            
            const parts = line.split('=');
            if (parts.length >= 2) {
                newWords.push({
                    word: parts[0].trim(),
                    hindiMeaning: parts[1].trim(),
                    topic: topicId,
                    difficulty: 'medium'
                });
            }
        }

        if (newWords.length > 0) {
            await EnglishWord.insertMany(newWords);
        }

        res.redirect(`/english/admin/manage-words/${topicId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.deleteWord = async (req, res) => {
    try {
        const { id, topicId } = req.params;
        await EnglishWord.findByIdAndDelete(id);
        res.redirect(`/english/admin/manage-words/${topicId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};


// --- Student Controllers ---

exports.getStudentDashboard = async (req, res) => {
    try {
        const topics = await EnglishTopic.find({ isActive: true });
        
        // Fetch Admin Tests (createdBy is null or not exists)
        const availableTests = await EnglishTestConfig.find({ 
            isActive: true, 
            $or: [{ createdBy: null }, { createdBy: { $exists: false } }] 
        }).populate('topic');

        // Fetch Custom Tests (createdBy is current user)
        const customTests = await EnglishTestConfig.find({ 
            createdBy: req.user._id 
        }).populate('topic').sort({ createdAt: -1 });
        
        // Get generic progress stats
        const totalLearned = await EnglishProgress.countDocuments({ user: req.user._id, status: 'mastered' });
        
        res.render('english/student_dashboard', { topics, availableTests, customTests, totalLearned, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getCreateCustomTest = async (req, res) => {
    try {
        const topics = await EnglishTopic.find({ isActive: true });
        res.render('english/create_custom', { topics, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.createCustomTest = async (req, res) => {
    try {
        const { topicId, questionCount, duration } = req.body;
        
        const topic = await EnglishTopic.findById(topicId);
        
        await EnglishTestConfig.create({
            title: `Custom: ${topic.name} (${new Date().toLocaleDateString()})`,
            description: 'Custom practice session created by you.',
            topic: topicId,
            questionCount: parseInt(questionCount),
            duration: parseInt(duration),
            createdBy: req.user._id,
            isActive: true
        });

        res.redirect('/english/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.deleteCustomTest = async (req, res) => {
    try {
        const test = await EnglishTestConfig.findOne({ _id: req.params.id, createdBy: req.user._id });
        if(test) {
            await EnglishTestConfig.findByIdAndDelete(req.params.id);
        }
        res.redirect('/english/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.generateTest = async (req, res) => {
    try {
        let { topicId, questionCount, testId } = req.body;
        
        let testConfig = null;
        // If coming from a pre-configured test
        if (testId) {
            testConfig = await EnglishTestConfig.findById(testId).populate('topic');
            if(testConfig) {
                if (!testConfig.topic) {
                    return res.status(404).send('Error: The topic associated with this test has been deleted.');
                }
                topicId = testConfig.topic._id;
                questionCount = testConfig.questionCount;
            }
        }

        const limit = parseInt(questionCount) || 10;
        
        // --- Smart Practice Mode Logic ---
        const smartMode = await SystemSetting.findOne({ key: 'smartPracticeMode' });
        const prioritizeUnseen = smartMode && smartMode.value;

        const allWords = await EnglishWord.find({ topic: topicId, isActive: true });
        const userProgress = await EnglishProgress.find({ user: req.user._id, topic: topicId });

        // Adaptive Selection Logic
        // Map word ID to progress for quick lookup
        const progressMap = {};
        userProgress.forEach(p => {
            progressMap[p.word.toString()] = p;
        });

        // Assign weights
        const weightedWords = allWords.map(word => {
            const p = progressMap[word._id.toString()];
            let weight = 1;

            if (!p) {
                // UNSEEN WORD LOGIC
                if (prioritizeUnseen) {
                    weight = 1000; // Super high priority relative to others
                } else {
                    weight = 5; // Standard high priority
                }
            } else if (p.status === 'mastered') {
                weight = 0.5; // Already known, low priority
            } else if (p.incorrectCount > p.correctCount) {
                weight = 10; // Struggling, very high priority
            } else {
                weight = 3; // Learning phase
            }
            
            return { word, weight };
        });

        // Weighted Random Selection
        // Sort by weight (descending) with random factor
        // If Smart Mode is on, we want deterministic sort for the unseen ones (weight 1000)
        weightedWords.sort((a, b) => {
             // If weights are massive (Smart Mode Unseen), purely sort by weight first to ensure they are picked
             if (prioritizeUnseen && (a.weight >= 1000 || b.weight >= 1000)) {
                 return b.weight - a.weight; 
             }
             // Otherwise use randomized weight for variety
             return (Math.random() * b.weight) - (Math.random() * a.weight);
        });
        
        const finalSelection = weightedWords.slice(0, limit).map(w => w.word);

        // Prepare test object for UI consistency
        const testObj = {
            _id: testId || 'practice',
            title: testConfig ? testConfig.title : 'Practice Session',
            duration: testConfig ? testConfig.duration : 20,
            isSmartMode: prioritizeUnseen
        };

        res.render('english/test_runner', {
            test: testObj,
            topicId,
            questions: finalSelection
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.submitTest = async (req, res) => {
    try {
        const { topicId, answers, reviewData } = req.body;
        if (!answers) {
             return res.redirect('/english/dashboard');
        }

        // Parse reviewData
        let markedIds = [];
        try {
            if (reviewData) markedIds = JSON.parse(reviewData);
        } catch (e) {
            console.error("Error parsing review data", e);
        }

        // answers is expected to be object { wordId: userTypedAnswer }
        
        const results = [];
        let score = 0;
        let correctWords = [];
        let incorrectWords = [];

        for (const [wordId, userAnswer] of Object.entries(answers)) {
            const word = await EnglishWord.findById(wordId);
            if (!word) continue;

            const isCorrect = word.word.trim().toLowerCase() === userAnswer.trim().toLowerCase();
            
            if (isCorrect) score++;
            results.push({
                word: word.word,
                hindi: word.hindiMeaning,
                userAnswer,
                isCorrect,
                correctAnswer: word.word,
                wasMarked: markedIds.includes(wordId)
            });

            if (isCorrect) correctWords.push(wordId);
            else incorrectWords.push(wordId);

            // Update Progress in Background (await here for simplicity)
            let progress = await EnglishProgress.findOne({ user: req.user._id, word: wordId });
            
            if (!progress) {
                progress = new EnglishProgress({
                    user: req.user._id,
                    word: wordId,
                    topic: topicId
                });
            }

            progress.attempts++;
            progress.lastAttemptDate = Date.now();
            
            if (isCorrect) {
                progress.correctCount++;
                if (progress.correctCount > 3 && progress.incorrectCount === 0) {
                    progress.status = 'mastered';
                } else if(progress.correctCount > 5) { // Simple mastery logic
                     progress.status = 'mastered';
                }
            } else {
                progress.incorrectCount++;
                progress.status = 'learning'; // Downgrade if wrong
            }
            
            await progress.save();
        }

        res.render('english/result', {
            results,
            score,
            total: Object.keys(answers).length,
            user: req.user
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getStats = async (req, res) => {
    try {
        const progress = await EnglishProgress.find({ user: req.user._id })
            .populate('topic')
            .populate('word');
            
        // Group by Topic
        const topicStats = {};
        
        progress.forEach(p => {
            const topicName = p.topic ? p.topic.name : 'Unknown';
            if (!topicStats[topicName]) {
                topicStats[topicName] = { correct: 0, totalAttempts: 0, mastered: 0, learning: 0 };
            }
            topicStats[topicName].correct += p.correctCount;
            topicStats[topicName].totalAttempts += p.attempts;
            if(p.status === 'mastered') topicStats[topicName].mastered++;
            if(p.status === 'learning') topicStats[topicName].learning++;
        });

        res.render('english/stats', { topicStats, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
