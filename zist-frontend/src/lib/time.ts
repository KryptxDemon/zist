/**
 * Centralized date/time utilities for Zist.
 *
 * The backend emits timezone-aware ISO 8601 strings (e.g. `2026-08-21T06:30:00+00:00`),
 * which `Date` parses unambiguously as a UTC instant. From that instant we
 * derive everything the UI needs — relative time, local clock time, and day
 * buckets — using the browser's own timezone, never a hardcoded offset.
 *
 * Naive timestamps (e.g. `2026-08-21T06:30:00` without offset) are treated as
 * UTC as a fallback. This is the safest interpretation: legacy backend rows
 * that were stored via `datetime.utcnow()` happen to be UTC, so the instant
 * is preserved while we migrate to fully tz-aware columns.
 */

/** Parse any backend timestamp into a `Date` (UTC instant). Returns `null` on invalid input. */
export function parseTimestamp(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = value.trim();
  if (!raw) return null;

  // Backend may have stored UTC but forgotten the suffix (legacy naive rows).
  // Treat bare `YYYY-MM-DDTHH:MM:SS[.fff]` as UTC by appending `Z`.
  const looksLikeIso =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(raw);
  const normalized = looksLikeIso ? `${raw}Z` : raw;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Relative time formatter: "just now", "5 minutes ago", "3 hours ago",
 * "yesterday", "3 days ago", "2 weeks ago", "4 months ago", "1 year ago".
 *
 * Always compares against the browser's current time so two users in
 * different timezones see the same relative age for the same instant.
 */
export function formatRelativeTime(timestamp: string | Date | null | undefined): string {
  const date = parseTimestamp(timestamp);
  if (!date) return "Unknown time";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const past = diffMs >= 0;

  const diffInSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  const suffix = past ? "ago" : "from now";

  if (diffInSeconds < 30) {
    return past ? "Just now" : "In a moment";
  } else if (diffInSeconds < minute) {
    return past ? "Less than a minute ago" : "In less than a minute";
  } else if (diffInSeconds < hour) {
    const mins = Math.floor(diffInSeconds / minute);
    return `${mins} minute${mins !== 1 ? "s" : ""} ${suffix}`;
  } else if (diffInSeconds < day) {
    const hrs = Math.floor(diffInSeconds / hour);
    return `${hrs} hour${hrs !== 1 ? "s" : ""} ${suffix}`;
  } else if (diffInSeconds < week) {
    const days = Math.floor(diffInSeconds / day);
    if (days === 1) return past ? "Yesterday" : "Tomorrow";
    return `${days} days ${suffix}`;
  } else if (diffInSeconds < month) {
    const weeks = Math.floor(diffInSeconds / week);
    return `${weeks} week${weeks !== 1 ? "s" : ""} ${suffix}`;
  } else if (diffInSeconds < year) {
    const months = Math.floor(diffInSeconds / month);
    return `${months} month${months !== 1 ? "s" : ""} ${suffix}`;
  } else {
    const years = Math.floor(diffInSeconds / year);
    return `${years} year${years !== 1 ? "s" : ""} ${suffix}`;
  }
}

/**
 * Local clock-time formatter (e.g. `Aug 21, 2026 · 12:30 PM`).
 * Uses the browser's locale and timezone so two users in different timezones
 * see the correct local time for the same instant.
 */
export function formatDateTime(
  timestamp: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
): string {
  const date = parseTimestamp(timestamp);
  if (!date) return "Unknown time";

  try {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Convenience: `true` when the timestamp falls within the last `days` whole
 * days relative to "now" (browser time). Used by Dashboard's "added in the
 * last N days" filters.
 */
export function isWithinLastDays(
  timestamp: string | Date | null | undefined,
  days: number,
): boolean {
  const date = parseTimestamp(timestamp);
  if (!date) return false;
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

/**
 * Day-bucket key (local date) for grouping items by calendar day in the
 * user's timezone — `YYYY-MM-DD`.
 */
export function toLocalDayKey(value: string | Date): string {
  const date = parseTimestamp(value) ?? new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
