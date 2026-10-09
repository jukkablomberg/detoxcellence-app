import { burdenFirst, hasSwap } from "./score";
import { categoriesFor, type Driver } from "./quiz";

/**
 * The weekly swap plan, pure (no React Native) so scripts/reminders.test.mjs runs it under Node.
 * src/lib/reminders.ts schedules what this returns.
 */
export const WEEKS_AHEAD = 8;
export type ReminderSettings = { on: boolean; weekday: number; hour: number }; // weekday 1 = Monday … 7 = Sunday
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type PlanEntry = { name: string; category: string; swap: string; score: number };

/** The ordered swap list for a profile: its own categories worst-first, then everything else worst-first. */
export function swapQueue<E extends PlanEntry>(list: E[], driver: Driver | null): E[] {
  const swaps = list.filter(hasSwap).sort(burdenFirst);
  const mine = new Set(driver ? categoriesFor(driver) : []);
  return [...swaps.filter((e) => mine.has(e.category)), ...swaps.filter((e) => !mine.has(e.category))];
}

const WEEK_MS = 7 * 24 * 3600 * 1000;
export const weekNumber = (d: Date) => Math.floor(d.getTime() / WEEK_MS);

/** The next `n` reminder dates on/after `from` at weekday/hour, local time. */
export function nextDates(from: Date, s: ReminderSettings, n: number): Date[] {
  const out: Date[] = [];
  const d = new Date(from);
  d.setHours(s.hour, 0, 0, 0);
  const jsDay = s.weekday % 7; // JS: 0 = Sunday
  let add = (jsDay - d.getDay() + 7) % 7;
  if (add === 0 && d.getTime() <= from.getTime()) add = 7;
  d.setDate(d.getDate() + add);
  for (let i = 0; i < n; i++) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

/** What the plan would schedule — the Swaps tab shows it, and the unit test checks it. */
export function plan<E extends PlanEntry>(list: E[], driver: Driver | null, s: ReminderSettings, from = new Date()) {
  const q = swapQueue(list, driver);
  if (!q.length) return [];
  return nextDates(from, s, WEEKS_AHEAD).map((date) => ({ date, entry: q[weekNumber(date) % q.length] }));
}

