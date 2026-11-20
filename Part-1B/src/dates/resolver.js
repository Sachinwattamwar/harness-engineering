import { DateTime } from "luxon";

export function validateTimezone(tz) {
  if (!tz || typeof tz !== "string") {
    throw new Error(`Invalid timezone: ${tz}`);
  }
  const dt = DateTime.now().setZone(tz);
  if (!dt.isValid) {
    throw new Error(`Invalid timezone: "${tz}"`);
  }
}

const WEEKDAY_NAMES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function resolveRelativeDate(text, referenceNow, timezone) {
  const tz = timezone ?? "Asia/Kolkata";
  const ref = DateTime.fromISO(referenceNow, { setZone: true }).setZone(tz);
  const lower = text.toLowerCase().trim();

  // "in N units"
  const inMatch = lower.match(
    /^in\s+(\d+)\s+(second|minute|hour|day|week|month)s?/
  );
  if (inMatch) {
    const amount = parseInt(inMatch[1], 10);
    const unit = inMatch[2] + "s";
    const result = ref.plus({ [unit]: amount });
    return result.toISO({ suppressMilliseconds: true, includeOffset: true });
  }

  // "tomorrow [at] [time]"
  if (lower.startsWith("tomorrow")) {
    let next = ref.plus({ days: 1 });
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3];
      if (meridiem === "pm" && hour !== 12) hour += 12;
      else if (meridiem === "am" && hour === 12) hour = 0;
      next = next.set({ hour, minute: min, second: 0, millisecond: 0 });
    } else {
      next = next.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    }
    return next.toISO({ suppressMilliseconds: true, includeOffset: true });
  }

  // "next <weekday>"
  const nextMatch = lower.match(
    /^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/
  );
  if (nextMatch) {
    const targetWeekday = WEEKDAY_NAMES.indexOf(nextMatch[1]) + 1;
    const currentWeekday = ref.weekday;
    let daysAhead = targetWeekday - currentWeekday;
    if (daysAhead <= 0) daysAhead += 7;
    const result = ref
      .plus({ days: daysAhead })
      .set({ second: 0, millisecond: 0 });
    return result.toISO({ suppressMilliseconds: true, includeOffset: true });
  }

  return ref.toISO({ suppressMilliseconds: true, includeOffset: true });
}

export function isInFuture(due, referenceNow) {
  const dueMs = DateTime.fromISO(due).toMillis();
  const refMs = DateTime.fromISO(referenceNow).toMillis();
  return dueMs > refMs;
}
