import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { escalateApplication as apiEscalate } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import SlaIndicator from '../../components/SlaIndicator';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import CorrectApplicationModal from '../../components/CorrectApplicationModal';

const CitizenApplicationDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const isJustSubmitted = new URLSearchParams(location.search).get('submitted') === 'true';

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Modals State
  const [isCorrectModalOpen, setIsCorrectModalOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Escalation State
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [escalationDescription, setEscalationDescription] = useState('');
  const [escalationSubmitting, setEscalationSubmitting] = useState(false);
  const [escalationError, setEscalationError] = useState('');


  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/applications/${id}`);
      if (res.data && res.data.application) {
        setApplication(res.data.application);
      }
    } catch (err) {
      console.error('[Fetch Application Details Error]:', err);
      setError(
        err.response?.data?.message ||
          'Failed to load application details. You may not have authorization to view this record.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

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
      alert('Failed to download certificate.');
    } finally {
      setDownloading(false);
    }
  };

  const openDocumentViewer = (doc) => {
    setViewerDoc(doc);
    setIsViewerOpen(true);
  };

  const handleEscalationSubmit = async (e) => {
    e.preventDefault();
    if (!escalationReason || !escalationReason.trim()) {
      setEscalationError('Please select or provide a reason for escalation.');
      return;
    }
    setEscalationSubmitting(true);
    setEscalationError('');
    try {
      const res = await apiEscalate(application._id, escalationReason.trim(), escalationDescription.trim());
      if (res.data && res.data.success) {
        setApplication(res.data.application);
        setShowEscalationModal(false);
        setSuccessMessage('Complaint / Escalation has been successfully submitted to municipal administration.');
        setEscalationReason('');
        setEscalationDescription('');
      }
    } catch (err) {
      console.error('[Escalation Error]:', err);
      setEscalationError(err.response?.data?.message || 'Failed to submit escalation. Please try again.');
    } finally {
      setEscalationSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2 text-muted small">Loading application record...</div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger p-4 text-center">
          <i className="bi bi-shield-x fs-1 d-block mb-2 text-danger"></i>
          <h5>Access Error</h5>
          <p className="mb-3">{error || 'Application not found.'}</p>
          <Link to="/citizen/applications" className="btn btn-outline-danger btn-sm">
            <i className="bi bi-arrow-left me-1"></i> Back to My Applications
          </Link>
        </div>
      </div>
    );
  }

  const isBirth = application.certificateType === 'BIRTH';
  const certDetails = application.certificateDetails || {};
  const beneficiary = isBirth ? certDetails.childName : certDetails.deceasedName;

  /* ------------------------------------------------------------------ */
  /* Helper: derive a status colour class                                */
  /* ------------------------------------------------------------------ */
  const markerColour = (cond) =>
    cond === 'done'
      ? 'bg-success text-white'
      : cond === 'active'
      ? 'bg-info text-dark'
      : cond === 'rejected'
      ? 'bg-danger text-white'
      : 'bg-light text-muted border border-secondary';

  const markerIcon = (cond) =>
    cond === 'done'
      ? 'bi-check-lg fw-bold'
      : cond === 'active'
      ? 'bi-hourglass-split'
      : cond === 'rejected'
      ? 'bi-x-lg fw-bold'
      : 'bi-circle';

  const reviewState =
    application.status === 'PENDING'
      ? 'pending'
      : application.status === 'UNDER_REVIEW'
      ? 'active'
      : 'done';

  const finalState =
    application.status === 'APPROVED'
      ? 'done'
      : application.status === 'REJECTED'
      ? 'rejected'
      : 'pending';

  const isOverdue =
    application.slaDeadline &&
    new Date(application.slaDeadline) < new Date() &&
    ['PENDING', 'UNDER_REVIEW'].includes(application.status);

  return (
    <div className="container-fluid py-4 px-3 px-md-4" style={{ backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item"><Link to="/citizen/dashboard">Dashboard</Link></li>
          <li className="breadcrumb-item"><Link to="/citizen/applications">My Applications</Link></li>
          <li className="breadcrumb-item active" aria-current="page">{application.applicationNumber}</li>
        </ol>
      </nav>

      {/* Just-Submitted Banner */}
      {isJustSubmitted && (
        <div className="alert alert-success alert-dismissible fade show p-3 shadow-sm mb-4" role="alert">
          <div className="d-flex align-items-center">
            <i className="bi bi-check-circle-fill fs-3 text-success me-3"></i>
            <div>
              <h5 className="alert-heading mb-1 fw-bold">Application Successfully Submitted!</h5>
              <div className="small">
                Your application number is <strong>{application.applicationNumber}</strong>. It has been routed to the municipal verification desk under the municipal SLA turnaround window.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          Page Header (matching TrackApplication style)
          ============================================================ */}
      <div className="card shadow-sm border-0 mb-4 overflow-hidden">
        <div
          className="card-header text-white py-4 px-4"
          style={{ background: 'linear-gradient(135deg, #0b2d5c, #164b8c)' }}
        >
          <div className="row align-items-center">
            <div className="col-md-8">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className={`badge ${isBirth ? 'bg-primary' : 'bg-danger'} px-3 py-1`}>
                  {application.certificateType}
                </span>
                <StatusBadge status={application.status} />
              </div>
              <h3 className="fw-bold mb-1 text-white">{application.applicationNumber}</h3>
              {beneficiary && (
                <p className="small text-light opacity-75 mb-0">
                  Beneficiary: <strong className="text-white">{beneficiary}</strong>
                </p>
              )}
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              {application.status === 'APPROVED' ? (
                <div>
                  <div className="badge bg-success fs-6 px-3 py-2 mb-2 d-inline-block">
                    <i className="bi bi-patch-check-fill me-1"></i>{application.certificateNumber}
                  </div>
                  <div>
                    <button
                      className="btn btn-warning fw-bold text-dark shadow-sm btn-sm"
                      onClick={handleDownloadCertificate}
                      disabled={downloading}
                    >
                      {downloading ? (
                        <><span className="spinner-border spinner-border-sm me-1"></span>Generating...</>
                      ) : (
                        <><i className="bi bi-file-earmark-pdf-fill me-1"></i>Download PDF</>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-light small mb-1">Service Level Agreement:</div>
                  <SlaIndicator deadline={application.slaDeadline} status={application.status} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Alert Banner */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show p-3 shadow-sm mb-4" role="alert">
          <div className="d-flex align-items-center">
            <i className="bi bi-check-circle-fill fs-4 text-success me-2"></i>
            <div className="fw-semibold">{successMessage}</div>
            <button type="button" className="btn-close ms-auto" onClick={() => setSuccessMessage('')}></button>
          </div>
        </div>
      )}

      {/* CORRECTION REQUIRED Action Banner */}
      {application.status === 'CORRECTION_REQUIRED' && (
        <div className="alert p-4 border-warning shadow-sm mb-4 rounded-3" style={{ backgroundColor: '#fffaf0', borderLeft: '5px solid #dd6b20' }}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center mb-1">
                <i className="bi bi-exclamation-triangle-fill text-warning fs-3 me-2"></i>
                <h5 className="alert-heading fw-bold mb-0 text-dark">Action Required: Correction Requested by Officer</h5>
              </div>
              <p className="mb-2 text-dark">
                <strong>Officer Remark:</strong> {application.correctionRequest?.reason || 'Please correct the specified items below.'}
              </p>
              <div className="small text-secondary">
                <strong>Requested Correction Item(s):</strong>{' '}
                {(application.correctionRequest?.items || []).map((item, idx) => (
                  <span key={idx} className="badge bg-warning text-dark me-1 mb-1">
                    <i className={item.type === 'DOCUMENT' ? 'bi bi-file-earmark-arrow-up me-1' : 'bi bi-pencil-square me-1'}></i>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <button
                className="btn btn-warning fw-bold px-4 py-2 shadow-sm text-dark"
                onClick={() => setIsCorrectModalOpen(true)}
              >
                <i className="bi bi-pencil-fill me-1"></i> Make Corrections & Resubmit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESUBMITTED Confirmation Banner */}
      {application.status === 'RESUBMITTED' && (
        <div className="alert alert-info p-3 shadow-sm mb-4 d-flex align-items-center border-info">
          <i className="bi bi-arrow-repeat fs-3 text-info me-3"></i>
          <div>
            <h6 className="alert-heading fw-bold mb-1 text-dark">Correction Submitted Successfully</h6>
            <div className="small text-secondary">
              Your application corrections have been received and returned to the municipal verification desk for officer re-examination.
            </div>
          </div>
        </div>
      )}

      {/* SLA Overdue — Citizen Escalation Action Banner */}
      {isOverdue && !application.isEscalated && (
        <div className="alert alert-warning p-4 border-warning shadow-sm mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div className="d-flex align-items-start">
              <i className="bi bi-clock-history fs-2 text-warning me-3 mt-1"></i>
              <div>
                <h6 className="alert-heading fw-bold mb-1 text-dark">
                  Application Processing Delayed (SLA Overdue)
                </h6>
                <div className="small text-secondary">
                  This application has exceeded the expected SLA processing time. If you wish to request priority supervisory attention, you may submit a formal complaint / escalation to the municipal administration.
                </div>
              </div>
            </div>
            <div>
              <button
                className="btn btn-danger fw-bold text-nowrap px-3 py-2 shadow-sm"
                onClick={() => {
                  setEscalationError('');
                  setShowEscalationModal(true);
                }}
              >
                <i className="bi bi-megaphone-fill me-1"></i> Raise Complaint / Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint / Escalation Raised by Citizen Banner */}
      {application.isEscalated && (
        <div className="alert alert-danger p-4 border-danger shadow-sm mb-4">
          <div className="d-flex align-items-start">
            <i className="bi bi-exclamation-octagon-fill text-danger fs-2 me-3 mt-1"></i>
            <div className="w-100">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                <h6 className="alert-heading fw-bold mb-0 text-danger">
                  <i className="bi bi-shield-exclamation me-1"></i> Complaint / Escalation Raised by Citizen
                </h6>
                <span className="badge bg-danger px-3 py-1">
                  STATUS: {application.escalationStatus || 'PENDING'}
                </span>
              </div>
              <p className="mb-2 text-dark small">
                You have submitted a formal complaint for this delayed application. Municipal supervisors and administrators have been alerted.
              </p>
              <div className="row g-2 small bg-white p-3 rounded border">
                <div className="col-sm-6">
                  <span className="text-muted d-block">Raised On:</span>
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
                    <span className="text-muted d-block">Citizen Remark:</span>
                    <span className="text-dark">{application.escalationDescription}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          Two-column layout: Timeline (left) + Summary (right)
          ============================================================ */}
      <div className="row g-4 mb-4">

        {/* LEFT — Application Timeline */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 bg-white h-100">
            <div className="card-body p-4 p-md-5">
              <h5 className="fw-bold text-dark mb-4 d-flex align-items-center">
                <i className="bi bi-diagram-3-fill text-primary me-2"></i>
                Application Timeline
              </h5>

              {/* Timeline container — matches TrackApplication.js exactly */}
              <div className="tracking-timeline position-relative ps-4 ps-md-5">

                {/* ── Step 1: Application Submitted (always complete) ── */}
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
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-muted small mb-0">
                      Application <strong>{application.applicationNumber}</strong> successfully registered in the Municipal Civil Registration Repository.
                    </p>
                  </div>
                </div>

                {/* ── Step 2: Documents Registered (always complete once submitted) ── */}
                <div className="timeline-item position-relative pb-4">
                  <div
                    className="timeline-marker bg-success text-white rounded-circle position-absolute d-flex align-items-center justify-content-center"
                    style={{ width: '32px', height: '32px', left: '-44px', top: '0px' }}
                  >
                    <i className="bi bi-check-lg fw-bold"></i>
                  </div>
                  <div className="timeline-content">
                    <div className="d-flex flex-wrap justify-content-between align-items-center">
                      <h6 className="fw-bold text-dark mb-1">Documents Registered</h6>
                      <span className="badge bg-light text-success border border-success">Verified</span>
                    </div>
                    <p className="text-muted small mb-0">
                      {application.documents && application.documents.length > 0
                        ? `${application.documents.length} supporting document(s) received and registered.`
                        : 'Supporting documents received and registered.'}
                    </p>
                  </div>
                </div>

                {/* ── Step 3: Officer Review ── */}
                <div className="timeline-item position-relative pb-4">
                  <div
                    className={`timeline-marker ${markerColour(reviewState)} rounded-circle position-absolute d-flex align-items-center justify-content-center`}
                    style={{ width: '32px', height: '32px', left: '-44px', top: '0px' }}
                  >
                    <i className={`bi ${markerIcon(reviewState)}`}></i>
                  </div>
                  <div className="timeline-content">
                    <div className="d-flex flex-wrap justify-content-between align-items-center">
                      <h6 className="fw-bold text-dark mb-1">Officer Review</h6>
                      <span
                        className={`badge ${
                          reviewState === 'active'
                            ? 'bg-info text-dark'
                            : reviewState === 'done'
                            ? 'bg-light text-secondary border'
                            : 'bg-light text-muted border'
                        }`}
                      >
                        {application.status === 'PENDING'
                          ? 'Queued'
                          : application.status === 'UNDER_REVIEW'
                          ? 'In Progress'
                          : application.reviewedAt
                          ? new Date(application.reviewedAt).toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })
                          : 'Completed'}
                      </span>
                    </div>
                    <p className="text-muted small mb-0">
                      {application.status === 'PENDING'
                        ? 'Application is in queue awaiting assignment to a verification officer.'
                        : application.status === 'UNDER_REVIEW'
                        ? 'A municipal officer is actively reviewing the application and supporting documents.'
                        : 'Document review completed by authorized Municipal Registrar.'}
                    </p>
                  </div>
                </div>

                {/* ── Step 4: Final Decision ── */}
                <div className="timeline-item position-relative">
                  <div
                    className={`timeline-marker ${markerColour(finalState)} rounded-circle position-absolute d-flex align-items-center justify-content-center`}
                    style={{ width: '32px', height: '32px', left: '-44px', top: '0px' }}
                  >
                    <i className={`bi ${
                      finalState === 'done' ? 'bi-patch-check-fill' :
                      finalState === 'rejected' ? 'bi-x-lg fw-bold' : 'bi-award'
                    }`}></i>
                  </div>
                  <div className="timeline-content">
                    <div className="d-flex flex-wrap justify-content-between align-items-center">
                      <h6 className="fw-bold text-dark mb-1">
                        {application.status === 'APPROVED'
                          ? 'Certificate Issued'
                          : application.status === 'REJECTED'
                          ? 'Application Rejected'
                          : 'Final Decision & Certificate Issuance'}
                      </h6>
                      <span
                        className={`badge ${
                          finalState === 'done' ? 'bg-success' :
                          finalState === 'rejected' ? 'bg-danger' : 'bg-warning text-dark'
                        }`}
                      >
                        {application.status === 'APPROVED' ? 'APPROVED' :
                         application.status === 'REJECTED' ? 'REJECTED' : 'PENDING'}
                      </span>
                    </div>

                    {/* APPROVED: certificate card */}
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
                                    day: '2-digit', month: 'long', year: 'numeric',
                                  })
                                : application.reviewedAt
                                ? new Date(application.reviewedAt).toLocaleDateString('en-GB', {
                                    day: '2-digit', month: 'long', year: 'numeric',
                                  })
                                : 'Authorized'}
                            </span>
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border mb-3">
                          <span className="text-muted small d-block">Certificate Number:</span>
                          <span className="fw-bold fs-6 text-primary">{application.certificateNumber}</span>
                        </div>
                        {application.certificateIntegrity?.dataHash && (
                          <div className="bg-white p-2 rounded border mb-3 d-flex justify-content-between align-items-center">
                            <span className="text-muted small fw-semibold">Cryptographic Integrity:</span>
                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25" style={{ fontSize: '0.72rem' }}>
                              <i className="bi bi-shield-check me-1"></i> SHA-256 Verified
                            </span>
                          </div>
                        )}
                        <div className="d-flex flex-wrap gap-2">
                          <Link
                            to={`/verify?q=${encodeURIComponent(application.certificateNumber || application.applicationNumber)}`}
                            className="btn btn-success btn-sm fw-semibold"
                          >
                            <i className="bi bi-patch-check me-1"></i>View in Digital Archive
                          </Link>
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm fw-semibold"
                            onClick={handleDownloadCertificate}
                            disabled={downloading}
                          >
                            {downloading ? (
                              <><span className="spinner-border spinner-border-sm me-1"></span>Generating...</>
                            ) : (
                              <><i className="bi bi-file-earmark-pdf-fill me-1"></i>Download PDF</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* REJECTED: reason card */}
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
                                    day: '2-digit', month: 'long', year: 'numeric',
                                  })
                                : 'N/A'}
                            </div>
                            <Link
                              to={isBirth ? '/citizen/apply/birth' : '/citizen/apply/death'}
                              className="btn btn-outline-danger btn-sm"
                            >
                              <i className="bi bi-arrow-repeat me-1"></i>Submit Corrected Application
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PENDING / UNDER_REVIEW: SLA card */}
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
                                    day: '2-digit', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                  })
                                : 'within standard municipal working days'}.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>{/* end tracking-timeline */}
            </div>
          </div>
        </div>

        {/* RIGHT — Application Summary + Certificate Card */}
        <div className="col-lg-5">

          {/* Application Summary */}
          <div className="card shadow-sm border-0 bg-white mb-4">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="fw-bold text-dark mb-0">
                <i className="bi bi-file-text-fill text-primary me-2"></i>Application Summary
              </h6>
            </div>
            <div className="card-body p-4">
              <div className="mb-3">
                <span className="text-muted small d-block">Application Number</span>
                <strong className="text-dark">{application.applicationNumber}</strong>
              </div>
              <div className="mb-3">
                <span className="text-muted small d-block">Certificate Type</span>
                <span className={`badge ${isBirth ? 'bg-primary' : 'bg-danger'}`}>
                  {application.certificateType} CERTIFICATE
                </span>
              </div>
              <div className="mb-3">
                <span className="text-muted small d-block">Beneficiary / Name</span>
                <strong className="text-dark">{beneficiary || 'N/A'}</strong>
              </div>
              <div className="mb-3">
                <span className="text-muted small d-block">Applicant</span>
                <strong className="text-dark">{application.applicantDetails?.name || 'N/A'}</strong>
              </div>
              <div className="mb-3">
                <span className="text-muted small d-block">Submission Date</span>
                <strong className="text-dark">
                  {new Date(application.submittedAt).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </strong>
              </div>
              <div className="mb-3">
                <span className="text-muted small d-block">Current Status</span>
                <StatusBadge status={application.status} />
              </div>
              {application.status !== 'APPROVED' && (
                <div className="mb-0">
                  <span className="text-muted small d-block">SLA / Deadline</span>
                  <SlaIndicator deadline={application.slaDeadline} status={application.status} />
                </div>
              )}
            </div>
          </div>

          {/* Certificate Authenticated Card (only if APPROVED) */}
          {application.status === 'APPROVED' && application.certificateNumber && (
            <div
              className="card shadow-sm border-0"
              style={{ background: 'linear-gradient(135deg, #e8f5e9, #f1f8e9)', border: '1px solid #a5d6a7' }}
            >
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-3">
                  <i className="bi bi-shield-check text-success fs-3 me-3"></i>
                  <div>
                    <span className="badge bg-success mb-1">
                      <i className="bi bi-patch-check-fill me-1"></i>GENUINE &amp; VALID
                    </span>
                    <h6 className="fw-bold text-dark mb-0">Certificate Authenticated</h6>
                  </div>
                </div>
                <div className="bg-white rounded p-3 border mb-3">
                  <span className="text-muted small d-block">Certificate Number:</span>
                  <span className="fw-bold text-primary fs-6">{application.certificateNumber}</span>
                </div>
                <div className="d-grid gap-2">
                  <Link
                    to={`/verify?q=${encodeURIComponent(application.certificateNumber)}`}
                    className="btn btn-success fw-semibold"
                  >
                    <i className="bi bi-patch-check me-2"></i>View in Digital Archive
                  </Link>
                  <button
                    type="button"
                    className="btn btn-outline-success fw-semibold"
                    onClick={handleDownloadCertificate}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <><span className="spinner-border spinner-border-sm me-1"></span>Generating PDF...</>
                    ) : (
                      <><i className="bi bi-file-earmark-pdf-fill me-1"></i>Download Official Certificate PDF</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Certificate Details Card */}
          <div className="card shadow-sm border-0 bg-white mt-4">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="fw-bold text-dark mb-0">
                <i className={`bi ${isBirth ? 'bi-heart-pulse-fill text-primary' : 'bi-file-earmark-medical-fill text-danger'} me-2`}></i>
                {isBirth ? 'Child & Birth Information' : 'Deceased & Death Information'}
              </h6>
            </div>
            <div className="card-body p-4">
              {isBirth ? (
                <div className="row g-2">
                  {[
                    ['Child Full Name', certDetails.childName],
                    ['Gender', certDetails.gender],
                    ['Date of Birth', certDetails.dateOfBirth],
                    ['Time of Birth', certDetails.timeOfBirth],
                    ["Father's Name", certDetails.fatherName],
                    ["Mother's Name", certDetails.motherName],
                    ['Hospital / Place of Birth', certDetails.hospitalName],
                    ['Registration District', certDetails.district],
                  ].map(([label, val]) => (
                    <div key={label} className="col-12">
                      <span className="text-muted small d-block">{label}</span>
                      <strong className="text-dark small">{val || 'N/A'}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="row g-2">
                  {[
                    ['Deceased Full Name', certDetails.deceasedName],
                    ['Gender', certDetails.gender],
                    ['Age at Death', certDetails.age ? `${certDetails.age} Years` : undefined],
                    ['Date of Death', certDetails.dateOfDeath],
                    ['Place of Death', certDetails.placeOfDeath || certDetails.hospitalName],
                    ['Cause of Death', certDetails.causeOfDeath],
                    ['Informant', certDetails.informantName ? `${certDetails.informantName} (${certDetails.informantRelation})` : undefined],
                  ].map(([label, val]) => (
                    <div key={label} className="col-12">
                      <span className="text-muted small d-block">{label}</span>
                      <strong className="text-dark small">{val || 'N/A'}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>{/* end row */}

      {/* Uploaded Documents Table */}
      <div className="card shadow-sm border-0 mb-4 bg-white">
        <div className="card-header bg-white py-3 border-bottom">
          <h5 className="card-title mb-0 fw-bold text-dark">
            <i className="bi bi-paperclip text-primary me-2"></i>
            Uploaded Supporting Documents
            {application.documents && application.documents.length > 0 && (
              <span className="badge bg-primary ms-2 fw-normal">{application.documents.length}</span>
            )}
          </h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-uppercase">
                <tr>
                  <th className="ps-4">Document Type</th>
                  <th>File Name</th>
                  <th>File Size</th>
                  <th>Uploaded Date</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {application.documents && application.documents.length > 0 ? (
                  application.documents.map((doc, idx) => (
                    <tr key={doc._id || idx}>
                      <td className="ps-4 fw-bold text-dark">
                        <i className="bi bi-file-earmark-text text-primary me-2"></i>
                        {doc.documentType}
                      </td>
                      <td className="text-muted small">{doc.originalName || doc.fileName}</td>
                      <td className="small">{doc.size ? `${(doc.size / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}</td>
                      <td className="small text-muted">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="text-end pe-4">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => openDocumentViewer(doc)}
                        >
                          <i className="bi bi-eye me-1"></i>Preview
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-3 text-muted">
                      No documents recorded for this application.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        document={viewerDoc}
        applicationId={application._id}
      />

      {/* Controlled Correction & Resubmission Modal */}
      <CorrectApplicationModal
        isOpen={isCorrectModalOpen}
        onClose={() => setIsCorrectModalOpen(false)}
        application={application}
        onSuccess={(updatedApp, msg) => {
          setApplication(updatedApp);
          setSuccessMessage(msg || 'Application corrections successfully resubmitted.');
        }}
      />

      {/* Citizen Escalation / Complaint Modal */}
      {showEscalationModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-megaphone-fill me-2"></i> Raise Complaint / Escalation
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  disabled={escalationSubmitting}
                  onClick={() => setShowEscalationModal(false)}
                ></button>
              </div>
              <form onSubmit={handleEscalationSubmit}>
                <div className="modal-body p-4">
                  <div className="alert alert-info py-2 small mb-3">
                    <i className="bi bi-info-circle me-1"></i>
                    Your application <strong>{application.applicationNumber}</strong> has exceeded the expected SLA processing time. Submitting this complaint alerts senior municipal supervisors.
                  </div>

                  {escalationError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      {escalationError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-bold small text-secondary">
                      Reason for Escalation <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={escalationReason}
                      onChange={(e) => setEscalationReason(e.target.value)}
                      required
                    >
                      <option value="">-- Select Reason --</option>
                      <option value="SLA Processing Window Exceeded">SLA Processing Window Exceeded</option>
                      <option value="Urgent Certificate Requirement">Urgent Certificate Requirement</option>
                      <option value="No Status Update After Submission">No Status Update After Submission</option>
                      <option value="Correction Submitted But Delayed">Correction Submitted But Delayed</option>
                      <option value="Other Processing Delay">Other Processing Delay</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold small text-secondary">
                      Detailed Description / Remark (Optional)
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Provide any additional details or urgency notes for the municipal administrator..."
                      value={escalationDescription}
                      onChange={(e) => setEscalationDescription(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={escalationSubmitting}
                    onClick={() => setShowEscalationModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger btn-sm fw-bold px-3"
                    disabled={escalationSubmitting}
                  >
                    {escalationSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span> Submitting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send-fill me-1"></i> Submit Complaint
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

export default CitizenApplicationDetails;
