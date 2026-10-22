import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CitizenProfile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile data & loading states
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    role: '',
    _id: '',
    createdAt: '',
    updatedAt: '',
  });

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ ...profileData });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Application summary state
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Fetch Profile & Application summary from backend
  const fetchProfileAndStats = async () => {
    setLoading(true);
    setProfileError('');
    try {
      // 1. Fetch user profile
      const userRes = await api.get('/auth/profile');
      if (userRes.data && userRes.data.user) {
        const u = userRes.data.user;
        const mapped = {
          name: u.name || '',
          email: u.email || '',
          mobile: u.mobile || '',
          address: u.address || '',
          city: u.city || '',
          state: u.state || '',
          pincode: u.pincode || '',
          role: u.role || 'citizen',
          _id: u._id || '',
          createdAt: u.createdAt || '',
          updatedAt: u.updatedAt || '',
        };
        setProfileData(mapped);
        setFormData(mapped);
      }

      // 2. Fetch authenticated citizen's actual application summary
      setSummaryLoading(true);
      const appRes = await api.get('/applications/my');
      if (appRes.data && appRes.data.summary) {
        setSummary(appRes.data.summary);
      }
    } catch (err) {
      console.error('[Profile Fetch Error]:', err);
      setProfileError('Failed to load profile details from the server.');
    } finally {
      setLoading(false);
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  // Form input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Password input handler
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  // Profile update submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    // Client-side validations
    if (!formData.name.trim()) {
      setProfileError('Full name is required.');
      return;
    }
    if (!formData.mobile.trim() || !/^\d{10}$/.test(formData.mobile.trim().replace(/\D/g, ''))) {
      setProfileError('Please provide a valid 10-digit mobile number.');
      return;
    }
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setProfileError('Please provide a valid email address.');
      return;
    }
    if (!formData.address.trim()) {
      setProfileError('Residential address is required.');
      return;
    }
    if (!formData.city.trim()) {
      setProfileError('City / Municipality is required.');
      return;
    }
    if (!formData.state.trim()) {
      setProfileError('State is required.');
      return;
    }
    if (!formData.pincode.trim() || !/^\d{6}$/.test(formData.pincode.trim())) {
      setProfileError('Please provide a valid 6-digit PIN code.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/auth/profile', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
      });

      if (res.data && res.data.success) {
        setProfileSuccess('Profile updated successfully.');
        setProfileData({ ...formData });
        setEditMode(false);
        // Sync AuthContext so navbar & sidebar immediately reflect changes
        if (updateUser && res.data.user) {
          updateUser(res.data.user);
        }
      }
    } catch (err) {
      console.error('[Update Profile Error]:', err);
      setProfileError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Password update submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.put('/auth/change-password', passwordData);
      if (res.data && res.data.success) {
        setPasswordSuccess('Password changed successfully.');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        });
        setShowPasswordForm(false);
      }
    } catch (err) {
      console.error('[Change Password Error]:', err);
      setPasswordError(err.response?.data?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Initials generator for avatar
  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
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
                  <Link to="/citizen/dashboard" className="citizen-nav-item">
                    <i className="bi bi-house-door-fill"></i>
                    <span>Dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link to="/citizen/apply/birth" className="citizen-nav-item">
                    <i className="bi bi-file-earmark-plus"></i>
                    <span>Apply for Certificate</span>
                  </Link>
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
                  <Link to="/citizen/profile" className="citizen-nav-item active">
                    <i className="bi bi-person-fill"></i>
                    <span>My Profile</span>
                  </Link>
                </li>
              </ul>

              {/* Subtle Watermark */}
              <div className="sidebar-watermark-wrapper d-none d-lg-block" aria-hidden="true">
                <img src="/assets/homepage.png" alt="" className="sidebar-watermark-img" />
              </div>
            </div>
          </div>

          {/* ── Main Profile Content ── */}
          <div className="col-12 col-lg-9 col-xl-10">
            {/* Top Feedback Messages */}
            {profileSuccess && (
              <div className="alert alert-success alert-dismissible fade show rounded-3 py-2.5 px-3 mb-4 shadow-sm" role="alert">
                <i className="bi bi-check-circle-fill me-2"></i>
                {profileSuccess}
                <button type="button" className="btn-close" onClick={() => setProfileSuccess('')} aria-label="Close"></button>
              </div>
            )}

            {profileError && (
              <div className="alert alert-danger alert-dismissible fade show rounded-3 py-2.5 px-3 mb-4 shadow-sm" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {profileError}
                <button type="button" className="btn-close" onClick={() => setProfileError('')} aria-label="Close"></button>
              </div>
            )}

            {/* 1. Profile Header Card */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f2b5c 0%, #1e4b8a 100%)', color: '#ffffff' }}>
              <div className="card-body p-4 p-md-5 position-relative">
                <div className="row align-items-center g-3">
                  <div className="col-auto">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center shadow"
                      style={{
                        width: '84px',
                        height: '84px',
                        backgroundColor: '#ffffff',
                        color: '#1a365d',
                        fontSize: '2rem',
                        fontWeight: '800',
                        border: '3px solid #d97706',
                      }}
                    >
                      {getInitials(profileData.name)}
                    </div>
                  </div>
                  <div className="col">
                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                      <h2 className="fw-bold mb-0 text-white" style={{ fontSize: '1.85rem' }}>
                        {profileData.name || 'Citizen User'}
                      </h2>
                      {/* <span className="badge bg-warning text-dark px-2.5 py-1 rounded-pill fw-bold text-uppercase" style={{ fontSize: '0.72rem' }}>
                        <i className="bi bi-shield-check me-1"></i> Official Citizen Account
                      </span> */}
                    </div>
                    <div className="text-light opacity-85 small d-flex flex-wrap gap-3">
                      <span><i className="bi bi-envelope me-1"></i> {profileData.email}</span>
                      <span><i className="bi bi-phone me-1"></i> {profileData.mobile}</span>
                      {profileData.createdAt && (
                        <span>
                          <i className="bi bi-calendar3 me-1"></i> Member since {new Date(profileData.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-12 col-md-auto text-md-end">
                    <button
                      type="button"
                      className={`btn fw-bold px-4 py-2 rounded-3 shadow-sm ${editMode ? 'btn-outline-light' : 'btn-warning text-dark'}`}
                      onClick={() => {
                        setEditMode(!editMode);
                        setFormData({ ...profileData });
                        setProfileError('');
                        setProfileSuccess('');
                      }}
                    >
                      {editMode ? (
                        <>
                          <i className="bi bi-x-circle me-1.5"></i> Cancel Edit
                        </>
                      ) : (
                        <>
                          <i className="bi bi-pencil-square me-1.5"></i> Edit Profile
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Application Summary Cards (clickable, filters /citizen/applications) */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-xl-3">
                <Link to="/citizen/applications?status=all" className="summary-stat-card">
                  <div className="stat-icon-circle stat-blue-bg">
                    <i className="bi bi-file-earmark-text-fill"></i>
                  </div>
                  <div className="text-center flex-grow-1 px-2">
                    <div className="text-muted small fw-semibold">Total Applications</div>
                    <div className="fw-bold text-dark fs-3 lh-1 mt-1">
                      {summaryLoading ? '...' : summary.total}
                    </div>
                  </div>
                  <div className="stat-arrow-pill stat-blue-bg">
                    <i className="bi bi-chevron-right"></i>
                  </div>
                </Link>
              </div>

              <div className="col-6 col-xl-3">
                <Link to="/citizen/applications?status=pending" className="summary-stat-card">
                  <div className="stat-icon-circle stat-yellow-bg">
                    <i className="bi bi-clock-fill"></i>
                  </div>
                  <div className="text-center flex-grow-1 px-2">
                    <div className="text-muted small fw-semibold">Pending / In-Review</div>
                    <div className="fw-bold fs-3 lh-1 mt-1" style={{ color: '#d97706' }}>
                      {summaryLoading ? '...' : summary.pending}
                    </div>
                  </div>
                  <div className="stat-arrow-pill stat-yellow-bg">
                    <i className="bi bi-chevron-right"></i>
                  </div>
                </Link>
              </div>

              <div className="col-6 col-xl-3">
                <Link to="/citizen/applications?status=approved" className="summary-stat-card">
                  <div className="stat-icon-circle stat-green-bg">
                    <i className="bi bi-check-lg"></i>
                  </div>
                  <div className="text-center flex-grow-1 px-2">
                    <div className="text-muted small fw-semibold">Approved</div>
                    <div className="fw-bold fs-3 lh-1 mt-1" style={{ color: '#16a34a' }}>
                      {summaryLoading ? '...' : summary.approved}
                    </div>
                  </div>
                  <div className="stat-arrow-pill stat-green-bg">
                    <i className="bi bi-chevron-right"></i>
                  </div>
                </Link>
              </div>

              <div className="col-6 col-xl-3">
                <Link to="/citizen/applications?status=rejected" className="summary-stat-card">
                  <div className="stat-icon-circle stat-red-bg">
                    <i className="bi bi-x-lg"></i>
                  </div>
                  <div className="text-center flex-grow-1 px-2">
                    <div className="text-muted small fw-semibold">Rejected</div>
                    <div className="fw-bold fs-3 lh-1 mt-1" style={{ color: '#dc2626' }}>
                      {summaryLoading ? '...' : summary.rejected}
                    </div>
                  </div>
                  <div className="stat-arrow-pill stat-red-bg">
                    <i className="bi bi-chevron-right"></i>
                  </div>
                </Link>
              </div>
            </div>

            {/* Profile Editing Form or Display View */}
            {loading ? (
              <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white mb-4">
                <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
                <div className="text-muted">Loading citizen profile records...</div>
              </div>
            ) : editMode ? (
              /* Edit Profile Form */
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                  <i className="bi bi-pencil-square text-primary fs-5 me-2"></i>
                  <h5 className="fw-bold text-dark mb-0">Edit Profile Information</h5>
                </div>
                <form onSubmit={handleProfileSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary">
                        Full Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary">
                        Registered Mobile Number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        name="mobile"
                        className="form-control"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        placeholder="10-digit mobile number"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary">
                        Email Address <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-secondary">
                        Account Role <span className="text-muted">(Protected)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={formData.role.toUpperCase()}
                        disabled
                        readOnly
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold text-secondary">
                        Residential Address <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        className="form-control"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-secondary">
                        City / Municipality <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="city"
                        className="form-control"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-secondary">
                        State <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="state"
                        className="form-control"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-bold text-secondary">
                        PIN Code <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        className="form-control"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        maxLength="6"
                        required
                      />
                    </div>
                  </div>

                  <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-4 py-2 rounded-3 fw-semibold"
                      onClick={() => {
                        setEditMode(false);
                        setFormData({ ...profileData });
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary px-4 py-2 rounded-3 fw-bold"
                      style={{ backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' }}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-save me-1.5"></i> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Display View: 2. Personal Information & 3. Contact Information */
              <div className="row g-4 mb-4">
                {/* 2. Personal Information */}
                <div className="col-12 col-md-6">
                  <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                    <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                      <i className="bi bi-person-badge text-primary fs-5 me-2"></i>
                      <h5 className="fw-bold text-dark mb-0">Personal Information</h5>
                    </div>
                    <div className="d-flex flex-column gap-3">
                      <div>
                        <div className="text-muted small fw-semibold">Full Legal Name</div>
                        <div className="fw-bold text-dark fs-6 mt-0.5">{profileData.name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-muted small fw-semibold">Account Role</div>
                        <div className="mt-0.5">
                          <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1 rounded-pill fw-semibold text-capitalize">
                            {profileData.role || 'Citizen'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-muted small fw-semibold">Municipal Account ID</div>
                        <div className="font-monospace small text-dark mt-0.5" style={{ wordBreak: 'break-all' }}>
                          {profileData._id || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted small fw-semibold">Assigned Department</div>
                        <div className="text-dark small mt-0.5">Civil Registration Department</div>
                      </div>
                      <div className="p-2.5 rounded-3 bg-light border text-muted small mt-1" style={{ fontSize: '0.78rem' }}>
                        <i className="bi bi-info-circle text-primary me-1"></i>
                        Note: Date of birth &amp; gender are verified during individual certificate applications (Birth/Death) per Municipal Civil Registration regulations.
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Contact Information */}
                <div className="col-12 col-md-6">
                  <div className="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
                    <div className="d-flex align-items-center mb-3 pb-2 border-bottom">
                      <i className="bi bi-geo-alt text-primary fs-5 me-2"></i>
                      <h5 className="fw-bold text-dark mb-0">Contact &amp; Address Details</h5>
                    </div>
                    <div className="d-flex flex-column gap-3">
                      <div>
                        <div className="text-muted small fw-semibold">Registered Mobile Number</div>
                        <div className="fw-bold text-dark fs-6 mt-0.5 d-flex align-items-center gap-2">
                          <i className="bi bi-telephone text-primary"></i>
                          {profileData.mobile || 'N/A'}
                          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 py-0.5 px-2 rounded-pill small">
                            Verified
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-muted small fw-semibold">Registered Email Address</div>
                        <div className="fw-semibold text-dark fs-6 mt-0.5 d-flex align-items-center gap-2">
                          <i className="bi bi-envelope text-primary"></i>
                          {profileData.email || 'N/A'}
                          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 py-0.5 px-2 rounded-pill small">
                            Active
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-muted small fw-semibold">Residential Address</div>
                        <div className="text-dark small mt-0.5">{profileData.address || 'N/A'}</div>
                      </div>
                      <div className="row g-2">
                        <div className="col-6">
                          <div className="text-muted small fw-semibold">City / Municipality</div>
                          <div className="text-dark fw-semibold small mt-0.5">{profileData.city || 'N/A'}</div>
                        </div>
                        <div className="col-6">
                          <div className="text-muted small fw-semibold">PIN Code</div>
                          <div className="text-dark fw-semibold small mt-0.5">{profileData.pincode || 'N/A'}</div>
                        </div>
                        <div className="col-12">
                          <div className="text-muted small fw-semibold">State</div>
                          <div className="text-dark small mt-0.5">{profileData.state || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Account & Security Card */}
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom flex-wrap gap-2">
                <div className="d-flex align-items-center">
                  <i className="bi bi-shield-lock text-primary fs-5 me-2"></i>
                  <h5 className="fw-bold text-dark mb-0">Account &amp; Security</h5>
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm px-3 rounded-3 fw-semibold"
                    onClick={() => {
                      setShowPasswordForm(!showPasswordForm);
                      setPasswordError('');
                      setPasswordSuccess('');
                    }}
                  >
                    <i className="bi bi-key me-1"></i> {showPasswordForm ? 'Hide Password Form' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm px-3 rounded-3 fw-semibold"
                    onClick={handleLogout}
                  >
                    <i className="bi bi-box-arrow-right me-1"></i> Logout
                  </button>
                </div>
              </div>

              {/* Password Feedback */}
              {passwordSuccess && (
                <div className="alert alert-success alert-dismissible fade show rounded-3 py-2 small mb-3">
                  <i className="bi bi-check-circle-fill me-1.5"></i> {passwordSuccess}
                  <button type="button" className="btn-close" onClick={() => setPasswordSuccess('')}></button>
                </div>
              )}
              {passwordError && (
                <div className="alert alert-danger alert-dismissible fade show rounded-3 py-2 small mb-3">
                  <i className="bi bi-exclamation-triangle-fill me-1.5"></i> {passwordError}
                  <button type="button" className="btn-close" onClick={() => setPasswordError('')}></button>
                </div>
              )}

              {/* Collapsible Change Password Form */}
              {showPasswordForm && (
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <h6 className="fw-bold text-dark mb-3">
                    <i className="bi bi-lock-fill text-primary me-1"></i> Update Account Password
                  </h6>
                  <form onSubmit={handlePasswordSubmit}>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label small fw-bold text-secondary">
                          Current Password <span className="text-danger">*</span>
                        </label>
                        <input
                          type="password"
                          name="currentPassword"
                          className="form-control"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          placeholder="••••••••"
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-bold text-secondary">
                          New Password <span className="text-danger">*</span>
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          className="form-control"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          placeholder="Min 8 characters"
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-bold text-secondary">
                          Confirm New Password <span className="text-danger">*</span>
                        </label>
                        <input
                          type="password"
                          name="confirmNewPassword"
                          className="form-control"
                          value={passwordData.confirmNewPassword}
                          onChange={handlePasswordChange}
                          placeholder="Repeat new password"
                          required
                        />
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-3">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-2 px-3"
                        onClick={() => setShowPasswordForm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-sm btn-primary rounded-2 px-3 fw-bold"
                        style={{ backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' }}
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Security Status List */}
              {/* <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div className="p-3 bg-light rounded-3 border h-100">
                    <div className="text-muted small fw-semibold">Account State</div>
                    <div className="d-flex align-items-center gap-1.5 mt-1 text-success fw-bold small">
                      <i className="bi bi-shield-fill-check fs-5 text-success"></i>
                      Active &amp; Authorized
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="p-3 bg-light rounded-3 border h-100">
                    <div className="text-muted small fw-semibold">Authentication Protocol</div>
                    <div className="d-flex align-items-center gap-1.5 mt-1 text-primary fw-bold small">
                      <i className="bi bi-fingerprint fs-5 text-primary"></i>
                      HMAC-SHA256 JWT Secured
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="p-3 bg-light rounded-3 border h-100">
                    <div className="text-muted small fw-semibold">Notification Channels</div>
                    <div className="d-flex align-items-center gap-1.5 mt-1 text-dark fw-bold small">
                      <i className="bi bi-bell-fill fs-5 text-warning"></i>
                      Email &amp; SMS Registered
                    </div>
                  </div>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenProfile;
