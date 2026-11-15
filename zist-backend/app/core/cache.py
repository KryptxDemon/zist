import time
import threading
from typing import Any, Optional, Dict, Tuple

class SimpleMemoryCache:
    """Thread-safe in-memory TTL cache with prefix invalidation."""

    def __init__(self, default_ttl: int = 60):
        self._default_ttl = default_ttl
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        now = time.time()
        with self._lock:
            entry = self._cache.get(key)
            if not entry:
                return None
            expires_at, value = entry
            if now > expires_at:
                self._cache.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        now = time.time()
        expires_at = now + (ttl if ttl is not None else self._default_ttl)
        with self._lock:
            # Prevent boundless growth: clean expired if cache grows large
            if len(self._cache) > 5000:
                expired_keys = [k for k, (exp, _) in self._cache.items() if now > exp]
                for k in expired_keys:
                    self._cache.pop(k, None)
            self._cache[key] = (expires_at, value)

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._cache.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> None:
        with self._lock:
            keys_to_remove = [k for k in self._cache if k.startswith(prefix)]
            for k in keys_to_remove:
                self._cache.pop(k, None)

    def invalidate_user(self, user_id: str) -> None:
        self.invalidate_prefix(f"user:{user_id}:")

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()

cache = SimpleMemoryCache(default_ttl=60)
