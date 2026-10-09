import data from "../data/quiz.json";

/**
 * The Exposure Score, ported from the site's assets/quiz.js. The questions, weights, tags, profile copy and
 * next-step links are NOT retyped: src/data/quiz.json is generated from the site's literals by
 * scripts/sync-exposures.mjs (drift-checked). The rules below are the five the site keeps in code; the sync
 * script asserts each one's source text still exists in the site's file, and scripts/quiz.test.mjs runs the
 * site's own quiz.js on fixed answer sets and requires this module to return the same score and profile.
 */
export type Driver = "water" | "air" | "plastic" | "food" | "care" | "home" | "balanced";
export type Answer = { label: string; weight: number; tag: string | null };
export type Question = { q: string; sub: string; dom: string; answers: Answer[] };
export type Profile = { title: string; blurb: string; fix: string };

export const QUESTIONS = data.questions as Question[];
export const PROFILES = data.profiles as Record<Driver, Profile>;
export const NEXT = data.next as Record<Driver, { href: string; label: string }>;

/** var MAX = Q.reduce((s) => s + 10, 0) */
export const MAX = QUESTIONS.reduce((s) => s + 10, 0);

export type Result = { pct: number; driver: Driver; profile: Profile };

/** `answers[i]` = the index of the option chosen for question i. */
export function scoreQuiz(answers: number[]): Result {
  if (answers.length !== QUESTIONS.length) throw new Error(`scoreQuiz: ${answers.length} answers for ${QUESTIONS.length} questions`);
  let score = 0;
  const tags: Record<string, number> = {};
  answers.forEach((ai, qi) => {
    const o = QUESTIONS[qi].answers[ai];
    if (!o) throw new Error(`scoreQuiz: question ${qi + 1} has no option ${ai}`);
    score += o.weight;
    if (o.tag) tags[o.tag] = (tags[o.tag] || 0) + 1;
  });
  // var pct=Math.round(state.score/MAX*100);
  const pct = Math.round((score / MAX) * 100);
  // for(var k in state.tags){if(state.tags[k]>best){best=state.tags[k];driver=k;}} — insertion order, first wins a tie
  let driver: string = "balanced";
  let best = 0;
  for (const k in tags) if (tags[k] > best) { best = tags[k]; driver = k; }
  // if(pct>=80)driver='balanced';
  if (pct >= 80) driver = "balanced";
  const d = (driver in PROFILES ? driver : "balanced") as Driver;
  return { pct, driver: d, profile: PROFILES[d] };
}

/** The site's result-ink cut-offs (75 / 55 / 35 / 20), mapped to the app's band tokens. */
export function scoreBand(pct: number): "Minimal" | "Low" | "Moderate" | "High" | "Severe" {
  return pct >= 75 ? "Minimal" : pct >= 55 ? "Low" : pct >= 35 ? "Moderate" : pct >= 20 ? "High" : "Severe";
}

/** The Index categories each profile is about — the site's NEXT links (`/exposures?cat=…&sort=burden`). */
export function categoriesFor(driver: Driver): string[] {
  const href = NEXT[driver]?.href ?? "";
  const m = /[?&]cat=([^&]+)/.exec(href);
  return m ? [decodeURIComponent(m[1])] : [];
}
