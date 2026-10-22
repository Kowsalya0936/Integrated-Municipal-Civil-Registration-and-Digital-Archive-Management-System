import React, { useState } from 'react';

const RejectionModal = ({ isOpen, onClose, onConfirm, applicationNumber, loading }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific reason for rejection.');
      return;
    }
    setError('');
    onConfirm(reason.trim());
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title d-flex align-items-center">
              <i className="bi bi-x-octagon-fill me-2"></i> Reject Application
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              disabled={loading}
              aria-label="Close"
            ></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              <p className="text-muted mb-3">
                You are about to reject application <strong className="text-dark">{applicationNumber}</strong>. This rejection reason will be permanently recorded and displayed to the citizen.
              </p>

              {error && <div className="alert alert-danger py-2 small">{error}</div>}

              <div className="mb-3">
                <label className="form-label fw-bold text-dark">
                  Reason for Rejection <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="e.g. Hospital discharge summary is missing doctor signature or ID proof is illegible."
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (error) setError('');
                  }}
                  required
                ></textarea>
                <div className="form-text small">Be specific to help the applicant rectify discrepancies.</div>
              </div>
            </div>

            <div className="modal-footer bg-light">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-danger d-flex align-items-center" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span> Rejecting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-x-circle me-1"></i> Confirm Rejection
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;
