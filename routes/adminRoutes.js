const express = require('express');
const router = express.Router();
const { 
    getDashboard, getQuestions, addQuestion, deleteQuestion, 
    getCreateTest, createTest, getBulkAdd, postBulkAdd,
    getEditTest, postEditTest, deleteTest,
    getProfile, updateProfile, deleteAccount,
    getStudents, deleteStudent
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.post('/settings/toggle', require('../controllers/adminController').toggleSetting); // New Route for Toggle

// Student Management
router.get('/students', getStudents);
router.post('/students/delete/:id', deleteStudent);

// Profile Management
router.get('/profile', getProfile);
router.post('/profile', updateProfile);
router.post('/profile/delete', deleteAccount);

// Bulk Routes (Place before /questions/:id or generic /questions catch-all if any detailed parameterized ones exist)
router.get('/questions/bulk', getBulkAdd);
router.post('/questions/bulk', postBulkAdd);
router.post('/questions/delete-bulk', require('../controllers/adminController').deleteQuestionsBulk);
router.post('/questions/delete-topic', require('../controllers/adminController').deleteQuestionsByTopic);

router.get('/questions', getQuestions);
router.post('/questions', addQuestion);
router.post('/questions/delete/:id', deleteQuestion);

// Test Management
router.get('/tests/create', getCreateTest);
router.post('/tests/create', createTest);

router.get('/tests/edit/:id', getEditTest);
router.post('/tests/edit/:id', postEditTest);
router.post('/tests/delete/:id', deleteTest);

module.exports = router;
