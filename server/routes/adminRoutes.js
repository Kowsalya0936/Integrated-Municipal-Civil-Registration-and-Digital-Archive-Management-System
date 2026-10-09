const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getUsers,
  createOfficer,
  toggleUserStatus,
  getAuditLogs,
  getArchiveRecords,
  getAdminReports,
  getEscalationList,
  updateEscalationStatus,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

// Archive is accessible to both Officer and Admin
router.get('/archive', authorize('admin', 'officer'), getArchiveRecords);

// Reports and all other admin management endpoints require admin role
router.get('/reports', authorize('admin'), getAdminReports);
router.get('/stats', authorize('admin'), getAdminStats);
router.get('/users', authorize('admin'), getUsers);
router.post('/officers', authorize('admin'), createOfficer);
router.put('/users/:id/toggle-status', authorize('admin'), toggleUserStatus);
router.get('/audit-logs', authorize('admin'), getAuditLogs);

// Citizen Escalation Management
router.get('/escalations', authorize('admin'), getEscalationList);
router.put('/applications/:id/escalation-status', authorize('admin'), updateEscalationStatus);

module.exports = router;
