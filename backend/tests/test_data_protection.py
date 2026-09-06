import os
import unittest
from unittest.mock import patch

from app.data_protection import PREFIX, protect_bytes, protect_text, unprotect_bytes, unprotect_text
from app.security import hash_password, password_needs_rehash, verify_password


class DataProtectionTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"DATA_ENCRYPTION_KEY": "test-data-encryption-key-longer-than-32-characters"})
        self.env.start()

    def tearDown(self):
        self.env.stop()

    def test_sensitive_text_round_trip_and_idempotence(self):
        protected = protect_text("20% disability rating")
        self.assertTrue(protected.startswith(PREFIX))
        self.assertNotIn("20% disability", protected)
        self.assertEqual(protect_text(protected), protected)
        self.assertEqual(unprotect_text(protected), "20% disability rating")

    def test_sensitive_file_round_trip(self):
        protected = protect_bytes(b"DD214 test data")
        self.assertNotIn(b"DD214 test data", protected)
        self.assertEqual(unprotect_bytes(protected), b"DD214 test data")

    def test_argon2id_is_default(self):
        stored = hash_password("strong-test-password")
        self.assertTrue(stored.startswith("$argon2id$"))
        self.assertTrue(verify_password("strong-test-password", stored))
        self.assertFalse(password_needs_rehash(stored))


if __name__ == "__main__":
    unittest.main()
