const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const essayController = require('../controllers/essayController');

// --- ADMIN ROUTES ---
router.get('/admin/dashboard', protect, authorize('admin'), essayController.getAdminEssayDashboard);
router.post('/admin/topics/add', protect, authorize('admin'), essayController.addBulkTopics);
router.post('/admin/topics/toggle/:id', protect, authorize('admin'), essayController.toggleTopicStatus);
router.post('/admin/topics/delete/:id', protect, authorize('admin'), essayController.deleteTopic);
router.post('/admin/topics/delete-all', protect, authorize('admin'), essayController.deleteAllTopics); // Delete All
router.post('/admin/topics/delete-selected', protect, authorize('admin'), essayController.deleteSelectedTopics); // Bulk Delete Selected

router.get('/admin/submissions', protect, authorize('admin'), essayController.getAdminSubmissions);
router.get('/admin/evaluate/:id', protect, authorize('admin'), essayController.getEvaluatePage);
router.post('/admin/evaluate/:id', protect, authorize('admin'), essayController.submitEvaluation);
router.post('/admin/submissions/delete/:id', protect, authorize('admin'), essayController.deleteSubmission);

// --- STUDENT ROUTES ---
router.get('/student/dashboard', protect, authorize('student'), essayController.getStudentEssayDashboard);
router.get('/student/start', protect, authorize('student'), essayController.startEssayTest); // Init & Redirect
router.get('/student/write/:id', protect, authorize('student'), essayController.renderWritePage); // Actual Page
router.post('/student/submit', protect, authorize('student'), essayController.submitEssay);
router.get('/student/result/:id', protect, authorize('student'), essayController.getViewResult);

module.exports = router;
