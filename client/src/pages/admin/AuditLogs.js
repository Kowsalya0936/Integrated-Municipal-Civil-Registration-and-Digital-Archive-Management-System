import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;

      const res = await api.get('/admin/audit-logs', { params });
      if (res.data && res.data.logs) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error('[Audit Logs Error]:', err);
      setError('Unable to load system audit trail from MongoDB.');
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadge = (action) => {
    switch (action) {
      case 'USER_REGISTERED':
        return <span className="badge bg-info text-dark">USER_REGISTERED</span>;
      case 'USER_LOGIN':
        return <span className="badge bg-secondary">USER_LOGIN</span>;
      case 'APPLICATION_SUBMITTED':
        return <span className="badge bg-primary">APPLICATION_SUBMITTED</span>;
      case 'APPLICATION_UNDER_REVIEW':
        return <span className="badge bg-warning text-dark">UNDER_REVIEW</span>;
      case 'APPLICATION_APPROVED':
        return <span className="badge bg-success">APPLICATION_APPROVED</span>;
      case 'APPLICATION_REJECTED':
        return <span className="badge bg-danger">APPLICATION_REJECTED</span>;
      case 'CERTIFICATE_DOWNLOADED':
        return <span className="badge bg-success">CERTIFICATE_DOWNLOADED</span>;
      case 'OFFICER_CREATED':
        return <span className="badge bg-dark">OFFICER_CREATED</span>;
      default:
        return <span className="badge bg-light text-dark border">{action}</span>;
    }
  };

  return (
    <div className="container-fluid px-lg-5 py-4">
      {/* Navigation Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/admin/dashboard">Dashboard</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Audit Trail
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-shield-check text-dark me-2"></i> System Audit & Governance Trail
          </h3>
          <p className="text-muted small mb-0">Immutable chronological log of all application reviews, submissions, and administrative events</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchLogs}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh Log
        </button>
      </div>

      {error && <div className="alert alert-danger py-2 small mb-4">{error}</div>}

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm mb-4 bg-white">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <select className="form-select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                <option value="">All Audit Actions</option>
                <option value="USER_REGISTERED">User Registered</option>
                <option value="USER_LOGIN">User Login</option>
                <option value="APPLICATION_SUBMITTED">Application Submitted</option>
                <option value="APPLICATION_UNDER_REVIEW">Application Under Review</option>
                <option value="APPLICATION_APPROVED">Application Approved</option>
                <option value="APPLICATION_REJECTED">Application Rejected</option>
                <option value="CERTIFICATE_DOWNLOADED">Certificate Downloaded</option>
                <option value="OFFICER_CREATED">Officer Created</option>
              </select>
            </div>

            <div className="col-md-2">
              <button className="btn btn-outline-secondary w-100" onClick={() => setActionFilter('')}>
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card border-0 shadow-sm bg-white">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-5 text-center">
              <div className="spinner-border text-dark" role="status"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-5 text-center text-muted">No audit logs recorded matching criteria.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 font-monospace small">
                <thead className="table-dark text-uppercase" style={{ fontSize: '0.75rem' }}>
                  <tr>
                    <th className="ps-4">Timestamp</th>
                    <th>Action</th>
                    <th>Initiator User</th>
                    <th>Role</th>
                    <th>Record ID / Subject</th>
                    <th>IP Address</th>
                    <th className="pe-4">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="ps-4 text-muted">
                        {new Date(log.timestamp).toLocaleString('en-GB')}
                      </td>
                      <td>{getActionBadge(log.action)}</td>
                      <td className="fw-bold text-dark">{log.userName || 'System'}</td>
                      <td>
                        <span className="badge bg-light text-dark border">{log.role || 'system'}</span>
                      </td>
                      <td className="fw-semibold text-primary">{log.targetRecordId || '-'}</td>
                      <td className="text-muted">{log.ipAddress || '127.0.0.1'}</td>
                      <td className="pe-4 text-muted" style={{ maxWidth: '250px' }}>
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
