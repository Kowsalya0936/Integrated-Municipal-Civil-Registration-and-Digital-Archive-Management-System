import React, { useState, useEffect } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import api from '../services/api';

const APPLICATION_NUMBER_REGEX = /^(BIRTH|DEATH)-\d{4}-\d{5}$/i;

const VerifyCertificate = () => {
  const { identifier: paramIdentifier } = useParams();
  const location = useLocation();
  const queryParam = new URLSearchParams(location.search).get('q');

  const [query, setQuery] = useState(paramIdentifier || queryParam || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isAppNumber, setIsAppNumber] = useState(false);

  const executeVerification = async (searchId) => {
    if (!searchId || !searchId.trim()) return;

    const trimmed = searchId.trim();

    // Detect application number — do NOT call certificate verify
    if (APPLICATION_NUMBER_REGEX.test(trimmed)) {
      setIsAppNumber(true);
      setResult(null);
      setError('');
      setLoading(false);
      return;
    }

    setIsAppNumber(false);
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.get(`/certificates/verify/${encodeURIComponent(trimmed)}`);
      if (res.data && res.data.isValid) {
        setResult(res.data.certificate);
      }
    } catch (err) {
      console.error('[Verification Error]:', err);
      setError(
        err.response?.data?.message ||
          'No matching approved record found in the Municipal Digital Archive. Please verify the Certificate or Application Number.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const idToSearch = paramIdentifier || queryParam;
    if (idToSearch) {
      setQuery(idToSearch);
      executeVerification(idToSearch);
    }
  }, [paramIdentifier, queryParam]);

  const handleSubmit = (e) => {
    e.preventDefault();
    executeVerification(query);
  };

  return (
    <div className="verify-page-bg py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8 col-xl-7">

            {/* ── Page Header ── */}
            <div className="text-center mb-4">
              <div className="verify-shield-icon mx-auto mb-3">
                <i className="bi bi-shield-check"></i>
              </div>
              <span className="badge verify-portal-badge mb-2">
                <i className="bi bi-qr-code-scan me-1"></i> Digital Archive Portal
              </span>
              <h2 className="fw-bold mb-1 verify-page-title">
                Public Certificate Verification
              </h2>
              <p className="text-muted small mb-0 verify-page-subtitle">
                Authenticate official municipal Birth and Death certificates issued by the Civil Registration Department
              </p>
            </div>

            {/* ── Main Verification Card ── */}
            <div className="card verify-card border-0 shadow mb-4">

              {/* Card Header stripe */}
              <div className="verify-card-header d-flex align-items-center gap-2 px-4 py-3">
                <i className="bi bi-search text-warning fs-6"></i>
                <span className="fw-semibold text-white small">
                  Verify a Certificate or Track an Application
                </span>
              </div>

              {/* Card Body */}
              <div className="card-body px-4 pt-4 pb-4">
                <form onSubmit={handleSubmit} className="mb-3">
                  <label className="form-label fw-semibold text-secondary small mb-2">
                    Enter Certificate Number or Application Number
                  </label>

                  <div className="d-flex gap-2 align-items-stretch">
                    <div className="input-group verify-input-group flex-grow-1">
                      <span className="input-group-text verify-input-icon">
                        <i className="bi bi-upc-scan"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control verify-input"
                        placeholder="e.g. MC-BIRTH-2026-00001 or BIRTH-2026-00001"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      className="btn btn-verify-primary fw-semibold flex-shrink-0"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1"></span>
                          <span className="d-none d-sm-inline">Verifying…</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-shield-check me-1"></i>
                          <span>Verify Record</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="verify-hint mt-2 mb-0">
                    <i className="bi bi-qr-code me-1"></i>
                    You can also scan the QR code printed on your physical or digital certificate to reach this page directly.
                  </p>
                </form>

                {/* ── Application Number Redirect Notice ── */}
                {isAppNumber && (
                  <div className="alert verify-alert-info p-4 rounded-3 text-center border-0 mt-3">
                    <i className="bi bi-info-circle-fill fs-2 d-block mb-2" style={{ color: '#2b6cb0' }}></i>
                    <h6 className="fw-bold text-dark mb-1">This looks like an Application Number</h6>
                    <p className="text-muted small mb-3">
                      <strong>{query.trim()}</strong> is an application tracking number, not a certificate number.<br />
                      Certificate numbers start with <strong>MC-BIRTH-</strong> or <strong>MC-DEATH-</strong>.
                    </p>
                    <p className="small text-muted mb-3">
                      To check the status and progress of this application, use the Track Application page.
                    </p>
                    <Link
                      to={`/track-application?number=${encodeURIComponent(query.trim())}`}
                      className="btn btn-verify-primary px-4 fw-semibold"
                    >
                      <i className="bi bi-clock-history me-2"></i>Track Application
                    </Link>
                  </div>
                )}

                {/* ── Error / Not Found Alert ── */}
                {error && (
                  <div className="alert verify-alert-danger p-4 rounded-3 text-center border-0 mt-3">
                    <i className="bi bi-x-octagon-fill fs-2 d-block mb-2 text-danger"></i>
                    <h6 className="fw-bold text-danger mb-1">Verification Failed — Record Not Found</h6>
                    <p className="small text-muted mb-0">{error}</p>
                  </div>
                )}

                {/* ── Verified Result Panel ── */}
                {result && (
                  <div className="verify-result-panel rounded-3 border border-success overflow-hidden mt-3">

                    {/* Success Header */}
                    <div className="verify-result-header d-flex align-items-center gap-3 px-4 py-3">
                      <div className="verify-check-circle">
                        <i className="bi bi-check-lg"></i>
                      </div>
                      <div>
                        <span className="badge bg-success mb-1">
                          <i className="bi bi-shield-fill-check me-1"></i>GENUINE &amp; VALID
                        </span>
                        <h6 className="fw-bold text-white mb-0">Official Municipal Record Verified</h6>
                      </div>
                    </div>

                    {/* Data Table */}
                    <div className="px-4 py-3">
                      <div className="table-responsive bg-white rounded-3 border mb-3">
                        <table className="table table-borderless mb-0 verify-table">
                          <tbody>
                            <tr>
                              <td className="text-muted small fw-semibold verify-td-label">Certificate Number</td>
                              <td className="fw-bold text-primary">{result.certificateNumber || 'N/A'}</td>
                            </tr>
                            <tr>
                              <td className="text-muted small fw-semibold verify-td-label">Application Number</td>
                              <td className="fw-bold">{result.applicationNumber}</td>
                            </tr>
                            <tr>
                              <td className="text-muted small fw-semibold verify-td-label">Certificate Type</td>
                              <td>
                                <span className={`badge ${result.certificateType === 'BIRTH' ? 'bg-primary' : 'bg-danger'}`}>
                                  {result.certificateType} CERTIFICATE
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="text-muted small fw-semibold verify-td-label">Beneficiary / Holder Name</td>
                              <td className="fw-bold">{result.beneficiaryName || 'Registered Citizen'}</td>
                            </tr>
                            <tr>
                              <td className="text-muted small fw-semibold verify-td-label">Date of Issue</td>
                              <td>{result.issuedDate ? new Date(result.issuedDate).toLocaleDateString('en-GB') : 'N/A'}</td>
                            </tr>
                            <tr>
                              <td className="text-muted small fw-semibold verify-td-label">Issuing Authority</td>
                              <td>{result.issuingAuthority}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Cryptographic Integrity Section */}
                      <div className="card border-0 shadow-sm bg-white rounded-3 p-3 mb-3">
                        <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-shield-lock-fill text-primary me-2 fs-5"></i>
                            <h6 className="fw-bold text-dark mb-0">Cryptographic Integrity Status</h6>
                          </div>
                          {result.integrity?.status === 'VERIFIED' ? (
                            <span className="badge bg-success px-3 py-2">
                              <i className="bi bi-shield-fill-check me-1"></i> Certificate Authenticity Verified
                            </span>
                          ) : result.integrity?.status === 'INTEGRITY MISMATCH' || result.integrity?.status === 'INTEGRITY CHECK FAILED' ? (
                            <span className="badge bg-danger px-3 py-2">
                              <i className="bi bi-exclamation-triangle-fill me-1"></i> Certificate Integrity Check Failed
                            </span>
                          ) : (
                            <span className="badge bg-secondary px-3 py-2">
                              <i className="bi bi-info-circle-fill me-1"></i> Integrity Verification Unavailable
                            </span>
                          )}
                        </div>

                        {result.integrity?.status === 'VERIFIED' && (
                          <div className="p-3 bg-light rounded border border-success border-opacity-25 small">
                            <div className="d-flex align-items-center mb-2 text-success fw-bold">
                              <i className="bi bi-check-circle-fill me-2 fs-5"></i>
                              <span>Certificate data matches the officially issued municipal record.</span>
                            </div>
                            <div className="row g-2 align-items-center mb-0">
                              <div className="col-sm-4 text-muted fw-semibold">Algorithm</div>
                              <div className="col-sm-8">
                                <span className="badge bg-dark">{result.integrity.algorithm || 'SHA-256'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {(result.integrity?.status === 'INTEGRITY MISMATCH' || result.integrity?.status === 'INTEGRITY CHECK FAILED') && (
                          <div className="alert alert-danger mb-0 small">
                            <div className="d-flex align-items-start">
                              <i className="bi bi-exclamation-octagon-fill text-danger fs-5 me-2 mt-1"></i>
                              <div>
                                <strong className="d-block mb-1">Certificate Integrity Check Failed</strong>
                                <span>The certificate data does not match the officially issued municipal record.</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {(result.integrity?.status === 'LEGACY / HASH NOT AVAILABLE' || result.integrity?.status === 'NOT AVAILABLE' || !result.integrity?.status) && (
                          <div className="alert alert-secondary mb-0 small text-muted">
                            <div className="d-flex align-items-start">
                              <i className="bi bi-info-circle-fill fs-5 me-2 mt-1"></i>
                              <div>
                                <strong className="text-dark d-block mb-1">Integrity Verification Unavailable</strong>
                                <span>The certificate was issued before cryptographic integrity verification was enabled.</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-center">
                        <span className="small text-muted">
                          <i className="bi bi-lock-fill text-success me-1"></i>
                          Securely authenticated from Municipal Digital Archive Repository.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Back to Homepage ── */}
            <div className="text-center">
              <Link to="/" className="btn btn-outline-secondary btn-sm px-4">
                <i className="bi bi-arrow-left me-1"></i> Back to Homepage
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyCertificate;
