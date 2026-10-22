import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyCertificate from './pages/VerifyCertificate';
import TrackApplication from './pages/TrackApplication';

// Citizen Pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import ApplyBirthCertificate from './pages/citizen/ApplyBirthCertificate';
import ApplyDeathCertificate from './pages/citizen/ApplyDeathCertificate';
import MyApplications from './pages/citizen/MyApplications';
import CitizenApplicationDetails from './pages/citizen/CitizenApplicationDetails';
import MyCertificates from './pages/citizen/MyCertificates';
import CitizenProfile from './pages/citizen/CitizenProfile';

// Officer Pages
import OfficerDashboard from './pages/officer/OfficerDashboard';
import OfficerApplicationDetails from './pages/officer/OfficerApplicationDetails';
import OfficerProfile from './pages/officer/OfficerProfile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import DigitalArchive from './pages/admin/DigitalArchive';
import AuditLogs from './pages/admin/AuditLogs';
import AdminReports from './pages/admin/AdminReports';

// Role-aware profile redirect helper
const ProfileRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'officer') return <Navigate to="/officer/profile" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/citizen/profile" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="d-flex flex-column min-vh-100 bg-light">
          <Navbar />
          <main className="flex-grow-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify" element={<VerifyCertificate />} />
              <Route path="/verify/:identifier" element={<VerifyCertificate />} />
              <Route path="/track-application" element={<TrackApplication />} />
              <Route path="/track-application/:number" element={<TrackApplication />} />
              <Route path="/track" element={<Navigate to="/track-application" replace />} />

              {/* Citizen Protected Routes */}
              <Route
                path="/citizen/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['citizen']}>
                    <CitizenDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/apply"
                element={<Navigate to="/citizen/apply/birth" replace />}
              />
              <Route
                path="/citizen/apply/birth"
                element={
                  <ProtectedRoute allowedRoles={['citizen']}>
                    <ApplyBirthCertificate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/apply/death"
                element={
                  <ProtectedRoute allowedRoles={['citizen']}>
                    <ApplyDeathCertificate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/applications"
                element={
                  <ProtectedRoute allowedRoles={['citizen']}>
                    <MyApplications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/applications/:id"
                element={
                  <ProtectedRoute allowedRoles={['citizen']}>
                    <CitizenApplicationDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/certificates"
                element={
                  <ProtectedRoute allowedRoles={['citizen']}>
                    <MyCertificates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/citizen/profile"
                element={
                  <ProtectedRoute allowedRoles={['citizen']}>
                    <CitizenProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={<ProfileRedirect />}
              />

              {/* Officer Protected Routes */}
              <Route
                path="/officer/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['officer']}>
                    <OfficerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/officer/profile"
                element={
                  <ProtectedRoute allowedRoles={['officer']}>
                    <OfficerProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/officer/applications/:id"
                element={
                  <ProtectedRoute allowedRoles={['officer']}>
                    <OfficerApplicationDetails />
                  </ProtectedRoute>
                }
              />

              {/* Admin Protected Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManageUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/archive"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'officer']}>
                    <DigitalArchive />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
