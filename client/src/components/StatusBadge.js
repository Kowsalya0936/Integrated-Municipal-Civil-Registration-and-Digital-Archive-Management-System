import React from 'react';

const StatusBadge = ({ status }) => {
  const normalized = (status || '').toUpperCase();

  switch (normalized) {
    case 'PENDING':
      return (
        <span className="badge bg-warning text-dark px-2 py-1">
          <i className="bi bi-clock-history me-1"></i> Pending Review
        </span>
      );
    case 'UNDER_REVIEW':
      return (
        <span className="badge bg-info text-dark px-2 py-1">
          <i className="bi bi-search me-1"></i> Under Verification
        </span>
      );
    case 'APPROVED':
      return (
        <span className="badge bg-success px-2 py-1">
          <i className="bi bi-check-circle-fill me-1"></i> Approved
        </span>
      );
    case 'REJECTED':
      return (
        <span className="badge bg-danger px-2 py-1">
          <i className="bi bi-x-circle-fill me-1"></i> Rejected
        </span>
      );
    case 'CORRECTION_REQUIRED':
      return (
        <span className="badge bg-warning text-dark px-2 py-1" style={{ backgroundColor: '#feebc8', color: '#7b341e' }}>
          <i className="bi bi-pencil-square me-1"></i> Correction Required
        </span>
      );
    case 'RESUBMITTED':
      return (
        <span className="badge bg-info text-dark px-2 py-1" style={{ backgroundColor: '#bee3f8', color: '#2b6cb0' }}>
          <i className="bi bi-arrow-repeat me-1"></i> Resubmitted
        </span>
      );
    default:
      return <span className="badge bg-secondary px-2 py-1">{status || 'Unknown'}</span>;
  }
};

export default StatusBadge;
