import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import SlaIndicator from '../../components/SlaIndicator';

const MyApplications = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync status filter from location query parameter (e.g. ?status=pending)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const upper = statusParam.toUpperCase();
      if (['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW'].includes(upper)) {
        setStatusFilter(upper);
      }
    }
  }, [location.search]);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/applications/my');
      if (res.data) {
        setApplications(res.data.applications || []);
        setFilteredApplications(res.data.applications || []);
      }
    } catch (err) {
      console.error('[Fetch My Applications Error]:', err);
      setError('Unable to load applications from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Filter effect
  useEffect(() => {
    let result = [...applications];

    if (typeFilter !== 'ALL') {
      result = result.filter((a) => a.certificateType === typeFilter);
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PENDING') {
        result = result.filter((a) => a.status === 'PENDING' || a.status === 'UNDER_REVIEW');
      } else {
        result = result.filter((a) => a.status === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => {
        const appNum = (a.applicationNumber || '').toLowerCase();
        const certNum = (a.certificateNumber || '').toLowerCase();
        const child = (a.certificateDetails?.childName || '').toLowerCase();
        const deceased = (a.certificateDetails?.deceasedName || '').toLowerCase();
        return appNum.includes(q) || certNum.includes(q) || child.includes(q) || deceased.includes(q);
      });
    }

    setFilteredApplications(result);
  }, [typeFilter, statusFilter, searchQuery, applications]);

  const handleDownload = async (appId, certNumber) => {
    try {
      const res = await api.get(`/certificates/${appId}/download`, {
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
      console.error('[Download Certificate Error]:', err);
      alert('Could not download certificate.');
    }
  };

  return (
    <div className="container py-4">
      {/* Navigation Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/citizen/dashboard">Dashboard</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            My Applications
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-folder2-open text-primary me-2"></i> My Certificate Applications
          </h3>
          <p className="text-muted small mb-0">Track real-time status and download approved municipal certificates</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/citizen/apply/birth" className="btn btn-primary btn-sm">
            <i className="bi bi-plus-lg me-1"></i> Apply Birth
          </Link>
          <Link to="/citizen/apply/death" className="btn btn-danger btn-sm">
            <i className="bi bi-plus-lg me-1"></i> Apply Death
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 small mb-4">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="card border-0 shadow-sm mb-4 bg-white">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by Application No, Certificate No, or Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3 col-6">
              <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="ALL">All Types (Birth & Death)</option>
                <option value="BIRTH">Birth Certificates</option>
                <option value="DEATH">Death Certificates</option>
              </select>
            </div>

            <div className="col-md-3 col-6">
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="col-md-1 text-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setTypeFilter('ALL');
                  setSearchQuery('');
                  // Navigate to base URL to clear ?status= query param.
                  // The location useEffect will then set statusFilter back to 'ALL'.
                  navigate('/citizen/applications');
                }}
                title="Reset Filters"
              >
                <i className="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="card border-0 shadow-sm bg-white">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
              <div className="mt-2 text-muted small">Loading your records...</div>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-5 text-center text-muted">
              <i className="bi bi-folder-x fs-1 d-block mb-2"></i>
              <h6 className="fw-bold">
                {statusFilter === 'PENDING'
                  ? 'No Pending or In-Review Applications'
                  : statusFilter === 'APPROVED'
                  ? 'No Approved Applications'
                  : statusFilter === 'REJECTED'
                  ? 'No Rejected Applications'
                  : statusFilter === 'UNDER_REVIEW'
                  ? 'No Under-Review Applications'
                  : 'No Applications Found'}
              </h6>
              <p className="small mb-3">
                {statusFilter !== 'ALL'
                  ? `You have no ${statusFilter === 'PENDING' ? 'pending or in-review' : statusFilter.toLowerCase().replace('_', ' ')} certificate applications.`
                  : 'No submitted certificate applications match your filter criteria.'}
              </p>
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={() => {
                  setTypeFilter('ALL');
                  setSearchQuery('');
                  navigate('/citizen/applications');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th className="ps-4">Application Number</th>
                    <th>Certificate Type</th>
                    <th>Beneficiary Name</th>
                    <th>Submission Date</th>
                    <th>SLA Status</th>
                    <th>Status</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => {
                    const beneficiary =
                      app.certificateType === 'BIRTH'
                        ? app.certificateDetails?.childName
                        : app.certificateDetails?.deceasedName;

                    return (
                      <tr key={app._id}>
                        <td className="ps-4">
                          <Link to={`/citizen/applications/${app._id}`} className="fw-bold text-primary text-decoration-none">
                            {app.applicationNumber}
                          </Link>
                          {app.certificateNumber && (
                            <div className="small text-success fw-semibold">
                              <i className="bi bi-patch-check-fill me-1"></i> {app.certificateNumber}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${app.certificateType === 'BIRTH' ? 'bg-primary' : 'bg-danger'}`}>
                            {app.certificateType}
                          </span>
                        </td>
                        <td className="fw-semibold">{beneficiary || 'N/A'}</td>
                        <td className="text-muted small">
                          {new Date(app.submittedAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td>
                          <SlaIndicator deadline={app.slaDeadline} status={app.status} />
                        </td>
                        <td>
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="text-end pe-4">
                          <div className="btn-group btn-group-sm">
                            <Link to={`/citizen/applications/${app._id}`} className="btn btn-outline-secondary">
                              <i className="bi bi-eye me-1"></i> Details
                            </Link>
                            {app.status === 'APPROVED' && (
                              <button
                                className="btn btn-success"
                                onClick={() => handleDownload(app._id, app.certificateNumber)}
                                title="Download Official Certificate PDF"
                              >
                                <i className="bi bi-download me-1"></i> PDF
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
  );
};

export default MyApplications;
