import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Explicitly reset form state on mount or when navigating to login
  useEffect(() => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError('');
  }, [location.pathname, location.key]);

  const isExpired =
    new URLSearchParams(location.search).get('expired') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await login(email.trim(), password);

      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'officer') {
        navigate('/officer/dashboard');
      } else {
        navigate('/citizen/dashboard');
      }
    } catch (err) {
      console.error('[Login Failed]:', err);

      setError(
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* Subtle civic background */}
      <div className="login-city-background">
        <div className="city-building building-one"></div>
        <div className="city-building building-two"></div>
        <div className="city-building building-three"></div>
        <div className="city-building building-four"></div>
        <div className="city-building building-five"></div>
      </div>

      <main className="login-container">

        {/* Page Heading */}
        <div className="login-heading">

          {/* <div className="login-shield">
            <i className="bi bi-shield-lock"></i>
          </div> */}

          <h1>Municipal Account Login</h1>

          <div className="login-gold-line"></div>

          <p>
            Sign in to access your authorized
            <br />
            municipal services.
          </p>

        </div>

        {/* Login Card */}
        <div className="login-card">

          {/* Expired Session */}
          {isExpired && (
            <div className="login-alert login-alert-warning">
              <i className="bi bi-clock-history"></i>
              <span>
                Your session expired. Please sign in again.
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="login-alert login-alert-danger">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>

  {/* Email */}
  <div className="login-field">
    <label htmlFor="email">
      Email Address <span>*</span>
    </label>

    <div className="login-input-group">
      <div className="login-input-icon">
        <i className="bi bi-envelope"></i>
      </div>

      <input
        id="email"
        type="email"
        placeholder="Enter your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        required
      />
    </div>
  </div>

  {/* Password */}
  <div className="login-field">
    <label htmlFor="password">
      Password <span>*</span>
    </label>

    <div className="login-input-group">
      <div className="login-input-icon">
        <i className="bi bi-lock"></i>
      </div>

      <input
        id="password"
        type={showPassword ? 'text' : 'password'}
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />

      <button
        type="button"
        className="password-toggle"
        onClick={() => setShowPassword((previous) => !previous)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
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

  {/* Sign In */}
  <button
    type="submit"
    className="login-submit"
    disabled={loading}
  >
    {loading ? (
      <>
        <span className="spinner-border spinner-border-sm me-2"></span>
        Authenticating...
      </>
    ) : (
      <>
        <i className="bi bi-box-arrow-in-right me-2"></i>
        Sign In
      </>
    )}
  </button>

</form>

          {/* Registration */}
          <div className="login-register">
            <span>New user?</span>{' '}
            <Link to="/register">
              Register here
            </Link>
          </div>

          {/* Public Application Tracking */}
          <div className="mt-3 pt-3 border-top text-center" style={{ fontSize: '13px' }}>
            <span style={{ color: '#697586' }}>Need to check application status?</span>{' '}
            <Link to="/track-application" style={{ color: '#0d6efd', fontWeight: 600, textDecoration: 'none' }}>
              <i className="bi bi-clock-history me-1"></i> Track Application
            </Link>
          </div>

        </div>

      </main>
    </div>
  );
};

export default Login;