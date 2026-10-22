import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter & Search
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Officer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [officerData, setOfficerData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    department: 'Civil Registration & Verification Desk',
    city: 'Metropolitan District',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/admin/users', { params });
      if (res.data && res.data.users) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('[Fetch Users Error]:', err);
      setError('Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    if (officerData.password.length < 8) {
      setModalError('Officer password must be at least 8 characters long.');
      return;
    }

    setModalLoading(true);
    setModalError('');

    try {
      const res = await api.post('/admin/officers', officerData);
      if (res.data && res.data.officer) {
        setSuccess(`Officer '${res.data.officer.name}' created successfully.`);
        setIsModalOpen(false);
        setOfficerData({
          name: '',
          email: '',
          mobile: '',
          password: '',
          department: 'Civil Registration & Verification Desk',
          city: 'Metropolitan District',
        });
        fetchUsers();
      }
    } catch (err) {
      console.error('[Create Officer Error]:', err);
      setModalError(err.response?.data?.message || 'Failed to create officer account.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const res = await api.put(`/admin/users/${userId}/toggle-status`);
      if (res.data) {
        setSuccess(res.data.message);
        fetchUsers();
      }
    } catch (err) {
      console.error('[Toggle Status Error]:', err);
      setError(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  return (
    <div className="container-fluid px-lg-5 py-4">
      {/* Navigation Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/admin/dashboard">Admin Console</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            User Directory
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-people-fill text-primary me-2"></i> User & Officer Management
          </h3>
          <p className="text-muted small mb-0">Manage registered citizens, provision zonal officers, and control access permissions</p>
        </div>
        <button className="btn btn-warning fw-bold text-dark" onClick={() => setIsModalOpen(true)}>
          <i className="bi bi-person-plus-fill me-1"></i> Create New Officer Account
        </button>
      </div>

      {success && (
        <div className="alert alert-success alert-dismissible fade show py-2 small mb-4" role="alert">
          <i className="bi bi-check-circle me-1"></i> {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {error && <div className="alert alert-danger py-2 small mb-4">{error}</div>}

      {/* Filter and Search */}
      <div className="card border-0 shadow-sm mb-4 bg-white">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-light">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search user by Name, Email, Mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-4">
              <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="ALL">All Roles (Citizens & Officers)</option>
                <option value="citizen">Citizens Only</option>
                <option value="officer">Officers Only</option>
                <option value="admin">Administrators</option>
              </select>
            </div>

            <div className="col-md-2 text-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setRoleFilter('ALL');
                  setSearchQuery('');
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card border-0 shadow-sm bg-white">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-5 text-center">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="p-5 text-center text-muted">No users found matching your search.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th className="ps-4">User Name</th>
                    <th>Email Address</th>
                    <th>Mobile</th>
                    <th>Role</th>
                    <th>Department / City</th>
                    <th>Status</th>
                    <th>Registered On</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="ps-4 fw-bold text-dark">
                        <i
                          className={`bi ${
                            u.role === 'admin'
                              ? 'bi-shield-fill-check text-danger'
                              : u.role === 'officer'
                              ? 'bi-briefcase-fill text-warning'
                              : 'bi-person-fill text-primary'
                          } me-2`}
                        ></i>
                        {u.name}
                      </td>
                      <td className="text-muted small">{u.email}</td>
                      <td className="small">{u.mobile}</td>
                      <td>
                        <span
                          className={`badge ${
                            u.role === 'admin'
                              ? 'bg-danger'
                              : u.role === 'officer'
                              ? 'bg-warning text-dark'
                              : 'bg-info text-dark'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="small text-secondary">{u.department || u.city || 'Municipal District'}</td>
                      <td>
                        <span className={`badge ${u.isActive ? 'bg-success' : 'bg-secondary'}`}>
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="small text-muted">
                        {new Date(u.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="text-end pe-4">
                        {u.role !== 'admin' && (
                          <button
                            className={`btn btn-sm ${u.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            onClick={() => handleToggleStatus(u._id, u.isActive)}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Officer Modal */}
      {isModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title d-flex align-items-center">
                  <i className="bi bi-person-plus-fill text-warning me-2"></i> Provision Municipal Officer
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalLoading}
                ></button>
              </div>

              <form onSubmit={handleCreateOfficer}>
                <div className="modal-body p-4">
                  {modalError && <div className="alert alert-danger py-2 small mb-3">{modalError}</div>}

                  <div className="mb-3">
                    <label className="form-label fw-bold small text-secondary">
                      Officer Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. S. K. Verma (Registrar)"
                      value={officerData.name}
                      onChange={(e) => setOfficerData({ ...officerData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold small text-secondary">
                      Official Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="officer.zone1@municipal.gov"
                      value={officerData.email}
                      onChange={(e) => setOfficerData({ ...officerData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-bold small text-secondary">
                        Mobile Number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="9876543210"
                        value={officerData.mobile}
                        onChange={(e) => setOfficerData({ ...officerData, mobile: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-bold small text-secondary">
                        Password (min 8) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="••••••••"
                        value={officerData.password}
                        onChange={(e) => setOfficerData({ ...officerData, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold small text-secondary">Assigned Department</label>
                    <input
                      type="text"
                      className="form-control"
                      value={officerData.department}
                      onChange={(e) => setOfficerData({ ...officerData, department: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setIsModalOpen(false)}
                    disabled={modalLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning fw-bold text-dark" disabled={modalLoading}>
                    {modalLoading ? 'Creating...' : 'Provision Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
