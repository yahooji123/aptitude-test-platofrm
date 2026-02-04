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

// Public Routes (Login/Register Pages)
app.get('/', (req, res) => res.redirect('/student/dashboard'));
app.get('/login', (req, res) => res.render('login', { error: null }));
app.get('/register', (req, res) => res.render('register', { error: null }));

// 404 Handler (Page Not Found)
app.use((req, res, next) => {
    res.status(404).send("<h1>404 - Page Not Found</h1><p>The page you are looking for does not exist.</p><p><a href='/'>Go Home</a></p>");
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("<h1>500 - Server Error</h1><p>Something went wrong on the server.</p>");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
