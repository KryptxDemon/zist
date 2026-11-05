import React from "react";
import { View } from "react-native";

import { useTheme } from "@/theme";
import { Button, Card, Input, Text } from "@/components/ui";
import type { QuizQuestion } from "@/types";
import { isQuizAnswerCorrect } from "@/lib/quiz";
import { QuizOptionRow, type QuizOptionState } from "./QuizOptionRow";
import { CATEGORY_COLORS, QUIZ_CORRECT } from "./colors";

/**
 * One-question-per-screen card: category pill, prompt, and either the
 * multiple-choice options or a short-answer field, with instant feedback once
 * the answer has been revealed.
 */
export function QuizQuestionCard({
  question,
  answer,
  revealed,
  onAnswer,
  onReveal,
}: {
  question: QuizQuestion;
  answer?: string;
  revealed: boolean;
  onAnswer: (value: string) => void;
  onReveal: () => void;
}) {
  const { colors } = useTheme();
  const categoryColor = CATEGORY_COLORS[question.category] ?? CATEGORY_COLORS.fact;
  const isCorrect = revealed && isQuizAnswerCorrect(question, answer);
  const categoryLabel =
    question.category.charAt(0).toUpperCase() + question.category.slice(1);

  const optionState = (option: string): QuizOptionState => {
    if (revealed) {
      if (isQuizAnswerCorrect(question, option)) return "correct";
      if (option === answer) return "wrong";
      return "idle";
    }
    return option === answer ? "selected" : "idle";
  };

  return (
    <Card variant="glass" style={{ padding: 20, gap: 16 }}>
      <View
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: categoryColor.bg,
        }}
      >
        <Text variant="caption" tint={categoryColor.fg} weight="medium">
          {categoryLabel}
        </Text>
      </View>

      <Text variant="h4">{question.question}</Text>

      {question.category === "quote" ? (
        <Text variant="caption" uppercase letterSpacing={2}>
          Choose the matching media title
        </Text>
      ) : null}

      {question.type === "multiple-choice" ? (
        <View style={{ gap: 10 }}>
          {question.options?.map((option, index) => (
            <QuizOptionRow
              key={`${option}-${index}`}
              label={option}
              state={optionState(option)}
              disabled={revealed}
              onPress={() => onAnswer(option)}
            />
          ))}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Input
            placeholder="Type your answer..."
            value={answer ?? ""}
            onChangeText={onAnswer}
            editable={!revealed}
            autoCapitalize="none"
            returnKeyType="done"
          />
          {!revealed ? (
            <Button
              variant="outline"
              size="sm"
              label="Check answer"
              disabled={!(answer ?? "").trim()}
              onPress={onReveal}
            />
          ) : null}
        </View>
      )}

      {revealed ? (
        <Text
          variant="small"
          weight="medium"
          tint={isCorrect ? QUIZ_CORRECT : colors.destructive}
        >
          {isCorrect
            ? "Correct!"
            : `Not quite — correct answer: ${question.correctAnswer}`}
        </Text>
      ) : null}
    </Card>
  );
}
