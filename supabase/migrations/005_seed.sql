-- ==============================================================================
-- 005_seed.sql
-- Realistic Seed Dataset for Investor & Hackathon Demonstrations
-- ==============================================================================

-- Demo Creator
INSERT INTO creators (id, wallet_address, display_name, bio, verified)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    'Aura Studios (Creator)',
    'Digital art & generative 3D media production studio.',
    true
) ON CONFLICT (wallet_address) DO NOTHING;

-- Demo Assets
INSERT INTO assets (id, creator_id, creator_wallet, name, description, type, content_hash, metadata_hash, status, blockchain_asset_id, registration_tx_hash)
VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    'Cybernetic Horizon #001',
    'High-resolution conceptual 3D environmental artwork.',
    'ARTWORK',
    '0x4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
    '0x9c31405e608b115ffbe361e2f7b8893d9b04f7b6058dbbfeef3f637f90352ffb',
    'REGISTERED',
    1,
    '0x738914ab771032df3801ea3bc05e7141b65e718b52f6b89bb73a3887c2b64d29'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    'Quantum Synth Brand Logo #002',
    'Vector corporate identity emblem and trademark asset.',
    'IMAGE',
    '0x82f1b4097e3a6cbb8e4693a0df4728b9911e2f18ec7e834b6e5e8e3f940173bc',
    '0x2b3815c4a10df8e3f7cbb519e4873812fa4b84018f2bb872ac650081bb45e381',
    'REGISTERED',
    2,
    '0x892a014bdf881023ba394e82bc591410ab4918e745bc01e89ffba3920194bc02'
) ON CONFLICT DO NOTHING;

-- Demo Detections (High confidence match)
INSERT INTO detections (id, asset_id, asset_name, creator_wallet, matched_url, matched_content_hash, similarity_score, confidence, detection_method, is_demo, status)
VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Cybernetic Horizon #001',
    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    'https://demo-web-publisher.net/articles/future-ai-art-showcase.png',
    '0x4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
    96.40,
    'HIGH',
    'DEMO_SIMILARITY',
    true,
    'VERIFIED'
),
(
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'Quantum Synth Brand Logo #002',
    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    'https://unauthorized-merch-store.com/products/synth-hoodie-banner.jpg',
    '0x82f1b4097e3a6cbb8e4693a0df4728b9911e2f18ec7e834b6e5e8e3f940173bc',
    92.10,
    'HIGH',
    'DEMO_SIMILARITY',
    true,
    'PENDING_REVIEW'
) ON CONFLICT DO NOTHING;
