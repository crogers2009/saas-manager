/**
 * Utility functions for handling dates assuming America/Chicago timezone
 */

import { format } from 'date-fns';

/**
 * Safely parse a date string as if it represents a date in Chicago timezone
 * For date strings like "2024-09-01T00:00:00.000Z" or "2024-09-01",
 * this treats them as Chicago dates to avoid timezone display issues
 */
export const safeParseDateString = (dateString: string): Date => {
  // Extract just the date part (YYYY-MM-DD)
  const dateOnly = dateString.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  
  // Create date object directly with year, month, day in local timezone
  // This avoids string parsing timezone issues
  return new Date(year, month - 1, day, 12, 0, 0); // noon to avoid DST edge cases
};

/**
 * Format a date string safely assuming Chicago timezone context
 */
export const formatDateSafely = (dateString: string, formatStr: string): string => {
  const safeDate = safeParseDateString(dateString);
  return format(safeDate, formatStr);
};

/**
 * Get the difference in days between a date string and today
 */
export const getDaysDifference = (dateString: string, compareDate: Date = new Date()): number => {
  const safeDate = safeParseDateString(dateString);
  const timeDiff = safeDate.getTime() - compareDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

/**
 * Convert a date input (YYYY-MM-DD) to ISO string for storage
 * Assumes the date input represents a Chicago timezone date
 */
export const dateInputToISOString = (dateInput: string): string => {
  if (!dateInput) return new Date().toISOString();
  
  // Create date as if it's in Chicago timezone, then convert to UTC for storage
  const [year, month, day] = dateInput.split('-').map(Number);
  const chicagoDate = new Date(year, month - 1, day, 0, 0, 0);
  
  // Add timezone offset to get UTC equivalent
  // Chicago is UTC-6 (CST) or UTC-5 (CDT)
  const offsetMinutes = chicagoDate.getTimezoneOffset();
  const utcTime = chicagoDate.getTime() + (offsetMinutes * 60 * 1000);
  return new Date(utcTime).toISOString();
};