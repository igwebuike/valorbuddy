BEGIN;
CREATE TABLE IF NOT EXISTS agent_handoffs (id SERIAL PRIMARY KEY, mission_id INTEGER NOT NULL REFERENCES agent_missions(id) ON DELETE CASCADE, from_agent VARCHAR(80) NOT NULL, to_agent VARCHAR(80) NOT NULL, reason TEXT NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'completed', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS ix_agent_handoffs_mission_id ON agent_handoffs(mission_id);
CREATE TABLE IF NOT EXISTS agent_tool_runs (id SERIAL PRIMARY KEY, mission_id INTEGER NOT NULL REFERENCES agent_missions(id) ON DELETE CASCADE, step_id INTEGER REFERENCES agent_mission_steps(id) ON DELETE SET NULL, agent_key VARCHAR(80) NOT NULL, tool_name VARCHAR(120) NOT NULL, status VARCHAR(40) NOT NULL, latency_ms INTEGER, source VARCHAR(255), error_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS ix_agent_tool_runs_mission_id ON agent_tool_runs(mission_id);
CREATE TABLE IF NOT EXISTS agent_feedback (id SERIAL PRIMARY KEY, mission_id INTEGER NOT NULL REFERENCES agent_missions(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, rating INTEGER, useful BOOLEAN, comment TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS ix_agent_feedback_mission_id ON agent_feedback(mission_id);
COMMIT;
