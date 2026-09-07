from __future__ import annotations

import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken


PREFIX = "enc:v1:"


def _cipher() -> Fernet:
    material = os.getenv("DATA_ENCRYPTION_KEY", "")
    if not material:
        material = os.getenv("SECRET_KEY", "")
    if not material:
        raise RuntimeError("DATA_ENCRYPTION_KEY is required")
    key = base64.urlsafe_b64encode(hashlib.sha256(material.encode()).digest())
    return Fernet(key)


def protect_text(value: str | None) -> str:
    text = value or ""
    if not text or text.startswith(PREFIX):
        return text
    return PREFIX + _cipher().encrypt(text.encode()).decode()


def unprotect_text(value: str | None) -> str:
    text = value or ""
    if not text.startswith(PREFIX):
        return text
    try:
        return _cipher().decrypt(text[len(PREFIX):].encode()).decode()
    except InvalidToken as exc:
        raise RuntimeError("Protected data cannot be decrypted with the configured key") from exc


def protect_bytes(value: bytes) -> bytes:
    if value.startswith(PREFIX.encode()):
        return value
    return PREFIX.encode() + _cipher().encrypt(value)


def unprotect_bytes(value: bytes) -> bytes:
    if not value.startswith(PREFIX.encode()):
        return value
    try:
        return _cipher().decrypt(value[len(PREFIX):])
    except InvalidToken as exc:
        raise RuntimeError("Protected file cannot be decrypted with the configured key") from exc
