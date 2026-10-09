const express = require('express');
const router = express.Router();
const {
  createApplication,
  getMyApplications,
  getApplicationById,
  getApplicationDocument,
  trackApplicationPublic,
  resubmitCorrection,
  citizenEscalateApplication,
} = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public Application Tracking (handles both query params and URL route parameters)
router.get('/track', trackApplicationPublic);
router.get('/track/:applicationNumber', trackApplicationPublic);

// Citizen Application Routes
router.post('/', protect, upload.any(), createApplication);
router.get('/my', protect, getMyApplications);
router.get('/:id', protect, getApplicationById);
router.get('/:id/documents/:documentId', protect, getApplicationDocument);
router.put('/:id/resubmit', protect, upload.any(), resubmitCorrection);
router.post('/:id/escalate', protect, citizenEscalateApplication);

module.exports = router;
