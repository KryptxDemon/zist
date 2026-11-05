import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ArrowRight, Brain } from "lucide-react-native";

import { useTheme } from "@/theme";
import { useAuth } from "@/contexts/AuthContext";
import {
  Button,
  IconButton,
  Progress,
  Screen,
  Text,
  useToast,
} from "@/components/ui";
import { QuizQuestionCard } from "@/components/quiz/QuizQuestionCard";
import { QuizResultsPanel } from "@/components/quiz/QuizResultsPanel";
import {
  mediaService,
  quoteService,
  themeService,
  vocabService,
} from "@/services/mediaService";
import { aiService } from "@/services/externalServices";
import { STORAGE_KEYS, storage } from "@/services/storage";
import type { MediaItem, QuizAttempt, QuizQuestion } from "@/types";
import { buildQuizQuestions, calculateQuizScore, isQuizAnswerCorrect } from "@/lib/quiz";

function createAttemptId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Native port of the web `QuizSession` page (single + collective quizzes). */
export function QuizSessionScreen() {
  const { mediaId } = useLocalSearchParams<{ mediaId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [media, setMedia] = useState<MediaItem | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadQuiz() {
      if (!mediaId) return;
      setIsLoading(true);
      try {
        const isCollective = mediaId === "collective";
        const allMedia = isCollective ? await mediaService.getAll() : [];
        const mediaData = isCollective ? null : await mediaService.getById(mediaId);
        if (cancelled) return;

        if (!isCollective && !mediaData) {
          router.replace("/quiz");
          return;
        }

        const [themes, vocab, quotes] = isCollective
          ? await Promise.all([
              Promise.all(allMedia.map((item) => themeService.getByMediaId(item.id))),
              Promise.all(allMedia.map((item) => vocabService.getByMediaId(item.id))),
              Promise.all(allMedia.map((item) => quoteService.getByMediaId(item.id))),
            ])
          : [
              await themeService.getByMediaId(mediaId),
              await vocabService.getByMediaId(mediaId),
              await quoteService.getByMediaId(mediaId),
            ];
        if (cancelled) return;

        setMedia(mediaData);

        const generatedQuestions = await buildQuizQuestions(
          vocab.flat(),
          themes.flat(),
          quotes.flat(),
          isCollective ? allMedia : mediaData ? [mediaData] : [],
          (input) => aiService.generateQuizDistractors(input),
        );
        if (cancelled) return;

        if (generatedQuestions.length === 0) {
          toast({
            title: "Not enough content",
            description: isCollective
              ? "Add more vocabulary across your library to generate a collective quiz."
              : "Add more vocabulary to generate a quiz.",
            variant: "destructive",
          });
          router.replace("/quiz");
          return;
        }

        setQuestions(generatedQuestions);
      } catch (error) {
        console.error("Failed to load quiz:", error);
        if (!cancelled) {
          toast({ title: "Failed to load quiz", variant: "destructive" });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadQuiz();
    return () => {
      cancelled = true;
    };
  }, [mediaId, router, toast]);

  const currentQuestion = questions[currentIndex];
  const progress =
    questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const revealedCount = questions.filter((question) => revealed[question.id]).length;
  const runningScore = questions.reduce(
    (total, question) =>
      total + (revealed[question.id] && isQuizAnswerCorrect(question, answers[question.id]) ? 1 : 0),
    0,
  );

  const handleAnswer = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    if (currentQuestion.type === "multiple-choice") {
      setRevealed((prev) => ({ ...prev, [currentQuestion.id]: true }));
    }
  };

  const handleReveal = () => {
    if (!currentQuestion) return;
    setRevealed((prev) => ({ ...prev, [currentQuestion.id]: true }));
  };

  const persistAttempt = () => {
    if (!mediaId) return;
    try {
      const attempt: QuizAttempt = {
        id: createAttemptId(),
        mediaId,
        userId: user?.id ?? "",
        questions,
        answers,
        score: calculateQuizScore(questions, answers),
        totalQuestions: questions.length,
        completedAt: new Date().toISOString(),
      };
      const existing = storage.get<QuizAttempt[]>(STORAGE_KEYS.QUIZZES) ?? [];
      storage.set(STORAGE_KEYS.QUIZZES, [...existing, attempt]);
    } catch (error) {
      console.error("Failed to save quiz attempt:", error);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1);
    } else {
      persistAttempt();
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex((index) => index - 1);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAnswers({});
    setRevealed({});
    setShowResults(false);
  };

  const backToHub = () => router.replace("/quiz");

  if (isLoading) {
    return (
      <Screen scroll={false} contentContainerStyle={{ alignItems: "center", justifyContent: "center" }}>
        <Brain size={48} color={colors.primary} />
        <Text variant="muted">Generating quiz...</Text>
      </Screen>
    );
  }

  if (showResults) {
    return (
      <Screen>
        <QuizResultsPanel
          title={media?.title || "Collective Quiz"}
          questions={questions}
          answers={answers}
          onRetry={handleRestart}
          onBackToHub={backToHub}
        />
      </Screen>
    );
  }

  if (!currentQuestion) {
    return (
      <Screen scroll={false} contentContainerStyle={{ alignItems: "center", justifyContent: "center" }}>
        <Brain size={48} color={colors.primary} />
        <Text variant="muted">Preparing quiz...</Text>
      </Screen>
    );
  }

  const isLast = currentIndex === questions.length - 1;

  return (
    <Screen>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton onPress={backToHub}>
          <ArrowLeft size={20} color={colors.foreground} />
        </IconButton>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h4">{media?.title ? `${media.title} Quiz` : "Collective Quiz"}</Text>
          <Text variant="small" color="mutedForeground">
            Question {currentIndex + 1} of {questions.length}
            {revealedCount > 0 ? ` · ${runningScore} correct` : ""}
          </Text>
        </View>
      </View>

      <Progress value={progress} />

      <QuizQuestionCard
        question={currentQuestion}
        answer={answers[currentQuestion.id]}
        revealed={!!revealed[currentQuestion.id]}
        onAnswer={handleAnswer}
        onReveal={handleReveal}
      />

      {/* Navigation */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Button
          variant="outline"
          label="Previous"
          disabled={currentIndex === 0}
          icon={<ArrowLeft size={16} color={colors.foreground} />}
          onPress={handlePrevious}
        />
        <Button
          label={isLast ? "Finish Quiz" : "Next"}
          disabled={!answers[currentQuestion.id]}
          iconRight={<ArrowRight size={16} color={colors.primaryForeground} />}
          onPress={handleNext}
          style={{ flex: 1 }}
        />
      </View>
    </Screen>
  );
}
