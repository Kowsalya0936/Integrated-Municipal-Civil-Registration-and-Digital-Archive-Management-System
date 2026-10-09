'use strict';

const crypto = require('crypto');

/**
 * Builds a deterministic canonical object for an issued certificate.
 *
 * Fields included:
 * - certificateNumber
 * - applicationNumber
 * - certificateType
 * - certificateIssuedAt (ISO string)
 * - applicant: name, email, mobile
 * - beneficiary: type-specific core attributes (name, gender, event date, place, parent names)
 *
 * @param {Object} application - The application Mongoose document or plain object
 * @returns {Object} Canonical key-value representation
 */
function buildCanonicalCertificateData(application) {
  const certDetails = application.certificateDetails || {};
  const isBirth = String(application.certificateType).toUpperCase() === 'BIRTH';

  const issuedAt = application.certificateIssuedAt
    ? new Date(application.certificateIssuedAt).toISOString()
    : '';

  const canonical = {
    applicationNumber: String(application.applicationNumber || '').trim(),
    certificateNumber: String(application.certificateNumber || '').trim(),
    certificateType: String(application.certificateType || '').toUpperCase().trim(),
    certificateIssuedAt: issuedAt,
    applicant: {
      email: String(application.applicantDetails?.email || '').trim().toLowerCase(),
      mobile: String(application.applicantDetails?.mobile || '').trim(),
      name: String(application.applicantDetails?.name || '').trim(),
    },
    beneficiary: isBirth
      ? {
          childName: String(certDetails.childName || '').trim(),
          dateOfBirth: String(certDetails.dateOfBirth || '').trim(),
          fatherName: String(certDetails.fatherName || '').trim(),
          gender: String(certDetails.gender || '').toUpperCase().trim(),
          motherName: String(certDetails.motherName || '').trim(),
          placeOfBirth: String(certDetails.hospitalName || certDetails.placeOfBirth || '').trim(),
        }
      : {
          causeOfDeath: String(certDetails.causeOfDeath || '').trim(),
          dateOfDeath: String(certDetails.dateOfDeath || '').trim(),
          deceasedName: String(certDetails.deceasedName || '').trim(),
          fatherName: String(certDetails.fatherName || '').trim(),
          gender: String(certDetails.gender || '').toUpperCase().trim(),
          placeOfDeath: String(certDetails.hospitalName || certDetails.placeOfDeath || '').trim(),
        },
  };

  return canonical;
}

/**
 * Recursively serializes any JavaScript object with lexicographically sorted keys.
 *
 * @param {*} value
 * @returns {string} Deterministic JSON string
 */
function canonicalStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(value).sort();
  const entries = sortedKeys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(value[k]));
  return '{' + entries.join(',') + '}';
}

/**
 * Generates a SHA-256 cryptographic hash of the canonical certificate representation.
 *
 * @param {Object} application - The application document
 * @returns {{ algorithm: string, dataHash: string, generatedAt: Date }}
 */
function generateCertificateHash(application) {
  const canonical = buildCanonicalCertificateData(application);
  const serialized = canonicalStringify(canonical);
  const dataHash = crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');

  return {
    algorithm: 'SHA-256',
    dataHash,
    generatedAt: new Date(),
  };
}

/**
 * Verifies the cryptographic integrity of an application certificate by recomputing
 * its canonical hash and comparing it against the stored hash.
 *
 * @param {Object} application - The application document
 * @returns {{ algorithm: string, status: string, storedHash: string|null, recalculatedHash: string, isVerified: boolean, generatedAt: Date|null }}
 */
function verifyCertificateHash(application) {
  const canonical = buildCanonicalCertificateData(application);
  const serialized = canonicalStringify(canonical);
  const recalculatedHash = crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');

  if (!application.certificateIntegrity || !application.certificateIntegrity.dataHash) {
    return {
      algorithm: 'SHA-256',
      status: 'NOT AVAILABLE',
      storedHash: null,
      recalculatedHash,
      isVerified: false,
      generatedAt: null,
    };
  }

  const storedHash = application.certificateIntegrity.dataHash;
  const isMatch = storedHash === recalculatedHash;

  return {
    algorithm: application.certificateIntegrity.algorithm || 'SHA-256',
    status: isMatch ? 'VERIFIED' : 'INTEGRITY CHECK FAILED',
    storedHash,
    recalculatedHash,
    isVerified: isMatch,
    generatedAt: application.certificateIntegrity.generatedAt || null,
  };
}

module.exports = {
  buildCanonicalCertificateData,
  canonicalStringify,
  generateCertificateHash,
  verifyCertificateHash,
};
