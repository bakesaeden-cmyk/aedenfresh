-- ============================================================
-- Aeden Fresh — Migration 0003: seed data
--
-- Idempotent: every insert targets a unique constraint
-- (primary key, unique(code), or unique(store_id, product_option_id))
-- with `on conflict ... do nothing`, and all cross-references use
-- fixed literal UUIDs so the script can be re-run safely.
--
-- UUID namespaces (for readability):
--   aaaaaaaa-…  stores
--   bbbbbbbb-…  store_pincode_coverage
--   cccccccc-…  delivery_slots
--   dddddddd-…  product_categories
--   eeeeeeee-…  product_options   (…-0000000001xx bases, 02xx proteins,
--                                  03xx dressings, 04xx toppings,
--                                  05xx add-ons, 06xx portions)
--   ffffffff-…  curated_baskets / coupons
-- ============================================================

begin;

-- ============================================================
-- 1. STORES (5 Kochi-region locations)
-- ============================================================
insert into stores (id, name, address, pincode, latitude, longitude, phone, is_active, operating_hours) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Aeden Fresh Kadavanthara',
   'Ground Floor, Pallath Heights, Kaloor–Kadavanthara Road, Kadavanthara, Kochi, Kerala',
   '682020', 9.9625, 76.3009, '+91 484 298 0001', true,
   '{"mon":{"open":"08:00","close":"21:30"},"tue":{"open":"08:00","close":"21:30"},"wed":{"open":"08:00","close":"21:30"},"thu":{"open":"08:00","close":"21:30"},"fri":{"open":"08:00","close":"21:30"},"sat":{"open":"08:00","close":"21:30"},"sun":{"open":"08:00","close":"20:30"}}'::jsonb),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Aeden Fresh Kacheripady',
   'Sree Kovil Arcade, Chittoor Road, Kacheripady Junction, Ernakulam, Kochi, Kerala',
   '682018', 9.9884, 76.2806, '+91 484 298 0002', true,
   '{"mon":{"open":"08:00","close":"21:30"},"tue":{"open":"08:00","close":"21:30"},"wed":{"open":"08:00","close":"21:30"},"thu":{"open":"08:00","close":"21:30"},"fri":{"open":"08:00","close":"21:30"},"sat":{"open":"08:00","close":"21:30"},"sun":{"open":"08:00","close":"20:30"}}'::jsonb),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'Aeden Fresh Thrippunithura',
   'Nadama Junction, Hill Palace Road, Thrippunithura, Kochi, Kerala',
   '682301', 9.9459, 76.3505, '+91 484 298 0003', true,
   '{"mon":{"open":"08:00","close":"21:30"},"tue":{"open":"08:00","close":"21:30"},"wed":{"open":"08:00","close":"21:30"},"thu":{"open":"08:00","close":"21:30"},"fri":{"open":"08:00","close":"21:30"},"sat":{"open":"08:00","close":"21:30"},"sun":{"open":"08:00","close":"20:30"}}'::jsonb),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'Aeden Fresh Kakkanad',
   'Trinity Square, Seaport–Airport Road, near Infopark, Kakkanad, Kochi, Kerala',
   '682030', 10.0160, 76.3621, '+91 484 298 0004', true,
   '{"mon":{"open":"08:00","close":"21:30"},"tue":{"open":"08:00","close":"21:30"},"wed":{"open":"08:00","close":"21:30"},"thu":{"open":"08:00","close":"21:30"},"fri":{"open":"08:00","close":"21:30"},"sat":{"open":"08:00","close":"21:30"},"sun":{"open":"08:00","close":"20:30"}}'::jsonb),
  ('aaaaaaaa-0000-4000-8000-000000000005', 'Aeden Fresh Unichira',
   'Seaport–Airport Road, Unichira Junction, Thrikkakara, Kochi, Kerala',
   '682021', 10.0329, 76.3183, '+91 484 298 0005', true,
   '{"mon":{"open":"08:00","close":"21:30"},"tue":{"open":"08:00","close":"21:30"},"wed":{"open":"08:00","close":"21:30"},"thu":{"open":"08:00","close":"21:30"},"fri":{"open":"08:00","close":"21:30"},"sat":{"open":"08:00","close":"21:30"},"sun":{"open":"08:00","close":"20:30"}}'::jsonb)
on conflict (id) do nothing;

-- ============================================================
-- 2. STORE PINCODE COVERAGE
--    fee 0 for the store's own pincode, 20–40 for neighbours.
--    NOTE: 682019 is covered by BOTH Kadavanthara (25) and
--    Kacheripady (20) — routing tie-break test case.
-- ============================================================
insert into store_pincode_coverage (id, store_id, pincode, delivery_fee, is_active) values
  -- Kadavanthara (flagship) — 6 pincodes
  ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '682020',  0, true),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', '682016', 20, true),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', '682017', 25, true),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', '682019', 25, true), -- overlaps Kacheripady
  ('bbbbbbbb-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000001', '682024', 30, true),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000001', '682036', 35, true),
  -- Kacheripady — 5 pincodes
  ('bbbbbbbb-0000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-000000000002', '682018',  0, true),
  ('bbbbbbbb-0000-4000-8000-000000000008', 'aaaaaaaa-0000-4000-8000-000000000002', '682019', 20, true), -- overlaps Kadavanthara (cheaper)
  ('bbbbbbbb-0000-4000-8000-000000000009', 'aaaaaaaa-0000-4000-8000-000000000002', '682017', 20, true),
  ('bbbbbbbb-0000-4000-8000-000000000010', 'aaaaaaaa-0000-4000-8000-000000000002', '682025', 25, true),
  ('bbbbbbbb-0000-4000-8000-000000000011', 'aaaaaaaa-0000-4000-8000-000000000002', '682031', 30, true),
  -- Thrippunithura — 5 pincodes
  ('bbbbbbbb-0000-4000-8000-000000000012', 'aaaaaaaa-0000-4000-8000-000000000003', '682301',  0, true),
  ('bbbbbbbb-0000-4000-8000-000000000013', 'aaaaaaaa-0000-4000-8000-000000000003', '682304', 25, true),
  ('bbbbbbbb-0000-4000-8000-000000000014', 'aaaaaaaa-0000-4000-8000-000000000003', '682305', 25, true),
  ('bbbbbbbb-0000-4000-8000-000000000015', 'aaaaaaaa-0000-4000-8000-000000000003', '682306', 30, true),
  ('bbbbbbbb-0000-4000-8000-000000000016', 'aaaaaaaa-0000-4000-8000-000000000003', '682307', 35, true),
  -- Kakkanad — 5 pincodes
  ('bbbbbbbb-0000-4000-8000-000000000017', 'aaaaaaaa-0000-4000-8000-000000000004', '682030',  0, true),
  ('bbbbbbbb-0000-4000-8000-000000000018', 'aaaaaaaa-0000-4000-8000-000000000004', '682037', 20, true),
  ('bbbbbbbb-0000-4000-8000-000000000019', 'aaaaaaaa-0000-4000-8000-000000000004', '682021', 25, true),
  ('bbbbbbbb-0000-4000-8000-000000000020', 'aaaaaaaa-0000-4000-8000-000000000004', '682042', 30, true),
  ('bbbbbbbb-0000-4000-8000-000000000021', 'aaaaaaaa-0000-4000-8000-000000000004', '683104', 30, true),
  -- Unichira — 5 pincodes (682021 Thrikkakara home pin; 683104 also
  -- covered by Kakkanad — second routing-overlap test case)
  ('bbbbbbbb-0000-4000-8000-000000000022', 'aaaaaaaa-0000-4000-8000-000000000005', '682021',  0, true),
  ('bbbbbbbb-0000-4000-8000-000000000023', 'aaaaaaaa-0000-4000-8000-000000000005', '682024', 20, true), -- Edappally
  ('bbbbbbbb-0000-4000-8000-000000000024', 'aaaaaaaa-0000-4000-8000-000000000005', '682025', 25, true), -- Palarivattom
  ('bbbbbbbb-0000-4000-8000-000000000025', 'aaaaaaaa-0000-4000-8000-000000000005', '682033', 25, true), -- Pathadipalam
  ('bbbbbbbb-0000-4000-8000-000000000026', 'aaaaaaaa-0000-4000-8000-000000000005', '683104', 25, true), -- Kalamassery (overlaps Kakkanad)
  -- Kacheripady extension
  ('bbbbbbbb-0000-4000-8000-000000000027', 'aaaaaaaa-0000-4000-8000-000000000002', '682026', 25, true) -- Elamakkara
on conflict (id) do nothing;

-- ============================================================
-- 3. DELIVERY SLOTS (3 per store: 07–09 / 09–11 / 17–19)
-- ============================================================
insert into delivery_slots (id, store_id, start_time, end_time, max_orders, is_active) values
  -- Kadavanthara
  ('cccccccc-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', '07:00', '09:00', 40, true),
  ('cccccccc-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', '09:00', '11:00', 40, true),
  ('cccccccc-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', '17:00', '19:00', 30, true),
  -- Kacheripady
  ('cccccccc-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000002', '07:00', '09:00', 40, true),
  ('cccccccc-0000-4000-8000-000000000005', 'aaaaaaaa-0000-4000-8000-000000000002', '09:00', '11:00', 40, true),
  ('cccccccc-0000-4000-8000-000000000006', 'aaaaaaaa-0000-4000-8000-000000000002', '17:00', '19:00', 30, true),
  -- Thrippunithura
  ('cccccccc-0000-4000-8000-000000000007', 'aaaaaaaa-0000-4000-8000-000000000003', '07:00', '09:00', 40, true),
  ('cccccccc-0000-4000-8000-000000000008', 'aaaaaaaa-0000-4000-8000-000000000003', '09:00', '11:00', 40, true),
  ('cccccccc-0000-4000-8000-000000000009', 'aaaaaaaa-0000-4000-8000-000000000003', '17:00', '19:00', 30, true),
  -- Kakkanad
  ('cccccccc-0000-4000-8000-000000000010', 'aaaaaaaa-0000-4000-8000-000000000004', '07:00', '09:00', 40, true),
  ('cccccccc-0000-4000-8000-000000000011', 'aaaaaaaa-0000-4000-8000-000000000004', '09:00', '11:00', 40, true),
  ('cccccccc-0000-4000-8000-000000000012', 'aaaaaaaa-0000-4000-8000-000000000004', '17:00', '19:00', 30, true),
  -- Unichira
  ('cccccccc-0000-4000-8000-000000000013', 'aaaaaaaa-0000-4000-8000-000000000005', '07:00', '09:00', 40, true),
  ('cccccccc-0000-4000-8000-000000000014', 'aaaaaaaa-0000-4000-8000-000000000005', '09:00', '11:00', 40, true),
  ('cccccccc-0000-4000-8000-000000000015', 'aaaaaaaa-0000-4000-8000-000000000005', '17:00', '19:00', 30, true)
on conflict (id) do nothing;

-- ============================================================
-- 4. PRODUCT CATEGORIES (types match 0001 check constraint:
--    base | protein | dressing | topping | addon | portion)
--    max_free_selections null = single-select category
-- ============================================================
insert into product_categories (id, type, name, display_order, max_free_selections) values
  ('dddddddd-0000-4000-8000-000000000001', 'base',     'Choose Your Base',   1, null),
  ('dddddddd-0000-4000-8000-000000000002', 'protein',  'Add Protein',        2, null),
  ('dddddddd-0000-4000-8000-000000000003', 'dressing', 'Pick a Dressing',    3, null),
  ('dddddddd-0000-4000-8000-000000000004', 'topping',  'Toppings',           4, 3),
  ('dddddddd-0000-4000-8000-000000000005', 'addon',    'Flavours & Add-ons', 5, 2),
  ('dddddddd-0000-4000-8000-000000000006', 'portion',  'Portion Size',       6, null)
on conflict (id) do nothing;

-- ============================================================
-- 5. PRODUCT OPTIONS (43 total; nutrition per serving; INR deltas)
-- ============================================================

-- ── Bases (8) — eeeeeeee-…-0000000001xx ─────────────────────
insert into product_options (id, category_id, name, price_delta, calories, protein_g, carbs_g, fat_g, allergens, is_active, image_url) values
  ('eeeeeeee-0000-4000-8000-000000000101', 'dddddddd-0000-4000-8000-000000000001', 'Romaine Lettuce',      0,  15, 1.2,  3.0, 0.2, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000102', 'dddddddd-0000-4000-8000-000000000001', 'Baby Spinach',         0,  20, 2.5,  3.0, 0.4, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000103', 'dddddddd-0000-4000-8000-000000000001', 'Kale & Cabbage Mix',  20,  35, 2.5,  6.0, 0.5, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000104', 'dddddddd-0000-4000-8000-000000000001', 'Quinoa Bowl',         60, 180, 6.0, 32.0, 3.0, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000105', 'dddddddd-0000-4000-8000-000000000001', 'Brown Rice Bowl',     40, 160, 3.5, 34.0, 1.5, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000106', 'dddddddd-0000-4000-8000-000000000001', 'Multigrain Couscous', 50, 170, 5.5, 33.0, 1.0, '{gluten}', true, null),
  ('eeeeeeee-0000-4000-8000-000000000107', 'dddddddd-0000-4000-8000-000000000001', 'Zucchini Noodles',    40,  25, 1.5,  4.0, 0.5, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000108', 'dddddddd-0000-4000-8000-000000000001', 'Mixed Greens',        10,  18, 1.5,  3.0, 0.3, null, true, null)
on conflict (id) do nothing;

-- ── Proteins (8) — eeeeeeee-…-0000000002xx ──────────────────
insert into product_options (id, category_id, name, price_delta, calories, protein_g, carbs_g, fat_g, allergens, is_active, image_url) values
  ('eeeeeeee-0000-4000-8000-000000000201', 'dddddddd-0000-4000-8000-000000000002', 'Grilled Chicken',             90, 165, 31.0,  0.0,  3.6, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000202', 'dddddddd-0000-4000-8000-000000000002', 'Tandoori Paneer',             70, 220, 14.0,  5.0, 16.0, '{dairy}', true, null),
  ('eeeeeeee-0000-4000-8000-000000000203', 'dddddddd-0000-4000-8000-000000000002', 'Boiled Eggs (x2)',            40, 155, 13.0,  1.0, 11.0, '{egg}', true, null),
  ('eeeeeeee-0000-4000-8000-000000000204', 'dddddddd-0000-4000-8000-000000000002', 'Chickpeas',                   30, 140,  7.5, 23.0,  2.5, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000205', 'dddddddd-0000-4000-8000-000000000002', 'Grilled Fish (Kerala Style)',110, 180, 25.0,  2.0,  8.0, '{fish}', true, null),
  ('eeeeeeee-0000-4000-8000-000000000206', 'dddddddd-0000-4000-8000-000000000002', 'Tofu',                        50,  95, 10.0,  2.5,  5.5, '{soy}', true, null),
  ('eeeeeeee-0000-4000-8000-000000000207', 'dddddddd-0000-4000-8000-000000000002', 'Rajma',                       30, 130,  8.5, 22.0,  0.5, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000208', 'dddddddd-0000-4000-8000-000000000002', 'Sprouts Mix',                 25,  60,  6.0,  9.0,  0.5, null, true, null)
on conflict (id) do nothing;

-- ── Dressings (6) — eeeeeeee-…-0000000003xx ─────────────────
insert into product_options (id, category_id, name, price_delta, calories, protein_g, carbs_g, fat_g, allergens, is_active, image_url) values
  ('eeeeeeee-0000-4000-8000-000000000301', 'dddddddd-0000-4000-8000-000000000003', 'Classic Vinaigrette',   0,  90, 0.0, 3.0,  9.0, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000302', 'dddddddd-0000-4000-8000-000000000003', 'Mint Yogurt',          20,  60, 2.5, 4.0,  3.5, '{dairy}', true, null),
  ('eeeeeeee-0000-4000-8000-000000000303', 'dddddddd-0000-4000-8000-000000000003', 'Peri-Peri',            20,  70, 0.5, 5.0,  5.5, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000304', 'dddddddd-0000-4000-8000-000000000003', 'Honey Mustard',        25, 100, 0.5, 9.0,  7.0, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000305', 'dddddddd-0000-4000-8000-000000000003', 'Tahini Lemon',         30, 110, 3.0, 4.0, 10.0, '{sesame}', true, null),
  ('eeeeeeee-0000-4000-8000-000000000306', 'dddddddd-0000-4000-8000-000000000003', 'Coconut-Curry Leaf',   25,  95, 1.0, 4.0,  8.5, null, true, null)
on conflict (id) do nothing;

-- ── Toppings (10) — eeeeeeee-…-0000000004xx ─────────────────
insert into product_options (id, category_id, name, price_delta, calories, protein_g, carbs_g, fat_g, allergens, is_active, image_url) values
  ('eeeeeeee-0000-4000-8000-000000000401', 'dddddddd-0000-4000-8000-000000000004', 'Cherry Tomatoes',    15,  15, 0.7,  3.0,  0.2, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000402', 'dddddddd-0000-4000-8000-000000000004', 'Cucumber',           10,   8, 0.4,  2.0,  0.1, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000403', 'dddddddd-0000-4000-8000-000000000004', 'Roasted Beetroot',   20,  35, 1.3,  8.0,  0.1, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000404', 'dddddddd-0000-4000-8000-000000000004', 'Sweet Corn',         15,  60, 2.0, 13.0,  1.0, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000405', 'dddddddd-0000-4000-8000-000000000004', 'Red Onion',          10,  12, 0.4,  3.0,  0.0, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000406', 'dddddddd-0000-4000-8000-000000000004', 'Pomegranate Pearls', 30,  50, 1.0, 12.0,  0.7, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000407', 'dddddddd-0000-4000-8000-000000000004', 'Avocado',            60, 120, 1.5,  6.0, 11.0, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000408', 'dddddddd-0000-4000-8000-000000000004', 'Feta Crumble',       45,  75, 4.0,  1.0,  6.0, '{dairy}', true, null),
  ('eeeeeeee-0000-4000-8000-000000000409', 'dddddddd-0000-4000-8000-000000000004', 'Roasted Peanuts',    20,  85, 4.0,  3.0,  7.0, '{peanut}', true, null),
  ('eeeeeeee-0000-4000-8000-000000000410', 'dddddddd-0000-4000-8000-000000000004', 'Croutons',           15,  45, 1.5,  8.0,  1.0, '{gluten}', true, null)
on conflict (id) do nothing;

-- ── Add-ons (8) — eeeeeeee-…-0000000005xx ───────────────────
insert into product_options (id, category_id, name, price_delta, calories, protein_g, carbs_g, fat_g, allergens, is_active, image_url) values
  ('eeeeeeee-0000-4000-8000-000000000501', 'dddddddd-0000-4000-8000-000000000005', 'Chia Seeds',        20, 60, 2.0,  5.0, 4.0, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000502', 'dddddddd-0000-4000-8000-000000000005', 'Pumpkin Seeds',     25, 70, 3.5,  2.0, 6.0, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000503', 'dddddddd-0000-4000-8000-000000000005', 'Fresh Herbs',       10,  5, 0.3,  1.0, 0.0, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000504', 'dddddddd-0000-4000-8000-000000000005', 'Jalapeños',         15, 10, 0.4,  2.0, 0.1, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000505', 'dddddddd-0000-4000-8000-000000000005', 'Olives',            30, 40, 0.3,  2.0, 3.5, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000506', 'dddddddd-0000-4000-8000-000000000005', 'Dried Cranberries', 25, 65, 0.1, 17.0, 0.2, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000507', 'dddddddd-0000-4000-8000-000000000005', 'Toasted Almonds',   30, 85, 3.0,  3.0, 7.5, '{nuts}', true, null),
  ('eeeeeeee-0000-4000-8000-000000000508', 'dddddddd-0000-4000-8000-000000000005', 'Extra Dressing',    20, 90, 0.5,  4.0, 8.0, null, true, null)
on conflict (id) do nothing;

-- ── Portions (3) — eeeeeeee-…-0000000006xx ──────────────────
-- Spec §5.2: portion size is an explicit price_delta option that
-- carries the base bowl price (NOT a client-side multiplier).
insert into product_options (id, category_id, name, price_delta, calories, protein_g, carbs_g, fat_g, allergens, is_active, image_url) values
  ('eeeeeeee-0000-4000-8000-000000000601', 'dddddddd-0000-4000-8000-000000000006', 'Regular Bowl', 129, null, null, null, null, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000602', 'dddddddd-0000-4000-8000-000000000006', 'Large Bowl',   189, null, null, null, null, null, true, null),
  ('eeeeeeee-0000-4000-8000-000000000603', 'dddddddd-0000-4000-8000-000000000006', 'Family Bowl',  349, null, null, null, null, null, true, null)
on conflict (id) do nothing;

-- ============================================================
-- 6. CURATED BASKETS (5, pre-built & non-customisable)
-- ============================================================
insert into curated_baskets (id, name, description, base_price, image_url, nutrition_summary, is_active) values
  ('ffffffff-0000-4000-8000-000000000001', 'The Kerala Power Bowl',
   'Brown rice, Kerala-style grilled fish, coconut-curry leaf dressing, roasted beetroot and fresh herbs. A homegrown classic, built for strength.',
   249, null, '{"calories": 520, "protein_g": 32, "carbs_g": 52, "fat_g": 18}'::jsonb, true),
  ('ffffffff-0000-4000-8000-000000000002', 'Protein Punch',
   'Quinoa base stacked with grilled chicken, boiled eggs, chickpeas and pumpkin seeds. Maximum protein per rupee.',
   299, null, '{"calories": 610, "protein_g": 48, "carbs_g": 45, "fat_g": 22}'::jsonb, true),
  ('ffffffff-0000-4000-8000-000000000003', 'Green Detox',
   'Baby spinach and kale-cabbage mix with sprouts, cucumber, zucchini noodles and a light classic vinaigrette. Clean, crisp, calm.',
   229, null, '{"calories": 280, "protein_g": 12, "carbs_g": 28, "fat_g": 12}'::jsonb, true),
  ('ffffffff-0000-4000-8000-000000000004', 'Office Lunch Classic',
   'Romaine, tandoori paneer, sweet corn, cherry tomatoes and mint yogurt dressing. The dependable desk-lunch that never lets you down.',
   199, null, '{"calories": 430, "protein_g": 21, "carbs_g": 34, "fat_g": 21}'::jsonb, true),
  ('ffffffff-0000-4000-8000-000000000005', 'Family Fresh Basket',
   'A family-size spread: multigrain couscous, grilled chicken, rajma, seasonal toppings and two dressings. Serves 3–4.',
   549, null, '{"calories": 1650, "protein_g": 95, "carbs_g": 160, "fat_g": 58}'::jsonb, true)
on conflict (id) do nothing;

-- ============================================================
-- 7. STORE INVENTORY
--    Every product option at every store, made-to-order
--    (stock_qty null). Two grey-out edge cases:
--      * Avocado       unavailable at Unichira
--      * Grilled Fish  unavailable at Kakkanad
--    Idempotent via unique(store_id, product_option_id).
-- ============================================================
insert into store_inventory (store_id, product_option_id, stock_qty, is_available)
select
  s.id,
  o.id,
  null::int,
  case
    when s.id = 'aaaaaaaa-0000-4000-8000-000000000005'          -- Unichira
     and o.id = 'eeeeeeee-0000-4000-8000-000000000407'          -- Avocado
      then false
    when s.id = 'aaaaaaaa-0000-4000-8000-000000000004'          -- Kakkanad
     and o.id = 'eeeeeeee-0000-4000-8000-000000000205'          -- Grilled Fish (Kerala Style)
      then false
    else true
  end
from stores s
cross join product_options o
where s.id::text like 'aaaaaaaa-%'      -- only the seeded stores
  and o.id::text like 'eeeeeeee-%'      -- only the seeded options
on conflict (store_id, product_option_id) do nothing;

-- ============================================================
-- 8. COUPONS (idempotent via unique(code))
-- ============================================================
insert into coupons (id, code, discount_type, discount_value, min_order_value, max_uses, used_count, valid_from, valid_until, is_active) values
  ('ffffffff-0000-4000-8000-000000000101', 'WELCOME50', 'flat',    50, 199, null, 0, current_date, (current_date + interval '6 months')::date, true),
  ('ffffffff-0000-4000-8000-000000000102', 'FRESH10',   'percent', 10, 299,  500, 0, current_date, (current_date + interval '6 months')::date, true),
  ('ffffffff-0000-4000-8000-000000000103', 'FAMILY100', 'flat',   100, 499, null, 0, current_date, (current_date + interval '6 months')::date, true)
on conflict (code) do nothing;

commit;
