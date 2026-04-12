from fastapi import APIRouter

from app.api.api_v1.endpoints import (
	auth,
	external,
	facts,
	feed,
	insights,
	media,
	quotes,
	quiz,
	themes,
	users,
	vocab,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(media.router, tags=["Media"])
api_router.include_router(themes.router, tags=["Themes"])
api_router.include_router(facts.router, tags=["Facts"])
api_router.include_router(vocab.router, tags=["Vocab"])
api_router.include_router(quotes.router, tags=["Quotes"])
api_router.include_router(users.router, tags=["Users"])
api_router.include_router(feed.router, tags=["Feed"])
api_router.include_router(quiz.router, tags=["Quiz"])
api_router.include_router(external.router, tags=["External"])
api_router.include_router(insights.router, tags=["Insights"])