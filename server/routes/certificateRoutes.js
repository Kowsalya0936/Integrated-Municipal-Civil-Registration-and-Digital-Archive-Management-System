const express = require('express');
const router = express.Router();
const {
  downloadCertificate,
  verifyCertificatePublic,
} = require('../controllers/certificateController');
const { protect } = require('../middleware/authMiddleware');

// Public QR Code Verification endpoint
router.get('/verify/:identifier', verifyCertificatePublic);

// Authenticated certificate download (Protected)
router.get('/:id/download', protect, downloadCertificate);

module.exports = router;
