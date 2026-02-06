const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const readingController = require('../controllers/readingController');

// Admin
router.get('/admin/dashboard', protect, authorize('admin'), readingController.getAdminDashboard);
router.post('/admin/add', protect, authorize('admin'), readingController.addPassage);
router.post('/admin/toggle/:id', protect, authorize('admin'), readingController.togglePassage);
router.post('/admin/delete/:id', protect, authorize('admin'), readingController.deletePassage);
router.post('/admin/result/delete/:id', protect, authorize('admin'), readingController.deleteResult); // New Route

// Student
router.get('/student/dashboard', protect, authorize('student'), readingController.getStudentDashboard);
router.get('/student/start', protect, authorize('student'), readingController.startTest);
router.post('/student/submit', protect, authorize('student'), readingController.submitTest);
router.get('/student/result/:id', protect, authorize('student'), readingController.viewResult);
router.post('/student/result/delete/:id', protect, authorize('student'), readingController.deleteStudentResult); // Student Delete

module.exports = router;
