BEGIN;

-- Profile intelligence fields (safe if already present)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS civilian_career_goal VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_interest TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS military_specialty_description TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS years_of_service INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS security_clearance VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS highest_education VARCHAR(255);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS civilian_certifications TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Intelligent document processing fields
ALTER TABLE documents ADD COLUMN IF NOT EXISTS analysis_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'processed';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Career document provenance and revision support
ALTER TABLE career_documents ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE career_documents ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE career_documents ADD COLUMN IF NOT EXISTS source_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_user_status ON documents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_user_type ON documents(user_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_career_documents_source_document ON career_documents(source_document_id);

COMMIT;
