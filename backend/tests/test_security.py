import os
import unittest
from unittest.mock import patch

from app.security import SecuritySettings, SlidingWindowLimiter, configuration_findings, hash_password, verify_password


class SecurityTests(unittest.TestCase):
    def test_password_hash_is_salted_and_verifies(self):
        first = hash_password("correct horse battery staple")
        second = hash_password("correct horse battery staple")
        self.assertNotEqual(first, second)
        self.assertTrue(verify_password("correct horse battery staple", first))
        self.assertFalse(verify_password("incorrect", first))

    def test_legacy_hash_remains_valid(self):
        import hashlib
        salt = "00112233445566778899aabbccddeeff"
        digest = hashlib.pbkdf2_hmac("sha256", b"legacy-pass", salt.encode(), 120_000).hex()
        self.assertTrue(verify_password("legacy-pass", f"pbkdf2_sha256${salt}${digest}"))

    def test_production_rejects_unsafe_config(self):
        env = {
            "ENVIRONMENT": "production",
            "SECURITY_ENFORCE_CONFIG": "true",
            "FORCE_HTTPS": "true",
            "ALLOWED_HOSTS": "*",
        }
        with patch.dict(os.environ, env, clear=False):
            settings = SecuritySettings.from_env()
        findings = configuration_findings(settings, "short", "*")
        self.assertGreaterEqual(len(findings), 4)

    def test_rate_limit_blocks_after_limit(self):
        limiter = SlidingWindowLimiter()
        self.assertTrue(limiter.allow("client", 2, 60)[0])
        self.assertTrue(limiter.allow("client", 2, 60)[0])
        self.assertFalse(limiter.allow("client", 2, 60)[0])


if __name__ == "__main__":
    unittest.main()
