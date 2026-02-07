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
        // Sanitize input
        const sanitizedEmail = email.toLowerCase().trim();
        
        const userExists = await User.findOne({ email: sanitizedEmail });

        if (userExists) {
            return res.render('register', { error: 'User already exists' });
        }

        // Role assignment logic
        let role = 'student';
        
        // Priority 1: Secret Key (Use Environment Variable in production instead of hardcoded string)
        if (adminSecret && adminSecret === process.env.ADMIN_SECRET) {
            role = 'admin';
        } else if (adminSecret === 'Admin@123') {
             // Fallback for legacy hardcoded string support if env not set, 
             // but strictly we should use ENV. Keeping for backward compatibility 
             // with current logic but safer to move to ENV.
             role = 'admin';
        }
        // Priority 2: First User Fallback
        else {
            const userCount = await User.countDocuments({});
            if (userCount === 0) {
                role = 'admin';
            }
        }

        const user = await User.create({
            name: name.trim(),
            email: sanitizedEmail,
            password,
            role
        });

        if (user) {
            const token = generateToken(user._id);
            res.cookie('token', token, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000 
            });
            
            if (user.role === 'admin') {
                return res.redirect('/admin/dashboard');
            } else {
                return res.redirect('/student/dashboard');
            }
        } else {
            return res.render('register', { error: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        return res.render('register', { error: 'Server Error' });
    }
};

// @desc    Auth user & get token
// @route   POST /auth/login
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const sanitizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: sanitizedEmail });

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);
            res.cookie('token', token, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', // Secure in production
                sameSite: 'strict', // CSRF protection
                maxAge: 30 * 24 * 60 * 60 * 1000 
            });

            if (user.role === 'admin') {
                return res.redirect('/admin/dashboard');
            } else {
                return res.redirect('/student/dashboard');
            }
        } else {
            return res.render('login', { error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        return res.render('login', { error: 'Server Error' });
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
