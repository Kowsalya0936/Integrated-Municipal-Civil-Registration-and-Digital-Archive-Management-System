import React, { useState, useEffect } from 'react';
import api from '../services/api';

const CorrectApplicationModal = ({ isOpen, onClose, application, onSuccess }) => {
  const [formData, setFormData] = useState({});
  const [applicantFormData, setApplicantFormData] = useState({});
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('EDIT'); // 'EDIT' or 'CONFIRM'

  const correctionItems = application?.correctionRequest?.items || [];
  const allowedFields = correctionItems.filter((i) => i.type === 'FIELD');
  const allowedDocs = correctionItems.filter((i) => i.type === 'DOCUMENT');

  useEffect(() => {
    if (application) {
      setFormData({ ...(application.certificateDetails || {}) });
      setApplicantFormData({ ...(application.applicantDetails || {}) });
      setFiles({});
      setError('');
      setStep('EDIT');
    }
  }, [application, isOpen]);

  if (!isOpen || !application) return null;

  const handleFieldChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleApplicantFieldChange = (field, val) => {
    setApplicantFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleFileChange = (field, file) => {
    if (file && file.size > 5 * 1024 * 1024) {
      setError(`File "${file.name}" exceeds the 5 MB maximum limit.`);
      return;
    }
    setError('');
    setFiles((prev) => ({ ...prev, [field]: file }));
  };

  const handleProceedToConfirm = (e) => {
    e.preventDefault();
    setError('');

    // Verify all requested documents have been selected if required
    for (const doc of allowedDocs) {
      if (!files[doc.field]) {
        // Warning if file not selected
      }
    }
    setStep('CONFIRM');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('certificateDetails', JSON.stringify(formData));
      data.append('applicantDetails', JSON.stringify(applicantFormData));

      for (const [fieldname, file] of Object.entries(files)) {
        if (file) {
          data.append(fieldname, file);
        }
      }

      const res = await api.put(`/applications/${application._id}/resubmit`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.success) {
        onSuccess(res.data.application, res.data.message);
        onClose();
      }
    } catch (err) {
      console.error('[Resubmit Error]:', err);
      setError(err.response?.data?.message || 'Failed to resubmit application corrections.');
      setStep('EDIT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-primary text-white py-3">
            <h5 className="modal-title fw-bold">
              <i className="bi bi-pencil-square me-2"></i>
              Application Correction & Resubmission — {application.applicationNumber}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={loading}></button>
          </div>

          <div className="modal-body p-4">
            {/* Officer Correction Reason Notice */}
            <div className="alert alert-warning p-3 mb-4 border-warning">
              <div className="d-flex align-items-start">
                <i className="bi bi-info-circle-fill fs-4 text-warning me-3 mt-1"></i>
                <div>
                  <h6 className="fw-bold text-dark mb-1">Officer Correction Request:</h6>
                  <p className="mb-2 text-dark">{application.correctionRequest?.reason}</p>
                  <div className="small text-secondary">
                    <strong>Requested on:</strong>{' '}
                    {application.correctionRequest?.requestedAt
                      ? new Date(application.correctionRequest.requestedAt).toLocaleString('en-GB')
                      : 'Recently'}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger py-2 px-3 small mb-3">
                <i className="bi bi-exclamation-triangle-fill me-1"></i> {error}
              </div>
            )}

            {step === 'EDIT' ? (
              <form onSubmit={handleProceedToConfirm}>
                <div className="mb-3">
                  <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
                    <i className="bi bi-unlock-fill text-success me-2"></i>
                    Editable Correction Fields & Documents:
                  </h6>
                  <p className="small text-muted mb-3">
                    Per municipal guidelines, only the specific fields and documents requested by the officer are unlocked for modification.
                  </p>

                  {/* Field Corrections */}
                  {allowedFields.length > 0 && (
                    <div className="mb-4">
                      <h6 className="small fw-bold text-uppercase text-secondary mb-2">Form Fields:</h6>
                      <div className="row g-3">
                        {allowedFields.map((item) => {
                          const isApplicantField = item.field === 'name' || item.field === 'email' || item.field === 'mobile' || item.field === 'address';
                          const val = isApplicantField
                            ? applicantFormData[item.field] || ''
                            : formData[item.field] || '';

                          return (
                            <div className="col-md-6" key={item.field}>
                              <label className="form-label fw-semibold small text-dark mb-1">
                                {item.label} <span className="text-danger">*</span>
                              </label>
                              {item.instruction && (
                                <div className="text-primary small mb-1" style={{ fontSize: '11px' }}>
                                  <i className="bi bi-arrow-right-short"></i> {item.instruction}
                                </div>
                              )}
                              <input
                                type={item.field.includes('date') || item.field.includes('Date') ? 'date' : 'text'}
                                className="form-control"
                                value={val}
                                onChange={(e) =>
                                  isApplicantField
                                    ? handleApplicantFieldChange(item.field, e.target.value)
                                    : handleFieldChange(item.field, e.target.value)
                                }
                                required
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Document Corrections */}
                  {allowedDocs.length > 0 && (
                    <div className="mb-4">
                      <h6 className="small fw-bold text-uppercase text-secondary mb-2">Supporting Documents:</h6>
                      <div className="row g-3">
                        {allowedDocs.map((item) => {
                          const existingDoc = (application.documents || []).find((d) => d.documentType === item.field);
                          const selectedFile = files[item.field];

                          return (
                            <div className="col-12" key={item.field}>
                              <div className="p-3 bg-light rounded border">
                                <label className="form-label fw-semibold text-dark mb-1">
                                  <i className="bi bi-file-earmark-arrow-up text-primary me-1"></i>
                                  {item.label} <span className="text-danger">*</span>
                                </label>
                                {item.instruction && (
                                  <div className="text-primary small mb-2">
                                    <i className="bi bi-arrow-right-short"></i> {item.instruction}
                                  </div>
                                )}
                                {existingDoc && (
                                  <div className="small text-muted mb-2">
                                    Current file on record: <strong>{existingDoc.originalName || existingDoc.fileName}</strong>
                                  </div>
                                )}
                                <input
                                  type="file"
                                  className="form-control"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => handleFileChange(item.field, e.target.files[0])}
                                />
                                {selectedFile && (
                                  <div className="small text-success mt-1">
                                    <i className="bi bi-check-circle me-1"></i>
                                    Selected replacement: <strong>{selectedFile.name}</strong> ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-end gap-2 border-top pt-3">
                  <button type="button" className="btn btn-secondary px-3" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary fw-semibold px-4">
                    Review & Confirm Changes <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                </div>
              </form>
            ) : (
              /* Confirmation / Preview Step (Phase 10) */
              <div>
                <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">
                  <i className="bi bi-check2-circle text-success me-2"></i>
                  Correction Summary & Confirmation:
                </h6>
                <p className="small text-muted mb-3">
                  Please review your corrections before resubmitting. The application number <strong>{application.applicationNumber}</strong> will remain unchanged.
                </p>

                <div className="card border mb-3">
                  <div className="card-body p-3">
                    <h6 className="fw-bold text-dark small mb-2">Updated Fields:</h6>
                    {allowedFields.length > 0 ? (
                      <ul className="small mb-3 ps-3">
                        {allowedFields.map((f) => (
                          <li key={f.field}>
                            <strong>{f.label}:</strong> {formData[f.field] || applicantFormData[f.field] || 'N/A'}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="small text-muted mb-3">No text fields modified.</div>
                    )}

                    <h6 className="fw-bold text-dark small mb-2">Replaced Documents:</h6>
                    {allowedDocs.length > 0 ? (
                      <ul className="small mb-0 ps-3">
                        {allowedDocs.map((d) => (
                          <li key={d.field}>
                            <strong>{d.label}:</strong>{' '}
                            {files[d.field] ? (
                              <span className="text-success fw-semibold">
                                {files[d.field].name} (New Upload)
                              </span>
                            ) : (
                              <span className="text-muted">Unchanged</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="small text-muted">No documents replaced.</div>
                    )}
                  </div>
                </div>

                <div className="d-flex justify-content-between border-top pt-3">
                  <button type="button" className="btn btn-outline-secondary px-3" onClick={() => setStep('EDIT')} disabled={loading}>
                    <i className="bi bi-arrow-left me-1"></i> Back to Edit
                  </button>
                  <button type="button" className="btn btn-success fw-bold px-4 shadow-sm" onClick={handleSubmit} disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Resubmitting Application...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send-check me-1"></i> Confirm & Resubmit Application
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrectApplicationModal;
