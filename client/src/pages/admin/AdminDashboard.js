import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import SlaIndicator from '../../components/SlaIndicator';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCitizens: 0,
    totalOfficers: 0,
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    birthCount: 0,
    deathCount: 0,
    overdueCount: 0,
    escalatedCount: 0,
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/stats');
      if (res.data) {
        if (res.data.stats) setStats(res.data.stats);
        if (res.data.recentApplications) setRecentApplications(res.data.recentApplications);
      }
    } catch (err) {
      console.error('[Admin Dashboard Error]:', err);
      setError('Unable to calculate administrative statistics from MongoDB.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Decorative background wave SVG for stat cards
  const renderWave = (color) => (
    <svg
      style={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: '55%',
        height: '70%',
        pointerEvents: 'none',
        opacity: 0.09,
        zIndex: 0,
        color,
      }}
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
    >
      <path d="M0,35 C30,15 70,55 100,20 L100,60 L0,60 Z" fill="currentColor" />
    </svg>
  );

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
                    {user?.name || 'Administrator'}
                  </div>
                  <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                    Administrator
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <ul className="officer-sidebar-nav">
                <li>
                  <Link to="/admin/dashboard" className="officer-nav-item active">
                    <i className="bi bi-house-door-fill"></i>
                    <span>Dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link to="/admin/users" className="officer-nav-item">
                    <i className="bi bi-person-plus-fill"></i>
                    <span>Manage Officers</span>
                  </Link>
                </li>
                <li>
                  <Link to="/admin/reports" className="officer-nav-item">
                    <i className="bi bi-graph-up-arrow"></i>
                    <span>Reports &amp; Analytics</span>
                  </Link>
                </li>
                <li>
                  <Link to="/admin/archive" className="officer-nav-item">
                    <i className="bi bi-archive-fill"></i>
                    <span>Digital Archive</span>
                  </Link>
                </li>
                {/* <li>
                  <Link to="/admin/users" className="officer-nav-item">
                    <i className="bi bi-people-fill"></i>
                    <span>User Directory</span>
                  </Link>
                </li> */}
                <li>
                  <Link to="/admin/audit-logs" className="officer-nav-item">
                    <i className="bi bi-shield-check"></i>
                    <span>System Audit Trail</span>
                  </Link>
                </li>
              </ul>

              {/* Subtle Dome Watermark at bottom of sidebar on desktop */}
              <div className="sidebar-watermark-wrapper d-none d-lg-block" aria-hidden="true">
                <img src="/assets/homepage.png" alt="" className="sidebar-watermark-img" />
              </div>
            </div>
          </div>

          {/* ── Main Dashboard Content ── */}
          <div className="col-12 col-lg-9 col-xl-10">

            {/* Welcome Banner */}
            <div className="officer-welcome-banner mb-4">
              <div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
                <div className="col-12 col-md-7 col-xl-8">
                  <div className="officer-console-tag mb-1">ADMIN CONSOLE</div>
                  <h1 className="officer-welcome-title mb-2">
                    Municipal Administrator &mdash;<br className="d-none d-md-block" /> Municipal System Administrator
                  </h1>
                  <p className="officer-welcome-desc mb-0">
                    Monitor registrations, manage officers, and ensure smooth municipal civil services.
                  </p>
                </div>
                <div className="col-12 col-md-5 col-xl-4 text-md-end mt-3 mt-md-0">
                  <div className="d-flex flex-wrap gap-2 justify-content-md-end">
                    {/* <Link to="/admin/users" className="btn-banner-gold d-inline-flex align-items-center">
                      <i className="bi bi-person-plus-fill me-1"></i> Manage Officers
                    </Link> */}
                    <button className="btn-banner-outline-blue d-inline-flex align-items-center" onClick={fetchAdminData}>
                      <i className="bi bi-arrow-clockwise me-1"></i> Refresh Stats
                    </button>
                  </div>
                </div>
              </div>
              {/* Decorative Municipal Architecture Illustration */}
              <div className="banner-illustration-box d-none d-lg-block" aria-hidden="true">
                <img src="/assets/homepage.png" alt="Municipal Building" className="banner-illustration-img" />
              </div>
            </div>

            {error && <div className="alert alert-danger py-2 small mb-4">{error}</div>}

            {/* ── Summary Cards (5 Metrics) ── */}
            <div className="row g-3 mb-4">

              {/* 1. Total Applications */}
              <div className="col-12 col-sm-6 col-xl">
                <Link
                  to="/admin/archive?status=all"
                  className="officer-stat-card text-decoration-none"
                  title="All Applications"
                >
                  <div className="d-flex align-items-center gap-3" style={{ zIndex: 1, position: 'relative' }}>
                    <div className="stat-icon-circle stat-blue-bg">
                      <i className="bi bi-file-earmark-text"></i>
                    </div>
                    <div>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                        Total Applications
                      </div>
                      <div className="fs-3 fw-bold text-dark lh-1 my-1">
                        {loading ? '...' : stats.totalApplications}
                      </div>
                      <div className="small text-muted" style={{ fontSize: '0.76rem' }}>
                        {stats.birthCount} Births &bull; {stats.deathCount} Deaths
                      </div>
                    </div>
                  </div>
                  <div
                    className="stat-arrow-pill flex-shrink-0"
                    style={{ backgroundColor: '#e0f2fe', color: '#0284c7', zIndex: 1, position: 'relative' }}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#0284c7')}
                </Link>
              </div>

              {/* 2. Pending / In-Review */}
              <div className="col-12 col-sm-6 col-xl">
                <Link
                  to="/admin/archive?status=pending"
                  className="officer-stat-card text-decoration-none"
                  title="Pending Applications"
                >
                  <div className="d-flex align-items-center gap-3" style={{ zIndex: 1, position: 'relative' }}>
                    <div className="stat-icon-circle stat-yellow-bg">
                      <i className="bi bi-clock-fill"></i>
                    </div>
                    <div>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                        Pending / In-Review
                      </div>
                      <div className="fs-3 fw-bold text-warning lh-1 my-1">
                        {loading ? '...' : stats.pendingApplications}
                      </div>
                      <div className="small text-muted" style={{ fontSize: '0.76rem' }}>
                        <i className="bi bi-clock-history me-1"></i>
                        {stats.overdueCount} SLA Overdue
                      </div>
                    </div>
                  </div>
                  <div
                    className="stat-arrow-pill flex-shrink-0"
                    style={{ backgroundColor: '#fef3c7', color: '#d97706', zIndex: 1, position: 'relative' }}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#d97706')}
                </Link>
              </div>

              {/* 3. Citizen Escalations */}
              <div className="col-12 col-sm-6 col-xl">
                <Link
                  to="/admin/archive?escalated=true"
                  className="officer-stat-card text-decoration-none"
                  title="Escalated Applications"
                >
                  <div className="d-flex align-items-center gap-3" style={{ zIndex: 1, position: 'relative' }}>
                    <div className="stat-icon-circle stat-red-bg">
                      <i className="bi bi-megaphone-fill"></i>
                    </div>
                    <div>
                      <div className="text-danger small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                        Citizen Escalations
                      </div>
                      <div className="fs-3 fw-bold text-danger lh-1 my-1">
                        {loading ? '...' : stats.escalatedCount}
                      </div>
                      <div className="small text-danger" style={{ fontSize: '0.76rem' }}>
                        <i className="bi bi-megaphone-fill me-1"></i> Citizen Complaints
                      </div>
                    </div>
                  </div>
                  <div
                    className="stat-arrow-pill flex-shrink-0"
                    style={{ backgroundColor: '#fee2e2', color: '#dc2626', zIndex: 1, position: 'relative' }}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#dc2626')}
                </Link>
              </div>

              {/* 4. Issued Certificates */}
              <div className="col-12 col-sm-6 col-xl">
                <Link
                  to="/admin/archive?status=approved"
                  className="officer-stat-card text-decoration-none"
                  title="Approved / Issued"
                >
                  <div className="d-flex align-items-center gap-3" style={{ zIndex: 1, position: 'relative' }}>
                    <div className="stat-icon-circle stat-green-bg">
                      <i className="bi bi-patch-check-fill"></i>
                    </div>
                    <div>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                        Issued Certificates
                      </div>
                      <div className="fs-3 fw-bold text-success lh-1 my-1">
                        {loading ? '...' : stats.approvedApplications}
                      </div>
                      <div className="small text-success" style={{ fontSize: '0.76rem' }}>
                        <i className="bi bi-patch-check-fill me-1"></i> Archived &amp; Verified
                      </div>
                    </div>
                  </div>
                  <div
                    className="stat-arrow-pill flex-shrink-0"
                    style={{ backgroundColor: '#dcfce7', color: '#16a34a', zIndex: 1, position: 'relative' }}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#16a34a')}
                </Link>
              </div>

              {/* 5. Rejected Applications */}
              <div className="col-12 col-sm-6 col-xl">
                <Link
                  to="/admin/archive?status=rejected"
                  className="officer-stat-card text-decoration-none"
                  title="Rejected Applications"
                >
                  <div className="d-flex align-items-center gap-3" style={{ zIndex: 1, position: 'relative' }}>
                    <div className="stat-icon-circle" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                      <i className="bi bi-x-circle-fill"></i>
                    </div>
                    <div>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                        Rejected Applications
                      </div>
                      <div className="fs-3 fw-bold text-danger lh-1 my-1">
                        {loading ? '...' : stats.rejectedApplications}
                      </div>
                      <div className="small text-muted" style={{ fontSize: '0.76rem' }}>
                        <i className="bi bi-x-circle me-1"></i> Rejected / Returned
                      </div>
                    </div>
                  </div>
                  <div
                    className="stat-arrow-pill flex-shrink-0"
                    style={{ backgroundColor: '#f1f5f9', color: '#64748b', zIndex: 1, position: 'relative' }}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#64748b')}
                </Link>
              </div>
            </div>

            {/* ── Recent Application Activity Table ── */}
            <div className="officer-table-card">
              <div className="card-header bg-white py-3 px-4 border-0 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-activity text-primary fs-5"></i>
                  <h5 className="card-title mb-0 fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                    Recent Application Activity
                  </h5>
                </div>
                <Link
                  to="/admin/archive"
                  className="btn btn-outline-primary btn-sm px-3 rounded-3 fw-semibold"
                  style={{ fontSize: '0.83rem' }}
                >
                  Open Digital Archive
                </Link>
              </div>

              <div className="card-body p-0">
                {loading ? (
                  <div className="p-5 text-center">
                    <div className="spinner-border text-primary" role="status"></div>
                    <div className="mt-2 text-muted small">Loading recent activity...</div>
                  </div>
                ) : recentApplications.length === 0 ? (
                  <div className="p-5 text-center text-muted">
                    <i className="bi bi-inbox fs-1 text-secondary d-block mb-2"></i>
                    No applications recorded in system database yet.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 officer-table">
                      <thead>
                        <tr>
                          <th className="ps-4">APPLICATION NUMBER</th>
                          <th>CERTIFICATE TYPE</th>
                          <th>APPLICANT NAME</th>
                          <th>SUBMISSION DATE</th>
                          <th>SLA STATUS</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentApplications.map((app) => (
                          <tr key={app._id}>
                            {/* Application Number */}
                            <td className="ps-4">
                              <Link
                                to={`/admin/archive`}
                                className="fw-bold text-primary text-decoration-none"
                                style={{ fontSize: '0.88rem' }}
                              >
                                {app.applicationNumber}
                              </Link>
                            </td>

                            {/* Certificate Type */}
                            <td>
                              <span
                                className="badge px-2 py-1 fw-bold rounded-pill text-white"
                                style={{
                                  backgroundColor: app.certificateType === 'BIRTH' ? '#1d4ed8' : '#dc2626',
                                  fontSize: '0.75rem',
                                }}
                              >
                                {app.certificateType}
                              </span>
                            </td>

                            {/* Applicant Name */}
                            <td className="fw-semibold text-dark" style={{ fontSize: '0.88rem' }}>
                              {app.applicantDetails?.name || app.applicant?.name}
                            </td>

                            {/* Submission Date */}
                            <td className="text-muted small">
                              {new Date(app.submittedAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>

                            {/* SLA Status */}
                            <td>
                              {app.status === 'APPROVED' || app.status === 'REJECTED' ? (
                                <span className="text-success small fw-semibold d-inline-flex align-items-center">
                                  <i className="bi bi-check-lg me-1"></i> Completed
                                </span>
                              ) : (
                                <SlaIndicator deadline={app.slaDeadline} status={app.status} />
                              )}
                            </td>

                            {/* Status */}
                            <td>
                              <StatusBadge status={app.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>{/* end main content col */}
        </div>{/* end row */}
      </div>{/* end container-fluid */}
    </div>
  );
};

export default AdminDashboard;
