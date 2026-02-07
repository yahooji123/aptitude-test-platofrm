const express = require('express');
const router = express.Router();
const englishController = require('../controllers/englishController');
const { protect } = require('../middleware/auth'); // Assuming you have auth middleware

// Admin Routes
router.get('/admin/dashboard', protect, englishController.getAdminDashboard);
router.post('/admin/create-topic', protect, englishController.createTopic);
router.get('/admin/delete-topic/:id', protect, englishController.deleteTopic);
router.get('/admin/manage-words/:topicId', protect, englishController.getManageWords);
router.post('/admin/bulk-add', protect, englishController.bulkAddWords);
router.get('/admin/delete-word/:topicId/:id', protect, englishController.deleteWord);

// Test Config Routes (Admin)
router.get('/admin/create-test', protect, englishController.getCreateTest);
router.post('/admin/create-test', protect, englishController.createTest);
router.get('/admin/delete-test/:id', protect, englishController.deleteTest);

// Custom Test Routes (Student)
router.get('/custom-test', protect, englishController.getCreateCustomTest);
router.post('/custom-test/create', protect, englishController.createCustomTest);
router.get('/custom-test/delete/:id', protect, englishController.deleteCustomTest);

// Student Routes
router.get('/dashboard', protect, englishController.getStudentDashboard);
router.post('/test/generate', protect, englishController.generateTest);
router.post('/test/submit', protect, englishController.submitTest);
router.get('/stats', protect, englishController.getStats);

module.exports = router;
