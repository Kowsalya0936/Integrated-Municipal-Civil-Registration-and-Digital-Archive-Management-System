import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const TrackApplication = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const urlParams = new URLSearchParams(location.search);
  const initialNumber = urlParams.get('number') || urlParams.get('q') || '';

  const [searchInput, setSearchInput] = useState(initialNumber);
  const [searchedNumber, setSearchedNumber] = useState(initialNumber);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const fetchTracking = useCallback(async (appNum) => {
    if (!appNum || !appNum.trim()) {
      setApplication(null);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    setApplication(null);

    try {
      const res = await api.get(`/applications/track/${encodeURIComponent(appNum.trim())}`);
      if (res.data && res.data.success && res.data.application) {
        setApplication(res.data.application);
      } else {
        setError('Application not found in the Municipal Registry.');
      }
    } catch (err) {
      console.error('[Public Track Error]:', err);
      setError(
        err.response?.data?.message ||
          `No application found matching "${appNum.trim()}". Please check the number and try again.`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialNumber) {
      setSearchInput(initialNumber);
      setSearchedNumber(initialNumber);
      fetchTracking(initialNumber);
    }
  }, [initialNumber, fetchTracking]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setSearchedNumber(searchInput.trim());
    navigate(`/track-application?number=${encodeURIComponent(searchInput.trim())}`, { replace: true });
    fetchTracking(searchInput.trim());
  };

  const handleDownloadCertificate = async () => {
    if (!application || application.status !== 'APPROVED') return;

    setDownloading(true);
    try {
      const res = await api.get(`/certificates/${application._id}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${application.certificateNumber || application.applicationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('[Download Error]:', err);
      alert(
        err.response?.data?.message ||
          'Certificate download requires citizen login or authorization. Please login to download the official PDF.'
      );
    } finally {
      setDownloading(false);
    }
  };

  const isBirth = application?.certificateType === 'BIRTH';

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-9 col-xl-8">
          {/* Header Card */}
          <div className="card shadow-sm border-0 mb-4 overflow-hidden">
            <div
              className="card-header text-white py-4 px-4 text-center"
              style={{ background: 'linear-gradient(135deg, #0b2d5c, #164b8c)' }}
            >
              <div className="badge bg-warning text-dark px-3 py-1 mb-2 fw-semibold">
                <i className="bi bi-clock-history me-1"></i> Public Tracking Portal
              </div>
              <h2 className="fw-bold mb-1 text-white">Application Tracking</h2>
              <p className="small text-light opacity-90 mb-0">
                Timeline of every stage of your certificate application.
              </p>
            </div>

            {/* Search Box */}
            <div className="card-body p-4 bg-white border-bottom">
              <form onSubmit={handleSearchSubmit}>
                <label htmlFor="trackInput" className="form-label fw-bold text-secondary small">
                  Application Number or Certificate Number
                </label>
                <div className="input-group input-group-lg">
                  <span className="input-group-text bg-light text-primary border-end-0">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    id="trackInput"
                    type="text"
                    className="form-control border-start-0"
                    placeholder="e.g. BIRTH-2026-00024 or DEATH-2026-00001"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    required
                  />
                  <button className="btn btn-primary px-4 fw-semibold" type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Tracking...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-right-circle me-1"></i> Track Application
                      </>
                    )}
                  </button>
                </div>
                <div className="form-text small text-muted mt-2">
                  <i className="bi bi-info-circle me-1"></i> Enter the official application number assigned during online registration.
                </div>
              </form>
            </div>
          </div>

          {/* Loading Spinner */}
          {loading && (
            <div className="card shadow-sm border-0 p-5 text-center bg-white mb-4">
              <div className="spinner-border text-primary mx-auto mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <h5 className="fw-bold text-dark">Searching Municipal Civil Registry...</h5>
              <p className="text-muted small mb-0">Retrieving official status records for {searchedNumber}</p>
            </div>
          )}

          {/* Error / Not Found Alert */}
          {!loading && error && (
            <div className="card shadow-sm border-0 mb-4 bg-white">
              <div className="card-body p-4 text-center">
                <div
                  className="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: '60px', height: '60px' }}
                >
                  <i className="bi bi-exclamation-triangle-fill fs-3"></i>
                </div>
                <h5 className="fw-bold text-danger mb-2">Record Not Found</h5>
                <p className="text-muted small mb-3">{error}</p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => {
                      setSearchInput('');
                      setError('');
                    }}
                  >
                    <i className="bi bi-arrow-repeat me-1"></i> Try Another Search
                  </button>
                  <Link to="/verify" className="btn btn-outline-primary btn-sm">
                    <i className="bi bi-shield-check me-1"></i> Verify Certificate
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Application Tracking Results */}
          {!loading && application && (
            <div className="card shadow-sm border-0 mb-4 overflow-hidden bg-white">
              {/* Summary Header */}
              <div className="p-4 bg-light border-bottom">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className={`badge ${isBirth ? 'bg-primary' : 'bg-danger'} px-3 py-1`}>
                        {application.certificateType} CERTIFICATE
                      </span>
                      <StatusBadge status={application.status} />
                    </div>
                    <h3 className="fw-bold text-dark mb-0">{application.applicationNumber}</h3>
                    {application.beneficiaryName && (
                      <div className="text-muted small mt-1">
                        Beneficiary / Applicant: <strong className="text-dark">{application.beneficiaryName}</strong>
                      </div>
                    )}
                  </div>

                  <div className="text-md-end">
                    <span className="text-muted small d-block">Submission Date:</span>
                    <strong className="text-dark small">
                      {new Date(application.submittedAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>
                  </div>
                </div>

                {/* Priority / Expedited Notice for Escalated Unresolved Applications */}
                {application.isEscalated && ['PENDING', 'UNDER_REVIEW'].includes(application.status) && (
                  <div className="alert alert-warning py-2 px-3 small border-warning mt-3 mb-0 d-flex align-items-center">
                    <i className="bi bi-hourglass-bottom fs-6 text-warning me-2"></i>
                    <span>
                      <strong>Notice:</strong> Application processing has been expedited under priority officer review.
                    </span>
                  </div>
                )}
              </div>

              {/* Vertical Timeline */}
              <div className="p-4 p-md-5">
                <h5 className="fw-bold text-dark mb-4 d-flex align-items-center">
                  <i className="bi bi-diagram-3-fill text-primary me-2"></i>
                  Application Progress Timeline
                </h5>

                <div className="tracking-timeline position-relative ps-4 ps-md-5">
                  {/* Step 1: Application Submitted */}
                  <div className="timeline-item position-relative pb-4">
                    <div
                      className="timeline-marker bg-success text-white rounded-circle position-absolute d-flex align-items-center justify-content-center"
                      style={{ width: '32px', height: '32px', left: '-44px', top: '0px' }}
                    >
                      <i className="bi bi-check-lg fw-bold"></i>
                    </div>
                    <div className="timeline-content">
                      <div className="d-flex flex-wrap justify-content-between align-items-center">
                        <h6 className="fw-bold text-dark mb-1">Application Submitted</h6>
                        <span className="badge bg-light text-secondary border">
                          {new Date(application.submittedAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-muted small mb-0">
                        Application successfully registered in the Municipal Civil Registration Repository.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Documents Verified */}
                  <div className="timeline-item position-relative pb-4">
                    <div
                      className="timeline-marker bg-success text-white rounded-circle position-absolute d-flex align-items-center justify-content-center"
                      style={{ width: '32px', height: '32px', left: '-44px', top: '0px' }}
                    >
                      <i className="bi bi-check-lg fw-bold"></i>
                    </div>
                    <div className="timeline-content">
                      <div className="d-flex flex-wrap justify-content-between align-items-center">
                        <h6 className="fw-bold text-dark mb-1">Documents Verified</h6>
                        <span className="badge bg-light text-success border border-success">Verified</span>
                      </div>
                      <p className="text-muted small mb-0">
                        {application.documentsCount > 0
                          ? `${application.documentsCount} supporting documents (hospital certificate, identity proof, address proof) validated.`
                          : 'Hospital proof and applicant identification documentation validated.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Officer Review */}
                  <div className="timeline-item position-relative pb-4">
                    <div
                      className={`timeline-marker ${
                        application.status === 'UNDER_REVIEW' || application.status === 'RESUBMITTED'
                          ? 'bg-info text-dark'
                          : application.status === 'APPROVED' || application.status === 'REJECTED' || application.status === 'CORRECTION_REQUIRED'
                          ? 'bg-success text-white'
                          : 'bg-secondary text-white'
                      } rounded-circle position-absolute d-flex align-items-center justify-content-center`}
                      style={{ width: '32px', height: '32px', left: '-44px', top: '0px' }}
                    >
                      <i
                        className={`bi ${
                          application.status === 'UNDER_REVIEW' || application.status === 'RESUBMITTED'
                            ? 'bi-hourglass-split'
                            : application.status === 'APPROVED' || application.status === 'REJECTED' || application.status === 'CORRECTION_REQUIRED'
                            ? 'bi-check-lg fw-bold'
                            : 'bi-clock'
                        }`}
                      ></i>
                    </div>
                    <div className="timeline-content">
                      <div className="d-flex flex-wrap justify-content-between align-items-center">
                        <h6 className="fw-bold text-dark mb-1">Officer Review</h6>
                        <span
                          className={`badge ${
                            application.status === 'UNDER_REVIEW' || application.status === 'RESUBMITTED'
                              ? 'bg-info text-dark'
                              : application.status === 'APPROVED' || application.status === 'REJECTED'
                              ? 'bg-light text-secondary border'
                              : 'bg-light text-muted border'
                          }`}
                        >
                          {application.status === 'PENDING'
                            ? 'Queued'
                            : application.status === 'UNDER_REVIEW'
                            ? 'In Progress'
                            : application.status === 'RESUBMITTED'
                            ? 'Re-verification'
                            : application.reviewedAt
                            ? new Date(application.reviewedAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Completed'}
                        </span>
                      </div>
                      <p className="text-muted small mb-0">
                        {application.status === 'PENDING'
                          ? 'Application is currently queued for zonal municipal officer desk inspection.'
                          : application.status === 'UNDER_REVIEW'
                          ? 'Civil registrar is actively examining submitted records for approval.'
                          : application.status === 'CORRECTION_REQUIRED'
                          ? 'Officer review completed — specific corrections requested from applicant.'
                          : application.status === 'RESUBMITTED'
                          ? 'Resubmitted records are actively undergoing officer re-verification.'
                          : 'Desk verification completed by authorized Municipal Registrar.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3.5: Correction Milestone (if applicable) */}
                  {(application.status === 'CORRECTION_REQUIRED' || application.status === 'RESUBMITTED' || (application.correctionHistory && application.correctionHistory.length > 0)) && (
                    <div className="timeline-item position-relative pb-4">
                      <div
                        className={`timeline-marker ${
                          application.status === 'CORRECTION_REQUIRED'
                            ? 'bg-warning text-dark'
                            : 'bg-success text-white'
                        } rounded-circle position-absolute d-flex align-items-center justify-content-center`}
                        style={{ width: '32px', height: '32px', left: '-44px', top: '0px' }}
                      >
                        <i className={`bi ${application.status === 'CORRECTION_REQUIRED' ? 'bi-exclamation-triangle-fill' : 'bi-check-lg fw-bold'}`}></i>
                      </div>
                      <div className="timeline-content">
                        <div className="d-flex flex-wrap justify-content-between align-items-center">
                          <h6 className="fw-bold text-dark mb-1">
                            {application.status === 'CORRECTION_REQUIRED'
                              ? 'Correction Required'
                              : 'Corrections Resubmitted'}
                          </h6>
                          <span className={`badge ${application.status === 'CORRECTION_REQUIRED' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>
                            {application.status === 'CORRECTION_REQUIRED' ? 'Action Required' : 'Resubmitted'}
                          </span>
                        </div>
                        <p className="text-muted small mb-0">
                          {application.status === 'CORRECTION_REQUIRED'
                            ? `Officer requested correction: ${application.correctionRequest?.reason || 'Please review and update requested items.'}`
                            : 'Citizen has submitted the required corrections and the application is back under review.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Final Outcome / Approval / Rejection */}
                  <div className="timeline-item position-relative">
                    <div
                      className={`timeline-marker ${
                        application.status === 'APPROVED'
                          ? 'bg-success text-white'
                          : application.status === 'REJECTED'
                          ? 'bg-danger text-white'
                          : 'bg-light text-muted border border-secondary'
                      } rounded-circle position-absolute d-flex align-items-center justify-content-center`}
                      style={{ width: '32px', height: '32px', left: '-44px', top: '0px' }}
                    >
                      <i
                        className={`bi ${
                          application.status === 'APPROVED'
                            ? 'bi-patch-check-fill'
                            : application.status === 'REJECTED'
                            ? 'bi-x-lg fw-bold'
                            : 'bi-award'
                        }`}
                      ></i>
                    </div>
                    <div className="timeline-content">
                      <div className="d-flex flex-wrap justify-content-between align-items-center">
                        <h6 className="fw-bold text-dark mb-1">
                          {application.status === 'APPROVED'
                            ? 'Application Approved & Certificate Issued'
                            : application.status === 'REJECTED'
                            ? 'Application Rejected'
                            : 'Final Decision & Certificate Issuance'}
                        </h6>
                        <span
                          className={`badge ${
                            application.status === 'APPROVED'
                              ? 'bg-success'
                              : application.status === 'REJECTED'
                              ? 'bg-danger'
                              : 'bg-warning text-dark'
                          }`}
                        >
                          {application.status === 'APPROVED'
                            ? 'APPROVED'
                            : application.status === 'REJECTED'
                            ? 'REJECTED'
                            : 'PENDING'}
                        </span>
                      </div>

                      {/* Approved details */}
                      {application.status === 'APPROVED' && (
                        <div className="mt-3 p-3 bg-success bg-opacity-10 border border-success rounded-3">
                          <div className="d-flex align-items-center mb-2">
                            <i className="bi bi-shield-check text-success fs-4 me-2"></i>
                            <div>
                              <strong className="text-dark d-block">Official Certificate Issued</strong>
                              <span className="text-muted small">
                                Issued on{' '}
                                {application.certificateIssuedAt
                                  ? new Date(application.certificateIssuedAt).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'long',
                                      year: 'numeric',
                                    })
                                  : 'Authorized'}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white p-2 rounded border mb-3">
                            <span className="text-muted small d-block">Certificate Number:</span>
                            <span className="fw-bold fs-6 text-primary">{application.certificateNumber}</span>
                          </div>

                          <div className="d-flex flex-wrap gap-2">
                            <Link
                              to={`/verify?q=${encodeURIComponent(
                                application.certificateNumber || application.applicationNumber
                              )}`}
                              className="btn btn-success btn-sm fw-semibold"
                            >
                              <i className="bi bi-patch-check me-1"></i> View in Digital Archive
                            </Link>
                            {isAuthenticated ? (
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm fw-semibold"
                                onClick={handleDownloadCertificate}
                                disabled={downloading}
                              >
                                {downloading ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-1"></span> Generating PDF...
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-file-earmark-pdf-fill me-1"></i> Download PDF
                                  </>
                                )}
                              </button>
                            ) : (
                              <Link to="/login" className="btn btn-outline-secondary btn-sm">
                                <i className="bi bi-box-arrow-in-right me-1"></i> Sign In to Download PDF
                              </Link>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Rejected details */}
                      {application.status === 'REJECTED' && (
                        <div className="mt-3 p-3 bg-danger bg-opacity-10 border border-danger rounded-3">
                          <div className="d-flex align-items-start">
                            <i className="bi bi-exclamation-octagon-fill text-danger fs-4 me-3 mt-1"></i>
                            <div>
                              <strong className="text-danger d-block mb-1">Reason for Rejection:</strong>
                              <p className="text-dark small mb-2">
                                {application.rejectionReason || 'Discrepancies identified in submitted documentation.'}
                              </p>
                              <div className="small text-muted mb-3">
                                Reviewed on:{' '}
                                {application.reviewedAt
                                  ? new Date(application.reviewedAt).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'long',
                                      year: 'numeric',
                                    })
                                  : 'N/A'}
                              </div>
                              <Link
                                to={isBirth ? '/citizen/apply/birth' : '/citizen/apply/death'}
                                className="btn btn-outline-danger btn-sm"
                              >
                                <i className="bi bi-pencil-square me-1"></i> Submit Corrected Application
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pending SLA details */}
                      {(application.status === 'PENDING' || application.status === 'UNDER_REVIEW') && (
                        <div className="mt-3 p-3 bg-light border rounded-3">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-clock-history text-primary fs-4 me-3"></i>
                            <div>
                              <strong className="text-dark d-block">Municipal SLA Standard Processing</strong>
                              <span className="text-muted small">
                                Decision expected by{' '}
                                {application.slaDeadline
                                  ? new Date(application.slaDeadline).toLocaleDateString('en-GB', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'within standard municipal working days'}
                                .
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="card-footer bg-light p-3 text-center border-top">
                <div className="d-flex flex-wrap justify-content-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => {
                      setSearchInput('');
                      setApplication(null);
                      navigate('/track-application', { replace: true });
                    }}
                  >
                    <i className="bi bi-search me-1"></i> Track Another Application
                  </button>
                  <Link to="/verify" className="btn btn-outline-secondary btn-sm">
                    <i className="bi bi-qr-code-scan me-1"></i> Verify Certificate
                  </Link>
                  <Link to="/" className="btn btn-outline-dark btn-sm">
                    <i className="bi bi-house me-1"></i> Back to Homepage
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Empty State when no search entered */}
          {!loading && !application && !error && (
            <div className="card shadow-sm border-0 p-4 text-center bg-white mb-4">
              <div className="py-4">
                <div
                  className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: '64px', height: '64px' }}
                >
                  <i className="bi bi-file-earmark-text fs-2"></i>
                </div>
                <h5 className="fw-bold text-dark">Enter Application Number to Track</h5>
                <p className="text-muted small mx-auto mb-0" style={{ maxWidth: '480px' }}>
                  Please enter your official Birth or Death certificate application number (e.g.,{' '}
                  <span className="text-primary fw-semibold">BIRTH-2026-00024</span>) above to check its real-time review progress.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackApplication;
