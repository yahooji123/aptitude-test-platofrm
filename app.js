const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected to apptitude-db'))
.catch(err => console.log(err));

// Routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/student', require('./routes/studentRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/adaptive', require('./routes/adaptiveRoutes'));
app.use('/essay', require('./routes/essayRoutes')); // New Essay Feature
app.use('/reading', require('./routes/readingRoutes')); // New Reading Feature
app.use('/english', require('./routes/englishRoutes')); // New English Learning Feature

// Public Routes (Login/Register Pages)
app.get('/', (req, res) => res.redirect('/student/dashboard'));
app.get('/login', (req, res) => res.render('login', { error: null }));
app.get('/register', (req, res) => res.render('register', { error: null }));

// 404 Handler (Page Not Found)
app.use((req, res, next) => {
    res.status(404).render('error', { code: 404, message: 'Page Not Found', user: req.user });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { code: 500, message: 'Internal Server Error', user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
