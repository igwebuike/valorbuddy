-- ValorBuddy v4.9.1 Agentic Core
-- PostgreSQL additive migration. Back up the database before running.

CREATE TABLE IF NOT EXISTS agent_missions (
    id SERIAL PRIMARY KEY,
    mission_uid VARCHAR(80) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    goal TEXT NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'planning',
    primary_agent VARCHAR(80) NOT NULL DEFAULT 'supervisor',
    participating_agents JSON NOT NULL DEFAULT '[]',
    plan_json JSON NOT NULL DEFAULT '{}',
    summary TEXT,
    next_action TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    priority VARCHAR(30) NOT NULL DEFAULT 'normal',
    risk_level VARCHAR(30) NOT NULL DEFAULT 'low',
    context_snapshot JSON NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_agent_missions_user_id ON agent_missions(user_id);
CREATE INDEX IF NOT EXISTS ix_agent_missions_status ON agent_missions(status);
CREATE INDEX IF NOT EXISTS ix_agent_missions_mission_uid ON agent_missions(mission_uid);

CREATE TABLE IF NOT EXISTS agent_mission_steps (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER NOT NULL REFERENCES agent_missions(id),
    sequence INTEGER NOT NULL,
    agent_key VARCHAR(80) NOT NULL,
    tool_name VARCHAR(120) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'pending',
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    input_json JSON NOT NULL DEFAULT '{}',
    output_json JSON NOT NULL DEFAULT '{}',
    verification_json JSON NOT NULL DEFAULT '{}',
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_agent_mission_steps_mission_id ON agent_mission_steps(mission_id);
CREATE INDEX IF NOT EXISTS ix_agent_mission_steps_status ON agent_mission_steps(status);

CREATE TABLE IF NOT EXISTS agent_approvals (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER NOT NULL REFERENCES agent_missions(id),
    step_id INTEGER NOT NULL REFERENCES agent_mission_steps(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    action_summary TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    decision_note TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    decided_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_agent_approvals_mission_id ON agent_approvals(mission_id);
CREATE INDEX IF NOT EXISTS ix_agent_approvals_step_id ON agent_approvals(step_id);
CREATE INDEX IF NOT EXISTS ix_agent_approvals_user_id ON agent_approvals(user_id);
CREATE INDEX IF NOT EXISTS ix_agent_approvals_status ON agent_approvals(status);

CREATE TABLE IF NOT EXISTS agent_mission_events (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER NOT NULL REFERENCES agent_missions(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    event_type VARCHAR(80) NOT NULL,
    message TEXT NOT NULL,
    event_data JSON NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_agent_mission_events_mission_id ON agent_mission_events(mission_id);
CREATE INDEX IF NOT EXISTS ix_agent_mission_events_user_id ON agent_mission_events(user_id);
