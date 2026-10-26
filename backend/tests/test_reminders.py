import os
import unittest
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.main import reminder_due_at, reminder_status, Reminder


class ReminderTests(unittest.TestCase):
    def test_reminder_due_at_standard_24h(self):
        due = reminder_due_at("2026-11-05", "14:00", "UTC")
        self.assertIsNotNone(due)
        self.assertEqual(due.year, 2026)
        self.assertEqual(due.month, 11)
        self.assertEqual(due.day, 5)
        self.assertEqual(due.hour, 14)
        self.assertEqual(due.minute, 0)
        self.assertEqual(due.tzinfo, timezone.utc)

    def test_reminder_due_at_single_digit_hour(self):
        due = reminder_due_at("2026-11-05", "9:00", "UTC")
        self.assertIsNotNone(due)
        self.assertEqual(due.hour, 9)
        self.assertEqual(due.minute, 0)

    def test_reminder_due_at_12h_am_pm(self):
        due_pm = reminder_due_at("2026-11-05", "2:30 PM", "UTC")
        self.assertIsNotNone(due_pm)
        self.assertEqual(due_pm.hour, 14)
        self.assertEqual(due_pm.minute, 30)

        due_am = reminder_due_at("2026-11-05", "9:15 am", "UTC")
        self.assertIsNotNone(due_am)
        self.assertEqual(due_am.hour, 9)
        self.assertEqual(due_am.minute, 15)

    def test_reminder_due_at_timezone_conversion(self):
        # Summer (EDT is UTC-4): 10:00 EDT is 14:00 UTC
        due_summer = reminder_due_at("2026-07-15", "10:00", "America/New_York")
        self.assertIsNotNone(due_summer)
        self.assertEqual(due_summer.tzinfo, timezone.utc)
        self.assertEqual(due_summer.hour, 14)

        # Winter (EST is UTC-5): 10:00 EST is 15:00 UTC
        due_winter = reminder_due_at("2026-12-15", "10:00", "America/New_York")
        self.assertIsNotNone(due_winter)
        self.assertEqual(due_winter.tzinfo, timezone.utc)
        self.assertEqual(due_winter.hour, 15)

    def test_reminder_due_at_empty_or_invalid(self):
        self.assertIsNone(reminder_due_at("", "10:00"))
        self.assertIsNone(reminder_due_at("not-a-date", "10:00"))

    def test_reminder_status_derivation(self):
        now = datetime(2026, 10, 26, 12, 0, tzinfo=timezone.utc)

        # Completed
        r_completed = Reminder(title="Done", status="completed", due_at=now + timedelta(hours=2))
        self.assertEqual(reminder_status(r_completed, now=now), "completed")

        # Upcoming (> 5 min future)
        r_upcoming = Reminder(title="Future", status="active", due_at=now + timedelta(hours=1))
        self.assertEqual(reminder_status(r_upcoming, now=now), "upcoming")

        # Due now (within 5 minutes)
        r_duenow = Reminder(title="Now", status="active", due_at=now - timedelta(minutes=2))
        self.assertEqual(reminder_status(r_duenow, now=now), "due now")

        # Overdue (> 5 minutes past)
        r_overdue = Reminder(title="Late", status="active", due_at=now - timedelta(minutes=10))
        self.assertEqual(reminder_status(r_overdue, now=now), "overdue")



class ReminderApiTests(unittest.TestCase):
    def setUp(self):
        from fastapi.testclient import TestClient
        from app.main import app, get_current_user, User, SessionLocal, Reminder

        self.client = TestClient(app)
        self.db = SessionLocal()
        # Find or create a test user
        user = self.db.query(User).filter(User.email == "remindertest@valorbuddy.com").first()
        if not user:
            user = User(email="remindertest@valorbuddy.com", role="veteran", approval_status="approved", password_hash="dummy")
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        self.test_user = user
        app.dependency_overrides[get_current_user] = lambda: self.test_user

    def tearDown(self):
        from app.main import app, get_current_user, Reminder
        app.dependency_overrides.pop(get_current_user, None)
        # Clean up test reminders
        self.db.query(Reminder).filter(Reminder.user_id == self.test_user.id).delete()
        self.db.commit()
        self.db.close()

    def test_reminder_crud_lifecycle(self):
        # 1. Create reminder
        create_payload = {
            "title": "VA Medical Checkup",
            "date": "2026-11-20",
            "time": "10:30",
            "when_text": "2026-11-20 10:30",
            "note": "Bring ID and medication list",
            "timezone": "America/New_York"
        }
        res = self.client.post("/api/reminders", json=create_payload)
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        reminder_id = data["id"]
        self.assertEqual(data["title"], "VA Medical Checkup")
        self.assertEqual(data["status"], "upcoming")
        self.assertEqual(data["stored_status"], "active")

        # 2. List reminders
        res_list = self.client.get("/api/reminders")
        self.assertEqual(res_list.status_code, 200)
        items = res_list.json()
        found = [x for x in items if x["id"] == reminder_id]
        self.assertEqual(len(found), 1)

        # 3. Patch to completed
        res_patch = self.client.patch(f"/api/reminders/{reminder_id}", json={"status": "completed"})
        self.assertEqual(res_patch.status_code, 200)
        self.assertEqual(res_patch.json()["status"], "completed")

        # 4. Delete reminder
        res_del = self.client.delete(f"/api/reminders/{reminder_id}")
        self.assertEqual(res_del.status_code, 200)
        self.assertEqual(res_del.json(), {"ok": True})

        # 5. Confirm deletion
        res_after = self.client.get("/api/reminders")
        remaining = [x for x in res_after.json() if x["id"] == reminder_id]
        self.assertEqual(len(remaining), 0)


if __name__ == "__main__":
    unittest.main()

