import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import SlaIndicator from '../../components/SlaIndicator';

const CitizenDashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/applications/my');
      if (res.data) {
        setSummary(res.data.summary || { total: 0, pending: 0, approved: 0, rejected: 0 });
        setRecentApplications(res.data.applications?.slice(0, 5) || []);
      }
    } catch (err) {
      console.error('[Citizen Dashboard Error]:', err);
      setError('Unable to load application records from server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDownloadCertificate = async (appId, certNumber) => {
    try {
      const response = await api.get(`/certificates/${appId}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${certNumber || 'Certificate'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('[Download Failed]:', err);
      alert('Failed to download certificate. Please ensure the application is approved.');
    }
  };

  const renderStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'APPROVED':
        return (
          <span className="badge bg-success px-3 py-1.5 rounded-pill text-white fw-semibold">
            <i className="bi bi-check-circle-fill me-1"></i> Approved
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span
            className="badge px-3 py-1.5 rounded-pill fw-semibold"
            style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}
          >
            <i className="bi bi-search me-1"></i> Under Verification
          </span>
        );
      case 'PENDING':
        return (
          <span
            className="badge px-3 py-1.5 rounded-pill fw-semibold"
            style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
          >
            <i className="bi bi-clock-history me-1"></i> Pending Review
          </span>
        );
      case 'CORRECTION_REQUIRED':
        return (
          <span
            className="badge px-3 py-1.5 rounded-pill fw-semibold"
            style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
          >
            <i className="bi bi-pencil-square me-1"></i> Correction Required
          </span>
        );
      case 'RESUBMITTED':
        return (
          <span
            className="badge px-3 py-1.5 rounded-pill fw-semibold"
            style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}
          >
            <i className="bi bi-arrow-repeat me-1"></i> Resubmitted
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge bg-danger px-3 py-1.5 rounded-pill text-white fw-semibold">
            <i className="bi bi-x-circle-fill me-1"></i> Rejected
          </span>
        );
      default:
        return <span className="badge bg-secondary px-3 py-1.5 rounded-pill">{status || 'Unknown'}</span>;
    }
  };

  return (
    <>
    <div className="citizen-dashboard-page py-4">
      <div className="container-fluid px-3 px-xl-4">
        <div className="row g-4">
          {/* ── Left Sidebar ── */}
          <div className="col-12 col-lg-3 col-xl-2">
            <div className="citizen-sidebar">
              {/* Profile Card Header */}
              <div className="d-flex align-items-center gap-3 citizen-sidebar-profile mb-2">
                <div className="citizen-avatar-circle">
                  <i className="bi bi-person-fill fs-4"></i>
                </div>
                <div className="overflow-hidden">
                  <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.98rem' }}>
                    {user?.name || 'Citizen'}
                  </div>
                  <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                    Citizen
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <ul className="citizen-sidebar-nav">
                <li>
                  <Link to="/citizen/dashboard" className="citizen-nav-item active">
                    <i className="bi bi-house-door-fill"></i>
                    <span>Dashboard</span>
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setShowApplyModal(true)}
                    className="citizen-nav-item w-100 text-start border-0 bg-transparent"
                  >
                    <i className="bi bi-file-earmark-plus"></i>
                    <span>Apply for Certificate</span>
                  </button>
                </li>
                <li>
                  <Link to="/citizen/applications" className="citizen-nav-item">
                    <i className="bi bi-card-checklist"></i>
                    <span>My Applications</span>
                  </Link>
                </li>
                <li>
                  <Link to="/citizen/certificates" className="citizen-nav-item">
                    <i className="bi bi-patch-check"></i>
                    <span>My Certificates</span>
                  </Link>
                </li>
                <li>
                  <Link to="/citizen/profile" className="citizen-nav-item">
                    <i className="bi bi-person"></i>
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

          {/* ── Main Dashboard Content ── */}
          <div className="col-12 col-lg-9 col-xl-10">
            {/* 1. Welcome Banner */}
            <div className="citizen-welcome-banner mb-4">
              <div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
                <div className="col-12 col-md-8 col-xl-8">
                  <div className="citizen-portal-tag mb-1">CITIZEN PORTAL</div>
                  <h2 className="citizen-welcome-title mb-2">
                    Welcome, {user?.name || 'Citizen'} 👋
                  </h2>
                  <p className="citizen-welcome-desc mb-0">
                    Manage your birth and death certificate applications easily and securely.
                  </p>
                </div>
              </div>

              {/* Municipal Illustration at right side of banner */}
              <div className="banner-illustration-box" aria-hidden="true">
                <img src="/assets/homepage.png" alt="" className="banner-illustration-img" />
              </div>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small mb-4 rounded-3 border-0 shadow-sm">
                <i className="bi bi-exclamation-triangle-fill me-1"></i> {error}
              </div>
            )}

            {/* 2. Four Application Summary Cards */}
            <div className="row g-3 mb-4">
              {/* Total Applications */}
              <div className="col-12 col-sm-6 col-xl-3">
                <Link to="/citizen/applications?status=all" className="summary-stat-card">
                  <div className="stat-icon-circle stat-blue-bg">
                    <i className="bi bi-file-earmark-text-fill"></i>
                  </div>
                  <div className="text-center flex-grow-1 px-2">
                    <div className="text-muted small fw-semibold">Total Applications</div>
                    <div className="fw-bold text-dark fs-3 lh-1 mt-1">
                      {loading ? '...' : summary.total}
                    </div>
                  </div>
                  <div className="stat-arrow-pill stat-blue-bg">
                    <i className="bi bi-chevron-right"></i>
                  </div>
                </Link>
              </div>

              {/* Pending / In-Review */}
              <div className="col-12 col-sm-6 col-xl-3">
                <Link to="/citizen/applications?status=pending" className="summary-stat-card">
                  <div className="stat-icon-circle stat-yellow-bg">
                    <i className="bi bi-clock-fill"></i>
                  </div>
                  <div className="text-center flex-grow-1 px-2">
                    <div className="text-muted small fw-semibold">Pending / In-Review</div>
                    <div className="fw-bold fs-3 lh-1 mt-1" style={{ color: '#d97706' }}>
                      {loading ? '...' : summary.pending}
                    </div>
                  </div>
                  <div className="stat-arrow-pill stat-yellow-bg">
                    <i className="bi bi-chevron-right"></i>
                  </div>
                </Link>
              </div>

              {/* Approved */}
              <div className="col-12 col-sm-6 col-xl-3">
                <Link to="/citizen/applications?status=approved" className="summary-stat-card">
                  <div className="stat-icon-circle stat-green-bg">
                    <i className="bi bi-check-lg"></i>
                  </div>
                  <div className="text-center flex-grow-1 px-2">
                    <div className="text-muted small fw-semibold">Approved</div>
                    <div className="fw-bold fs-3 lh-1 mt-1" style={{ color: '#16a34a' }}>
                      {loading ? '...' : summary.approved}
                    </div>
                  </div>
                  <div className="stat-arrow-pill stat-green-bg">
                    <i className="bi bi-chevron-right"></i>
                  </div>
                </Link>
              </div>

              {/* Rejected */}
              <div className="col-12 col-sm-6 col-xl-3">
                <Link to="/citizen/applications?status=rejected" className="summary-stat-card">
                  <div className="stat-icon-circle stat-red-bg">
                    <i className="bi bi-x-lg"></i>
                  </div>
                  <div className="text-center flex-grow-1 px-2">
                    <div className="text-muted small fw-semibold">Rejected</div>
                    <div className="fw-bold fs-3 lh-1 mt-1" style={{ color: '#dc2626' }}>
                      {loading ? '...' : summary.rejected}
                    </div>
                  </div>
                  <div className="stat-arrow-pill stat-red-bg">
                    <i className="bi bi-chevron-right"></i>
                  </div>
                </Link>
              </div>
            </div>

            {/* 3. Recent Submissions Table */}
            <div className="citizen-table-card">
              <div className="py-3 px-4 d-flex justify-content-between align-items-center border-bottom bg-white">
                <div className="d-flex align-items-center">
                  <i className="bi bi-clock-history text-primary fs-5 me-2"></i>
                  <div>
                    <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '1.08rem' }}>
                      Recent Submissions
                    </h5>
                    <div className="text-muted small" style={{ fontSize: '0.82rem' }}>
                      Your latest birth and death certificate applications
                    </div>
                  </div>
                </div>
                <Link
                  to="/citizen/applications"
                  className="btn btn-sm btn-outline-primary px-3 fw-semibold rounded-pill"
                  style={{ fontSize: '0.82rem' }}
                >
                  View All ({summary.total}) <i className="bi bi-chevron-right ms-1"></i>
                </Link>
              </div>

              <div className="p-0 bg-white">
                {loading ? (
                  <div className="p-5 text-center">
                    <div className="spinner-border text-primary" role="status"></div>
                    <div className="mt-2 text-muted small">Loading applications from MongoDB...</div>
                  </div>
                ) : recentApplications.length === 0 ? (
                  <div className="p-5 text-center text-muted">
                    <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                    <p className="mb-3">You have not submitted any certificate applications yet.</p>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowApplyModal(true)}
                    >
                      <i className="bi bi-plus-lg me-1"></i> Apply for Certificate
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 citizen-table">
                      <thead>
                        <tr>
                          <th className="ps-4 py-3 fw-semibold">Application Number</th>
                          <th className="py-3 fw-semibold">Certificate Type</th>
                          <th className="py-3 fw-semibold">Beneficiary / Name</th>
                          <th className="py-3 fw-semibold">Submission Date</th>
                          <th className="py-3 fw-semibold">SLA Status</th>
                          <th className="py-3 fw-semibold">Status</th>
                          <th className="text-end pe-4 py-3 fw-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentApplications.map((app) => {
                          const beneficiary =
                            app.certificateType === 'BIRTH'
                              ? app.certificateDetails?.childName
                              : app.certificateDetails?.deceasedName;

                          return (
                            <tr key={app._id}>
                              <td className="ps-4 py-3">
                                <Link
                                  to={`/citizen/applications/${app._id}`}
                                  className="fw-bold text-primary text-decoration-none d-block"
                                >
                                  {app.applicationNumber}
                                </Link>
                                {app.certificateNumber && (
                                  <div
                                    className="small text-success d-flex align-items-center mt-0.5"
                                    style={{ fontSize: '0.78rem' }}
                                  >
                                    <i className="bi bi-patch-check-fill me-1"></i> {app.certificateNumber}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span
                                  className="badge px-2.5 py-1 fw-bold rounded-pill text-white"
                                  style={{
                                    backgroundColor: app.certificateType === 'BIRTH' ? '#1d4ed8' : '#dc2626',
                                    fontSize: '0.75rem',
                                    letterSpacing: '0.3px',
                                  }}
                                >
                                  {app.certificateType}
                                </span>
                              </td>
                              <td className="fw-bold text-dark">{beneficiary || 'N/A'}</td>
                              <td className="text-muted small">
                                {new Date(app.submittedAt).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td>
                                {app.status === 'APPROVED' || app.status === 'REJECTED' ? (
                                  <span className="text-success small fw-semibold">
                                    <i className="bi bi-check-lg me-1"></i> Completed
                                  </span>
                                ) : (
                                  <SlaIndicator deadline={app.slaDeadline} status={app.status} />
                                )}
                              </td>
                              <td>{renderStatusBadge(app.status)}</td>
                              <td className="text-end pe-4 py-3">
                                <div className="d-flex justify-content-end align-items-center gap-2">
                                  <Link
                                    to={`/citizen/applications/${app._id}`}
                                    className="btn btn-sm btn-outline-secondary px-3 py-1 d-inline-flex align-items-center rounded-2"
                                    style={{ fontSize: '0.84rem' }}
                                  >
                                    <i className="bi bi-eye me-1.5"></i> View
                                  </Link>
                                  {app.status === 'APPROVED' && (
                                    <button
                                      className="btn btn-sm btn-success px-3 py-1 d-inline-flex align-items-center rounded-2"
                                      onClick={() => handleDownloadCertificate(app._id, app.certificateNumber)}
                                      title="Download Official Certificate PDF"
                                      style={{
                                        fontSize: '0.84rem',
                                        backgroundColor: '#15803d',
                                        borderColor: '#15803d',
                                      }}
                                    >
                                      <i className="bi bi-file-earmark-pdf-fill me-1.5"></i> Download PDF
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ── Certificate Type Selection Modal ── */}
    {showApplyModal && (
      <div
        className="modal show d-block"
        tabIndex="-1"
        role="dialog"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowApplyModal(false); }}
      >
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '480px' }}>
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">

            {/* Modal Header */}
            <div
              className="modal-header border-0 pb-2 pt-4 px-4"
              style={{ background: 'linear-gradient(135deg, #0f2b5c 0%, #1e4b8a 100%)' }}
            >
              <div>
                <div className="small text-warning fw-semibold mb-1" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                  CITIZEN PORTAL
                </div>
                <h5 className="modal-title fw-bold text-white mb-0">
                  <i className="bi bi-file-earmark-plus-fill me-2 text-warning"></i>
                  Apply for Certificate
                </h5>
                <div className="text-light opacity-75 small mt-1" style={{ fontSize: '0.82rem' }}>
                  Select the certificate type to proceed
                </div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white ms-auto"
                aria-label="Close"
                onClick={() => setShowApplyModal(false)}
              ></button>
            </div>

            {/* Modal Body — two option cards */}
            <div className="modal-body p-4">
              <div className="row g-3">

                {/* Birth Certificate Card */}
                <div className="col-12">
                  <Link
                    to="/citizen/apply/birth"
                    onClick={() => setShowApplyModal(false)}
                    className="text-decoration-none d-block"
                  >
                    <div
                      className="d-flex align-items-center gap-3 p-3 rounded-3 border"
                      style={{
                        cursor: 'pointer',
                        transition: 'box-shadow 0.15s, border-color 0.15s',
                        borderColor: '#bfdbfe',
                        backgroundColor: '#eff6ff',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(29,78,216,0.15)';
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = '#bfdbfe';
                      }}
                    >
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                        style={{ width: '52px', height: '52px', backgroundColor: '#1d4ed8' }}
                      >
                        <i className="bi bi-person-hearts text-white fs-4"></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-bold text-dark" style={{ fontSize: '1rem' }}>
                          Birth Certificate
                        </div>
                        <div className="text-muted small">
                          Register a new birth and apply for an official birth certificate
                        </div>
                      </div>
                      <i className="bi bi-chevron-right text-primary fs-5 flex-shrink-0"></i>
                    </div>
                  </Link>
                </div>

                {/* Death Certificate Card */}
                <div className="col-12">
                  <Link
                    to="/citizen/apply/death"
                    onClick={() => setShowApplyModal(false)}
                    className="text-decoration-none d-block"
                  >
                    <div
                      className="d-flex align-items-center gap-3 p-3 rounded-3 border"
                      style={{
                        cursor: 'pointer',
                        transition: 'box-shadow 0.15s, border-color 0.15s',
                        borderColor: '#fecaca',
                        backgroundColor: '#fef2f2',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(220,38,38,0.15)';
                        e.currentTarget.style.borderColor = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = '#fecaca';
                      }}
                    >
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                        style={{ width: '52px', height: '52px', backgroundColor: '#dc2626' }}
                      >
                        <i className="bi bi-file-earmark-medical text-white fs-4"></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-bold text-dark" style={{ fontSize: '1rem' }}>
                          Death Certificate
                        </div>
                        <div className="text-muted small">
                          Register a death and apply for an official death certificate
                        </div>
                      </div>
                      <i className="bi bi-chevron-right text-danger fs-5 flex-shrink-0"></i>
                    </div>
                  </Link>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer border-0 pt-0 pb-4 px-4 bg-white">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-4"
                onClick={() => setShowApplyModal(false)}
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default CitizenDashboard;
