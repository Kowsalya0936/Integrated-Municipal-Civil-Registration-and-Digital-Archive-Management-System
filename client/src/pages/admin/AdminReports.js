import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

// ─── URL Search Params Helper ────────────────────────────────────────────────
const readParams = (search) => {
  const p = new URLSearchParams(search);
  return {
    dateFrom: p.get('dateFrom') || '',
    dateTo: p.get('dateTo') || '',
  };
};

// ─── Custom SVG Donut / Ring Chart Component ─────────────────────────────────
const DonutChart = ({ segments, total, size = 180, strokeWidth = 28 }) => {
  if (!total || total === 0) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-4 text-muted">
        <i className="bi bi-pie-chart fs-1 text-secondary opacity-50 mb-2"></i>
        <span className="small">No data to display</span>
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  return (
    <div className="position-relative d-inline-flex align-items-center justify-content-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e9ecef"
          strokeWidth={strokeWidth}
        />
        {segments
          .filter((s) => s.value > 0)
          .map((seg, idx) => {
            const strokeDasharray = `${(seg.value / total) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedAngle / total) * circumference);
            accumulatedAngle += seg.value;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            );
          })}
      </svg>
      <div className="position-absolute text-center" style={{ pointerEvents: 'none' }}>
        <div className="fs-4 fw-bold text-dark lh-1">{total}</div>
        <div className="text-muted" style={{ fontSize: '0.7rem' }}>TOTAL</div>
      </div>
    </div>
  );
};

// ─── Custom SVG Monthly Trend Bar Chart Component ─────────────────────────────
const MonthlyTrendBarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-bar-chart fs-1 text-secondary opacity-50 d-block mb-2"></i>
        <h6 className="fw-semibold mb-1">No Application Submissions Recorded</h6>
        <p className="small mb-0">No registration activity found for the selected date range.</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const chartHeight = 200;
  const barWidth = 36;
  const gap = 24;
  const totalSvgWidth = Math.max(data.length * (barWidth + gap) + 40, 360);

  return (
    <div className="table-responsive">
      <div style={{ minWidth: `${totalSvgWidth}px` }} className="py-2">
        <svg
          width="100%"
          height={chartHeight + 50}
          viewBox={`0 0 ${totalSvgWidth} ${chartHeight + 50}`}
          className="overflow-visible"
        >
          {/* Background grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartHeight - ratio * (chartHeight - 30);
            const val = Math.round(ratio * maxVal);
            return (
              <g key={i}>
                <line
                  x1={30}
                  y1={y}
                  x2={totalSvgWidth - 10}
                  y2={y}
                  stroke="#e9ecef"
                  strokeDasharray="3 3"
                />
                <text x={24} y={y + 4} fontSize="10" fill="#6c757d" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, idx) => {
            const x = 40 + idx * (barWidth + gap);
            const barH = ((item.total / maxVal) * (chartHeight - 30));
            const y = chartHeight - barH;

            const birthH = item.total > 0 ? (item.birthCount / item.total) * barH : 0;
            const deathH = barH - birthH;

            return (
              <g key={idx} className="chart-bar-group">
                {/* Death segment (top) */}
                {item.deathCount > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={deathH}
                    fill="#dc3545"
                    rx={item.birthCount === 0 ? 4 : 0}
                  />
                )}
                {/* Birth segment (bottom) */}
                {item.birthCount > 0 && (
                  <rect
                    x={x}
                    y={y + deathH}
                    width={barWidth}
                    height={birthH}
                    fill="#0d6efd"
                    rx={item.deathCount === 0 ? 4 : 0}
                  />
                )}

                {/* Total label on top of bar */}
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  fontSize="11"
                  fontWeight="bold"
                  fill="#212529"
                  textAnchor="middle"
                >
                  {item.total}
                </text>

                {/* Month label under x-axis */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 18}
                  fontSize="10.5"
                  fill="#495057"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Chart Legend */}
        <div className="d-flex justify-content-center gap-4 mt-2 pt-2 border-top small">
          <div className="d-flex align-items-center">
            <span
              className="d-inline-block rounded me-2"
              style={{ width: '12px', height: '12px', backgroundColor: '#0d6efd' }}
            ></span>
            <span className="text-dark fw-medium">Birth Registrations</span>
          </div>
          <div className="d-flex align-items-center">
            <span
              className="d-inline-block rounded me-2"
              style={{ width: '12px', height: '12px', backgroundColor: '#dc3545' }}
            ></span>
            <span className="text-dark fw-medium">Death Registrations</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main AdminReports Component ──────────────────────────────────────────────
const AdminReports = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialParams = readParams(location.search);

  // Form input state
  const [dateFrom, setDateFrom] = useState(initialParams.dateFrom);
  const [dateTo, setDateTo] = useState(initialParams.dateTo);

  // Committed filter state
  const [committedFilters, setCommittedFilters] = useState(initialParams);

  // Data state
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Fetch reports from backend ─────────────────────────────────────────────
  const fetchReports = useCallback(async (filters) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const res = await api.get('/admin/reports', { params });
      if (res.data && res.data.success && res.data.data) {
        setReportsData(res.data.data);
      } else {
        setError('Unexpected response structure received from server.');
      }
    } catch (err) {
      console.error('[Reports Fetch Error]:', err);
      setError(
        err.response?.data?.message ||
        'Unable to load municipal reports and analytics from database.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ── On mount & URL change: fetch ───────────────────────────────────────────
  useEffect(() => {
    const current = readParams(location.search);
    setDateFrom(current.dateFrom);
    setDateTo(current.dateTo);
    setCommittedFilters(current);
    fetchReports(current);
  }, [location.search, fetchReports]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleGenerateReport = (e) => {
    e.preventDefault();
    const newFilters = { dateFrom, dateTo };
    setCommittedFilters(newFilters);

    const p = new URLSearchParams();
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);

    const qs = p.toString();
    navigate(`/admin/reports${qs ? '?' + qs : ''}`, { replace: true });
  };

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setCommittedFilters({ dateFrom: '', dateTo: '' });
    navigate('/admin/reports', { replace: true });
  };

  // Safe destructuring of data
  const summary = reportsData?.summary || {
    totalApplications: 0,
    pendingCount: 0,
    underReviewCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  };

  const registrationTypes = reportsData?.registrationTypes || {
    birthCount: 0,
    deathCount: 0,
  };

  const slaPerformance = reportsData?.slaPerformance || {
    withinSlaCount: 0,
    overdueCount: 0,
    escalatedCount: 0,
  };

  const processingPerformance = reportsData?.processingPerformance || {
    totalCompletedApplications: 0,
    completedWithTimestamps: 0,
    avgProcessingHours: 0,
    avgProcessingDays: 0,
    hasData: false,
  };

  const monthlyTrend = reportsData?.monthlyTrend || [];
  const statusDistribution = reportsData?.statusDistribution || [];

  const totalActivePending = summary.pendingCount + summary.underReviewCount;
  const isFilterActive = Boolean(committedFilters.dateFrom || committedFilters.dateTo);

  return (
    <div className="container-fluid px-lg-5 py-4">
      {/* Navigation Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/admin/dashboard">Dashboard</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Reports & Analytics
          </li>
        </ol>
      </nav>

      {/* Header Banner */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-graph-up-arrow text-primary me-2"></i>
            Municipal Reports & Analytics
          </h3>
          <p className="text-muted small mb-0">
            Factual civil registration analytics, SLA compliance tracking, and submission volume reports
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {isFilterActive && (
            <span className="badge bg-warning text-dark px-2 py-1">
              <i className="bi bi-funnel-fill me-1"></i>
              Filtered: {committedFilters.dateFrom || 'Start'} &rarr; {committedFilters.dateTo || 'Present'}
            </span>
          )}
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => fetchReports(committedFilters)}
            disabled={loading}
            title="Refresh analytics data from MongoDB"
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger py-2 small mb-4 d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-octagon-fill"></i>
          <span>{error}</span>
        </div>
      )}

      {/* ── Filter Bar Card ────────────────────────────────────────────────── */}
      <div className="card border-0 shadow-sm mb-4 bg-white">
        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center gap-2">
          <i className="bi bi-calendar-range text-primary"></i>
          <h6 className="fw-bold mb-0 text-dark">Report Date Range Filter (By Submission Date)</h6>
        </div>
        <div className="card-body p-3 p-md-4">
          <form onSubmit={handleGenerateReport} className="row g-3 align-items-end">
            <div className="col-md-4 col-sm-6">
              <label className="form-label small fw-semibold text-muted">Date From (Submitted)</label>
              <input
                type="date"
                className="form-control"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="col-md-4 col-sm-6">
              <label className="form-label small fw-semibold text-muted">Date To (Submitted)</label>
              <input
                type="date"
                className="form-control"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="col-md-4 col-12 d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary px-4 fw-semibold flex-grow-1"
                disabled={loading}
              >
                <i className="bi bi-file-earmark-bar-graph me-1"></i>
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
              {isFilterActive && (
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  onClick={handleClearFilters}
                  disabled={loading}
                  title="Reset to all records"
                >
                  <i className="bi bi-x-circle me-1"></i> Clear
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <div className="card border-0 shadow-sm bg-white p-5 text-center my-4">
          <div className="spinner-border text-primary mx-auto mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h6 className="fw-semibold text-dark">Aggregating Municipal Analytics...</h6>
          <p className="text-muted small mb-0">Querying real-time MongoDB statistics and SLA metrics</p>
        </div>
      ) : (
        <>
          {/* ── 1. SUMMARY METRICS ─────────────────────────────────────────── */}
          <div className="mb-4">
            <h6 className="fw-bold text-uppercase text-muted small mb-3">
              <i className="bi bi-card-checklist me-1 text-primary"></i> Application Volume Summary
            </h6>
            <div className="row g-3">
              {/* Total Applications */}
              <div className="col-xl col-md-4 col-sm-6">
                <div className="card border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-primary">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="text-muted small fw-bold text-uppercase">Total Applications</div>
                      <div className="fs-2 fw-bold text-dark">{summary.totalApplications}</div>
                      <div className="small text-muted">Civil registrations</div>
                    </div>
                    <div className="bg-primary bg-opacity-10 text-primary rounded p-3">
                      <i className="bi bi-folder-fill fs-3"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Review */}
              <div className="col-xl col-md-4 col-sm-6">
                <div className="card border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-warning">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="text-muted small fw-bold text-uppercase">Pending Review</div>
                      <div className="fs-2 fw-bold text-warning">{summary.pendingCount}</div>
                      <div className="small text-muted">Awaiting initial check</div>
                    </div>
                    <div className="bg-warning bg-opacity-10 text-warning rounded p-3">
                      <i className="bi bi-clock-history fs-3"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Under Review */}
              <div className="col-xl col-md-4 col-sm-6">
                <div className="card border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-info">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="text-muted small fw-bold text-uppercase">Under Review</div>
                      <div className="fs-2 fw-bold text-info">{summary.underReviewCount}</div>
                      <div className="small text-muted">Active verification</div>
                    </div>
                    <div className="bg-info bg-opacity-10 text-info rounded p-3">
                      <i className="bi bi-search fs-3"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approved */}
              <div className="col-xl col-md-4 col-sm-6">
                <div className="card border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-success">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="text-muted small fw-bold text-uppercase">Approved</div>
                      <div className="fs-2 fw-bold text-success">{summary.approvedCount}</div>
                      <div className="small text-muted">Certificates issued</div>
                    </div>
                    <div className="bg-success bg-opacity-10 text-success rounded p-3">
                      <i className="bi bi-patch-check-fill fs-3"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rejected */}
              <div className="col-xl col-md-4 col-sm-6">
                <div className="card border-0 shadow-sm p-3 bg-white h-100 border-start border-4 border-danger">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="text-muted small fw-bold text-uppercase">Rejected</div>
                      <div className="fs-2 fw-bold text-danger">{summary.rejectedCount}</div>
                      <div className="small text-muted">Returned / rejected</div>
                    </div>
                    <div className="bg-danger bg-opacity-10 text-danger rounded p-3">
                      <i className="bi bi-x-circle-fill fs-3"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. REGISTRATION TYPE & SLA COMPLIANCE ──────────────────────── */}
          <div className="row g-4 mb-4">
            {/* Registration Type Breakdown */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm h-100 bg-white">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <h6 className="card-title mb-0 fw-bold text-dark">
                    <i className="bi bi-pie-chart text-primary me-2"></i> Registration Type Breakdown
                  </h6>
                  <span className="badge bg-light text-dark border">
                    {summary.totalApplications} Total
                  </span>
                </div>
                <div className="card-body p-4">
                  <div className="row align-items-center">
                    <div className="col-sm-6 text-center mb-3 mb-sm-0">
                      <DonutChart
                        segments={[
                          { value: registrationTypes.birthCount, color: '#0d6efd', label: 'Birth' },
                          { value: registrationTypes.deathCount, color: '#dc3545', label: 'Death' },
                        ]}
                        total={summary.totalApplications}
                        size={170}
                        strokeWidth={26}
                      />
                    </div>
                    <div className="col-sm-6">
                      {/* Birth Card */}
                      <div className="p-3 mb-2 rounded bg-primary bg-opacity-10 border border-primary border-opacity-25">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="badge bg-primary me-2">BIRTH</span>
                            <span className="fw-bold text-dark fs-5">{registrationTypes.birthCount}</span>
                          </div>
                          <span className="small text-muted fw-semibold">
                            {summary.totalApplications > 0
                              ? Math.round((registrationTypes.birthCount / summary.totalApplications) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                      </div>

                      {/* Death Card */}
                      <div className="p-3 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="badge bg-danger me-2">DEATH</span>
                            <span className="fw-bold text-dark fs-5">{registrationTypes.deathCount}</span>
                          </div>
                          <span className="small text-muted fw-semibold">
                            {summary.totalApplications > 0
                              ? Math.round((registrationTypes.deathCount / summary.totalApplications) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SLA Performance & Escalation */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm h-100 bg-white">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <h6 className="card-title mb-0 fw-bold text-dark">
                    <i className="bi bi-clock-history text-warning me-2"></i> SLA Performance & Escalation
                  </h6>
                  <span className="badge bg-light text-dark border">
                    {totalActivePending} Active Pending
                  </span>
                </div>
                <div className="card-body p-4">
                  <div className="row g-3">
                    {/* Within SLA */}
                    <div className="col-sm-4">
                      <div className="p-3 rounded bg-light border text-center h-100">
                        <div className="text-muted small fw-semibold mb-1">Within SLA</div>
                        <div className="fs-3 fw-bold text-success">{slaPerformance.withinSlaCount}</div>
                        <div className="small text-muted" style={{ fontSize: '0.72rem' }}>
                          {totalActivePending > 0
                            ? Math.round((slaPerformance.withinSlaCount / totalActivePending) * 100)
                            : 0}
                          % of active
                        </div>
                      </div>
                    </div>

                    {/* SLA Overdue */}
                    <div className="col-sm-4">
                      <div className="p-3 rounded bg-light border text-center h-100">
                        <div className="text-muted small fw-semibold mb-1">SLA Overdue</div>
                        <div className="fs-3 fw-bold text-warning">{slaPerformance.overdueCount}</div>
                        <div className="small text-muted" style={{ fontSize: '0.72rem' }}>
                          {totalActivePending > 0
                            ? Math.round((slaPerformance.overdueCount / totalActivePending) * 100)
                            : 0}
                          % of active
                        </div>
                      </div>
                    </div>

                    {/* Escalated */}
                    <div className="col-sm-4">
                      <div className="p-3 rounded bg-danger bg-opacity-10 border border-danger border-opacity-25 text-center h-100">
                        <div className="text-danger small fw-semibold mb-1">Escalated</div>
                        <div className="fs-3 fw-bold text-danger">{slaPerformance.escalatedCount}</div>
                        <div className="text-danger" style={{ fontSize: '0.72rem' }}>
                          Priority Action
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar visual for active applications */}
                  <div className="mt-4">
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Active SLA Compliance</span>
                      <span>
                        {totalActivePending > 0
                          ? `${Math.round((slaPerformance.withinSlaCount / totalActivePending) * 100)}% on track`
                          : 'No active applications'}
                      </span>
                    </div>
                    <div className="progress" style={{ height: '10px' }}>
                      <div
                        className="progress-bar bg-success"
                        role="progressbar"
                        style={{
                          width: `${
                            totalActivePending > 0
                              ? (slaPerformance.withinSlaCount / totalActivePending) * 100
                              : 0
                          }%`,
                        }}
                        title={`Within SLA: ${slaPerformance.withinSlaCount}`}
                      ></div>
                      <div
                        className="progress-bar bg-warning"
                        role="progressbar"
                        style={{
                          width: `${
                            totalActivePending > 0
                              ? (slaPerformance.overdueCount / totalActivePending) * 100
                              : 0
                          }%`,
                        }}
                        title={`SLA Overdue: ${slaPerformance.overdueCount}`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. MONTHLY SUBMISSION TREND ────────────────────────────────── */}
          <div className="card border-0 shadow-sm mb-4 bg-white">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="card-title mb-0 fw-bold text-dark">
                <i className="bi bi-bar-chart-line-fill text-primary me-2"></i> Monthly Application Submission Trend
              </h6>
              <span className="badge bg-secondary">{monthlyTrend.length} Periods</span>
            </div>
            <div className="card-body p-4">
              <MonthlyTrendBarChart data={monthlyTrend} />
            </div>
          </div>

          {/* ── 4. STATUS DISTRIBUTION & PROCESSING PERFORMANCE ───────────── */}
          <div className="row g-4 mb-4">
            {/* Status Distribution */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm h-100 bg-white">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <h6 className="card-title mb-0 fw-bold text-dark">
                    <i className="bi bi-segmented-nav text-primary me-2"></i> Status Distribution
                  </h6>
                  <span className="badge bg-light text-dark border">
                    {summary.totalApplications} Total
                  </span>
                </div>
                <div className="card-body p-4">
                  <div className="row align-items-center">
                    <div className="col-sm-5 text-center mb-3 mb-sm-0">
                      <DonutChart
                        segments={statusDistribution.map((s) => ({
                          value: s.count,
                          color: s.color,
                          label: s.label,
                        }))}
                        total={summary.totalApplications}
                        size={170}
                        strokeWidth={26}
                      />
                    </div>
                    <div className="col-sm-7">
                      <div className="table-responsive">
                        <table className="table table-sm table-borderless align-middle mb-0">
                          <tbody>
                            {statusDistribution.map((s, idx) => {
                              const pct =
                                summary.totalApplications > 0
                                  ? Math.round((s.count / summary.totalApplications) * 100)
                                  : 0;
                              return (
                                <tr key={idx}>
                                  <td style={{ width: '12px' }}>
                                    <span
                                      className="d-inline-block rounded-circle"
                                      style={{ width: '10px', height: '10px', backgroundColor: s.color }}
                                    ></span>
                                  </td>
                                  <td className="small fw-semibold text-dark">{s.label}</td>
                                  <td className="text-end fw-bold">{s.count}</td>
                                  <td className="text-end text-muted small" style={{ width: '45px' }}>
                                    {pct}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Processing Performance */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm h-100 bg-white">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <h6 className="card-title mb-0 fw-bold text-dark">
                    <i className="bi bi-speedometer2 text-success me-2"></i> Processing Performance
                  </h6>
                  <span className="badge bg-success">Completed Metrics</span>
                </div>
                <div className="card-body p-4">
                  <div className="row g-3">
                    <div className="col-sm-6">
                      <div className="p-3 rounded bg-light border text-center h-100">
                        <div className="text-muted small fw-semibold mb-1">Average Processing Time</div>
                        <div className="fs-3 fw-bold text-primary">
                          {processingPerformance.avgProcessingHours} <span className="fs-6 text-muted">hours</span>
                        </div>
                        <div className="small text-muted">
                          (~{processingPerformance.avgProcessingDays} days from submission)
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-6">
                      <div className="p-3 rounded bg-light border text-center h-100">
                        <div className="text-muted small fw-semibold mb-1">Completed Applications</div>
                        <div className="fs-3 fw-bold text-success">
                          {processingPerformance.totalCompletedApplications}
                        </div>
                        <div className="small text-muted">Approved + Rejected</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-light rounded border-start border-3 border-info small text-muted">
                    <i className="bi bi-info-circle text-info me-1"></i>
                    {processingPerformance.hasData ? (
                      <span>
                        Calculated from {processingPerformance.completedWithTimestamps} applications with recorded review timestamps.
                      </span>
                    ) : (
                      <span>
                        Processing time is calculated upon officer review completion (Approved / Rejected).
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminReports;
