const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const { protectFaculty } = require('../middleware/facultyAuth');

// Public Routes
router.get('/register', facultyController.getRegister);
router.post('/register', facultyController.postRegister);

router.get('/status', facultyController.getStatus);
router.post('/status', facultyController.postStatus);

// Creating password route when approved
router.post('/setup-password/:id', facultyController.setupPassword);

router.get('/login', facultyController.getLogin);
router.post('/login', facultyController.postLogin);
router.get('/logout', facultyController.logout);

// Protected Routes
router.use(protectFaculty);
router.get('/dashboard', facultyController.getDashboard);

router.get('/evaluate-essay/:id', facultyController.getEvaluateEssay);
router.post('/evaluate-essay/:id', facultyController.postEvaluateEssay);

router.get('/evaluate-exam/:id', facultyController.getEvaluateExam);
router.post('/evaluate-exam/:id', facultyController.postEvaluateExam);

module.exports = router;
