'use strict';

const detectDuplicates = require('./duplicateDetector');

/**
 * Validates whether an email string follows standard email formatting.
 *
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates whether a mobile string is a valid 10-digit number.
 *
 * @param {string} mobile
 * @returns {boolean}
 */
function isValidMobile(mobile) {
  if (!mobile) return false;
  const digits = String(mobile).replace(/\D/g, '');
  return digits.length === 10;
}

/**
 * Validates whether a pincode is a 6-digit Indian postal code.
 *
 * @param {string} pincode
 * @returns {boolean}
 */
function isValidPincode(pincode) {
  if (!pincode) return false;
  const digits = String(pincode).replace(/\D/g, '');
  return digits.length === 6;
}

/**
 * Performs deterministic Smart Verification and Risk Analysis on a civil registration application.
 *
 * @param {Object} application - Mongoose application document or plain object
 * @returns {Promise<{
 *   overallRisk: 'LOW' | 'MEDIUM' | 'HIGH',
 *   requiresAttention: boolean,
 *   flagsCount: number,
 *   checks: Array<{
 *     code: string,
 *     name: string,
 *     status: 'PASS' | 'WARNING' | 'FAIL' | 'FLAGGED',
 *     message: string,
 *     details?: any
 *   }>,
 *   checkedAt: Date
 * }>}
 */
async function runSmartVerification(application) {
  if (!application) {
    return {
      overallRisk: 'LOW',
      requiresAttention: false,
      flagsCount: 0,
      checks: [],
      checkedAt: new Date(),
    };
  }

  const certificateType = String(application.certificateType || '').toUpperCase();
  const isBirth = certificateType === 'BIRTH';
  const certDetails = application.certificateDetails || {};
  const applicantDetails = application.applicantDetails || {};
  const documents = Array.isArray(application.documents) ? application.documents : [];

  const checks = [];
  let riskScore = 0; // 0 = LOW, 1-2 = MEDIUM, 3+ = HIGH
  let hasCriticalFail = false;

  // =========================================================================
  // CHECK 1: DOCUMENT COMPLETENESS
  // =========================================================================
  const docTypesUploaded = documents.map((d) => String(d.documentType || '').toLowerCase());
  const docNamesUploaded = documents.map((d) => String(d.originalName || d.fileName || '').toLowerCase());

  const missingDocs = [];

  if (isBirth) {
    // Expected: hospital record, parent ID proof, address proof
    const hasHospitalDoc = docTypesUploaded.some((t) => t.includes('hospital') || t.includes('birth') || t.includes('medical')) ||
      docNamesUploaded.some((n) => n.includes('hospital') || n.includes('birth') || n.includes('discharge'));
    const hasParentId = docTypesUploaded.some((t) => t.includes('parent') || t.includes('id') || t.includes('aadhaar') || t.includes('identity')) ||
      docNamesUploaded.some((n) => n.includes('id') || n.includes('aadhaar') || n.includes('passport') || n.includes('voter'));
    const hasAddress = docTypesUploaded.some((t) => t.includes('address') || t.includes('residence')) ||
      docNamesUploaded.some((n) => n.includes('address') || n.includes('ration') || n.includes('eb') || n.includes('bill'));

    if (!hasHospitalDoc && !documents.length) missingDocs.push('Hospital Birth Report');
    if (!hasParentId && documents.length < 2) missingDocs.push('Parent ID Proof');
  } else {
    // Expected: death summary/record, informant ID proof, address proof
    const hasDeathDoc = docTypesUploaded.some((t) => t.includes('death') || t.includes('medical') || t.includes('hospital')) ||
      docNamesUploaded.some((n) => n.includes('death') || n.includes('hospital') || n.includes('cause'));
    const hasInformantId = docTypesUploaded.some((t) => t.includes('informant') || t.includes('id') || t.includes('identity')) ||
      docNamesUploaded.some((n) => n.includes('id') || n.includes('aadhaar') || n.includes('passport'));

    if (!hasDeathDoc && !documents.length) missingDocs.push('Medical Cause of Death / Hospital Summary');
    if (!hasInformantId && documents.length < 2) missingDocs.push('Informant ID Proof');
  }

  if (documents.length === 0) {
    checks.push({
      code: 'DOCUMENT_COMPLETENESS',
      name: 'Supporting Documents Verification',
      status: 'FAIL',
      message: 'No supporting documents uploaded with this application.',
      details: { uploadedCount: 0, missingDocs },
    });
    riskScore += 2;
    hasCriticalFail = true;
  } else if (missingDocs.length > 0) {
    checks.push({
      code: 'DOCUMENT_COMPLETENESS',
      name: 'Supporting Documents Verification',
      status: 'WARNING',
      message: `Application contains ${documents.length} document(s), but recommended document(s) may be missing: ${missingDocs.join(', ')}.`,
      details: { uploadedCount: documents.length, missingDocs },
    });
    riskScore += 1;
  } else {
    checks.push({
      code: 'DOCUMENT_COMPLETENESS',
      name: 'Supporting Documents Verification',
      status: 'PASS',
      message: `All supporting documents are uploaded and available (${documents.length} file(s)).`,
      details: { uploadedCount: documents.length },
    });
  }

  // =========================================================================
  // CHECK 2: DUPLICATE DETECTION (Reuses existing duplicateDetector.js)
  // =========================================================================
  let duplicateResult = { isSuspect: false };
  try {
    duplicateResult = await detectDuplicates(certificateType, certDetails);
  } catch (dupErr) {
    console.error('[Smart Verification Duplicate Check Error]:', dupErr.message);
  }

  if (duplicateResult.isSuspect) {
    checks.push({
      code: 'DUPLICATE_CHECK',
      name: 'Civil Registry Duplicate Cross-Check',
      status: 'FLAGGED',
      message: duplicateResult.matchReason || 'Possible matching civil registration record detected in municipal archive.',
      details: {
        matchedApplicationNumber: duplicateResult.matchedApplicationNumber,
        matchReason: duplicateResult.matchReason,
      },
    });
    riskScore += 2;
    hasCriticalFail = true;
  } else {
    checks.push({
      code: 'DUPLICATE_CHECK',
      name: 'Civil Registry Duplicate Cross-Check',
      status: 'PASS',
      message: 'No duplicate records detected in the civil registry database.',
    });
  }

  // =========================================================================
  // CHECK 3: REQUIRED FIELD COMPLETENESS
  // =========================================================================
  const missingFields = [];

  if (isBirth) {
    if (!certDetails.childName || !String(certDetails.childName).trim()) missingFields.push('Child Full Name');
    if (!certDetails.dateOfBirth) missingFields.push('Date of Birth');
    if (!certDetails.gender) missingFields.push('Gender');
    if (!certDetails.fatherName || !String(certDetails.fatherName).trim()) missingFields.push("Father's Name");
    if (!certDetails.motherName || !String(certDetails.motherName).trim()) missingFields.push("Mother's Name");
    if (!certDetails.hospitalName && !certDetails.placeOfBirth) missingFields.push('Place / Hospital of Birth');
  } else {
    if (!certDetails.deceasedName || !String(certDetails.deceasedName).trim()) missingFields.push('Deceased Full Name');
    if (!certDetails.dateOfDeath) missingFields.push('Date of Death');
    if (!certDetails.gender) missingFields.push('Gender');
    if (!certDetails.hospitalName && !certDetails.placeOfDeath) missingFields.push('Place / Hospital of Death');
    if (!certDetails.informantName && !applicantDetails.name) missingFields.push('Informant Name');
  }

  const appName = applicantDetails.name || applicantDetails.fullName;
  const appMobile = applicantDetails.mobile || applicantDetails.mobileNumber || applicantDetails.phone;

  if (!appName) missingFields.push('Applicant Name');
  if (!appMobile) missingFields.push('Applicant Mobile');

  if (missingFields.length > 0) {
    checks.push({
      code: 'FIELD_COMPLETENESS',
      name: 'Application Fields Completeness',
      status: 'FAIL',
      message: `Required application field(s) missing or blank: ${missingFields.join(', ')}.`,
      details: { missingFields },
    });
    riskScore += 2;
    hasCriticalFail = true;
  } else {
    checks.push({
      code: 'FIELD_COMPLETENESS',
      name: 'Application Fields Completeness',
      status: 'PASS',
      message: 'All mandatory civil registration fields are completely filled.',
    });
  }

  // =========================================================================
  // CHECK 4: DATE CONSISTENCY & VALIDITY
  // =========================================================================
  const dateIssues = [];
  const now = new Date();
  // Buffer today's end to avoid timezone false positives on same-day submissions
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (isBirth) {
    if (certDetails.dateOfBirth) {
      const dob = new Date(certDetails.dateOfBirth);
      if (isNaN(dob.getTime())) {
        dateIssues.push('Invalid Date of Birth format');
      } else if (dob > todayEnd) {
        dateIssues.push(`Date of Birth (${certDetails.dateOfBirth}) cannot be in the future`);
      }
    }
  } else {
    if (certDetails.dateOfDeath) {
      const dod = new Date(certDetails.dateOfDeath);
      if (isNaN(dod.getTime())) {
        dateIssues.push('Invalid Date of Death format');
      } else if (dod > todayEnd) {
        dateIssues.push(`Date of Death (${certDetails.dateOfDeath}) cannot be in the future`);
      }

      if (certDetails.dateOfBirth) {
        const dob = new Date(certDetails.dateOfBirth);
        if (!isNaN(dob.getTime()) && !isNaN(dod.getTime()) && dob > dod) {
          dateIssues.push(`Date of Birth (${certDetails.dateOfBirth}) is after Date of Death (${certDetails.dateOfDeath})`);
        }
      }
    }
  }

  if (dateIssues.length > 0) {
    checks.push({
      code: 'DATE_CONSISTENCY',
      name: 'Chronological & Date Validity',
      status: 'FAIL',
      message: `Date inconsistency detected: ${dateIssues.join('; ')}.`,
      details: { dateIssues },
    });
    riskScore += 2;
    hasCriticalFail = true;
  } else {
    checks.push({
      code: 'DATE_CONSISTENCY',
      name: 'Chronological & Date Validity',
      status: 'PASS',
      message: 'All event dates are chronologically valid and non-future.',
    });
  }

  // =========================================================================
  // CHECK 5: DATA INTEGRITY & FORMAT CONSISTENCY
  // =========================================================================
  const dataWarnings = [];

  // Check parent name duplication
  if (isBirth && certDetails.fatherName && certDetails.motherName) {
    const fn = String(certDetails.fatherName).trim().toLowerCase();
    const mn = String(certDetails.motherName).trim().toLowerCase();
    if (fn.length > 2 && fn === mn) {
      dataWarnings.push("Father's Name and Mother's Name are identical");
    }
  }

  // Check mobile formatting
  const applicantMobileNum = applicantDetails.mobile || applicantDetails.mobileNumber || applicantDetails.phone;
  if (applicantMobileNum && !isValidMobile(applicantMobileNum)) {
    dataWarnings.push(`Applicant mobile number (${applicantMobileNum}) does not match standard 10-digit format`);
  }
  if (isBirth && certDetails.fatherMobile && !isValidMobile(certDetails.fatherMobile)) {
    dataWarnings.push(`Father mobile number (${certDetails.fatherMobile}) does not match standard 10-digit format`);
  }

  // Check email formatting
  if (applicantDetails.email && !isValidEmail(applicantDetails.email)) {
    dataWarnings.push(`Applicant email (${applicantDetails.email}) is not properly formatted`);
  }

  // Check pincode formatting
  const pincode = certDetails.pincode || applicantDetails.pincode;
  if (pincode && !isValidPincode(pincode)) {
    dataWarnings.push(`Pincode (${pincode}) is not a valid 6-digit postal code`);
  }

  if (dataWarnings.length > 0) {
    checks.push({
      code: 'DATA_CONSISTENCY',
      name: 'Data Format & Field Consistency',
      status: 'WARNING',
      message: `Field formatting anomaly identified: ${dataWarnings.join('; ')}.`,
      details: { dataWarnings },
    });
    riskScore += 1;
  } else {
    checks.push({
      code: 'DATA_CONSISTENCY',
      name: 'Data Format & Field Consistency',
      status: 'PASS',
      message: 'Application data is internally consistent and contact details are valid.',
    });
  }

  // =========================================================================
  // RISK LEVEL CLASSIFICATION (Explainable & Deterministic)
  // =========================================================================
  let overallRisk = 'LOW';
  if (hasCriticalFail || riskScore >= 2) {
    overallRisk = 'HIGH';
  } else if (riskScore === 1) {
    overallRisk = 'MEDIUM';
  }

  const requiresAttention = overallRisk !== 'LOW';
  const flagsCount = checks.filter((c) => c.status !== 'PASS').length;

  return {
    overallRisk,
    requiresAttention,
    flagsCount,
    checks,
    checkedAt: new Date(),
  };
}

module.exports = {
  runSmartVerification,
  isValidEmail,
  isValidMobile,
  isValidPincode,
};
