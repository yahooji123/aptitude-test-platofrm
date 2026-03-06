const express = require('express');
const router = express.Router();
const codingController = require('../controllers/codingController');
const { protect, authorize } = require('../middleware/auth');

// --- Admin Routes ---
router.get('/admin', protect, authorize('admin', 'super-admin'), codingController.getAdminDashboard);
router.post('/admin/add', protect, authorize('admin', 'super-admin'), codingController.addQuestion);
router.get('/admin/topics', protect, authorize('admin', 'super-admin'), codingController.getTopicsDashboard);
router.post('/admin/topics/add', protect, authorize('admin', 'super-admin'), codingController.addTopic);
router.post('/admin/topics/:topicName/delete', protect, authorize('admin', 'super-admin'), codingController.deleteTopic);
router.get('/admin/topics/:topicName/questions', protect, authorize('admin', 'super-admin'), codingController.viewTopicQuestions);
router.post('/admin/questions/delete-multiple', protect, authorize('admin', 'super-admin'), codingController.deleteMultipleQuestions);
router.get('/admin/bulk', protect, authorize('admin', 'super-admin'), codingController.getBulkAddForm);
router.post('/admin/bulk', protect, authorize('admin', 'super-admin'), codingController.bulkAddQuestions);

// --- Student Routes ---
router.get('/', protect, authorize('student'), codingController.getStudentDashboard);
router.post('/start', protect, authorize('student'), codingController.startTest);
router.post('/mark-seen', protect, authorize('student'), codingController.markSeen);
router.post('/reset-progress', protect, authorize('student'), codingController.resetProgress);

module.exports = router;
