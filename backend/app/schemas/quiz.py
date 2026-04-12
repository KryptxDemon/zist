from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.utils.enums import QuizType


class QuizQuestion(BaseModel):
    id: str
    type: str = "multiple-choice"
    category: str
    question: str
    options: list[str] = Field(default_factory=list)
    correct_answer: str


class QuizGenerateResponse(BaseModel):
    media_id: str
    quiz_type: QuizType
    questions: list[QuizQuestion]


class QuizSubmitRequest(BaseModel):
    media_id: str
    quiz_type: QuizType
    questions: list[QuizQuestion]
    answers: dict[str, str]


class QuizSubmitResponse(BaseModel):
    score: int
    total_questions: int
    accuracy: float
    weak_areas: list[str]
    suggested_review_topics: list[str]
    attempt_id: str


class QuizAttemptResponse(BaseModel):
    id: str
    user_id: str
    media_id: str
    quiz_type: str
    score: int
    total_questions: int
    accuracy: float
    question_payload: str
    answers_payload: str
    result_payload: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class QuizHistoryResponse(BaseModel):
    items: list[QuizAttemptResponse]
    total: int
    page: int
    limit: int


class QuizStatsResponse(BaseModel):
    total_quizzes: int
    average_accuracy: float
    best_media: dict[str, Any] | None = None
    weakest_quiz_type: str | None = None
