"""Test deployed backend /auth/me with various auth states."""
import sys
import httpx

BASE = "https://zist-g4h2.onrender.com/api/v1"

# 1. No auth header — FastAPI HTTPBearer should return 403 "Not authenticated"
r = httpx.get(f"{BASE}/auth/me", timeout=60)
print("=== No auth header ===")
print("status:", r.status_code)
print("body:", r.text[:200])
print()

# 2. Junk bearer — should hit deps.get_current_user -> 401
r = httpx.get(f"{BASE}/auth/me", headers={"Authorization": "Bearer xx.yy.zz"}, timeout=60)
print("=== Junk bearer ===")
print("status:", r.status_code)
print("body:", r.text[:200])
print()

# 3. JWT with HS256 but wrong secret — should hit deps.get_current_user -> 401
import jwt, time
now = int(time.time())
bad_token = jwt.encode({"sub": "fake-user-id", "type": "access", "iat": now, "exp": now + 600}, "wrong-secret", algorithm="HS256")
r = httpx.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {bad_token}"}, timeout=60)
print("=== HS256 wrong-secret token ===")
print("status:", r.status_code)
print("body:", r.text[:200])