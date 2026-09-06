from __future__ import annotations

import hashlib
import json
import logging
import os
import secrets
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Iterable

from fastapi import Request
from fastapi.responses import JSONResponse
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError


security_logger = logging.getLogger("valorbuddy.security")


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class SecuritySettings:
    environment: str
    enforce_config: bool
    force_https: bool
    max_body_bytes: int
    request_limit_per_minute: int
    auth_limit_per_15_minutes: int
    allowed_hosts: tuple[str, ...]

    @classmethod
    def from_env(cls) -> "SecuritySettings":
        environment = os.getenv("ENVIRONMENT", "development").strip().lower()
        return cls(
            environment=environment,
            enforce_config=env_bool("SECURITY_ENFORCE_CONFIG", environment == "production"),
            force_https=env_bool("FORCE_HTTPS", environment == "production"),
            max_body_bytes=max(1_048_576, int(os.getenv("MAX_REQUEST_BODY_BYTES", "10485760"))),
            request_limit_per_minute=max(30, int(os.getenv("REQUEST_LIMIT_PER_MINUTE", "300"))),
            auth_limit_per_15_minutes=max(3, int(os.getenv("AUTH_LIMIT_PER_15_MINUTES", "10"))),
            allowed_hosts=tuple(x.strip().lower() for x in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",") if x.strip()),
        )


def configuration_findings(settings: SecuritySettings, secret_key: str, cors_origins: str) -> list[str]:
    findings: list[str] = []
    if settings.environment == "production":
        if secret_key in {"", "dev-change-me-valorbuddy", "dev-only-change-me-valorbuddy-32-bytes"} or len(secret_key) < 32:
            findings.append("Production SECRET_KEY must be random and at least 32 characters.")
        if cors_origins.strip() == "*":
            findings.append("Production CORS_ORIGINS must list approved origins; wildcard is forbidden.")
        if not settings.allowed_hosts or "*" in settings.allowed_hosts:
            findings.append("Production ALLOWED_HOSTS must list approved hosts.")
        data_key = os.getenv("DATA_ENCRYPTION_KEY", "")
        if len(data_key) < 32:
            findings.append("Production DATA_ENCRYPTION_KEY must be random and at least 32 characters.")
        if data_key and data_key == secret_key:
            findings.append("DATA_ENCRYPTION_KEY must be separate from SECRET_KEY.")
    return findings


def emit_security_event(event: str, request: Request | None = None, **details: object) -> None:
    payload = {
        "event_type": "valorbuddy_security",
        "event": event,
        "environment": os.getenv("ENVIRONMENT", "development"),
        "timestamp": int(time.time()),
        **details,
    }
    if request is not None:
        payload.update({
            "request_id": getattr(request.state, "request_id", ""),
            "method": request.method,
            "path": request.url.path,
            "client_ip": client_ip(request),
        })
    security_logger.warning(json.dumps(payload, separators=(",", ":"), default=str))


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    return forwarded or (request.client.host if request.client else "unknown")


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            events = self._events[key]
            while events and events[0] < cutoff:
                events.popleft()
            if len(events) >= limit:
                retry_after = max(1, int(window_seconds - (now - events[0])))
                return False, retry_after
            events.append(now)
            return True, 0


limiter = SlidingWindowLimiter()
AUTH_PATHS = {"/auth/login", "/auth/register", "/auth/partner/login", "/auth/partner/register", "/auth/forgot-password", "/auth/reset-password", "/auth/mfa/setup", "/auth/mfa/confirm"}


async def security_middleware(request: Request, call_next, settings: SecuritySettings):
    request.state.request_id = request.headers.get("x-request-id") or secrets.token_hex(12)
    path = request.url.path
    ip = client_ip(request)

    if settings.force_https and request.headers.get("x-forwarded-proto", request.url.scheme) != "https" and path != "/health":
        emit_security_event("https_required", request)
        return JSONResponse({"detail": "HTTPS is required"}, status_code=400)

    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > settings.max_body_bytes:
        emit_security_event("request_body_rejected", request, content_length=int(content_length))
        return JSONResponse({"detail": "Request body is too large"}, status_code=413)

    if path in AUTH_PATHS:
        allowed, retry_after = limiter.allow(f"auth:{ip}", settings.auth_limit_per_15_minutes, 900)
    else:
        allowed, retry_after = limiter.allow(f"request:{ip}", settings.request_limit_per_minute, 60)
    if not allowed:
        emit_security_event("rate_limit_exceeded", request)
        return JSONResponse({"detail": "Too many requests. Try again later."}, status_code=429, headers={"Retry-After": str(retry_after)})

    response = await call_next(request)
    if path in AUTH_PATHS and response.status_code >= 400:
        emit_security_event("authentication_rejected", request, status_code=response.status_code)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(self), microphone=(self), payment=(), usb=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    if settings.force_https:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Cache-Control"] = "no-store" if path.startswith(("/auth", "/admin", "/api")) else "no-cache"
    return response


PASSWORD_HASHER = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, hash_len=32, salt_len=16)


def hash_password(password: str, iterations: int = 600_000) -> str:
    del iterations
    return PASSWORD_HASHER.hash(password)


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("$argon2id$"):
        try:
            return PASSWORD_HASHER.verify(stored, password)
        except (VerifyMismatchError, InvalidHashError):
            return False
    try:
        parts = stored.split("$")
        if len(parts) == 4:
            algo, iteration_text, salt, digest = parts
            iterations = int(iteration_text)
        elif len(parts) == 3:
            algo, salt, digest = parts
            iterations = 120_000
        else:
            return False
        if algo != "pbkdf2_sha256" or not 100_000 <= iterations <= 2_000_000:
            return False
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations).hex()
        return secrets.compare_digest(candidate, digest)
    except Exception:
        return False


def password_needs_rehash(stored: str) -> bool:
    if not stored.startswith("$argon2id$"):
        return True
    try:
        return PASSWORD_HASHER.check_needs_rehash(stored)
    except InvalidHashError:
        return True


def redact_keys(payload: dict, sensitive: Iterable[str] = ("password", "token", "secret", "api_key", "authorization")) -> dict:
    blocked = {key.lower() for key in sensitive}
    return {key: ("[REDACTED]" if key.lower() in blocked else value) for key, value in payload.items()}
