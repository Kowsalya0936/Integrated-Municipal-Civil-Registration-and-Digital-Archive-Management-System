import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const OfficerProfile = () => {
  const { user } = useAuth();

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || '',
    role: user?.role || 'officer',
    department: user?.department || '',
    employeeId: user?.employeeId || '',
    designation: user?.designation || '',
    jurisdictionAddress: user?.jurisdictionAddress || '',
    isActive: user?.isActive !== false,
    _id: user?._id || '',
    createdAt: user?.createdAt || '',
    updatedAt: user?.updatedAt || '',
  });

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    overdueCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch fresh profile data and operational stats from backend
  useEffect(() => {
    const fetchRegistrarProfile = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. Fetch authenticated user profile
        const profileRes = await api.get('/auth/profile');
        if (profileRes.data && profileRes.data.user) {
          const u = profileRes.data.user;
          setProfileData({
            name: u.name || '',
            email: u.email || '',
            mobile: u.mobile || '',
            address: u.address || '',
            city: u.city || '',
            state: u.state || '',
            pincode: u.pincode || '',
            role: u.role || 'officer',
            department: u.department || 'Birth & Death Civil Registration Desk',
            employeeId: u.employeeId || '',
            designation: u.designation || 'Registrar (Civil Registration Officer)',
            jurisdictionAddress: u.jurisdictionAddress || '',
            isActive: u.isActive !== false,
            _id: u._id || '',
            createdAt: u.createdAt || '',
            updatedAt: u.updatedAt || '',
          });
        }

        // 2. Fetch operational queue stats
        const queueRes = await api.get('/officer/applications');
        if (queueRes.data && queueRes.data.stats) {
          setStats({
            total: queueRes.data.stats.total || 0,
            pending: queueRes.data.stats.pending || 0,
            approved: queueRes.data.stats.approved || 0,
            overdueCount: queueRes.data.stats.overdueCount || 0,
          });
        }
      } catch (err) {
        console.error('[Registrar Profile Fetch Error]:', err);
        setError('Unable to load official registrar details from the server.');
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrarProfile();
  }, []);

  // Initials generator for avatar
  const getInitials = (name) => {
    if (!name) return 'RG';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const officerName = profileData.name || user?.name || 'Registrar';
  const displayEmployeeId = profileData.employeeId || (profileData._id ? `REG-${profileData._id.toString().slice(-6).toUpperCase()}` : 'REG-OFFICER');
  const displayDesignation = profileData.designation || 'Registrar (Civil Registration Officer)';

  return (
    <div className="officer-dashboard-page py-4">
      <div className="container-fluid px-3 px-xl-4">
        <div className="row g-4">
          {/* ── Left Sidebar ── */}
          <div className="col-12 col-lg-3 col-xl-2">
            <div className="officer-sidebar">
              {/* Profile Card Header */}
              <div className="d-flex align-items-center gap-3 officer-sidebar-profile mb-2">
                <div className="officer-avatar-circle">
                  <i className="bi bi-person-fill fs-4"></i>
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.98rem' }}>
                    {officerName}
                  </div>
                  <div className="text-muted small text-truncate" style={{ fontSize: '0.8rem' }}>
                    {displayDesignation}
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <ul className="officer-sidebar-nav">
                <li>
                  <Link to="/officer/dashboard" className="officer-nav-item">
                    <i className="bi bi-house-door"></i>
                    <span>Dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link to="/officer/dashboard#application-queue" className="officer-nav-item">
                    <i className="bi bi-file-earmark-text"></i>
                    <span>Application Queue</span>
                  </Link>
                </li>
                <li>
                  <Link to="/admin/archive" className="officer-nav-item">
                    <i className="bi bi-search"></i>
                    <span>Digital Archive Search</span>
                  </Link>
                </li>
                <li>
                  <Link to="/officer/profile" className="officer-nav-item active">
                    <i className="bi bi-person-fill"></i>
                    <span>Profile</span>
                  </Link>
                </li>
              </ul>

              {/* Subtle Dome Watermark at bottom of sidebar on desktop */}
              <div className="sidebar-watermark-wrapper d-none d-lg-block" aria-hidden="true">
                <img src="/assets/homepage.png" alt="" className="sidebar-watermark-img" />
              </div>
            </div>
          </div>

          {/* ── Main Profile Content ── */}
          <div className="col-12 col-lg-9 col-xl-10">
            {/* Breadcrumb Navigation */}
            <nav aria-label="breadcrumb" className="mb-3">
              <ol className="breadcrumb small mb-0">
                <li className="breadcrumb-item">
                  <Link to="/officer/dashboard" className="text-decoration-none text-primary fw-semibold">
                    <i className="bi bi-house-door me-1"></i> Dashboard
                  </Link>
                </li>
                <li className="breadcrumb-item active text-muted" aria-current="page">
                  Registrar Profile
                </li>
              </ol>
            </nav>

            {error && <div className="alert alert-danger py-2 small mb-4">{error}</div>}

            {/* 1. Profile Header Card */}
            <div
              className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #0f2b5c 0%, #1e4b8a 100%)',
                color: '#ffffff',
              }}
            >
              <div className="card-body p-4 p-md-5 position-relative">
                <div className="row align-items-center g-4">
                  {/* Avatar Initials */}
                  <div className="col-auto">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center shadow"
                      style={{
                        width: '88px',
                        height: '88px',
                        backgroundColor: '#ffffff',
                        color: '#0f2b5c',
                        fontSize: '2.1rem',
                        fontWeight: '800',
                        border: '3px solid #f59e0b',
                      }}
                    >
                      {getInitials(officerName)}
                    </div>
                  </div>

                  {/* Header Details */}
                  <div className="col">
                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                      <h2 className="fw-bold mb-0 text-white" style={{ fontSize: '1.9rem' }}>
                        {officerName}
                      </h2>
                      <span
                        className="badge bg-warning text-dark px-2.5 py-1 rounded-pill fw-bold"
                        style={{ fontSize: '0.74rem' }}
                      >
                        <i className="bi bi-patch-check-fill me-1"></i> {displayDesignation}
                      </span>
                      {profileData.isActive ? (
                        <span
                          className="badge bg-success px-2.5 py-1 rounded-pill text-white fw-semibold"
                          style={{ fontSize: '0.74rem' }}
                        >
                          <i className="bi bi-check-circle-fill me-1"></i> Active Account
                        </span>
                      ) : (
                        <span
                          className="badge bg-danger px-2.5 py-1 rounded-pill text-white fw-semibold"
                          style={{ fontSize: '0.74rem' }}
                        >
                          <i className="bi bi-x-circle-fill me-1"></i> Deactivated Account
                        </span>
                      )}
                      <span
                        className="badge bg-white bg-opacity-25 text-white px-2.5 py-1 rounded-pill fw-semibold"
                        style={{ fontSize: '0.74rem' }}
                      >
                        <i className="bi bi-lock-fill me-1"></i> Admin-Managed Profile
                      </span>
                    </div>

                    <div className="text-light opacity-90 small d-flex flex-wrap gap-3 mt-2">
                      <span>
                        <i className="bi bi-person-badge me-1 text-warning"></i>
                        ID: <strong className="text-white">{displayEmployeeId}</strong>
                      </span>
                      <span>
                        <i className="bi bi-envelope me-1 text-warning"></i>
                        {profileData.email}
                      </span>
                      <span>
                        <i className="bi bi-telephone me-1 text-warning"></i>
                        {profileData.mobile}
                      </span>
                      {profileData.createdAt && (
                        <span>
                          <i className="bi bi-calendar3 me-1 text-warning"></i>
                          Assigned on{' '}
                          {new Date(profileData.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Button to Dashboard */}
                  <div className="col-12 col-md-auto text-md-end">
                    <Link
                      to="/officer/dashboard"
                      className="btn btn-warning text-dark fw-bold px-4 py-2 rounded-3 shadow-sm d-inline-flex align-items-center"
                      style={{ fontSize: '0.9rem' }}
                    >
                      <i className="bi bi-arrow-left me-1.5"></i> Back to Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin-Managed Read-Only Information Banner */}
            <div
              className="alert border-0 rounded-4 p-3 mb-4 d-flex align-items-start gap-3 shadow-sm"
              style={{
                backgroundColor: '#e0f2fe',
                borderLeft: '4px solid #0284c7',
                color: '#0369a1',
              }}
            >
              <i className="bi bi-shield-lock-fill fs-4 text-primary flex-shrink-0 mt-1"></i>
              <div className="small">
                <div className="fw-bold text-dark" style={{ fontSize: '0.92rem' }}>
                  Admin-Provisioned Account Notice
                </div>
                <div className="text-secondary mt-0.5">
                  Registrar accounts are centrally created and managed by the Municipal System Administrator.
                  Designation, jurisdictional offices, contact numbers, and security credentials reflect official
                  administrative records and are presented in <strong>Read-Only mode</strong>.
                </div>
              </div>
            </div>

            {/* 2. Operational Desk Summary (4 Cards) */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h6 className="fw-bold text-dark mb-0">
                      <i className="bi bi-speedometer2 text-primary me-2"></i>
                      Assigned Verification Desk Overview
                    </h6>
                    <div className="text-muted small">Live operational status for this Registrar desk</div>
                  </div>
                  <Link
                    to="/officer/dashboard"
                    className="btn btn-sm btn-outline-primary rounded-3 px-3 fw-semibold"
                    style={{ fontSize: '0.82rem' }}
                  >
                    Open Verification Queue &rarr;
                  </Link>
                </div>

                <div className="row g-3">
                  <div className="col-6 col-md-3">
                    <div className="p-3 rounded-3" style={{ backgroundColor: '#f0f9ff' }}>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                        Total in Queue
                      </div>
                      <div className="fs-3 fw-bold text-primary lh-1 mt-1">
                        {loading ? '...' : stats.total}
                      </div>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="p-3 rounded-3" style={{ backgroundColor: '#fefce8' }}>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                        Pending Review
                      </div>
                      <div className="fs-3 fw-bold text-warning lh-1 mt-1">
                        {loading ? '...' : stats.pending}
                      </div>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="p-3 rounded-3" style={{ backgroundColor: '#f0fdf4' }}>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                        Approved Records
                      </div>
                      <div className="fs-3 fw-bold text-success lh-1 mt-1">
                        {loading ? '...' : stats.approved}
                      </div>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="p-3 rounded-3" style={{ backgroundColor: '#fef2f2' }}>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                        SLA Overdue
                      </div>
                      <div className="fs-3 fw-bold text-danger lh-1 mt-1">
                        {loading ? '...' : stats.overdueCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Detailed Profile Sections */}
            <div className="row g-4">
              {/* Card 1: Official Details */}
              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
                  <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold text-dark mb-0">
                        <i className="bi bi-briefcase text-primary me-2"></i> Official Details
                      </h6>
                      <span className="text-muted small">Administrative designation and posting</span>
                    </div>
                    <span
                      className="badge bg-light text-secondary border px-2.5 py-1 rounded-pill fw-semibold"
                      style={{ fontSize: '0.72rem' }}
                    >
                      <i className="bi bi-lock-fill me-1"></i> Read-Only
                    </span>
                  </div>

                  <div className="card-body p-4">
                    <div className="mb-3 pb-3 border-bottom">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small fw-semibold">Employee / Registrar ID</span>
                        <span className="badge bg-light text-primary border px-2 py-0.5 rounded fw-bold">
                          {displayEmployeeId}
                        </span>
                      </div>
                      <div className="small text-secondary mt-1">
                        System Reference ID: <code>{profileData._id || 'N/A'}</code>
                      </div>
                    </div>

                    <div className="mb-3 pb-3 border-bottom">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small fw-semibold">Official Designation</span>
                        <span className="badge bg-light text-dark border px-2 py-0.5 rounded">
                          <i className="bi bi-lock me-1 text-muted"></i> Read-Only
                        </span>
                      </div>
                      <div className="fw-bold text-dark mt-1">{displayDesignation}</div>
                    </div>

                    <div className="mb-3 pb-3 border-bottom">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small fw-semibold">Assigned Department</span>
                        <span className="badge bg-light text-dark border px-2 py-0.5 rounded">
                          <i className="bi bi-lock me-1 text-muted"></i> Read-Only
                        </span>
                      </div>
                      <div className="fw-bold text-dark mt-1">
                        {profileData.department || 'Not assigned'}
                      </div>
                    </div>

                    <div className="mb-3 pb-3 border-bottom">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small fw-semibold">Municipality / District</span>
                        <span className="badge bg-light text-dark border px-2 py-0.5 rounded">
                          <i className="bi bi-lock me-1 text-muted"></i> Read-Only
                        </span>
                      </div>
                      <div className="fw-bold text-dark mt-1">
                        {profileData.city || 'Not assigned'}
                      </div>
                    </div>

                    <div className="mb-3 pb-3 border-bottom">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small fw-semibold">Assigned Office Location</span>
                        <span className="badge bg-light text-dark border px-2 py-0.5 rounded">
                          <i className="bi bi-lock me-1 text-muted"></i> Read-Only
                        </span>
                      </div>
                      <div className="fw-bold text-dark mt-1">
                        {profileData.address || 'Not assigned'}
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small fw-semibold">State &amp; Postal PIN Code</span>
                        <span className="badge bg-light text-dark border px-2 py-0.5 rounded">
                          <i className="bi bi-lock me-1 text-muted"></i> Read-Only
                        </span>
                      </div>
                      <div className="fw-bold text-dark mt-1">
                        {profileData.state || 'Not assigned'} — {profileData.pincode || 'Not assigned'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Contact Information */}
              <div className="col-12 col-lg-6">
                <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
                  <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold text-dark mb-0">
                        <i className="bi bi-person-lines-fill text-primary me-2"></i> Contact Information
                      </h6>
                      <span className="text-muted small">Registered official contact records</span>
                    </div>
                    <span
                      className="badge bg-light text-secondary border px-2.5 py-1 rounded-pill fw-semibold"
                      style={{ fontSize: '0.72rem' }}
                    >
                      <i className="bi bi-lock-fill me-1"></i> Read-Only
                    </span>
                  </div>

                  <div className="card-body p-4">
                    <div className="mb-3 pb-3 border-bottom">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small fw-semibold">Official Registered Email</span>
                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-0.5 rounded fw-semibold">
                          <i className="bi bi-check-circle-fill me-1"></i> Verified Official
                        </span>
                      </div>
                      <div className="fw-bold text-dark mt-1 d-flex align-items-center gap-2">
                        <i className="bi bi-envelope text-primary"></i>
                        <span>{profileData.email}</span>
                      </div>
                      <div className="small text-muted mt-0.5">Used for administrative login and notifications</div>
                    </div>

                    <div className="mb-3 pb-3 border-bottom">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small fw-semibold">Official Mobile Number</span>
                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-0.5 rounded fw-semibold">
                          <i className="bi bi-check-circle-fill me-1"></i> Verified Mobile
                        </span>
                      </div>
                      <div className="fw-bold text-dark mt-1 d-flex align-items-center gap-2">
                        <i className="bi bi-telephone text-primary"></i>
                        <span>{profileData.mobile}</span>
                      </div>
                      <div className="small text-muted mt-0.5">Registered contact for official inquiries</div>
                    </div>

                    <div className="mb-3 pb-3 border-bottom">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small fw-semibold">Jurisdictional Address</span>
                        <span className="badge bg-light text-dark border px-2 py-0.5 rounded">
                          <i className="bi bi-lock me-1 text-muted"></i> Read-Only
                        </span>
                      </div>
                      <div className="fw-bold text-dark mt-1">
                        {profileData.jurisdictionAddress ||
                          (profileData.address
                            ? `${profileData.address}, ${profileData.city || ''}, ${profileData.state || ''} - ${profileData.pincode || ''}`
                            : 'Not assigned')}
                      </div>
                    </div>

                    <div className="p-3 rounded-3" style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                      <div className="small text-secondary">
                        <i className="bi bi-info-circle me-1.5 text-primary"></i>
                        <strong>Need to update official contact details?</strong> Contact records are linked to your municipal
                        appointment. To update your phone number or transfer posting, please file a request with the
                        Municipal Administration Office.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Account & System Information */}
              <div className="col-12">
                <div className="card border-0 shadow-sm rounded-4 bg-white">
                  <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold text-dark mb-0">
                        <i className="bi bi-shield-check text-primary me-2"></i> Account &amp; System Information
                      </h6>
                      <span className="text-muted small">Security credentials and audit records</span>
                    </div>
                    <span
                      className="badge bg-light text-secondary border px-2.5 py-1 rounded-pill fw-semibold"
                      style={{ fontSize: '0.72rem' }}
                    >
                      <i className="bi bi-lock-fill me-1"></i> Read-Only
                    </span>
                  </div>

                  <div className="card-body p-4">
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <div className="p-3 rounded-3 border bg-light h-100">
                          <div className="text-muted small fw-semibold">System Username / Login ID</div>
                          <div className="fw-bold text-dark mt-1 text-truncate">{profileData.email}</div>
                          <div className="small text-secondary mt-1">Municipal Single-Sign-On</div>
                        </div>
                      </div>

                      <div className="col-12 col-md-4">
                        <div className="p-3 rounded-3 border bg-light h-100">
                          <div className="text-muted small fw-semibold">System Role &amp; Privileges</div>
                          <div className="fw-bold text-primary mt-1">Registrar (officer)</div>
                          <div className="small text-secondary mt-1">Certificate Review &amp; Approval Authority</div>
                        </div>
                      </div>

                      <div className="col-12 col-md-4">
                        <div className="p-3 rounded-3 border bg-light h-100">
                          <div className="text-muted small fw-semibold">Account Status</div>
                          {profileData.isActive ? (
                            <>
                              <div className="fw-bold text-success mt-1 d-flex align-items-center gap-1">
                                <i className="bi bi-check-circle-fill"></i> Active &amp; Authorized
                              </div>
                              <div className="small text-secondary mt-1">Full operational permissions</div>
                            </>
                          ) : (
                            <>
                              <div className="fw-bold text-danger mt-1 d-flex align-items-center gap-1">
                                <i className="bi bi-x-circle-fill"></i> Deactivated / Suspended
                              </div>
                              <div className="small text-secondary mt-1">Operational access restricted</div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="col-12 col-md-4">
                        <div className="p-3 rounded-3 border bg-light h-100">
                          <div className="text-muted small fw-semibold">Account Provisioned On</div>
                          <div className="fw-bold text-dark mt-1">
                            {profileData.createdAt
                              ? new Date(profileData.createdAt).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'System Initialization'}
                          </div>
                          <div className="small text-secondary mt-1">Admin creation timestamp</div>
                        </div>
                      </div>

                      <div className="col-12 col-md-4">
                        <div className="p-3 rounded-3 border bg-light h-100">
                          <div className="text-muted small fw-semibold">Last Record Modification</div>
                          <div className="fw-bold text-dark mt-1">
                            {profileData.updatedAt
                              ? new Date(profileData.updatedAt).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'N/A'}
                          </div>
                          <div className="small text-secondary mt-1">Database synchronization</div>
                        </div>
                      </div>

                      <div className="col-12 col-md-4">
                        <div className="p-3 rounded-3 border bg-light h-100">
                          <div className="text-muted small fw-semibold">Account Authority</div>
                          <div className="fw-bold text-dark mt-1">Municipal System Admin</div>
                          <div className="small text-secondary mt-1">Managed via Admin Console</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficerProfile;
