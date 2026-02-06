const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const essayController = require('../controllers/essayController');

// --- ADMIN ROUTES ---
router.get('/admin/dashboard', protect, authorize('admin'), essayController.getAdminEssayDashboard);
router.post('/admin/topics/add', protect, authorize('admin'), essayController.addBulkTopics);
router.post('/admin/topics/toggle/:id', protect, authorize('admin'), essayController.toggleTopicStatus);

router.get('/admin/submissions', protect, authorize('admin'), essayController.getAdminSubmissions);
router.get('/admin/evaluate/:id', protect, authorize('admin'), essayController.getEvaluatePage);
router.post('/admin/evaluate/:id', protect, authorize('admin'), essayController.submitEvaluation);

// --- STUDENT ROUTES ---
router.get('/student/dashboard', protect, authorize('student'), essayController.getStudentEssayDashboard);
router.get('/student/start', protect, authorize('student'), essayController.startEssayTest);
router.post('/student/submit', protect, authorize('student'), essayController.submitEssay);
router.get('/student/result/:id', protect, authorize('student'), essayController.getViewResult);

module.exports = router;
