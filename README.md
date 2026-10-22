# Smart Municipal Birth and Death Certificate Lifecycle and Archive Management System

## Project Overview

The Smart Municipal Birth and Death Certificate Lifecycle and Archive Management System is a web-based e-Governance application designed to digitize civil registration, simplify certificate processing, support officer verification, and maintain a searchable digital archive.

The system provides separate portals for citizens, municipal officers, and administrators, with role-based access control and secure certificate verification.

## Key Features

- **Citizen Portal:** Citizen registration, birth and death certificate applications, document uploads, application tracking, and certificate downloads.
- **Officer Verification Desk:** Application review, document inspection, duplicate detection, approval, rejection, and correction requests.
- **Admin Console:** Officer account management, application statistics, digital archive search, and audit trail inspection.
- **Application Lifecycle Management:** Application numbering, status tracking, SLA monitoring, correction and resubmission workflows.
- **Digital Certificates:** PDF certificate generation, QR-code verification, certificate integrity checks, and reissue support.
- **Security:** JWT authentication, role-based authorization, password hashing, protected documents, and audit logging.
- **Email Notifications:** Application submission, approval, rejection, and other supported lifecycle notifications.

## Technology Stack

**Frontend**
- React.js with Create React App
- JavaScript
- Bootstrap 5 and Bootstrap Icons
- React Router DOM
- Axios

**Backend**
- Node.js
- Express.js
- Mongoose
- MongoDB
- Multer
- bcryptjs and JSON Web Tokens
- PDFKit and QRCode

## Project Structure

```text
project-root/
├── client/       # React frontend
├── server/       # Express backend
├── package.json  # Root-level scripts
├── README.md
└── .gitignore
```

## Prerequisites

- Node.js and npm
- MongoDB
- Git

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/Kowsalya0936/Integrated-Municipal-Civil-Registration-and-Digital-Archive-Management-System.git
cd Integrated-Municipal-Civil-Registration-and-Digital-Archive-Management-System
```

### 2. Install frontend dependencies

```bash
cd client
npm install
```

### 3. Install backend dependencies

Open another terminal from the project root and run:

```bash
cd server
npm install
```

### 4. Configure environment variables

Create a local `server/.env` file using the variables required by the backend. Configure the MongoDB connection, JWT secret, and SMTP settings where applicable.

Do not commit `.env` files or credentials to GitHub.

### 5. Start the backend

From the `server` directory:

```bash
npm start
```

### 6. Start the frontend

From the `client` directory, open another terminal and run:

```bash
npm start
```

Use the local URLs printed by the development servers.

## Database

The application uses MongoDB to store user accounts, civil registration applications, certificate metadata, and audit records.

Configure the database connection through the backend environment settings.

## Security and Privacy

- Do not commit passwords, API keys, JWT secrets, or SMTP credentials.
- Do not upload real citizens' documents or private application data to the repository.
- Create authorized accounts using the application's supported account setup process.
- Change any development credentials before deployment.

## License

This project is developed for academic and educational purposes.