import httpx

from app.core.config import settings


def _normalize_book(doc: dict) -> dict:
	cover_id = doc.get("cover_i")
	cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None
	authors = doc.get("author_name") or []

	return {
		"title": doc.get("title") or "Untitled",
		"type": "book",
		"year": doc.get("first_publish_year"),
		"creator": ", ".join(authors) if authors else None,
		"description": None,
		"cover_url": cover_url,
		"external_source": "openlibrary",
		"external_id": doc.get("key"),
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
	published_date = str(volume.get("publishedDate") or "")
	year = None
	if len(published_date) >= 4 and published_date[:4].isdigit():
		year = int(published_date[:4])

	return {
		"title": title,
		"type": "book",
		"year": year,
		"creator": ", ".join(authors) if isinstance(authors, list) and authors else None,
		"description": volume.get("description"),
		"cover_url": image_links.get("thumbnail") or image_links.get("smallThumbnail"),
		"external_source": "google_books",
		"external_id": item.get("id"),
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
			return [_normalize_book(doc) for doc in docs[:20]]

	google_books = await _search_google_books(normalized)
	if google_books:
		return google_books

	return []
