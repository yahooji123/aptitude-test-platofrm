const User = require('../models/User');
const Result = require('../models/Result');
const TestSession = require('../models/TestSession');
const EssaySubmission = require('../models/EssaySubmission');
const ReadingResult = require('../models/ReadingResult');

// Render the main management page (Search)
exports.getManagementPage = async (req, res) => {
    try {
        res.render('admin/super_management', { 
            user: req.user, 
            searchResults: null, 
            searchQuery: '' 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// Handle Search
exports.searchUser = async (req, res) => {
    try {
        const { query } = req.body;
        // Search by name or email
        const users = await User.find({
            $or: [
                { email: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } }
            ]
        }).select('name email role'); // Only need basic info

        res.render('admin/super_management', { 
            user: req.user, 
            searchResults: users, 
            searchQuery: query 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Search Error");
    }
};

// View User Audit (Everything they have done)
exports.getUserAudit = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const targetUser = await User.findById(targetUserId);
        
        if (!targetUser) return res.status(404).send("User not found");

        // Parallel fetch for speed
        const [
            mcqResults,
            readingResults,
            essaySubmissions,
            activeSession
        ] = await Promise.all([
            Result.find({ user: targetUserId }).countDocuments(),
            ReadingResult.find({ user: targetUserId }).countDocuments(),
            EssaySubmission.find({ user: targetUserId }).countDocuments(),
            TestSession.findOne({ user: targetUserId })
        ]);

        const stats = {
            mcqCount: mcqResults,
            readingCount: readingResults,
            essayCount: essaySubmissions,
            hasActiveSession: !!activeSession
        };

        res.render('admin/user_audit', { targetUser, stats, user: req.user });

    } catch (err) {
        console.error(err);
        res.status(500).send("Audit Error");
    }
};

// THE NUKE FUNCTION
exports.deleteUserEntirely = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const { confirmationEmail } = req.body;

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) return res.status(404).send("User not found");

        // Double verification
        if (confirmationEmail !== targetUser.email) {
            return res.status(400).send("Verification Failed: Email does not match.");
        }

        // Prevent admin suicide
        if (targetUserId.toString() === req.user._id.toString()) {
            return res.status(403).send("You cannot delete your own admin account from here.");
        }

        console.log(`[AUDIT] ADMIN ${req.user.email} IS DELETING USER ${targetUser.email}`);

        // CASCADE DELETE
        await Promise.all([
            Result.deleteMany({ user: targetUserId }),
            ReadingResult.deleteMany({ user: targetUserId }),
            EssaySubmission.deleteMany({ user: targetUserId }),
            TestSession.deleteMany({ user: targetUserId }),
            User.findByIdAndDelete(targetUserId)
        ]);

        console.log(`[AUDIT] DELETION COMPLETE for ${targetUser.email}`);

        res.redirect('/admin/super-management?status=deleted');

    } catch (err) {
        console.error(err);
        res.status(500).send("Delete Failed");
    }
};
