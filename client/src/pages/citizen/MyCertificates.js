import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const MyCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchCertificates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/applications/my');
      if (res.data && res.data.applications) {
        const approved = res.data.applications.filter(
          (app) => app.status === 'APPROVED' && app.certificateNumber
        );
        setCertificates(approved);
      }
    } catch (err) {
      console.error('[Fetch Certificates Error]:', err);
      setError('Unable to load certificate records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleDownload = async (appId, certNumber) => {
    setDownloadingId(appId);
    try {
      const res = await api.get(`/certificates/${appId}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${certNumber || 'Certificate'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('[Certificate Download Error]:', err);
      alert('Failed to download certificate PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="container py-4">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/citizen/dashboard">Dashboard</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            My Certificates
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-patch-check-fill text-success me-2"></i>My Certificates
          </h3>
          <p className="text-muted small mb-0">
            View and download your officially approved municipal certificates
          </p>
        </div>
        <Link to="/citizen/applications" className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-folder2-open me-1"></i>All Applications
        </Link>
      </div>

      {error && <div className="alert alert-danger py-2 small mb-4">{error}</div>}

      {loading ? (
        <div className="p-5 text-center">
          <div className="spinner-border text-success" role="status"></div>
          <div className="mt-2 text-muted small">Loading your certificates...</div>
        </div>
      ) : certificates.length === 0 ? (
        <div className="card border-0 shadow-sm bg-white">
          <div className="card-body p-5 text-center text-muted">
            <i className="bi bi-patch-check fs-1 d-block mb-3 text-muted"></i>
            <h5 className="fw-bold">No Approved Certificates Yet</h5>
            <p className="mb-4 small">
              Certificates will appear here once your applications are approved by the municipal officer.
            </p>
            <Link to="/citizen/applications" className="btn btn-outline-primary btn-sm me-2">
              <i className="bi bi-folder2-open me-1"></i>View My Applications
            </Link>
            <Link to="/citizen/apply/birth" className="btn btn-primary btn-sm">
              <i className="bi bi-plus-lg me-1"></i>Apply for Certificate
            </Link>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {certificates.map((cert) => {
            const isBirth = cert.certificateType === 'BIRTH';
            const beneficiary = isBirth
              ? cert.certificateDetails?.childName
              : cert.certificateDetails?.deceasedName;
            const isDownloading = downloadingId === cert._id;

            return (
              <div key={cert._id} className="col-lg-6">
                <div className="card border-0 shadow-sm h-100 bg-white">
                  <div className={`card-header py-3 ${isBirth ? 'bg-primary' : 'bg-danger'} text-white`}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <i className={`bi ${isBirth ? 'bi-heart-pulse-fill' : 'bi-file-earmark-medical-fill'} fs-5`}></i>
                        <span className="fw-bold">{cert.certificateType} CERTIFICATE</span>
                      </div>
                      <span className="badge bg-white text-success fw-bold">
                        <i className="bi bi-patch-check-fill me-1"></i>APPROVED
                      </span>
                    </div>
                  </div>

                  <div className="card-body p-4">
                    <div className="mb-3">
                      <div className="text-muted small fw-bold text-uppercase mb-1">Certificate Number</div>
                      <div className="fw-bold fs-6 text-success">
                        <i className="bi bi-patch-check-fill me-1"></i>
                        {cert.certificateNumber}
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-sm-6">
                        <div className="text-muted small fw-bold text-uppercase mb-1">Beneficiary</div>
                        <div className="fw-semibold text-dark">{beneficiary || 'N/A'}</div>
                      </div>
                      <div className="col-sm-6">
                        <div className="text-muted small fw-bold text-uppercase mb-1">Application Number</div>
                        <div className="small text-muted">{cert.applicationNumber}</div>
                      </div>
                      <div className="col-sm-6">
                        <div className="text-muted small fw-bold text-uppercase mb-1">Date Approved</div>
                        <div className="small">
                          {cert.certificateIssuedAt
                            ? new Date(cert.certificateIssuedAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              })
                            : cert.reviewedAt
                            ? new Date(cert.reviewedAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <div className="text-muted small fw-bold text-uppercase mb-1">Certificate Type</div>
                        <span className={`badge ${isBirth ? 'bg-primary' : 'bg-danger'}`}>
                          {cert.certificateType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer bg-white border-top py-3 d-flex gap-2">
                    <Link
                      to={`/citizen/applications/${cert._id}`}
                      className="btn btn-outline-secondary btn-sm flex-fill"
                    >
                      <i className="bi bi-eye me-1"></i>View Details
                    </Link>
                    <button
                      className="btn btn-success btn-sm flex-fill"
                      onClick={() => handleDownload(cert._id, cert.certificateNumber)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1"></span>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-file-earmark-pdf-fill me-1"></i>Download PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && certificates.length > 0 && (
        <div className="mt-4 text-center text-muted small">
          <i className="bi bi-shield-check text-success me-1"></i>
          {certificates.length} approved certificate{certificates.length !== 1 ? 's' : ''} issued from the Municipal Digital Archive
        </div>
      )}
    </div>
  );
};

export default MyCertificates;
