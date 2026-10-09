const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'municipal-logo.png');

/**
 * Generates a municipal certificate PDF stream for an approved application.
 *
 * @param {Object} application - The application Mongoose document
 * @param {Object} res - Express response stream
 */
const generateCertificatePDF = async (application, res) => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `${application.certificateType} Certificate - ${application.certificateNumber || application.applicationNumber}`,
      Author: 'Municipal Civil Registration Department',
      Subject: `Official ${application.certificateType} Certificate`,
      Keywords: 'Municipal, Certificate, Civil Registration, Government of India',
    },
  });

  doc.pipe(res);

  const { certificateType, certificateNumber, applicationNumber, certificateDetails, certificateIssuedAt } = application;
  const isBirth = certificateType === 'BIRTH';
  const issueDateFormatted = certificateIssuedAt
    ? new Date(certificateIssuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Verification URL for the QR code
  const verificationUrl = `http://localhost:3000/verify/${certificateNumber || applicationNumber}`;
  const qrBuffer = await QRCode.toBuffer(verificationUrl, {
    margin: 1,
    width: 100,
    color: {
      dark: '#1e3d59',
      light: '#ffffff',
    },
  });

  // Draw Decorative Double Border
  doc.rect(20, 20, 555, 802).lineWidth(3).strokeColor('#1e3d59').stroke();
  doc.rect(25, 25, 545, 792).lineWidth(1).strokeColor('#c2a649').stroke();

  // Corner Accents
  const drawCorner = (x, y, flipX, flipY) => {
    doc.save();
    doc.translate(x, y);
    doc.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    doc.path('M 0 0 L 15 0 L 15 5 L 5 5 L 5 15 L 0 15 Z').fillColor('#c2a649').fill();
    doc.restore();
  };
  drawCorner(28, 28, false, false);
  drawCorner(567, 28, true, false);
  drawCorner(28, 814, false, true);
  drawCorner(567, 814, true, true);

  // Municipal Header Logo (Left side)
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 48, 36, { fit: [60, 60], align: 'center', valign: 'center' });
  }

  // Municipal Header Text
  doc.fillColor('#1e3d59').fontSize(16).font('Helvetica-Bold').text('GOVERNMENT OF INDIA', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(14).text('DEPARTMENT OF MUNICIPAL CIVIL REGISTRATION', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).font('Helvetica').fillColor('#555555').text('Integrated Civil Registration & Digital Archive System', { align: 'center' });
  doc.moveDown(0.5);

  // Decorative Rule
  doc.moveTo(60, doc.y).lineTo(535, doc.y).lineWidth(1.5).strokeColor('#c2a649').stroke();
  doc.moveDown(0.8);

  // Certificate Title Box
  const titleBoxY = doc.y;
  doc.rect(100, titleBoxY, 395, 36).fillColor('#1e3d59').fill();
  doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(
    isBirth ? 'CERTIFICATE OF BIRTH' : 'CERTIFICATE OF DEATH',
    100,
    titleBoxY + 9,
    { align: 'center', width: 395 }
  );

  doc.y = titleBoxY + 45;
  doc.moveDown(0.3);
  doc.fillColor('#555555').fontSize(9).font('Helvetica-Oblique').text(
    '(Issued under Section 12/17 of the Registration of Births and Deaths Act, 1969 and Model Registration Rules)',
    { align: 'center' }
  );
  doc.moveDown(0.8);

  // Preamble Text
  doc.fillColor('#222222').fontSize(10).font('Helvetica').text(
    isBirth
      ? 'This is to certify that the following information has been taken from the original record of birth which is the register for the Municipal Corporation / Civil Registration District.'
      : 'This is to certify that the following information has been taken from the original record of death which is the register for the Municipal Corporation / Civil Registration District.',
    { align: 'justify', lineGap: 3 }
  );
  doc.moveDown(1);

  // Key-Value Grid Box
  const startGridY = doc.y;
  const colWidth = 240;
  const leftX = 50;
  const rightX = 305;

  const renderField = (label, value, x, y) => {
    doc.fillColor('#555555').fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
    doc.fillColor('#111111').fontSize(10).font('Helvetica').text(value || 'N/A', x, y + 12, { width: colWidth });
  };

  let currentY = startGridY;

  // Render Fields based on Certificate Type
  if (isBirth) {
    renderField('Certificate Number', certificateNumber || 'PENDING', leftX, currentY);
    renderField('Application Number', applicationNumber, rightX, currentY);
    currentY += 34;

    renderField('Child Full Name', certificateDetails.childName, leftX, currentY);
    renderField('Gender', certificateDetails.gender, rightX, currentY);
    currentY += 34;

    renderField('Date of Birth', certificateDetails.dateOfBirth, leftX, currentY);
    renderField('Time of Birth', certificateDetails.timeOfBirth, rightX, currentY);
    currentY += 34;

    renderField("Father's Full Name", certificateDetails.fatherName, leftX, currentY);
    renderField("Mother's Full Name", certificateDetails.motherName, rightX, currentY);
    currentY += 34;

    renderField('Place / Hospital of Birth', certificateDetails.hospitalName || certificateDetails.placeOfBirth, leftX, currentY);
    renderField('District / State', `${certificateDetails.district || 'Municipal District'}, ${certificateDetails.state || ''}`, rightX, currentY);
    currentY += 34;

    renderField('Permanent Residential Address', `${certificateDetails.permanentAddress || certificateDetails.address || ''}, ${certificateDetails.city || ''} - ${certificateDetails.pincode || ''}`, leftX, currentY);
    currentY += 40;
  } else {
    renderField('Certificate Number', certificateNumber || 'PENDING', leftX, currentY);
    renderField('Application Number', applicationNumber, rightX, currentY);
    currentY += 34;

    renderField('Deceased Full Name', certificateDetails.deceasedName, leftX, currentY);
    renderField('Gender', certificateDetails.gender, rightX, currentY);
    currentY += 34;

    renderField('Date of Death', certificateDetails.dateOfDeath, leftX, currentY);
    renderField('Time / Place of Death', `${certificateDetails.timeOfDeath || ''} | ${certificateDetails.placeOfDeath || certificateDetails.hospitalName || ''}`, rightX, currentY);
    currentY += 34;

    renderField("Father / Spouse Name", certificateDetails.spouseName || certificateDetails.fatherName || 'N/A', leftX, currentY);
    renderField("Mother's Name", certificateDetails.motherName || 'N/A', rightX, currentY);
    currentY += 34;

    renderField('District / State', `${certificateDetails.district || 'Municipal District'}, ${certificateDetails.state || ''}`, leftX, currentY);
    renderField('Cause of Death', certificateDetails.causeOfDeath || 'Not Stated', rightX, currentY);
    currentY += 34;

    renderField('Informant Details', `${certificateDetails.informantName || 'Informant'} (${certificateDetails.informantRelation || 'Relation'})`, leftX, currentY);
    currentY += 40;
  }

  // Registration and Issue Metadata Box
  doc.rect(45, currentY, 505, 45).fillColor('#f8f9fa').fill();
  doc.rect(45, currentY, 505, 45).lineWidth(0.5).strokeColor('#dddddd').stroke();

  renderField('Registration Date', certificateDetails.registrationDate || issueDateFormatted, 60, currentY + 8);
  renderField('Date of Issue', issueDateFormatted, 220, currentY + 8);
  renderField('Issuing Authority', 'Municipal Registrar of Births & Deaths', 360, currentY + 8);

  currentY += 65;

  // Footer: QR Code & Digital Signature
  doc.image(qrBuffer, 55, currentY, { width: 85, height: 85 });

  doc.fontSize(8).fillColor('#666666').font('Helvetica').text(
    'Scan QR code to verify authenticity in the Municipal Digital Archive.',
    150,
    currentY + 10,
    { width: 170 }
  );
  doc.text(
    `Digital Verification URL:\n${verificationUrl}`,
    150,
    currentY + 30,
    { width: 180 }
  );

  if (application.certificateIntegrity && application.certificateIntegrity.dataHash) {
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e3d59').text(
      'Cryptographic Integrity: SHA-256 Verified',
      150,
      currentY + 62,
      { width: 180 }
    );
  }

  // Digital Signature Stamp Box
  const sigBoxX = 350;
  doc.rect(sigBoxX, currentY, 195, 85).lineWidth(1).dash(3, { space: 2 }).strokeColor('#1e3d59').stroke();
  doc.undash();

  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e3d59').text(
    'DIGITALLY AUTHORIZED',
    sigBoxX,
    currentY + 8,
    { align: 'center', width: 195 }
  );
  doc.fontSize(8).font('Helvetica').fillColor('#333333').text(
    'Digitally signed by Registrar\nCivil Registration Department\nMunicipal Corporation\nTimestamp: ' + new Date().toISOString(),
    sigBoxX + 10,
    currentY + 24,
    { align: 'center', width: 175 }
  );

  // Bottom Security Note
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#888888').text(
    'This is a digitally issued document verified by the Municipal Civil Registration Archive. No physical signature is required.',
    40,
    785,
    { align: 'center', width: 515 }
  );

  doc.end();
};

/**
 * Generates a municipal certificate PDF as a Buffer (for email attachments).
 *
 * Reuses the same PDF generation logic by piping to a PassThrough stream
 * and collecting chunks into a Buffer.
 *
 * @param {Object} application - The application Mongoose document
 * @returns {Promise<Buffer>}
 */
const generateCertificatePDFBuffer = (application) => {
  return new Promise((resolve, reject) => {
    const { PassThrough } = require('stream');
    const passThrough = new PassThrough();
    const chunks = [];

    passThrough.on('data', (chunk) => chunks.push(chunk));
    passThrough.on('end', () => resolve(Buffer.concat(chunks)));
    passThrough.on('error', (err) => reject(err));

    generateCertificatePDF(application, passThrough).catch(reject);
  });
};

module.exports = {
  generateCertificatePDF,
  generateCertificatePDFBuffer,
};
