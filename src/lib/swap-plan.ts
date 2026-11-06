import { burdenFirst, hasSwap } from "./score";
import { indexRoomFor, type Driver } from "./quiz";

/**
 * The weekly swap plan, pure (no React Native) so scripts/reminders.test.mjs runs it under Node.
 * src/lib/reminders.ts schedules what this returns.
 */
export const WEEKS_AHEAD = 8;
export type ReminderSettings = { on: boolean; weekday: number; hour: number }; // weekday 1 = Monday … 7 = Sunday
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type PlanEntry = { name: string; category: string; room?: string; older_home?: boolean; swap: string; score: number };

/** The ordered swap list for a Home Check result: its worst room's rows worst-first, then everything else worst-first. */
export function swapQueue<E extends PlanEntry>(list: E[], driver: Driver | null): E[] {
  const swaps = list.filter(hasSwap).sort(burdenFirst);
  const where = driver ? indexRoomFor(driver) : { room: null, olderHome: false };
  const mine = (e: E) => (where.olderHome ? e.older_home === true : where.room != null && e.room === where.room);
  return [...swaps.filter(mine), ...swaps.filter((e) => !mine(e))];
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

/** What the plan would schedule — the Plan tab shows it, and the unit test checks it.
 * [DX-APP-PLAN-1106] critic: truly worst-first — week 1 = the highest-exposure swap still open, week 2 the next…
 * (no more week-number rotation). Swaps the reader ticked off (`done`, slugs) leave the schedule. */
export function plan<E extends PlanEntry & { slug?: string }>(list: E[], driver: Driver | null, s: ReminderSettings, from = new Date(), done: string[] = []) {
  const all = swapQueue(list, driver);
  const open = all.filter((e) => !done.includes(e.slug ?? ""));
  const q = open.length ? open : all;
  if (!q.length) return [];
  return nextDates(from, s, WEEKS_AHEAD).map((date, i) => ({ date, entry: q[i % q.length] }));
}

