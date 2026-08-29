import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export const BANGKOK_TIMEZONE = 'Asia/Bangkok';

/**
 * Returns current Date object
 */
export function getBangkokNow(): Date {
  return new Date();
}

/**
 * Converts a date input (YYYY-MM-DD string or Date) to 23:59:59.999 Bangkok time (UTC+7)
 * and returns it as a UTC Date object for database storage.
 */
export function toBangkokEndOfDay(dateInput: Date | string): Date {
  let dateStr: string;
  if (typeof dateInput === 'string') {
    dateStr = dateInput.split('T')[0];
  } else {
    dateStr = formatInTimeZone(dateInput, BANGKOK_TIMEZONE, 'yyyy-MM-dd');
  }

  // Combine with end of day time in Bangkok (23:59:59.999)
  const localEndOfDayStr = `${dateStr}T23:59:59.999`;
  return fromZonedTime(localEndOfDayStr, BANGKOK_TIMEZONE);
}

/**
 * Checks if a borrow log is overdue based on Bangkok current time vs expectedReturnDate.
 * Only returns true if status === 'BORROWED' and current time > expectedReturnDate.
 */
export function checkIsOverdue(expectedReturnDate: Date | string, status: string): boolean {
  if (status !== 'BORROWED') return false;
  const now = getBangkokNow();
  const expDate = new Date(expectedReturnDate);
  return now.getTime() > expDate.getTime();
}

/**
 * Formats a Date into a human-readable Bangkok string (e.g. "29/08/2026")
 */
export function formatBangkokDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  return formatInTimeZone(new Date(date), BANGKOK_TIMEZONE, 'dd/MM/yyyy');
}

/**
 * Formats a Date into a human-readable Bangkok datetime string (e.g. "29/08/2026 14:30")
 */
export function formatBangkokDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  return formatInTimeZone(new Date(date), BANGKOK_TIMEZONE, 'dd/MM/yyyy HH:mm');
}
