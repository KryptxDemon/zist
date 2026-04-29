import json
import random
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


def _build_fallback_questions(
    quiz_type: QuizType,
    themes: list[ThemeConcept],
    facts: list[FactItem],
    vocab_items: list[VocabItem],
    quotes: list[QuoteItem],
    limit: int,
) -> list[dict[str, Any]]:
    """Build deterministic quiz questions when AI is unavailable."""
    questions: list[dict[str, Any]] = []
    rng = random.SystemRandom()

    def sample_distractors(correct: str, pool: list[str], count: int = 3) -> list[str]:
        correct_key = correct.strip().lower()
        unique_pool = []
        seen: set[str] = {correct_key}
        for option in pool:
            text = option.strip()
            if not text:
                continue
            key = text.lower()
            if key in seen:
                continue
            seen.add(key)
            unique_pool.append(text)

        rng.shuffle(unique_pool)
        if len(unique_pool) >= count:
            return unique_pool[:count]

        generic_fillers = [
            "A partially related but incorrect interpretation",
            "A detail from a different category",
            "A plausible statement that is not supported by these notes",
            "An oversimplified explanation that misses key context",
        ]
        for filler in generic_fillers:
            if len(unique_pool) >= count:
                break
            if filler.lower() not in seen:
                unique_pool.append(filler)
                seen.add(filler.lower())
        return unique_pool[:count]

    vocab_definitions = [(v.definition or "").strip() for v in vocab_items if (v.definition or "").strip()]
    theme_summaries = [(t.summary or "").strip() for t in themes if (t.summary or "").strip()]
    fact_contents = [(f.content or "").strip() for f in facts if (f.content or "").strip()]
    quote_speakers = [(q.speaker or "").strip() for q in quotes if (q.speaker or "").strip()]

    if quiz_type in (QuizType.mixed, QuizType.vocab):
        for idx, item in enumerate(vocab_items):
            if not item.definition:
                continue
            correct = item.definition.strip()
            distractors = sample_distractors(
                correct=correct,
                pool=vocab_definitions + theme_summaries + fact_contents,
            )
            questions.append(
                {
                    "id": f"vocab_{idx+1}",
                    "category": "Vocabulary",
                    "question": f'What is the best definition of "{item.word}"?',
                    "options": rng.sample([correct, *distractors], k=min(4, 1 + len(distractors))),
                    "correct_answer": correct,
                }
            )

    if quiz_type in (QuizType.mixed, QuizType.theme):
        for idx, item in enumerate(themes):
            summary = (item.summary or "").strip()
            if not summary:
                continue
            distractors = sample_distractors(
                correct=summary,
                pool=theme_summaries + fact_contents + vocab_definitions,
            )
            questions.append(
                {
                    "id": f"theme_{idx+1}",
                    "category": "Theme",
                    "question": f'Which statement best captures the theme "{item.title}"?',
                    "options": rng.sample([summary, *distractors], k=min(4, 1 + len(distractors))),
                    "correct_answer": summary,
                }
            )

    if quiz_type in (QuizType.mixed, QuizType.fact):
        for idx, item in enumerate(facts):
            content = (item.content or "").strip()
            if not content:
                continue
            distractors = sample_distractors(
                correct=content,
                pool=fact_contents + theme_summaries + vocab_definitions,
            )
            questions.append(
                {
                    "id": f"fact_{idx+1}",
                    "category": "Fact",
                    "question": "Which of the following is a recorded fact from your notes?",
                    "options": rng.sample([content, *distractors], k=min(4, 1 + len(distractors))),
                    "correct_answer": content,
                }
            )

    if quiz_type in (QuizType.mixed, QuizType.quote):
        for idx, item in enumerate(quotes):
            text = (item.text or "").strip()
            speaker = (item.speaker or "").strip()
            if not text:
                continue
            correct = speaker or "Unknown speaker"
            distractors = sample_distractors(
                correct=correct,
                pool=quote_speakers + [t.title for t in themes if t.title],
            )
            questions.append(
                {
                    "id": f"quote_{idx+1}",
                    "category": "Quote",
                    "question": f'Who is associated with this quote: "{text}"?',
                    "options": rng.sample([correct, *distractors], k=min(4, 1 + len(distractors))),
                    "correct_answer": correct,
                }
            )

    return questions[:limit]


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
        return _build_fallback_questions(
            quiz_type=quiz_type,
            themes=themes,
            facts=facts,
            vocab_items=vocab_items,
            quotes=quotes,
            limit=limit,
        )

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)

    learning_content = _format_content_for_prompt(themes, facts, vocab_items, quotes)
    quiz_type_str = "mixed" if quiz_type == QuizType.mixed else quiz_type.value

    prompt = f"""
    Based on the following learning content, generate {limit} challenging multiple-choice quiz questions.
    The quiz should focus on the '{quiz_type_str}' category if specified, otherwise mix them.
    Make the distractors plausible and confusing:
    - Distractors should be semantically close to the correct answer.
    - Avoid generic filler options.
    - Reuse nearby concepts from the provided learning content to craft wrong choices.
    - Ensure each question has exactly 4 options with only 1 correct answer.

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
            if not isinstance(q["options"], list) or len(q["options"]) != 4:
                raise ValueError("Each AI question must include exactly 4 options.")
            if q["correct_answer"] not in q["options"]:
                raise ValueError("Correct answer must be one of the options.")

        return questions

    except Exception as e:
        print(f"Error generating AI quiz: {e}")
        return _build_fallback_questions(
            quiz_type=quiz_type,
            themes=themes,
            facts=facts,
            vocab_items=vocab_items,
            quotes=quotes,
            limit=limit,
        )

