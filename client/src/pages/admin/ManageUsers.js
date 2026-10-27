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
  const initialOfficerData = {
    name: '',
    email: '',
    mobile: '',
    password: '',
    employeeId: '',
    designation: 'Registrar (Civil Registration Officer)',
    department: 'Birth & Death Civil Registration Desk',
    city: 'Metropolitan District',
    address: 'Zone-1 Zonal Municipal Office, Desk 4',
    state: 'Central State',
    pincode: '110001',
    jurisdictionAddress: '',
    isActive: true,
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [officerData, setOfficerData] = useState(initialOfficerData);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const handleInputChange = (field, value) => {
    setOfficerData((prev) => ({ ...prev, [field]: value }));
  };

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
    setModalError('');

    // Validation
    if (!officerData.name.trim()) {
      setModalError('Officer full name is required.');
      return;
    }

    if (!officerData.email.trim()) {
      setModalError('Official email address is required.');
      return;
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(officerData.email.trim())) {
      setModalError('Please enter a valid official email address.');
      return;
    }

    const mobileClean = officerData.mobile.replace(/\D/g, '');
    if (mobileClean.length !== 10) {
      setModalError('Official mobile number must be exactly 10 digits.');
      return;
    }

    if (!officerData.password || officerData.password.length < 8) {
      setModalError('Officer account password must be at least 8 characters long.');
      return;
    }

    if (officerData.pincode && !/^\d{6}$/.test(officerData.pincode.trim())) {
      setModalError('Postal PIN code must be exactly 6 digits.');
      return;
    }

    setModalLoading(true);

    try {
      const res = await api.post('/admin/officers', {
        ...officerData,
        mobile: mobileClean,
      });
      if (res.data && res.data.officer) {
        setSuccess(`Officer '${res.data.officer.name}' provisioned successfully.`);
        setIsModalOpen(false);
        setOfficerData(initialOfficerData);
        fetchUsers();
      }
    } catch (err) {
      console.error('[Create Officer Error]:', err);
      setModalError(err.response?.data?.message || 'Failed to provision officer account.');
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
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
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
                <div className="modal-body p-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                  {modalError && (
                    <div className="alert alert-danger py-2 small mb-3 d-flex align-items-center">
                      <i className="bi bi-exclamation-triangle-fill me-2 flex-shrink-0"></i>
                      <div>{modalError}</div>
                    </div>
                  )}

                  {/* SECTION A: Officer Identity & Account Details */}
                  <div className="p-3 rounded-3 mb-4" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                      <span
                        className="badge bg-primary rounded-circle p-1 d-flex align-items-center justify-content-center"
                        style={{ width: '22px', height: '22px' }}
                      >
                        <i className="bi bi-person-fill text-white" style={{ fontSize: '0.75rem' }}></i>
                      </span>
                      <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '0.92rem' }}>
                        Section A: Officer Identity &amp; Account Details
                      </h6>
                    </div>

                    <div className="row g-3">
                      {/* Full Name */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-secondary">
                          Officer Full Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Rajesh Sharma"
                          value={officerData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          required
                        />
                      </div>

                      {/* Employee / Registrar ID */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-secondary d-flex justify-content-between align-items-center">
                          <span>Employee / Registrar ID</span>
                          <span className="text-muted fw-normal" style={{ fontSize: '0.72rem' }}>Optional</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. REG-004521"
                          value={officerData.employeeId}
                          onChange={(e) => handleInputChange('employeeId', e.target.value)}
                        />
                        <div className="form-text" style={{ fontSize: '0.72rem' }}>
                          Leave empty to auto-generate unique registration ID.
                        </div>
                      </div>

                      {/* Official Email */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-secondary">
                          Official Email Address <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-white text-muted">
                            <i className="bi bi-envelope"></i>
                          </span>
                          <input
                            type="email"
                            className="form-control"
                            placeholder="officer@municipal.gov"
                            value={officerData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Mobile Number */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-secondary">
                          Official Mobile Number <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-white text-muted">
                            <i className="bi bi-telephone"></i>
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            className="form-control"
                            placeholder="9876543211 (10 digits)"
                            value={officerData.mobile}
                            onChange={(e) => handleInputChange('mobile', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Initial Password */}
                      <div className="col-12">
                        <label className="form-label fw-bold small text-secondary">
                          Initial Account Password <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text bg-white text-muted">
                            <i className="bi bi-key"></i>
                          </span>
                          <input
                            type="password"
                            className="form-control"
                            placeholder="Minimum 8 characters"
                            value={officerData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            required
                            minLength={8}
                          />
                        </div>
                        <div className="form-text" style={{ fontSize: '0.72rem' }}>
                          Hashed securely before saving into the database.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION B: Official Posting & Jurisdictional Details */}
                  <div className="p-3 rounded-3 mb-4" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                      <span
                        className="badge bg-warning rounded-circle p-1 d-flex align-items-center justify-content-center"
                        style={{ width: '22px', height: '22px' }}
                      >
                        <i className="bi bi-building text-dark" style={{ fontSize: '0.75rem' }}></i>
                      </span>
                      <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '0.92rem' }}>
                        Section B: Official Posting &amp; Jurisdictional Details
                      </h6>
                    </div>

                    <div className="row g-3">
                      {/* Designation */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-secondary">
                          Official Designation <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Registrar (Civil Registration Officer)"
                          list="designationOptions"
                          value={officerData.designation}
                          onChange={(e) => handleInputChange('designation', e.target.value)}
                          required
                        />
                        <datalist id="designationOptions">
                          <option value="Registrar (Civil Registration Officer)" />
                          <option value="Additional Registrar (Birth & Death)" />
                          <option value="Sub-Registrar / Verification Officer" />
                          <option value="Assistant Municipal Registrar" />
                          <option value="Senior Civil Registration Officer" />
                        </datalist>
                      </div>

                      {/* Assigned Department */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-secondary">
                          Assigned Department <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Birth & Death Civil Registration Desk"
                          list="deptOptions"
                          value={officerData.department}
                          onChange={(e) => handleInputChange('department', e.target.value)}
                          required
                        />
                        <datalist id="deptOptions">
                          <option value="Birth & Death Civil Registration Desk" />
                          <option value="Civil Registration & Verification Desk" />
                          <option value="Digital Archive & Records Verification Desk" />
                          <option value="Municipal Vital Statistics Division" />
                        </datalist>
                      </div>

                      {/* Municipality / District */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-secondary">
                          Municipality / District <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Metropolitan District"
                          value={officerData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          required
                        />
                      </div>

                      {/* Office Location */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-secondary">
                          Assigned Office Location <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Zone-1 Zonal Municipal Office, Desk 4"
                          value={officerData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          required
                        />
                      </div>

                      {/* State */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-secondary">
                          State <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Central State"
                          value={officerData.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          required
                        />
                      </div>

                      {/* Postal PIN Code */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-secondary">
                          Postal PIN Code <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          className="form-control"
                          placeholder="e.g. 110001 (6 digits)"
                          value={officerData.pincode}
                          onChange={(e) => handleInputChange('pincode', e.target.value)}
                          required
                        />
                      </div>

                      {/* Jurisdictional Address */}
                      <div className="col-12">
                        <label className="form-label fw-bold small text-secondary d-flex justify-content-between align-items-center">
                          <span>Jurisdictional Address (Official Full Location)</span>
                          <span className="text-muted fw-normal" style={{ fontSize: '0.72rem' }}>Optional</span>
                        </label>
                        <textarea
                          rows={2}
                          className="form-control"
                          placeholder="Leave blank to auto-compose from Office Location, District, State & PIN"
                          value={officerData.jurisdictionAddress}
                          onChange={(e) => handleInputChange('jurisdictionAddress', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION C: Account Permissions & Status */}
                  <div className="p-3 rounded-3" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                      <span
                        className="badge bg-success rounded-circle p-1 d-flex align-items-center justify-content-center"
                        style={{ width: '22px', height: '22px' }}
                      >
                        <i className="bi bi-shield-lock-fill text-white" style={{ fontSize: '0.75rem' }}></i>
                      </span>
                      <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '0.92rem' }}>
                        Section C: Account Permissions &amp; Status
                      </h6>
                    </div>

                    <div className="row g-3">
                      {/* Role (Read-only / Enforced) */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-secondary">System Account Role</label>
                        <input
                          type="text"
                          className="form-control bg-light"
                          value="Officer / Registrar (Role: officer)"
                          disabled
                          readOnly
                        />
                        <div className="form-text" style={{ fontSize: '0.72rem' }}>
                          <i className="bi bi-lock me-1"></i> Centrally restricted to Municipal Officer privileges.
                        </div>
                      </div>

                      {/* Account Status */}
                      <div className="col-12 col-md-6">
                        <label className="form-label fw-bold small text-secondary">Account Status</label>
                        <select
                          className="form-select"
                          value={officerData.isActive ? 'true' : 'false'}
                          onChange={(e) => handleInputChange('isActive', e.target.value === 'true')}
                        >
                          <option value="true">Active (Permitted to log in and verify records)</option>
                          <option value="false">Deactivated (Account access suspended)</option>
                        </select>
                        <div className="form-text" style={{ fontSize: '0.72rem' }}>
                          Active accounts can immediately access the Registrar Portal.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setIsModalOpen(false)}
                    disabled={modalLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning fw-bold text-dark px-4 shadow-sm" disabled={modalLoading}>
                    {modalLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Provisioning Account...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle-fill me-1.5"></i>
                        Provision Account
                      </>
                    )}
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
