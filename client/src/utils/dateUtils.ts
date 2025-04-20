/**
 * Client-side date utilities
 * Imports the shared date utilities to ensure consistency with server-side code
 */
import { normalizeToUTCMidnight, getCheckoutDate, createFallbackDates } from '../../../shared/utils/dateUtils';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';

/**
 * Format a date for display in the UI
 * @param date The date to format
 * @param formatString Optional format string (defaults to yyyy-MM-dd)
 * @returns Formatted date string
 */
export function formatDateForDisplay(date: Date | string, formatString: string = 'MMM d, yyyy'): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error(`Error formatting date (${date}):`, error);
    return 'Invalid Date';
  }
}

/**
 * Calculate the number of nights in a reservation
 * @param startDate Check-in date
 * @param endDate Check-out date (exclusive in iCal)
 * @returns Number of nights
 */
export function calculateNights(startDate: Date | string, endDate: Date | string): number {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    
    // For iCal standard, end date is exclusive, so subtract 1 day to get checkout date
    const checkoutDate = getCheckoutDate(end);
    
    // Calculate the difference in days using date-fns
    return differenceInDays(checkoutDate, start) + 1;
  } catch (error) {
    console.error('Error calculating nights:', error);
    return 0;
  }
}

// Re-export the shared utilities to make them available from this module too
export { normalizeToUTCMidnight, getCheckoutDate, createFallbackDates };