const ReadingPassage = require('../models/ReadingPassage');
const ReadingResult = require('../models/ReadingResult');

// --- UTILS ---
function parseReadingContent(rawText) {
    // Expected Format:
    // # Title Case
    // [Passage Body...]
    //
    // Q1. Question text?
    // a) Option 1
    // b) Option 2
    // c) Option 3
    // d) Option 4
    // Ans: a
    // Exp: Explanation text...
    
    try {
        const result = { title: '', content: '', questions: [] };
        
        // Normalize line endings
        const text = rawText.replace(/\r\n/g, '\n');
        
        // extract title (first line starting with #)
        const titleMatch = text.match(/^#\s*(.+)/m);
        if (!titleMatch) throw new Error('Title missing (Start with #)');
        result.title = titleMatch[1].trim();

        // extract Passage (text between title and first "Q1.")
        const q1Index = text.search(/Q1\./i);
        if (q1Index === -1) throw new Error('Q1 not found');
        
        // Passage is from after Title to before Q1
        const titleEndIndex = titleMatch.index + titleMatch[0].length;
        result.content = text.substring(titleEndIndex, q1Index).trim();

        // Extract Questions
        const qRegex = /Q(\d+)\.\s*([\s\S]+?)(?=Q\d+\.|^$)/g; // Naive split by Q1., Q2., etc could fail if not explicit
        // Better: Split by "Q[number]."
        
        const questionBlocks = text.split(/Q\d+\./).slice(1); // Remove pre-Q1
        
        if (questionBlocks.length < 5) throw new Error(`Found ${questionBlocks.length} questions. Need exactly 5.`);

        questionBlocks.slice(0, 5).forEach(block => {
            const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
            
            // First line is Question Text
            const qText = lines[0];
            
            // Find Options (a) b) c) d))
            // Only simple parsing for now
            const options = [];
            let ansChar = '';
            let exp = 'No explanation.';
            
            // This loop is tricky, let's use regex for specific fields per block
            const optionRegex = /^[a-d]\)\s*(.+)/i;
            const ansRegex = /^Ans:\s*([a-d])/i;
            const expRegex = /^Exp:\s*(.+)/i;

            lines.forEach((line) => {
                if (line.match(/^[a-d]\)/i)) {
                    options.push(line.replace(/^[a-d]\)\s*/i, '').trim());
                }
                const aMatch = line.match(ansRegex);
                if (aMatch) ansChar = aMatch[1].toLowerCase();
                
                const eMatch = line.match(expRegex);
                if (eMatch) exp = eMatch[1];
            });

            if (options.length < 4) throw new Error('Some questions define fewer than 4 options.');
            if (!ansChar) throw new Error('Answer missing for a question (Format: Ans: a)');

            const charMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
            
            result.questions.push({
                questionText: qText,
                options: options.slice(0, 4),
                correctOption: charMap[ansChar],
                explanation: exp
            });
        });

        return result;

    } catch (e) {
        throw new Error('Parsing Error: ' + e.message);
    }
}

// --- ADMIN ---

exports.getAdminDashboard = async (req, res) => {
    try {
        const passages = await ReadingPassage.find().sort({ createdAt: -1 });
        res.render('reading/admin_dashboard', { passages });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

exports.addPassage = async (req, res) => {
    try {
        const { rawContent } = req.body;
        const parsed = parseReadingContent(rawContent);
        
        await ReadingPassage.create({
            ...parsed,
            createdBy: req.user._id
        });
        
        res.redirect('/reading/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(400).send(`Error: ${err.message} <br><a href="/reading/admin/dashboard">Back</a>`);
    }
};

exports.togglePassage = async (req, res) => {
    try {
        const p = await ReadingPassage.findById(req.params.id);
        if (p) {
            p.isActive = !p.isActive;
            await p.save();
        }
        res.redirect('/reading/admin/dashboard');
    } catch (err) {
        res.status(500).send("Server Error");
    }
};

exports.deletePassage = async (req, res) => {
    try {
        await ReadingPassage.findByIdAndDelete(req.params.id);
        res.redirect('/reading/admin/dashboard');
    } catch (err) {
        res.status(500).send("Server Error");
    }
};

// --- STUDENT ---

exports.getStudentDashboard = async (req, res) => {
    try {
        const results = await ReadingResult.find({ user: req.user._id }).sort({ completedAt: -1 });
        res.render('reading/student_dashboard', { results });
    } catch (err) {
        res.status(500).send("Server Error");
    }
};

// Start a new test session
exports.startTest = async (req, res) => {
    try {
        // Randomly select active passages based on user choice
        let reqCount = parseInt(req.query.count) || 4;
        if (reqCount < 1) reqCount = 1;
        
        const totalAvailable = await ReadingPassage.countDocuments({ isActive: true });
        
        if (totalAvailable === 0) return res.send("No active reading passages available.");
        
        // If requested more than available, just give what we have
        const finalCount = Math.min(reqCount, totalAvailable);

        const randomRecs = await ReadingPassage.aggregate([
            { $match: { isActive: true } },
            { $sample: { size: finalCount } },
            { $project: { title: 1, content: 1, questions: 1 } } 
        ]);

        // Sanitize: Remove correctOption from client-side data to prevent inspect element cheating
        const clientData = randomRecs.map(p => ({
            _id: p._id,
            title: p.title,
            content: p.content,
            questions: p.questions.map(q => ({
                _id: q._id,
                questionText: q.questionText,
                options: q.options
                // No correctOption here
            }))
        }));

        res.render('reading/test_runner', { 
            testData: encodeURIComponent(JSON.stringify(clientData))
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// Score the test
exports.submitTest = async (req, res) => {
    try {
        /*
        req.body.answers = {
            "passageId_1": [0, 1, 2, 3, 0], // indices selected by user
            "passageId_2": [...]
        }
        */
        const userAnswers = req.body; // JSON object
        
        const passageIds = Object.keys(userAnswers);
        const passages = await ReadingPassage.find({ _id: { $in: passageIds } });
        
        let resultPassages = [];
        let totalScore = 0;

        passageIds.forEach(pId => {
            const pData = passages.find(p => p._id.toString() === pId);
            if (!pData) return;

            const uAns = userAnswers[pId].map(Number); // array of 5 ints
            let pScore = 0;

            // Compare with correct answers
            pData.questions.forEach((q, idx) => {
                if (uAns[idx] === q.correctOption) {
                    pScore++;
                }
            });

            totalScore += pScore;
            resultPassages.push({
                passageId: pId,
                answers: uAns,
                passageScore: pScore
            });
        });

        const newResult = await ReadingResult.create({
            user: req.user._id,
            passages: resultPassages,
            totalScore: totalScore,
            maxScore: passageIds.length * 5
        });

        res.json({ success: true, redirectUrl: `/reading/student/result/${newResult._id}` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Evaluation Failed" });
    }
};

exports.deleteResult = async (req, res) => {
    try {
        await ReadingResult.findByIdAndDelete(req.params.id);
        
        // Return based on source (though mostly hitting from admin views)
        // If query param ?source=student is passed, go there (for dev testing)
        // Otherwise default to admin dashboard or back
        const referer = req.get('Referer');
        if (referer && referer.includes('/student/dashboard')) {
            return res.redirect('/reading/student/dashboard'); // Allow refresh if dev deleting from student view
        }
        res.redirect('/reading/admin/dashboard'); // Or create a dedicated results view
    } catch (err) {
        console.error(err);
        res.status(500).send("Deletion Error");
    }
};

exports.deleteStudentResult = async (req, res) => {
    try {
        // Only delete if it belongs to the logged-in student
        const result = await ReadingResult.findOneAndDelete({ 
            _id: req.params.id, 
            user: req.user._id 
        });

        if (!result) {
            // Could be not found or not owned
            return res.status(404).send("Result not found or unauthorized");
        }

        res.redirect('/reading/student/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Deletion Error");
    }
};

exports.viewResult = async (req, res) => {
    try {
        const result = await ReadingResult.findById(req.params.id)
            .populate('passages.passageId');
            
        if (!result) return res.send("Result not found");

        res.render('reading/result', { result });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};
