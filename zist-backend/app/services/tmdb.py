import httpx

from app.core.config import settings


def _image_url(path: str | None) -> str | None:
	if not path:
		return None
	return f"https://image.tmdb.org/t/p/w500{path}"


def _normalize_tmdb_item(item: dict, media_type: str) -> dict:
	title = item.get("title") or item.get("name") or "Untitled"
	date = item.get("release_date") or item.get("first_air_date") or ""
	year = int(date[:4]) if len(date) >= 4 and date[:4].isdigit() else None

	return {
		"title": title,
		"type": "documentary" if media_type == "movie" and "documentary" in title.lower() else media_type,
		"year": year,
		"creator": None,
		"description": item.get("overview"),
		"cover_url": _image_url(item.get("poster_path")),
		"external_source": "tmdb",
		"external_id": str(item.get("id")),
	}


async def _tmdb_get(path: str, query: str) -> list[dict]:
	if not settings.TMDB_API_KEY:
		return []
	url = f"{settings.TMDB_BASE_URL}{path}"
	params = {"api_key": settings.TMDB_API_KEY, "query": query}

	try:
		async with httpx.AsyncClient(timeout=10) as client:
			response = await client.get(url, params=params)
			response.raise_for_status()
		payload = response.json()
		return payload.get("results", [])
	except Exception:
		return []


async def search_movies(query: str) -> list[dict]:
	items = await _tmdb_get("/search/movie", query)
	return [_normalize_tmdb_item(item, "movie") for item in items[:20]]


async def search_tv(query: str) -> list[dict]:
	items = await _tmdb_get("/search/tv", query)
	return [_normalize_tmdb_item(item, "tv") for item in items[:20]]


async def search_multi(query: str) -> list[dict]:
	items = await _tmdb_get("/search/multi", query)
	normalized = []
	for item in items[:30]:
		media_type = item.get("media_type")
		if media_type == "movie":
			normalized.append(_normalize_tmdb_item(item, "movie"))
		elif media_type == "tv":
			normalized.append(_normalize_tmdb_item(item, "tv"))
	return normalized
