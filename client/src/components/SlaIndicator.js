import React from 'react';

const SlaIndicator = ({ deadline, status }) => {
  if (status === 'APPROVED' || status === 'REJECTED') {
    return (
      <span className="text-muted small">
        <i className="bi bi-check-all text-success me-1"></i> Completed
      </span>
    );
  }

  if (!deadline) {
    return <span className="text-muted small">48h SLA</span>;
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate - now;

  if (diffMs < 0) {
    const absDiffMs = Math.abs(diffMs);
    const overdueMinutes = Math.floor(absDiffMs / (1000 * 60));
    const overdueHours = Math.floor(absDiffMs / (1000 * 60 * 60));

    const overdueText =
      overdueHours >= 1
        ? `${overdueHours}h overdue`
        : `${Math.max(1, overdueMinutes)}m overdue`;

    return (
      <span className="badge bg-danger text-white px-2 py-1">
        <i className="bi bi-exclamation-triangle-fill me-1"></i> SLA Breached ({overdueText})
      </span>
    );
  }

  // Active / remaining SLA time
  const minutesLeft = Math.ceil(diffMs / (1000 * 60));
  const hoursLeft = Math.round(diffMs / (1000 * 60 * 60));

  // If under 1 hour remaining (such as during the 2-minute demo SLA), display minutes with warning badge
  if (diffMs < 60 * 60 * 1000) {
    return (
      <span className="badge bg-warning text-dark px-2 py-1">
        <i className="bi bi-hourglass-split me-1"></i> Critical: {Math.max(1, minutesLeft)}m left
      </span>
    );
  }

  if (hoursLeft <= 12) {
    return (
      <span className="badge bg-warning text-dark px-2 py-1">
        <i className="bi bi-hourglass-split me-1"></i> Critical: {hoursLeft}h left
      </span>
    );
  }

  return (
    <span className="badge bg-light text-dark border px-2 py-1">
      <i className="bi bi-clock me-1 text-primary"></i> {hoursLeft}h remaining
    </span>
  );
};

export default SlaIndicator;
