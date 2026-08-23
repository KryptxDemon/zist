import logging

import httpx

from app.core.config import settings


logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def _build_payload(prompt: str, model_name: str) -> dict:
    return {
        "model": model_name,
        "messages": [
            {
                "role": "system",
                "content": "Return only the requested content. Do not add markdown or commentary.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 2048,
    }


async def _generate_once(prompt: str, model_name: str) -> str:
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(GROQ_API_URL, headers=headers, json=_build_payload(prompt, model_name))
        response.raise_for_status()

    payload = response.json()
    choices = payload.get("choices", []) if isinstance(payload, dict) else []
    message = choices[0].get("message", {}) if choices else {}
    content = message.get("content", "") if isinstance(message, dict) else ""
    return str(content or "").strip()


async def generate_groq_text(
    prompt: str,
    model_names: list[str] | None = None,
) -> tuple[str | None, str | None, str | None]:
    """Call Groq with an ordered list of models, returning the first successful content.

    Returns ``(text, used_model, error)``. ``used_model`` is the model that
    produced ``text`` (or None on failure). ``error`` is a human-readable string
    if every candidate failed.
    """
    if not settings.GROQ_API_KEY:
        return None, None, "Groq API key is not configured"

    candidates = list(model_names) if model_names else settings.groq_model_chain
    if not candidates:
        return None, None, "No Groq models configured"

    errors: list[str] = []

    for model_name in candidates:
        try:
            text = await _generate_once(prompt, model_name)
            if text:
                return text, model_name, None
            errors.append(f"{model_name}: empty response")
        except Exception as exc:
            logger.exception("Groq request failed for model %s", model_name)
            errors.append(f"{model_name}: {exc}")

    return None, None, "; ".join(errors) if errors else "Groq request failed"
