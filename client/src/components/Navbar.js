import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to section when location hash changes or page loads with a hash
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardRoute = () => {
    if (user?.role === 'admin') return '/admin/dashboard';
    if (user?.role === 'officer') return '/officer/dashboard';
    return '/citizen/dashboard';
  };

  // About and Contact links are displayed strictly on the unauthenticated public landing page
  const isPublicLanding = !isAuthenticated && location.pathname === '/';

  const handleScrollToSection = (e, sectionId) => {
    e.preventDefault();

    // Close mobile hamburger menu if open
    const navbarCollapse = document.getElementById('navbarMain');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      if (window.bootstrap && window.bootstrap.Collapse) {
        const bsCollapse =
          window.bootstrap.Collapse.getInstance(navbarCollapse) ||
          new window.bootstrap.Collapse(navbarCollapse);
        bsCollapse.hide();
      } else {
        navbarCollapse.classList.remove('show');
      }
    }

    if (location.pathname === '/') {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.pushState(null, '', `#${sectionId}`);
      }
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark sticky-top shadow-sm py-2"
      style={{ backgroundColor: '#1a365d' }}
    >
      <div className="container">
        {/* Left Side: Municipal Branding */}
        <Link className="navbar-brand d-flex align-items-center py-0 me-3 me-lg-4 text-decoration-none" to="/">
          <span
            className="badge bg-warning text-dark me-2 d-flex align-items-center justify-content-center p-0 rounded-circle"
            style={{ width: '32px', height: '32px' }}
          >
            <i className="bi bi-bank2 fs-6"></i>
          </span>
          <div className="d-flex flex-column">
            <span className="fw-bold fs-6 text-white lh-1" style={{ letterSpacing: '0.4px' }}>
              MUNICIPAL CIVIL REGISTRATION
            </span>
            <span className="text-warning fw-semibold" style={{ fontSize: '0.7rem', letterSpacing: '0.3px', marginTop: '2px' }}>
              Digital Civil Services
            </span>
          </div>
        </Link>

        {/* Mobile Hamburger Toggle */}
        <button
          className="navbar-toggler border-0 p-1"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarMain"
          aria-controls="navbarMain"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navigation Items */}
        <div className="collapse navbar-collapse" id="navbarMain">
          {/* Main Navigation Links */}
          <ul className="navbar-nav mx-auto align-items-lg-center">
            {/* Home */}
            <li className="nav-item">
              <Link
                className={`nav-link text-white px-2 px-lg-3 d-flex align-items-center ${
                  location.pathname === '/' ? 'active-nav-link' : ''
                }`}
                to="/"
              >
                {/* <i className="bi bi-house-door me-1"></i> */}
                Home
              </Link>
            </li>

            {/* Services Dropdown */}
            <li className="nav-item dropdown">
              <button
                className="nav-link dropdown-toggle text-white px-2 px-lg-3 d-flex align-items-center bg-transparent border-0"
                id="servicesDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                {/* <i className="bi bi-grid me-1"></i>  */}
                Services
              </button>
              <ul className="dropdown-menu shadow-sm border-0 mt-1" aria-labelledby="servicesDropdown">
                <li>
                  <Link className="dropdown-item py-2 d-flex align-items-center" to="/citizen/apply/birth">
                    {/* <i className="bi bi-file-earmark-plus me-2 text-primary"></i> */}
                    Birth Certificate
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item py-2 d-flex align-items-center" to="/citizen/apply/death">
                    {/* <i className="bi bi-file-earmark-medical me-2 text-primary"></i> */}
                    Death Certificate
                  </Link>
                </li>
              </ul>
            </li>

            {/* Verify Certificate */}
            <li className="nav-item">
              <Link className="nav-link text-white px-2 px-lg-3 d-flex align-items-center" to="/verify">
                {/* <i className="bi bi-patch-check me-1"></i> */}
                Verify Certificate
              </Link>
            </li>

            {/* About & Contact Links (Public Landing Page Only) */}
            {isPublicLanding && (
              <>
                <li className="nav-item">
                  <a
                    className="nav-link text-white px-2 px-lg-3 d-flex align-items-center"
                    href="#footer-about"
                    onClick={(e) => handleScrollToSection(e, 'footer-about')}
                  >
                    About
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link text-white px-2 px-lg-3 d-flex align-items-center"
                    href="#footer-contact"
                    onClick={(e) => handleScrollToSection(e, 'footer-contact')}
                  >
                    Contact
                  </a>
                </li>
              </>
            )}

            {/* Dashboard (When Logged In) */}
            {isAuthenticated && (
              <li className="nav-item">
                <Link
                  className={`nav-link text-white px-2 px-lg-3 d-flex align-items-center ${
                    location.pathname.includes('/dashboard') ? 'active-nav-link' : ''
                  }`}
                  to={getDashboardRoute()}
                >
                  Dashboard
                </Link>
              </li>
            )}

            {/* My Applications (Citizen only) */}
            {isAuthenticated && user?.role === 'citizen' && (
              <li className="nav-item">
                <Link
                  className={`nav-link text-white px-2 px-lg-3 d-flex align-items-center ${
                    location.pathname === '/citizen/applications' ? 'active-nav-link' : ''
                  }`}
                  to="/citizen/applications"
                >
                  My Applications
                </Link>
              </li>
            )}
          </ul>

          {/* Right Side: Auth / Profile */}
          <div className="d-flex align-items-center mt-3 mt-lg-0">
            {isAuthenticated ? (
              <div className="dropdown">
                <button
                  className="btn text-white d-flex align-items-center gap-2 border-0 bg-transparent px-2 py-1"
                  type="button"
                  id="userDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  aria-label="User Profile"
                >
                  <span
                    className="rounded-circle d-flex align-items-center justify-content-center bg-white bg-opacity-25"
                    style={{ width: '32px', height: '32px' }}
                  >
                    <i className="bi bi-person-fill fs-6 text-white"></i>
                  </span>
                  <span className="fw-semibold text-white small">
                    {user?.name
                      ? user.role === 'officer' && !user.name.toLowerCase().includes('registrar')
                        ? `${user.name} (Registrar)`
                        : user.name
                      : 'Citizen'}
                  </span>
                  <i className="bi bi-caret-down-fill text-white opacity-75" style={{ fontSize: '0.65rem' }}></i>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2" aria-labelledby="userDropdown" style={{ minWidth: '180px' }}>
                  {user?.role && (
                    <li className="px-3 py-2 bg-light border-bottom text-muted small fw-semibold d-flex align-items-center">
                      <i className="bi bi-person-badge me-2 text-primary"></i>
                      <span className="text-capitalize">{user.role}</span>
                    </li>
                  )}
                  {user?.role !== 'admin' && (
                    <>
                      <li>
                        <Link
                          className="dropdown-item py-2 d-flex align-items-center"
                          to={
                            user?.role === 'officer'
                              ? '/officer/profile'
                              : user?.role === 'citizen'
                              ? '/citizen/profile'
                              : getDashboardRoute()
                          }
                        >
                          <i className="bi bi-person me-2 text-secondary"></i> Profile
                        </Link>
                      </li>
                      <li>
                        <hr className="dropdown-divider my-1" />
                      </li>
                    </>
                  )}
                  <li>
                    <button className="dropdown-item py-2 text-danger d-flex align-items-center" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i> Logout
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Link to="/login" className="btn btn-outline-light btn-sm px-3 fw-medium">
                  <i className="bi bi-box-arrow-in-right me-1"></i> Login
                </Link>
                <Link to="/register" className="btn btn-warning btn-sm px-3 text-dark fw-semibold">
                  <i className="bi bi-person-plus me-1"></i> Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
