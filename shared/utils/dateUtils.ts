/**
 * Shared date utilities
 * These functions ensure consistent date handling between client and server components
 */

/**
 * Normalize a date to midnight in UTC to avoid timezone issues
 * @param date Input date object
 * @returns Date normalized to UTC midnight
 */
export function normalizeToUTCMidnight(date: Date): Date {
  if (!date || isNaN(date.getTime())) {
    throw new Error("Invalid date provided to normalizeToUTCMidnight");
  }
  
  // Convert to ISO string, then extract just the date part (YYYY-MM-DD)
  const dateString = date.toISOString().split('T')[0];
  
  // Create a new UTC date at midnight
  return new Date(`${dateString}T00:00:00Z`);
}

/**
 * Get the actual checkout date from an iCal end date
 * In iCal standard, the end date is exclusive (the day AFTER the last day of the event)
 * @param endDate The end date from the iCal feed
 * @returns The actual checkout date (end date - 1 day)
 */
export function getCheckoutDate(endDate: Date): Date {
  if (!endDate || isNaN(endDate.getTime())) {
    throw new Error("Invalid date provided to getCheckoutDate");
  }
  
  // First normalize the date to midnight in UTC
  const normalizedDate = normalizeToUTCMidnight(endDate);
  
  // Then subtract one day to get the actual checkout date
  const checkoutDate = new Date(normalizedDate);
  checkoutDate.setDate(checkoutDate.getDate() - 1);
  
  return checkoutDate;
}

/**
 * Create properly formatted fallback dates for error cases
 * @returns Object containing normalized start, end, and checkout dates
 */
export function createFallbackDates(): { start: Date, end: Date, checkout: Date } {
  const start = normalizeToUTCMidnight(new Date());
  const end = new Date(start);
  end.setDate(start.getDate() + 1); // Add one day
  
  return {
    start,
    end,
    checkout: start // For fallback, checkout same as start (one-day event)
  };
}