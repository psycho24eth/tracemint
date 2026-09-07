-- ==============================================================================
-- 003_indexes.sql
-- Performance and Query Optimization Indexes
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_assets_creator_wallet ON assets (LOWER(creator_wallet));
CREATE INDEX IF NOT EXISTS idx_assets_content_hash ON assets (content_hash);
CREATE INDEX IF NOT EXISTS idx_asset_versions_asset_id ON asset_versions (asset_id);
CREATE INDEX IF NOT EXISTS idx_detections_asset_id ON detections (asset_id);
CREATE INDEX IF NOT EXISTS idx_detections_creator_wallet ON detections (LOWER(creator_wallet));
CREATE INDEX IF NOT EXISTS idx_detections_status ON detections (status);
CREATE INDEX IF NOT EXISTS idx_evidence_snapshots_detection_id ON evidence_snapshots (detection_id);
CREATE INDEX IF NOT EXISTS idx_license_offers_asset_id ON license_offers (asset_id);
CREATE INDEX IF NOT EXISTS idx_license_offers_creator ON license_offers (LOWER(creator_address));
CREATE INDEX IF NOT EXISTS idx_licenses_licensee ON licenses (LOWER(licensee_address));
CREATE INDEX IF NOT EXISTS idx_licenses_creator ON licenses (LOWER(creator_address));
CREATE INDEX IF NOT EXISTS idx_payments_tx_hash ON payments (tx_hash);
