require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const seedInitialUsers = require('./seed');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const officerRoutes = require('./routes/officerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const certificateRoutes = require('./routes/certificateRoutes');

const path = require('path');

const app = express();

// Middleware

// Build the list of allowed CORS origins.
// In development: localhost variants are always included.
// In production: set the CLIENT_URL environment variable to the deployed
//   frontend URL (e.g. https://your-app.vercel.app) — it will be added
//   automatically. Never use origin:'*' because credentials are enabled.
const buildAllowedOrigins = () => {
  const origins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  if (process.env.CLIENT_URL) {
    origins.push(process.env.CLIENT_URL.trim());
  }
  return origins;
};

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = buildAllowedOrigins();
      // Allow server-to-server / same-origin requests where origin is undefined
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin '${origin}' is not permitted.`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static assets (e.g. municipal illustrations, public documents)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Connect Database & Seed Default Accounts
connectDB().then(() => {
  seedInitialUsers();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    system: 'Smart Municipal Birth and Death Certificate Lifecycle and Archive Management System',
    timestamp: new Date().toISOString(),
  });
});

// Mount Application API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/certificates', certificateRoutes);

// 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Global Server Error]:', err.stack || err.message);

  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`==========================================================`);
  console.log(`[Municipal Server] Backend API Running on port ${PORT}`);
  console.log(`[Municipal Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==========================================================`);
});

module.exports = app;
