import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import SlaIndicator from '../../components/SlaIndicator';
import RejectionModal from '../../components/RejectionModal';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import RequestCorrectionModal from '../../components/RequestCorrectionModal';

const OfficerApplicationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const fetchApplication = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/officer/applications/${id}`);
      if (res.data && res.data.application) {
        setApplication(res.data.application);
      }
    } catch (err) {
      console.error('[Officer Details Error]:', err);
      setError(err.response?.data?.message || 'Error loading application for officer review.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  const handleApprove = async () => {
    if (!window.confirm(`Are you sure you want to approve application ${application.applicationNumber} and issue an official municipal certificate?`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await api.put(`/officer/applications/${application._id}/approve`);
      if (res.data && res.data.application) {
        setApplication(res.data.application);
        setSuccessMessage(`Application approved successfully! Certificate issued: ${res.data.application.certificateNumber}`);
      }
    } catch (err) {
      console.error('[Approve Error]:', err);
      setError(err.response?.data?.message || 'Failed to approve application.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async (reason) => {
    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await api.put(`/officer/applications/${application._id}/reject`, {
        rejectionReason: reason,
      });
      if (res.data && res.data.application) {
        setApplication(res.data.application);
        setIsRejectModalOpen(false);
        setSuccessMessage(`Application ${application.applicationNumber} has been rejected.`);
      }
    } catch (err) {
      console.error('[Reject Error]:', err);
      setError(err.response?.data?.message || 'Failed to reject application.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCorrectionSubmit = async ({ reason, items }) => {
    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await api.put(`/officer/applications/${application._id}/request-correction`, {
        reason,
        items,
      });
      if (res.data && res.data.application) {
        setApplication(res.data.application);
        setIsCorrectionModalOpen(false);
        setSuccessMessage(`Correction request successfully submitted for application ${application.applicationNumber}.`);
      }
    } catch (err) {
      console.error('[Correction Request Error]:', err);
      setError(err.response?.data?.message || 'Failed to submit correction request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!application || application.status !== 'APPROVED') return;

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
      console.error('[Download Failed]:', err);
      alert('Failed to download certificate.');
    }
  };

  const openDocumentViewer = (doc) => {
    setViewerDoc(doc);
    setIsViewerOpen(true);
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2 text-muted small">Loading application verification dossier...</div>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger p-4 text-center">
          <i className="bi bi-exclamation-octagon-fill fs-1 text-danger d-block mb-2"></i>
          <h5>Verification Access Error</h5>
          <p className="mb-3">{error}</p>
          <button className="btn btn-outline-danger btn-sm" onClick={() => navigate('/officer/dashboard')}>
            <i className="bi bi-arrow-left me-1"></i> Back to Officer Queue
          </button>
        </div>
      </div>
    );
  }

  const isBirth = application.certificateType === 'BIRTH';
  const certDetails = application.certificateDetails || {};

  return (
    <div className="container-fluid px-lg-5 py-4">
      {/* Navigation Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/officer/dashboard">Officer Queue</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Verify {application.applicationNumber}
          </li>
        </ol>
      </nav>

      {/* Success Notification */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show p-3 mb-4 shadow-sm" role="alert">
          <i className="bi bi-check-circle-fill me-2 fs-5"></i>
          <strong>{successMessage}</strong>
          <button type="button" className="btn-close" onClick={() => setSuccessMessage('')}></button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show p-3 mb-4 shadow-sm" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
          <strong>{error}</strong>
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Duplicate Suspect Warning Banner */}
      {application.duplicateSuspect?.isSuspect && (
        <div className="alert alert-warning p-4 border-warning shadow-sm mb-4">
          <div className="d-flex align-items-start">
            <i className="bi bi-exclamation-triangle-fill text-danger fs-2 me-3 mt-1"></i>
            <div>
              <h5 className="fw-bold text-danger mb-1">
                <i className="bi bi-shield-exclamation me-1"></i> Potential Duplicate Record Flagged by System
              </h5>
              <p className="mb-2 text-dark">
                {application.duplicateSuspect.matchReason}
              </p>
              {application.duplicateSuspect.matchedApplicationNumber && (
                <div className="small">
                  <strong>Matched Application Reference:</strong>{' '}
                  <span className="badge bg-secondary">
                    {application.duplicateSuspect.matchedApplicationNumber}
                  </span>{' '}
                  — Please perform an archive cross-check before approving this application.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Citizen Escalation Raised Banner */}
      {application.isEscalated && ['PENDING', 'UNDER_REVIEW'].includes(application.status) && (
        <div className="alert alert-danger p-4 border-danger shadow-sm mb-4">
          <div className="d-flex align-items-start">
            <i className="bi bi-exclamation-octagon-fill text-danger fs-2 me-3 mt-1"></i>
            <div className="w-100">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                <h5 className="fw-bold text-danger mb-0">
                  <i className="bi bi-megaphone-fill me-1"></i> Citizen Escalation Raised
                </h5>
                <span className="badge bg-danger px-3 py-1">
                  STATUS: {application.escalationStatus || 'PENDING'}
                </span>
              </div>
              <p className="mb-2 text-dark">
                This application has exceeded the expected SLA processing time and a formal complaint has been raised by the citizen.
              </p>
              <div className="row g-2 small bg-white p-3 rounded border">
                <div className="col-sm-6">
                  <span className="text-muted d-block">Complaint Raised On:</span>
                  <strong className="text-dark">
                    {application.escalatedAt ? new Date(application.escalatedAt).toLocaleString('en-GB') : 'N/A'}
                  </strong>
                </div>
                <div className="col-sm-6">
                  <span className="text-muted d-block">Reason:</span>
                  <strong className="text-dark">{application.escalationReason || 'Delay in processing'}</strong>
                </div>
                {application.escalationDescription && (
                  <div className="col-12 mt-2 pt-2 border-top">
                    <span className="text-muted d-block">Citizen Remark / Description:</span>
                    <span className="text-dark">{application.escalationDescription}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Verification Dossier Header */}
      <div className="card shadow-sm border-0 mb-4 bg-white">
        <div className="card-header bg-dark text-white p-4">
          <div className="row align-items-center">
            <div className="col-md-7">
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span className={`badge ${isBirth ? 'bg-primary' : 'bg-danger'} px-3 py-1`}>
                  {application.certificateType} CERTIFICATE
                </span>
                <StatusBadge status={application.status} />
                {application.isEscalated && ['PENDING', 'UNDER_REVIEW'].includes(application.status) && (
                  <span className="badge bg-danger text-white px-3 py-1 fw-bold">
                    <i className="bi bi-megaphone-fill me-1"></i> CITIZEN ESCALATED
                  </span>
                )}
              </div>
              <h3 className="fw-bold mb-1 text-white">{application.applicationNumber}</h3>
              <p className="small text-white mb-0">
                Submitted on {new Date(application.submittedAt).toLocaleString('en-GB')} | Applicant:{' '}
                <strong className="text-light">{application.applicantDetails?.name}</strong>
              </p>
            </div>

            <div className="col-md-5 text-md-end mt-3 mt-md-0">
              <div className="mb-2">
                <SlaIndicator deadline={application.slaDeadline} status={application.status} />
              </div>

              {/* Action Buttons for Officer */}
              <div className="btn-group flex-wrap gap-1">
                {application.status !== 'APPROVED' && application.status !== 'CORRECTION_REQUIRED' && (
                  <button
                    className="btn btn-success fw-bold px-3 shadow-sm"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    <i className="bi bi-check2-circle me-1"></i> Approve & Issue Certificate
                  </button>
                )}

                {application.status !== 'APPROVED' && application.status !== 'REJECTED' && application.status !== 'CORRECTION_REQUIRED' && (
                  <button
                    className="btn btn-warning text-dark fw-bold px-3 shadow-sm"
                    onClick={() => setIsCorrectionModalOpen(true)}
                    disabled={actionLoading}
                  >
                    <i className="bi bi-pencil-square me-1"></i> Request Correction
                  </button>
                )}

                {application.status !== 'REJECTED' && application.status !== 'APPROVED' && (
                  <button
                    className="btn btn-danger fw-semibold px-3 shadow-sm"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={actionLoading}
                  >
                    <i className="bi bi-x-circle me-1"></i> Reject Application
                  </button>
                )}

                {application.status === 'APPROVED' && (
                  <button className="btn btn-warning text-dark fw-bold px-3" onClick={handleDownloadCertificate}>
                    <i className="bi bi-file-earmark-pdf-fill me-1"></i> Download Issued PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Issue Confirmation Bar */}
        {application.status === 'APPROVED' && (
          <div className="p-3 bg-success bg-opacity-10 border-bottom border-success text-success d-flex justify-content-between align-items-center">
            <div>
              <i className="bi bi-patch-check-fill fs-5 me-2"></i>
              <strong>Certificate Issued:</strong> {application.certificateNumber} | Issued on:{' '}
              {new Date(application.certificateIssuedAt).toLocaleString('en-GB')}
            </div>
            <span className="badge bg-success">Stored in Digital Archive</span>
          </div>
        )}

        {/* Rejection Details Bar */}
        {application.status === 'REJECTED' && (
          <div className="p-3 bg-danger bg-opacity-10 border-bottom border-danger text-danger">
            <i className="bi bi-x-octagon-fill fs-5 me-2"></i>
            <strong>Rejection Reason Recorded:</strong> {application.rejectionReason} (Reviewed by{' '}
            {application.reviewedBy?.name || 'Officer'} on{' '}
            {application.reviewedAt ? new Date(application.reviewedAt).toLocaleString('en-GB') : 'N/A'})
          </div>
        )}

        {/* Correction Required Bar */}
        {application.status === 'CORRECTION_REQUIRED' && (
          <div className="p-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ backgroundColor: '#fffaf0', borderLeft: '4px solid #dd6b20' }}>
            <div>
              <div className="fw-bold text-dark mb-1">
                <i className="bi bi-exclamation-circle-fill text-warning me-2"></i>
                Correction Requested from Citizen
              </div>
              <div className="small text-muted mb-1">
                <strong>Reason:</strong> {application.correctionRequest?.reason || 'Correction requested by officer'}
              </div>
              <div className="small text-muted">
                <strong>Items:</strong>{' '}
                {(application.correctionRequest?.items || []).map((i, idx) => (
                  <span key={idx} className="badge bg-secondary me-1">
                    {i.label} ({i.type})
                  </span>
                ))}
              </div>
            </div>
            <span className="badge bg-warning text-dark px-3 py-2">
              <i className="bi bi-hourglass-split me-1"></i> Awaiting Citizen Resubmission
            </span>
          </div>
        )}

        {/* Resubmitted Bar */}
        {application.status === 'RESUBMITTED' && (
          <div className="p-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ backgroundColor: '#ebf8ff', borderLeft: '4px solid #3182ce' }}>
            <div>
              <div className="fw-bold text-primary mb-1">
                <i className="bi bi-arrow-repeat me-2"></i>
                Application Resubmitted after Citizen Correction
              </div>
              <div className="small text-dark">
                The citizen has updated the requested items and resubmitted the application for officer re-verification.
              </div>
            </div>
            <span className="badge bg-primary px-3 py-2">
              <i className="bi bi-check-circle me-1"></i> Ready for Review
            </span>
          </div>
        )}
      </div>

      {/* Smart Verification & Risk Analysis Dossier Section */}
      {application.smartVerification && (
        <div className="card shadow-sm border-0 mb-4 bg-white">
          <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center">
              <i className="bi bi-shield-check text-primary fs-4 me-2"></i>
              <div>
                <h5 className="card-title mb-0 fw-bold text-dark">
                  Smart Verification & Risk Analysis
                </h5>
                <span className="text-muted small">
                  Automated deterministic pre-check for officer decision support
                </span>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted fw-semibold">Overall Risk:</span>
              {application.smartVerification.overallRisk === 'LOW' ? (
                <span className="badge bg-success px-3 py-2 fs-6">
                  <i className="bi bi-shield-fill-check me-1"></i> LOW RISK — PASSED
                </span>
              ) : application.smartVerification.overallRisk === 'MEDIUM' ? (
                <span className="badge bg-warning text-dark px-3 py-2 fs-6">
                  <i className="bi bi-exclamation-circle-fill me-1"></i> MEDIUM RISK — ATTENTION REQUIRED
                </span>
              ) : (
                <span className="badge bg-danger px-3 py-2 fs-6">
                  <i className="bi bi-shield-fill-exclamation me-1"></i> HIGH RISK — ATTENTION REQUIRED
                </span>
              )}
            </div>
          </div>

          <div className="card-body p-4">
            {application.smartVerification.requiresAttention && (
              <div className={`alert ${application.smartVerification.overallRisk === 'HIGH' ? 'alert-danger' : 'alert-warning'} mb-4`}>
                <div className="d-flex align-items-start">
                  <i className={`bi ${application.smartVerification.overallRisk === 'HIGH' ? 'bi-exclamation-octagon-fill text-danger' : 'bi-exclamation-triangle-fill text-warning'} fs-4 me-3 mt-1`}></i>
                  <div>
                    <strong className="d-block mb-1">
                      {application.smartVerification.overallRisk === 'HIGH'
                        ? 'High Priority Verification Flags Detected'
                        : 'Verification Warnings Requiring Review'}
                    </strong>
                    <div className="small">
                      This application has {application.smartVerification.flagsCount || 1} verification flag(s) identified. Please inspect the highlighted checks below before recording your official decision.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Checks Grid */}
            <div className="row g-3">
              {application.smartVerification.checks?.map((check, idx) => {
                const isPass = check.status === 'PASS';
                const isWarning = check.status === 'WARNING';
                const isFail = check.status === 'FAIL' || check.status === 'FLAGGED';

                return (
                  <div key={check.code || idx} className="col-md-6 col-12">
                    <div
                      className={`p-3 rounded border h-100 ${
                        isPass
                          ? 'bg-light border-success border-opacity-25'
                          : isWarning
                          ? 'bg-warning bg-opacity-10 border-warning'
                          : 'bg-danger bg-opacity-10 border-danger'
                      }`}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <strong className="text-dark small d-flex align-items-center">
                          {check.name || check.code}
                        </strong>
                        <span
                          className={`badge ${
                            isPass
                              ? 'bg-success'
                              : isWarning
                              ? 'bg-warning text-dark'
                              : 'bg-danger'
                          }`}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {isPass && <i className="bi bi-check-lg me-1"></i>}
                          {isWarning && <i className="bi bi-exclamation-circle me-1"></i>}
                          {isFail && <i className="bi bi-x-circle me-1"></i>}
                          {check.status}
                        </span>
                      </div>
                      <p className="small mb-0 text-muted">{check.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-2 text-muted small">
              <div>
                <i className="bi bi-info-circle me-1 text-primary"></i>
                <em>Officer Protocol: Smart verification assists review. The authorized municipal officer retains sole authority for final approval or rejection.</em>
              </div>
              {application.smartVerification.checkedAt && (
                <span style={{ fontSize: '0.75rem' }}>
                  Checked on: {new Date(application.smartVerification.checkedAt).toLocaleString('en-GB')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dossier Information Grid */}
      <div className="row g-4 mb-4">
        {/* Certificate Information */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 h-100 bg-white">
            <div className="card-header bg-white py-3 border-bottom">
              <h5 className="card-title mb-0 fw-bold text-dark">
                <i className={`bi ${isBirth ? 'bi-heart-pulse-fill text-primary' : 'bi-file-earmark-medical-fill text-danger'} me-2`}></i>
                {isBirth ? 'Birth Registration Dossier' : 'Death Registration Dossier'}
              </h5>
            </div>
            <div className="card-body p-4">
              {isBirth ? (
                <div className="row g-3">
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Child Full Name</span>
                    <strong className="fs-6 text-dark">{certDetails.childName}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Gender</span>
                    <strong className="text-dark">{certDetails.gender}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Date of Birth</span>
                    <strong className="text-dark">{certDetails.dateOfBirth}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Time of Birth</span>
                    <strong className="text-dark">{certDetails.timeOfBirth}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Father's Name</span>
                    <strong className="text-dark">{certDetails.fatherName}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Mother's Name</span>
                    <strong className="text-dark">{certDetails.motherName}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Father's Mobile</span>
                    <strong className="text-dark">{certDetails.fatherMobile}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Mother's Mobile</span>
                    <strong className="text-dark">{certDetails.motherMobile || 'N/A'}</strong>
                  </div>
                  <div className="col-12">
                    <span className="text-muted small d-block">Hospital / Place of Birth</span>
                    <strong className="text-dark">{certDetails.hospitalName} ({certDetails.placeOfBirth})</strong>
                  </div>
                  <div className="col-12">
                    <span className="text-muted small d-block">Permanent Address</span>
                    <strong className="text-dark">
                      {certDetails.permanentAddress || certDetails.address}, {certDetails.city} - {certDetails.pincode}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="row g-3">
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Deceased Full Name</span>
                    <strong className="fs-6 text-dark">{certDetails.deceasedName}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Gender</span>
                    <strong className="text-dark">{certDetails.gender}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Age at Death</span>
                    <strong className="text-dark">{certDetails.age} Years</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Date of Death</span>
                    <strong className="text-dark">{certDetails.dateOfDeath}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Time of Death</span>
                    <strong className="text-dark">{certDetails.timeOfDeath}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Place of Death</span>
                    <strong className="text-dark">{certDetails.hospitalName || certDetails.placeOfDeath}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Cause of Death</span>
                    <strong className="text-dark">{certDetails.causeOfDeath || 'Not specified'}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted small d-block">Spouse / Father Name</span>
                    <strong className="text-dark">{certDetails.spouseName || certDetails.fatherName || 'N/A'}</strong>
                  </div>
                  <div className="col-12 border-top pt-2 mt-2">
                    <span className="text-muted small d-block">Informant (Applicant)</span>
                    <strong className="text-dark">
                      {certDetails.informantName} ({certDetails.informantRelation}) - {certDetails.informantMobile}
                    </strong>
                    <div className="small text-muted">{certDetails.informantAddress}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Applicant Verification Details */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 h-100 bg-white">
            <div className="card-header bg-white py-3 border-bottom">
              <h5 className="card-title mb-0 fw-bold text-dark">
                <i className="bi bi-person-check-fill text-secondary me-2"></i> Applicant Registered Profile
              </h5>
            </div>
            <div className="card-body p-4">
              <div className="mb-3">
                <span className="text-muted small d-block">Citizen Name</span>
                <strong className="text-dark">{application.applicantDetails?.name || application.applicant?.name}</strong>
              </div>
              <div className="mb-3">
                <span className="text-muted small d-block">Email Address</span>
                <strong className="text-dark">{application.applicantDetails?.email || application.applicant?.email}</strong>
              </div>
              <div className="mb-3">
                <span className="text-muted small d-block">Contact Mobile</span>
                <strong className="text-dark">{application.applicantDetails?.mobile || application.applicant?.mobile}</strong>
              </div>
              <div className="mb-3">
                <span className="text-muted small d-block">Registered Address</span>
                <span className="text-dark">
                  {application.applicantDetails?.address}, {application.applicantDetails?.city},{' '}
                  {application.applicantDetails?.state} - {application.applicantDetails?.pincode}
                </span>
              </div>

              {/* SLA & Escalation Overview Box */}
              <div className="p-3 bg-light rounded border mb-3 small">
                <div className="fw-bold text-dark mb-2">
                  <i className="bi bi-clock-history text-primary me-1"></i> Workflow & Escalation Status
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <span className="text-muted d-block small">Current Status:</span>
                    <strong className="text-dark">{application.status?.replace('_', ' ')}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block small">SLA Status:</span>
                    <strong className={application.slaDeadline && new Date(application.slaDeadline) < new Date() && ['PENDING', 'UNDER_REVIEW'].includes(application.status) ? 'text-danger' : 'text-success'}>
                      {application.slaDeadline && new Date(application.slaDeadline) < new Date() && ['PENDING', 'UNDER_REVIEW'].includes(application.status) ? 'OVERDUE' : application.status === 'APPROVED' || application.status === 'REJECTED' ? 'COMPLETED' : 'ON TRACK'}
                    </strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block small">Escalation:</span>
                    <strong className={application.isEscalated ? 'text-danger' : 'text-muted'}>
                      {application.isEscalated ? 'RAISED BY CITIZEN' : 'NOT RAISED'}
                    </strong>
                  </div>
                  {application.isEscalated && (
                    <div className="col-6">
                      <span className="text-muted d-block small">Escalation Status:</span>
                      <span className="badge bg-danger">{application.escalationStatus || 'PENDING'}</span>
                    </div>
                  )}
                  {application.isEscalated && application.escalatedAt && (
                    <div className="col-6">
                      <span className="text-muted d-block small">Escalated On:</span>
                      <strong className="text-dark">{new Date(application.escalatedAt).toLocaleString('en-GB')}</strong>
                    </div>
                  )}
                  {application.isEscalated && application.escalationReason && (
                    <div className="col-12">
                      <span className="text-muted d-block small">Escalation Reason:</span>
                      <span className="text-dark">{application.escalationReason}</span>
                    </div>
                  )}
                  {application.isEscalated && application.escalationDescription && (
                    <div className="col-12">
                      <span className="text-muted d-block small">Citizen Remark:</span>
                      <span className="text-dark">{application.escalationDescription}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-light rounded border mt-3 small">
                <div className="fw-bold text-secondary mb-1">
                  <i className="bi bi-shield-lock-fill text-primary me-1"></i> Verification Protocol:
                </div>
                Cross-verify uploaded hospital records with the institutional database and confirm ID proof before granting approval.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded Documents for Verification */}
      <div className="card shadow-sm border-0 mb-4 bg-white">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fw-bold text-dark">
            <i className="bi bi-file-earmark-check-fill text-primary me-2"></i> Supporting Documents Verification
          </h5>
          <span className="badge bg-info text-dark">{application.documents?.length || 0} Documents Uploaded</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase">
                <tr>
                  <th className="ps-4">Document Category</th>
                  <th>Original File Name</th>
                  <th>File Size</th>
                  <th>Uploaded Date</th>
                  <th className="text-end pe-4">Inspection Action</th>
                </tr>
              </thead>
              <tbody>
                {application.documents && application.documents.length > 0 ? (
                  application.documents.map((doc, idx) => (
                    <tr key={doc._id || idx}>
                      <td className="ps-4 fw-bold text-dark">
                        <i className="bi bi-file-earmark-pdf text-danger me-2"></i>
                        {doc.documentType}
                      </td>
                      <td className="text-muted small">{doc.originalName || doc.fileName}</td>
                      <td className="small">{doc.size ? `${(doc.size / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}</td>
                      <td className="small text-muted">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString('en-GB') : 'N/A'}
                      </td>
                      <td className="text-end pe-4">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => openDocumentViewer(doc)}
                        >
                          <i className="bi bi-eye me-1"></i> Preview & Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">
                      No documents attached.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Correction & Resubmission History (if any) */}
      {application.correctionHistory && application.correctionHistory.length > 0 && (
        <div className="card shadow-sm border-0 mb-4 bg-white">
          <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0 fw-bold text-dark">
              <i className="bi bi-clock-history text-warning me-2"></i> Correction & Resubmission History
            </h5>
            <span className="badge bg-secondary">{application.correctionHistory.length} Event(s)</span>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th className="ps-4">Request Ref</th>
                    <th>Requested On</th>
                    <th>Requested Item(s)</th>
                    <th>Officer Reason</th>
                    <th>Resubmission Status</th>
                    <th className="pe-4">Resubmitted Date</th>
                  </tr>
                </thead>
                <tbody>
                  {application.correctionHistory.map((item, idx) => (
                    <tr key={idx}>
                      <td className="ps-4 fw-semibold text-primary">{item.requestId || `CORR-#${idx + 1}`}</td>
                      <td className="small text-muted">
                        {item.requestedAt ? new Date(item.requestedAt).toLocaleString('en-GB') : 'N/A'}
                      </td>
                      <td>
                        {(item.items || []).map((it, iIdx) => (
                          <span key={iIdx} className="badge bg-light text-dark border me-1 mb-1">
                            {it.label}
                          </span>
                        ))}
                      </td>
                      <td className="small text-dark">{item.reason || 'N/A'}</td>
                      <td>
                        {item.resubmittedAt ? (
                          <span className="badge bg-success">
                            <i className="bi bi-check-circle me-1"></i> Resubmitted
                          </span>
                        ) : (
                          <span className="badge bg-warning text-dark">
                            <i className="bi bi-hourglass-split me-1"></i> Pending Citizen
                          </span>
                        )}
                      </td>
                      <td className="small text-muted pe-4">
                        {item.resubmittedAt ? new Date(item.resubmittedAt).toLocaleString('en-GB') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <RejectionModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleRejectConfirm}
        applicationNumber={application.applicationNumber}
        loading={actionLoading}
      />

      <RequestCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        onConfirm={handleCorrectionSubmit}
        application={application}
        loading={actionLoading}
      />

      <DocumentViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        document={viewerDoc}
        applicationId={application._id}
      />
    </div>
  );
};

export default OfficerApplicationDetails;
