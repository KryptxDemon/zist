import random
from typing import Any

from app.models.fact import FactItem
from app.models.quote import QuoteItem
from app.models.theme import ThemeConcept
from app.models.vocab import VocabItem
from app.utils.enums import QuizType


def _make_question(qid: str, category: str, question: str, options: list[str], answer: str) -> dict[str, Any]:
    return {
        "id": qid,
        "type": "multiple-choice",
        "category": category,
        "question": question,
        "options": options,
        "correct_answer": answer,
    }


def generate_questions(
    quiz_type: QuizType,
    themes: list[ThemeConcept],
    facts: list[FactItem],
    vocab_items: list[VocabItem],
    quotes: list[QuoteItem],
    limit: int = 5,
) -> list[dict[str, Any]]:
    seed = len(themes) * 17 + len(facts) * 13 + len(vocab_items) * 11 + len(quotes) * 7 + len(quiz_type.value)
    random.seed(seed)

    pool: list[dict[str, Any]] = []

    if quiz_type in {QuizType.theme, QuizType.mixed}:
        titles = [t.title for t in themes if t.title]
        for idx, t in enumerate(themes):
            if not t.summary:
                continue
            wrong = [x for x in titles if x != t.title][:3]
            options = [t.title] + wrong
            random.shuffle(options)
            pool.append(_make_question(f"theme-{idx}", "theme", f"Which theme matches this summary: {t.summary}", options, t.title))

    if quiz_type in {QuizType.vocab, QuizType.mixed}:
        words = [v.word for v in vocab_items if v.word]
        for idx, v in enumerate(vocab_items):
            if not v.definition:
                continue
            wrong = [x for x in words if x != v.word][:3]
            options = [v.word] + wrong
            random.shuffle(options)
            pool.append(_make_question(f"vocab-{idx}", "vocab", f"Which word matches this definition: {v.definition}", options, v.word))

    if quiz_type in {QuizType.quote, QuizType.mixed}:
        speakers = [q.speaker for q in quotes if q.speaker]
        for idx, q in enumerate(quotes):
            if not q.speaker or not q.text:
                continue
            wrong = [x for x in speakers if x != q.speaker][:3]
            options = [q.speaker] + wrong
            random.shuffle(options)
            pool.append(_make_question(f"quote-{idx}", "quote", f"Who said this quote? {q.text}", options, q.speaker))

    if quiz_type in {QuizType.fact, QuizType.mixed}:
        categories = [f.category for f in facts if f.category]
        for idx, f in enumerate(facts):
            wrong = [x for x in categories if x != f.category][:3]
            options = [f.category] + wrong
            unique_options = list(dict.fromkeys(options))
            random.shuffle(unique_options)
            pool.append(_make_question(f"fact-{idx}", "fact", f"What category best describes this fact: {f.content}", unique_options, f.category))

    if not pool:
        return []

    random.shuffle(pool)
    return pool[: max(1, min(limit, 10))]
