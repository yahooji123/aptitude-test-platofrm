const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const adaptiveController = require('../controllers/adaptiveController');

// Student Adaptive Dashboard
router.get('/student/dashboard', protect, authorize('student'), adaptiveController.getStudentAdaptiveDashboard);

// Admin Adaptive Dashboard
router.get('/admin/dashboard', protect, authorize('admin'), adaptiveController.getAdminAdaptiveDashboard);

// Test Runner Routes
router.get('/test/:testId/start', protect, authorize('student'), adaptiveController.startAdaptiveTest);
router.get('/test/:testId/runner', protect, authorize('student'), adaptiveController.getAdaptiveTestRunner);
router.post('/test/:testId/submit-answer', protect, authorize('student'), adaptiveController.submitAdaptiveAnswer);

// Redirect root /adaptive based on role
router.get('/', protect, (req, res) => {
    if (req.user.role === 'admin') {
        res.redirect('/adaptive/admin/dashboard');
    } else {
        res.redirect('/adaptive/student/dashboard');
    }
});

module.exports = router;
