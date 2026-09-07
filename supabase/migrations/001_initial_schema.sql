-- ==============================================================================
-- 001_initial_schema.sql
-- LicenseHunter Core Relational Schema
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE asset_type_enum AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'MUSIC', 'ARTWORK', 'DOCUMENT', 'OTHER');
CREATE TYPE asset_status_enum AS ENUM ('DRAFT', 'REGISTERED', 'MONITORING', 'ARCHIVED');
CREATE TYPE detection_status_enum AS ENUM ('PENDING_REVIEW', 'VERIFIED', 'DISMISSED', 'OFFER_CREATED', 'SETTLED');
CREATE TYPE detection_confidence_enum AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE detection_method_enum AS ENUM ('DEMO_SIMILARITY', 'HASH_EXACT', 'PERCEPTUAL_HASH');
CREATE TYPE offer_status_enum AS ENUM ('ACTIVE', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE license_status_enum AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'REVOKED');
CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- Creators
CREATE TABLE IF NOT EXISTS creators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    creator_wallet VARCHAR(42) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type asset_type_enum NOT NULL DEFAULT 'IMAGE',
    source_url TEXT,
    storage_path TEXT,
    content_hash VARCHAR(66) NOT NULL,
    metadata_hash VARCHAR(66) NOT NULL,
    status asset_status_enum NOT NULL DEFAULT 'REGISTERED',
    blockchain_asset_id NUMERIC,
    registration_tx_hash VARCHAR(66),
    license_policy JSONB DEFAULT '{"suggestedPriceWei": "100000000000000000", "standardDurationSeconds": 2592000, "commercialAllowed": true, "derivativesAllowed": false}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asset Versions (Provenance tracking)
CREATE TABLE IF NOT EXISTS asset_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    content_hash VARCHAR(66) NOT NULL,
    metadata_hash VARCHAR(66) NOT NULL,
    metadata_uri TEXT,
    storage_path TEXT,
    changelog TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(asset_id, version_number)
);

-- Detections
CREATE TABLE IF NOT EXISTS detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    asset_name VARCHAR(255) NOT NULL,
    creator_wallet VARCHAR(42) NOT NULL,
    matched_url TEXT NOT NULL,
    matched_content_hash VARCHAR(66) NOT NULL,
    similarity_score NUMERIC(5, 2) NOT NULL,
    confidence detection_confidence_enum NOT NULL DEFAULT 'HIGH',
    detection_method detection_method_enum NOT NULL DEFAULT 'DEMO_SIMILARITY',
    is_demo BOOLEAN NOT NULL DEFAULT true,
    status detection_status_enum NOT NULL DEFAULT 'PENDING_REVIEW',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evidence Snapshots
CREATE TABLE IF NOT EXISTS evidence_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detection_id UUID NOT NULL REFERENCES detections(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content_hash VARCHAR(66) NOT NULL,
    metadata_hash VARCHAR(66) NOT NULL,
    screenshot_reference TEXT,
    similarity_score NUMERIC(5, 2) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    provider_version VARCHAR(50) NOT NULL,
    raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    anchored_tx_hash VARCHAR(66),
    anchored_block_number BIGINT,
    is_anchored BOOLEAN NOT NULL DEFAULT false,
    visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- License Offers
CREATE TABLE IF NOT EXISTS license_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    asset_name VARCHAR(255) NOT NULL,
    creator_address VARCHAR(42) NOT NULL,
    licensee_address VARCHAR(42),
    price_wei VARCHAR(78) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'ETH',
    duration_seconds BIGINT NOT NULL DEFAULT 2592000,
    terms_hash VARCHAR(66) NOT NULL,
    terms_text TEXT NOT NULL,
    status offer_status_enum NOT NULL DEFAULT 'ACTIVE',
    creation_tx_hash VARCHAR(66),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Active & Past Licenses
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    on_chain_license_id VARCHAR(78) NOT NULL,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    asset_name VARCHAR(255) NOT NULL,
    creator_address VARCHAR(42) NOT NULL,
    licensee_address VARCHAR(42) NOT NULL,
    price_paid_wei VARCHAR(78) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    terms_hash VARCHAR(66) NOT NULL,
    status license_status_enum NOT NULL DEFAULT 'ACTIVE',
    purchase_tx_hash VARCHAR(66) NOT NULL,
    network VARCHAR(50) NOT NULL DEFAULT 'sepolia',
    chain_id INT NOT NULL DEFAULT 11155111,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    payer_address VARCHAR(42) NOT NULL,
    amount_wei VARCHAR(78) NOT NULL,
    creator_revenue_wei VARCHAR(78) NOT NULL,
    protocol_fee_wei VARCHAR(78) NOT NULL,
    status payment_status_enum NOT NULL DEFAULT 'CONFIRMED',
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
