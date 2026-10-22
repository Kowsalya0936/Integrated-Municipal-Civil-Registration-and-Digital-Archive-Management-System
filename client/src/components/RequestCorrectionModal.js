import React, { useState } from 'react';

const RequestCorrectionModal = ({ isOpen, onClose, onConfirm, application, loading }) => {
  const [reason, setReason] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [validationError, setValidationError] = useState('');

  if (!isOpen || !application) return null;

  const isBirth = application.certificateType === 'BIRTH';

  // Standard predefined fields & documents for selection
  const standardOptions = isBirth
    ? [
        { type: 'FIELD', field: 'childName', label: "Child's Full Name" },
        { type: 'FIELD', field: 'dateOfBirth', label: 'Date of Birth' },
        { type: 'FIELD', field: 'gender', label: 'Gender' },
        { type: 'FIELD', field: 'fatherName', label: "Father's Name" },
        { type: 'FIELD', field: 'motherName', label: "Mother's Name" },
        { type: 'FIELD', field: 'hospitalName', label: 'Hospital / Place of Birth' },
        { type: 'FIELD', field: 'address', label: 'Permanent Address' },
        { type: 'DOCUMENT', field: 'hospitalRecord', label: 'Hospital Birth Record' },
        { type: 'DOCUMENT', field: 'parentIdProof', label: 'Parent ID Proof (Aadhaar / Passport)' },
        { type: 'DOCUMENT', field: 'addressProof', label: 'Address Proof Document' },
      ]
    : [
        { type: 'FIELD', field: 'deceasedName', label: "Deceased Person's Name" },
        { type: 'FIELD', field: 'dateOfDeath', label: 'Date of Death' },
        { type: 'FIELD', field: 'gender', label: 'Gender' },
        { type: 'FIELD', field: 'fatherName', label: "Father's / Spouse Name" },
        { type: 'FIELD', field: 'hospitalName', label: 'Hospital / Place of Death' },
        { type: 'FIELD', field: 'causeOfDeath', label: 'Cause of Death' },
        { type: 'FIELD', field: 'address', label: 'Permanent Address' },
        { type: 'DOCUMENT', field: 'deathRecord', label: 'Hospital Death Summary / Medical Certificate' },
        { type: 'DOCUMENT', field: 'informantIdProof', label: 'Informant / Applicant ID Proof' },
        { type: 'DOCUMENT', field: 'addressProof', label: 'Address Proof Document' },
      ];

  const handleToggleItem = (item) => {
    setValidationError('');
    const exists = selectedItems.some((i) => i.field === item.field && i.type === item.type);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => !(i.field === item.field && i.type === item.type)));
    } else {
      setSelectedItems([...selectedItems, { ...item, instruction: '' }]);
    }
  };

  const handleInstructionChange = (field, instruction) => {
    setSelectedItems(
      selectedItems.map((item) => (item.field === field ? { ...item, instruction } : item))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setValidationError('Please provide a mandatory correction reason explaining what needs to be fixed.');
      return;
    }
    if (selectedItems.length === 0) {
      setValidationError('Please select at least one field or document that requires correction.');
      return;
    }
    onConfirm({ reason: reason.trim(), items: selectedItems });
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
          <div className="modal-header bg-warning text-dark py-3">
            <h5 className="modal-title fw-bold">
              <i className="bi bi-pencil-square me-2"></i>
              Request Application Correction — {application.applicationNumber}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={loading}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              <div className="alert alert-warning py-2 px-3 small mb-3">
                <i className="bi bi-info-circle-fill me-1"></i>
                Returning this application for correction preserves the <strong>same application number ({application.applicationNumber})</strong>. The citizen will only be permitted to edit the specific items selected below.
              </div>

              {validationError && (
                <div className="alert alert-danger py-2 px-3 small mb-3">
                  <i className="bi bi-exclamation-triangle-fill me-1"></i> {validationError}
                </div>
              )}

              {/* Correction Reason (Mandatory) */}
              <div className="mb-4">
                <label className="form-label fw-bold text-dark">
                  Correction Reason / Officer Remark <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="e.g. Supporting document is illegible. Please upload a clear scanned copy of hospital birth summary."
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setValidationError('');
                  }}
                  required
                ></textarea>
                <div className="form-text small">
                  This reason will be included in the email notification and displayed on the Citizen Portal.
                </div>
              </div>

              {/* Select Correction Items */}
              <div className="mb-3">
                <label className="form-label fw-bold text-dark d-flex justify-content-between align-items-center">
                  <span>Select Item(s) to Unlock for Citizen Correction <span className="text-danger">*</span></span>
                  <span className="badge bg-secondary">{selectedItems.length} selected</span>
                </label>

                <div className="row g-2 mb-3">
                  {standardOptions.map((opt) => {
                    const isSelected = selectedItems.some((i) => i.field === opt.field && i.type === opt.type);
                    return (
                      <div className="col-md-6" key={opt.field}>
                        <div
                          className={`p-2 rounded border cursor-pointer d-flex align-items-center gap-2 ${
                            isSelected ? 'border-primary bg-primary bg-opacity-10' : 'bg-light'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleToggleItem(opt)}
                        >
                          <input
                            type="checkbox"
                            className="form-check-input mt-0"
                            checked={isSelected}
                            onChange={() => {}}
                          />
                          <div className="small flex-grow-1">
                            <span className="fw-semibold text-dark">{opt.label}</span>
                            <span className={`badge ms-2 ${opt.type === 'DOCUMENT' ? 'bg-danger bg-opacity-75' : 'bg-info text-dark'}`} style={{ fontSize: '10px' }}>
                              {opt.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Specific Instructions for Selected Items */}
                {selectedItems.length > 0 && (
                  <div className="mt-3 p-3 bg-light rounded border">
                    <h6 className="fw-bold text-dark small mb-2">Optional Specific Instructions for Citizen:</h6>
                    {selectedItems.map((item) => (
                      <div className="mb-2" key={item.field}>
                        <label className="form-label small text-secondary mb-1">
                          <strong>{item.label}</strong> ({item.type}):
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="e.g. Ensure name matches Aadhaar card exactly"
                          value={item.instruction || ''}
                          onChange={(e) => handleInstructionChange(item.field, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer bg-light py-3">
              <button type="button" className="btn btn-secondary px-3" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-warning fw-bold px-4 shadow-sm"
                disabled={loading || !reason.trim() || selectedItems.length === 0}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-check me-1"></i> Submit Correction Request
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

export default RequestCorrectionModal;
