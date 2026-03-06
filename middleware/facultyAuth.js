const jwt = require('jsonwebtoken');
const Faculty = require('../models/Faculty');

exports.protectFaculty = async (req, res, next) => {
    let token;

    if (req.cookies.facultyToken) {
        token = req.cookies.facultyToken;
    }

    if (!token) {
        return res.redirect('/faculty/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.faculty = await Faculty.findById(decoded.id).select('-password');
        res.locals.faculty = req.faculty;
        next();
    } catch (error) {
        console.error('Faculty token verification failed:', error.message);
        res.clearCookie('facultyToken');
        return res.redirect('/faculty/login');
    }
};
