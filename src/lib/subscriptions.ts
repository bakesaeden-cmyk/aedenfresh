import "server-only";

/**
 * Subscription schedule math (spec §5.3). All dates are YYYY-MM-DD strings
 * computed server-side — never client-supplied.
 */

export type Frequency = "daily" | "weekly" | "alternate_days" | "custom";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export function isValidCustomDays(days: unknown): days is DayKey[] {
  return (
    Array.isArray(days) &&
    days.length > 0 &&
    days.length <= 7 &&
    days.every((d) => (DAY_KEYS as readonly string[]).includes(d as string))
  );
}

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}
function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/**
 * Next delivery date STRICTLY AFTER `fromIso` for the given frequency.
 * - daily            → +1 day
 * - alternate_days   → +2 days
 * - weekly           → +7 days
 * - custom           → next matching weekday after `fromIso`
 */
export function nextDeliveryDate(
  frequency: Frequency,
  fromIso: string,
  customDays?: DayKey[] | null,
): string {
  switch (frequency) {
    case "daily":
      return addDays(fromIso, 1);
    case "alternate_days":
      return addDays(fromIso, 2);
    case "weekly":
      return addDays(fromIso, 7);
    case "custom": {
      const days = customDays && customDays.length > 0 ? customDays : ["mon" as DayKey];
      const wanted = new Set(days.map((d) => DAY_KEYS.indexOf(d)));
      for (let i = 1; i <= 7; i++) {
        const candidate = addDays(fromIso, i);
        if (wanted.has(toDate(candidate).getUTCDay())) return candidate;
      }
      return addDays(fromIso, 7);
    }
  }
}

/** First delivery on/after `startIso` (used at creation). */
export function firstDeliveryDate(
  frequency: Frequency,
  startIso: string,
  customDays?: DayKey[] | null,
): string {
  if (frequency !== "custom") return startIso;
  const days = customDays && customDays.length > 0 ? customDays : ["mon" as DayKey];
  const wanted = new Set(days.map((d) => DAY_KEYS.indexOf(d)));
  if (wanted.has(toDate(startIso).getUTCDay())) return startIso;
  return nextDeliveryDate("custom", startIso, customDays);
}

/** Today in IST (Asia/Kolkata) as YYYY-MM-DD. */
export function todayIst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}
