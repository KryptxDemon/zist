from collections.abc import Sequence
from typing import Any


def paginate(query, page: int = 1, limit: int = 20) -> dict[str, Any]:
    page = max(1, page)
    limit = max(1, min(limit, 100))

    total = query.count()
    items: Sequence[Any] = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "items": list(items),
        "total": total,
        "page": page,
        "limit": limit,
    }
