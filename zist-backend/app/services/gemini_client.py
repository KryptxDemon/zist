import logging

import httpx

from app.core.config import settings


logger = logging.getLogger(__name__)


def _build_payload(prompt: str) -> dict:
    return {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "systemInstruction": {
            "parts": [{"text": "Return only the requested content. Do not add markdown or commentary."}],
        },
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048,
        },
    }


async def _generate_once(prompt: str, model_name: str) -> str:
    url = f"{settings.GEMINI_API_URL.rstrip('/')}/{model_name}:generateContent"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            params={"key": settings.GEMINI_API_KEY},
            headers={"Content-Type": "application/json"},
            json=_build_payload(prompt),
        )
        response.raise_for_status()

    payload = response.json()
    candidates = payload.get("candidates", []) if isinstance(payload, dict) else []
    content = candidates[0].get("content", {}) if candidates else {}
    parts = content.get("parts", []) if isinstance(content, dict) else []
    text = "".join(str(part.get("text", "")) for part in parts if isinstance(part, dict))
    return text.strip()


async def generate_gemini_text(
    prompt: str,
    model_names: list[str] | None = None,
) -> tuple[str | None, str | None, str | None]:
    """Call Gemini with an ordered model list and return the first response."""
    if not settings.GEMINI_API_KEY:
        return None, None, "Gemini API key is not configured"
    if not settings.GEMINI_API_KEY.startswith("AIza"):
        return None, None, "GEMINI_API_KEY does not look like a Google AI Studio key; replace the old Groq key"

    candidates = list(model_names) if model_names else settings.gemini_model_chain
    if not candidates:
        return None, None, "No Gemini models configured"

    errors: list[str] = []
    for model_name in candidates:
        try:
            text = await _generate_once(prompt, model_name)
            if text:
                return text, model_name, None
            errors.append(f"{model_name}: empty response")
        except Exception as exc:
            logger.exception("Gemini request failed for model %s", model_name)
            errors.append(f"{model_name}: {exc}")

    return None, None, "; ".join(errors) if errors else "Gemini request failed"