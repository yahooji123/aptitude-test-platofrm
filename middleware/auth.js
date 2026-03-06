const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');

const fetchGlobalSettings = async (res) => {
    try {
        const settings = await SystemSetting.find({}).lean();
        res.locals.systemSettings = {
            AI_CHAT_ENABLED: true, // Default true
            AI_READING_FEATURES_ENABLED: true // Default true
        };
        settings.forEach(s => {
            res.locals.systemSettings[s.key] = s.value;
        });
    } catch (err) {
        res.locals.systemSettings = {
            AI_CHAT_ENABLED: true,
            AI_READING_FEATURES_ENABLED: true
        };
    }
};

const protect = async (req, res, next) => {
    let token;

    if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password').lean();
        
        // Pass user to views
        res.locals.user = req.user;
        await fetchGlobalSettings(res);
        
        next();
    } catch (error) {
        console.error(error);
        res.clearCookie('token');
        return res.redirect('/login');
    }
};

// Check user status without enforcing login (for public dashboard)
const checkUser = async (req, res, next) => {
    let token;
    if (req.cookies.token) {
        token = req.cookies.token;
    }

    res.locals.user = null;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            res.locals.user = req.user;
        } catch (error) {
            console.error('Token verification failed:', error.message);
            res.clearCookie('token');
        }
    }
    
    await fetchGlobalSettings(res);
    next();
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            // If admin tries to access student page or vice versa, generic error or redirect
            return res.status(403).send(`User role ${req.user.role} is not authorized to access this route`);
        }
        next();
    };
};

module.exports = { protect, checkUser, authorize };
