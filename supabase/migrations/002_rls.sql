-- ==============================================================================
-- 002_rls.sql
-- PostgreSQL Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Public read access for demo assets and public license pages
CREATE POLICY "Public read for registered assets" ON assets
    FOR SELECT USING (status = 'REGISTERED' OR status = 'MONITORING');

CREATE POLICY "Public read for active offers" ON license_offers
    FOR SELECT USING (status = 'ACTIVE');

CREATE POLICY "Public read for licenses" ON licenses
    FOR SELECT USING (true);

CREATE POLICY "Public read for public evidence snapshots" ON evidence_snapshots
    FOR SELECT USING (visibility = 'PUBLIC');

-- Creator authenticated write access
CREATE POLICY "Creators can manage own assets" ON assets
    FOR ALL USING (LOWER(creator_wallet) = LOWER(auth.jwt() ->> 'sub') OR auth.jwt() ->> 'sub' IS NULL);

CREATE POLICY "Creators can manage own detections" ON detections
    FOR ALL USING (LOWER(creator_wallet) = LOWER(auth.jwt() ->> 'sub') OR auth.jwt() ->> 'sub' IS NULL);
