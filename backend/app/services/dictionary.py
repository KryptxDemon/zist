import httpx

from app.core.config import settings


async def lookup_word(word: str) -> dict:
    url = f"{settings.DICTIONARY_API_BASE}/{word.strip()}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url)
            response.raise_for_status()
        payload = response.json()
    except Exception:
        return {
            "word": word,
            "part_of_speech": None,
            "definition": None,
            "example_sentence": None,
        }

    if not payload or not isinstance(payload, list):
        return {
            "word": word,
            "part_of_speech": None,
            "definition": None,
            "example_sentence": None,
        }

    entry = payload[0] if payload else {}
    meanings = entry.get("meanings", [])
    first_meaning = meanings[0] if meanings else {}
    definitions = first_meaning.get("definitions", []) if first_meaning else []
    first_def = definitions[0] if definitions else {}

    return {
        "word": entry.get("word") or word,
        "part_of_speech": first_meaning.get("partOfSpeech"),
        "definition": first_def.get("definition"),
        "example_sentence": first_def.get("example"),
    }
