from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.api.api_v1.api import api_router
from app.core.config import settings
from app.core.database import Base, engine, ensure_user_profile_columns
from app.models import *

logger = logging.getLogger("zist.server")


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="Zist backend API built with FastAPI",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        # Log the full traceback so Render/operators can see the *real* failure
        # instead of an opaque 500. Return a generic 500 to the client so we
        # don't leak internal paths or claim shapes.
        logger.exception(
            "unhandled_exception",
            extra={"path": request.url.path, "method": request.method},
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    app.include_router(api_router, prefix=settings.API_V1_STR)

    @app.get("/", tags=["Root"])
    def root():
        return {
            "message": "Welcome to Zist API",
            "docs": "/docs",
            "version": settings.VERSION,
        }

    @app.get("/health", tags=["Health"])
    def health_check():
        return {
            "status": "ok",
            "project": settings.PROJECT_NAME,
            "version": settings.VERSION,
        }

    @app.get("/healthz", tags=["Health"])
    def health_check_probe():
        return {
            "status": "ok",
            "project": settings.PROJECT_NAME,
            "version": settings.VERSION,
        }

    Base.metadata.create_all(bind=engine)
    ensure_user_profile_columns()
    return app


app = create_application()
