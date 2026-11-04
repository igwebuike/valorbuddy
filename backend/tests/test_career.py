import os
import unittest
from fastapi.testclient import TestClient

os.environ["ENVIRONMENT"] = "development"
os.environ["DATABASE_URL"] = "sqlite:///./valorbuddy.db"
os.environ["SECRET_KEY"] = "dev-secret-key-valorbuddy-local-development-32-chars"
os.environ["DATA_ENCRYPTION_KEY"] = "dev-data-key-valorbuddy-local-development-32-chars"

from app.main import app, SessionLocal, User, UserProfile, hash_password

class CareerRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        db = SessionLocal()
        # Find or create a test user
        email = "career.test.user@valorbuddyconnect.com"
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                password_hash=hash_password("TestPassword123!"),
                role="veteran",
                approval_status="approved",
                is_active=True
            )
            db.add(user)
            db.flush()
            profile = UserProfile(
                user_id=user.id,
                first_name="Test",
                last_name="Veteran",
                branch="Army",
                rank="E-6 Staff Sergeant",
                service_status="Veteran",
                city="Austin",
                state="TX",
                military_mos="25B Information Technology Specialist",
                military_job_title="Communications Supervisor",
                military_experience="10 years supervising tactical network infrastructure",
                civilian_career_goal="Senior Network Operations Manager"
            )
            db.add(profile)
            db.commit()
            db.refresh(user)
        cls.user_id = user.id

        # User without profile
        noprofile_email = "noprofile.test@valorbuddyconnect.com"
        np_user = db.query(User).filter(User.email == noprofile_email).first()
        if not np_user:
            np_user = User(
                email=noprofile_email,
                password_hash=hash_password("TestPassword123!"),
                role="veteran",
                approval_status="approved",
                is_active=True
            )
            db.add(np_user)
            db.commit()
            db.refresh(np_user)
        cls.np_user_id = np_user.id
        db.close()

        # Login standard user
        resp = cls.client.post("/auth/login", json={
            "email": email,
            "password": "TestPassword123!"
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        cls.token = resp.json()["token"]
        cls.auth_headers = {"Authorization": f"Bearer {cls.token}"}

        # Login no-profile user
        resp_np = cls.client.post("/auth/login", json={
            "email": noprofile_email,
            "password": "TestPassword123!"
        })
        assert resp_np.status_code == 200
        cls.np_token = resp_np.json()["token"]
        cls.np_auth_headers = {"Authorization": f"Bearer {cls.np_token}"}

    def test_01_unauthenticated_generate(self):
        resp = self.client.post("/api/career/generate", json={
            "document_type": "resume",
            "target": "Operations Manager"
        })
        self.assertEqual(resp.status_code, 401)

    def test_02_invalid_payload_validation(self):
        # Invalid document type
        resp = self.client.post("/api/career/generate", headers=self.auth_headers, json={
            "document_type": "invalid_type",
            "target": "Operations Manager"
        })
        self.assertEqual(resp.status_code, 422)

        # Target too short
        resp = self.client.post("/api/career/generate", headers=self.auth_headers, json={
            "document_type": "resume",
            "target": "a"
        })
        self.assertEqual(resp.status_code, 422)

        # Missing target
        resp = self.client.post("/api/career/generate", headers=self.auth_headers, json={
            "document_type": "resume"
        })
        self.assertEqual(resp.status_code, 422)

    def test_03_successful_generate_all_types(self):
        for doc_type, expected_title_part in [
            ("resume", "Civilian Resume"),
            ("cover_letter", "Cover Letter"),
            ("career_plan", "Career Transition Plan"),
            ("business_plan", "Veteran Business Plan")
        ]:
            resp = self.client.post("/api/career/generate", headers=self.auth_headers, json={
                "document_type": doc_type,
                "target": f"Target for {doc_type}",
                "notes": "Testing notes"
            })
            self.assertEqual(resp.status_code, 200, f"Failed for {doc_type}: {resp.text}")
            data = resp.json()
            self.assertEqual(data["document_type"], doc_type)
            self.assertIn(expected_title_part, data["title"])
            self.assertTrue(len(data["content"]) > 30)
            self.assertIn("created_at", data)
            self.assertTrue(isinstance(data["created_at"], str))

    def test_04_user_without_profile_auto_initializes(self):
        # User who signed up without completing profile shouldn't crash or get blocked
        resp = self.client.post("/api/career/generate", headers=self.np_auth_headers, json={
            "document_type": "resume",
            "target": "Logistics Lead"
        })
        self.assertEqual(resp.status_code, 200, f"Auto-profile failed: {resp.text}")
        data = resp.json()
        self.assertEqual(data["target"], "Logistics Lead")

    def test_05_list_career_documents(self):
        resp = self.client.get("/api/career/documents", headers=self.auth_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) >= 4)
        for doc in data:
            self.assertIn("id", doc)
            self.assertIn("title", doc)
            self.assertIn("content", doc)
            self.assertIn("status", doc)
            self.assertIn("created_at", doc)
            self.assertTrue(isinstance(doc["created_at"], str))

if __name__ == "__main__":
    unittest.main()
