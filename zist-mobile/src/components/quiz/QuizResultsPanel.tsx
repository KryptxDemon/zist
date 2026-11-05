import React from "react";
import { View } from "react-native";
import { ArrowLeft, Check, RefreshCw, Trophy, X } from "lucide-react-native";

import { useTheme } from "@/theme";
import { Button, Card, Text } from "@/components/ui";
import type { QuizQuestion } from "@/types";
import { calculateQuizScore, isQuizAnswerCorrect } from "@/lib/quiz";
import {
  QUIZ_CORRECT,
  QUIZ_CORRECT_BG,
  QUIZ_WARNING,
  QUIZ_WARNING_BG,
} from "./colors";

/**
 * End-of-quiz results panel: trophy + score, a full review of every question
 * with the correct answers, and retry / back-to-hub actions.
 */
export function QuizResultsPanel({
  title,
  questions,
  answers,
  onRetry,
  onBackToHub,
}: {
  title: string;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  onRetry: () => void;
  onBackToHub: () => void;
}) {
  const { colors, radius } = useTheme();
  const score = calculateQuizScore(questions, answers);
  const percentage = questions.length
    ? Math.round((score / questions.length) * 100)
    : 0;

  const tone =
    percentage >= 80 ? QUIZ_CORRECT : percentage >= 60 ? QUIZ_WARNING : colors.destructive;
  const toneBg =
    percentage >= 80
      ? QUIZ_CORRECT_BG
      : percentage >= 60
        ? QUIZ_WARNING_BG
        : colors.destructive + "1f";

  return (
    <Card variant="glass" style={{ padding: 24, gap: 16, alignItems: "center" }}>
      <View
        style={{
          height: 96,
          width: 96,
          borderRadius: 48,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: toneBg,
        }}
      >
        <Trophy size={48} color={tone} />
      </View>

      <Text variant="h1" align="center">
        Quiz Complete!
      </Text>
      <Text variant="muted" align="center">
        {title}
      </Text>

      <Text variant="display">
        {score}/{questions.length}
      </Text>
      <Text variant="lead" color="mutedForeground" align="center">
        {percentage}% Accuracy
      </Text>

      <View style={{ width: "100%", gap: 12, marginTop: 8 }}>
        {questions.map((question) => {
          const isCorrect = isQuizAnswerCorrect(question, answers[question.id]);
          return (
            <View
              key={question.id}
              style={{
                flexDirection: "row",
                gap: 12,
                padding: 16,
                borderRadius: radius.lg,
                borderWidth: 1,
                backgroundColor: isCorrect ? QUIZ_CORRECT_BG : colors.destructive + "1f",
                borderColor: isCorrect
                  ? QUIZ_CORRECT + "33"
                  : colors.destructive + "33",
              }}
            >
              {isCorrect ? (
                <Check size={20} color={QUIZ_CORRECT} />
              ) : (
                <X size={20} color={colors.destructive} />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="small" weight="medium">
                  {question.question}
                </Text>
                {!isCorrect ? (
                  <Text variant="small" color="mutedForeground">
                    Correct: <Text variant="small">{question.correctAnswer}</Text>
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 12, width: "100%", marginTop: 8 }}>
        <Button
          variant="outline"
          label="Back to Quiz Hub"
          icon={<ArrowLeft size={16} color={colors.foreground} />}
          onPress={onBackToHub}
          style={{ flex: 1 }}
        />
        <Button
          label="Retry Quiz"
          icon={<RefreshCw size={16} color={colors.primaryForeground} />}
          onPress={onRetry}
          style={{ flex: 1 }}
        />
      </View>
    </Card>
  );
}
