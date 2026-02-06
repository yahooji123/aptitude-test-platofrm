const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const superAdminController = require('../controllers/superAdminController');

// All routes require Admin privileges
router.use(protect);
router.use(authorize('admin'));

// Main Search Page
router.get('/super-management', superAdminController.getManagementPage);
router.post('/super-management/search', superAdminController.searchUser);

// User Audit & Actions
router.get('/super-management/audit/:id', superAdminController.getUserAudit);

// Destructive Action
router.post('/super-management/nuke/:id', superAdminController.deleteUserEntirely);

module.exports = router;
