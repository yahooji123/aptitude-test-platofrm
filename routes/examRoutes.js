const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { protect, authorize, checkUser } = require('../middleware/auth'); 
const upload = require('../middleware/upload');

// Admin Routes
router.get('/admin/create', protect, authorize('admin'), examController.getCreateExam);
router.post('/admin/create', protect, authorize('admin'), examController.createExam);
router.get('/admin/dashboard', protect, authorize('admin'), examController.getAdminDashboard);
router.get('/admin/registrations/:examId', protect, authorize('admin'), examController.getExamRegistrations);
router.post('/admin/registrations/delete/:regId', protect, authorize('admin'), examController.deleteExamRegistration);
router.post('/admin/registrations/delete-image/:regId', protect, authorize('admin'), examController.deleteSubmissionImage);
router.post('/admin/registrations/mark/:regId', protect, authorize('admin'), examController.updateMarks);

// Edit/Delete Exam
router.get('/admin/edit/:id', protect, authorize('admin'), examController.getEditExam);
router.post('/admin/edit/:id', protect, authorize('admin'), examController.postEditExam);
router.post('/admin/delete/:id', protect, authorize('admin'), examController.deleteExam);


// Student/Public Routes (Use checkUser or protect to pass user data to header)
router.get('/', checkUser, examController.getExamList);
router.get('/:id/register', checkUser, examController.getRegister);
router.post('/:id/register', checkUser, examController.postRegister);
router.get('/card/:regId', checkUser, examController.getStudentCard);
router.get('/:id/login', checkUser, examController.getExamLogin);
router.post('/:id/login', checkUser, examController.postExamLogin);
router.get('/:id/attempt', checkUser, examController.getAttemptExam);
router.post('/submit', checkUser, upload.array('answerFiles', 20), examController.postSubmitExam);

module.exports = router;
