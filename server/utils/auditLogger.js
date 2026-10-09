const AuditLog = require('../models/AuditLog');

/**
 * Safely writes an audit record to MongoDB.
 */
const logAudit = async ({
  user = null,
  userName = 'System',
  role = 'system',
  action,
  targetRecordId = null,
  details = null,
  ipAddress = '',
}) => {
  try {
    await AuditLog.create({
      user,
      userName,
      role,
      action,
      targetRecordId,
      details,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('[Audit Logger Error] Failed to write audit log:', err.message);
  }
};

module.exports = logAudit;
