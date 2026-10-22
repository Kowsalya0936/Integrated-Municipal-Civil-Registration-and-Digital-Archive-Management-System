import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import SlaIndicator from '../../components/SlaIndicator';

// ─── URL helper ────────────────────────────────────────────────────────────────
const readParams = (search) => {
  const p = new URLSearchParams(search);
  return {
    applicationNumber: p.get('applicationNumber') || '',
    certificateNumber: p.get('certificateNumber') || '',
    applicantName: p.get('applicantName') || '',
    email: p.get('email') || '',
    hospital: p.get('hospital') || '',
    search: p.get('search') || '',
    certificateType: p.get('certificateType') || 'ALL',
    status: p.get('status') || 'ALL',
    escalated: p.get('escalated') || 'ALL',
    sla: p.get('sla') || 'ALL',
    dateFrom: p.get('dateFrom') || '',
    dateTo: p.get('dateTo') || '',
    page: parseInt(p.get('page'), 10) || 1,
  };
};

const EMPTY_FILTERS = {
  applicationNumber: '',
  certificateNumber: '',
  applicantName: '',
  email: '',
  hospital: '',
  search: '',
  certificateType: 'ALL',
  status: 'ALL',
  escalated: 'ALL',
  sla: 'ALL',
  dateFrom: '',
  dateTo: '',
};

const PAGE_LIMIT = 20;

// ─── Component ─────────────────────────────────────────────────────────────────
const DigitalArchive = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialise from URL on mount
  const initial = readParams(location.search);

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, ...initial });

  // Separate "committed" filters — only applied when Search is clicked
  const [committedFilters, setCommittedFilters] = useState({ ...EMPTY_FILTERS, ...initial });

  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1,
    limit: PAGE_LIMIT,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Build API params from committed state ───────────────────────────────────
  const buildParams = useCallback((f, pg) => {
    const params = { page: pg, limit: PAGE_LIMIT };

    if (f.search.trim())            params.search = f.search.trim();
    if (f.applicationNumber.trim()) params.applicationNumber = f.applicationNumber.trim();
    if (f.certificateNumber.trim()) params.certificateNumber = f.certificateNumber.trim();
    if (f.applicantName.trim())     params.applicantName = f.applicantName.trim();
    if (f.email.trim())             params.email = f.email.trim();
    if (f.hospital.trim())          params.hospital = f.hospital.trim();
    if (f.certificateType !== 'ALL') params.certificateType = f.certificateType;
    if (f.dateFrom)                 params.dateFrom = f.dateFrom;
    if (f.dateTo)                   params.dateTo = f.dateTo;

    // Status / Escalated
    if (f.escalated === 'true') {
      params.escalated = 'true';
      // No status param — backend will derive from escalated
    } else if (f.escalated === 'false') {
      params.escalated = 'false';
      if (f.status !== 'ALL') params.status = f.status;
    } else {
      // f.escalated === 'ALL'
      if (f.status !== 'ALL') params.status = f.status;
    }

    // SLA
    if (f.sla !== 'ALL') params.sla = f.sla;

    return params;
  }, []);

  // ── Push committed state to URL ─────────────────────────────────────────────
  const syncUrl = useCallback((f, pg) => {
    const p = new URLSearchParams();
    if (f.search.trim())            p.set('search', f.search.trim());
    if (f.applicationNumber.trim()) p.set('applicationNumber', f.applicationNumber.trim());
    if (f.certificateNumber.trim()) p.set('certificateNumber', f.certificateNumber.trim());
    if (f.applicantName.trim())     p.set('applicantName', f.applicantName.trim());
    if (f.email.trim())             p.set('email', f.email.trim());
    if (f.hospital.trim())          p.set('hospital', f.hospital.trim());
    if (f.certificateType !== 'ALL') p.set('certificateType', f.certificateType);
    if (f.status !== 'ALL')         p.set('status', f.status);
    if (f.escalated !== 'ALL')      p.set('escalated', f.escalated);
    if (f.sla !== 'ALL')            p.set('sla', f.sla);
    if (f.dateFrom)                 p.set('dateFrom', f.dateFrom);
    if (f.dateTo)                   p.set('dateTo', f.dateTo);
    if (pg > 1)                     p.set('page', pg);

    const qs = p.toString();
    navigate(`/admin/archive${qs ? '?' + qs : ''}`, { replace: true });
  }, [navigate]);

  // ── Fetch archive from backend ──────────────────────────────────────────────
  const fetchArchive = useCallback(async (f, pg) => {
    setLoading(true);
    setError('');
    try {
      const params = buildParams(f, pg);
      const res = await api.get('/admin/archive', { params });
      if (res.data && res.data.archiveRecords) {
        setRecords(res.data.archiveRecords);
        setPagination({
          totalRecords: res.data.totalRecords || 0,
          totalPages: res.data.totalPages || 1,
          currentPage: res.data.currentPage || pg,
          limit: res.data.limit || PAGE_LIMIT,
        });
      }
    } catch (err) {
      console.error('[Archive Error]:', err);
      setError(
        err.response?.data?.message ||
        'Unable to load digital archive records. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  // ── On mount / URL change: sync committed state + fetch ────────────────────
  useEffect(() => {
    const p = readParams(location.search);
    const f = { ...EMPTY_FILTERS, ...p };
    setFilters(f);
    setCommittedFilters(f);
    fetchArchive(f, p.page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCommittedFilters({ ...filters });
    syncUrl(filters, 1);
  };

  const handleClear = () => {
    setFilters({ ...EMPTY_FILTERS });
    setCommittedFilters({ ...EMPTY_FILTERS });
    navigate('/admin/archive', { replace: true });
  };

  const handlePageChange = (pg) => {
    if (pg < 1 || pg > pagination.totalPages) return;
    syncUrl(committedFilters, pg);
  };

  // ── Certificate download ────────────────────────────────────────────────────
  const handleDownloadCertificate = async (recordId, certNumber) => {
    try {
      const res = await api.get(`/certificates/${recordId}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
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
      alert('Failed to download certificate from archive.');
    }
  };

  // ── Active filter count (for badge) ────────────────────────────────────────
  const activeFilterCount = Object.entries(committedFilters).filter(([k, v]) => {
    if (['certificateType', 'status', 'escalated', 'sla'].includes(k)) return v !== 'ALL';
    return typeof v === 'string' && v.trim() !== '';
  }).length;

  // ── Pagination range helper ─────────────────────────────────────────────────
  const pageRange = () => {
    const total = pagination.totalPages;
    const cur = pagination.currentPage;
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(1, cur - delta);
      i <= Math.min(total, cur + delta);
      i++
    ) {
      range.push(i);
    }
    return range;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="container-fluid px-lg-5 py-4">

      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/admin/dashboard">Dashboard</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Digital Archive
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-archive-fill text-success me-2"></i>
            Municipal Digital Certificate Archive
          </h3>
          <p className="text-muted small mb-0">
            Advanced search and retrieval of civil registration records and issued certificates
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {activeFilterCount > 0 && (
            <span className="badge bg-primary rounded-pill">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </span>
          )}
          <span className="badge bg-success p-2">
            <i className="bi bi-shield-check me-1"></i>
            {pagination.totalRecords} Total Records
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger py-2 small mb-4 d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{error}</span>
        </div>
      )}

      {/* ── Advanced Search Panel ──────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm mb-4 bg-white">
        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
          <i className="bi bi-funnel-fill text-success"></i>
          <h6 className="fw-bold mb-0 text-dark">Advanced Archive Search</h6>
        </div>
        <div className="card-body p-4">
          <form onSubmit={handleSearch} noValidate>
            <div className="row g-3">

              {/* Row 1 */}
              <div className="col-md-4">
                <label className="form-label small fw-semibold text-muted">Application Number</label>
                <input
                  type="text"
                  className="form-control"
                  name="applicationNumber"
                  value={filters.applicationNumber}
                  onChange={handleChange}
                  placeholder="e.g. BIRTH-2026-001"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label small fw-semibold text-muted">Certificate Number</label>
                <input
                  type="text"
                  className="form-control"
                  name="certificateNumber"
                  value={filters.certificateNumber}
                  onChange={handleChange}
                  placeholder="e.g. CERT-2026-001"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label small fw-semibold text-muted">Applicant Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="applicantName"
                  value={filters.applicantName}
                  onChange={handleChange}
                  placeholder="Partial name search"
                />
              </div>

              {/* Row 2 */}
              <div className="col-md-4">
                <label className="form-label small fw-semibold text-muted">Applicant Email</label>
                <input
                  type="text"
                  className="form-control"
                  name="email"
                  value={filters.email}
                  onChange={handleChange}
                  placeholder="citizen@example.com"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label small fw-semibold text-muted">Hospital / Institution</label>
                <input
                  type="text"
                  className="form-control"
                  name="hospital"
                  value={filters.hospital}
                  onChange={handleChange}
                  placeholder="Hospital or place name"
                />
              </div>

              <div className="col-md-4">
                <label className="form-label small fw-semibold text-muted">General Search</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    name="search"
                    value={filters.search}
                    onChange={handleChange}
                    placeholder="Name, cert no, child/deceased..."
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="col-md-3 col-6">
                <label className="form-label small fw-semibold text-muted">Certificate Type</label>
                <select
                  className="form-select"
                  name="certificateType"
                  value={filters.certificateType}
                  onChange={handleChange}
                >
                  <option value="ALL">All Types</option>
                  <option value="BIRTH">Birth Certificates</option>
                  <option value="DEATH">Death Certificates</option>
                </select>
              </div>

              <div className="col-md-3 col-6">
                <label className="form-label small fw-semibold text-muted">Application Status</label>
                <select
                  className="form-select"
                  name="status"
                  value={filters.status}
                  onChange={handleChange}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending / In-Review</option>
                  <option value="UNDER_REVIEW">Under Review Only</option>
                  <option value="CORRECTION_REQUIRED">Correction Required</option>
                  <option value="RESUBMITTED">Resubmitted</option>
                  <option value="APPROVED">Approved / Issued</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="col-md-3 col-6">
                <label className="form-label small fw-semibold text-muted">SLA Status</label>
                <select
                  className="form-select"
                  name="sla"
                  value={filters.sla}
                  onChange={handleChange}
                >
                  <option value="ALL">All SLA</option>
                  <option value="overdue">SLA Overdue</option>
                  <option value="within">Within SLA</option>
                </select>
              </div>

              <div className="col-md-3 col-6">
                <label className="form-label small fw-semibold text-muted">Escalation</label>
                <select
                  className="form-select"
                  name="escalated"
                  value={filters.escalated}
                  onChange={handleChange}
                >
                  <option value="ALL">All (Escalated + Normal)</option>
                  <option value="true">Citizen Escalated Only</option>
                  <option value="false">Not Escalated</option>
                </select>
              </div>

              {/* Row 4: Date range */}
              <div className="col-md-3 col-6">
                <label className="form-label small fw-semibold text-muted">Date From (Submitted)</label>
                <input
                  type="date"
                  className="form-control"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleChange}
                />
              </div>

              <div className="col-md-3 col-6">
                <label className="form-label small fw-semibold text-muted">Date To (Submitted)</label>
                <input
                  type="date"
                  className="form-control"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleChange}
                />
              </div>

              {/* Buttons */}
              <div className="col-12 d-flex gap-2 mt-2">
                <button type="submit" className="btn btn-success px-4 fw-semibold" disabled={loading}>
                  <i className="bi bi-search me-2"></i>
                  {loading ? 'Searching...' : 'Search Archive'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary px-4"
                  onClick={handleClear}
                  disabled={loading}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Clear Filters
                </button>
              </div>

            </div>
          </form>
        </div>
      </div>

      {/* ── Results Table ──────────────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm bg-white">
        <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h5 className="card-title mb-0 fw-bold text-dark">
            {committedFilters.escalated === 'true' ? (
              <><i className="bi bi-exclamation-octagon-fill text-danger me-2"></i>Escalated Applications</>
            ) : committedFilters.sla === 'overdue' ? (
              <><i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>SLA Overdue Applications</>
            ) : committedFilters.status === 'APPROVED' ? (
              <><i className="bi bi-patch-check-fill text-success me-2"></i>Issued Certificates Archive</>
            ) : committedFilters.status === 'REJECTED' ? (
              <><i className="bi bi-x-circle text-danger me-2"></i>Rejected Applications Archive</>
            ) : (
              <><i className="bi bi-archive text-success me-2"></i>Digital Archive Repository</>
            )}
          </h5>
          <span className="badge bg-secondary">
            {loading
              ? '...'
              : pagination.totalRecords === 0
              ? '0 Records'
              : `Showing ${records.length} of ${pagination.totalRecords}`}
          </span>
        </div>

        <div className="card-body p-0">

          {/* Loading */}
          {loading ? (
            <div className="p-5 text-center">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <div className="mt-2 text-muted small">Searching archive repository...</div>
            </div>

          /* Empty */
          ) : records.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
              <h6 className="fw-bold">No Applications Found</h6>
              <p className="small mb-3">
                No records match the selected filter criteria.
              </p>
              <button className="btn btn-outline-secondary btn-sm" onClick={handleClear}>
                <i className="bi bi-x-circle me-1"></i> Clear Filters
              </button>
            </div>

          /* Table */
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small text-uppercase">
                    <tr>
                      <th className="ps-4">Certificate / App No</th>
                      <th>Applicant</th>
                      <th>Type</th>
                      <th>Beneficiary / Subject</th>
                      <th>Hospital / Place</th>
                      <th>Submitted</th>
                      <th>SLA</th>
                      <th>Status</th>
                      <th className="text-end pe-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => {
                      const beneficiary =
                        rec.certificateType === 'BIRTH'
                          ? rec.certificateDetails?.childName
                          : rec.certificateDetails?.deceasedName;

                      const isRecEscalated =
                        rec.isEscalated && ['PENDING', 'UNDER_REVIEW'].includes(rec.status);

                      return (
                        <tr key={rec._id} className={isRecEscalated ? 'table-danger bg-opacity-10' : ''}>

                          {/* Cert / App Number */}
                          <td className="ps-4">
                            {rec.certificateNumber ? (
                              <div className="fw-bold text-success">
                                <i className="bi bi-patch-check-fill me-1"></i>
                                {rec.certificateNumber}
                              </div>
                            ) : (
                              <div className="fw-bold text-primary">{rec.applicationNumber}</div>
                            )}
                            {rec.certificateNumber && (
                              <div className="small text-muted">{rec.applicationNumber}</div>
                            )}
                          </td>

                          {/* Applicant */}
                          <td>
                            <div className="fw-semibold text-dark small">
                              {rec.applicantDetails?.name || rec.applicant?.name || '—'}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {rec.applicantDetails?.email || rec.applicant?.email || ''}
                            </div>
                          </td>

                          {/* Type */}
                          <td>
                            <span
                              className={`badge ${
                                rec.certificateType === 'BIRTH' ? 'bg-primary' : 'bg-danger'
                              }`}
                            >
                              {rec.certificateType}
                            </span>
                          </td>

                          {/* Beneficiary */}
                          <td className="fw-bold text-dark small">{beneficiary || 'N/A'}</td>

                          {/* Hospital */}
                          <td className="small text-muted">
                            {rec.certificateDetails?.hospitalName || '—'}
                          </td>

                          {/* Date */}
                          <td className="small text-muted">
                            {rec.submittedAt
                              ? new Date(rec.submittedAt).toLocaleDateString('en-GB')
                              : 'N/A'}
                          </td>

                          {/* SLA */}
                          <td>
                            <SlaIndicator deadline={rec.slaDeadline} status={rec.status} />
                          </td>

                          {/* Status + Escalated badge + Integrity */}
                          <td>
                            <div className="d-flex flex-column gap-1 align-items-start">
                              <StatusBadge status={rec.status} />
                              {isRecEscalated && (
                                <span
                                  className="badge bg-danger text-white px-2 py-1"
                                  style={{ fontSize: '0.72rem' }}
                                >
                                  <i className="bi bi-megaphone-fill me-1"></i>
                                  CITIZEN ESCALATED
                                </span>
                              )}
                              {rec.certificateIntegrity?.dataHash && (
                                <span
                                  className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1"
                                  style={{ fontSize: '0.7rem' }}
                                  title="Cryptographically Verified (SHA-256)"
                                >
                                  <i className="bi bi-shield-check me-1"></i>
                                  SHA-256
                                </span>
                              )}
                              {rec.smartVerification?.overallRisk && (
                                <span
                                  className={`badge px-2 py-1 ${
                                    rec.smartVerification.overallRisk === 'LOW'
                                      ? 'bg-success bg-opacity-10 text-success border border-success border-opacity-25'
                                      : rec.smartVerification.overallRisk === 'MEDIUM'
                                      ? 'bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25'
                                      : 'bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25'
                                  }`}
                                  style={{ fontSize: '0.7rem' }}
                                  title={`Smart Verification: ${rec.smartVerification.overallRisk} risk — ${rec.smartVerification.flagsCount || 0} flag(s)`}
                                >
                                  <i className={`bi ${rec.smartVerification.requiresAttention ? 'bi-shield-exclamation' : 'bi-check-circle'} me-1`}></i>
                                  {rec.smartVerification.requiresAttention ? 'Attention' : 'Verified'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="text-end pe-4">
                            <div className="btn-group btn-group-sm">
                              {rec.certificateNumber ? (
                                <>
                                  <Link
                                    to={`/verify/${rec.certificateNumber}`}
                                    className="btn btn-outline-info"
                                    title="Public Verification Link"
                                  >
                                    <i className="bi bi-qr-code-scan"></i>
                                  </Link>
                                  <button
                                    className="btn btn-success"
                                    onClick={() =>
                                      handleDownloadCertificate(rec._id, rec.certificateNumber)
                                    }
                                    title="Download Official PDF Certificate"
                                  >
                                    <i className="bi bi-file-earmark-pdf me-1"></i>PDF
                                  </button>
                                </>
                              ) : (
                                <Link
                                  to={`/officer/applications/${rec._id}`}
                                  className="btn btn-outline-primary"
                                  title="View Application Details"
                                >
                                  <i className="bi bi-eye me-1"></i>View
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ─────────────────────────────────────────────── */}
              {pagination.totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center px-4 py-3 border-top flex-wrap gap-2">
                  <div className="small text-muted">
                    Page {pagination.currentPage} of {pagination.totalPages}
                    {' '}· {pagination.totalRecords} total record{pagination.totalRecords !== 1 ? 's' : ''}
                  </div>
                  <nav aria-label="Archive pagination">
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          aria-label="Previous"
                        >
                          <i className="bi bi-chevron-left"></i>
                        </button>
                      </li>

                      {pagination.currentPage > 3 && (
                        <>
                          <li className="page-item">
                            <button className="page-link" onClick={() => handlePageChange(1)}>1</button>
                          </li>
                          {pagination.currentPage > 4 && (
                            <li className="page-item disabled">
                              <span className="page-link">…</span>
                            </li>
                          )}
                        </>
                      )}

                      {pageRange().map((pg) => (
                        <li
                          key={pg}
                          className={`page-item ${pg === pagination.currentPage ? 'active' : ''}`}
                        >
                          <button className="page-link" onClick={() => handlePageChange(pg)}>
                            {pg}
                          </button>
                        </li>
                      ))}

                      {pagination.currentPage < pagination.totalPages - 2 && (
                        <>
                          {pagination.currentPage < pagination.totalPages - 3 && (
                            <li className="page-item disabled">
                              <span className="page-link">…</span>
                            </li>
                          )}
                          <li className="page-item">
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(pagination.totalPages)}
                            >
                              {pagination.totalPages}
                            </button>
                          </li>
                        </>
                      )}

                      <li
                        className={`page-item ${
                          pagination.currentPage === pagination.totalPages ? 'disabled' : ''
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          aria-label="Next"
                        >
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigitalArchive;
