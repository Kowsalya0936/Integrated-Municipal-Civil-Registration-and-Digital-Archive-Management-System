const Counter = require('../models/Counter');

/**
 * Generates an atomic, concurrency-safe application number.
 * Format: TYPE-YEAR-00001 (e.g. BIRTH-2026-00001, DEATH-2026-00001)
 *
 * @param {'BIRTH' | 'DEATH'} certificateType
 * @returns {Promise<string>}
 */
const generateApplicationNumber = async (certificateType) => {
  const currentYear = new Date().getFullYear();
  const counterKey = `APP_${certificateType.toUpperCase()}_${currentYear}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(5, '0');
  return `${certificateType.toUpperCase()}-${currentYear}-${paddedSeq}`;
};

/**
 * Generates an atomic, concurrency-safe certificate number.
 * Format: MC-TYPE-YEAR-00001 (e.g. MC-BIRTH-2026-00001)
 *
 * @param {'BIRTH' | 'DEATH'} certificateType
 * @returns {Promise<string>}
 */
const generateCertificateNumber = async (certificateType) => {
  const currentYear = new Date().getFullYear();
  const counterKey = `CERT_${certificateType.toUpperCase()}_${currentYear}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(5, '0');
  return `MC-${certificateType.toUpperCase()}-${currentYear}-${paddedSeq}`;
};

module.exports = {
  generateApplicationNumber,
  generateCertificateNumber,
};
