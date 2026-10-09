const nodemailer = require('nodemailer');

/**
 * Reusable Central Email Service
 * Integrated Municipal Civil Registration and Digital Archive Management System
 *
 * Uses environment variables for SMTP configuration:
 *   SMTP_HOST (default: 'localhost')
 *   SMTP_PORT (default: 587)
 *   SMTP_SECURE (default: false)
 *   SMTP_USER (optional, credentials)
 *   SMTP_PASS (optional, credentials)
 *   EMAIL_FROM / SMTP_FROM (default: '"Municipal Civil Registration Department" <noreply@municipal.gov>')
 */

let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : null;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim() : null;

  // If credentials are provided, configure full SMTP auth
  if (host && user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  } else if (host) {
    // Host provided without auth (e.g. local mailcatcher/relay)
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
    });
  } else {
    // Development / fallback: creates a stream/JSON or mock transporter so no crashes happen
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return cachedTransporter;
};

/**
 * Generic sendEmail function
 * Safely sends email and returns result without throwing unhandled exceptions.
 */
const sendEmail = async ({ to, subject, text, html, attachments }) => {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    console.warn('[EmailService] Skipped sending email: Invalid or missing recipient address:', to);
    return { success: false, message: 'Invalid recipient email address' };
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || '"Municipal Civil Registration Department" <noreply@municipal.gov>';

  try {
    const transporter = getTransporter();
    const mailOptions = {
      from,
      to: to.trim(),
      subject,
      text,
      html,
    };

    // Support optional Nodemailer attachments (e.g. PDF certificate)
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Email successfully dispatched to ${to} | Subject: "${subject}" | MessageId: ${info.messageId || 'json-transport'}`);

    console.log('[SMTP RESULT]', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });

    return { success: true, messageId: info.messageId, response: info.response, accepted: info.accepted };
  } catch (err) {
    console.error(`[EmailService Error] Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Base responsive email template styling wrapper
 */
const buildHtmlTemplate = ({ title, preheader, contentHtml, highlightBoxHtml }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; color: #333333; line-height: 1.6; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background-color: #1a365d; color: #ffffff; padding: 24px 30px; text-align: left; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0 0; font-size: 13px; color: #cbd5e0; }
    .content { padding: 30px; }
    .highlight-box { background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 16px 20px; margin: 20px 0; border-radius: 0 6px 6px 0; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    .details-table td { padding: 8px 12px; border-bottom: 1px solid #edf2f7; }
    .details-table td.label { font-weight: 600; color: #4a5568; width: 40%; }
    .details-table td.value { color: #1a202c; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 4px; text-transform: uppercase; }
    .badge-pending { background-color: #fefcbf; color: #744210; }
    .badge-approved { background-color: #c6f6d5; color: #22543d; }
    .badge-rejected { background-color: #fed7d7; color: #742a2a; }
    .badge-escalated { background-color: #fed7d7; color: #9b2c2c; border: 1px solid #feb2b2; }
    .footer { background-color: #edf2f7; padding: 20px 30px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Municipal Civil Registration Directorate</h1>
      <p>Integrated Civil Registration & Digital Archive Management System</p>
    </div>
    <div class="content">
      <h2 style="font-size: 18px; color: #2d3748; margin-top: 0;">${title}</h2>
      ${contentHtml}
      ${highlightBoxHtml || ''}
      <p style="font-size: 13px; color: #718096; margin-top: 25px;">
        You can track and manage your application anytime by logging into the Municipal Citizen Portal.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">This is an automated administrative notification. Please do not reply directly to this email.</p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Municipal Corporation. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Resolves the genuine recipient email address of the citizen who owns the application
 * from MongoDB application and user data.
 *
 * Evaluation order:
 * 1. application.applicantDetails.email (Embedded document in Application collection)
 * 2. application.applicant.email (Populated User document from User collection)
 *
 * @param {Object} application
 * @returns {string|null}
 */
const getCitizenRecipientEmail = (application) => {
  if (!application) return null;
  if (application.applicantDetails && application.applicantDetails.email && typeof application.applicantDetails.email === 'string') {
    return application.applicantDetails.email.trim();
  }
  if (application.applicant && typeof application.applicant === 'object' && application.applicant.email && typeof application.applicant.email === 'string') {
    return application.applicant.email.trim();
  }
  return null;
};

/**
 * Resolves the genuine applicant name of the citizen who owns the application.
 *
 * @param {Object} application
 * @returns {string}
 */
const getCitizenApplicantName = (application) => {
  if (!application) return 'Citizen';
  if (application.applicantDetails && application.applicantDetails.name && typeof application.applicantDetails.name === 'string') {
    return application.applicantDetails.name.trim();
  }
  if (application.applicant && typeof application.applicant === 'object' && application.applicant.name && typeof application.applicant.name === 'string') {
    return application.applicant.name.trim();
  }
  return 'Citizen';
};

/**
 * 1. Application Submission Confirmation Email
 */
const sendSubmissionEmail = async (application) => {
  const recipientEmail = getCitizenRecipientEmail(application);
  const applicantName = getCitizenApplicantName(application);
  const beneficiaryName =
    application.certificateType === 'BIRTH'
      ? application.certificateDetails?.childName
      : application.certificateDetails?.deceasedName;

  const subject = `Application Submitted: ${application.applicationNumber} (${application.certificateType} Certificate)`;
  const slaDeadlineStr = application.slaDeadline
    ? new Date(application.slaDeadline).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : '48 Hours from submission';

  const contentHtml = `
    <p>Dear <strong>${applicantName}</strong>,</p>
    <p>Your application for a <strong>${application.certificateType} Certificate</strong> has been successfully registered in the Municipal Civil Registration System.</p>
    <table class="details-table">
      <tr><td class="label">Application Number:</td><td class="value"><strong>${application.applicationNumber}</strong></td></tr>
      <tr><td class="label">Certificate Type:</td><td class="value">${application.certificateType} Certificate</td></tr>
      <tr><td class="label">Beneficiary / Subject:</td><td class="value">${beneficiaryName || 'N/A'}</td></tr>
      <tr><td class="label">Current Status:</td><td class="value"><span class="badge badge-pending">PENDING REVIEW</span></td></tr>
      <tr><td class="label">Estimated Resolution SLA:</td><td class="value">${slaDeadlineStr}</td></tr>
    </table>
  `;

  const highlightBoxHtml = `
    <div class="highlight-box">
      <strong>Next Steps:</strong>
      <p style="margin: 5px 0 0 0; font-size: 13px;">
        A designated municipal verification officer will review your uploaded documents within the standard SLA window. You will receive an email notification once your application is processed.
      </p>
    </div>
  `;

  const text = `
Dear ${applicantName},

Your application for a ${application.certificateType} Certificate has been successfully submitted.

Application Number: ${application.applicationNumber}
Certificate Type: ${application.certificateType}
Status: PENDING REVIEW
SLA Resolution Deadline: ${slaDeadlineStr}

A municipal verification officer will review your documents. You can track this application on the Municipal Citizen Portal.

Municipal Civil Registration Department
  `.trim();

  const html = buildHtmlTemplate({
    title: 'Application Submission Confirmation',
    contentHtml,
    highlightBoxHtml,
  });

  return await sendEmail({ to: recipientEmail, subject, text, html });
};

/**
 * 2. Application Approved & Certificate Ready Email
 *
 * Attaches the official approved certificate PDF when application status is 'APPROVED'
 * and a valid PDF Buffer is provided.
 *
 * @param {Object} application - The application Mongoose document
 * @param {Buffer} [pdfBuffer] - Optional generated PDF Buffer of the approved certificate
 */
const sendApprovalEmail = async (application, pdfBuffer) => {
  const recipientEmail = getCitizenRecipientEmail(application);
  const applicantName = getCitizenApplicantName(application);
  const beneficiaryName =
    application.certificateType === 'BIRTH'
      ? application.certificateDetails?.childName
      : application.certificateDetails?.deceasedName;

  if (!recipientEmail) {
    console.warn(`[EMAIL] Approval email failed for ${application?.applicationNumber || 'Unknown'}: No valid applicant recipient email address`);
    return { success: false, message: 'No valid recipient email address' };
  }

  // Duplicate email protection: Avoid sending duplicate approval emails
  if (application.approvalEmailSent) {
    console.log(`[EMAIL] Approval email already sent previously for ${application.applicationNumber}. Skipping duplicate.`);
    return { success: true, message: 'Approval email already sent previously' };
  }

  // Safety rule: PDF buffer is mandatory for approved certificate email
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    console.error(`[APPROVAL EMAIL] PDF buffer missing - certificate attachment not sent for ${application?.applicationNumber || 'Unknown'}`);
    return { success: false, message: 'PDF buffer missing - certificate attachment not sent' };
  }

  const typeDisplay = application.certificateType === 'BIRTH' ? 'Birth' : 'Death';
  const subject = `Municipal ${typeDisplay} Certificate Approved – ${application.applicationNumber}`;
  const issueDateStr = new Date(application.certificateIssuedAt || Date.now()).toLocaleDateString('en-GB');

  const contentHtml = `
    <p>Dear <strong>${applicantName}</strong>,</p>
    <p>Your <strong>${typeDisplay} Certificate</strong> application has been successfully approved.</p>
    <table class="details-table">
      <tr><td class="label">Application Number:</td><td class="value"><strong>${application.applicationNumber}</strong></td></tr>
      <tr><td class="label">Certificate Number:</td><td class="value"><strong style="color: #2b6cb0;">${application.certificateNumber || 'Generated in Archive'}</strong></td></tr>
      <tr><td class="label">Certificate Type:</td><td class="value">${typeDisplay} Certificate</td></tr>
      <tr><td class="label">Beneficiary / Subject:</td><td class="value">${beneficiaryName || 'N/A'}</td></tr>
      <tr><td class="label">Status:</td><td class="value"><span class="badge badge-approved">Approved</span></td></tr>
      <tr><td class="label">Issue Date:</td><td class="value">${issueDateStr}</td></tr>
    </table>
    <p style="margin: 15px 0 5px 0; font-size: 14px; color: #2d3748;">
      The digitally generated certificate is attached to this email as a PDF.
    </p>
    <p style="margin: 5px 0 15px 0; font-size: 13px; color: #4a5568;">
      You can also verify the authenticity of the certificate using the QR code provided on the certificate.
    </p>
  `;

  const highlightBoxHtml = `
    <div class="highlight-box" style="border-left-color: #38a169; background-color: #f0fff4;">
      <strong>Official Digital Certificate Attached:</strong>
      <p style="margin: 5px 0 0 0; font-size: 13px;">
        Your official digital certificate (${application.certificateNumber || application.applicationNumber}.pdf) has been attached to this email. It features SHA-256 cryptographic verification and an authenticated QR code.
      </p>
    </div>
  `;

  const text = `
Dear ${applicantName},

Your ${typeDisplay} Certificate application has been successfully approved.

Application Number: ${application.applicationNumber}
Certificate Number: ${application.certificateNumber || 'Available in Dashboard'}
Status: Approved
Issue Date: ${issueDateStr}

The digitally generated certificate is attached to this email as a PDF.

You can also verify the authenticity of the certificate using the QR code provided on the certificate.

Regards,
Municipal Civil Registration Department
  `.trim();

  const html = buildHtmlTemplate({
    title: `Municipal ${typeDisplay} Certificate Approved`,
    contentHtml,
    highlightBoxHtml,
  });

  // Prepare PDF attachment ONLY when application status is APPROVED
  const attachments = [];
  if (application.status === 'APPROVED' && pdfBuffer && Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0) {
    const certFilename = `${application.certificateNumber || application.applicationNumber}.pdf`;
    attachments.push({
      filename: certFilename,
      content: pdfBuffer,
      contentType: 'application/pdf',
      contentDisposition: 'attachment',
    });
  } else if (application.status !== 'APPROVED') {
    console.warn(`[EMAIL] Security check: Certificate PDF attachment withheld because application status is '${application.status}' (must be APPROVED).`);
  }

  // Exact requested debug log immediately before sendMail / sendEmail
  console.log('[APPROVAL EMAIL ATTACHMENT DEBUG]', {
    to: recipientEmail,
    attachmentCount: attachments.length,
    attachment: attachments.map((item) => ({
      filename: item.filename,
      contentType: item.contentType,
      isBuffer: Buffer.isBuffer(item.content),
      size: Buffer.isBuffer(item.content) ? item.content.length : null,
    })),
  });

  const result = await sendEmail({
    to: recipientEmail,
    subject,
    text,
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  if (result && result.success) {
    if (attachments.length > 0) {
      console.log(`[EMAIL] Approval certificate email sent to ${recipientEmail}`);
      console.log(`[EMAIL] Attachment: ${attachments[0].filename}`);
    } else {
      console.log(`[EMAIL] Approval email sent to ${recipientEmail} (without attachment)`);
    }
  } else {
    console.error(`[EMAIL] Approval email failed for ${application.applicationNumber}: ${result?.error || result?.message || 'Failed to dispatch email'}`);
  }

  return result;
};

/**
 * 3. Application Rejection Email
 */
const sendRejectionEmail = async (application) => {
  const recipientEmail = getCitizenRecipientEmail(application);
  const applicantName = getCitizenApplicantName(application);
  const reason = application.rejectionReason || 'Submitted documentation did not fulfill municipal registration criteria.';

  const subject = `Application Update: ${application.applicationNumber} - Rejected`;

  const contentHtml = `
    <p>Dear <strong>${applicantName}</strong>,</p>
    <p>This is to inform you that your application for a <strong>${application.certificateType} Certificate</strong> has been reviewed and <strong style="color: #c53030;">REJECTED</strong> by the Municipal Verification Officer.</p>
    <table class="details-table">
      <tr><td class="label">Application Number:</td><td class="value">${application.applicationNumber}</td></tr>
      <tr><td class="label">Certificate Type:</td><td class="value">${application.certificateType} Certificate</td></tr>
      <tr><td class="label">Status:</td><td class="value"><span class="badge badge-rejected">REJECTED</span></td></tr>
      <tr><td class="label">Official Reason:</td><td class="value" style="color: #c53030; font-weight: 600;">${reason}</td></tr>
    </table>
  `;

  const highlightBoxHtml = `
    <div class="highlight-box" style="border-left-color: #e53e3e; background-color: #fff5f5;">
      <strong>Next Steps:</strong>
      <p style="margin: 5px 0 0 0; font-size: 13px;">
        Please review the reason specified above. You may submit a fresh application with the corrected documents and required information through the Citizen Portal.
      </p>
    </div>
  `;

  const text = `
Dear ${applicantName},

Your application (${application.applicationNumber}) for a ${application.certificateType} Certificate has been REJECTED.

Reason: ${reason}
Status: REJECTED

Please log in to the Municipal Citizen Portal to review details and reapply with valid documentation.

Municipal Civil Registration Department
  `.trim();

  const html = buildHtmlTemplate({
    title: 'Application Status Update: Rejected',
    contentHtml,
    highlightBoxHtml,
  });

  return await sendEmail({ to: recipientEmail, subject, text, html });
};

/**
 * 4. Citizen Escalation — Admin Notification Email
 *    Sent to the municipal admin when a citizen raises a complaint on an overdue application.
 */
const sendEscalationEmail = async (application) => {
  // Notify admin / system mailbox
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin@municipal.gov';
  const applicantName = getCitizenApplicantName(application);
  const slaDeadlineStr = application.slaDeadline
    ? new Date(application.slaDeadline).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Passed standard turnaround window';
  const escalatedOnStr = application.escalatedAt
    ? new Date(application.escalatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Now';

  const subject = `Citizen Complaint Raised — Application ${application.applicationNumber} Requires Attention`;

  const contentHtml = `
    <p>A citizen has raised a formal escalation / complaint regarding a delayed application.</p>
    <table class="details-table">
      <tr><td class="label">Application Number:</td><td class="value"><strong>${application.applicationNumber}</strong></td></tr>
      <tr><td class="label">Certificate Type:</td><td class="value">${application.certificateType} Certificate</td></tr>
      <tr><td class="label">Applicant Name:</td><td class="value">${applicantName}</td></tr>
      <tr><td class="label">Application Status:</td><td class="value">${application.status}</td></tr>
      <tr><td class="label">SLA Deadline (Breached):</td><td class="value">${slaDeadlineStr}</td></tr>
      <tr><td class="label">Complaint Raised On:</td><td class="value">${escalatedOnStr}</td></tr>
      <tr><td class="label">Escalation Status:</td><td class="value"><span class="badge badge-escalated">PENDING REVIEW</span></td></tr>
      ${application.escalationReason ? `<tr><td class="label">Reason:</td><td class="value">${application.escalationReason}</td></tr>` : ''}
      ${application.escalationDescription ? `<tr><td class="label">Description:</td><td class="value">${application.escalationDescription}</td></tr>` : ''}
    </table>
  `;

  const highlightBoxHtml = `
    <div class="highlight-box" style="border-left-color: #c53030; background-color: #fff5f5;">
      <strong>Action Required:</strong>
      <p style="margin: 5px 0 0 0; font-size: 13px;">
        Please review this application and update the escalation status. This application has exceeded the expected SLA processing time.
      </p>
    </div>
  `;

  const text = `
CITIZEN COMPLAINT RAISED — Action Required

Application Number: ${application.applicationNumber}
Certificate Type: ${application.certificateType}
Applicant: ${applicantName}
Status: ${application.status}
SLA Deadline (Breached): ${slaDeadlineStr}
Complaint Raised On: ${escalatedOnStr}
Reason: ${application.escalationReason || 'N/A'}
Description: ${application.escalationDescription || 'N/A'}

Please review this application and take appropriate action.

Municipal Civil Registration Department
  `.trim();

  const html = buildHtmlTemplate({
    title: 'Citizen Escalation / Complaint — Admin Notification',
    contentHtml,
    highlightBoxHtml,
  });

  return await sendEmail({ to: adminEmail, subject, text, html });
};

/**
 * 5. Certificate Reissue Notification Email
 *
 * @param {Object} application - Updated application document with new certificate
 * @param {Object} reissueInfo - { previousCertificateNumber, previousVersion, reason, newCertificateNumber, newVersion }
 * @param {Buffer|null} pdfBuffer - Optional PDF buffer of the new certificate for attachment
 */
const sendReissueEmail = async (application, reissueInfo, pdfBuffer = null) => {
  const recipientEmail = getCitizenRecipientEmail(application);
  const applicantName = getCitizenApplicantName(application);

  const issuedDateStr = application.certificateIssuedAt
    ? new Date(application.certificateIssuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const subject = `Certificate Reissued Successfully — ${application.applicationNumber}`;

  const contentHtml = `
    <p>Dear <strong>${applicantName}</strong>,</p>
    <p>Your municipal certificate has been successfully <strong style="color: #2b6cb0;">reissued</strong>. The previous certificate has been formally revoked and replaced with a new certificate.</p>
    <table class="details-table">
      <tr><td class="label">Application Number:</td><td class="value"><strong>${application.applicationNumber}</strong></td></tr>
      <tr><td class="label">Certificate Type:</td><td class="value">${application.certificateType} Certificate</td></tr>
      <tr style="background-color: #fff5f5;"><td class="label">Previous Certificate:</td><td class="value"><span style="text-decoration: line-through; color: #c53030;">${reissueInfo.previousCertificateNumber}</span></td></tr>
      <tr style="background-color: #fff5f5;"><td class="label">Previous Certificate Status:</td><td class="value"><span class="badge badge-rejected">REVOKED</span></td></tr>
      <tr style="background-color: #f0fff4;"><td class="label">New Certificate Number:</td><td class="value"><strong style="color: #22543d;">${reissueInfo.newCertificateNumber}</strong></td></tr>
      <tr style="background-color: #f0fff4;"><td class="label">New Certificate Status:</td><td class="value"><span class="badge badge-approved">ACTIVE</span></td></tr>
      <tr><td class="label">Certificate Version:</td><td class="value">Version ${reissueInfo.newVersion}</td></tr>
      <tr><td class="label">Reason for Reissue:</td><td class="value">${reissueInfo.reason || 'Administrative reissue'}</td></tr>
      <tr><td class="label">Issue Date:</td><td class="value">${issuedDateStr}</td></tr>
    </table>
  `;

  const highlightBoxHtml = `
    <div class="highlight-box" style="border-left-color: #3182ce; background-color: #ebf8ff;">
      <strong>Your New Certificate is Now Active:</strong>
      <p style="margin: 5px 0 0 0; font-size: 13px;">
        Your new certificate is now the active certificate associated with this application. The previous certificate (<strong>${reissueInfo.previousCertificateNumber}</strong>) has been revoked and is no longer valid. You can verify the new certificate using the QR code provided on the certificate or through the Municipal Citizen Portal.
      </p>
    </div>
  `;

  const text = `
Dear ${applicantName},

Your municipal certificate has been successfully reissued.

Application Number: ${application.applicationNumber}

Previous Certificate Number: ${reissueInfo.previousCertificateNumber}
Previous Certificate Status: REVOKED

New Certificate Number: ${reissueInfo.newCertificateNumber}
Certificate Version: Version ${reissueInfo.newVersion}
New Certificate Status: ACTIVE

Reason for Reissue: ${reissueInfo.reason || 'Administrative reissue'}

Issue Date: ${issuedDateStr}

Your new certificate is now the active certificate associated with this application.

You can verify the certificate using the QR code provided on the certificate.

Regards,
Municipal Civil Registration System
  `.trim();

  const html = buildHtmlTemplate({
    title: 'Certificate Reissued Successfully',
    contentHtml,
    highlightBoxHtml,
  });

  // Prepare optional PDF attachment
  const attachments = [];
  if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
    attachments.push({
      filename: `${reissueInfo.newCertificateNumber || application.applicationNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  return await sendEmail({ to: recipientEmail, subject, text, html, attachments: attachments.length > 0 ? attachments : undefined });
};

/**
 * 6. Application Correction Required Email
 *
 * @param {Object} application
 * @param {Object} correctionRequest - { reason, items: [{ type, field, label, instruction }] }
 */
const sendCorrectionRequiredEmail = async (application, correctionRequest) => {
  const recipientEmail = getCitizenRecipientEmail(application);
  const applicantName = getCitizenApplicantName(application);

  const subject = `Action Required: Application Correction Requested — ${application.applicationNumber}`;

  const itemsList = (correctionRequest.items || [])
    .map((item) => `<li><strong>${item.label}</strong> (${item.type === 'DOCUMENT' ? 'Supporting Document' : 'Field'})${item.instruction ? `: ${item.instruction}` : ''}</li>`)
    .join('');

  const contentHtml = `
    <p>Dear <strong>${applicantName}</strong>,</p>
    <p>A municipal verification officer has reviewed your application for a <strong>${application.certificateType} Certificate</strong> and determined that specific information or documents require correction before your application can be processed.</p>
    <table class="details-table">
      <tr><td class="label">Application Number:</td><td class="value"><strong>${application.applicationNumber}</strong></td></tr>
      <tr><td class="label">Certificate Type:</td><td class="value">${application.certificateType} Certificate</td></tr>
      <tr><td class="label">Status:</td><td class="value"><span class="badge badge-pending" style="background-color: #feebc8; color: #7b341e;">CORRECTION REQUIRED</span></td></tr>
      <tr><td class="label">Officer Reason:</td><td class="value" style="color: #c53030; font-weight: 600;">${correctionRequest.reason || 'Correction requested by officer'}</td></tr>
    </table>
    <div style="margin: 15px 0;">
      <h4 style="font-size: 14px; margin-bottom: 8px; color: #2d3748;">Requested Correction Item(s):</h4>
      <ul style="padding-left: 20px; font-size: 14px; color: #4a5568;">
        ${itemsList || '<li>Please review your application in the Citizen Portal</li>'}
      </ul>
    </div>
  `;

  const highlightBoxHtml = `
    <div class="highlight-box" style="border-left-color: #dd6b20; background-color: #fffaf0;">
      <strong>Action Required:</strong>
      <p style="margin: 5px 0 0 0; font-size: 13px;">
        Please log in to your Municipal Citizen Portal, open application <strong>${application.applicationNumber}</strong>, make the requested correction(s), and resubmit. Only the requested items need to be updated.
      </p>
    </div>
  `;

  const text = `
Dear ${applicantName},

Correction has been requested for your application: ${application.applicationNumber} (${application.certificateType} Certificate).

Status: CORRECTION REQUIRED
Officer Reason: ${correctionRequest.reason || 'Correction requested by officer'}

Requested Items:
${(correctionRequest.items || []).map((i) => `- ${i.label} (${i.type}): ${i.instruction || 'Please update'}`).join('\n')}

Please log in to the Municipal Citizen Portal to make the requested changes and resubmit your application.

Municipal Civil Registration Department
  `.trim();

  const html = buildHtmlTemplate({
    title: 'Application Correction Required',
    contentHtml,
    highlightBoxHtml,
  });

  return await sendEmail({ to: recipientEmail, subject, text, html });
};

/**
 * 7. Application Correction Resubmitted Confirmation Email
 *
 * @param {Object} application
 */
const sendResubmissionConfirmationEmail = async (application) => {
  const recipientEmail = getCitizenRecipientEmail(application);
  const applicantName = getCitizenApplicantName(application);

  const subject = `Application Resubmitted Successfully — ${application.applicationNumber}`;

  const resubmittedDateStr = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  const contentHtml = `
    <p>Dear <strong>${applicantName}</strong>,</p>
    <p>Your corrections for application <strong>${application.applicationNumber}</strong> have been successfully received. The application has been resubmitted and returned to the municipal verification desk for officer review.</p>
    <table class="details-table">
      <tr><td class="label">Application Number:</td><td class="value"><strong>${application.applicationNumber}</strong></td></tr>
      <tr><td class="label">Certificate Type:</td><td class="value">${application.certificateType} Certificate</td></tr>
      <tr><td class="label">Current Status:</td><td class="value"><span class="badge badge-pending" style="background-color: #bee3f8; color: #2b6cb0;">UNDER REVIEW (RESUBMITTED)</span></td></tr>
      <tr><td class="label">Resubmission Date:</td><td class="value">${resubmittedDateStr}</td></tr>
    </table>
  `;

  const highlightBoxHtml = `
    <div class="highlight-box" style="border-left-color: #3182ce; background-color: #ebf8ff;">
      <strong>Next Steps:</strong>
      <p style="margin: 5px 0 0 0; font-size: 13px;">
        A municipal verification officer will review your updated information/documents. You will receive an email update once the verification decision is made.
      </p>
    </div>
  `;

  const text = `
Dear ${applicantName},

Your corrections for application ${application.applicationNumber} (${application.certificateType} Certificate) have been successfully resubmitted.

Status: UNDER REVIEW (RESUBMITTED)
Resubmission Date: ${resubmittedDateStr}

A municipal officer will review your updated records.

Municipal Civil Registration Department
  `.trim();

  const html = buildHtmlTemplate({
    title: 'Application Correction Resubmitted',
    contentHtml,
    highlightBoxHtml,
  });

  return await sendEmail({ to: recipientEmail, subject, text, html });
};

module.exports = {
  getCitizenRecipientEmail,
  getCitizenApplicantName,
  sendEmail,
  sendSubmissionEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendEscalationEmail,
  sendReissueEmail,
  sendCorrectionRequiredEmail,
  sendResubmissionConfirmationEmail,
};
