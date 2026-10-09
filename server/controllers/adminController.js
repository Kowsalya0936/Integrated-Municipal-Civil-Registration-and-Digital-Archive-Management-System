const User = require('../models/User');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
const logAudit = require('../utils/auditLogger');
const {
  buildSlaOverdueFilter,
  buildEscalatedQuery,
} = require('../utils/slaHelper');

// @desc    Get Comprehensive Real Admin Dashboard Statistics
// @route   GET /api/admin/stats
// @access  Private (Admin ONLY)
const getAdminStats = async (req, res) => {
  try {
    const now = new Date();

    const [
      totalCitizens,
      totalOfficers,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      birthCount,
      deathCount,
      recentApplications,
    ] = await Promise.all([
      User.countDocuments({ role: 'citizen' }),
      User.countDocuments({ role: 'officer' }),
      Application.countDocuments(),
      Application.countDocuments({ status: { $in: ['PENDING', 'UNDER_REVIEW'] } }),
      Application.countDocuments({ status: 'APPROVED' }),
      Application.countDocuments({ status: 'REJECTED' }),
      Application.countDocuments({ certificateType: 'BIRTH' }),
      Application.countDocuments({ certificateType: 'DEATH' }),
      Application.find().sort({ submittedAt: -1 }).limit(6).populate('applicant', 'name email'),
    ]);

    // SLA Overdue & Escalated counts using shared helpers
    const [overdueCount, escalatedCount] = await Promise.all([
      Application.countDocuments(buildSlaOverdueFilter(now)),
      Application.countDocuments(buildEscalatedQuery(now)),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalCitizens,
        totalOfficers,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        birthCount,
        deathCount,
        overdueCount,
        escalatedCount,
      },
      recentApplications,
    });
  } catch (error) {
    console.error('[Admin Stats Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error calculating administrative statistics',
    });
  }
};

// @desc    Get All Users (Citizens, Officers, Admins) with Filtering
// @route   GET /api/admin/users
// @access  Private (Admin ONLY)
const getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const filter = {};

    if (role && role !== 'ALL') {
      filter.role = role.toLowerCase();
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { mobile: { $regex: search.trim(), $options: 'i' } },
        { city: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('[Admin Get Users Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching users',
    });
  }
};

// @desc    Create a new Municipal Officer Account (Admin Only)
// @route   POST /api/admin/officers
// @access  Private (Admin ONLY)
const createOfficer = async (req, res) => {
  try {
    const { name, email, mobile, password, address, city, state, pincode, department } = req.body;

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, mobile, and password are required for creating an officer account.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Officer password must be at least 8 characters long.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    const officer = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      password,
      address: (address || 'Municipal Corporation Office').trim(),
      city: (city || 'Municipal District').trim(),
      state: (state || 'State').trim(),
      pincode: (pincode || '000000').trim(),
      role: 'officer',
      department: department || 'Civil Registration & Verification Desk',
    });

    await logAudit({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'OFFICER_CREATED',
      targetRecordId: officer._id.toString(),
      details: { officerName: officer.name, officerEmail: officer.email },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `Municipal Officer '${officer.name}' created successfully.`,
      officer: officer.toSafeObject(),
    });
  } catch (error) {
    console.error('[Admin Create Officer Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating officer account',
    });
  }
};

// @desc    Toggle user active/inactive status
// @route   PUT /api/admin/users/:id/toggle-status
// @access  Private (Admin ONLY)
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin' && user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own admin account.' });
    }

    user.isActive = !user.isActive;
    await user.save();

    await logAudit({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      targetRecordId: user._id.toString(),
      details: { targetEmail: user.email, newStatus: user.isActive },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `User status changed to ${user.isActive ? 'Active' : 'Deactivated'}.`,
      user: user.toSafeObject(),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get System Audit Logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin ONLY)
const getAuditLogs = async (req, res) => {
  try {
    const { action, limit = 50 } = req.query;
    const filter = {};
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Digital Archive Search: Advanced multi-filter query with pagination
// @route   GET /api/admin/archive
// @access  Private (Officer & Admin)
// Query params:
//   search, applicationNumber, certificateNumber, applicantName, email,
//   hospital, certificateType, status, escalated, sla,
//   dateFrom, dateTo, year, page, limit
const getArchiveRecords = async (req, res) => {
  try {
    const {
      search,
      applicationNumber,
      certificateNumber,
      applicantName,
      email,
      hospital,
      certificateType,
      status,
      escalated,
      sla,
      dateFrom,
      dateTo,
      year,
      page,
      limit,
    } = req.query;

    const now = new Date();
    const filter = {};

    // ── Status / Escalation filter ─────────────────────────────────────────
    // Escalated supersedes ordinary status filter (escalation ≠ status)
    if (escalated === 'true' || (status && status.toUpperCase() === 'ESCALATED')) {
      const escalatedFilter = buildEscalatedQuery(now);
      filter.isEscalated = escalatedFilter.isEscalated;
      filter.status = escalatedFilter.status;
      filter.slaDeadline = escalatedFilter.slaDeadline;
    } else if (status) {
      const upperStatus = status.toUpperCase();
      if (upperStatus === 'PENDING') {
        filter.status = { $in: ['PENDING', 'UNDER_REVIEW'] };
      } else if (upperStatus === 'APPROVED') {
        filter.status = 'APPROVED';
      } else if (upperStatus === 'REJECTED') {
        filter.status = 'REJECTED';
      } else if (upperStatus === 'UNDER_REVIEW') {
        filter.status = 'UNDER_REVIEW';
      } else if (upperStatus === 'CORRECTION_REQUIRED') {
        filter.status = 'CORRECTION_REQUIRED';
      } else if (upperStatus === 'RESUBMITTED') {
        filter.status = 'RESUBMITTED';
      }
      // upperStatus === 'ALL' → no status filter
    }

    // ── Escalation-only filter (when status is not already set above) ──────
    if (escalated === 'false' && !filter.isEscalated) {
      filter.isEscalated = { $ne: true };
    }

    // ── SLA filter (reuses shared buildSlaOverdueFilter — not duplicated) ──
    if (sla && sla.toLowerCase() === 'overdue') {
      const slaFilter = buildSlaOverdueFilter(now);
      // Merge with any existing status constraint
      if (!filter.status) {
        filter.status = slaFilter.status;
      }
      filter.slaDeadline = slaFilter.slaDeadline;
    } else if (sla && sla.toLowerCase() === 'within') {
      // Within SLA = unresolved but NOT yet overdue
      filter.status = filter.status || { $in: ['PENDING', 'UNDER_REVIEW'] };
      filter.slaDeadline = { $exists: true, $ne: null, $gte: now };
    }

    // ── Certificate type ───────────────────────────────────────────────────
    if (certificateType && certificateType !== 'ALL') {
      filter.certificateType = certificateType.toUpperCase();
    }

    // ── Specific field filters (exact / partial) ───────────────────────────
    if (applicationNumber && applicationNumber.trim()) {
      filter.applicationNumber = { $regex: applicationNumber.trim(), $options: 'i' };
    }

    if (certificateNumber && certificateNumber.trim()) {
      filter.certificateNumber = { $regex: certificateNumber.trim(), $options: 'i' };
    }

    if (applicantName && applicantName.trim()) {
      filter['applicantDetails.name'] = { $regex: applicantName.trim(), $options: 'i' };
    }

    if (email && email.trim()) {
      filter['applicantDetails.email'] = { $regex: email.trim(), $options: 'i' };
    }

    if (hospital && hospital.trim()) {
      filter['certificateDetails.hospitalName'] = { $regex: hospital.trim(), $options: 'i' };
    }

    // ── Date range on submittedAt ──────────────────────────────────────────
    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!isNaN(from)) {
          from.setHours(0, 0, 0, 0);
          dateFilter.$gte = from;
        }
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (!isNaN(to)) {
          to.setHours(23, 59, 59, 999);
          dateFilter.$lte = to;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.submittedAt = dateFilter;
      }
    }

    // ── Legacy year filter (certificateIssuedAt) — preserved ──────────────
    if (year && !dateFrom && !dateTo) {
      const startYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endYear = new Date(`${year}-12-31T23:59:59.999Z`);
      filter.certificateIssuedAt = { $gte: startYear, $lte: endYear };
    }

    // ── General free-text search (OR across key fields) ───────────────────
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { certificateNumber: searchRegex },
        { applicationNumber: searchRegex },
        { 'applicantDetails.name': searchRegex },
        { 'applicantDetails.email': searchRegex },
        { 'certificateDetails.childName': searchRegex },
        { 'certificateDetails.deceasedName': searchRegex },
        { 'certificateDetails.hospitalName': searchRegex },
      ];
    }

    // ── Pagination ─────────────────────────────────────────────────────────
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (currentPage - 1) * pageLimit;

    const [totalRecords, archiveRecords] = await Promise.all([
      Application.countDocuments(filter),
      Application.find(filter)
        .populate('applicant', 'name email mobile')
        .populate('reviewedBy', 'name email')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(pageLimit),
    ]);

    const totalPages = Math.ceil(totalRecords / pageLimit);

    return res.status(200).json({
      success: true,
      count: archiveRecords.length,
      totalRecords,
      totalPages,
      currentPage,
      limit: pageLimit,
      archiveRecords,
    });
  } catch (error) {
    console.error('[Archive Search Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Comprehensive Reports & Analytics Data
// @route   GET /api/admin/reports
// @access  Private (Admin ONLY)
const getAdminReports = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const now = new Date();
    const filter = {};

    // ── Date range filter on submittedAt ──────────────────────────────────
    if (dateFrom || dateTo) {
      filter.submittedAt = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!isNaN(from)) {
          from.setHours(0, 0, 0, 0);
          filter.submittedAt.$gte = from;
        }
      }
      if (dateTo) {
        const to = new Date(dateTo);
        if (!isNaN(to)) {
          to.setHours(23, 59, 59, 999);
          filter.submittedAt.$lte = to;
        }
      }
      if (Object.keys(filter.submittedAt).length === 0) {
        delete filter.submittedAt;
      }
    }

    // ── SLA & Escalation queries using shared slaHelper ───────────────────
    const slaOverdueBase = buildSlaOverdueFilter(now);
    const escalatedBase = buildEscalatedQuery(now);

    const slaOverdueFilter = {
      ...filter,
      status: slaOverdueBase.status,
      slaDeadline: slaOverdueBase.slaDeadline,
    };

    const slaWithinFilter = {
      ...filter,
      status: { $in: ['PENDING', 'UNDER_REVIEW'] },
      slaDeadline: { $exists: true, $ne: null, $gte: now },
    };

    const escalatedFilter = {
      ...filter,
      isEscalated: escalatedBase.isEscalated,
      status: escalatedBase.status,
      slaDeadline: escalatedBase.slaDeadline,
    };

    // ── Summary & Counts via parallel queries ─────────────────────────────
    const [
      totalApplications,
      pendingCount,
      underReviewCount,
      approvedCount,
      rejectedCount,
      birthCount,
      deathCount,
      overdueCount,
      withinSlaCount,
      escalatedCount,
    ] = await Promise.all([
      Application.countDocuments(filter),
      Application.countDocuments({ ...filter, status: 'PENDING' }),
      Application.countDocuments({ ...filter, status: 'UNDER_REVIEW' }),
      Application.countDocuments({ ...filter, status: 'APPROVED' }),
      Application.countDocuments({ ...filter, status: 'REJECTED' }),
      Application.countDocuments({ ...filter, certificateType: 'BIRTH' }),
      Application.countDocuments({ ...filter, certificateType: 'DEATH' }),
      Application.countDocuments(slaOverdueFilter),
      Application.countDocuments(slaWithinFilter),
      Application.countDocuments(escalatedFilter),
    ]);

    // ── Monthly Submission Trend Aggregation ──────────────────────────────
    const monthlyTrendRaw = await Application.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$submittedAt' },
            month: { $month: '$submittedAt' },
          },
          count: { $sum: 1 },
          birthCount: {
            $sum: { $cond: [{ $eq: ['$certificateType', 'BIRTH'] }, 1, 0] },
          },
          deathCount: {
            $sum: { $cond: [{ $eq: ['$certificateType', 'DEATH'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = monthlyTrendRaw.map((item) => {
      const y = item._id.year;
      const m = item._id.month;
      const monthStr = m < 10 ? `0${m}` : `${m}`;
      return {
        period: `${y}-${monthStr}`,
        label: `${monthNames[m - 1] || m} ${y}`,
        total: item.count,
        birthCount: item.birthCount,
        deathCount: item.deathCount,
      };
    });

    // ── Processing Performance Calculation ────────────────────────────────
    const processingAgg = await Application.aggregate([
      {
        $match: {
          ...filter,
          status: { $in: ['APPROVED', 'REJECTED'] },
          reviewedAt: { $exists: true, $ne: null },
          submittedAt: { $exists: true, $ne: null },
        },
      },
      {
        $project: {
          processingHours: {
            $divide: [{ $subtract: ['$reviewedAt', '$submittedAt'] }, 1000 * 60 * 60],
          },
        },
      },
      {
        $group: {
          _id: null,
          completedCount: { $sum: 1 },
          avgHours: { $avg: '$processingHours' },
          minHours: { $min: '$processingHours' },
          maxHours: { $max: '$processingHours' },
        },
      },
    ]);

    const completedWithTimestamps = processingAgg.length > 0 ? processingAgg[0].completedCount : 0;
    const avgHours = processingAgg.length > 0 ? processingAgg[0].avgHours : 0;
    const avgProcessingHours = Number(avgHours.toFixed(1));
    const avgProcessingDays = Number((avgHours / 24).toFixed(1));
    const totalCompletedApplications = approvedCount + rejectedCount;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalApplications,
          pendingCount,
          underReviewCount,
          approvedCount,
          rejectedCount,
        },
        registrationTypes: {
          birthCount,
          deathCount,
        },
        slaPerformance: {
          withinSlaCount,
          overdueCount,
          escalatedCount,
        },
        processingPerformance: {
          totalCompletedApplications,
          completedWithTimestamps,
          avgProcessingHours,
          avgProcessingDays,
          hasData: completedWithTimestamps > 0,
        },
        monthlyTrend,
        statusDistribution: [
          { status: 'APPROVED', label: 'Approved', count: approvedCount, color: '#198754' },
          { status: 'REJECTED', label: 'Rejected', count: rejectedCount, color: '#dc3545' },
          { status: 'UNDER_REVIEW', label: 'Under Review', count: underReviewCount, color: '#0dcaf0' },
          { status: 'PENDING', label: 'Pending Review', count: pendingCount, color: '#ffc107' },
        ],
        filterApplied: {
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        },
      },
    });
  } catch (error) {
    console.error('[Admin Reports Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error generating reports and analytics',
    });
  }
};

// @desc    Get list of citizen-escalated applications
// @route   GET /api/admin/escalations
// @access  Private (Admin ONLY)
const getEscalationList = async (req, res) => {
  try {
    const { escalationStatus } = req.query;
    const filter = { isEscalated: true };
    if (escalationStatus && ['PENDING', 'IN_REVIEW', 'RESOLVED'].includes(escalationStatus.toUpperCase())) {
      filter.escalationStatus = escalationStatus.toUpperCase();
    }

    const escalations = await Application.find(filter)
      .sort({ escalatedAt: -1 })
      .populate('applicant', 'name email');

    return res.status(200).json({
      success: true,
      count: escalations.length,
      escalations,
    });
  } catch (error) {
    console.error('[Admin Escalation List Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching escalation list',
    });
  }
};

// @desc    Update escalation status (PENDING / IN_REVIEW / RESOLVED) by admin
// @route   PUT /api/admin/applications/:id/escalation-status
// @access  Private (Admin ONLY)
const updateEscalationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { escalationStatus } = req.body || {};

    if (!escalationStatus || !['PENDING', 'IN_REVIEW', 'RESOLVED'].includes(escalationStatus.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'escalationStatus must be one of: PENDING, IN_REVIEW, RESOLVED',
      });
    }

    let application;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      application = await Application.findById(id);
    } else {
      application = await Application.findOne({ applicationNumber: id });
    }

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    if (!application.isEscalated) {
      return res.status(400).json({ success: false, message: 'This application does not have an active citizen escalation.' });
    }

    application.escalationStatus = escalationStatus.toUpperCase();
    await application.save();

    await logAudit({
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: 'ESCALATION_STATUS_UPDATED',
      targetRecordId: application.applicationNumber,
      details: {
        applicationNumber: application.applicationNumber,
        escalationStatus: application.escalationStatus,
      },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: `Escalation status updated to ${application.escalationStatus}.`,
      application,
    });
  } catch (error) {
    console.error('[Update Escalation Status Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating escalation status',
    });
  }
};

module.exports = {
  getAdminStats,
  getUsers,
  createOfficer,
  toggleUserStatus,
  getAuditLogs,
  getArchiveRecords,
  getAdminReports,
  getEscalationList,
  updateEscalationStatus,
};
