import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import SlaIndicator from '../../components/SlaIndicator';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    birthCount: 0,
    deathCount: 0,
    overdueCount: 0,
    escalatedCount: 0,
    attentionCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Derive active filters directly from URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const isEscalated =
    searchParams.get('escalated') === 'true' ||
    searchParams.get('status')?.toUpperCase() === 'ESCALATED' ||
    searchParams.get('sla')?.toLowerCase() === 'escalated';
  const isOverdue = searchParams.get('sla')?.toLowerCase() === 'overdue';
  const isAttention = searchParams.get('attention') === 'true';
  const rawStatus = searchParams.get('status')?.toUpperCase();
  const rawType = (searchParams.get('type') || searchParams.get('certificateType'))?.toUpperCase();

  const activeStatus =
    isEscalated || isOverdue || isAttention
      ? 'ALL'
      : ['PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW'].includes(rawStatus)
      ? rawStatus
      : 'ALL';
  const activeType =
    isEscalated || isOverdue || isAttention
      ? 'ALL'
      : ['BIRTH', 'DEATH'].includes(rawType)
      ? rawType
      : 'ALL';
  const activeSlaFilter = isEscalated
    ? 'ESCALATED'
    : isOverdue
    ? 'OVERDUE'
    : isAttention
    ? 'ATTENTION'
    : 'ALL';

  const fetchOfficerData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const currentSearchParams = new URLSearchParams(location.search);
      const isEsc =
        currentSearchParams.get('escalated') === 'true' ||
        currentSearchParams.get('status')?.toUpperCase() === 'ESCALATED' ||
        currentSearchParams.get('sla')?.toLowerCase() === 'escalated';
      const isOv = currentSearchParams.get('sla')?.toLowerCase() === 'overdue';
      const isAtt = currentSearchParams.get('attention') === 'true';
      const statusParam = currentSearchParams.get('status')?.toUpperCase();
      const typeParam = (
        currentSearchParams.get('type') || currentSearchParams.get('certificateType')
      )?.toUpperCase();

      const params = {};
      if (isEsc) {
        params.escalated = 'true';
      } else if (isOv) {
        params.sla = 'overdue';
      } else if (isAtt) {
        params.attention = 'true';
      } else {
        if (statusParam && ['PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW'].includes(statusParam)) {
          params.status = statusParam;
        }
        if (typeParam && ['BIRTH', 'DEATH'].includes(typeParam)) {
          params.certificateType = typeParam;
        }
      }

      if (search.trim()) params.search = search.trim();

      const res = await api.get('/officer/applications', { params });
      if (res.data) {
        setApplications(res.data.applications || []);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      console.error('[Officer Dashboard Error]:', err);
      setError('Unable to load applications from database. Please ensure you have Officer role permissions.');
    } finally {
      setLoading(false);
    }
  }, [location.search, search]);

  useEffect(() => {
    fetchOfficerData();
  }, [fetchOfficerData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOfficerData();
  };

  const handleDropdownChange = (filterType, value) => {
    if (filterType === 'type') {
      if (value === 'ALL') {
        navigate('/officer/dashboard');
      } else {
        navigate(`/officer/dashboard?type=${value.toLowerCase()}`);
      }
    } else if (filterType === 'status') {
      if (value === 'ALL') {
        navigate('/officer/dashboard');
      } else if (value === 'ESCALATED') {
        navigate('/officer/dashboard?escalated=true');
      } else {
        navigate(`/officer/dashboard?status=${value.toLowerCase()}`);
      }
    }
  };

  // Determine officer display title
  const officerName = user?.name || 'Officer';
  const officerTitle =
    user?.role === 'officer' && !officerName.toLowerCase().includes('registrar')
      ? `${officerName} (Registrar)`
      : officerName;

  // Background wave SVG helper for summary cards
  const renderWave = (color) => (
    <svg className="officer-card-wave" viewBox="0 0 100 60" preserveAspectRatio="none" style={{ color }}>
      <path d="M0,35 C30,15 70,55 100,20 L100,60 L0,60 Z" fill="currentColor"></path>
    </svg>
  );

  // Status badge matching reference design
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="badge bg-success px-2.5 py-1 rounded-pill text-white fw-semibold d-inline-flex align-items-center">
            <i className="bi bi-check-circle-fill me-1"></i> Approved
          </span>
        );
      case 'PENDING':
        return (
          <span
            className="badge px-2.5 py-1 rounded-pill fw-semibold d-inline-flex align-items-center"
            style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
          >
            <i className="bi bi-clock-fill me-1"></i> Pending Review
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span
            className="badge px-2.5 py-1 rounded-pill text-white fw-semibold d-inline-flex align-items-center"
            style={{ backgroundColor: '#0284c7' }}
          >
            <i className="bi bi-search me-1"></i> Under Verification
          </span>
        );
      case 'CORRECTION_REQUIRED':
        return (
          <span
            className="badge px-2.5 py-1 rounded-pill fw-semibold d-inline-flex align-items-center"
            style={{ backgroundColor: '#f59e0b', color: '#000000' }}
          >
            <i className="bi bi-pencil-square me-1"></i> Correction Required
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge bg-danger px-2.5 py-1 rounded-pill text-white fw-semibold d-inline-flex align-items-center">
            <i className="bi bi-x-circle-fill me-1"></i> Rejected
          </span>
        );
      default:
        return <span className="badge bg-secondary px-2.5 py-1 rounded-pill">{status || 'Unknown'}</span>;
    }
  };

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
                  <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                    Registrar
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <ul className="officer-sidebar-nav">
                <li>
                  <Link to="/officer/dashboard" className="officer-nav-item active">
                    <i className="bi bi-house-door-fill"></i>
                    <span>Dashboard</span>
                  </Link>
                </li>
                <li>
                  <a
                    href="#application-queue"
                    className="officer-nav-item"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('application-queue')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <i className="bi bi-file-earmark-text"></i>
                    <span>Application Queue</span>
                  </a>
                </li>
                <li>
                  <Link to="/admin/archive" className="officer-nav-item">
                    <i className="bi bi-search"></i>
                    <span>Digital Archive Search</span>
                  </Link>
                </li>
                <li>
                  <Link to="/officer/profile" className="officer-nav-item">
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
            <div className="officer-welcome-banner mb-4">
              <div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
                <div className="col-12 col-md-7 col-xl-8">
                  <div className="officer-console-tag mb-1">OFFICER CONSOLE</div>
                  <h1 className="officer-welcome-title mb-2">Welcome, {officerTitle}</h1>
                  <p className="officer-welcome-desc mb-0">
                    Review, verify and manage birth &amp; death certificate applications.
                  </p>
                </div>
                <div className="col-12 col-md-5 col-xl-4 text-md-end mt-3 mt-md-0">
                  <div className="d-flex flex-wrap gap-2 justify-content-md-end">
                    {/* <Link to="/admin/archive" className="btn-banner-outline-blue">
                      <i className="bi bi-search me-1.5"></i> Digital Archive Search
                    </Link> */}
                    <button className="btn-banner-gold" onClick={fetchOfficerData}>
                      <i className="bi bi-arrow-clockwise me-1.5"></i> Refresh Queue
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

            {/* 2. Summary Cards (2 Rows of 4) */}
            {/* ROW 1: Core Application Statistics */}
            <div className="row g-3 mb-3">
              {/* 1. Total In Queue */}
              <div className="col-12 col-sm-6 col-xl-3">
                <Link
                  to="/officer/dashboard"
                  className={`officer-stat-card ${
                    activeStatus === 'ALL' && activeType === 'ALL' && activeSlaFilter === 'ALL'
                      ? 'active-filter'
                      : ''
                  }`}
                  title="Show All Applications"
                >
                  <div className="d-flex align-items-center gap-3">
                    <div className="stat-icon-circle stat-blue-bg">
                      <i className="bi bi-file-earmark-text"></i>
                    </div>
                    <div>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
                        Total in Queue
                      </div>
                      <div className="fs-3 fw-bold text-dark lh-1 my-1">{loading ? '...' : stats.total}</div>
                      <span className="text-primary fw-semibold small" style={{ fontSize: '0.78rem' }}>
                        Show All Applications &rarr;
                      </span>
                    </div>
                  </div>
                  <div className="stat-arrow-pill" style={{ backgroundColor: '#f1f5f9', color: '#0284c7' }}>
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#0284c7')}
                </Link>
              </div>

              {/* 2. Pending Review */}
              <div className="col-12 col-sm-6 col-xl-3">
                <Link
                  to="/officer/dashboard?status=pending"
                  className={`officer-stat-card ${
                    (activeStatus === 'PENDING' || activeStatus === 'UNDER_REVIEW') && activeSlaFilter === 'ALL'
                      ? 'active-filter'
                      : ''
                  }`}
                  title="Filter Pending / In Review"
                >
                  <div className="d-flex align-items-center gap-3">
                    <div className="stat-icon-circle stat-yellow-bg">
                      <i className="bi bi-clock-fill"></i>
                    </div>
                    <div>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
                        Pending Review
                      </div>
                      <div className="fs-3 fw-bold text-warning lh-1 my-1">{loading ? '...' : stats.pending}</div>
                    </div>
                  </div>
                  <div className="stat-arrow-pill" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#d97706')}
                </Link>
              </div>

              {/* 3. Approved */}
              <div className="col-12 col-sm-6 col-xl-3">
                <Link
                  to="/officer/dashboard?status=approved"
                  className={`officer-stat-card ${
                    activeStatus === 'APPROVED' && activeSlaFilter === 'ALL' ? 'active-filter' : ''
                  }`}
                  title="Filter Approved Applications"
                >
                  <div className="d-flex align-items-center gap-3">
                    <div className="stat-icon-circle stat-green-bg">
                      <i className="bi bi-check-lg"></i>
                    </div>
                    <div>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
                        Approved
                      </div>
                      <div className="fs-3 fw-bold text-success lh-1 my-1">{loading ? '...' : stats.approved}</div>
                    </div>
                  </div>
                  <div className="stat-arrow-pill" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#16a34a')}
                </Link>
              </div>

              {/* 4. Rejected */}
              <div className="col-12 col-sm-6 col-xl-3">
                <Link
                  to="/officer/dashboard?status=rejected"
                  className={`officer-stat-card ${
                    activeStatus === 'REJECTED' && activeSlaFilter === 'ALL' ? 'active-filter' : ''
                  }`}
                  title="Filter Rejected Applications"
                >
                  <div className="d-flex align-items-center gap-3">
                    <div className="stat-icon-circle stat-red-bg">
                      <i className="bi bi-x-circle-fill"></i>
                    </div>
                    <div>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
                        Rejected
                      </div>
                      <div className="fs-3 fw-bold text-danger lh-1 my-1">{loading ? '...' : stats.rejected}</div>
                    </div>
                  </div>
                  <div className="stat-arrow-pill" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#dc2626')}
                </Link>
              </div>
            </div>

            {/* ROW 2: Operational Statistics */}
            <div className="row g-3 mb-4">
              {/* 5. Birth / Death */}
              <div className="col-12 col-sm-6 col-xl-3">
                <div className={`officer-stat-card ${activeType !== 'ALL' ? 'active-filter' : ''}`}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="stat-icon-circle" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                      <i className="bi bi-layers-fill"></i>
                    </div>
                    <div>
                      <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
                        Birth / Death
                      </div>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <Link
                          to="/officer/dashboard?type=birth"
                          className="fw-bold text-primary text-decoration-none"
                          style={{ fontSize: '1.05rem' }}
                          title="Filter Birth Applications"
                        >
                          {loading ? '...' : stats.birthCount} <span className="small fw-semibold">Birth</span>
                        </Link>
                        <span className="text-muted opacity-50">|</span>
                        <Link
                          to="/officer/dashboard?type=death"
                          className="fw-bold text-danger text-decoration-none"
                          style={{ fontSize: '1.05rem' }}
                          title="Filter Death Applications"
                        >
                          {loading ? '...' : stats.deathCount} <span className="small fw-semibold">Death</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="stat-arrow-pill" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#9333ea')}
                </div>
              </div>

              {/* 6. SLA Overdue */}
              <div className="col-12 col-sm-6 col-xl-3">
                <Link
                  to="/officer/dashboard?sla=overdue"
                  className={`officer-stat-card ${activeSlaFilter === 'OVERDUE' ? 'active-filter' : ''}`}
                  title="Filter SLA Overdue Applications"
                >
                  <div className="d-flex align-items-center gap-3">
                    <div className="stat-icon-circle stat-red-bg">
                      <i className="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div>
                      <div className="text-danger small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
                        SLA Overdue
                      </div>
                      <div className="fs-3 fw-bold text-danger lh-1 my-1">
                        {loading ? '...' : stats.overdueCount !== undefined ? stats.overdueCount : 0}
                      </div>
                    </div>
                  </div>
                  <div className="stat-arrow-pill" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#dc2626')}
                </Link>
              </div>

              {/* 7. Citizen Escalations */}
              <div className="col-12 col-sm-6 col-xl-3">
                <Link
                  to="/officer/dashboard?escalated=true"
                  className={`officer-stat-card ${activeSlaFilter === 'ESCALATED' ? 'active-filter' : ''}`}
                  title="Filter Citizen Escalated Applications"
                >
                  <div className="d-flex align-items-center gap-3">
                    <div className="stat-icon-circle stat-red-bg">
                      <i className="bi bi-exclamation-octagon-fill"></i>
                    </div>
                    <div>
                      <div className="text-danger small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
                        Citizen Escalations
                      </div>
                      <div className="fs-3 fw-bold text-danger lh-1 my-1">
                        {loading ? '...' : stats.escalatedCount}
                      </div>
                    </div>
                  </div>
                  <div className="stat-arrow-pill" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#dc2626')}
                </Link>
              </div>

              {/* 8. Verification Alerts */}
              <div className="col-12 col-sm-6 col-xl-3">
                <Link
                  to="/officer/dashboard?attention=true"
                  className={`officer-stat-card ${activeSlaFilter === 'ATTENTION' ? 'active-filter' : ''}`}
                  title="Filter Applications Requiring Attention"
                >
                  <div className="d-flex align-items-center gap-3">
                    <div className="stat-icon-circle stat-yellow-bg">
                      <i className="bi bi-bell-fill"></i>
                    </div>
                    <div>
                      <div className="text-warning small fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
                        Verification Alerts
                      </div>
                      <div className="fs-3 fw-bold text-warning lh-1 my-1">
                        {loading ? '...' : stats.attentionCount}
                      </div>
                    </div>
                  </div>
                  <div className="stat-arrow-pill" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                    <i className="bi bi-chevron-right"></i>
                  </div>
                  {renderWave('#d97706')}
                </Link>
              </div>
            </div>

            {/* 3. Search and Filters */}
            <div className="card border-0 shadow-sm mb-4 bg-white" style={{ borderRadius: '16px' }}>
              <div className="card-body p-3">
                <form onSubmit={handleSearchSubmit}>
                  <div className="d-flex flex-wrap flex-lg-nowrap align-items-center gap-2">
                    {/* Search Field */}
                    <div className="input-group flex-grow-1">
                      <span className="input-group-text bg-white border-end-0 text-muted ps-3">
                        <i className="bi bi-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-2"
                        placeholder="Search by Application No, Citizen Name, Beneficiary, Subject..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ fontSize: '0.9rem' }}
                      />
                    </div>

                    {/* Search Button */}
                    <button
                      type="submit"
                      className="btn btn-primary px-4 fw-semibold text-nowrap rounded-3"
                      style={{ backgroundColor: '#1d4ed8', borderColor: '#1d4ed8', fontSize: '0.9rem' }}
                    >
                      Search
                    </button>

                    {/* Type Filter */}
                    <select
                      className="form-select rounded-3"
                      style={{ minWidth: '200px', width: 'auto', fontSize: '0.9rem' }}
                      value={activeType}
                      onChange={(e) => handleDropdownChange('type', e.target.value)}
                    >
                      <option value="ALL">All Types (Birth &amp; Death)</option>
                      <option value="BIRTH">Birth Certificates</option>
                      <option value="DEATH">Death Certificates</option>
                    </select>

                    {/* Status Filter */}
                    <select
                      className="form-select rounded-3"
                      style={{ minWidth: '160px', width: 'auto', fontSize: '0.9rem' }}
                      value={activeSlaFilter === 'ESCALATED' ? 'ESCALATED' : activeStatus}
                      onChange={(e) => handleDropdownChange('status', e.target.value)}
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PENDING">Pending Review</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="ESCALATED">Citizen Escalated</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>

                    {/* Refresh / Reset Button */}
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-3 px-3"
                      onClick={() => {
                        setSearch('');
                        navigate('/officer/dashboard');
                      }}
                      title="Reset Filter"
                    >
                      <i className="bi bi-arrow-clockwise fs-6"></i>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* 4. Application Verification Queue Table */}
            <div id="application-queue" className="officer-table-card">
              <div className="card-header bg-white py-3 px-4 border-0 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-list-task text-primary fs-5"></i>
                  <h5 className="card-title mb-0 fw-bold text-dark" style={{ fontSize: '1.05rem' }}>
                    {activeSlaFilter === 'ESCALATED'
                      ? 'Citizen Escalated Applications'
                      : activeSlaFilter === 'OVERDUE'
                      ? 'SLA Overdue Applications'
                      : 'Application Verification Queue'}
                  </h5>
                </div>
                <span
                  className="badge bg-light text-secondary border px-2.5 py-1.5 rounded-pill"
                  style={{ fontSize: '0.78rem' }}
                >
                  {applications.length} Records
                </span>
              </div>

              <div className="card-body p-0">
                {loading ? (
                  <div className="p-5 text-center">
                    <div className="spinner-border text-primary" role="status"></div>
                    <div className="mt-2 text-muted small">Loading verification queue...</div>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="p-5 text-center text-muted">
                    <i className="bi bi-inbox fs-1 text-secondary d-block mb-2"></i>
                    <h6 className="fw-bold">
                      {activeSlaFilter === 'ESCALATED'
                        ? 'No Citizen Escalated Applications Found'
                        : activeSlaFilter === 'OVERDUE'
                        ? 'No SLA Overdue Applications'
                        : activeType !== 'ALL'
                        ? `No ${activeType} Certificate Applications in Queue`
                        : activeStatus !== 'ALL'
                        ? `No ${activeStatus.replace('_', ' ')} Applications in Queue`
                        : 'No Applications in Queue'}
                    </h6>
                    <p className="small mb-0">
                      {activeSlaFilter === 'ESCALATED'
                        ? 'There are currently no citizen-escalated applications requiring attention.'
                        : activeSlaFilter === 'OVERDUE'
                        ? 'There are currently no applications with overdue SLA deadlines.'
                        : activeType !== 'ALL'
                        ? `There are currently no ${activeType.toLowerCase()} certificate applications matching your filter criteria.`
                        : activeStatus !== 'ALL'
                        ? `There are currently no ${activeStatus.toLowerCase().replace('_', ' ')} applications matching your filter criteria.`
                        : 'There are no applications matching your current filter criteria.'}
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 officer-table">
                      <thead>
                        <tr>
                          <th className="ps-4">APPLICATION NUMBER</th>
                          <th>TYPE</th>
                          <th>APPLICANT (CITIZEN)</th>
                          <th>BENEFICIARY / SUBJECT</th>
                          <th>SUBMITTED ON</th>
                          <th>SLA DEADLINE</th>
                          <th>SECURITY / DUPLICATE</th>
                          <th>STATUS</th>
                          <th className="text-end pe-4">VERIFICATION ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app) => {
                          const beneficiary =
                            app.certificateType === 'BIRTH'
                              ? app.certificateDetails?.childName
                              : app.certificateDetails?.deceasedName;

                          const isAppEscalated =
                            app.isEscalated && ['PENDING', 'UNDER_REVIEW'].includes(app.status);

                          const rowBgClass = isAppEscalated
                            ? 'table-danger bg-opacity-10'
                            : app.duplicateSuspect?.isSuspect
                            ? 'table-warning bg-opacity-10'
                            : '';

                          return (
                            <tr key={app._id} className={rowBgClass}>
                              {/* Application Number */}
                              <td className="ps-4">
                                <Link
                                  to={`/officer/applications/${app._id}`}
                                  className="fw-bold text-primary text-decoration-none d-block"
                                  style={{ fontSize: '0.88rem' }}
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

                              {/* Type */}
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

                              {/* Applicant */}
                              <td>
                                <div className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>
                                  {app.applicantDetails?.name || app.applicant?.name}
                                </div>
                                <div className="small text-muted">
                                  {app.applicantDetails?.mobile || app.applicant?.mobile}
                                </div>
                              </td>

                              {/* Beneficiary */}
                              <td>
                                <div className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>
                                  {beneficiary || 'N/A'}
                                </div>
                                <div className="small text-muted">
                                  {app.certificateDetails?.hospitalName || 'Municipal Jurisdiction'}
                                </div>
                              </td>

                              {/* Submitted On */}
                              <td className="text-muted small">
                                {new Date(app.submittedAt).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>

                              {/* SLA Deadline */}
                              <td>
                                {app.status === 'APPROVED' || app.status === 'REJECTED' ? (
                                  <span className="text-success small fw-semibold d-inline-flex align-items-center">
                                    <i className="bi bi-check-lg me-1"></i> Completed
                                  </span>
                                ) : (
                                  <SlaIndicator deadline={app.slaDeadline} status={app.status} />
                                )}
                              </td>

                              {/* Security / Duplicate */}
                              <td>
                                {app.duplicateSuspect?.isSuspect ? (
                                  <span
                                    className="badge bg-danger text-white px-2.5 py-1 rounded-pill fw-semibold"
                                    title={app.duplicateSuspect.matchReason}
                                    style={{ fontSize: '0.76rem' }}
                                  >
                                    <i className="bi bi-exclamation-triangle-fill me-1"></i> Duplicate Suspect
                                  </span>
                                ) : (
                                  <span
                                    className="badge bg-light text-success border border-success border-opacity-25 px-2.5 py-1 rounded-pill fw-semibold"
                                    style={{ fontSize: '0.76rem' }}
                                  >
                                    <i className="bi bi-box-arrow-in-down me-1"></i> Verified Unique
                                  </span>
                                )}
                              </td>

                              {/* Status */}
                              <td>
                                <div className="d-flex flex-column gap-1 align-items-start">
                                  {renderStatusBadge(app.status)}
                                  {isAppEscalated && (
                                    <span
                                      className="badge bg-danger text-white px-2 py-0.5 rounded-pill fw-bold"
                                      style={{ fontSize: '0.68rem', letterSpacing: '0.3px' }}
                                    >
                                      <i className="bi bi-lock-fill me-1"></i> CITIZEN ESCALATION
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Verification Action */}
                              <td className="text-end pe-4">
                                <Link
                                  to={`/officer/applications/${app._id}`}
                                  className="btn btn-primary btn-sm px-3 py-1.5 fw-semibold d-inline-flex align-items-center rounded-2"
                                  style={{
                                    backgroundColor: '#1d4ed8',
                                    borderColor: '#1d4ed8',
                                    fontSize: '0.82rem',
                                  }}
                                >
                                  <i className="bi bi-search me-1.5"></i> Verify &amp; Process
                                </Link>
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
  );
};

export default OfficerDashboard;
