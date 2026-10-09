const path = require('path');
const fs = require('fs');
const Application = require('../models/Application');
const { generateApplicationNumber } = require('../utils/appNumberGenerator');
const detectDuplicates = require('../utils/duplicateDetector');
const { runSmartVerification } = require('../utils/smartVerification');
const logAudit = require('../utils/auditLogger');
const { sendSubmissionEmail, sendResubmissionConfirmationEmail, sendEscalationEmail } = require('../utils/emailService');
const { calculateSlaDeadline } = require('../utils/slaHelper');

// @desc    Submit a new Certificate Application (Birth / Death)
// @route   POST /api/applications
// @access  Private (Citizen)
const createApplication = async (req, res) => {
  try {
    const { certificateType } = req.body;

    if (!certificateType || !['BIRTH', 'DEATH'].includes(certificateType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid certificate type. Must be either BIRTH or DEATH.',
      });
    }

    // Parse JSON payloads (sent either as string in multipart form or object)
    let applicantDetails = req.body.applicantDetails;
    let certificateDetails = req.body.certificateDetails;

    if (typeof applicantDetails === 'string') {
      try {
        applicantDetails = JSON.parse(applicantDetails);
      } catch (e) {
        applicantDetails = {};
      }
    }

    if (typeof certificateDetails === 'string') {
      try {
        certificateDetails = JSON.parse(certificateDetails);
      } catch (e) {
        certificateDetails = {};
      }
    }

    // Fallback to authenticated citizen details if not explicitly provided
    applicantDetails = {
      name: applicantDetails?.name || req.user.name,
      email: applicantDetails?.email || req.user.email,
      mobile: applicantDetails?.mobile || req.user.mobile,
      address: applicantDetails?.address || req.user.address,
      city: applicantDetails?.city || req.user.city,
      state: applicantDetails?.state || req.user.state,
      pincode: applicantDetails?.pincode || req.user.pincode,
    };

    // Validate declaration
    if (!certificateDetails.declarationAccepted) {
      return res.status(400).json({
        success: false,
        message: 'You must confirm and accept the legal declaration before submitting.',
      });
    }

    // Process Uploaded Files from Multer
    const documents = [];
    if (req.files) {
      // req.files can be an array or an object (if fields() was used)
      const fileList = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

      for (const file of fileList) {
        documents.push({
          documentType: file.fieldname || 'Supporting Document',
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        });
      }
    }

    // Ensure at least 1 supporting document is provided
    if (documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload the required supporting documents (Hospital record, ID proof, Address proof).',
      });
    }

    // Check for Duplicates
    const duplicateCheck = await detectDuplicates(certificateType.toUpperCase(), certificateDetails);

    // Generate atomic, concurrency-safe application number
    const applicationNumber = await generateApplicationNumber(certificateType.toUpperCase());

    // Compute SLA Deadline: Standard 48-hour municipal turnaround SLA (excluding Government holidays)
    const slaDeadline = calculateSlaDeadline(new Date(), 48);

    // Run Smart Verification & Risk Analysis
    const smartVerification = await runSmartVerification({
      applicationNumber,
      certificateType: certificateType.toUpperCase(),
      applicantDetails,
      certificateDetails,
      documents,
    });

    // Create Application in MongoDB
    const application = await Application.create({
      applicationNumber,
      applicant: req.user._id,
      certificateType: certificateType.toUpperCase(),
      applicantDetails,
      certificateDetails,
      documents,
      status: 'PENDING',
      submittedAt: new Date(),
      slaDeadline,
      duplicateSuspect: duplicateCheck,
      smartVerification,
    });

    // Audit Log
    await logAudit({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'APPLICATION_SUBMITTED',
      targetRecordId: applicationNumber,
      details: {
        certificateType: application.certificateType,
        documentsCount: documents.length,
        isDuplicateSuspect: duplicateCheck.isSuspect,
      },
      ipAddress: req.ip,
    });

    // Audit Log — Smart Verification Result
    if (smartVerification && smartVerification.checks && smartVerification.checks.length > 0) {
      await logAudit({
        user: req.user._id,
        userName: req.user.name,
        role: req.user.role,
        action: 'SMART_VERIFICATION_COMPLETED',
        targetRecordId: applicationNumber,
        details: {
          certificateType: application.certificateType,
          overallRisk: smartVerification.overallRisk,
          requiresAttention: smartVerification.requiresAttention,
          flagsCount: smartVerification.flagsCount,
        },
        ipAddress: req.ip,
      });
    }

    // Email Notification (Safe & Non-blocking)
    try {
      sendSubmissionEmail(application).catch((emailErr) => {
        console.error('[Application Submission Email Error]:', emailErr.message);
      });
    } catch (emailErr) {
      console.error('[Application Submission Email Sync Error]:', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `${certificateType.toUpperCase()} Certificate Application submitted successfully.`,
      application,
    });
  } catch (error) {
    console.error('[Create Application Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during application submission',
    });
  }
};

// @desc    Get all applications belonging to authenticated Citizen
// @route   GET /api/applications/my
// @access  Private (Citizen)
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id })
      .sort({ submittedAt: -1 })
      .select('-__v -smartVerification');

    // Aggregate summary statistics for citizen dashboard
    const summary = {
      total: applications.length,
      pending: applications.filter((a) => a.status === 'PENDING' || a.status === 'UNDER_REVIEW').length,
      approved: applications.filter((a) => a.status === 'APPROVED').length,
      rejected: applications.filter((a) => a.status === 'REJECTED').length,
    };

    return res.status(200).json({
      success: true,
      summary,
      applications,
    });
  } catch (error) {
    console.error('[Get My Applications Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching applications',
    });
  }
};

// @desc    Get Application Details by ID or Application Number
// @route   GET /api/applications/:id
// @access  Private (Owner Citizen, Officer, Admin)
const getApplicationById = async (req, res) => {
  try {
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

    // Security check: Only the applicant citizen, an officer, or an admin can access
    const isOwner = application.applicant._id.toString() === req.user._id.toString();
    const isStaff = ['officer', 'admin'].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You do not have permission to view this application.',
      });
    }

    // Strip internal verification data for citizen users
    const appData = application.toObject();
    if (!isStaff) {
      delete appData.smartVerification;
    }

    return res.status(200).json({
      success: true,
      application: appData,
    });
  } catch (error) {
    console.error('[Get Application Details Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching application details',
    });
  }
};

// @desc    Securely view/download an uploaded document
// @route   GET /api/applications/:id/documents/:documentId
// @access  Private (Owner Citizen, Officer, Admin)
const getApplicationDocument = async (req, res) => {
  try {
    const { id, documentId } = req.params;

    let application;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(id);
    } else {
      application = await Application.findOne({ applicationNumber: id });
    }

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Security check
    const isOwner = application.applicant.toString() === req.user._id.toString();
    const isStaff = ['officer', 'admin'].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You do not have permission to access this document.',
      });
    }

    const doc = application.documents.id(documentId) || application.documents.find((d) => d.fileName === documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const filePath = doc.filePath || path.join(__dirname, '../uploads', doc.fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Document file not found on storage server.' });
    }

    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName || doc.fileName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('[Document Stream Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error retrieving document',
    });
  }
};

// @desc    Public Track Application Endpoint
// @route   GET /api/applications/track/:applicationNumber
// @access  Public
const trackApplicationPublic = async (req, res) => {
  try {
    const rawNumber = req.params.applicationNumber || req.query.applicationNumber || req.query.q;

    if (!rawNumber || !String(rawNumber).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid application number.',
      });
    }

    const query = String(rawNumber).trim();
    // Escape regex special chars
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const application = await Application.findOne({
      $or: [
        { applicationNumber: { $regex: new RegExp(`^${escapedQuery}$`, 'i') } },
        { certificateNumber: { $regex: new RegExp(`^${escapedQuery}$`, 'i') } },
      ],
    }).select(
      'applicationNumber certificateType status submittedAt reviewedAt rejectionReason certificateNumber certificateIssuedAt slaDeadline isEscalated escalatedAt documents.documentType certificateDetails.childName certificateDetails.deceasedName correctionRequest correctionHistory'
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: `No application found with number "${query}". Please check the application number and try again.`,
      });
    }

    const isBirth = application.certificateType === 'BIRTH';
    const beneficiaryName = isBirth
      ? application.certificateDetails?.childName
      : application.certificateDetails?.deceasedName;

    const documentsCount = application.documents ? application.documents.length : 0;

    return res.status(200).json({
      success: true,
      application: {
        _id: application._id,
        applicationNumber: application.applicationNumber,
        certificateType: application.certificateType,
        status: application.status,
        submittedAt: application.submittedAt,
        reviewedAt: application.reviewedAt,
        rejectionReason: application.rejectionReason,
        certificateNumber: application.certificateNumber,
        certificateIssuedAt: application.certificateIssuedAt,
        slaDeadline: application.slaDeadline,
        isEscalated: application.isEscalated || false,
        escalatedAt: application.escalatedAt,
        beneficiaryName,
        documentsCount,
        correctionRequest: application.correctionRequest,
        correctionHistory: application.correctionHistory,
      },
    });
  } catch (error) {
    console.error('[Public Track Application Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error tracking application',
    });
  }
};

// @desc    Resubmit Corrected Application (Citizen Only)
// @route   PUT /api/applications/:id/resubmit
// @access  Private (Owner Citizen)
const resubmitCorrection = async (req, res) => {
  // Helper to remove any uploaded files on validation failure
  const cleanupUploadedFiles = (files) => {
    if (!files) return;
    const list = Array.isArray(files) ? files : Object.values(files).flat();
    for (const f of list) {
      if (f.path && fs.existsSync(f.path)) {
        try {
          fs.unlinkSync(f.path);
        } catch (e) {
          console.error('[File Cleanup Error]:', e.message);
        }
      }
    }
  };

  try {
    const { id } = req.params;

    let application;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(id).populate('applicant', 'name email mobile');
    } else {
      application = await Application.findOne({ applicationNumber: id }).populate('applicant', 'name email mobile');
    }

    if (!application) {
      cleanupUploadedFiles(req.files);
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    // Security Check: Only the citizen owner can resubmit
    const applicantId = application.applicant._id ? application.applicant._id.toString() : application.applicant.toString();
    if (applicantId !== req.user._id.toString()) {
      cleanupUploadedFiles(req.files);
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You do not have permission to modify this application.',
      });
    }

    // Status Check: Must be CORRECTION_REQUIRED
    if (application.status !== 'CORRECTION_REQUIRED') {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: `Application cannot be resubmitted because its current status is ${application.status}. Only applications in CORRECTION_REQUIRED status can be resubmitted.`,
      });
    }

    if (!application.correctionRequest || !application.correctionRequest.requested) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({
        success: false,
        message: 'No active correction request found for this application.',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // BACKEND RESTRICTION ENFORCEMENT
    // ─────────────────────────────────────────────────────────────
    const correctionItems = application.correctionRequest.items || [];
    const allowedFieldKeys = correctionItems.filter((i) => i.type === 'FIELD').map((i) => i.field);
    const allowedDocTypes = correctionItems.filter((i) => i.type === 'DOCUMENT').map((i) => i.field);

    // Parse incoming payload
    let incomingCertDetails = req.body.certificateDetails;
    let incomingApplicantDetails = req.body.applicantDetails;

    if (typeof incomingCertDetails === 'string') {
      try {
        incomingCertDetails = JSON.parse(incomingCertDetails);
      } catch (e) {
        incomingCertDetails = {};
      }
    }

    if (typeof incomingApplicantDetails === 'string') {
      try {
        incomingApplicantDetails = JSON.parse(incomingApplicantDetails);
      } catch (e) {
        incomingApplicantDetails = {};
      }
    }

    const currentCertDetails = application.certificateDetails || {};
    const currentApplicantDetails = application.applicantDetails || {};
    const changedFields = {};

    // Validate certificateDetails modifications
    if (incomingCertDetails && typeof incomingCertDetails === 'object') {
      for (const [key, newVal] of Object.entries(incomingCertDetails)) {
        const oldVal = currentCertDetails[key];
        // Check if value changed
        const isModified = String(newVal || '').trim() !== String(oldVal || '').trim();
        if (isModified) {
          if (!allowedFieldKeys.includes(key)) {
            cleanupUploadedFiles(req.files);
            return res.status(400).json({
              success: false,
              message: `Unauthorized modification: Field "${key}" was not requested for correction by the officer.`,
            });
          }
          changedFields[`certificateDetails.${key}`] = { old: oldVal, new: newVal };
        }
      }
    }

    // Validate applicantDetails modifications
    if (incomingApplicantDetails && typeof incomingApplicantDetails === 'object') {
      for (const [key, newVal] of Object.entries(incomingApplicantDetails)) {
        const oldVal = currentApplicantDetails[key];
        const isModified = String(newVal || '').trim() !== String(oldVal || '').trim();
        if (isModified) {
          if (!allowedFieldKeys.includes(key) && !allowedFieldKeys.includes(`applicant.${key}`)) {
            cleanupUploadedFiles(req.files);
            return res.status(400).json({
              success: false,
              message: `Unauthorized modification: Applicant field "${key}" was not requested for correction.`,
            });
          }
          changedFields[`applicantDetails.${key}`] = { old: oldVal, new: newVal };
        }
      }
    }

    // Validate uploaded replacement files
    const fileList = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [];
    for (const file of fileList) {
      if (!allowedDocTypes.includes(file.fieldname)) {
        cleanupUploadedFiles(req.files);
        return res.status(400).json({
          success: false,
          message: `Unauthorized document upload: Document "${file.fieldname}" was not requested for correction by the officer.`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // APPLY PERMITTED MODIFICATIONS
    // ─────────────────────────────────────────────────────────────
    if (incomingCertDetails && typeof incomingCertDetails === 'object') {
      for (const field of allowedFieldKeys) {
        if (incomingCertDetails[field] !== undefined) {
          application.certificateDetails[field] = incomingCertDetails[field];
        }
      }
      application.markModified('certificateDetails');
    }

    if (incomingApplicantDetails && typeof incomingApplicantDetails === 'object') {
      for (const field of allowedFieldKeys) {
        if (incomingApplicantDetails[field] !== undefined) {
          application.applicantDetails[field] = incomingApplicantDetails[field];
        }
      }
      application.markModified('applicantDetails');
    }

    // Process replacement files
    const replacedDocuments = [];
    for (const file of fileList) {
      const existingDoc = application.documents.find((d) => d.documentType === file.fieldname);
      if (existingDoc) {
        replacedDocuments.push({
          documentType: file.fieldname,
          oldFileName: existingDoc.fileName,
          newFileName: file.filename,
          newOriginalName: file.originalname,
          replacedAt: new Date(),
        });
        existingDoc.fileName = file.filename;
        existingDoc.originalName = file.originalname;
        existingDoc.filePath = file.path;
        existingDoc.mimeType = file.mimetype;
        existingDoc.size = file.size;
        existingDoc.uploadedAt = new Date();
      } else {
        replacedDocuments.push({
          documentType: file.fieldname,
          oldFileName: 'None (Newly Added)',
          newFileName: file.filename,
          newOriginalName: file.originalname,
          replacedAt: new Date(),
        });
        application.documents.push({
          documentType: file.fieldname,
          fileName: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date(),
        });
      }
    }

    // Update correction history entry
    const now = new Date();
    if (application.correctionHistory && application.correctionHistory.length > 0) {
      const lastHistoryEntry = application.correctionHistory[application.correctionHistory.length - 1];
      lastHistoryEntry.resubmittedAt = now;
      lastHistoryEntry.resubmittedBy = req.user._id;
      lastHistoryEntry.changedFields = changedFields;
      lastHistoryEntry.replacedDocuments = replacedDocuments;
    }

    // Reset active correction request
    application.correctionRequest.requested = false;

    // Transition status to RESUBMITTED
    application.status = 'RESUBMITTED';

    // Re-run Smart Verification & Risk Analysis with updated data and documents
    const smartVerification = await runSmartVerification(application);
    application.smartVerification = smartVerification;

    await application.save();

    // Audit Log
    await logAudit({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'CORRECTION_RESUBMITTED',
      targetRecordId: application.applicationNumber,
      details: {
        applicationNumber: application.applicationNumber,
        changedFieldsCount: Object.keys(changedFields).length,
        replacedDocumentsCount: replacedDocuments.length,
        smartVerificationRisk: smartVerification.overallRisk,
      },
      ipAddress: req.ip,
    });

    // Email Notification (Safe & Non-blocking)
    try {
      sendResubmissionConfirmationEmail(application).catch((emailErr) => {
        console.error('[Resubmission Confirmation Email Error]:', emailErr.message);
      });
    } catch (emailErr) {
      console.error('[Resubmission Confirmation Email Sync Error]:', emailErr.message);
    }

    const appData = application.toObject();
    if (req.user.role === 'citizen') {
      delete appData.smartVerification;
    }

    return res.status(200).json({
      success: true,
      message: `Application ${application.applicationNumber} has been successfully corrected and resubmitted for officer review.`,
      application: appData,
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);
    console.error('[Resubmit Correction Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error resubmitting corrected application',
    });
  }
};

// @desc    Citizen raises an escalation / complaint on their OWN overdue application
// @route   POST /api/applications/:id/escalate
// @access  Private (Citizen ONLY — must own the application)
const citizenEscalateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body || {};
    const now = new Date();

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A reason is required to raise an escalation.',
      });
    }

    // Find application
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

    // IDOR check — citizen must own the application
    if (application.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorised to escalate this application.',
      });
    }

    // Only active (PENDING / UNDER_REVIEW) applications can be escalated
    if (!['PENDING', 'UNDER_REVIEW'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only active (pending or under review) applications can be escalated.',
      });
    }

    // Application must actually be SLA overdue
    if (!application.slaDeadline || new Date(application.slaDeadline) >= now) {
      return res.status(400).json({
        success: false,
        message: 'Your application is still within the SLA window and cannot be escalated yet.',
      });
    }

    // Prevent duplicate escalation
    if (application.isEscalated) {
      return res.status(400).json({
        success: false,
        message: 'An escalation has already been raised for this application.',
      });
    }

    // Set escalation fields
    application.isEscalated = true;
    application.escalatedAt = now;
    application.escalationReason = reason.trim();
    application.escalationDescription = description ? description.trim() : '';
    application.escalationStatus = 'PENDING';
    await application.save();

    // Audit log
    await logAudit({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'CITIZEN_ESCALATION_RAISED',
      targetRecordId: application.applicationNumber,
      details: {
        applicationNumber: application.applicationNumber,
        status: application.status,
        slaDeadline: application.slaDeadline,
        reason: application.escalationReason,
        description: application.escalationDescription,
      },
      ipAddress: req.ip,
    });

    // Email admin (fire-and-forget — do NOT roll back if email fails)
    try {
      sendEscalationEmail(application).catch((emailErr) => {
        console.error('[Citizen Escalation Email Error]:', emailErr.message);
      });
      application.escalationNotified = true;
      await application.save();
    } catch (emailErr) {
      console.error('[Citizen Escalation Email Sync Error]:', emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Escalation raised for application ${application.applicationNumber}. The administration has been notified.`,
      application,
    });
  } catch (error) {
    console.error('[Citizen Escalate Application Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error raising escalation',
    });
  }
};

module.exports = {
  createApplication,
  getMyApplications,
  getApplicationById,
  getApplicationDocument,
  trackApplicationPublic,
  resubmitCorrection,
  citizenEscalateApplication,
};
