import asyncio

import httpx

from app.core.config import settings


def _coerce_description(value) -> str | None:
	"""OpenLibrary sometimes returns descriptions as a plain string, sometimes
	as a dict like {"type": "/type/text", "value": "..."}. Normalize to a string."""
	if value is None:
		return None
	if isinstance(value, str):
		cleaned = value.strip()
		return cleaned or None
	if isinstance(value, dict):
		for key in ("value", "description"):
			nested = value.get(key)
			if isinstance(nested, str) and nested.strip():
				return nested.strip()
	return None


async def _fetch_work_description(work_key: str | None) -> str | None:
	"""Fetch the description for a given OpenLibrary work key (e.g. '/works/OL...W')."""
	if not work_key:
		return None
	key = work_key if work_key.startswith("/") else f"/{work_key}"
	url = f"{settings.OPENLIBRARY_BASE_URL}{key}.json"
	try:
		async with httpx.AsyncClient(timeout=10) as client:
			response = await client.get(
				url,
				headers={"User-Agent": "Zist/1.0 (+https://zist.local)"},
			)
			response.raise_for_status()
		payload = response.json()
	except Exception:
		return None
	if not isinstance(payload, dict):
		return None
	return _coerce_description(payload.get("description"))


def _normalize_book(
	doc: dict,
	description: str | None = None,
	subjects: list[str] | None = None,
) -> dict:
	cover_id = doc.get("cover_i")
	cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None
	authors = doc.get("author_name") or []

	raw_subjects = doc.get("subject")
	resolved_subjects: list[str] = []
	if isinstance(subjects, list):
		resolved_subjects = [str(s).strip() for s in subjects if str(s).strip()]
	elif isinstance(raw_subjects, list):
		resolved_subjects = [str(s).strip() for s in raw_subjects if str(s).strip()]

	return {
		"title": doc.get("title") or "Untitled",
		"type": "book",
		"year": doc.get("first_publish_year"),
		"creator": ", ".join(authors) if authors else None,
		"description": description,
		"cover_url": cover_url,
		"external_source": "openlibrary",
		"external_id": doc.get("key"),
		"work_id": doc.get("key"),
		"edition_keys": doc.get("edition_key") or [],
		"subjects": resolved_subjects[:8],
	}


async def _search_openlibrary(params: dict) -> list[dict]:
	url = f"{settings.OPENLIBRARY_BASE_URL}/search.json"
	try:
		async with httpx.AsyncClient(timeout=10) as client:
			response = await client.get(
				url,
				params=params,
				headers={"User-Agent": "Zist/1.0 (+https://zist.local)"},
			)
			response.raise_for_status()
		payload = response.json()
	except Exception:
		return []

	docs = payload.get("docs", []) if isinstance(payload, dict) else []
	return docs if isinstance(docs, list) else []


def _normalize_google_book(item: dict) -> dict:
	volume = item.get("volumeInfo", {}) if isinstance(item, dict) else {}
	image_links = volume.get("imageLinks", {}) if isinstance(volume, dict) else {}
	title = str(volume.get("title") or "Untitled")
	authors = volume.get("authors") or []
	categories = volume.get("categories") or []
	published_date = str(volume.get("publishedDate") or "")
	year = None
	if len(published_date) >= 4 and published_date[:4].isdigit():
		year = int(published_date[:4])

	subjects = [str(c).strip() for c in categories if isinstance(c, str) and c.strip()]

	return {
		"title": title,
		"type": "book",
		"year": year,
		"creator": ", ".join(authors) if isinstance(authors, list) and authors else None,
		"description": _coerce_description(volume.get("description")),
		"cover_url": image_links.get("thumbnail") or image_links.get("smallThumbnail"),
		"external_source": "google_books",
		"external_id": item.get("id"),
		"work_id": None,
		"edition_keys": [],
		"subjects": subjects[:8],
	}


async def _search_google_books(query: str) -> list[dict]:
	url = "https://www.googleapis.com/books/v1/volumes"
	params = {
		"q": query,
		"maxResults": 20,
		"printType": "books",
	}

	try:
		async with httpx.AsyncClient(timeout=10) as client:
			response = await client.get(url, params=params)
			response.raise_for_status()
		payload = response.json()
	except Exception:
		return []

	items = payload.get("items", []) if isinstance(payload, dict) else []
	if not isinstance(items, list):
		return []
	return [_normalize_google_book(item) for item in items[:20]]


async def _enrich_books(docs: list[dict]) -> list[str | None]:
	"""Fetch descriptions in parallel for each OpenLibrary work key."""
	if not docs:
		return []
	tasks = [_fetch_work_description(doc.get("key")) for doc in docs]
	return await asyncio.gather(*tasks)


async def search_books(query: str) -> list[dict]:
	normalized = query.strip()
	if not normalized:
		return []

	search_attempts = [
		{"q": normalized},
		{"title": normalized},
		{"q": normalized.replace(" ", "")},
	]

	for params in search_attempts:
		docs = await _search_openlibrary({**params, "limit": 20})
		if docs:
			limited = docs[:20]
			descriptions = await _enrich_books(limited)
			return [
				_normalize_book(doc, description=description)
				for doc, description in zip(limited, descriptions)
			]

	google_books = await _search_google_books(normalized)
	if google_books:
		return google_books

	return []
