/**
 * Shared colour tokens for the quiz feature.
 *
 * The tailwind hues used by the web page (emerald / amber / violet / sky) have
 * no direct equivalents in the ZIST theme table, so they are centralised here
 * to keep question cards, options and results visually consistent.
 */

import type { QuizQuestion } from "@/types";

type QuizCategory = QuizQuestion["category"];

/** Correct-answer green used for option feedback and the results trophy. */
export const QUIZ_CORRECT = "#22c55e";
export const QUIZ_CORRECT_BG = "#22c55e1f";
export const QUIZ_CORRECT_BORDER = "#22c55e40";

/** Amber used for mid-range results (60–79%). */
export const QUIZ_WARNING = "#f59e0b";
export const QUIZ_WARNING_BG = "#f59e0b1f";

/** Category pill palette (mirrors `bg-*-500/20 text-*-400`). */
export const CATEGORY_COLORS: Record<QuizCategory, { bg: string; fg: string }> = {
  theme: { bg: "#f59e0b1f", fg: "#fbbf24" },
  vocab: { bg: "#10b9811f", fg: "#34d399" },
  quote: { bg: "#8b5cf61f", fg: "#a78bfa" },
  fact: { bg: "#0ea5e91f", fg: "#38bdf8" },
};
