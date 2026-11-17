import { isPFAS } from "./exposures";
import { QUESTIONS } from "./quiz";

/**
 * [DX-ROUND2-1117] "PFAS in your home" — reader 1's job (READERS.md: which things in my house carry PFAS, water first).
 * Built only from what the reader answered and what the Index says: a Home Check answer whose own words NAME an Index
 * row (e.g. "Nonstick (PTFE), intact" → Nonstick (PTFE) Cookware) points at that row; the row is shown only when the
 * site's own PFAS rule (build.js PFAS_N, isPFAS: the name or note names PFAS) flags it. Nothing is scored or estimated here.
 * Keyed by the question's text so a reordered quiz cannot point an answer at the wrong row (quiz.test keeps the text in sync).
 */
const BY_ANSWER: Record<string, Record<string, string>> = {
  "Where does your drinking water come from, and is it filtered?": {
    "A carbon pitcher or tap filter — certification unknown": "carbon-filter-pitcher-water",
    "Unfiltered tap water": "unfiltered-tap-water",
    "A private well that has not been tested, or mostly bottled": "untested-private-well-water",
  },
  "What do you cook on?": {
    "Nonstick (PTFE), intact": "nonstick-ptfe-cookware",
    "Nonstick that is scratched or old": "nonstick-ptfe-cookware",
  },
  "Carpets, sofas and curtains?": {
    "Stain-resistant carpet or sofa": "stain-resistant-textiles-pfas",
    "I use a fabric-protector spray": "fabric-protector-spray-pfas",
  },
};

/** The PFAS rows the reader's own answers point at (slugs, in question order, no repeats). */
export function pfasFromAnswers<E extends { slug: string; name: string; note?: string }>(answers: number[], bySlug: (s: string) => E | undefined): E[] {
  const out: E[] = [];
  answers.forEach((ai, qi) => {
    const q = QUESTIONS[qi];
    const label = q?.answers[ai]?.label;
    const slug = q && label ? BY_ANSWER[q.q]?.[label] : undefined;
    const e = slug ? bySlug(slug) : undefined;
    if (e && isPFAS(e) && !out.some((x) => x.slug === e.slug)) out.push(e);
  });
  return out;
}

/** Did the reader say they drink unfiltered, carbon-filtered or untested well water? (opens the filter check) */
export function waterOpen(answers: number[]): boolean {
  const qi = QUESTIONS.findIndex((q) => q.q in BY_ANSWER && /drinking water/.test(q.q));
  return qi >= 0 && answers[qi] != null && answers[qi] > 0;
}
