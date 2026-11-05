/**
 * Pure quiz helpers — ported from `zist-frontend/src/pages/QuizSession.tsx`.
 *
 * This module is intentionally free of React and of the API layer so the
 * question-building logic stays unit-testable. Callers inject the AI
 * distractor generator (the app passes `aiService.generateQuizDistractors`).
 */

import type {
  MediaItem,
  QuizQuestion,
  QuoteItem,
  ThemeConcept,
  VocabItem,
} from "@/types";

/** Categories a quiz question can belong to (matches the backend kinds). */
export type QuizCategory = QuizQuestion["category"];

/** Categories `buildQuizQuestions` can actually emit (facts are not quizzed). */
type BuiltQuizCategory = "theme" | "vocab" | "quote";

export interface QuizDistractorRequest {
  kind: "theme" | "vocab" | "quote";
  question: string;
  correctAnswer: string;
  context?: string;
  candidateAnswers?: string[];
}

/** Injected AI hook used to enrich each question with smart distractors. */
export type QuizDistractorGenerator = (
  input: QuizDistractorRequest,
) => Promise<string[]>;

/** Internal shape while assembling questions (carries the AI metadata). */
interface BaseQuizQuestion {
  id: string;
  type: "multiple-choice" | "short-answer";
  question: string;
  correctAnswer: string;
  category: BuiltQuizCategory;
  context: string;
  candidateAnswers: string[];
}

/** Fisher–Yates-free shuffle kept verbatim from the web page. */
export function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

/**
 * Build a mixed set of quiz questions from a media item's themes, vocabulary
 * and quotes. Mirrors the web implementation: up to 4 of each category,
 * shuffled and capped at 10 questions, each enriched with up to 3 AI
 * distractors (falling back to the category's candidate answers).
 */
export async function buildQuizQuestions(
  vocab: VocabItem[],
  themes: ThemeConcept[],
  quotes: QuoteItem[],
  allMedia: MediaItem[],
  generateDistractors?: QuizDistractorGenerator,
): Promise<QuizQuestion[]> {
  const mediaTitleById = new Map(allMedia.map((item) => [item.id, item.title]));

  const themeQuestions: BaseQuizQuestion[] = themes
    .filter((item) => item.title?.trim())
    .slice(0, 4)
    .map((theme, index) => ({
      id: `theme-${index}`,
      type: "multiple-choice" as const,
      question: `Which theme best matches this idea from ${
        mediaTitleById.get(theme.mediaId) || "your media"
      }? "${theme.summary || theme.title}"`,
      correctAnswer: theme.title,
      category: "theme" as const,
      context:
        `${mediaTitleById.get(theme.mediaId) || "Unknown media"}. ${theme.summary || ""}`.trim(),
      candidateAnswers: themes
        .filter((item) => item.id !== theme.id)
        .map((item) => item.title)
        .filter((value) => value && value !== theme.title),
    }));

  const vocabQuestions: BaseQuizQuestion[] = vocab
    .filter((item) => item.definition)
    .slice(0, 4)
    .map((word, index) => ({
      id: `vocab-${index}`,
      type: "multiple-choice" as const,
      question: `What is the definition of "${word.word}"?`,
      correctAnswer: word.definition as string,
      category: "vocab" as const,
      context: [word.exampleSentence, word.whereFound, word.memoryTip]
        .filter(Boolean)
        .join(" | "),
      candidateAnswers: vocab
        .filter((item) => item.id !== word.id && item.definition)
        .map((item) => item.definition as string)
        .slice(0, 8),
    }));

  const quoteQuestions: BaseQuizQuestion[] = quotes
    .filter((item) => item.text?.trim())
    .slice(0, 4)
    .map((quote, index) => ({
      id: `quote-${index}`,
      type: "multiple-choice" as const,
      question: `Which media does this quote belong to? "${quote.text}"`,
      correctAnswer: mediaTitleById.get(quote.mediaId) || "Unknown media",
      category: "quote" as const,
      context: [quote.speaker, quote.reference, quote.userMeaning, quote.aiMeaning]
        .filter(Boolean)
        .join(" | "),
      candidateAnswers: allMedia
        .filter((item) => item.id !== quote.mediaId)
        .map((item) => item.title)
        .slice(0, 8),
    }));

  const baseQuestions = shuffle([
    ...themeQuestions,
    ...vocabQuestions,
    ...quoteQuestions,
  ]).slice(0, 10);

  const enrichedQuestions = await Promise.all(
    baseQuestions.map(async (question) => {
      const distractors = generateDistractors
        ? await generateDistractors({
            kind: question.category,
            question: question.question,
            correctAnswer: question.correctAnswer,
            context: question.context,
            candidateAnswers: question.candidateAnswers,
          })
        : [];

      const fallbackPool =
        question.candidateAnswers?.filter(
          (item) =>
            item.toLowerCase().trim() !==
            question.correctAnswer.toLowerCase().trim(),
        ) || [];
      const fallbackDistractors = fallbackPool.slice(0, 3);

      const options = shuffle([
        question.correctAnswer,
        ...distractors,
        ...fallbackDistractors,
      ])
        .filter((value, index, values) => values.indexOf(value) === index)
        .slice(0, 4);

      while (options.length < 4) {
        const filler =
          question.category === "quote"
            ? "I am not sure"
            : question.category === "theme"
              ? "A different theme"
              : "An unrelated idea";
        if (!options.includes(filler)) {
          options.push(filler);
        } else {
          break;
        }
      }

      const enriched: QuizQuestion = {
        id: question.id,
        type: question.type,
        question: question.question,
        correctAnswer: question.correctAnswer,
        category: question.category,
        options: shuffle(options),
      };
      return enriched;
    }),
  );

  return enrichedQuestions;
}

/**
 * How many questions a set of content will produce (up to 4 per category,
 * capped at 10 total) — used by the hub to show per-media question counts.
 */
export function countAvailableQuestions(
  themes: ThemeConcept[],
  vocab: VocabItem[],
  quotes: QuoteItem[],
): number {
  const themeCount = Math.min(themes.filter((item) => item.title?.trim()).length, 4);
  const vocabCount = Math.min(vocab.filter((item) => item.definition).length, 4);
  const quoteCount = Math.min(quotes.filter((item) => item.text?.trim()).length, 4);
  return Math.min(10, themeCount + vocabCount + quoteCount);
}

/**
 * Whether a user answer counts as correct. Matches the web scoring: exact
 * (case-insensitive) match, or — for short answers — a partial match on the
 * first word of the correct answer.
 */
export function isQuizAnswerCorrect(
  question: QuizQuestion,
  userAnswer?: string,
): boolean {
  const normalized = (userAnswer ?? "").toLowerCase().trim();
  const correctAnswer = question.correctAnswer.toLowerCase().trim();
  if (!normalized) return false;
  if (normalized === correctAnswer) return true;
  return (
    question.type === "short-answer" &&
    normalized.includes(correctAnswer.split(" ")[0] ?? "")
  );
}

/** Number of correct answers across the whole quiz. */
export function calculateQuizScore(
  questions: QuizQuestion[],
  answers: Record<string, string>,
): number {
  return questions.reduce(
    (total, question) =>
      total + (isQuizAnswerCorrect(question, answers[question.id]) ? 1 : 0),
    0,
  );
}
