import asyncio

import httpx

from app.core.config import settings


def _image_url(path: str | None) -> str | None:
	if not path:
		return None
	return f"https://image.tmdb.org/t/p/w500{path}"


def _normalize_tmdb_item(
	item: dict,
	media_type: str,
	creator: str | None = None,
	genres: list[str] | None = None,
	rating: float | None = None,
) -> dict:
	title = item.get("title") or item.get("name") or "Untitled"
	date = item.get("release_date") or item.get("first_air_date") or ""
	year = int(date[:4]) if len(date) >= 4 and date[:4].isdigit() else None

	# /search/multi often returns genre_ids (ints). Fall back to those when we
	# don't have richer genre names from /movie/{id} or /tv/{id}.
	genre_ids = item.get("genre_ids")
	resolved_genres: list[str] = genres or []
	if not resolved_genres and isinstance(genre_ids, list):
		resolved_genres = [str(g) for g in genre_ids if g is not None]

	resolved_rating = rating
	if resolved_rating is None:
		vote_average = item.get("vote_average")
		if isinstance(vote_average, (int, float)):
			resolved_rating = float(vote_average)

	return {
		"title": title,
		"type": "documentary" if media_type == "movie" and "documentary" in title.lower() else media_type,
		"year": year,
		"creator": creator,
		"description": item.get("overview"),
		"cover_url": _image_url(item.get("poster_path")),
		"external_source": "tmdb",
		"external_id": str(item.get("id")),
		"genres": resolved_genres,
		"rating": resolved_rating,
	}


async def _tmdb_get_json(path: str, params: dict | None = None) -> dict | None:
	"""Generic GET against the TMDb v3 API. Returns the parsed JSON body or None."""
	if not settings.TMDB_API_KEY:
		return None
	url = f"{settings.TMDB_BASE_URL}{path}"
	merged = {"api_key": settings.TMDB_API_KEY, **(params or {})}
	try:
		async with httpx.AsyncClient(timeout=10) as client:
			response = await client.get(url, params=merged)
			response.raise_for_status()
		return response.json()
	except Exception:
		return None


async def _fetch_movie_creator(tmdb_id: str) -> str | None:
	"""Fetch the director of a movie via /movie/{id}/credits."""
	payload = await _tmdb_get_json(f"/movie/{tmdb_id}/credits")
	if not isinstance(payload, dict):
		return None
	for member in payload.get("crew") or []:
		if isinstance(member, dict) and member.get("job") == "Director":
			name = member.get("name")
			if isinstance(name, str) and name.strip():
				return name.strip()
	return None


async def _fetch_tv_creator(tmdb_id: str) -> str | None:
	"""Fetch the show creator(s) of a TV series via /tv/{id} (created_by[])."""
	payload = await _tmdb_get_json(f"/tv/{tmdb_id}")
	if not isinstance(payload, dict):
		return None
	names: list[str] = []
	for entry in payload.get("created_by") or []:
		if isinstance(entry, dict):
			name = entry.get("name")
			if isinstance(name, str) and name.strip():
				names.append(name.strip())
	return ", ".join(names) if names else None


async def _enrich_with_creator(item: dict, media_type: str) -> dict:
	"""Fetch creator/director + details in parallel, then return a normalized dict."""
	tmdb_id = item.get("id")
	if not tmdb_id or not settings.TMDB_API_KEY:
		return _normalize_tmdb_item(item, media_type)

	if media_type == "movie":
		creator_task = _fetch_movie_creator(str(tmdb_id))
		details_task = _tmdb_get_json(f"/movie/{tmdb_id}")
	else:
		creator_task = _fetch_tv_creator(str(tmdb_id))
		details_task = _tmdb_get_json(f"/tv/{tmdb_id}")

	creator, details = await asyncio.gather(creator_task, details_task)

	genres: list[str] = []
	rating: float | None = None
	if isinstance(details, dict):
		for g in details.get("genres") or []:
			if isinstance(g, dict):
				name = g.get("name")
				if isinstance(name, str) and name.strip():
					genres.append(name.strip())
		vote_average = details.get("vote_average")
		if isinstance(vote_average, (int, float)):
			rating = float(vote_average)

	return _normalize_tmdb_item(
		item, media_type, creator=creator, genres=genres, rating=rating
	)


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
	return [
		await _enrich_with_creator(item, "movie")
		for item in items[:20]
	]


async def search_tv(query: str) -> list[dict]:
	items = await _tmdb_get("/search/tv", query)
	return [
		await _enrich_with_creator(item, "tv")
		for item in items[:20]
	]


async def search_multi(query: str) -> list[dict]:
	items = await _tmdb_get("/search/multi", query)
	results = await asyncio.gather(
		*[
			_enrich_with_creator(item, item.get("media_type") or "movie")
			for item in items[:30]
			if item.get("media_type") in {"movie", "tv"}
		]
	)
	return list(results)


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
