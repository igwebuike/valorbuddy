"""Run after installing requirements: python smoke_test.py"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
r = client.get('/health')
assert r.status_code == 200, r.text
print(r.json())
