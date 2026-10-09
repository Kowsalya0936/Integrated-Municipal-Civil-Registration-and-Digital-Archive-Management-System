const Application = require('../models/Application');
const { generateCertificateNumber } = require('../utils/appNumberGenerator');
const logAudit = require('../utils/auditLogger');
const {
  buildSlaOverdueFilter,
  buildEscalatedQuery,
} = require('../utils/slaHelper');
const {
  sendApprovalEmail,
  sendRejectionEmail,
  sendReissueEmail,
  sendCorrectionRequiredEmail,
} = require('../utils/emailService');
const { generateCertificateHash } = require('../utils/certificateHash');
const { generateCertificatePDFBuffer } = require('../utils/pdfGenerator');
const { runSmartVerification } = require('../utils/smartVerification');

// @desc    Get all applications for Officer review with filtering
// @route   GET /api/officer/applications
// @access  Private (Officer only)
const getOfficerApplications = async (req, res) => {
  try {
    const { certificateType, status, search, dateFrom, dateTo, sla, escalated, attention, risk } = req.query;
    const now = new Date();

    const filter = {};

    if (certificateType && certificateType !== 'ALL') {
      filter.certificateType = certificateType.toUpperCase();
    }

    // Attention / Risk filter
    if (attention === 'true') {
      filter['smartVerification.requiresAttention'] = true;
    } else if (risk && ['LOW', 'MEDIUM', 'HIGH'].includes(risk.toUpperCase())) {
      filter['smartVerification.overallRisk'] = risk.toUpperCase();
    }

    // Escalated filter (dedicated filter for formally escalated unresolved applications)
    if (escalated === 'true' || (status && status.toUpperCase() === 'ESCALATED') || (sla && sla.toUpperCase() === 'ESCALATED')) {
      const escalatedFilter = buildEscalatedQuery(now);
      filter.isEscalated = escalatedFilter.isEscalated;
      filter.status = escalatedFilter.status;
      filter.slaDeadline = escalatedFilter.slaDeadline;
    } else if (sla === 'overdue' || sla === 'OVERDUE') {
      // SLA overdue filter (preserved and distinct: all overdue unresolved applications)
      const overdueFilter = buildSlaOverdueFilter(now);
      filter.status = overdueFilter.status;
      filter.slaDeadline = overdueFilter.slaDeadline;
    } else if (status && status !== 'ALL') {
      const upperStatus = status.toUpperCase();
      if (upperStatus === 'PENDING') {
        filter.status = { $in: ['PENDING', 'UNDER_REVIEW'] };
      } else {
        filter.status = upperStatus;
      }
    }

    if (search) {
      filter.$or = [
        { applicationNumber: { $regex: search.trim(), $options: 'i' } },
        { 'applicantDetails.name': { $regex: search.trim(), $options: 'i' } },
        { 'certificateDetails.childName': { $regex: search.trim(), $options: 'i' } },
        { 'certificateDetails.deceasedName': { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (dateFrom || dateTo) {
      filter.submittedAt = {};
      if (dateFrom) filter.submittedAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.submittedAt.$lte = toDate;
      }
    }

    const applications = await Application.find(filter)
      .populate('applicant', 'name email mobile')
      .sort({ submittedAt: -1 });

    // Aggregate statistics for Officer Dashboard using exact MongoDB queries
    const slaOverdueQuery = buildSlaOverdueFilter(now);
    const escalatedQuery = buildEscalatedQuery(now);
    const [
      total,
      pending,
      approved,
      rejected,
      birthCount,
      deathCount,
      overdueCount,
      escalatedCount,
      attentionCount,
    ] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ status: { $in: ['PENDING', 'UNDER_REVIEW'] } }),
      Application.countDocuments({ status: 'APPROVED' }),
      Application.countDocuments({ status: 'REJECTED' }),
      Application.countDocuments({ certificateType: 'BIRTH' }),
      Application.countDocuments({ certificateType: 'DEATH' }),
      Application.countDocuments(slaOverdueQuery),
      Application.countDocuments(escalatedQuery),
      Application.countDocuments({'smartVerification.requiresAttention': true}),
    ]);

    const stats = {
      total,
      pending,
      approved,
      rejected,
      birthCount,
      deathCount,
      overdueCount,
      escalatedCount,
      attentionCount,
    };

    return res.status(200).json({
      success: true,
      stats,
      applications,
    });
  } catch (error) {
    console.error('[Officer Get Applications Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching officer applications',
    });
  }
};

// @desc    Get Single Application Details for Officer
// @route   GET /api/officer/applications/:id
// @access  Private (Officer only)
const getOfficerApplicationDetails = async (req, res) => {
  try {
    const { id } = req.params;

    let application;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(id)
        .populate('applicant', 'name email mobile address city state pincode')
        .populate('reviewedBy', 'name email');
    } else {
      application = await Application.findOne({ applicationNumber: id })
        .populate('applicant', 'name email mobile address city state pincode')
        .populate('reviewedBy', 'name email');
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    // If smart verification is missing or unpopulated, run verification
    if (!application.smartVerification || !application.smartVerification.checks || application.smartVerification.checks.length === 0) {
      const verification = await runSmartVerification(application);
      application.smartVerification = verification;
      await application.save();
    }

    // Mark as UNDER_REVIEW if it was PENDING or RESUBMITTED when officer views it
    if (application.status === 'PENDING' || application.status === 'RESUBMITTED') {
      const prevStatus = application.status;
      application.status = 'UNDER_REVIEW';
      await application.save();

      await logAudit({
        user: req.user._id,
        userName: req.user.name,
        role: req.user.role,
        action: prevStatus === 'RESUBMITTED' ? 'APPLICATION_RESUBMISSION_UNDER_REVIEW' : 'APPLICATION_UNDER_REVIEW',
        targetRecordId: application.applicationNumber,
        ipAddress: req.ip,
      });
    }

    return res.status(200).json({
      success: true,
      application,
    });
  } catch (error) {
    console.error('[Officer Application Details Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching application details',
    });
  }
};

// @desc    Approve Application and Generate Certificate
// @route   PUT /api/officer/applications/:id/approve
// @access  Private (Officer ONLY)
const approveApplication = async (req, res) => {
  try {
    // SECURITY CHECK: Backend verification that role === officer
    if (req.user.role !== 'officer') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only designated municipal officers can approve applications.',
      });
    }

    const { id } = req.params;

    let application;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(id).populate('applicant', 'name email mobile');
    } else {
      application = await Application.findOne({ applicationNumber: id }).populate('applicant', 'name email mobile');
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    if (application.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'This application has already been approved.',
      });
    }

    // Generate atomic certificate number
    const certificateNumber = await generateCertificateNumber(application.certificateType);
    const certificateIssuedAt = new Date();
    const qrVerificationToken = Buffer.from(`${certificateNumber}:${application.applicationNumber}:${Date.now()}`).toString('base64');

    application.status = 'APPROVED';
    application.certificateNumber = certificateNumber;
    application.certificateIssuedAt = certificateIssuedAt;
    application.qrVerificationToken = qrVerificationToken;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    application.rejectionReason = undefined; // Clear any old rejection

    // Cryptographic Certificate Integrity (SHA-256)
    const integrity = generateCertificateHash(application);
    application.certificateIntegrity = integrity;

    await application.save();

    // Audit Log
    await logAudit({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'APPLICATION_APPROVED',
      targetRecordId: application.applicationNumber,
      details: {
        certificateNumber,
        certificateType: application.certificateType,
        applicant: application.applicant?._id || application.applicant,
        integrityAlgorithm: integrity.algorithm,
        integrityHash: integrity.dataHash,
      },
      ipAddress: req.ip,
    });

    // ────────────────────────────────────────────────────────
    // Generate PDF buffer for approved certificate attachment
    // ────────────────────────────────────────────────────────
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateCertificatePDFBuffer(application);
      console.log(`[Approval] Certificate PDF generated successfully for ${application.applicationNumber} (${certificateNumber}.pdf, ${pdfBuffer ? pdfBuffer.length : 0} bytes)`);
    } catch (pdfErr) {
      console.error(`[Approval PDF Buffer Error for ${application.applicationNumber}]:`, pdfErr.message);
      // PDF generation failure does NOT rollback the approval
    }

    // Exact requested diagnostic debug log
    console.log('[APPROVAL EMAIL DEBUG]', {
      applicationNumber: application.applicationNumber,
      certificateNumber: application.certificateNumber,
      status: application.status,
      pdfBufferExists: Buffer.isBuffer(pdfBuffer),
      pdfBufferSize: pdfBuffer?.length,
      pdfHeader: pdfBuffer?.subarray(0, 5).toString(),
    });

    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      console.error(`[APPROVAL EMAIL] PDF buffer missing - certificate attachment not sent for ${application.applicationNumber}`);
    } else {
      // ────────────────────────────────────────────────────────
      // Email Notification with approved certificate PDF attachment
      // (Safe, Non-blocking, Non-rolling-back)
      // ────────────────────────────────────────────────────────
      try {
        sendApprovalEmail(application, pdfBuffer)
          .then(async (emailResult) => {
            if (emailResult && emailResult.success) {
              try {
                await Application.updateOne(
                  { _id: application._id },
                  { $set: { approvalEmailSent: true } }
                );
              } catch (flagErr) {
                console.error('[Approval Email Flag Error]:', flagErr.message);
              }
            }
          })
          .catch((emailErr) => {
            console.error(`[EMAIL] Approval email failed for ${application.applicationNumber}:`, emailErr.message);
          });
      } catch (emailErr) {
        console.error(`[EMAIL] Approval email failed for ${application.applicationNumber}:`, emailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Application ${application.applicationNumber} approved successfully. Certificate Number: ${certificateNumber}`,
      application,
    });
  } catch (error) {
    console.error('[Approve Application Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error approving application',
    });
  }
};

// @desc    Reject Application with Reason
// @route   PUT /api/officer/applications/:id/reject
// @access  Private (Officer ONLY)
const rejectApplication = async (req, res) => {
  try {
    // SECURITY CHECK: Backend verification that role === officer
    if (req.user.role !== 'officer') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only designated municipal officers can reject applications.',
      });
    }

    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is mandatory when rejecting an application.',
      });
    }

    let application;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(id);
    } else {
      application = await Application.findOne({ applicationNumber: id });
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    application.status = 'REJECTED';
    application.rejectionReason = rejectionReason.trim();
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();

    await application.save();

    // Audit Log
    await logAudit({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'APPLICATION_REJECTED',
      targetRecordId: application.applicationNumber,
      details: {
        rejectionReason: application.rejectionReason,
        certificateType: application.certificateType,
      },
      ipAddress: req.ip,
    });

    // Email Notification (Safe & Non-blocking)
    try {
      sendRejectionEmail(application).catch((emailErr) => {
        console.error('[Rejection Email Error]:', emailErr.message);
      });
    } catch (emailErr) {
      console.error('[Rejection Email Sync Error]:', emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Application ${application.applicationNumber} has been rejected.`,
      application,
    });
  } catch (error) {
    console.error('[Reject Application Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error rejecting application',
    });
  }
};



// @desc    Reissue Certificate (Revoke old, create new)
// @route   PUT /api/officer/applications/:id/reissue
// @access  Private (Officer ONLY)
const reissueCertificate = async (req, res) => {
  try {
    // SECURITY CHECK: Backend verification that role === officer
    if (req.user.role !== 'officer') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only designated municipal officers can reissue certificates.',
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reissue reason is mandatory when reissuing a certificate.',
      });
    }

    let application;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(id).populate('applicant', 'name email mobile');
    } else {
      application = await Application.findOne({ applicationNumber: id }).populate('applicant', 'name email mobile');
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    if (application.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Only approved applications with an issued certificate can be reissued.',
      });
    }

    if (!application.certificateNumber) {
      return res.status(400).json({
        success: false,
        message: 'This application does not have an issued certificate to reissue.',
      });
    }

    // Duplicate reissue protection: If the certificate is already REVOKED, the officer
    // must be trying a duplicate request (e.g. page refresh)
    if (application.certificateStatus === 'REVOKED') {
      return res.status(409).json({
        success: false,
        message: `Certificate ${application.certificateNumber} is already revoked. A new certificate has already been issued for this application.`,
      });
    }

    // ────────────────────────────────────────────────────────
    // STEP 1: Record old certificate information
    // ────────────────────────────────────────────────────────
    const previousCertificateNumber = application.certificateNumber;
    const previousVersion = application.certificateVersion || 1;
    const now = new Date();

    // ────────────────────────────────────────────────────────
    // STEP 2: Generate new certificate number
    // ────────────────────────────────────────────────────────
    const newCertificateNumber = await generateCertificateNumber(application.certificateType);
    const newVersion = previousVersion + 1;
    const qrVerificationToken = Buffer.from(`${newCertificateNumber}:${application.applicationNumber}:${Date.now()}`).toString('base64');

    // ────────────────────────────────────────────────────────
    // STEP 3: Update application — revoke old, issue new
    // ────────────────────────────────────────────────────────
    application.certificateNumber = newCertificateNumber;
    application.certificateIssuedAt = now;
    application.certificateVersion = newVersion;
    application.certificateStatus = 'ACTIVE';
    application.qrVerificationToken = qrVerificationToken;
    application.reissueEmailSent = false; // Reset for new version

    // Push reissue history entry
    application.reissueHistory.push({
      previousCertificateNumber,
      previousVersion,
      revokedAt: now,
      reissuedAt: now,
      reason: reason.trim(),
      reissuedBy: req.user._id,
      newCertificateNumber,
      newVersion,
    });

    // ────────────────────────────────────────────────────────
    // STEP 4: Generate new SHA-256 integrity hash
    // ────────────────────────────────────────────────────────
    const integrity = generateCertificateHash(application);
    application.certificateIntegrity = integrity;

    // ────────────────────────────────────────────────────────
    // STEP 5: Save to database (authoritative operation)
    // ────────────────────────────────────────────────────────
    await application.save();

    // ────────────────────────────────────────────────────────
    // STEP 6: Audit Log
    // ────────────────────────────────────────────────────────
    await logAudit({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'CERTIFICATE_REISSUED',
      targetRecordId: application.applicationNumber,
      details: {
        previousCertificateNumber,
        previousVersion,
        newCertificateNumber,
        newVersion,
        reason: reason.trim(),
        certificateType: application.certificateType,
        integrityAlgorithm: integrity.algorithm,
      },
      ipAddress: req.ip,
    });

    // ────────────────────────────────────────────────────────
    // STEP 7: Generate PDF buffer for email attachment
    // ────────────────────────────────────────────────────────
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateCertificatePDFBuffer(application);
    } catch (pdfErr) {
      console.error('[Reissue PDF Buffer Error]:', pdfErr.message);
      // PDF generation failure does NOT block the reissue
    }

    // ────────────────────────────────────────────────────────
    // STEP 8: Send Reissue Email (Non-blocking, failure-safe)
    // ────────────────────────────────────────────────────────
    const reissueInfo = {
      previousCertificateNumber,
      previousVersion,
      reason: reason.trim(),
      newCertificateNumber,
      newVersion,
    };

    try {
      sendReissueEmail(application, reissueInfo, pdfBuffer)
        .then(async (emailResult) => {
          if (emailResult && emailResult.success) {
            // Mark email as sent to prevent duplicate emails
            try {
              await Application.updateOne(
                { _id: application._id, certificateVersion: newVersion },
                { $set: { reissueEmailSent: true } }
              );
            } catch (flagErr) {
              console.error('[Reissue Email Flag Error]:', flagErr.message);
            }
          }
        })
        .catch((emailErr) => {
          console.error('[Reissue Email Error]:', emailErr.message);
        });
    } catch (emailErr) {
      console.error('[Reissue Email Sync Error]:', emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Certificate reissued successfully. Previous: ${previousCertificateNumber} (REVOKED) → New: ${newCertificateNumber} (ACTIVE, Version ${newVersion})`,
      application: {
        applicationNumber: application.applicationNumber,
        certificateType: application.certificateType,
        previousCertificate: {
          certificateNumber: previousCertificateNumber,
          version: previousVersion,
          status: 'REVOKED',
        },
        newCertificate: {
          certificateNumber: newCertificateNumber,
          version: newVersion,
          status: 'ACTIVE',
          issuedAt: now,
        },
        reason: reason.trim(),
      },
    });
  } catch (error) {
    console.error('[Reissue Certificate Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error reissuing certificate',
    });
  }
};

// @desc    Request Application Correction from Citizen
// @route   PUT /api/officer/applications/:id/request-correction
// @access  Private (Officer ONLY)
const requestCorrection = async (req, res) => {
  try {
    // SECURITY CHECK: Backend verification that role === officer
    if (req.user.role !== 'officer') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only designated municipal officers can request application corrections.',
      });
    }

    const { id } = req.params;
    const { reason, items } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Correction reason is mandatory when requesting a correction.',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one specific correction item (field or document) must be requested.',
      });
    }

    // Validate each correction item
    const formattedItems = [];
    for (const item of items) {
      if (!item.field || !item.label) {
        return res.status(400).json({
          success: false,
          message: 'Each correction item must specify a field identifier and human-readable label.',
        });
      }
      formattedItems.push({
        type: item.type === 'DOCUMENT' ? 'DOCUMENT' : 'FIELD',
        field: String(item.field).trim(),
        label: String(item.label).trim(),
        instruction: item.instruction ? String(item.instruction).trim() : '',
      });
    }

    let application;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(id).populate('applicant', 'name email mobile');
    } else {
      application = await Application.findOne({ applicationNumber: id }).populate('applicant', 'name email mobile');
    }

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    if (application.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot request corrections for an already approved application. Use certificate reissue/revocation if the issued certificate requires modification.',
      });
    }

    if (application.status === 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot request corrections for a rejected application. The citizen must submit a fresh application.',
      });
    }

    const now = new Date();
    const requestId = `CORR-${Date.now()}`;

    // Update application state
    application.status = 'CORRECTION_REQUIRED';
    application.correctionRequest = {
      requested: true,
      reason: reason.trim(),
      items: formattedItems,
      requestedBy: req.user._id,
      requestedAt: now,
    };

    // Push into correction history
    application.correctionHistory.push({
      requestId,
      requestedAt: now,
      requestedBy: req.user._id,
      reason: reason.trim(),
      items: formattedItems,
    });

    await application.save();

    // Audit Log
    await logAudit({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'CORRECTION_REQUESTED',
      targetRecordId: application.applicationNumber,
      details: {
        applicationNumber: application.applicationNumber,
        reason: reason.trim(),
        itemsCount: formattedItems.length,
        items: formattedItems.map((i) => `${i.label} (${i.type})`),
        certificateType: application.certificateType,
      },
      ipAddress: req.ip,
    });

    // Email Notification (Safe & Non-blocking)
    try {
      sendCorrectionRequiredEmail(application, application.correctionRequest).catch((emailErr) => {
        console.error('[Correction Required Email Error]:', emailErr.message);
      });
    } catch (emailErr) {
      console.error('[Correction Required Email Sync Error]:', emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Correction request submitted for application ${application.applicationNumber}. The citizen has been notified.`,
      application,
    });
  } catch (error) {
    console.error('[Request Correction Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error requesting application correction',
    });
  }
};

module.exports = {
  getOfficerApplications,
  getOfficerApplicationDetails,
  approveApplication,
  rejectApplication,
  reissueCertificate,
  requestCorrection,
};
