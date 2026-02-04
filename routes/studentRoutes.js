const express = require('express');
const router = express.Router();
const { 
    getDashboard, 
    getPractice, 
    startTest, 
    submitTest, 
    getResults, 
    getResultDetail,
    getProfile,
    updateProfile,
    deleteAccount
} = require('../controllers/studentController');
const { protect, checkUser } = require('../middleware/auth');

// Publicly accessible dashboard (User optional)
router.get('/dashboard', checkUser, getDashboard);
router.get('/practice', checkUser, getPractice);

// Protected Routes (Login required)
router.use(protect); 
router.get('/test', startTest);
router.post('/test/submit', submitTest); 
router.get('/history', getResults);
router.get('/result/:id', getResultDetail);

// Profile Management
router.get('/profile', getProfile);
router.post('/profile', updateProfile);
router.post('/profile/delete', deleteAccount);

module.exports = router;
