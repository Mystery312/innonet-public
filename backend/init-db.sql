-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Innonet Demo Seed Data
-- Runs AFTER SQLAlchemy create_all() has created tables
-- Provides rich demo data for showcasing all features
-- ============================================================

-- ============================================================
-- 1. DEMO USERS (password: Demo1234!)
-- ============================================================
-- Password hash for 'Demo1234!' using argon2id
-- All demo users share this password for easy demo login

INSERT INTO users (id, username, email, password_hash, is_active, is_verified, created_at, updated_at) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'sarah_chen',     'sarah@demo.com',     '$argon2id$v=19$m=65536,t=3,p=4$mvPee48xxriXshaCcG4NAQ$m9iqFx+PAV8eBXbmLqyLf7H7uWU2g6XU3NTZI26VR24', true, true, NOW() - INTERVAL '90 days', NOW()),
  ('a0000002-0000-0000-0000-000000000002', 'marcus_johnson', 'marcus@demo.com',    '$argon2id$v=19$m=65536,t=3,p=4$mvPee48xxriXshaCcG4NAQ$m9iqFx+PAV8eBXbmLqyLf7H7uWU2g6XU3NTZI26VR24', true, true, NOW() - INTERVAL '85 days', NOW()),
  ('a0000003-0000-0000-0000-000000000003', 'priya_patel',    'priya@demo.com',     '$argon2id$v=19$m=65536,t=3,p=4$mvPee48xxriXshaCcG4NAQ$m9iqFx+PAV8eBXbmLqyLf7H7uWU2g6XU3NTZI26VR24', true, true, NOW() - INTERVAL '80 days', NOW()),
  ('a0000004-0000-0000-0000-000000000004', 'alex_rivera',    'alex@demo.com',      '$argon2id$v=19$m=65536,t=3,p=4$mvPee48xxriXshaCcG4NAQ$m9iqFx+PAV8eBXbmLqyLf7H7uWU2g6XU3NTZI26VR24', true, true, NOW() - INTERVAL '75 days', NOW()),
  ('a0000005-0000-0000-0000-000000000005', 'emma_wilson',    'emma@demo.com',      '$argon2id$v=19$m=65536,t=3,p=4$mvPee48xxriXshaCcG4NAQ$m9iqFx+PAV8eBXbmLqyLf7H7uWU2g6XU3NTZI26VR24', true, true, NOW() - INTERVAL '70 days', NOW()),
  ('a0000006-0000-0000-0000-000000000006', 'david_kim',      'david@demo.com',     '$argon2id$v=19$m=65536,t=3,p=4$mvPee48xxriXshaCcG4NAQ$m9iqFx+PAV8eBXbmLqyLf7H7uWU2g6XU3NTZI26VR24', true, true, NOW() - INTERVAL '65 days', NOW()),
  ('a0000007-0000-0000-0000-000000000007', 'lisa_zhang',     'lisa@demo.com',      '$argon2id$v=19$m=65536,t=3,p=4$mvPee48xxriXshaCcG4NAQ$m9iqFx+PAV8eBXbmLqyLf7H7uWU2g6XU3NTZI26VR24', true, true, NOW() - INTERVAL '60 days', NOW()),
  ('a0000008-0000-0000-0000-000000000008', 'james_okonkwo',  'james@demo.com',     '$argon2id$v=19$m=65536,t=3,p=4$mvPee48xxriXshaCcG4NAQ$m9iqFx+PAV8eBXbmLqyLf7H7uWU2g6XU3NTZI26VR24', true, true, NOW() - INTERVAL '55 days', NOW()),
  ('a0000009-0000-0000-0000-000000000009', 'sofia_martinez', 'sofia@demo.com',     '$argon2id$v=19$m=65536,t=3,p=4$mvPee48xxriXshaCcG4NAQ$m9iqFx+PAV8eBXbmLqyLf7H7uWU2g6XU3NTZI26VR24', true, true, NOW() - INTERVAL '50 days', NOW()),
  ('a0000010-0000-0000-0000-000000000010', 'ryan_thompson',  'ryan@demo.com',      '$argon2id$v=19$m=65536,t=3,p=4$mvPee48xxriXshaCcG4NAQ$m9iqFx+PAV8eBXbmLqyLf7H7uWU2g6XU3NTZI26VR24', true, true, NOW() - INTERVAL '45 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. USER PROFILES
-- ============================================================
INSERT INTO user_profiles (id, user_id, full_name, bio, location, profile_image_url, linkedin_url, github_url, portfolio_url, show_in_graph, created_at, updated_at) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Sarah Chen', 'Serial entrepreneur and AI researcher. Founded 2 startups in the healthcare AI space. Passionate about using technology to improve patient outcomes. Currently building an AI-powered diagnostic tool.', 'San Francisco, CA', NULL, 'https://linkedin.com/in/sarahchen', 'https://github.com/sarahchen', 'https://sarahchen.dev', true, NOW() - INTERVAL '90 days', NOW()),
  ('b0000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 'Marcus Johnson', 'Full-stack developer turned startup CTO. 8+ years building scalable systems. Led engineering teams at two YC-backed companies. Obsessed with developer experience and clean architecture.', 'New York, NY', NULL, 'https://linkedin.com/in/marcusjohnson', 'https://github.com/marcusj', 'https://marcusjohnson.io', true, NOW() - INTERVAL '85 days', NOW()),
  ('b0000003-0000-0000-0000-000000000003', 'a0000003-0000-0000-0000-000000000003', 'Priya Patel', 'Data scientist and ML engineer. PhD in Computer Science from Stanford. Published researcher in NLP and computer vision. Building the next generation of AI tools for enterprises.', 'Austin, TX', NULL, 'https://linkedin.com/in/priyapatel', 'https://github.com/priyap', NULL, true, NOW() - INTERVAL '80 days', NOW()),
  ('b0000004-0000-0000-0000-000000000004', 'a0000004-0000-0000-0000-000000000004', 'Alex Rivera', 'Cloud architect and DevOps evangelist. AWS Solutions Architect Professional. Helped 50+ startups build their cloud infrastructure. Speaker at KubeCon and re:Invent.', 'Seattle, WA', NULL, 'https://linkedin.com/in/alexrivera', 'https://github.com/alexr', 'https://alexrivera.cloud', true, NOW() - INTERVAL '75 days', NOW()),
  ('b0000005-0000-0000-0000-000000000005', 'a0000005-0000-0000-0000-000000000005', 'Emma Wilson', 'UX designer and product strategist. Former design lead at Airbnb. Passionate about inclusive design and building products that delight users. Co-founder of DesignOps community.', 'New York, NY', NULL, 'https://linkedin.com/in/emmawilson', NULL, 'https://emmawilson.design', true, NOW() - INTERVAL '70 days', NOW()),
  ('b0000006-0000-0000-0000-000000000006', 'a0000006-0000-0000-0000-000000000006', 'David Kim', 'Blockchain developer and Web3 entrepreneur. Built DeFi protocols with $50M+ TVL. Solidity expert and smart contract auditor. Advisor to multiple crypto startups.', 'Miami, FL', NULL, 'https://linkedin.com/in/davidkim', 'https://github.com/davidk', NULL, true, NOW() - INTERVAL '65 days', NOW()),
  ('b0000007-0000-0000-0000-000000000007', 'a0000007-0000-0000-0000-000000000007', 'Lisa Zhang', 'FinTech founder and product manager. MBA from Wharton. Previously VP Product at Stripe. Building payment infrastructure for emerging markets.', 'Boston, MA', NULL, 'https://linkedin.com/in/lisazhang', NULL, 'https://lisazhang.com', true, NOW() - INTERVAL '60 days', NOW()),
  ('b0000008-0000-0000-0000-000000000008', 'a0000008-0000-0000-0000-000000000008', 'James Okonkwo', 'Mobile developer and AR/VR innovator. Led mobile engineering at Snap. Expert in React Native and Swift. Building spatial computing experiences for education.', 'San Francisco, CA', NULL, 'https://linkedin.com/in/jamesokonkwo', 'https://github.com/jameso', NULL, true, NOW() - INTERVAL '55 days', NOW()),
  ('b0000009-0000-0000-0000-000000000009', 'a0000009-0000-0000-0000-000000000009', 'Sofia Martinez', 'Cybersecurity expert and startup advisor. CISSP certified. Former security lead at Google. Helping startups build security-first products.', 'Washington, DC', NULL, 'https://linkedin.com/in/sofiamartinez', 'https://github.com/sofiam', NULL, true, NOW() - INTERVAL '50 days', NOW()),
  ('b0000010-0000-0000-0000-000000000010', 'a0000010-0000-0000-0000-000000000010', 'Ryan Thompson', 'Growth hacker and marketing technologist. Scaled 3 startups from 0 to 1M users. Expert in PLG, SEO, and data-driven growth. Angel investor in 12 startups.', 'Portland, OR', NULL, 'https://linkedin.com/in/ryanthompson', NULL, 'https://ryanthompson.growth', true, NOW() - INTERVAL '45 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. SKILLS (fixed: removed 'description' column which doesn't exist in model)
-- ============================================================
INSERT INTO skills (id, name, category, created_at) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Python',           'technical', NOW()),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'JavaScript',       'technical', NOW()),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'TypeScript',       'technical', NOW()),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'React',            'technical', NOW()),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'Node.js',          'technical', NOW()),
  ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'PostgreSQL',       'technical', NOW()),
  ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'Machine Learning', 'technical', NOW()),
  ('b8c9d0e1-f2a3-4567-bcde-678901234567', 'Data Science',     'technical', NOW()),
  ('c9d0e1f2-a3b4-5678-cdef-789012345678', 'Docker',           'technical', NOW()),
  ('d0e1f2a3-b4c5-6789-defa-890123456789', 'AWS',              'technical', NOW()),
  ('e1f2a3b4-c5d6-7890-efab-901234567890', 'FastAPI',          'technical', NOW()),
  ('f2a3b4c5-d6e7-8901-fabc-012345678901', 'GraphQL',          'technical', NOW()),
  ('a3b4c5d6-e7f8-9012-abcd-123456789012', 'Rust',             'technical', NOW()),
  ('b4c5d6e7-f8a9-0123-bcde-234567890123', 'Go',               'technical', NOW()),
  ('c5d6e7f8-a9b0-1234-cdef-345678901234', 'Kubernetes',       'technical', NOW()),
  ('d6e7f8a9-b0c1-2345-defa-456789012345', 'TensorFlow',       'technical', NOW()),
  ('e7f8a9b0-c1d2-3456-efab-567890123456', 'PyTorch',          'technical', NOW()),
  ('f8a9b0c1-d2e3-4567-fabc-678901234567', 'Redis',            'technical', NOW()),
  ('a9b0c1d2-e3f4-5678-abcd-789012345678', 'MongoDB',          'technical', NOW()),
  ('b0c1d2e3-f4a5-6789-bcde-890123456789', 'Vue.js',           'technical', NOW()),
  -- Additional skills for richer demo
  ('5c000001-0000-0000-0000-000000000001', 'Product Management', 'soft',      NOW()),
  ('5c000002-0000-0000-0000-000000000002', 'Leadership',         'soft',      NOW()),
  ('5c000003-0000-0000-0000-000000000003', 'UX Design',          'technical', NOW()),
  ('5c000004-0000-0000-0000-000000000004', 'Figma',              'technical', NOW()),
  ('5c000005-0000-0000-0000-000000000005', 'Solidity',           'technical', NOW()),
  ('5c000006-0000-0000-0000-000000000006', 'Swift',              'technical', NOW()),
  ('5c000007-0000-0000-0000-000000000007', 'React Native',       'technical', NOW()),
  ('5c000008-0000-0000-0000-000000000008', 'Cybersecurity',      'technical', NOW()),
  ('5c000009-0000-0000-0000-000000000009', 'SEO',                'technical', NOW()),
  ('5c000010-0000-0000-0000-000000000010', 'Growth Marketing',   'soft',      NOW()),
  ('5c000011-0000-0000-0000-000000000011', 'Public Speaking',    'soft',      NOW()),
  ('5c000012-0000-0000-0000-000000000012', 'Fundraising',        'soft',      NOW()),
  ('5c000013-0000-0000-0000-000000000013', 'Blockchain',         'technical', NOW()),
  ('5c000014-0000-0000-0000-000000000014', 'NLP',                'technical', NOW()),
  ('5c000015-0000-0000-0000-000000000015', 'Computer Vision',    'technical', NOW()),
  ('5c000016-0000-0000-0000-000000000016', 'DevOps',             'technical', NOW()),
  ('5c000017-0000-0000-0000-000000000017', 'Agile',              'soft',      NOW()),
  ('5c000018-0000-0000-0000-000000000018', 'System Design',      'technical', NOW()),
  ('5c000019-0000-0000-0000-000000000019', 'Data Analytics',     'technical', NOW()),
  ('5c000020-0000-0000-0000-000000000020', 'Entrepreneurship',   'industry',  NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. USER SKILLS (link users to their skills)
-- ============================================================
INSERT INTO user_skills (id, user_id, skill_id, proficiency_level, years_experience, is_primary, created_at) VALUES
  -- Sarah Chen (AI/ML founder): Python, ML, TensorFlow, PyTorch, NLP, Leadership, Entrepreneurship
  ('a5000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expert', 8, true, NOW()),
  ('a5000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'a7b8c9d0-e1f2-3456-abcd-567890123456', 'expert', 6, true, NOW()),
  ('a5000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'd6e7f8a9-b0c1-2345-defa-456789012345', 'advanced', 4, false, NOW()),
  ('a5000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'e7f8a9b0-c1d2-3456-efab-567890123456', 'advanced', 3, false, NOW()),
  ('a5000005-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', '5c000014-0000-0000-0000-000000000014', 'expert', 5, true, NOW()),
  ('a5000006-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', '5c000002-0000-0000-0000-000000000002', 'advanced', 6, false, NOW()),
  ('a5000007-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', '5c000020-0000-0000-0000-000000000020', 'expert', 7, false, NOW()),

  -- Marcus Johnson (Full-stack CTO): JS, TS, React, Node, PostgreSQL, System Design, Leadership
  ('a5000008-0000-0000-0000-000000000008', 'a0000002-0000-0000-0000-000000000002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'expert', 9, true, NOW()),
  ('a5000009-0000-0000-0000-000000000009', 'a0000002-0000-0000-0000-000000000002', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'expert', 5, true, NOW()),
  ('a5000010-0000-0000-0000-000000000010', 'a0000002-0000-0000-0000-000000000002', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'expert', 6, true, NOW()),
  ('a5000011-0000-0000-0000-000000000011', 'a0000002-0000-0000-0000-000000000002', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'expert', 7, false, NOW()),
  ('a5000012-0000-0000-0000-000000000012', 'a0000002-0000-0000-0000-000000000002', 'f6a7b8c9-d0e1-2345-fabc-456789012345', 'advanced', 5, false, NOW()),
  ('a5000013-0000-0000-0000-000000000013', 'a0000002-0000-0000-0000-000000000002', '5c000018-0000-0000-0000-000000000018', 'expert', 8, false, NOW()),
  ('a5000014-0000-0000-0000-000000000014', 'a0000002-0000-0000-0000-000000000002', '5c000002-0000-0000-0000-000000000002', 'advanced', 5, false, NOW()),

  -- Priya Patel (Data Scientist/ML): Python, Data Science, ML, PyTorch, NLP, Computer Vision
  ('a5000015-0000-0000-0000-000000000015', 'a0000003-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'expert', 7, true, NOW()),
  ('a5000016-0000-0000-0000-000000000016', 'a0000003-0000-0000-0000-000000000003', 'b8c9d0e1-f2a3-4567-bcde-678901234567', 'expert', 6, true, NOW()),
  ('a5000017-0000-0000-0000-000000000017', 'a0000003-0000-0000-0000-000000000003', 'a7b8c9d0-e1f2-3456-abcd-567890123456', 'expert', 6, true, NOW()),
  ('a5000018-0000-0000-0000-000000000018', 'a0000003-0000-0000-0000-000000000003', 'e7f8a9b0-c1d2-3456-efab-567890123456', 'expert', 4, false, NOW()),
  ('a5000019-0000-0000-0000-000000000019', 'a0000003-0000-0000-0000-000000000003', '5c000014-0000-0000-0000-000000000014', 'advanced', 4, false, NOW()),
  ('a5000020-0000-0000-0000-000000000020', 'a0000003-0000-0000-0000-000000000003', '5c000015-0000-0000-0000-000000000015', 'advanced', 3, false, NOW()),

  -- Alex Rivera (Cloud/DevOps): AWS, Docker, K8s, Go, Python, DevOps, Public Speaking
  ('a5000021-0000-0000-0000-000000000021', 'a0000004-0000-0000-0000-000000000004', 'd0e1f2a3-b4c5-6789-defa-890123456789', 'expert', 8, true, NOW()),
  ('a5000022-0000-0000-0000-000000000022', 'a0000004-0000-0000-0000-000000000004', 'c9d0e1f2-a3b4-5678-cdef-789012345678', 'expert', 6, true, NOW()),
  ('a5000023-0000-0000-0000-000000000023', 'a0000004-0000-0000-0000-000000000004', 'c5d6e7f8-a9b0-1234-cdef-345678901234', 'expert', 5, true, NOW()),
  ('a5000024-0000-0000-0000-000000000024', 'a0000004-0000-0000-0000-000000000004', 'b4c5d6e7-f8a9-0123-bcde-234567890123', 'advanced', 4, false, NOW()),
  ('a5000025-0000-0000-0000-000000000025', 'a0000004-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'intermediate', 3, false, NOW()),
  ('a5000026-0000-0000-0000-000000000026', 'a0000004-0000-0000-0000-000000000004', '5c000016-0000-0000-0000-000000000016', 'expert', 7, false, NOW()),
  ('a5000027-0000-0000-0000-000000000027', 'a0000004-0000-0000-0000-000000000004', '5c000011-0000-0000-0000-000000000011', 'advanced', 4, false, NOW()),

  -- Emma Wilson (UX/Product): UX Design, Figma, Product Mgmt, Leadership, React
  ('a5000028-0000-0000-0000-000000000028', 'a0000005-0000-0000-0000-000000000005', '5c000003-0000-0000-0000-000000000003', 'expert', 10, true, NOW()),
  ('a5000029-0000-0000-0000-000000000029', 'a0000005-0000-0000-0000-000000000005', '5c000004-0000-0000-0000-000000000004', 'expert', 5, true, NOW()),
  ('a5000030-0000-0000-0000-000000000030', 'a0000005-0000-0000-0000-000000000005', '5c000001-0000-0000-0000-000000000001', 'expert', 7, true, NOW()),
  ('a5000031-0000-0000-0000-000000000031', 'a0000005-0000-0000-0000-000000000005', '5c000002-0000-0000-0000-000000000002', 'advanced', 5, false, NOW()),
  ('a5000032-0000-0000-0000-000000000032', 'a0000005-0000-0000-0000-000000000005', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'intermediate', 3, false, NOW()),

  -- David Kim (Blockchain/Web3): Solidity, Blockchain, JS, Rust, Entrepreneurship
  ('a5000033-0000-0000-0000-000000000033', 'a0000006-0000-0000-0000-000000000006', '5c000005-0000-0000-0000-000000000005', 'expert', 5, true, NOW()),
  ('a5000034-0000-0000-0000-000000000034', 'a0000006-0000-0000-0000-000000000006', '5c000013-0000-0000-0000-000000000013', 'expert', 6, true, NOW()),
  ('a5000035-0000-0000-0000-000000000035', 'a0000006-0000-0000-0000-000000000006', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'advanced', 7, false, NOW()),
  ('a5000036-0000-0000-0000-000000000036', 'a0000006-0000-0000-0000-000000000006', 'a3b4c5d6-e7f8-9012-abcd-123456789012', 'intermediate', 2, false, NOW()),
  ('a5000037-0000-0000-0000-000000000037', 'a0000006-0000-0000-0000-000000000006', '5c000020-0000-0000-0000-000000000020', 'advanced', 4, false, NOW()),

  -- Lisa Zhang (FinTech PM): Product Mgmt, Data Analytics, Python, Agile, Fundraising
  ('a5000038-0000-0000-0000-000000000038', 'a0000007-0000-0000-0000-000000000007', '5c000001-0000-0000-0000-000000000001', 'expert', 8, true, NOW()),
  ('a5000039-0000-0000-0000-000000000039', 'a0000007-0000-0000-0000-000000000007', '5c000019-0000-0000-0000-000000000019', 'advanced', 5, true, NOW()),
  ('a5000040-0000-0000-0000-000000000040', 'a0000007-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'intermediate', 3, false, NOW()),
  ('a5000041-0000-0000-0000-000000000041', 'a0000007-0000-0000-0000-000000000007', '5c000017-0000-0000-0000-000000000017', 'expert', 6, false, NOW()),
  ('a5000042-0000-0000-0000-000000000042', 'a0000007-0000-0000-0000-000000000007', '5c000012-0000-0000-0000-000000000012', 'advanced', 5, false, NOW()),

  -- James Okonkwo (Mobile/AR): Swift, React Native, JS, React
  ('a5000043-0000-0000-0000-000000000043', 'a0000008-0000-0000-0000-000000000008', '5c000006-0000-0000-0000-000000000006', 'expert', 7, true, NOW()),
  ('a5000044-0000-0000-0000-000000000044', 'a0000008-0000-0000-0000-000000000008', '5c000007-0000-0000-0000-000000000007', 'expert', 5, true, NOW()),
  ('a5000045-0000-0000-0000-000000000045', 'a0000008-0000-0000-0000-000000000008', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'advanced', 6, false, NOW()),
  ('a5000046-0000-0000-0000-000000000046', 'a0000008-0000-0000-0000-000000000008', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'advanced', 4, false, NOW()),

  -- Sofia Martinez (Cybersecurity): Cybersecurity, Python, Docker, AWS, DevOps
  ('a5000047-0000-0000-0000-000000000047', 'a0000009-0000-0000-0000-000000000009', '5c000008-0000-0000-0000-000000000008', 'expert', 10, true, NOW()),
  ('a5000048-0000-0000-0000-000000000048', 'a0000009-0000-0000-0000-000000000009', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'advanced', 6, false, NOW()),
  ('a5000049-0000-0000-0000-000000000049', 'a0000009-0000-0000-0000-000000000009', 'c9d0e1f2-a3b4-5678-cdef-789012345678', 'advanced', 5, false, NOW()),
  ('a5000050-0000-0000-0000-000000000050', 'a0000009-0000-0000-0000-000000000009', 'd0e1f2a3-b4c5-6789-defa-890123456789', 'advanced', 4, false, NOW()),
  ('a5000051-0000-0000-0000-000000000051', 'a0000009-0000-0000-0000-000000000009', '5c000016-0000-0000-0000-000000000016', 'advanced', 5, false, NOW()),

  -- Ryan Thompson (Growth): Growth Marketing, SEO, Data Analytics, Public Speaking, Entrepreneurship
  ('a5000052-0000-0000-0000-000000000052', 'a0000010-0000-0000-0000-000000000010', '5c000010-0000-0000-0000-000000000010', 'expert', 8, true, NOW()),
  ('a5000053-0000-0000-0000-000000000053', 'a0000010-0000-0000-0000-000000000010', '5c000009-0000-0000-0000-000000000009', 'expert', 7, true, NOW()),
  ('a5000054-0000-0000-0000-000000000054', 'a0000010-0000-0000-0000-000000000010', '5c000019-0000-0000-0000-000000000019', 'advanced', 5, false, NOW()),
  ('a5000055-0000-0000-0000-000000000055', 'a0000010-0000-0000-0000-000000000010', '5c000011-0000-0000-0000-000000000011', 'advanced', 6, false, NOW()),
  ('a5000056-0000-0000-0000-000000000056', 'a0000010-0000-0000-0000-000000000010', '5c000020-0000-0000-0000-000000000020', 'expert', 8, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. WORK EXPERIENCE
-- ============================================================
INSERT INTO work_experiences (id, user_id, company_name, job_title, location, start_date, end_date, is_current, description, created_at, updated_at) VALUES
  -- Sarah Chen
  ('ae000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'MedAI Labs', 'CEO & Co-Founder', 'San Francisco, CA', '2023-01-01', NULL, true, 'Building AI-powered diagnostic tools for healthcare. Raised $5M seed round. Team of 12.', NOW(), NOW()),
  ('ae000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'HealthTech Inc', 'ML Engineer', 'San Francisco, CA', '2020-03-01', '2022-12-31', false, 'Developed NLP models for clinical text analysis. Published 3 papers.', NOW(), NOW()),
  -- Marcus Johnson
  ('ae000003-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', 'DevStack', 'CTO & Co-Founder', 'New York, NY', '2022-06-01', NULL, true, 'Building developer tools platform. YC W23 batch. Grew to 50K users.', NOW(), NOW()),
  ('ae000004-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002', 'Stripe', 'Senior Software Engineer', 'San Francisco, CA', '2019-01-01', '2022-05-31', false, 'Led payments infrastructure team. Built real-time fraud detection system.', NOW(), NOW()),
  -- Priya Patel
  ('ae000005-0000-0000-0000-000000000005', 'a0000003-0000-0000-0000-000000000003', 'Stanford AI Lab', 'Research Scientist', 'Stanford, CA', '2023-06-01', NULL, true, 'Leading research in multimodal AI. Published at NeurIPS, ICML.', NOW(), NOW()),
  ('ae000006-0000-0000-0000-000000000006', 'a0000003-0000-0000-0000-000000000003', 'Google DeepMind', 'ML Engineer', 'Mountain View, CA', '2020-09-01', '2023-05-31', false, 'Worked on large language models and computer vision systems.', NOW(), NOW()),
  -- Alex Rivera
  ('ae000007-0000-0000-0000-000000000007', 'a0000004-0000-0000-0000-000000000004', 'CloudScale Inc', 'Founder & Principal Architect', 'Seattle, WA', '2020-01-01', NULL, true, 'Cloud consulting firm helping startups scale. 50+ clients served.', NOW(), NOW()),
  ('ae000008-0000-0000-0000-000000000008', 'a0000004-0000-0000-0000-000000000004', 'Amazon Web Services', 'Solutions Architect', 'Seattle, WA', '2017-03-01', '2019-12-31', false, 'Helped enterprise customers migrate to AWS. Designed multi-region architectures.', NOW(), NOW()),
  -- Emma Wilson
  ('ae000009-0000-0000-0000-000000000009', 'a0000005-0000-0000-0000-000000000005', 'DesignFirst Studio', 'Founder & Design Director', 'New York, NY', '2023-03-01', NULL, true, 'Product design consultancy for startups. Focus on inclusive design.', NOW(), NOW()),
  ('ae000010-0000-0000-0000-000000000010', 'a0000005-0000-0000-0000-000000000005', 'Airbnb', 'Senior Design Lead', 'San Francisco, CA', '2019-06-01', '2023-02-28', false, 'Led design for Airbnb Experiences. Managed team of 8 designers.', NOW(), NOW()),
  -- Lisa Zhang
  ('ae000011-0000-0000-0000-000000000011', 'a0000007-0000-0000-0000-000000000007', 'PayBridge', 'CEO & Founder', 'Boston, MA', '2023-09-01', NULL, true, 'Building payment rails for emerging markets. Pre-seed funded.', NOW(), NOW()),
  ('ae000012-0000-0000-0000-000000000012', 'a0000007-0000-0000-0000-000000000007', 'Stripe', 'VP Product', 'San Francisco, CA', '2019-01-01', '2023-08-31', false, 'Led product strategy for Stripe Connect. Grew GMV by 300%.', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. EDUCATION
-- ============================================================
INSERT INTO education (id, user_id, institution_name, degree_type, field_of_study, start_date, end_date, created_at, updated_at) VALUES
  ('ed000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'MIT', 'master', 'Computer Science', '2017-09-01', '2019-06-01', NOW(), NOW()),
  ('ed000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 'Columbia University', 'bachelor', 'Computer Science', '2014-09-01', '2018-06-01', NOW(), NOW()),
  ('ed000003-0000-0000-0000-000000000003', 'a0000003-0000-0000-0000-000000000003', 'Stanford University', 'phd', 'Computer Science', '2018-09-01', '2023-06-01', NOW(), NOW()),
  ('ed000004-0000-0000-0000-000000000004', 'a0000004-0000-0000-0000-000000000004', 'University of Washington', 'bachelor', 'Information Systems', '2013-09-01', '2017-06-01', NOW(), NOW()),
  ('ed000005-0000-0000-0000-000000000005', 'a0000005-0000-0000-0000-000000000005', 'Parsons School of Design', 'bachelor', 'Interactive Design', '2012-09-01', '2016-06-01', NOW(), NOW()),
  ('ed000006-0000-0000-0000-000000000006', 'a0000006-0000-0000-0000-000000000006', 'Georgia Tech', 'master', 'Computer Science', '2016-09-01', '2018-06-01', NOW(), NOW()),
  ('ed000007-0000-0000-0000-000000000007', 'a0000007-0000-0000-0000-000000000007', 'Wharton School', 'master', 'Business Administration', '2017-09-01', '2019-06-01', NOW(), NOW()),
  ('ed000008-0000-0000-0000-000000000008', 'a0000008-0000-0000-0000-000000000008', 'Carnegie Mellon', 'bachelor', 'Computer Science', '2013-09-01', '2017-06-01', NOW(), NOW()),
  ('ed000009-0000-0000-0000-000000000009', 'a0000009-0000-0000-0000-000000000009', 'Georgetown University', 'master', 'Cybersecurity', '2014-09-01', '2016-06-01', NOW(), NOW()),
  ('ed000010-0000-0000-0000-000000000010', 'a0000010-0000-0000-0000-000000000010', 'UC Berkeley', 'bachelor', 'Marketing', '2012-09-01', '2016-06-01', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. PROJECTS
-- ============================================================
INSERT INTO projects (id, user_id, title, description, role, url, start_date, end_date, is_current, technologies, created_at, updated_at) VALUES
  ('b1000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'MedDiagnose AI', 'AI-powered medical imaging diagnostic tool that detects anomalies with 97% accuracy', 'Lead Researcher', 'https://github.com/sarahchen/meddiagnose', '2023-06-01', NULL, true, '{Python,PyTorch,FastAPI}', NOW(), NOW()),
  ('b1000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 'DevStack Platform', 'Open-source developer tools platform with 50K+ monthly active users', 'CTO', 'https://github.com/devstack/platform', '2022-06-01', NULL, true, '{TypeScript,React,Node.js,PostgreSQL}', NOW(), NOW()),
  ('b1000003-0000-0000-0000-000000000003', 'a0000003-0000-0000-0000-000000000003', 'MultiModal Transformer', 'Novel architecture for multi-modal learning published at NeurIPS 2025', 'First Author', NULL, '2024-01-01', '2025-09-01', false, '{Python,PyTorch,CUDA}', NOW(), NOW()),
  ('b1000004-0000-0000-0000-000000000004', 'a0000004-0000-0000-0000-000000000004', 'K8s AutoPilot', 'Intelligent Kubernetes autoscaler that reduces cloud costs by 40%', 'Creator', 'https://github.com/alexr/k8s-autopilot', '2023-01-01', NULL, true, '{Go,Kubernetes,Prometheus}', NOW(), NOW()),
  ('b1000005-0000-0000-0000-000000000005', 'a0000005-0000-0000-0000-000000000005', 'Inclusive Design System', 'Open-source design system with WCAG 2.1 AAA compliance', 'Lead Designer', 'https://github.com/emmaw/inclusive-ds', '2023-03-01', NULL, true, '{Figma,React,Storybook}', NOW(), NOW()),
  ('b1000006-0000-0000-0000-000000000006', 'a0000006-0000-0000-0000-000000000006', 'DeFi Yield Aggregator', 'Cross-chain yield optimization protocol on Ethereum and Polygon', 'Lead Developer', NULL, '2022-01-01', '2024-06-01', false, '{Solidity,JavaScript,Hardhat}', NOW(), NOW()),
  ('b1000007-0000-0000-0000-000000000007', 'a0000008-0000-0000-0000-000000000008', 'EduVerse AR', 'Augmented reality learning platform for STEM education', 'Creator', NULL, '2024-01-01', NULL, true, '{Swift,ARKit,React Native}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. CERTIFICATIONS
-- ============================================================
INSERT INTO certifications (id, user_id, name, issuing_organization, issue_date, expiry_date, created_at, updated_at) VALUES
  ('c7000001-0000-0000-0000-000000000001', 'a0000004-0000-0000-0000-000000000004', 'AWS Solutions Architect Professional', 'Amazon Web Services', '2023-03-15', '2026-03-15', NOW(), NOW()),
  ('c7000002-0000-0000-0000-000000000002', 'a0000004-0000-0000-0000-000000000004', 'Certified Kubernetes Administrator', 'CNCF', '2023-06-01', '2026-06-01', NOW(), NOW()),
  ('c7000003-0000-0000-0000-000000000003', 'a0000009-0000-0000-0000-000000000009', 'CISSP', 'ISC2', '2022-01-01', '2025-01-01', NOW(), NOW()),
  ('c7000004-0000-0000-0000-000000000004', 'a0000009-0000-0000-0000-000000000009', 'Certified Ethical Hacker', 'EC-Council', '2021-06-01', '2024-06-01', NOW(), NOW()),
  ('c7000005-0000-0000-0000-000000000005', 'a0000007-0000-0000-0000-000000000007', 'Product Management Certificate', 'Stanford Online', '2022-09-01', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. EVENTS (keep existing, add created_by for company-hosted events)
-- ============================================================
-- Ensure company_id column exists on events table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'company_id') THEN
        ALTER TABLE events ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS ix_events_company_id ON events(company_id);
    END IF;
END $$;

-- Ensure virtual_meeting_url column exists on events table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'virtual_meeting_url') THEN
        ALTER TABLE events ADD COLUMN virtual_meeting_url VARCHAR(500);
    END IF;
END $$;

INSERT INTO events (id, name, description, event_type, location_name, location_city, location_country, start_datetime, end_datetime, max_attendees, price_cents, currency, is_published, is_cancelled, image_url, created_by, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'AI Innovation Hackathon 2026', 'Join us for a 48-hour hackathon focused on building AI-powered solutions for healthcare, education, and sustainability. Work alongside industry mentors from Google, Meta, and top startups. Compete for prizes worth $50,000 and potential seed funding.', 'hackathon', 'Tech Hub SF', 'San Francisco', 'USA', NOW() + INTERVAL '7 days', NOW() + INTERVAL '9 days', 200, 0, 'USD', true, false, NULL, 'a0000001-0000-0000-0000-000000000001', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'React Advanced Workshop', 'Deep dive into advanced React patterns including server components, concurrent features, and performance optimization. Led by Marcus Johnson, CTO of DevStack and former Stripe engineer. Includes hands-on coding exercises.', 'workshop', 'DevCenter NYC', 'New York', 'USA', NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days' + INTERVAL '4 hours', 50, 4999, 'USD', true, false, NULL, 'a0000002-0000-0000-0000-000000000002', NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Python for Data Science Meetup', 'Monthly meetup for Python enthusiasts interested in data science, machine learning, and AI. This month: Priya Patel from Stanford AI Lab on multimodal learning. Networking and lightning talks included.', 'meetup', 'Austin Tech Center', 'Austin', 'USA', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '3 hours', 100, 0, 'USD', true, false, NULL, 'a0000003-0000-0000-0000-000000000003', NOW()),
  ('44444444-4444-4444-4444-444444444444', 'DevOps Summit 2026', 'Annual conference bringing together DevOps professionals to discuss latest trends in CI/CD, container orchestration, and cloud infrastructure. Keynote by Alex Rivera on intelligent autoscaling.', 'conference', 'Seattle Convention Center', 'Seattle', 'USA', NOW() + INTERVAL '30 days', NOW() + INTERVAL '32 days', 500, 19999, 'USD', true, false, NULL, 'a0000004-0000-0000-0000-000000000004', NOW()),
  ('55555555-5555-5555-5555-555555555555', 'Startup Pitch Night', 'Watch early-stage startups pitch to a panel of VCs including Ryan Thompson. Great networking opportunity for founders and investors. 10 startups will pitch, followed by a mixer.', 'meetup', 'Innovation Lab', 'Boston', 'USA', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '3 hours', 150, 1500, 'USD', true, false, NULL, 'a0000010-0000-0000-0000-000000000010', NOW()),
  ('66666666-6666-6666-6666-666666666666', 'Cloud Architecture Workshop', 'Hands-on workshop covering AWS, GCP, and Azure architecture patterns. Learn to design scalable, resilient cloud solutions. Taught by Alex Rivera, AWS Solutions Architect Professional.', 'workshop', 'Cloud Campus', 'San Francisco', 'USA', NOW() + INTERVAL '21 days', NOW() + INTERVAL '21 days' + INTERVAL '6 hours', 40, 7999, 'USD', true, false, NULL, 'a0000004-0000-0000-0000-000000000004', NOW()),
  ('77777777-7777-7777-7777-777777777777', 'Blockchain Developer Conference', 'Explore the latest in Web3, smart contracts, and decentralized applications. Keynote by David Kim on cross-chain DeFi protocols. Hands-on coding sessions and expert panels.', 'conference', 'Crypto Center', 'Miami', 'USA', NOW() + INTERVAL '45 days', NOW() + INTERVAL '47 days', 300, 29999, 'USD', true, false, NULL, 'a0000006-0000-0000-0000-000000000006', NOW()),
  ('88888888-8888-8888-8888-888888888888', 'UX Design Sprint', 'Intensive 2-day design sprint workshop led by Emma Wilson, former Airbnb design lead. Learn Google Ventures design sprint methodology and apply it to real projects.', 'workshop', 'Design Studio', 'New York', 'USA', NOW() + INTERVAL '18 days', NOW() + INTERVAL '19 days', 25, 14999, 'USD', true, false, NULL, 'a0000005-0000-0000-0000-000000000005', NOW()),
  ('99999999-9999-9999-9999-999999999999', 'Open Source Contributors Meetup', 'Monthly gathering for open source enthusiasts. Share your projects, find collaborators, and learn how to contribute to major projects. Pizza and drinks provided.', 'meetup', 'Community Center', 'Portland', 'USA', NOW() + INTERVAL '12 days', NOW() + INTERVAL '12 days' + INTERVAL '2 hours', 75, 0, 'USD', true, false, NULL, 'a0000002-0000-0000-0000-000000000002', NOW()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Machine Learning Bootcamp', 'Intensive 3-day bootcamp covering ML fundamentals to advanced topics. Taught by Priya Patel. Includes hands-on projects with real datasets and career guidance.', 'workshop', 'ML Academy', 'Austin', 'USA', NOW() + INTERVAL '25 days', NOW() + INTERVAL '27 days', 30, 49999, 'USD', true, false, NULL, 'a0000003-0000-0000-0000-000000000003', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tech Networking Mixer', 'Casual networking event for tech professionals. Meet potential cofounders, collaborators, and mentors. Hosted by Ryan Thompson with a short talk on growth strategies.', 'meetup', 'The Tech Bar', 'San Francisco', 'USA', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '3 hours', 100, 0, 'USD', true, false, NULL, 'a0000010-0000-0000-0000-000000000010', NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cybersecurity Workshop', 'Learn ethical hacking, penetration testing, and security best practices. Led by Sofia Martinez, CISSP certified former Google security lead. Hands-on lab environment included.', 'workshop', 'Security Institute', 'Washington', 'USA', NOW() + INTERVAL '35 days', NOW() + INTERVAL '36 days', 35, 24999, 'USD', true, false, NULL, 'a0000009-0000-0000-0000-000000000009', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. EVENT REGISTRATIONS (users signed up for events)
-- ============================================================
INSERT INTO event_registrations (id, event_id, user_id, status, ticket_code, registered_at) VALUES
  -- AI Hackathon - popular free event
  ('e4000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a0000001-0000-0000-0000-000000000001', 'confirmed', 'AIHACK-001', NOW() - INTERVAL '2 days'),
  ('e4000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a0000002-0000-0000-0000-000000000002', 'confirmed', 'AIHACK-002', NOW() - INTERVAL '2 days'),
  ('e4000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a0000003-0000-0000-0000-000000000003', 'confirmed', 'AIHACK-003', NOW() - INTERVAL '1 day'),
  ('e4000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'a0000004-0000-0000-0000-000000000004', 'confirmed', 'AIHACK-004', NOW() - INTERVAL '1 day'),
  -- React Workshop
  ('e4000005-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'a0000005-0000-0000-0000-000000000005', 'confirmed', 'REACT-001', NOW() - INTERVAL '3 days'),
  ('e4000006-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'a0000008-0000-0000-0000-000000000008', 'confirmed', 'REACT-002', NOW() - INTERVAL '2 days'),
  -- Python Meetup
  ('e4000007-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', 'a0000001-0000-0000-0000-000000000001', 'confirmed', 'PYDS-001', NOW() - INTERVAL '1 day'),
  ('e4000008-0000-0000-0000-000000000008', '33333333-3333-3333-3333-333333333333', 'a0000007-0000-0000-0000-000000000007', 'confirmed', 'PYDS-002', NOW() - INTERVAL '1 day'),
  -- DevOps Summit
  ('e4000009-0000-0000-0000-000000000009', '44444444-4444-4444-4444-444444444444', 'a0000004-0000-0000-0000-000000000004', 'confirmed', 'DEVOPS-001', NOW() - INTERVAL '5 days'),
  ('e4000010-0000-0000-0000-000000000010', '44444444-4444-4444-4444-444444444444', 'a0000009-0000-0000-0000-000000000009', 'confirmed', 'DEVOPS-002', NOW() - INTERVAL '4 days'),
  -- Tech Mixer
  ('e4000011-0000-0000-0000-000000000011', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a0000001-0000-0000-0000-000000000001', 'confirmed', 'MIXER-001', NOW() - INTERVAL '1 day'),
  ('e4000012-0000-0000-0000-000000000012', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a0000002-0000-0000-0000-000000000002', 'confirmed', 'MIXER-002', NOW() - INTERVAL '1 day'),
  ('e4000013-0000-0000-0000-000000000013', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a0000005-0000-0000-0000-000000000005', 'confirmed', 'MIXER-003', NOW() - INTERVAL '1 day'),
  ('e4000014-0000-0000-0000-000000000014', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a0000010-0000-0000-0000-000000000010', 'confirmed', 'MIXER-004', NOW()),
  -- Cybersecurity Workshop
  ('e4000015-0000-0000-0000-000000000015', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'a0000004-0000-0000-0000-000000000004', 'confirmed', 'CYBER-001', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. COMPANIES (fixed: added slug, admin_user_id, is_active)
-- ============================================================
INSERT INTO companies (id, name, slug, description, industry, size, location, website, logo_url, banner_url, founded_year, is_verified, is_active, admin_user_id, created_at, updated_at) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'TechCorp Innovation', 'techcorp-innovation', 'Leading technology company specializing in AI and machine learning solutions for enterprise clients. Our platform processes 10M+ predictions daily.', 'Technology', 'large', 'San Francisco, CA', 'https://techcorp.example.com', NULL, NULL, 2015, true, true, 'a0000001-0000-0000-0000-000000000001', NOW(), NOW()),
  ('c0000002-0000-0000-0000-000000000002', 'DataFlow Systems', 'dataflow-systems', 'Big data analytics platform helping companies make data-driven decisions. Used by 500+ enterprises worldwide.', 'Technology', 'medium', 'New York, NY', 'https://dataflow.example.com', NULL, NULL, 2018, true, true, 'a0000003-0000-0000-0000-000000000003', NOW(), NOW()),
  ('c0000003-0000-0000-0000-000000000003', 'CloudScale Inc', 'cloudscale-inc', 'Cloud infrastructure and DevOps consulting firm. Helped 50+ startups build scalable cloud architectures on AWS, GCP, and Azure.', 'Cloud Services', 'small', 'Seattle, WA', 'https://cloudscale.example.com', NULL, NULL, 2020, true, true, 'a0000004-0000-0000-0000-000000000004', NOW(), NOW()),
  ('c0000004-0000-0000-0000-000000000004', 'FinTech Solutions', 'fintech-solutions', 'Innovative financial technology company building the future of payments for emerging markets.', 'Finance', 'medium', 'Boston, MA', 'https://fintechsol.example.com', NULL, NULL, 2017, true, true, 'a0000007-0000-0000-0000-000000000007', NOW(), NOW()),
  ('c0000005-0000-0000-0000-000000000005', 'GreenEnergy Labs', 'greenenergy-labs', 'Sustainable energy technology and research company. Using AI to optimize renewable energy grid distribution.', 'Energy', 'startup', 'Austin, TX', 'https://greenenergy.example.com', NULL, NULL, 2022, false, true, 'a0000010-0000-0000-0000-000000000010', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. COMPANY MEMBERS
-- ============================================================
INSERT INTO company_members (id, company_id, user_id, role, title, joined_at) VALUES
  -- TechCorp Innovation
  ('c0100001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'admin', 'CEO', NOW() - INTERVAL '90 days'),
  ('c0100002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000003', 'member', 'ML Lead', NOW() - INTERVAL '60 days'),
  -- DataFlow Systems
  ('c0100003-0000-0000-0000-000000000003', 'c0000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003', 'admin', 'Chief Data Scientist', NOW() - INTERVAL '80 days'),
  ('c0100004-0000-0000-0000-000000000004', 'c0000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 'member', 'Platform Engineer', NOW() - INTERVAL '50 days'),
  -- CloudScale Inc
  ('c0100005-0000-0000-0000-000000000005', 'c0000003-0000-0000-0000-000000000003', 'a0000004-0000-0000-0000-000000000004', 'admin', 'Founder & Principal', NOW() - INTERVAL '75 days'),
  ('c0100006-0000-0000-0000-000000000006', 'c0000003-0000-0000-0000-000000000003', 'a0000009-0000-0000-0000-000000000009', 'member', 'Security Consultant', NOW() - INTERVAL '30 days'),
  -- FinTech Solutions
  ('c0100007-0000-0000-0000-000000000007', 'c0000004-0000-0000-0000-000000000004', 'a0000007-0000-0000-0000-000000000007', 'admin', 'CEO', NOW() - INTERVAL '60 days'),
  ('c0100008-0000-0000-0000-000000000008', 'c0000004-0000-0000-0000-000000000004', 'a0000006-0000-0000-0000-000000000006', 'member', 'Blockchain Lead', NOW() - INTERVAL '40 days'),
  -- GreenEnergy Labs
  ('c0100009-0000-0000-0000-000000000009', 'c0000005-0000-0000-0000-000000000005', 'a0000010-0000-0000-0000-000000000010', 'admin', 'CEO', NOW() - INTERVAL '45 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. CHALLENGES (fixed: removed currency, added problem_statement, expected_outcome, skills_required, reward_description)
-- ============================================================
INSERT INTO challenges (id, company_id, title, description, problem_statement, expected_outcome, difficulty, duration_weeks, reward_amount, reward_description, skills_required, status, application_deadline, max_participants, created_at, updated_at) VALUES
  ('ch000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'AI Chatbot Enhancement', 'Improve our customer service chatbot using advanced NLP techniques.', 'Our current chatbot handles only single-turn conversations and struggles with context-dependent queries, leading to 40% escalation rates.', 'A chatbot that maintains multi-turn conversation context, reducing escalation rates to under 15%.', 'advanced', 8, 1500000, '$15,000 cash + potential full-time offer', '["Python","NLP","Machine Learning","PyTorch"]', 'open', NOW() + INTERVAL '30 days', 5, NOW(), NOW()),
  ('ch000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'ML Pipeline Optimization', 'Optimize our ML training pipeline to reduce training time by 50%.', 'Our current training pipeline takes 72 hours for a full model retrain, limiting our ability to iterate quickly.', 'A pipeline that completes full retraining in under 36 hours while maintaining model accuracy within 1% of current benchmarks.', 'intermediate', 6, 1000000, '$10,000 cash prize', '["Python","Machine Learning","Docker","AWS"]', 'open', NOW() + INTERVAL '21 days', 3, NOW(), NOW()),
  ('ch000003-0000-0000-0000-000000000003', 'c0000002-0000-0000-0000-000000000002', 'Real-time Analytics Dashboard', 'Build a real-time analytics dashboard using modern frontend frameworks.', 'Our current dashboard refreshes every 5 minutes, but customers need sub-second data for trading decisions.', 'A dashboard that displays real-time data with less than 500ms latency using WebSocket connections.', 'intermediate', 4, 800000, '$8,000 cash prize', '["React","TypeScript","WebSockets","Data Science"]', 'open', NOW() + INTERVAL '14 days', 4, NOW(), NOW()),
  ('ch000004-0000-0000-0000-000000000004', 'c0000003-0000-0000-0000-000000000003', 'Kubernetes Autoscaling Solution', 'Develop a custom Kubernetes autoscaling solution.', 'Standard HPA and VPA do not account for our application-specific metrics like queue depth and ML inference latency.', 'A custom autoscaler that scales based on application metrics, reducing cloud costs by 30% while maintaining SLA.', 'advanced', 6, 1200000, '$12,000 cash + consulting contract', '["Kubernetes","Go","Docker","DevOps"]', 'open', NOW() + INTERVAL '28 days', 2, NOW(), NOW()),
  ('ch000005-0000-0000-0000-000000000005', 'c0000004-0000-0000-0000-000000000004', 'Payment Fraud Detection', 'Build a machine learning model to detect fraudulent transactions in real-time.', 'We process 1M+ transactions daily and current rule-based detection has a 5% false positive rate and misses 15% of fraud.', 'An ML model that reduces false positives to under 1% while catching 95%+ of fraudulent transactions.', 'advanced', 10, 2000000, '$20,000 cash + equity options', '["Python","Machine Learning","Data Science","PostgreSQL"]', 'open', NOW() + INTERVAL '45 days', 3, NOW(), NOW()),
  ('ch000006-0000-0000-0000-000000000006', 'c0000005-0000-0000-0000-000000000005', 'Energy Usage Prediction', 'Create a predictive model for energy consumption patterns.', 'Unpredictable energy demand causes 20% energy waste in our grid distribution network.', 'A prediction model with 90%+ accuracy for 24-hour energy demand forecasting.', 'beginner', 4, 500000, '$5,000 cash prize', '["Python","Data Science","Machine Learning"]', 'open', NOW() + INTERVAL '21 days', 6, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 14. CHALLENGE APPLICATIONS
-- ============================================================
INSERT INTO challenge_applications (id, challenge_id, user_id, status, cover_letter, applied_at) VALUES
  ('ca000001-0000-0000-0000-000000000001', 'ch000001-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000003', 'accepted', 'As a PhD researcher in NLP at Stanford, I have extensive experience with multi-turn dialogue systems and have published work on context-dependent reasoning.', NOW() - INTERVAL '5 days'),
  ('ca000002-0000-0000-0000-000000000002', 'ch000003-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', 'pending', 'I built real-time dashboards at Stripe processing millions of events per second. I can deliver a WebSocket-based solution within 3 weeks.', NOW() - INTERVAL '2 days'),
  ('ca000003-0000-0000-0000-000000000003', 'ch000004-0000-0000-0000-000000000004', 'a0000004-0000-0000-0000-000000000004', 'accepted', 'As an AWS Solutions Architect and CKA holder, I have designed custom autoscaling solutions for 50+ production workloads.', NOW() - INTERVAL '7 days'),
  ('ca000004-0000-0000-0000-000000000004', 'ch000005-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'pending', 'My experience building ML models for healthcare fraud detection directly applies. I can leverage anomaly detection and real-time scoring patterns.', NOW() - INTERVAL '1 day'),
  ('ca000005-0000-0000-0000-000000000005', 'ch000006-0000-0000-0000-000000000006', 'a0000003-0000-0000-0000-000000000003', 'pending', 'Time-series forecasting is one of my core competencies. I have built demand prediction models for energy companies.', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 15. COMMUNITIES (fixed: replaced is_public with is_private, added slug, created_by, post_count)
-- ============================================================
INSERT INTO communities (id, name, slug, description, category, image_url, banner_url, is_private, is_archived, member_count, post_count, created_by, created_at, updated_at) VALUES
  ('cm000001-0000-0000-0000-000000000001', 'Python Developers', 'python-developers', 'A community for Python developers of all levels. Share projects, ask questions, and learn together.', 'technology', NULL, NULL, false, false, 6, 3, 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '80 days', NOW()),
  ('cm000002-0000-0000-0000-000000000002', 'AI/ML Enthusiasts', 'ai-ml-enthusiasts', 'Discuss the latest in artificial intelligence and machine learning. From beginners to experts.', 'ai_ml', NULL, NULL, false, false, 5, 2, 'a0000003-0000-0000-0000-000000000003', NOW() - INTERVAL '75 days', NOW()),
  ('cm000003-0000-0000-0000-000000000003', 'Startup Founders', 'startup-founders', 'Connect with fellow founders, share experiences, and get advice on building your startup.', 'entrepreneurship', NULL, NULL, false, false, 5, 2, 'a0000010-0000-0000-0000-000000000010', NOW() - INTERVAL '70 days', NOW()),
  ('cm000004-0000-0000-0000-000000000004', 'DevOps & Cloud', 'devops-cloud', 'All things DevOps, cloud architecture, and infrastructure automation.', 'technology', NULL, NULL, false, false, 4, 2, 'a0000004-0000-0000-0000-000000000004', NOW() - INTERVAL '65 days', NOW()),
  ('cm000005-0000-0000-0000-000000000005', 'Frontend Engineers', 'frontend-engineers', 'React, Vue, Angular, and beyond. Discuss frontend development best practices.', 'technology', NULL, NULL, false, false, 4, 1, 'a0000002-0000-0000-0000-000000000002', NOW() - INTERVAL '60 days', NOW()),
  ('cm000006-0000-0000-0000-000000000006', 'Data Scientists Network', 'data-scientists-network', 'Share insights, datasets, and collaborate on data science projects.', 'data_science', NULL, NULL, false, false, 3, 1, 'a0000003-0000-0000-0000-000000000003', NOW() - INTERVAL '55 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 16. COMMUNITY MEMBERS
-- ============================================================
INSERT INTO community_members (id, community_id, user_id, role, joined_at) VALUES
  -- Python Developers (6 members)
  ('c0b00001-0000-0000-0000-000000000001', 'cm000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'owner', NOW() - INTERVAL '80 days'),
  ('c0b00002-0000-0000-0000-000000000002', 'cm000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'member', NOW() - INTERVAL '70 days'),
  ('c0b00003-0000-0000-0000-000000000003', 'cm000001-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000003', 'moderator', NOW() - INTERVAL '65 days'),
  ('c0b00004-0000-0000-0000-000000000004', 'cm000001-0000-0000-0000-000000000001', 'a0000004-0000-0000-0000-000000000004', 'member', NOW() - INTERVAL '50 days'),
  ('c0b00005-0000-0000-0000-000000000005', 'cm000001-0000-0000-0000-000000000001', 'a0000007-0000-0000-0000-000000000007', 'member', NOW() - INTERVAL '40 days'),
  ('c0b00006-0000-0000-0000-000000000006', 'cm000001-0000-0000-0000-000000000001', 'a0000009-0000-0000-0000-000000000009', 'member', NOW() - INTERVAL '30 days'),

  -- AI/ML Enthusiasts (5 members)
  ('c0b00007-0000-0000-0000-000000000007', 'cm000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003', 'owner', NOW() - INTERVAL '75 days'),
  ('c0b00008-0000-0000-0000-000000000008', 'cm000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'moderator', NOW() - INTERVAL '70 days'),
  ('c0b00009-0000-0000-0000-000000000009', 'cm000002-0000-0000-0000-000000000002', 'a0000007-0000-0000-0000-000000000007', 'member', NOW() - INTERVAL '50 days'),
  ('c0b00010-0000-0000-0000-000000000010', 'cm000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 'member', NOW() - INTERVAL '40 days'),
  ('c0b00011-0000-0000-0000-000000000011', 'cm000002-0000-0000-0000-000000000002', 'a0000010-0000-0000-0000-000000000010', 'member', NOW() - INTERVAL '30 days'),

  -- Startup Founders (5 members)
  ('c0b00012-0000-0000-0000-000000000012', 'cm000003-0000-0000-0000-000000000003', 'a0000010-0000-0000-0000-000000000010', 'owner', NOW() - INTERVAL '70 days'),
  ('c0b00013-0000-0000-0000-000000000013', 'cm000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'member', NOW() - INTERVAL '60 days'),
  ('c0b00014-0000-0000-0000-000000000014', 'cm000003-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', 'member', NOW() - INTERVAL '55 days'),
  ('c0b00015-0000-0000-0000-000000000015', 'cm000003-0000-0000-0000-000000000003', 'a0000006-0000-0000-0000-000000000006', 'member', NOW() - INTERVAL '45 days'),
  ('c0b00016-0000-0000-0000-000000000016', 'cm000003-0000-0000-0000-000000000003', 'a0000007-0000-0000-0000-000000000007', 'member', NOW() - INTERVAL '40 days'),

  -- DevOps & Cloud (4 members)
  ('c0b00017-0000-0000-0000-000000000017', 'cm000004-0000-0000-0000-000000000004', 'a0000004-0000-0000-0000-000000000004', 'owner', NOW() - INTERVAL '65 days'),
  ('c0b00018-0000-0000-0000-000000000018', 'cm000004-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002', 'member', NOW() - INTERVAL '50 days'),
  ('c0b00019-0000-0000-0000-000000000019', 'cm000004-0000-0000-0000-000000000004', 'a0000009-0000-0000-0000-000000000009', 'member', NOW() - INTERVAL '40 days'),
  ('c0b00020-0000-0000-0000-000000000020', 'cm000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'member', NOW() - INTERVAL '30 days'),

  -- Frontend Engineers (4 members)
  ('c0b00021-0000-0000-0000-000000000021', 'cm000005-0000-0000-0000-000000000005', 'a0000002-0000-0000-0000-000000000002', 'owner', NOW() - INTERVAL '60 days'),
  ('c0b00022-0000-0000-0000-000000000022', 'cm000005-0000-0000-0000-000000000005', 'a0000005-0000-0000-0000-000000000005', 'member', NOW() - INTERVAL '45 days'),
  ('c0b00023-0000-0000-0000-000000000023', 'cm000005-0000-0000-0000-000000000005', 'a0000008-0000-0000-0000-000000000008', 'member', NOW() - INTERVAL '35 days'),
  ('c0b00024-0000-0000-0000-000000000024', 'cm000005-0000-0000-0000-000000000005', 'a0000006-0000-0000-0000-000000000006', 'member', NOW() - INTERVAL '25 days'),

  -- Data Scientists Network (3 members)
  ('c0b00025-0000-0000-0000-000000000025', 'cm000006-0000-0000-0000-000000000006', 'a0000003-0000-0000-0000-000000000003', 'owner', NOW() - INTERVAL '55 days'),
  ('c0b00026-0000-0000-0000-000000000026', 'cm000006-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', 'member', NOW() - INTERVAL '40 days'),
  ('c0b00027-0000-0000-0000-000000000027', 'cm000006-0000-0000-0000-000000000006', 'a0000007-0000-0000-0000-000000000007', 'member', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 17. COMMUNITY POSTS
-- ============================================================
INSERT INTO community_posts (id, community_id, user_id, title, content, is_pinned, upvote_count, comment_count, view_count, created_at, updated_at) VALUES
  -- Python Developers posts
  ('c1000001-0000-0000-0000-000000000001', 'cm000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Python 3.13 - What''s New and Why You Should Care', 'Python 3.13 brings some amazing features including a JIT compiler, improved error messages, and better typing support. Here are the highlights and how they affect your daily coding...', true, 24, 8, 156, NOW() - INTERVAL '15 days', NOW()),
  ('c1000002-0000-0000-0000-000000000002', 'cm000001-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000003', 'Best practices for ML model serving with FastAPI', 'After deploying 20+ ML models in production, here are my top recommendations for serving models with FastAPI: batch processing, async inference, model caching, and health checks...', false, 18, 5, 98, NOW() - INTERVAL '10 days', NOW()),
  ('c1000003-0000-0000-0000-000000000003', 'cm000001-0000-0000-0000-000000000001', 'a0000004-0000-0000-0000-000000000004', 'From Python scripts to production: My DevOps journey', 'Sharing my experience taking Python projects from jupyter notebooks to production-grade systems. Key lessons: containerization, CI/CD, monitoring, and the importance of type hints.', false, 12, 3, 67, NOW() - INTERVAL '5 days', NOW()),

  -- AI/ML Enthusiasts posts
  ('c1000004-0000-0000-0000-000000000004', 'cm000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003', 'Multimodal Learning: The Next Frontier of AI', 'My latest research at Stanford explores how combining vision, language, and audio modalities can create more robust AI systems. Here''s a summary of our NeurIPS 2025 paper...', true, 32, 12, 234, NOW() - INTERVAL '20 days', NOW()),
  ('c1000005-0000-0000-0000-000000000005', 'cm000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'Building AI for Healthcare: Lessons from the Trenches', 'After 2 years building MedAI Labs, here are the unique challenges of healthcare AI: data privacy, regulatory compliance, clinical validation, and building trust with doctors.', false, 21, 7, 145, NOW() - INTERVAL '12 days', NOW()),

  -- Startup Founders posts
  ('c1000006-0000-0000-0000-000000000006', 'cm000003-0000-0000-0000-000000000003', 'a0000010-0000-0000-0000-000000000010', 'The PLG Playbook: How We Got Our First 10K Users', 'Product-led growth strategies that actually work for B2B SaaS. Covering freemium models, viral loops, activation metrics, and the magic moment concept.', true, 28, 9, 189, NOW() - INTERVAL '18 days', NOW()),
  ('c1000007-0000-0000-0000-000000000007', 'cm000003-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', 'Technical Co-Founder Handbook: What I Wish I Knew', 'As a CTO of a YC company, here are my hard-earned lessons about technical leadership, hiring your first engineers, and managing tech debt while moving fast.', false, 19, 6, 134, NOW() - INTERVAL '8 days', NOW()),

  -- DevOps & Cloud posts
  ('c1000008-0000-0000-0000-000000000008', 'cm000004-0000-0000-0000-000000000004', 'a0000004-0000-0000-0000-000000000004', 'Kubernetes Cost Optimization: A Complete Guide', 'Most companies overspend on K8s by 40-60%. Here''s how to right-size your clusters, use spot instances effectively, and implement proper autoscaling.', true, 25, 8, 178, NOW() - INTERVAL '14 days', NOW()),
  ('c1000009-0000-0000-0000-000000000009', 'cm000004-0000-0000-0000-000000000004', 'a0000009-0000-0000-0000-000000000009', 'DevSecOps: Integrating Security into Your CI/CD Pipeline', 'Security should be built in, not bolted on. Here are practical tools and patterns for shifting security left: SAST, DAST, container scanning, and secrets management.', false, 15, 4, 89, NOW() - INTERVAL '6 days', NOW()),

  -- Frontend Engineers post
  ('c1000010-0000-0000-0000-000000000010', 'cm000005-0000-0000-0000-000000000005', 'a0000002-0000-0000-0000-000000000002', 'React Server Components in Production: Real-World Lessons', 'After migrating our platform to RSC, here are the wins, gotchas, and performance improvements we saw. Plus a migration guide for your existing React apps.', true, 20, 6, 145, NOW() - INTERVAL '11 days', NOW()),

  -- Data Scientists Network post
  ('c1000011-0000-0000-0000-000000000011', 'cm000006-0000-0000-0000-000000000006', 'a0000003-0000-0000-0000-000000000003', 'Building Reproducible ML Experiments: Tools and Best Practices', 'Reproducibility is critical in data science. I''ll walk through my stack: DVC for data versioning, MLflow for experiment tracking, and Docker for environment consistency.', true, 16, 5, 112, NOW() - INTERVAL '9 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 18. COMMUNITY COMMENTS
-- ============================================================
INSERT INTO community_comments (id, post_id, user_id, parent_id, content, upvote_count, created_at, updated_at) VALUES
  -- Comments on Python 3.13 post
  ('cc000001-0000-0000-0000-000000000001', 'c1000001-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000003', NULL, 'The JIT compiler improvements are incredible! I tested it on our ML pipeline and saw 15% speedup on data preprocessing tasks.', 8, NOW() - INTERVAL '14 days', NOW()),
  ('cc000002-0000-0000-0000-000000000002', 'c1000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', NULL, 'Great summary! The improved error messages alone are worth the upgrade. No more cryptic tracebacks.', 5, NOW() - INTERVAL '13 days', NOW()),
  ('cc000003-0000-0000-0000-000000000003', 'c1000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'cc000001-0000-0000-0000-000000000001', 'That''s impressive! Which specific preprocessing operations saw the biggest gains?', 3, NOW() - INTERVAL '13 days', NOW()),

  -- Comments on Multimodal Learning post
  ('cc000004-0000-0000-0000-000000000004', 'c1000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', NULL, 'This is exactly what we need for healthcare diagnostics! Combining imaging data with clinical notes could be a game changer.', 12, NOW() - INTERVAL '19 days', NOW()),
  ('cc000005-0000-0000-0000-000000000005', 'c1000004-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002', NULL, 'How does this compare to the attention-based fusion approaches? Our team has been experimenting with cross-modal transformers.', 6, NOW() - INTERVAL '18 days', NOW()),

  -- Comments on PLG Playbook post
  ('cc000006-0000-0000-0000-000000000006', 'c1000006-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', NULL, 'The magic moment framework is spot on. For our product, it was when users saw their first AI-generated diagnosis report.', 9, NOW() - INTERVAL '17 days', NOW()),
  ('cc000007-0000-0000-0000-000000000007', 'c1000006-0000-0000-0000-000000000006', 'a0000007-0000-0000-0000-000000000007', NULL, 'Love this! Can you elaborate on the viral loop mechanics? We''re struggling with referral programs in fintech.', 4, NOW() - INTERVAL '16 days', NOW()),

  -- Comments on K8s Cost post
  ('cc000008-0000-0000-0000-000000000008', 'c1000008-0000-0000-0000-000000000008', 'a0000009-0000-0000-0000-000000000009', NULL, 'Spot instances are great but risky for stateful workloads. What''s your recommendation for databases on K8s?', 7, NOW() - INTERVAL '13 days', NOW()),
  ('cc000009-0000-0000-0000-000000000009', 'c1000008-0000-0000-0000-000000000008', 'a0000004-0000-0000-0000-000000000004', 'cc000008-0000-0000-0000-000000000008', 'Great question! For databases, I recommend managed services (RDS, Cloud SQL) over running them on K8s. Use K8s for stateless workloads only.', 10, NOW() - INTERVAL '12 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 19. CONNECTIONS (professional network)
-- ============================================================
INSERT INTO connections (id, requester_id, addressee_id, status, message, requested_at, responded_at) VALUES
  -- Sarah Chen's connections (connected to Marcus, Priya, Alex, Emma, Ryan, Lisa)
  ('c2000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'accepted', 'Hi Marcus! Loved your talk on developer tools. Would love to connect!', NOW() - INTERVAL '60 days', NOW() - INTERVAL '59 days'),
  ('c2000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000003', 'accepted', 'Hey Priya, fellow ML researcher here. Let''s collaborate!', NOW() - INTERVAL '55 days', NOW() - INTERVAL '54 days'),
  ('c2000003-0000-0000-0000-000000000003', 'a0000004-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'accepted', 'Sarah, I can help with cloud infrastructure for MedAI Labs!', NOW() - INTERVAL '50 days', NOW() - INTERVAL '49 days'),
  ('c2000004-0000-0000-0000-000000000004', 'a0000005-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'accepted', 'Would love to discuss UX for healthcare AI products!', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days'),
  ('c2000005-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'a0000010-0000-0000-0000-000000000010', 'accepted', 'Ryan, your growth strategies are exactly what MedAI needs!', NOW() - INTERVAL '40 days', NOW() - INTERVAL '39 days'),
  ('c2000006-0000-0000-0000-000000000006', 'a0000007-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', 'accepted', 'Fellow founder here! Would love to share experiences.', NOW() - INTERVAL '35 days', NOW() - INTERVAL '34 days'),

  -- Marcus Johnson's connections (+ Priya, Alex, Emma, James)
  ('c2000007-0000-0000-0000-000000000007', 'a0000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003', 'accepted', 'Priya, interested in integrating ML features into DevStack!', NOW() - INTERVAL '50 days', NOW() - INTERVAL '49 days'),
  ('c2000008-0000-0000-0000-000000000008', 'a0000002-0000-0000-0000-000000000002', 'a0000004-0000-0000-0000-000000000004', 'accepted', 'Alex, would love to discuss infrastructure for DevStack!', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days'),
  ('c2000009-0000-0000-0000-000000000009', 'a0000005-0000-0000-0000-000000000005', 'a0000002-0000-0000-0000-000000000002', 'accepted', 'Marcus, let''s talk about UX for developer tools!', NOW() - INTERVAL '40 days', NOW() - INTERVAL '39 days'),
  ('c2000010-0000-0000-0000-000000000010', 'a0000008-0000-0000-0000-000000000008', 'a0000002-0000-0000-0000-000000000002', 'accepted', 'Hey Marcus, would love to discuss mobile SDKs for DevStack!', NOW() - INTERVAL '35 days', NOW() - INTERVAL '34 days'),

  -- Priya Patel's connections (+ Alex, Lisa)
  ('c2000011-0000-0000-0000-000000000011', 'a0000003-0000-0000-0000-000000000003', 'a0000004-0000-0000-0000-000000000004', 'accepted', 'Alex, ML model deployment is my weakness - can you help?', NOW() - INTERVAL '40 days', NOW() - INTERVAL '39 days'),
  ('c2000012-0000-0000-0000-000000000012', 'a0000003-0000-0000-0000-000000000003', 'a0000007-0000-0000-0000-000000000007', 'accepted', 'Lisa, I''d love to explore ML applications in fintech!', NOW() - INTERVAL '35 days', NOW() - INTERVAL '34 days'),

  -- Alex Rivera's connections (+ David, Sofia)
  ('c2000013-0000-0000-0000-000000000013', 'a0000004-0000-0000-0000-000000000004', 'a0000006-0000-0000-0000-000000000006', 'accepted', 'David, interested in cloud infrastructure for Web3 projects?', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days'),
  ('c2000014-0000-0000-0000-000000000014', 'a0000004-0000-0000-0000-000000000004', 'a0000009-0000-0000-0000-000000000009', 'accepted', 'Sofia, security is critical for CloudScale - let''s collaborate!', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days'),

  -- Emma Wilson's connections (+ Lisa, James)
  ('c2000015-0000-0000-0000-000000000015', 'a0000005-0000-0000-0000-000000000005', 'a0000007-0000-0000-0000-000000000007', 'accepted', 'Lisa, I''d love to design the UX for PayBridge!', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days'),
  ('c2000016-0000-0000-0000-000000000016', 'a0000005-0000-0000-0000-000000000005', 'a0000008-0000-0000-0000-000000000008', 'accepted', 'James, AR/VR design is fascinating - let''s chat!', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days'),

  -- David Kim's connections (+ Ryan)
  ('c2000017-0000-0000-0000-000000000017', 'a0000006-0000-0000-0000-000000000006', 'a0000010-0000-0000-0000-000000000010', 'accepted', 'Ryan, need growth advice for my DeFi project!', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days'),

  -- Lisa Zhang's connections (+ Ryan)
  ('c2000018-0000-0000-0000-000000000018', 'a0000007-0000-0000-0000-000000000007', 'a0000010-0000-0000-0000-000000000010', 'accepted', 'Ryan, PayBridge needs your growth expertise!', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),

  -- Pending connection requests (for demo)
  ('c2000019-0000-0000-0000-000000000019', 'a0000006-0000-0000-0000-000000000006', 'a0000003-0000-0000-0000-000000000003', 'pending', 'Hi Priya, I''m exploring ML for smart contract analysis. Would love to connect!', NOW() - INTERVAL '2 days', NULL),
  ('c2000020-0000-0000-0000-000000000020', 'a0000008-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000001', 'pending', 'Sarah, your healthcare AI work is inspiring! Would love to chat about mobile health apps.', NOW() - INTERVAL '1 day', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 20. CONVERSATIONS & MESSAGES
-- ============================================================
INSERT INTO conversations (id, created_at, updated_at) VALUES
  ('c9000001-0000-0000-0000-000000000001', NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day'),
  ('c9000002-0000-0000-0000-000000000002', NOW() - INTERVAL '25 days', NOW() - INTERVAL '2 days'),
  ('c9000003-0000-0000-0000-000000000003', NOW() - INTERVAL '20 days', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversation_participants (id, conversation_id, user_id, last_read_at, joined_at) VALUES
  -- Sarah <-> Marcus conversation
  ('c9b00001-0000-0000-0000-000000000001', 'c9000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 days'),
  ('c9b00002-0000-0000-0000-000000000002', 'c9000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days', NOW() - INTERVAL '30 days'),
  -- Sarah <-> Priya conversation
  ('c9b00003-0000-0000-0000-000000000003', 'c9000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days', NOW() - INTERVAL '25 days'),
  ('c9b00004-0000-0000-0000-000000000004', 'c9000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003', NOW() - INTERVAL '3 days', NOW() - INTERVAL '25 days'),
  -- Marcus <-> Alex conversation
  ('c9b00005-0000-0000-0000-000000000005', 'c9000003-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days', NOW() - INTERVAL '20 days'),
  ('c9b00006-0000-0000-0000-000000000006', 'c9000003-0000-0000-0000-000000000003', 'a0000004-0000-0000-0000-000000000004', NOW() - INTERVAL '4 days', NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, conversation_id, sender_id, content, created_at, updated_at) VALUES
  -- Sarah <-> Marcus
  ('d5000001-0000-0000-0000-000000000001', 'c9000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Hey Marcus! Thanks for connecting. I saw DevStack and it looks amazing. We''re building developer tools for our AI pipeline - would love to learn from your experience.', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
  ('d5000002-0000-0000-0000-000000000002', 'c9000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'Thanks Sarah! MedAI Labs sounds fascinating. Healthcare AI is such an impactful space. Happy to share what we''ve learned about developer tooling.', NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days'),
  ('d5000003-0000-0000-0000-000000000003', 'c9000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'That would be great! We''re particularly struggling with making our ML models easy for clinicians to use. Any thoughts on developer experience for non-technical users?', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'),
  ('d5000004-0000-0000-0000-000000000004', 'c9000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 'Absolutely. The key is progressive disclosure - start simple, let users dig deeper. I''d love to chat more about this. Free for coffee next week?', NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days'),
  ('d5000005-0000-0000-0000-000000000005', 'c9000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Perfect! How about Wednesday at 2pm at Blue Bottle on Market St?', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  -- Sarah <-> Priya
  ('d5000006-0000-0000-0000-000000000006', 'c9000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'Priya! Your multimodal learning paper was incredible. I think this approach could revolutionize medical imaging analysis.', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  ('d5000007-0000-0000-0000-000000000007', 'c9000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003', 'Thanks Sarah! I''ve actually been thinking about healthcare applications. Combining radiology images with patient notes could improve diagnostic accuracy.', NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
  ('d5000008-0000-0000-0000-000000000008', 'c9000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'Exactly what we''re working on! Would you be interested in a research collaboration? We have access to anonymized datasets from 3 hospital systems.', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days'),
  ('d5000009-0000-0000-0000-000000000009', 'c9000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003', 'That sounds amazing! Let me check with my advisor. I think we could publish something groundbreaking together. Let''s set up a call this week.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  -- Marcus <-> Alex
  ('d5000010-0000-0000-0000-000000000010', 'c9000003-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', 'Alex, we''re scaling DevStack and hitting some infrastructure challenges. Our K8s costs are through the roof. Any tips?', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  ('d5000011-0000-0000-0000-000000000011', 'c9000003-0000-0000-0000-000000000003', 'a0000004-0000-0000-0000-000000000004', 'Hey Marcus! Common problem. 90% of the time it''s oversized pods and no autoscaling. Want me to do a quick audit? I''ll take a look for free since I love what DevStack is building.', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),
  ('d5000012-0000-0000-0000-000000000012', 'c9000003-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', 'That would be incredible! I''ll send you our Grafana dashboard access. We''re currently spending about $15K/month on AWS.', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
  ('d5000013-0000-0000-0000-000000000013', 'c9000003-0000-0000-0000-000000000003', 'a0000004-0000-0000-0000-000000000004', 'I bet we can cut that by 40%. Send over the access and I''ll have recommendations by end of week. Also, check out the K8s challenge I posted on CloudScale - it''s right up your alley!', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 21. NOTIFICATIONS
-- ============================================================
INSERT INTO notifications (id, user_id, type, title, message, link, is_read, related_id, created_at) VALUES
  -- Connection notifications
  ('d7000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'connection_request', 'New Connection Request', 'James Okonkwo wants to connect with you', '/network', false, 'a0000008-0000-0000-0000-000000000008', NOW() - INTERVAL '1 day'),
  ('d7000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003', 'connection_request', 'New Connection Request', 'David Kim wants to connect with you', '/network', false, 'a0000006-0000-0000-0000-000000000006', NOW() - INTERVAL '2 days'),

  -- Event reminders
  ('d7000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'event_reminder', 'Event Coming Up!', 'Tech Networking Mixer is in 3 days. Don''t forget to attend!', '/events/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW()),
  ('d7000004-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002', 'event_reminder', 'Event Coming Up!', 'Tech Networking Mixer is in 3 days. See you there!', '/events/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW()),

  -- Challenge updates
  ('d7000005-0000-0000-0000-000000000005', 'a0000003-0000-0000-0000-000000000003', 'challenge_update', 'Application Accepted!', 'Your application for "AI Chatbot Enhancement" has been accepted. Welcome to the challenge!', '/challenges/ch000001-0000-0000-0000-000000000001', false, 'ch000001-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days'),
  ('d7000006-0000-0000-0000-000000000006', 'a0000004-0000-0000-0000-000000000004', 'challenge_update', 'Application Accepted!', 'Your application for "Kubernetes Autoscaling Solution" has been accepted!', '/challenges/ch000004-0000-0000-0000-000000000004', false, 'ch000004-0000-0000-0000-000000000004', NOW() - INTERVAL '5 days'),

  -- New messages
  ('d7000007-0000-0000-0000-000000000007', 'a0000002-0000-0000-0000-000000000002', 'new_message', 'New Message from Sarah Chen', 'Perfect! How about Wednesday at 2pm at Blue Bottle on Market St?', '/messages', false, 'c9000001-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day'),

  -- Community mentions
  ('d7000008-0000-0000-0000-000000000008', 'a0000004-0000-0000-0000-000000000004', 'post_reply', 'Reply to Your Post', 'Sofia Martinez replied to your post "Kubernetes Cost Optimization"', '/communities/cm000004-0000-0000-0000-000000000004', false, 'c1000008-0000-0000-0000-000000000008', NOW() - INTERVAL '6 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DONE! Demo data seeded successfully.
--
-- Demo login credentials:
--   sarah@demo.com / Demo1234!    (AI/ML founder - primary demo user)
--   marcus@demo.com / Demo1234!   (Full-stack CTO)
--   priya@demo.com / Demo1234!    (Data Scientist/ML)
--   alex@demo.com / Demo1234!     (Cloud/DevOps)
--   emma@demo.com / Demo1234!     (UX/Product)
--   david@demo.com / Demo1234!    (Blockchain/Web3)
--   lisa@demo.com / Demo1234!     (FinTech PM)
--   james@demo.com / Demo1234!    (Mobile/AR)
--   sofia@demo.com / Demo1234!    (Cybersecurity)
--   ryan@demo.com / Demo1234!     (Growth)
-- ============================================================
