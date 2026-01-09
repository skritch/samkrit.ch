/**
 * Parse a date string as EST timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object treating input as EST
 */
export const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
  // Treat as EST (UTC-5)
  return new Date(year, month - 1, day, 12, 0, 0); // Noon EST to avoid timezone edge cases
};