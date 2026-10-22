'use strict';

const defaultHolidays = require('../config/governmentHolidays');

/**
 * Format a Date object to 'YYYY-MM-DD' calendar date in local timezone
 * (Prevents UTC day-shift errors across timezone offsets)
 *
 * @param {Date|string|number} date
 * @returns {string} 'YYYY-MM-DD'
 */
const formatLocalDateString = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if a given date is a configured Government Holiday
 *
 * @param {Date|string|number} date
 * @param {Object} [holidays=defaultHolidays]
 * @returns {boolean}
 */
const isGovernmentHoliday = (date, holidays = defaultHolidays) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  const dateStr = formatLocalDateString(d);

  const yearHolidays = holidays[year] || [];
  return yearHolidays.includes(dateStr);
};

/**
 * Check if a given date is a Weekend (Saturday or Sunday)
 *
 * @param {Date|string|number} date
 * @returns {boolean}
 */
const isWeekend = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return false;
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

/**
 * Check if a given date is an active Municipal Working Day
 * (Monday–Friday, excluding Saturdays, Sundays, and Government Holidays)
 *
 * @param {Date|string|number} date
 * @param {Object} [holidays=defaultHolidays]
 * @returns {boolean}
 */
const isWorkingDay = (date, holidays = defaultHolidays) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return false;
  if (isWeekend(d)) return false;
  return !isGovernmentHoliday(d, holidays);
};

/**
 * Add working days to a starting date, excluding Weekends and Government Holidays.
 * Preserves the exact time-of-day of the start date.
 *
 * @param {Date|string|number} startDate
 * @param {number} numberOfWorkingDays - Integer number of working days to add (>= 0)
 * @param {Object} [holidays=defaultHolidays]
 * @returns {Date}
 */
const addWorkingDays = (startDate, numberOfWorkingDays, holidays = defaultHolidays) => {
  const result = new Date(startDate instanceof Date ? startDate.getTime() : new Date(startDate).getTime());
  if (isNaN(result.getTime()) || numberOfWorkingDays <= 0) return result;

  let workingDaysRemaining = numberOfWorkingDays;

  while (workingDaysRemaining > 0) {
    // Advance by 1 calendar day (24 hours)
    result.setDate(result.getDate() + 1);

    // If the new day is an active Municipal Working Day (Mon-Fri and not holiday), decrement
    if (isWorkingDay(result, holidays)) {
      workingDaysRemaining--;
    }
  }

  return result;
};

/**
 * Configuration flags for SLA
 * DEMO_SLA_MODE: When true, newly submitted applications receive a 2-minute SLA deadline.
 * When false, the standard production 48 working hours SLA (excluding weekends & holidays) is used.
 */
const DEMO_SLA_MODE = process.env.DEMO_SLA_MODE !== undefined
  ? process.env.DEMO_SLA_MODE === 'true'
  : true; // Default to true for demo testing

const DEMO_SLA_MINUTES = 2;

/**
 * Calculate Holiday-Aware SLA Deadline for an Application.
 *
 * In Demo Mode (DEMO_SLA_MODE = true):
 *   Sets SLA deadline to exactly DEMO_SLA_MINUTES (2 minutes / 120,000 ms)
 *   after submission timestamp without applying working-day/holiday extensions.
 *
 * In Production Mode (DEMO_SLA_MODE = false):
 *   Standard municipal turnaround SLA is 48 working hours (2 working days).
 *   Government holidays encountered within the SLA turnaround window are skipped
 *   and extend the deadline by 24 hours per holiday.
 *
 * @param {Date|string|number} [submittedAt=new Date()] - Application submission timestamp
 * @param {number} [slaHours=48] - Total working hours required (default 48 hours = 2 working days)
 * @param {Object} [holidays=defaultHolidays] - Holiday calendar config
 * @param {boolean} [demoMode=DEMO_SLA_MODE] - Explicit override for demo mode
 * @returns {Date}
 */
const calculateSlaDeadline = (
  submittedAt = new Date(),
  slaHours = 48,
  holidays = defaultHolidays,
  demoMode = DEMO_SLA_MODE
) => {
  const start = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
  const baseTime = isNaN(start.getTime()) ? Date.now() : start.getTime();

  if (demoMode) {
    // Demo SLA: exactly 2 minutes (120,000 ms) from submission
    return new Date(baseTime + DEMO_SLA_MINUTES * 60 * 1000);
  }

  if (isNaN(start.getTime())) return new Date(Date.now() + slaHours * 60 * 60 * 1000);

  const workingDays = Math.ceil(slaHours / 24);
  return addWorkingDays(start, workingDays, holidays);
};

/**
 * Evaluate if an application is currently SLA Overdue.
 *
 * Rules:
 *   - Only unresolved applications (PENDING, UNDER_REVIEW, CORRECTION_REQUIRED, RESUBMITTED) can be overdue
 *   - APPROVED and REJECTED applications are never overdue
 *   - Missing/null SLA deadline is never overdue
 *   - Overdue when the holiday-aware SLA deadline is strictly in the past (slaDeadline < now)
 *
 * @param {Object} application
 * @param {Date|string|number} [now=new Date()]
 * @returns {boolean}
 */
const isSlaOverdue = (application, now = new Date()) => {
  if (!application || !application.slaDeadline) return false;

  const resolvedStatuses = ['APPROVED', 'REJECTED'];
  if (resolvedStatuses.includes((application.status || '').toUpperCase())) {
    return false;
  }

  const deadline = new Date(application.slaDeadline);
  if (isNaN(deadline.getTime())) return false;

  const current = now instanceof Date ? now : new Date(now);
  return deadline < current;
};

/**
 * Shared SLA Overdue MongoDB Query Builder
 *
 * Matches unresolved applications whose SLA deadline has elapsed.
 *
 * @param {Date} [now=new Date()]
 * @returns {Object} MongoDB query filter
 */
const buildSlaOverdueFilter = function (now) {
  const cutoff = now instanceof Date ? now : new Date();
  return {
    status: { $in: ['PENDING', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'RESUBMITTED'] },
    slaDeadline: { $exists: true, $ne: null, $lt: cutoff },
  };
};

/**
 * Shared Escalated Application MongoDB Query Builder
 *
 * Matches formally escalated unresolved applications whose SLA deadline has elapsed.
 *
 * @param {Date} [now=new Date()]
 * @returns {Object} MongoDB query filter
 */
const buildEscalatedQuery = function (now) {
  const cutoff = now instanceof Date ? now : new Date();
  return {
    isEscalated: true,
    status: { $in: ['PENDING', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'RESUBMITTED'] },
    slaDeadline: { $exists: true, $ne: null, $lt: cutoff },
  };
};

module.exports = {
  DEMO_SLA_MODE,
  DEMO_SLA_MINUTES,
  formatLocalDateString,
  isGovernmentHoliday,
  isWeekend,
  isWorkingDay,
  addWorkingDays,
  calculateSlaDeadline,
  isSlaOverdue,
  buildSlaOverdueFilter,
  buildEscalatedQuery,
};
