'use strict';

/**
 * Centralized Government Holiday Calendar Configuration
 *
 * Official gazetted government holidays excluded from Municipal SLA calculations.
 * Organized year-wise in 'YYYY-MM-DD' calendar format (local date).
 *
 * Note: These gazetted holiday dates can be extended or modified as official
 * municipal notifications are released each calendar year.
 */
const governmentHolidays = {
  2025: [
    '2025-01-26', // Republic Day
    '2025-04-14', // Dr. B.R. Ambedkar Jayanti / Tamil New Year
    '2025-05-01', // May Day
    '2025-08-15', // Independence Day
    '2025-10-02', // Mahatma Gandhi Jayanti
    '2025-10-20', // Diwali / Deepavali
    '2025-12-25', // Christmas
  ],
  2026: [
    '2026-01-01', // New Year's Day
    '2026-01-15', // Pongal
    '2026-01-16', // Thiruvalluvar Day
    '2026-01-26', // Republic Day
    '2026-03-20', // Eid-ul-Fitr (Ramzan)
    '2026-04-14', // Dr. B.R. Ambedkar Jayanti / Tamil New Year
    '2026-05-01', // May Day
    '2026-08-15', // Independence Day
    '2026-10-02', // Mahatma Gandhi Jayanti
    '2026-11-08', // Deepavali
    '2026-12-25', // Christmas
  ],
  2027: [
    '2027-01-01', // New Year's Day
    '2027-01-15', // Pongal
    '2027-01-26', // Republic Day
    '2027-04-14', // Dr. B.R. Ambedkar Jayanti / Tamil New Year
    '2027-05-01', // May Day
    '2027-08-15', // Independence Day
    '2027-10-02', // Mahatma Gandhi Jayanti
    '2027-12-25', // Christmas
  ],
};

module.exports = governmentHolidays;
