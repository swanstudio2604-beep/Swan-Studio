-- ============================================================================
-- SWAN STUDIO — Database Seed Data (Sample Demonstration Records)
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Tagline: Every Stitch Tells a Story.
--
-- NOTE FOR DEVELOPER & FOUNDER:
-- All records inserted below are clearly marked sample demonstration entries.
-- They populate your initial catalog so you can test browsing, filtering, and 
-- product detail views immediately after setting up Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Seed Categories
-- ----------------------------------------------------------------------------
INSERT INTO public.categories (name, slug, description, icon_emoji, sort_order)
VALUES
  ('Floral Bouquets', 'bouquets', 'Everlasting handmade crochet flowers that never wilt.', '🌸', 1),
  ('Bags & Totes', 'bags', 'Granny square tote bags, shoulder bags, and clutches.', '👜', 2),
  ('Cute Plushies', 'plushies', 'Whimsical amigurumi plush companions handcrafted with soft yarn.', '🧸', 3),
  ('Personalized Gifts', 'accessories', 'Custom keychains, bookmarks, coasters, and thoughtful keepsakes.', '🎁', 4)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description, icon_emoji = EXCLUDED.icon_emoji;

-- ----------------------------------------------------------------------------
-- 2. Seed Products (Sample Catalog)
-- ----------------------------------------------------------------------------
INSERT INTO public.products (
  category_id, name, slug, description, price, sale_price, materials, dimensions, colors, stock_quantity, made_to_order, prep_time, badge, icon_type, is_featured, is_published
)
VALUES
  (
    (SELECT id FROM public.categories WHERE slug = 'bouquets'),
    'Daisy Delight Crochet Bouquet',
    'daisy-delight-bouquet',
    'An everlasting bouquet of handcrafted crochet daisies that brings warmth to any room without ever wilting. Each petal is individually looped and assembled with floral wire for flexible arrangement. Hand-tied in artisan craft wrap with a dusty-rose ribbon.',
    899.00,
    1099.00,
    '100% Milk Cotton Yarn, Floral Wire, Kraft Paper Wrap',
    'Approx. 28 cm height, 18 cm diameter',
    ARRAY['Warm Yellow & Cream', 'Pastel Pink & White', 'Lavender & White'],
    5,
    true,
    '2-4 business days',
    'Bestseller Sample',
    'flower',
    true,
    true
  ),
  (
    (SELECT id FROM public.categories WHERE slug = 'bags'),
    'Pastel Granny Square Tote Bag',
    'pastel-granny-square-tote',
    'A charming, bohemian granny square shoulder bag hand-stitched with 13 unique floral blocks. Features reinforced double handles to hold your daily essentials with ease, plus a soft interior lining.',
    1249.00,
    NULL,
    'Sturdy Cotton Yarn with reinforced fabric lining and magnetic clasp',
    '32 cm x 35 cm with 25 cm strap drop',
    ARRAY['Pastel Patchwork (Cream, Blush, Sage, Cocoa)'],
    3,
    true,
    '4-6 business days',
    'Artisan Pick',
    'bag',
    true,
    true
  ),
  (
    (SELECT id FROM public.categories WHERE slug = 'plushies'),
    'Sleepy Bunny Amigurumi Plushie',
    'sleepy-bunny-amigurumi',
    'An irresistibly soft, cuddly plush rabbit handcrafted using traditional amigurumi techniques. Perfect as a nursery companion, desk friend, or thoughtful gift for someone who loves whimsical handmade toys.',
    649.00,
    NULL,
    'Hypoallergenic Baby Acrylic-Cotton Yarn, Safety Eyes, Polyfill',
    'Approx. 18 cm tall (including floppy ears)',
    ARRAY['Warm Cream & Rose', 'Soft Gray & White', 'Mint & Cream'],
    8,
    false,
    'Ready to ship',
    'Ready to Ship',
    'plushie',
    true,
    true
  ),
  (
    (SELECT id FROM public.categories WHERE slug = 'accessories'),
    'Lavender Fields Bookmark & Charm Set',
    'lavender-bookmark-set',
    'A delicate floral crochet bookmark paired with a matching pocket charm keychain. Lightweight, durable, and an ideal budget-friendly gift for avid readers and stationery lovers.',
    349.00,
    NULL,
    'Fine Mercerized Cotton Yarn, Metal Lobster Clasp',
    'Bookmark length: 22 cm; Charm: 6 cm',
    ARRAY['Dusty Lavender', 'Rose Blush', 'Sage Green'],
    12,
    false,
    'Ready to ship',
    'Under ₹400',
    'accessory',
    true,
    true
  ),
  (
    (SELECT id FROM public.categories WHERE slug = 'bouquets'),
    'Single Bloom Eternal Tulip in Mini Pot',
    'eternal-tulip-pot',
    'A desktop crochet tulip planted securely in a miniature hand-wrapped pot. Adds a cheerful, maintenance-free splash of floral aesthetic to your study table or windowsill.',
    449.00,
    NULL,
    'Milk Cotton Yarn, Wooden Mini Pot Base, Polyfill',
    '16 cm height, 7 cm base diameter',
    ARRAY['Dutch Red', 'Pastel Pink', 'Creamy Peach', 'Sunny Yellow'],
    6,
    true,
    '2-3 business days',
    'Desktop Decor',
    'flower',
    false,
    true
  ),
  (
    (SELECT id FROM public.categories WHERE slug = 'bags'),
    'Textured Shell Stitch Clutch Bag',
    'chunky-crochet-clutch',
    'A tactile, structured evening clutch showcasing delicate shell stitches and an optional detachable chain strap. Holds your phone, keys, and lip balm with vintage elegance.',
    999.00,
    1199.00,
    'T-Shirt Yarn & Cotton Cord with antique brass chain strap',
    '24 cm x 15 cm x 5 cm',
    ARRAY['Blush Pink', 'Warm Cocoa', 'Off-White'],
    4,
    true,
    '3-5 business days',
    'Limited Run',
    'bag',
    false,
    true
  ),
  (
    (SELECT id FROM public.categories WHERE slug = 'plushies'),
    'Pocket Froggy with Daisy Hat',
    'mini-froggy-plushie',
    'A charming little round frog wearing a tiny removable crochet daisy on its head. A delightful desk buddy and conversation starter.',
    499.00,
    NULL,
    'Soft Sage Cotton-Blend Yarn, Embroidered Eyes',
    '9 cm x 8 cm',
    ARRAY['Sage Green with White Daisy'],
    10,
    false,
    'Ready to ship',
    'Cute Pick',
    'plushie',
    false,
    true
  ),
  (
    (SELECT id FROM public.categories WHERE slug = 'accessories'),
    'Personalized Monogram Letter Keychain',
    'custom-monogram-keychain',
    'Custom-made crochet initial keychains personalized with your chosen letter and color palette. A bespoke, thoughtful keepsake for birthdays or return gifts.',
    299.00,
    NULL,
    'Fine Cotton Thread, Golden Key Ring & Swivel Hook',
    'Letter height: 7 cm',
    ARRAY['Any Custom Letter & Color on request'],
    20,
    true,
    '1-2 business days',
    'Customizable',
    'accessory',
    false,
    true
  )
ON CONFLICT (slug) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  sale_price = EXCLUDED.sale_price,
  materials = EXCLUDED.materials,
  dimensions = EXCLUDED.dimensions,
  colors = EXCLUDED.colors,
  stock_quantity = EXCLUDED.stock_quantity,
  is_featured = EXCLUDED.is_featured,
  is_published = EXCLUDED.is_published;

-- ----------------------------------------------------------------------------
-- 3. Seed Site Settings
-- ----------------------------------------------------------------------------
INSERT INTO public.site_settings (
  id, upi_id, whatsapp_number, free_shipping_threshold, standard_shipping_fee, low_stock_threshold
)
VALUES (
  1,
  '9509966512@fam',
  '9509966512',
  1499.00,
  99.00,
  2
)
ON CONFLICT (id) DO UPDATE
SET 
  upi_id = EXCLUDED.upi_id,
  whatsapp_number = EXCLUDED.whatsapp_number,
  free_shipping_threshold = EXCLUDED.free_shipping_threshold,
  standard_shipping_fee = EXCLUDED.standard_shipping_fee;

-- ----------------------------------------------------------------------------
-- 4. Seed Site Content (Editable via Admin in Phase 9)
-- ----------------------------------------------------------------------------
INSERT INTO public.site_content (key, content_value)
VALUES
  ('announcement', '{"text": "✨ Handcrafted with love in India • Custom crochet creations & personalized gifts ✨"}'::jsonb),
  ('hero', '{"headline": "Every Stitch Tells a Story.", "subheadline": "Welcome to Swan Studio. Discover artistic, handmade crochet treasures created loop by loop with patience, warmth, and care by Bhumika Nama."}'::jsonb),
  ('founder_note', '{"quote": "Every loop has intention, every stitch has patience.", "story_intro": "Swan Studio was born out of a profound love for crochet—an art form where simple skeins of yarn transform into expressive, tangible stories."}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET content_value = EXCLUDED.content_value;

-- ----------------------------------------------------------------------------
-- 5. Seed Coupons (Sample Demonstration Codes)
-- ----------------------------------------------------------------------------
INSERT INTO public.coupons (
  code, discount_type, discount_value, min_order_amount, max_discount_cap, total_usage_limit, per_customer_limit, is_active
)
VALUES
  ('SWANFIRST', 'PERCENTAGE', 10.00, 499.00, 200.00, 500, 1, true),
  ('BHUMIKA100', 'FIXED', 100.00, 799.00, NULL, 200, 1, true),
  ('FESTIVE20', 'PERCENTAGE', 20.00, 1299.00, 400.00, 100, 1, true)
ON CONFLICT (code) DO NOTHING;

