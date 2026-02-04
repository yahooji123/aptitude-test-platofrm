const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /auth/register
const registerUser = async (req, res) => {
    const { name, email, password, adminSecret } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.render('register', { error: 'User already exists' });
        }

        // Role assignment logic
        let role = 'student';
        
        // Priority 1: Secret Key
        if (adminSecret === 'Admin@123') {
            role = 'admin';
        } 
        // Priority 2: First User Fallback (Optional, kept for safety)
        else {
            const userCount = await User.countDocuments({});
            if (userCount === 0) {
                role = 'admin';
            }
        }

        const user = await User.create({
            name,
            email,
            password,
            role
        });

        if (user) {
            const token = generateToken(user._id);
            res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
            
            if (user.role === 'admin') {
                res.redirect('/admin/dashboard');
            } else {
                res.redirect('/student/dashboard');
            }
        } else {
            res.render('register', { error: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.render('register', { error: 'Server Error' });
    }
};

// @desc    Auth user & get token
// @route   POST /auth/login
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);
            res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });

            if (user.role === 'admin') {
                res.redirect('/admin/dashboard');
            } else {
                res.redirect('/student/dashboard');
            }
        } else {
            res.render('login', { error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.render('login', { error: 'Server Error' });
    }
};

// @desc    Logout user / clear cookie
// @route   GET /auth/logout
const logoutUser = (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser
};
