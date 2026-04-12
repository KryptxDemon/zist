import httpx
import html
import re

from app.core.config import settings


_WIKI_HEADERS = {
	"User-Agent": "Zist/1.0 (+https://zist.local)",
}


_THEME_SECTION_PATTERNS = (
	re.compile(r"\btheme[s]?\b", re.I),
	re.compile(r"\banalysis\b", re.I),
	re.compile(r"\binterpretation\b", re.I),
	re.compile(r"\bsymbolis[m|t]\b", re.I),
	re.compile(r"\bmeaning\b", re.I),
	re.compile(r"\blegacy\b", re.I),
	re.compile(r"\bstyle\b", re.I),
)


_THEME_EXTRACTION_PATTERNS = (
	re.compile(
		r"(?:explores|examines|deals with|addresses|focuses on|centers on|depicts|highlights|portrays|presents|reflects)\s+([^.;:]+)",
		re.I,
	),
	re.compile(r"(?:themes? (?:of|include|includes|are)|theme of)\s+([^.;:]+)", re.I),
	re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b"),
)


def _clean_theme_text(value: str) -> str:
	cleaned = re.sub(r"<[^>]+>", " ", value)
	cleaned = html.unescape(cleaned)
	cleaned = re.sub(r"\[[^\]]+\]", " ", cleaned)
	cleaned = re.sub(r"\s+", " ", cleaned)
	return cleaned.strip()


async def _fetch_json(url: str, params: dict | None = None) -> dict | list:
	async with httpx.AsyncClient(timeout=10, headers=_WIKI_HEADERS) as client:
		response = await client.get(url, params=params)
		response.raise_for_status()
	return response.json()


async def _fetch_extract_summary(page_title: str) -> str | None:
	url = "https://en.wikipedia.org/w/api.php"
	params = {
		"action": "query",
		"prop": "extracts",
		"exintro": 1,
		"explaintext": 1,
		"redirects": 1,
		"format": "json",
		"titles": page_title,
	}

	try:
		payload = await _fetch_json(url, params)
	except Exception:
		return None

	if not isinstance(payload, dict):
		return None

	pages = payload.get("query", {}).get("pages", {})
	if not isinstance(pages, dict):
		return None

	for page_data in pages.values():
		if isinstance(page_data, dict):
			extract = page_data.get("extract")
			if isinstance(extract, str) and extract.strip():
				return extract.strip()

	return None


async def _resolve_page_title(query: str) -> str | None:
	normalized = query.strip()
	if not normalized:
		return None

	url = "https://en.wikipedia.org/w/api.php"
	params = {
		"action": "opensearch",
		"search": normalized,
		"limit": 1,
		"namespace": 0,
		"format": "json",
	}

	try:
		payload = await _fetch_json(url, params)
	except Exception:
		return None

	if isinstance(payload, list) and len(payload) > 1 and isinstance(payload[1], list) and payload[1]:
		return str(payload[1][0]).strip() or None

	return normalized


async def _fetch_sections(page_title: str) -> list[dict]:
	url = "https://en.wikipedia.org/w/api.php"
	params = {
		"action": "parse",
		"page": page_title,
		"prop": "sections",
		"format": "json",
	}

	try:
		payload = await _fetch_json(url, params)
	except Exception:
		return []

	sections = payload.get("parse", {}).get("sections", []) if isinstance(payload, dict) else []
	return sections if isinstance(sections, list) else []


async def _fetch_section_text(page_title: str, section_index: str) -> str:
	url = "https://en.wikipedia.org/w/api.php"
	params = {
		"action": "parse",
		"page": page_title,
		"prop": "text",
		"section": section_index,
		"format": "json",
	}

	try:
		payload = await _fetch_json(url, params)
	except Exception:
		return ""

	text = payload.get("parse", {}).get("text", {}).get("*") if isinstance(payload, dict) else ""
	return _clean_theme_text(str(text)) if text else ""


def _extract_themes_from_text(text: str) -> list[str]:
	results: list[str] = []
	if not text:
		return results

	sentences = re.split(r"(?<=[.!?])\s+", text)
	for sentence in sentences:
		sentence = sentence.strip()
		if not sentence:
			continue
		for pattern in _THEME_EXTRACTION_PATTERNS[:2]:
			for match in pattern.finditer(sentence):
				candidate = _clean_theme_text(match.group(1))
				if candidate and len(candidate) <= 90:
					results.append(candidate)

	# Last-resort heuristic: use compact capitalized phrases from theme sections.
	if not results:
		for match in _THEME_EXTRACTION_PATTERNS[2].finditer(text):
			candidate = _clean_theme_text(match.group(1))
			if candidate and len(candidate) <= 60:
				results.append(candidate)

	unique: list[str] = []
	seen: set[str] = set()
	for item in results:
		key = item.lower()
		if key not in seen:
			seen.add(key)
			unique.append(item)
	return unique


async def get_summary(topic: str) -> dict:
	resolved_title = await _resolve_page_title(topic)
	page_title = (resolved_title or topic).strip()
	normalized = page_title.replace(" ", "_")
	url = f"{settings.WIKIPEDIA_API_BASE}/page/summary/{normalized}"

	try:
		async with httpx.AsyncClient(timeout=10, headers=_WIKI_HEADERS) as client:
			response = await client.get(url)
			response.raise_for_status()
		payload = response.json()
	except Exception:
		extract = await _fetch_extract_summary(page_title)
		return {
			"title": page_title,
			"summary": extract or "No summary available.",
			"source_url": f"https://en.wikipedia.org/wiki/{normalized}",
		}

	extract = payload.get("extract") if isinstance(payload, dict) else None
	if not isinstance(extract, str) or not extract.strip():
		extract = await _fetch_extract_summary(page_title)

	return {
		"title": payload.get("title") or page_title,
		"summary": extract or "No summary available.",
		"source_url": payload.get("content_urls", {}).get("desktop", {}).get("page")
		or f"https://en.wikipedia.org/wiki/{normalized}",
	}


async def get_suggestions(query: str) -> list[str]:
	page_title = await _resolve_page_title(query)
	if not page_title:
		return []

	sections = await _fetch_sections(page_title)
	target_section_indexes = [
		str(section.get("index"))
		for section in sections
		if any(pattern.search(str(section.get("line", ""))) for pattern in _THEME_SECTION_PATTERNS)
	]

	theme_candidates: list[str] = []
	for section_index in target_section_indexes:
		section_text = await _fetch_section_text(page_title, section_index)
		theme_candidates.extend(_extract_themes_from_text(section_text))

	# If Wikipedia does not expose a dedicated themes/analysis section, avoid inventing themes.
	if not theme_candidates:
		return []

	unique: list[str] = []
	seen: set[str] = set()
	for theme in theme_candidates:
		key = theme.lower()
		if key not in seen:
			seen.add(key)
			unique.append(theme)
		if len(unique) >= 6:
			break
	return unique
