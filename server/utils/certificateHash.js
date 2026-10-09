'use strict';

const crypto = require('crypto');

/**
 * Normalizes a string: trims whitespace and replaces multiple consecutive spaces with a single space.
 *
 * @param {*} val
 * @returns {string}
 */
function normalizeString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

/**
 * Normalizes a date to YYYY-MM-DD or standard ISO 8601 string deterministically.
 *
 * @param {*} val
 * @returns {string}
 */
function normalizeDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return normalizeString(val);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Constructs a deterministic canonical representation of the authoritative certificate data.
 *
 * Fields included:
 * - certificateNumber: string
 * - applicationNumber: string
 * - certificateType: 'BIRTH' | 'DEATH'
 * - certificateIssuedAt: ISO date string (YYYY-MM-DD)
 * - applicant:
 *     - name: string
 *     - email: string (lowercase)
 *     - mobile: string
 * - beneficiary:
 *     - If BIRTH: childName, gender (uppercase), dateOfBirth (YYYY-MM-DD), placeOfBirth, fatherName, motherName
 *     - If DEATH: deceasedName, gender (uppercase), dateOfDeath (YYYY-MM-DD), placeOfDeath, causeOfDeath, fatherName
 *
 * NOTE: PDF binary layout, QR image bytes, temporary timestamps, and filesystem paths are intentionally excluded.
 *
 * @param {Object} application - Application document or plain object
 * @returns {Object}
 */
function buildCanonicalCertificateData(application) {
  if (!application) return {};

  const certDetails = application.certificateDetails || {};
  const isBirth = String(application.certificateType || '').toUpperCase() === 'BIRTH';

  const canonical = {
    applicationNumber: normalizeString(application.applicationNumber),
    certificateNumber: normalizeString(application.certificateNumber),
    certificateType: normalizeString(application.certificateType).toUpperCase(),
    certificateIssuedAt: normalizeDate(application.certificateIssuedAt),
    applicant: {
      email: normalizeString(application.applicantDetails?.email).toLowerCase(),
      mobile: normalizeString(application.applicantDetails?.mobile),
      name: normalizeString(application.applicantDetails?.name),
    },
    beneficiary: isBirth
      ? {
          childName: normalizeString(certDetails.childName),
          dateOfBirth: normalizeDate(certDetails.dateOfBirth),
          fatherName: normalizeString(certDetails.fatherName),
          gender: normalizeString(certDetails.gender).toUpperCase(),
          motherName: normalizeString(certDetails.motherName),
          placeOfBirth: normalizeString(certDetails.hospitalName || certDetails.placeOfBirth),
        }
      : {
          causeOfDeath: normalizeString(certDetails.causeOfDeath),
          dateOfDeath: normalizeDate(certDetails.dateOfDeath),
          deceasedName: normalizeString(certDetails.deceasedName),
          fatherName: normalizeString(certDetails.fatherName),
          gender: normalizeString(certDetails.gender).toUpperCase(),
          placeOfDeath: normalizeString(certDetails.hospitalName || certDetails.placeOfDeath),
        },
  };

  return canonical;
}

/**
 * Serializes an object deterministically with recursively sorted keys.
 *
 * @param {*} obj
 * @returns {string}
 */
function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(obj[k]));
  return '{' + entries.join(',') + '}';
}

/**
 * Generates the SHA-256 integrity hash from authoritative certificate data.
 *
 * @param {Object} application
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
 * Verifies certificate integrity by re-computing the canonical SHA-256 hash
 * and comparing it to the stored hash.
 *
 * Returns one of three states:
 * 1. 'VERIFIED'
 * 2. 'INTEGRITY MISMATCH'
 * 3. 'LEGACY / HASH NOT AVAILABLE'
 *
 * @param {Object} application
 * @returns {{
 *   algorithm: string,
 *   status: 'VERIFIED' | 'INTEGRITY MISMATCH' | 'LEGACY / HASH NOT AVAILABLE',
 *   isVerified: boolean,
 *   storedHash: string|null,
 *   recalculatedHash: string,
 *   message: string,
 *   generatedAt: Date|null
 * }}
 */
function verifyCertificateHash(application) {
  const canonical = buildCanonicalCertificateData(application);
  const serialized = canonicalStringify(canonical);
  const recalculatedHash = crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');

  const storedHash = application.certificateIntegrity?.dataHash || application.certificateDetails?.integrityHash || null;

  if (!storedHash) {
    return {
      algorithm: 'SHA-256',
      status: 'LEGACY / HASH NOT AVAILABLE',
      isVerified: false,
      storedHash: null,
      recalculatedHash,
      message: 'Integrity verification is unavailable for this certificate. The certificate was issued before cryptographic integrity verification was enabled.',
      generatedAt: null,
    };
  }

  const isMatch = storedHash === recalculatedHash;

  return {
    algorithm: application.certificateIntegrity?.algorithm || 'SHA-256',
    status: isMatch ? 'VERIFIED' : 'INTEGRITY MISMATCH',
    isVerified: isMatch,
    storedHash,
    recalculatedHash,
    message: isMatch
      ? 'Certificate Authenticity Verified. The certificate data matches the officially issued municipal record.'
      : 'Certificate Integrity Check Failed. The certificate data does not match the officially issued municipal record.',
    generatedAt: application.certificateIntegrity?.generatedAt || null,
  };
}

module.exports = {
  buildCanonicalCertificateData,
  canonicalStringify,
  generateCertificateHash,
  verifyCertificateHash,
};
