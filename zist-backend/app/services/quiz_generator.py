import json
from typing import Any

import google.generativeai as genai
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.fact import FactItem
from app.models.quote import QuoteItem
from app.models.theme import ThemeConcept
from app.models.vocab import VocabItem
from app.utils.enums import QuizType


def _format_content_for_prompt(
    themes: list[ThemeConcept],
    facts: list[FactItem],
    vocab_items: list[VocabItem],
    quotes: list[QuoteItem],
) -> str:
    """Formats the learning content into a structured string for the AI prompt."""
    content = []
    if themes:
        content.append("Themes:\n" + "\n".join(f"- {t.title}: {t.summary}" for t in themes))
    if facts:
        content.append("Facts:\n" + "\n".join(f"- {f.content} (Category: {f.category})" for f in facts))
    if vocab_items:
        content.append("Vocabulary:\n" + "\n".join(f"- {v.word}: {v.definition}" for v in vocab_items))
    if quotes:
        content.append("Quotes:\n" + "\n".join(f'- "{q.text}" - {q.speaker}' for q in quotes))
    return "\n\n".join(content)


async def generate_questions(
    quiz_type: QuizType,
    themes: list[ThemeConcept],
    facts: list[FactItem],
    vocab_items: list[VocabItem],
    quotes: list[QuoteItem],
    limit: int = 5,
) -> list[dict[str, Any]]:
    """
    Generates quiz questions using the Google Gemini AI based on the provided content.
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured.",
        )

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)

    learning_content = _format_content_for_prompt(themes, facts, vocab_items, quotes)
    quiz_type_str = "mixed" if quiz_type == QuizType.mixed else quiz_type.value

    prompt = f"""
    Based on the following learning content, generate {limit} multiple-choice quiz questions.
    The quiz should focus on the '{quiz_type_str}' category if specified, otherwise mix them.

    Learning Content:
    ---
    {learning_content}
    ---

    The output must be a valid JSON array of objects. Do not include any text outside of the JSON array.
    Each object in the array should have the following structure:
    {{
      "id": "string (a unique identifier for the question, e.g., 'vocab_1')",
      "category": "string (e.g., 'Vocabulary', 'Theme', 'Fact', 'Quote')",
      "question": "string (the question text)",
      "options": ["string", "string", "string", "string"] (an array of 4 possible answers),
      "correct_answer": "string (the correct answer, which must be one of the options)"
    }}
    """

    try:
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            ),
        )
        
        # Clean the response to ensure it's valid JSON
        cleaned_response_text = response.text.strip().replace("```json", "").replace("```", "")
        questions = json.loads(cleaned_response_text)
        
        # Basic validation
        if not isinstance(questions, list):
            raise ValueError("AI response is not a list.")
        for q in questions:
            if not all(k in q for k in ["id", "question", "options", "correct_answer"]):
                raise ValueError("AI response is missing required keys in a question object.")

        return questions

    except Exception as e:
        # In case of AI error or parsing failure, fallback or raise
        print(f"Error generating AI quiz: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate quiz questions from AI service.",
        )

