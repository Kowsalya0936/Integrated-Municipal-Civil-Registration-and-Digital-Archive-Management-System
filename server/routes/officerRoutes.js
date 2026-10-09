const express = require('express');
const router = express.Router();
const {
  getOfficerApplications,
  getOfficerApplicationDetails,
  approveApplication,
  rejectApplication,
  reissueCertificate,
  requestCorrection,
} = require('../controllers/officerController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All officer routes are strictly protected and authorized for officer role only
router.use(protect);
router.use(authorize('officer'));

router.get('/applications', getOfficerApplications);
router.get('/applications/:id', getOfficerApplicationDetails);
router.put('/applications/:id/approve', approveApplication);
router.put('/applications/:id/reject', rejectApplication);
router.put('/applications/:id/reissue', reissueCertificate);
router.put('/applications/:id/request-correction', requestCorrection);

module.exports = router;
