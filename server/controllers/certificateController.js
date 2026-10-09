const Application = require('../models/Application');
const { generateCertificatePDF } = require('../utils/pdfGenerator');
const logAudit = require('../utils/auditLogger');
const { verifyCertificateHash } = require('../utils/certificateHash');

// @desc    Download Official PDF Certificate for an Approved Application
// @route   GET /api/certificates/:id/download
// @access  Private (Owner Citizen, Officer, Admin)
const downloadCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    let application;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(id).populate('applicant', 'name email mobile');
    } else {
      application = await Application.findOne({
        $or: [{ applicationNumber: id }, { certificateNumber: id }],
      }).populate('applicant', 'name email mobile');
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application/Certificate record not found.',
      });
    }

    if (application.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Certificate is not available. Only approved applications can generate official certificates.',
      });
    }

    // Security check
    const isOwner = application.applicant._id.toString() === req.user._id.toString();
    const isStaff = ['officer', 'admin'].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You do not have permission to download this certificate.',
      });
    }

    // Set Response Headers for PDF Download
    const fileName = `${application.certificateNumber || application.applicationNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Stream PDF
    await generateCertificatePDF(application, res);

    // Audit Log
    await logAudit({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'CERTIFICATE_DOWNLOADED',
      targetRecordId: application.certificateNumber || application.applicationNumber,
      details: { certificateType: application.certificateType },
      ipAddress: req.ip,
    });
  } catch (error) {
    console.error('[Download Certificate Error]:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Server error generating certificate PDF',
      });
    }
  }
};

// @desc    Public QR Code & Certificate Cryptographic Verification Endpoint
// @route   GET /api/certificates/verify/:identifier
// @access  Public
const verifyCertificatePublic = async (req, res) => {
  try {
    const { identifier } = req.params;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        isValid: false,
        message: 'Please provide a valid certificate or application identifier.',
      });
    }

    const trimmed = identifier.trim();

    // Query exclusively approved records
    const application = await Application.findOne({
      $or: [
        { certificateNumber: trimmed },
        { applicationNumber: trimmed },
        { qrVerificationToken: trimmed },
      ],
      status: 'APPROVED',
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        isValid: false,
        message: 'Certificate record not found in Municipal Digital Archive or has not been approved.',
      });
    }

    // Perform actual cryptographic hash verification
    const integrityResult = verifyCertificateHash(application);

    const isBirth = application.certificateType === 'BIRTH';
    const beneficiaryName = isBirth
      ? application.certificateDetails?.childName
      : application.certificateDetails?.deceasedName;

    // Public certificate verification does not create audit records to prevent log exhaustion
    return res.status(200).json({
      success: true,
      isValid: true,
      certificate: {
        certificateNumber: application.certificateNumber,
        applicationNumber: application.applicationNumber,
        certificateType: application.certificateType,
        issuedDate: application.certificateIssuedAt,
        issuingAuthority: 'Municipal Corporation Civil Registration Department',
        beneficiaryName: beneficiaryName || 'Registered Citizen',
        status: 'GENUINE & VERIFIED IN DIGITAL ARCHIVE',
        applicantName: application.applicantDetails?.name || 'N/A',
        placeOfEvent: application.certificateDetails?.hospitalName || application.certificateDetails?.placeOfBirth || application.certificateDetails?.placeOfDeath || 'Municipal District',
        integrity: {
          algorithm: integrityResult.algorithm || 'SHA-256',
          status: integrityResult.status, // "VERIFIED" | "INTEGRITY MISMATCH" | "LEGACY / HASH NOT AVAILABLE"
          isVerified: integrityResult.isVerified,
          message: integrityResult.message,
          generatedAt: integrityResult.generatedAt,
          verifiedAt: new Date(),
        },
      },
    });
  } catch (error) {
    console.error('[Public Verification Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error verifying certificate',
    });
  }
};

module.exports = {
  downloadCertificate,
  verifyCertificatePublic,
};
