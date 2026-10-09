# Smart Municipal Birth and Death Certificate Lifecycle and Archive Management System

An integrated, enterprise-grade e-Governance municipal web application for digital civil registration, lifecycle tracking, officer verification, digital archive repository, and tamper-proof QR code certificate issuance.

---

## 🏛️ System Features & Highlights

1. **Role-Based Architecture (3 Dedicated Portals):**
   - **Citizen Portal:** Register, login, apply for Birth & Death certificates, upload supporting records (PDF/JPG/PNG &le; 5MB), track real-time verification stages, view officer rejection notes, and download official PDF certificates.
   - **Officer Verification Desk:** Review incoming queue, filter by type/status/date, inspect citizen documents via secure modal viewer, evaluate duplicate detection flags, approve with automated certificate numbering, or reject with mandatory reason.
   - **Admin Console:** Real-time MongoDB statistical aggregations, officer account provisioning with bcrypt hashing, account activation controls, immutable audit trail inspection, and digital archive search.

2. **Core Certificate Lifecycle:**
   - **Form 1: Birth Registration:** Child details, parents info, institutional/hospital data, permanent residence, document attachments, and legal declaration.
   - **Form 2: Death Registration:** Deceased person details, family info, hospital cause of death, informant identification, document attachments, and declaration.
   - **Atomic Concurrency Numbering:** Database-backed sequence counters guaranteeing unique application numbers (`BIRTH-YYYY-XXXXX`, `DEATH-YYYY-XXXXX`) and certificate numbers (`MC-BIRTH-YYYY-XXXXX`, `MC-DEATH-YYYY-XXXXX`).

3. **Security & Governance:**
   - JWT authentication with secure HTTP Authorization headers.
   - Strict backend role authorization middleware preventing unauthorized operations.
   - Restricted document access: files are securely streamed only to the applicant citizen, authorized officer, or admin.
   - Immutable audit logging tracking user logins, registrations, application submissions, review decisions, certificate downloads, and officer creation.

4. **Digital Archive & QR Verification:**
   - High-fidelity PDF certificate generation using PDFKit featuring municipal emblem, borders, digital signature authorization, and scannable QR verification code.
   - Public QR verification portal allowing instant authenticity checks against the municipal repository.
   - Automated 48-Hour SLA tracking with critical and overdue escalation indicators.
   - Real-time duplicate registration suspect detection.

---

## 🚀 Technology Stack

- **Frontend:** React.js (CRA 5.1.0, JavaScript `.js`), Bootstrap 5, Bootstrap Icons, React Router DOM v6, Axios
- **Backend:** Node.js (v18.17.1), Express.js, Mongoose 8, Multer, bcryptjs, jsonwebtoken, PDFKit, QRCode
- **Database:** MongoDB (Local instance `mongodb://127.0.0.1:27017/municipal_civil_reg_db`)

---

## 🔑 Default Seed Accounts & Credentials

| Role | Email | Password | Portal Features |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@example.com` | `CitizenPassword@123` | Apply Birth/Death, Track Status, Download PDF |
| **Officer** | `officer@municipal.gov` | `OfficerPassword@123` | Verification Desk, Document Inspection, Approve/Reject |
| **Admin** | `admin@municipal.gov` | `AdminPassword@123` | Analytics, Manage Officers, Digital Archive, Audit Trail |

---



