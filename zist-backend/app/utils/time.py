"""Centralized time helpers.

All timestamps in Zist are stored and exchanged as UTC. The helper in this
module is the single source of truth for "now in UTC" and should be used by
every SQLAlchemy default/onupdate callable instead of the deprecated
``datetime.utcnow()`` (which is being removed in Python 3.12+ and which
produces a naive datetime that loses timezone information on serialization).
"""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Return the current instant as a timezone-aware UTC ``datetime``.

    The returned value carries ``tzinfo=timezone.utc`` so JSON serializers
    (Pydantic, FastAPI) emit ISO 8601 strings with an explicit ``+00:00``
    offset, allowing the frontend to interpret the instant unambiguously.
    """

    return datetime.now(timezone.utc)