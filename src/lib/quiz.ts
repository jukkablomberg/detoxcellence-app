import data from "../data/quiz.json";

/**
 * The Home Check, ported from the site's assets/quiz.js ([HOME-REFOCUS] 2026-10-31: the unit of Detoxcellence is the
 * home, not the body — twelve questions about the HOUSE, each tagged with a room; the result is a room-by-room report
 * with one "do this first" per room). The questions, weights, room copy and links are NOT retyped: src/data/quiz.json
 * is generated from the site's literals by scripts/sync-exposures.mjs (drift-checked). The rules below are the ones
 * the site keeps in code; the sync script asserts each one's source text still exists in the site's file, and
 * scripts/quiz.test.mjs runs the site's own quiz.js on fixed answer sets and requires this module to agree.
 */
export type RoomKey = "older" | "water" | "kitchen" | "living" | "structure" | "cleaning";
export type Driver = RoomKey | "balanced";
export type Answer = { label: string; weight: number; tag: string | null };
export type Question = { q: string; sub: string; dom: RoomKey; answers: Answer[] };
/** label · the site's href for that room · "do this first" · the link label */
export type Room = { label: string; href: string; first: string; linkLabel: string };

export const QUESTIONS = data.questions as Question[];
export const ROOMS = data.rooms as Record<RoomKey, Room>;
export const ROOM_ORDER = data.roomOrder as RoomKey[];

/** var MAX=Q.length*10; */
export const MAX = QUESTIONS.length * 10;

export type RoomBand = "fine" | "look" | "worry";
export type RoomReport = { k: RoomKey; pct: number; band: RoomBand; bandLabel: string };
export type Result = { pct: number; driver: Driver; report: RoomReport[]; title: string; first: string };

/** function bandOf(pct){return pct>=70?["Fine","fine"]:pct>=40?["Worth a look","look"]:["Worry — do this first","worry"];} */
export function roomBand(pct: number): [string, RoomBand] {
  return pct >= 70 ? ["Fine", "fine"] : pct >= 40 ? ["Worth a look", "look"] : ["Worry — do this first", "worry"];
}

/** `answers[i]` = the index of the option chosen for question i. */
export function scoreQuiz(answers: number[]): Result {
  if (answers.length !== QUESTIONS.length) throw new Error(`scoreQuiz: ${answers.length} answers for ${QUESTIONS.length} questions`);
  let score = 0;
  const rooms: Partial<Record<RoomKey, [number, number]>> = {};
  answers.forEach((ai, qi) => {
    const q = QUESTIONS[qi];
    const o = q.answers[ai];
    if (!o) throw new Error(`scoreQuiz: question ${qi + 1} has no option ${ai}`);
    score += o.weight;
    const rk = rooms[q.dom] ?? (rooms[q.dom] = [0, 0]);
    rk[0] += o.weight;
    rk[1]++;
  });
  // var pct=Math.round(state.score/MAX*100);
  const pct = Math.round((score / MAX) * 100);
  // var rp=r[1]?Math.round(r[0]/(r[1]*10)*100):100;
  const report: RoomReport[] = ROOM_ORDER.map((k) => {
    const r = rooms[k] ?? [0, 0];
    const rp = r[1] ? Math.round((r[0] / (r[1] * 10)) * 100) : 100;
    const [bandLabel, band] = roomBand(rp);
    return { k, pct: rp, band, bandLabel };
  });
  // var worst=report.slice().sort((a,b)=>a.pct-b.pct)[0]; var driver=worst&&worst.pct<70?worst.k:'balanced';
  const worst = [...report].sort((a, b) => a.pct - b.pct)[0];
  const driver: Driver = worst && worst.pct < 70 ? worst.k : "balanced";
  const top = driver === "balanced" ? null : ROOMS[driver];
  const title = top ? `Your home: start with the ${top.label.toLowerCase()}` : "Your home: nothing to worry about first";
  const first = top ? top.first : "Pick your lowest-scoring room above and tighten that one thing.";
  return { pct, driver, report, title, first };
}

/** The site's result-ink cut-offs (75 / 55 / 35 / 20), mapped to the app's band tokens. */
export function scoreBand(pct: number): "Minimal" | "Low" | "Moderate" | "High" | "Severe" {
  return pct >= 75 ? "Minimal" : pct >= 55 ? "Low" : pct >= 35 ? "Moderate" : pct >= 20 ? "High" : "Severe";
}

/**
 * The Index room a Home Check room opens — the site's ROOMS hrefs (`/exposures?room=…`); "older" is the
 * /older-homes hub (rows flagged `older_home`), "water" the water-filter guide (its Index room is Water).
 */
export function indexRoomFor(k: Driver): { room: string | null; olderHome: boolean } {
  if (k === "balanced") return { room: null, olderHome: false };
  if (k === "older") return { room: null, olderHome: true };
  const href = ROOMS[k]?.href ?? "";
  const m = /[?&]room=([^&]+)/.exec(href);
  if (m) return { room: decodeURIComponent(m[1]), olderHome: false };
  return { room: k === "water" ? "Water" : null, olderHome: false };
}
