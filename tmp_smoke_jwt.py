"""Verify PyJWT can load the Neon JWKS key and validate a synthetic Ed25519 token.

This exercises the same PyJWK-loading code path that deps._verify_with_jwks uses.
"""
import base64
import time

import httpx
import jwt
from cryptography.hazmat.primitives.asymmetric import ed25519

jwks_url = (
    "https://ep-late-rain-a155ghlc.neonauth.ap-southeast-1.aws.neon.tech"
    "/neondb/auth/.well-known/jwks.json"
)
keys = httpx.get(jwks_url, timeout=10.0).json()["keys"]
print("Neon JWKS algorithms:", [k.get("alg") for k in keys])

ed_key = next(k for k in keys if k.get("alg") == "EdDSA")
neon_pub = jwt.PyJWK(ed_key).key
print("Loaded Neon public key type:", type(neon_pub).__name__)

# Round-trip: sign with a freshly generated private key, then verify using a
# matching JWK we built by hand (mirroring Neon's JWK shape).
priv = ed25519.Ed25519PrivateKey.generate()
pub_bytes = priv.public_key().public_bytes_raw()  # 32 raw bytes for Ed25519

okp_pub = {
    "kty": "OKP",
    "crv": "Ed25519",
    "alg": "EdDSA",
    "use": "sig",
    "kid": ed_key["kid"],
    "x": base64.urlsafe_b64encode(pub_bytes).rstrip(b"=").decode("ascii"),
}
local_pub = jwt.PyJWK(okp_pub).key
print("Loaded local public key type:", type(local_pub).__name__)

now = int(time.time())
payload = {
    "sub": "test-user",
    "email": "x@y.z",
    "email_verified": True,
    "iat": now,
    "exp": now + 600,
}
token = jwt.encode(payload, priv, algorithm="EdDSA", headers={"kid": ed_key["kid"]})
print("Signed token len:", len(token))

claims = jwt.decode(
    token,
    local_pub,
    algorithms=["EdDSA"],
    options={"require": ["exp", "sub"]},
)
print("Verified claims sub:", claims["sub"])
print("PyJWT can verify Neon JWTs end-to-end.")

from app.core.deps import JWKS_ALGORITHMS  # noqa: E402

assert "EdDSA" in JWKS_ALGORITHMS, JWKS_ALGORITHMS
print("deps.JWKS_ALGORITHMS contains EdDSA:", JWKS_ALGORITHMS)
