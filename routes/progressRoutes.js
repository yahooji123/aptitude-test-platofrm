const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { protect } = require('../middleware/auth');

router.get('/dashboard', protect, progressController.getDashboard);

module.exports = router;
