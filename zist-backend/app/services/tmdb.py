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


async def get_movie_by_tmdb_id(tmdb_id: str) -> dict | None:
	if not settings.TMDB_API_KEY:
		return None

	url = f"{settings.TMDB_BASE_URL}/movie/{tmdb_id}"
	params = {"api_key": settings.TMDB_API_KEY}

	try:
		async with httpx.AsyncClient(timeout=10) as client:
			response = await client.get(url, params=params)
			response.raise_for_status()
		return response.json()
	except Exception:
		return None


async def get_movie_keywords(tmdb_id: str) -> list[str]:
	if not settings.TMDB_API_KEY:
		return []

	url = f"{settings.TMDB_BASE_URL}/movie/{tmdb_id}/keywords"
	params = {"api_key": settings.TMDB_API_KEY}

	try:
		async with httpx.AsyncClient(timeout=10) as client:
			response = await client.get(url, params=params)
			response.raise_for_status()
		payload = response.json()
		keywords = payload.get("keywords", []) if isinstance(payload, dict) else []
		results: list[str] = []
		for keyword in keywords:
			name = keyword.get("name") if isinstance(keyword, dict) else None
			if isinstance(name, str) and name.strip():
				results.append(name.strip())
		return results
	except Exception:
		return []


async def get_movie_themes_payload(query: str, tmdb_id: str | None = None) -> dict | None:
	movie_data: dict | None = None

	if tmdb_id:
		movie_data = await get_movie_by_tmdb_id(tmdb_id)

	if not movie_data:
		results = await _tmdb_get("/search/movie", query)
		if not results:
			return None
		first = results[0]
		resolved_id = first.get("id")
		if resolved_id is None:
			return None
		movie_data = await get_movie_by_tmdb_id(str(resolved_id))

	if not movie_data:
		return None

	movie_id = movie_data.get("id")
	keywords = await get_movie_keywords(str(movie_id)) if movie_id is not None else []

	return {
		"tmdb_id": str(movie_id) if movie_id is not None else None,
		"title": movie_data.get("title") or query,
		"overview": movie_data.get("overview") or "",
		"keywords": keywords,
	}
