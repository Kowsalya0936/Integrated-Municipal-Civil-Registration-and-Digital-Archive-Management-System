const Application = require('../models/Application');

/**
 * Checks for potential duplicate birth or death certificate applications.
 *
 * @param {'BIRTH' | 'DEATH'} certificateType
 * @param {Object} certificateDetails
 * @returns {Promise<{ isSuspect: boolean, matchedApplicationNumber?: string, matchReason?: string }>}
 */
const detectDuplicates = async (certificateType, certificateDetails) => {
  try {
    if (certificateType === 'BIRTH') {
      const childName = (certificateDetails.childName || '').trim();
      const dateOfBirth = certificateDetails.dateOfBirth;
      const motherName = (certificateDetails.motherName || '').trim();

      if (!childName || !dateOfBirth) {
        return { isSuspect: false };
      }

      // Search approved or pending applications with matching child name and date of birth
      const match = await Application.findOne({
        certificateType: 'BIRTH',
        status: { $in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] },
        'certificateDetails.childName': { $regex: new RegExp(`^${childName}$`, 'i') },
        'certificateDetails.dateOfBirth': dateOfBirth,
        ...(motherName
          ? { 'certificateDetails.motherName': { $regex: new RegExp(`^${motherName}$`, 'i') } }
          : {}),
      }).select('applicationNumber status');

      if (match) {
        return {
          isSuspect: true,
          matchedApplicationNumber: match.applicationNumber,
          matchReason: `Potential duplicate: matching Child Name (${childName}), Date of Birth, and Mother Name with existing application ${match.applicationNumber} (${match.status}).`,
        };
      }
    } else if (certificateType === 'DEATH') {
      const deceasedName = (certificateDetails.deceasedName || '').trim();
      const dateOfDeath = certificateDetails.dateOfDeath;

      if (!deceasedName || !dateOfDeath) {
        return { isSuspect: false };
      }

      const match = await Application.findOne({
        certificateType: 'DEATH',
        status: { $in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] },
        'certificateDetails.deceasedName': { $regex: new RegExp(`^${deceasedName}$`, 'i') },
        'certificateDetails.dateOfDeath': dateOfDeath,
      }).select('applicationNumber status');

      if (match) {
        return {
          isSuspect: true,
          matchedApplicationNumber: match.applicationNumber,
          matchReason: `Potential duplicate: matching Deceased Name (${deceasedName}) and Date of Death with existing application ${match.applicationNumber} (${match.status}).`,
        };
      }
    }

    return { isSuspect: false };
  } catch (err) {
    console.error('[Duplicate Detector Error]:', err.message);
    return { isSuspect: false };
  }
};

module.exports = detectDuplicates;
