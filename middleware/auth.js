const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
        req.user = await User.findById(decoded.id).select('-password');
        
        // Pass user to views
        res.locals.user = req.user;
        
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

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            res.locals.user = req.user;
        } catch (error) {
            console.error('Token verification failed:', error.message);
            res.clearCookie('token');
            res.locals.user = null;
        }
    } else {
        res.locals.user = null;
    }
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
