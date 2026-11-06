/**
 * [DX-APP-DEFAULTS-1106] APP-STANDARD § 8.6 — the phone decides first. Hermes' Intl reads the device locale with no
 * native module, so these ship over the air: the 12/24 h clock for reminder times and the locale's digits for counts.
 */
export function hourLabel(hour: number): string {
  try {
    return new Date(2000, 0, 3, hour, 0, 0).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return `${String(hour).padStart(2, "0")}:00`;
  }
}

/** A whole number in the phone's own digit grouping ("1 234" in Finland, "1,234" in the US). */
export function fmtInt(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(Math.round(n));
  }
}
