-- ==============================================================================
-- 004_audit_events.sql
-- Immutable Audit Trail for Critical Platform Operations
-- ==============================================================================

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor VARCHAR(42) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    tx_hash VARCHAR(66)
);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events (LOWER(actor));
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events (action);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events (timestamp DESC);

-- Read policy for audit events
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read audit events" ON audit_events FOR SELECT USING (true);
CREATE POLICY "Insert audit events" ON audit_events FOR INSERT WITH CHECK (true);
