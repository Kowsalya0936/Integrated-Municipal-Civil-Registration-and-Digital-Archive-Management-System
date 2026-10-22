import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  const getDashboardRoute = () => {
    if (user?.role === 'admin') return '/admin/dashboard';
    if (user?.role === 'officer') return '/officer/dashboard';
    return '/citizen/dashboard';
  };

  return (
    <div className="home-page-container">
      {/* ── Hero Section ── */}
      <section className="hero-section">
        {/* Subtle decorative background shapes */}
        <div className="hero-shape-left" aria-hidden="true"></div>
        <div className="hero-shape-right" aria-hidden="true"></div>

        <div className="container position-relative hero-content-container">
          <div className="row align-items-center g-4 g-xl-5">
            {/* Left Column: Heading, Paragraph, Action Buttons */}
            <div className="col-12 col-lg-7 hero-text-col">
              <h1 className="hero-title mb-3">
                Smart Municipal Birth &amp; Death Certificate Services
              </h1>
              <p className="hero-description lead mb-4">
                Seamlessly apply for official civil registration certificates online, upload supporting documents, track real-time verification status, and instantly download digitally signed certificates with tamper-proof QR codes.
              </p>

              {/* Action Buttons */}
              <div className="d-flex flex-wrap gap-3 hero-btn-group">
                {isAuthenticated ? (
                  <Link to={getDashboardRoute()} className="btn btn-hero-gold">
                    <i className="bi bi-speedometer2 me-2"></i> Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link to="/register" className="btn btn-hero-gold">
                      <i className="bi bi-file-earmark-plus-fill me-2"></i> Apply for Certificate
                    </Link>
                    <Link to="/login" className="btn btn-hero-outline-blue">
                      <i className="bi bi-box-arrow-in-right me-2"></i> Citizen / Officer Login
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Prominent Municipal Illustration */}
            <div className="col-12 col-lg-5 hero-image-container">
              <img
                src="/assets/homepage.png"
                alt="Municipal Civil Registration Illustration"
                className="hero-municipal-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Our Services Section ── */}
      <section className="services-section">
        <div className="container">
          <div className="text-center mb-4 mb-lg-5">
            <h2 className="services-title mb-2">Our Services</h2>
            <p className="services-subtitle mb-0">
              Access a range of municipal civil registration services
            </p>
          </div>

          <div className="row g-3 g-lg-4">
            {/* 1. Birth Certificate */}
            <div className="col-12 col-sm-6 col-lg-3">
              <Link to="/citizen/apply/birth" className="service-card-link">
                <div className="service-card">
                  <div className="service-card-icon service-icon-birth">
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M9 10h.01" />
                      <path d="M15 10h.01" />
                      <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
                      <path d="M12 3a2 2 0 0 0 0 4" />
                    </svg>
                  </div>
                  <div className="service-card-content">
                    <h5 className="service-card-title">Birth Certificate</h5>
                    <p className="service-card-desc">
                      Apply for, track, and download birth certificates online.
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            {/* 2. Death Certificate */}
            <div className="col-12 col-sm-6 col-lg-3">
              <Link to="/citizen/apply/death" className="service-card-link">
                <div className="service-card">
                  <div className="service-card-icon service-icon-death">
                    <i className="bi bi-file-earmark-medical fs-4"></i>
                  </div>
                  <div className="service-card-content">
                    <h5 className="service-card-title">Death Certificate</h5>
                    <p className="service-card-desc">
                      Apply for, track, and download death certificates online.
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            {/* 3. Track Application */}
            <div className="col-12 col-sm-6 col-lg-3">
              <Link to="/track-application" className="service-card-link">
                <div className="service-card">
                  <div className="service-card-icon service-icon-track">
                    <i className="bi bi-search fs-4"></i>
                  </div>
                  <div className="service-card-content">
                    <h5 className="service-card-title">Track Application</h5>
                    <p className="service-card-desc">
                      Check the status and progress of your application.
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            {/* 4. Verify Certificate */}
            <div className="col-12 col-sm-6 col-lg-3">
              <Link to="/verify" className="service-card-link">
                <div className="service-card">
                  <div className="service-card-icon service-icon-verify">
                    <i className="bi bi-shield-check fs-4"></i>
                  </div>
                  <div className="service-card-content">
                    <h5 className="service-card-title">Verify Certificate</h5>
                    <p className="service-card-desc">
                      Validate the authenticity of an issued municipal certificate.
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How the Municipal System Works Section ── */}
      <section className="py-5 bg-light border-top border-bottom">
        <div className="container py-3">
          <div className="text-center mb-5">
            <h2 className="fw-bold text-dark">How the Municipal System Works</h2>
            <p className="text-muted">A clear, transparent 6-step lifecycle from registration to digital certificate issuance.</p>
          </div>

          <div className="row g-4 text-center">
            <div className="col-md-4 col-lg-2">
              <div className="p-3 bg-white rounded shadow-sm h-100">
                <div className="badge bg-dark rounded-circle fs-6 p-2 mb-2">1</div>
                <div className="fw-bold mb-1">Citizen Register</div>
                <div className="small text-muted">Create citizen account with address &amp; mobile.</div>
              </div>
            </div>

            <div className="col-md-4 col-lg-2">
              <div className="p-3 bg-white rounded shadow-sm h-100">
                <div className="badge bg-primary rounded-circle fs-6 p-2 mb-2">2</div>
                <div className="fw-bold mb-1">Apply Online</div>
                <div className="small text-muted">Fill structured Birth or Death form accurately.</div>
              </div>
            </div>

            <div className="col-md-4 col-lg-2">
              <div className="p-3 bg-white rounded shadow-sm h-100">
                <div className="badge bg-info rounded-circle fs-6 p-2 mb-2">3</div>
                <div className="fw-bold mb-1">Upload Docs</div>
                <div className="small text-muted">Attach hospital proof &amp; IDs (PDF/JPG &le;5MB).</div>
              </div>
            </div>

            <div className="col-md-4 col-lg-2">
              <div className="p-3 bg-white rounded shadow-sm h-100">
                <div className="badge bg-warning text-dark rounded-circle fs-6 p-2 mb-2">4</div>
                <div className="fw-bold mb-1">Officer Review</div>
                <div className="small text-muted">Zonal officer checks records &amp; duplicate flags.</div>
              </div>
            </div>

            <div className="col-md-4 col-lg-2">
              <div className="p-3 bg-white rounded shadow-sm h-100">
                <div className="badge bg-secondary rounded-circle fs-6 p-2 mb-2">5</div>
                <div className="fw-bold mb-1">Approve / Reject</div>
                <div className="small text-muted">Officer approves or provides clear reason.</div>
              </div>
            </div>

            <div className="col-md-4 col-lg-2">
              <div className="p-3 bg-white rounded shadow-sm h-100">
                <div className="badge bg-success rounded-circle fs-6 p-2 mb-2">6</div>
                <div className="fw-bold mb-1">Digital Certificate</div>
                <div className="small text-muted">Download PDF with QR code &amp; digital seal.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Use the Municipal Digital Registration Portal Section ── */}
      <section className="py-5 bg-white">
        <div className="container py-3">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <h2 className="fw-bold mb-4 text-dark">Why Use the Municipal Digital Registration Portal?</h2>
              <div className="d-flex mb-4">
                <div className="me-3">
                  <div className="bg-primary text-white rounded p-2 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                    <i className="bi bi-clock-fill fs-5"></i>
                  </div>
                </div>
                <div>
                  <h6 className="fw-bold mb-1">48-Hour SLA Guarantee</h6>
                  <p className="text-muted small mb-0">Automated deadline tracking and administrative escalation to ensure prompt service delivery.</p>
                </div>
              </div>

              <div className="d-flex mb-4">
                <div className="me-3">
                  <div className="bg-success text-white rounded p-2 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                    <i className="bi bi-building-check fs-5"></i>
                  </div>
                </div>
                <div>
                  <h6 className="fw-bold mb-1">Zero In-Person Office Visits Required</h6>
                  <p className="text-muted small mb-0">Complete application, document verification, and certificate delivery entirely online.</p>
                </div>
              </div>

              <div className="d-flex mb-4">
                <div className="me-3">
                  <div className="bg-warning text-dark rounded p-2 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                    <i className="bi bi-shield-shaded fs-5"></i>
                  </div>
                </div>
                <div>
                  <h6 className="fw-bold mb-1">Tamper-Proof QR Verification</h6>
                  <p className="text-muted small mb-0">Every issued certificate embeds a cryptographically unique QR code for instant third-party validation.</p>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="p-4 bg-light rounded-3 border">
                <h5 className="fw-bold mb-3 d-flex align-items-center">
                  Documents Checklist for Application
                </h5>
                <div className="mb-3">
                  <h6 className="fw-bold text-secondary mb-1">For Birth Certificate:</h6>
                  <ul className="small text-muted mb-3">
                    <li>Hospital / Institutional Birth Report or Discharge Summary</li>
                    <li>Government ID Proof of Parents (Aadhaar / Voter ID / Passport)</li>
                    <li>Proof of Residence (Electricity Bill / Ration Card / Gas Bill)</li>
                  </ul>
                </div>
                <div className="mb-3">
                  <h6 className="fw-bold text-secondary mb-1">For Death Certificate:</h6>
                  <ul className="small text-muted mb-3">
                    <li>Hospital Medical Certificate of Cause of Death / Cremation Slip</li>
                    <li>Identity Proof of Informant (Family Member / Applicant)</li>
                    <li>Address Proof of the Deceased</li>
                  </ul>
                </div>
                <div className="alert alert-info py-2 small mb-0">
                  <i className="bi bi-check2-circle me-1"></i> File size limit: 5MB per document in PDF, JPG, JPEG, or PNG format.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
