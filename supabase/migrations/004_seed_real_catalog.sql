-- ============================================================================
-- SWAN STUDIO — Migration 004: Seed Real Catalog & Core Content
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Real Categories: Tops (₹999–1500), Flowers (₹300–600), Hair Clips (₹100–300)
-- 8 Real Products with strict price rules and no demo fluff.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Insert Categories
-- ----------------------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, description, icon_emoji, sort_order)
VALUES 
  ('11111111-1111-4111-8111-111111111111', 'Tops & Wearables', 'tops', 'Handmade artisan crochet halter tops, bralettes, and summer vests crafted from pure breathable cotton.', '🧶', 1),
  ('22222222-2222-4222-8222-222222222222', 'Floral Bouquets & Stems', 'flowers', 'Everlasting handmade crochet flowers, single stems, and bouquets that never wilt or droop.', '🌸', 2),
  ('33333333-3333-4333-8333-333333333333', 'Hair Clips & Accessories', 'hair-clips', 'Delicate floral hair pins, mini alligator clips, and handcrafted whimsical keepsakes.', '✨', 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_emoji = EXCLUDED.icon_emoji,
  sort_order = EXCLUDED.sort_order;

-- ----------------------------------------------------------------------------
-- 2. Insert 8 Real Products (Strictly adhering to pricing rules)
-- ----------------------------------------------------------------------------

-- Top 1 (₹1,299)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'a1111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  'Daisy Bloom Crochet Halter Top',
  'daisy-bloom-crochet-halter-top',
  1299.00,
  NULL,
  'Artisan halter neck top adorned with hand-crocheted daisy motifs along the neckline. Ties gracefully at the neck and back for an adjustable, flattering fit.',
  '100% Breathable Milk Cotton Yarn',
  'Custom fit with adjustable tie back (Bust 30-38")',
  '["Ivory & Sunflower Yellow", "Pastel Lilac", "Sage Meadow Green"]'::jsonb,
  true, true, true, '5–7 business days', 0,
  'assets/images/products/daisy-halter-top.webp',
  1
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, name = EXCLUDED.name;

-- Top 2 (₹1,449 regular, ₹1,299 sale)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'a2222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Vintage Granny Square Crop Top',
  'vintage-granny-square-crop-top',
  1449.00,
  1299.00,
  'Timeless bohemian crop top assembled from intricate granny square panels. Lightweight, breathable, and designed for warm afternoons and festivals.',
  'Pure Combed Cotton Yarn',
  'Standard relaxed fit (S/M/L adjustable corset tie)',
  '["Earthy Boho Tones", "Pastel Dream", "Warm Terracotta"]'::jsonb,
  true, true, true, '6–8 business days', 0,
  'assets/images/products/granny-square-top.webp',
  2
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, sale_price = EXCLUDED.sale_price;

-- Top 3 (₹999)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'a3333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'Lace Petal Summer Bralette',
  'lace-petal-summer-bralette',
  999.00,
  NULL,
  'Delicate scalloped petal edging with secure ribbed underbust band. Soft against bare skin with comfortable stretch.',
  'Fine Cotton Thread with Elasticized Band',
  'Adjustable back ties (Cup size A–C)',
  '["Pure Ivory", "Rose Quartz", "Midnight Onyx"]'::jsonb,
  false, true, true, '4–6 business days', 0,
  'assets/images/products/petal-summer-bralette.webp',
  3
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- Flower 1 (₹349)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'b1111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'Sunflower Radiance Single Stem',
  'sunflower-radiance-single-stem',
  349.00,
  NULL,
  'A single statement sunflower featuring a textured cocoa seed center, bright yellow petals, and two bendable green leaves on a flexible florist stem.',
  'Milk Cotton Yarn with Bendable Floral Craft Wire',
  'Total length: ~32 cm | Flower head: ~10 cm',
  '["Classic Golden Yellow", "Warm Honey Amber"]'::jsonb,
  true, true, false, 'In Stock (Ships in 24h)', 8,
  'assets/images/products/sunflower-single-stem.webp',
  4
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- Flower 2 (₹549)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'b2222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222',
  'Daisy Delight Everlasting Bouquet',
  'daisy-delight-everlasting-bouquet',
  549.00,
  NULL,
  'Hand-tied bunch featuring three cheerful white daisies, sprigs of lavender, and a eucalyptus branch wrapped in premium kraft tissue paper with satin ribbon.',
  'Organic Milk Cotton with Kraft Presentation Wrap',
  'Height: ~30 cm | Spread: ~18 cm',
  '["Pastel Harmony", "Sunflower & Daisy Duo"]'::jsonb,
  true, true, false, 'In Stock (Ships in 24h)', 6,
  'assets/images/hero-bouquet.webp',
  5
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- Flower 3 (₹449)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'b3333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  'Lavender & Blossom Handcrafted Bunch',
  'lavender-blossom-handcrafted-bunch',
  449.00,
  NULL,
  'Calming purple French lavender stalks paired with two pastel pink cherry blossom stems. Adds quiet warmth to study desks or bedside tables.',
  'Soft Acrylic & Milk Cotton Blend on Florist Stems',
  'Height: ~28 cm',
  '["French Lavender & Blush", "Lilac & Cream"]'::jsonb,
  false, true, false, 'In Stock (Ships in 24h)', 7,
  'assets/images/products/lavender-blossom-bunch.webp',
  6
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- Hair Clip 1 (₹189)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'c1111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'Cherry Blossom Mini Hair Clip Pair',
  'cherry-blossom-mini-hair-clip-pair',
  189.00,
  NULL,
  'Pair of delicate 5-petal cherry blossom flowers securely mounted on gold-toned alligator hair clips. Gentle on fine hair with no snagging.',
  'Combed Cotton Yarn on Rust-Resistant Metal Clips',
  'Clip length: 4.5 cm | Flower diameter: ~3 cm',
  '["Blush Pink Pair", "Cream & Pink Mix"]'::jsonb,
  true, true, false, 'In Stock (Ships in 24h)', 15,
  'assets/images/products/cherry-blossom-hair-clips.webp',
  7
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- Hair Clip 2 (₹149)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'c2222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  'Sweet Strawberry Floral Hair Pin',
  'sweet-strawberry-floral-hair-pin',
  149.00,
  NULL,
  'Charming miniature amigurumi strawberry accented with a white blossom leaf. Backed with a secure snap clip for daily styling.',
  'Cotton Thread with Embroidered Seed Detailing',
  'Charm size: ~3 cm x 2.5 cm',
  '["Ruby Strawberry", "Blush Pink Strawberry"]'::jsonb,
  false, true, false, 'In Stock (Ships in 24h)', 12,
  'assets/images/products/strawberry-hair-pin.webp',
  8
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- ----------------------------------------------------------------------------
-- 3. Core Storefront Site Content (Live source of truth)
-- ----------------------------------------------------------------------------
INSERT INTO public.site_content (key, data)
VALUES 
  ('hero', '{
    "eyebrow": "Artisanal Handmade Crochet Atelier",
    "title": "Every Stitch Tells a Story.",
    "subtitle": "Discover lovingly handcrafted crochet halter tops, everlasting floral bouquets, and bespoke accessories created one loop at a time in Jaipur, India.",
    "ctaText": "Explore Atelier Creations",
    "ctaUrl": "shop.html",
    "secondaryCtaText": "Commission Custom Piece",
    "secondaryCtaUrl": "custom-order.html"
  }'::jsonb),
  ('banner', '{
    "enabled": true,
    "message": "🌸 Welcome to Swan Studio — Free pan-India delivery on orders over ₹999 | Handcrafted with love in Jaipur",
    "linkText": "Shop Tops & Bouquets",
    "linkUrl": "shop.html"
  }'::jsonb),
  ('about', '{
    "founderName": "Bhumika Nama",
    "story": "Swan Studio was born out of a deep reverence for mindful handcraft and slow fashion. What started as an afternoon passion project with a simple wooden crochet hook and soft milk cotton yarn has grown into an atelier dedicated to everlasting floral art, tailored wearable tops, and meaningful keepsakes.",
    "quote": "In a world of mass factory production, handmade crochet carries warmth, tactile memories, and time. Each stitch is an intentional gift of care.",
    "city": "Jaipur, Rajasthan, India"
  }'::jsonb),
  ('contact', '{
    "whatsapp": "9509966512",
    "upiId": "9509966512@fam",
    "email": "swanstudio2604@gmail.com",
    "instagram": "@swanstudio.crochet",
    "hours": "Monday – Saturday: 10:00 AM – 7:00 PM IST"
  }'::jsonb),
  ('policies', '{
    "shipping": "Orders are handcrafted with immense care. In-stock bouquets and accessories ship within 24–48 hours. Made-to-order halter tops and bespoke gifts typically take 4–7 business days to craft prior to dispatch. Standard pan-India delivery takes 3–5 working days.",
    "returns": "Because our items are handmade with intimate hygiene considerations (wearables and custom pieces), we do not accept returns. However, if your creation arrives damaged during transit, please WhatsApp us within 24 hours of delivery with an unboxing photo, and we will replace it promptly.",
    "care": "Everlasting bouquets never require water! Gently dust petals with a soft brush every few weeks. For tops and hair accessories, spot-clean with lukewarm water and mild detergent; lay flat to dry in shade."
  }'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data;

-- ----------------------------------------------------------------------------
-- 4. Initial FAQs
-- ----------------------------------------------------------------------------
INSERT INTO public.faq_items (question, answer, category, sort_order)
VALUES 
  ('How long does a made-to-order top take to craft?', 'Our made-to-order tops take between 4 to 7 business days to crochet meticulously to your exact measurements, after which they are packed and shipped via tracked courier.', 'orders', 1),
  ('Do the crochet flowers really last forever?', 'Yes! Unlike real flowers that wither within a few days, our bouquets are handcrafted from high-quality milk cotton yarn and flexible wire stems. They never need watering and keep their vibrant color for years with simple dusting.', 'products', 2),
  ('How do I complete payment using UPI?', 'During checkout, you will see our verified UPI ID (9509966512@fam) and a dynamic QR code. Open any UPI app (Google Pay, PhonePe, Paytm, BHIM) and complete the transfer. Once submitted, Bhumika confirms the receipt in her bank account and transitions your order to Confirmed.', 'payments', 3),
  ('Can I request custom colors or personalized initial letters?', 'Absolutely! Visit our Custom Order page or reach out directly on WhatsApp with your favorite shades, size requirements, or gift themes. We will weave your vision to life.', 'custom', 4)
ON CONFLICT DO NOTHING;
