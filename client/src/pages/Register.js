import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
  const { name, value } = e.target;

  setFormData((previous) => ({
    ...previous,
    [name]: value
  }));

  setError('');
 };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (
      !formData.fullName ||
      !formData.mobile ||
      !formData.email ||
      !formData.address ||
      !formData.city ||
      !formData.state ||
      !formData.pinCode ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!/^[0-9]{10}$/.test(formData.mobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!/^[0-9]{6}$/.test(formData.pinCode)) {
      setError('Please enter a valid 6-digit PIN code.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.fullName.trim(),
        fullName: formData.fullName.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state,
        pincode: formData.pinCode.trim(),
        pinCode: formData.pinCode.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      setSuccess('Account created successfully. Redirecting to login...');

      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      console.error('[Registration Failed]:', err);

      setError(
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">

      {/* Subtle civic background */}
      <div className="register-city-background">
        <div className="register-building building-one"></div>
        <div className="register-building building-two"></div>
        <div className="register-building building-three"></div>
        <div className="register-building building-four"></div>
        <div className="register-building building-five"></div>
      </div>

      <main className="register-container">

        {/* Page Heading */}
        <div className="register-heading">

          {/* <div className="register-user-icon">
            <i className="bi bi-person-plus"></i>
          </div> */}

          <h1>Create Citizen Account</h1>

          <div className="register-gold-line"></div>

          <p>
            Register to access municipal digital services
            <br />
            and manage your documents online.
          </p>

        </div>

        {/* Registration Card */}
        <div className="register-card">

          {/* Error */}
          {error && (
            <div className="register-alert register-alert-danger">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="register-alert register-alert-success">
              <i className="bi bi-check-circle-fill"></i>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="register-section">

              <div className="register-section-title">
                <i className="bi bi-person-vcard"></i>
                <span>1. Personal &amp; Contact Details</span>
              </div>

              <div className="register-divider"></div>

              <div className="row g-3">

                {/* Full Name */}
                <div className="col-md-6">

                  <div className="register-field">

                    <label htmlFor="fullName">
                      Full Name <span>*</span>
                    </label>

                    <div className="register-input-group">

                      <div className="register-input-icon">
                        <i className="bi bi-person"></i>
                      </div>

                      <input
                        id="fullName"
                        name="fullName"
                        autoComplete="name"
                        type="text"
                        placeholder="e.g. Ramesh Chandra"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                      />

                    </div>

                  </div>

                </div>

                {/* Mobile */}
                <div className="col-md-6">

                  <div className="register-field">

                    <label htmlFor="mobile">
                      Mobile Number <span>*</span>
                    </label>

                    <div className="register-input-group">

                      <div className="register-input-icon">
                        <i className="bi bi-telephone"></i>
                      </div>

                      <input
                        id="mobile"
                        name="mobile"
                        autoComplete="tel"
                        type="tel"
                        inputMode="numeric"
                        maxLength="10"
                        placeholder="e.g. 9876543210"
                        value={formData.mobile}
                        onChange={handleChange}
                        required
                      />

                    </div>

                  </div>

                </div>

                {/* Email */}
                <div className="col-12">

                  <div className="register-field">

                    <label htmlFor="email">
                      Email Address <span>*</span>
                    </label>

                    <div className="register-input-group">

                      <div className="register-input-icon">
                        <i className="bi bi-envelope"></i>
                      </div>

                      <input
                        id="email"
                        name="email"
                        autoComplete="email"
                        type="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />

                    </div>

                  </div>

                </div>

              </div>

            </div>
            <div className="register-section">

              <div className="register-section-title">
                <i className="bi bi-geo-alt"></i>
                <span>2. Residential Address</span>
              </div>

              <div className="register-divider"></div>

              {/* Street */}
              <div className="register-field">

                <label htmlFor="address">
                  Street / House Address <span>*</span>
                </label>

                <div className="register-input-group">

                  <div className="register-input-icon">
                    <i className="bi bi-house"></i>
                  </div>

                  <input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="House No., Building Name, Street"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />

                </div>

              </div>

              <div className="row g-3">

                {/* City */}
                <div className="col-md-5">

                  <div className="register-field">

                    <label htmlFor="city">
                      City / Municipal Area <span>*</span>
                    </label>

                    <div className="register-input-group">

                      <div className="register-input-icon">
                        <i className="bi bi-buildings"></i>
                      </div>

                      <input
                        id="city"
                        name="city"
                        autoComplete="address-level2"
                        type="text"
                        placeholder="e.g. Chennai"
                        value={formData.city}
                        onChange={handleChange}
                        required
                      />

                    </div>

                  </div>

                </div>

                {/* State */}
                <div className="col-md-4">

                  <div className="register-field">

                    <label htmlFor="state">
                      State <span>*</span>
                    </label>

                    <div className="register-input-group">

                      <div className="register-input-icon">
                        <i className="bi bi-map"></i>
                      </div>

                      <select
                        id="state"
                        name="state"
                        autoComplete="address-level1"
                        value={formData.state}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select State</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Kerala">Kerala</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                        <option value="Telangana">Telangana</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Other">Other</option>
                      </select>

                    </div>

                  </div>

                </div>

                {/* PIN */}
                <div className="col-md-3">

                  <div className="register-field">

                    <label htmlFor="pinCode">
                      PIN Code <span>*</span>
                    </label>

                    <div className="register-input-group">

                      <div className="register-input-icon">
                        <i className="bi bi-geo"></i>
                      </div>

                      <input
                        id="pinCode"
                        name="pinCode"
                        autoComplete="postal-code"
                        type="text"
                        inputMode="numeric"
                        maxLength="6"
                        placeholder="e.g. 600001"
                        value={formData.pinCode}
                        onChange={handleChange}
                        required
                      />

                    </div>

                  </div>

                </div>

              </div>

            </div>
            <div className="register-section register-security-section">

              <div className="register-section-title">
                <i className="bi bi-shield-lock"></i>
                <span>3. Security Credentials</span>
              </div>

              <div className="register-divider"></div>

              <div className="row g-3">

                {/* Password */}
                {/* <div className="col-md-6">

                  <div className="register-field">

                    <label htmlFor="password">
                      Password <span>*</span>
                    </label>

                    <div className="register-input-group">

                      <div className="register-input-icon">
                        <i className="bi bi-lock"></i>
                      </div>

                      <input
                        id="password"
                        name="password"
                        autoComplete="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />

                      <button
                        type="button"
                        className="register-password-toggle"
                        onClick={() =>
                          setShowPassword((previous) => !previous)
                        }
                        aria-label={
                          showPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        <i
                          className={
                            showPassword
                              ? 'bi bi-eye-slash'
                              : 'bi bi-eye'
                          }
                        ></i>
                      </button>

                    </div>

                  </div>

                </div> */}
                {/* Password */}
                <div className="col-md-6">

                  <div className="register-field">

                    <label htmlFor="password">
                      Password <span>*</span>
                    </label>

                    <div className="register-input-group">

                      <div className="register-input-icon">
                        <i className="bi bi-lock"></i>
                      </div>

                      <input
                        id="password"
                        name="password"
                        autoComplete="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />

                      <button
                        type="button"
                        className="register-password-toggle"
                        onClick={() =>
                          setShowPassword((previous) => !previous)
                        }
                        aria-label={
                          showPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        <i
                          className={
                            showPassword
                              ? 'bi bi-eye-slash'
                              : 'bi bi-eye'
                          }
                        ></i>
                      </button>

                    </div>

                    {/* Password validation message */}
                    {formData.password.length > 0 &&
                      formData.password.length < 8 && (
                        <div className="text-danger small mt-2">
                          <i className="bi bi-exclamation-circle me-1"></i>
                          Password must contain at least 8 characters.
                        </div>
                      )}

                    {formData.password.length >= 8 && (
                      <div className="text-success small mt-2">
                        <i className="bi bi-check-circle me-1"></i>
                        Password length is valid.
                      </div>
                    )}

                  </div>

                </div>

                {/* Confirm Password */}
                {/* <div className="col-md-6">

                  <div className="register-field">

                    <label htmlFor="confirmPassword">
                      Confirm Password <span>*</span>
                    </label>

                    <div className="register-input-group">

                      <div className="register-input-icon">
                        <i className="bi bi-lock"></i>
                      </div>

                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        autoComplete="new-password"
                        type={
                          showConfirmPassword
                            ? 'text'
                            : 'password'
                        }
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />

                      <button
                        type="button"
                        className="register-password-toggle"
                        onClick={() =>
                          setShowConfirmPassword(
                            (previous) => !previous
                          )
                        }
                        aria-label={
                          showConfirmPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        <i
                          className={
                            showConfirmPassword
                              ? 'bi bi-eye-slash'
                              : 'bi bi-eye'
                          }
                        ></i>
                      </button>

                    </div>

                  </div>

                </div> */}

                {/* Confirm Password */}
                <div className="col-md-6">

                  <div className="register-field">

                    <label htmlFor="confirmPassword">
                      Confirm Password <span>*</span>
                    </label>

                    <div className="register-input-group">

                      <div className="register-input-icon">
                        <i className="bi bi-lock"></i>
                      </div>

                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        autoComplete="new-password"
                        type={
                          showConfirmPassword
                            ? 'text'
                            : 'password'
                        }
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />

                      <button
                        type="button"
                        className="register-password-toggle"
                        onClick={() =>
                          setShowConfirmPassword(
                            (previous) => !previous
                          )
                        }
                        aria-label={
                          showConfirmPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        <i
                          className={
                            showConfirmPassword
                              ? 'bi bi-eye-slash'
                              : 'bi bi-eye'
                          }
                        ></i>
                      </button>

                    </div>

                    {/* Confirm password validation message */}
                    {formData.confirmPassword.length > 0 &&
                      formData.password !== formData.confirmPassword && (
                        <div className="text-danger small mt-2">
                          <i className="bi bi-exclamation-circle me-1"></i>
                          Passwords do not match.
                        </div>
                      )}

                    {formData.confirmPassword.length > 0 &&
                      formData.password.length >= 8 &&
                      formData.password === formData.confirmPassword && (
                        <div className="text-success small mt-2">
                          <i className="bi bi-check-circle me-1"></i>
                          Passwords match.
                        </div>
                      )}

                  </div>

                </div>

              </div>

            </div>

            {/* Create Account */}
            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Creating Account...
                </>
              ) : (
                <>
                  <i className="bi bi-person-plus me-2"></i>
                  Create Account
                </>
              )}
            </button>

          </form>

          {/* Login Link */}
          <div className="register-login-link">
            <span>Already have an account?</span>{' '}
            <Link to="/login">
              Sign in here
            </Link>
          </div>

        </div>

      </main>
    </div>
  );
};

export default Register;