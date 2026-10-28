/**
 * SWAN STUDIO — Supabase Client & Unified Data Access Layer
 * Brand: Swan Studio | Founder: Bhumika Nama
 * Project Ref: hzlimdfxvojkqsszmulj
 * 
 * STRICT SECURITY RULES:
 * 1. ONLY the public Project URL and Publishable (anon) Key appear in frontend code.
 * 2. NEVER put the service_role key or database passwords in this file.
 * 3. All database reads and writes are protected by Row Level Security (RLS).
 */

const SUPABASE_CONFIG = {
  url: (typeof window !== 'undefined' && window.SWAN_CONFIG && window.SWAN_CONFIG.supabaseUrl)
    ? window.SWAN_CONFIG.supabaseUrl
    : 'https://hzlimdfxvojkqsszmulj.supabase.co',
  anonKey: (typeof window !== 'undefined' && window.SWAN_CONFIG && window.SWAN_CONFIG.supabaseAnonKey)
    ? window.SWAN_CONFIG.supabaseAnonKey
    : 'sb_publishable_A6lhEw5XB5OESdClA4Z6rg_XulpKLG4'
};

let _supabaseClient = null;

/**
 * Checks whether the public anon key has been supplied.
 */
function isSupabaseConfigured() {
  const url = (typeof window !== 'undefined' && window.SWAN_CONFIG && window.SWAN_CONFIG.supabaseUrl) || SUPABASE_CONFIG.url;
  const key = (typeof window !== 'undefined' && window.SWAN_CONFIG && window.SWAN_CONFIG.supabaseAnonKey) || SUPABASE_CONFIG.anonKey;
  return Boolean(
    url &&
    !url.includes('YOUR_SUPABASE_PROJECT_ID') &&
    key &&
    key.length > 20 &&
    !key.includes('YOUR_SUPABASE_ANON_KEY') &&
    !key.includes('PASTE_YOUR')
  );
}

/**
 * Returns the singleton initialized Supabase client instance.
 */
function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!_supabaseClient && typeof window !== 'undefined' && window.supabase) {
    const url = (window.SWAN_CONFIG && window.SWAN_CONFIG.supabaseUrl) || SUPABASE_CONFIG.url;
    const key = (window.SWAN_CONFIG && window.SWAN_CONFIG.supabaseAnonKey) || SUPABASE_CONFIG.anonKey;
    _supabaseClient = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }
  return _supabaseClient;
}

/**
 * Helper to determine if a product is out of stock.
 * Made-to-order creations are never marked sold out.
 */
function isProductSoldOut(p) {
  if (!p) return false;
  if (p.isSoldOut || p.sold_out) return true;
  if (p.madeToOrder || p.made_to_order) return false;
  const stock = (p.stock !== undefined && p.stock !== null) 
    ? Number(p.stock) 
    : ((p.stock_quantity !== undefined && p.stock_quantity !== null) ? Number(p.stock_quantity) : 0);
  return stock <= 0;
}

/**
 * Normalizes a raw Supabase product row into a standard client object.
 */
function normalizeProduct(p) {
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    imageUrl: p.image_url || 'assets/images/hero-bouquet.webp',
    image_url: p.image_url || 'assets/images/hero-bouquet.webp',
    category: p.categories?.slug || p.category_slug || 'creations',
    categoryName: p.categories?.name || p.category_name || 'Handmade Creation',
    categoryId: p.category_id,
    category_id: p.category_id,
    price: parseFloat(p.price || 0),
    salePrice: p.sale_price ? parseFloat(p.sale_price) : null,
    sale_price: p.sale_price ? parseFloat(p.sale_price) : null,
    description: p.description || '',
    materials: p.materials || '',
    dimensions: p.dimensions || '',
    colors: Array.isArray(p.colors) ? p.colors : [],
    variants: Array.isArray(p.variants) ? p.variants : [],
    stock: (() => {
      let s = (p.stock_quantity !== undefined && p.stock_quantity !== null) ? parseInt(p.stock_quantity, 10) : 0;
      if (typeof localStorage !== 'undefined' && p.id) {
        try {
          const overrides = JSON.parse(localStorage.getItem('swan_product_stock_overrides') || '{}');
          if (overrides[p.id] !== undefined) s = parseInt(overrides[p.id], 10);
        } catch (e) {}
      }
      return s;
    })(),
    stock_quantity: (() => {
      let s = (p.stock_quantity !== undefined && p.stock_quantity !== null) ? parseInt(p.stock_quantity, 10) : 0;
      if (typeof localStorage !== 'undefined' && p.id) {
        try {
          const overrides = JSON.parse(localStorage.getItem('swan_product_stock_overrides') || '{}');
          if (overrides[p.id] !== undefined) s = parseInt(overrides[p.id], 10);
        } catch (e) {}
      }
      return s;
    })(),
    madeToOrder: Boolean(p.made_to_order),
    made_to_order: Boolean(p.made_to_order),
    prepTime: p.prep_time || (p.made_to_order ? '4–7 business days' : 'Ready to Ship'),
    prep_time: p.prep_time || (p.made_to_order ? '4–7 business days' : 'Ready to Ship'),
    badge: p.made_to_order ? 'Made to Order' : 'In Stock',
    isFeatured: Boolean(p.is_featured),
    is_featured: Boolean(p.is_featured),
    isPublished: Boolean(p.is_published),
    is_published: Boolean(p.is_published),
    isHidden: Boolean(p.is_hidden),
    is_hidden: Boolean(p.is_hidden),
    deletedAt: p.deleted_at || null,
    deleted_at: p.deleted_at || null,
    sortOrder: p.sort_order || 0
  };
}

/**
 * Fetches published products from live server API with Supabase fallback and filters.
 */
async function fetchProducts({ category = 'all', search = '', sort = 'featured', featuredOnly = false, maxPrice = null, hideSoldOut = false } = {}) {
  // 1. Primary: Server API if returning JSON
  try {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (search && search.trim()) params.set('search', search.trim());
    if (sort) params.set('sort', sort);
    if (featuredOnly) params.set('featured', 'true');
    if (maxPrice !== null && !isNaN(Number(maxPrice))) params.set('maxPrice', maxPrice);
    if (hideSoldOut) params.set('hideSoldOut', 'true');

    const res = await fetch(`/api/products?${params.toString()}`);
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return { isLive: true, data: json.data.map(normalizeProduct) };
      }
    }
  } catch (e) {
    // Fallback to Supabase
  }

  // 2. Fallback: Supabase direct query
  const client = getSupabaseClient();
  if (!client) {
    return { isLive: false, data: [] };
  }

  try {
    const isCategoryFilter = category && category !== 'all';
    const selectStr = isCategoryFilter ? '*, categories!inner(name, slug)' : '*, categories(name, slug)';
    let query = client
      .from('products')
      .select(selectStr)
      .eq('is_published', true)
      .eq('is_hidden', false)
      .is('deleted_at', null)
      .is('archived_at', null);

    if (featuredOnly) query = query.eq('is_featured', true);
    if (isCategoryFilter) query = query.eq('categories.slug', category);
    if (search && search.trim()) query = query.ilike('name', `%${search.trim()}%`);
    if (maxPrice !== null && !isNaN(Number(maxPrice))) query = query.lte('price', Number(maxPrice));

    if (sort === 'price-low' || sort === 'price-asc') {
      query = query.order('price', { ascending: true });
    } else if (sort === 'price-high' || sort === 'price-desc') {
      query = query.order('price', { ascending: false });
    } else if (sort === 'name-asc') {
      query = query.order('name', { ascending: true });
    } else if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase products query error:', error.message);
      return { isLive: false, data: [] };
    }

    let products = (data || []).map(normalizeProduct);
    if (hideSoldOut) {
      products = products.filter(p => !isProductSoldOut(p));
    }
    return { isLive: true, data: products };
  } catch (err) {
    console.error('fetchProducts exception:', err);
    return { isLive: false, data: [] };
  }
}

/**
 * Fetches a single published product by slug from live server API with Supabase fallback.
 */
async function fetchProductBySlug(slug) {
  if (!slug) return { isLive: false, data: null };

  // 1. Primary: Server API if returning JSON
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const json = await res.json();
      if (json.success && json.data) {
        return { isLive: true, data: normalizeProduct(json.data) };
      }
    }
  } catch (e) {
    // Fallback to Supabase
  }

  // 2. Fallback: Supabase direct query
  const client = getSupabaseClient();
  if (!client) return { isLive: false, data: null };

  try {
    const { data, error } = await client
      .from('products')
      .select('*, categories(name, slug)')
      .eq('slug', slug)
      .eq('is_published', true)
      .eq('is_hidden', false)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) return { isLive: false, data: null };
    return { isLive: true, data: normalizeProduct(data) };
  } catch (err) {
    console.error('fetchProductBySlug exception:', err);
    return { isLive: false, data: null };
  }
}

/**
 * Fetches active, non-deleted categories from live server API with Supabase fallback.
 */
async function fetchCategories() {
  // 1. Primary: Server API if returning JSON
  try {
    const res = await fetch('/api/categories');
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return { isLive: true, data: json.data };
      }
    }
  } catch (e) {
    // Fallback to Supabase
  }

  // 2. Fallback: Supabase direct query
  const client = getSupabaseClient();
  if (!client) return { isLive: false, data: [] };

  try {
    const { data, error } = await client
      .from('categories')
      .select('*')
      .eq('is_hidden', false)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('fetchCategories error:', error.message);
      return { isLive: false, data: [] };
    }
    return { isLive: true, data: data || [] };
  } catch (err) {
    console.error('fetchCategories exception:', err);
    return { isLive: false, data: [] };
  }
}

const DEFAULT_STORIES_FALLBACK = [
  {
    id: 'story-1',
    title: 'Why Handmade Crochet Is An Art of Infinite Patience',
    slug: 'why-handmade-crochet-is-an-art-of-infinite-patience',
    status: 'published',
    published_at: '2026-02-10T10:00:00.000Z',
    created_at: '2026-02-10T10:00:00.000Z',
    author: 'Bhumika Nama',
    tags: ['Craftsmanship', 'Slow Living'],
    read_time_minutes: 4,
    cover_image: 'assets/images/hero-bouquet.webp',
    cover_image_alt: 'Handcrafted pastel crochet bouquet arranged in studio',
    excerpt: 'In a world of factory machines, every single crochet stitch is looped by human hands with quiet devotion, soft cotton yarn, and endless patience.',
    body: `<h2>The Machine That Can Never Be Built</h2>
<p>In our modern world, machines can weave giant carpets, print intricate 3D sculptures, and knit thousands of sweaters an hour. Yet, there is one craft that technology has never managed to replicate: <strong>crochet</strong>.</p>
<p>Every single crochet stitch requires the human fingertip to gauge tension, twist the hook, and loop yarn through existing stitches with intuitive touch. When you hold a Swan Studio bouquet or wearable top, you are holding hundreds of minutes of mindful, focused human presence.</p>
<blockquote>"Every loop is a quiet prayer of patience. You cannot rush yarn; it only blossoms when given time."</blockquote>
<h2>Slow Craft as a Gentle Form of Meditation</h2>
<p>Each sunflower or daisy begins with a magic ring — a tiny circle of cotton thread held gently between the fingers. As the petals take shape in our Jaipur atelier, the world outside slows down. That gentle rhythm of loop, pull, and stitch is why we say: <em>Every Stitch Tells a Story</em>.</p>`
  },
  {
    id: 'story-2',
    title: 'Caring For Your Handcrafted Crochet Bouquets',
    slug: 'caring-for-your-handcrafted-crochet-bouquets',
    status: 'published',
    published_at: '2026-02-18T10:00:00.000Z',
    created_at: '2026-02-18T10:00:00.000Z',
    author: 'Bhumika Nama',
    tags: ['Care Guide', 'Home Decor'],
    read_time_minutes: 3,
    cover_image: 'assets/images/hero-bouquet-sm.webp',
    cover_image_alt: 'Delicate everlasting crochet flowers in a ceramic vase',
    excerpt: 'Simple, gentle tips to ensure your everlasting crochet floral bouquets, daisies, and lavender stems remain fresh, vibrant, and blooming forever.',
    body: `<h2>Everlasting Blooms, Tenderly Kept</h2>
<p>Unlike real florals that wither in a week, our handmade crochet bouquets are created to hold your sweetest memories forever. With just a little bit of mindful care, your blooms will look just as radiant five years from now as they do today.</p>
<h2>1. Keep Them Dust-Free with Gentle Care</h2>
<p>Every few weeks, give your flowers a gentle puff of cool air using a hairdryer on the lowest, coolest setting, or lightly dust them with a soft makeup brush or microfiber cloth.</p>
<h2>2. Shield from Harsh Direct Sunlight</h2>
<p>While our premium milk-cotton yarns are colorfast, prolonged exposure to harsh afternoon sun can slowly soften vibrant pastel dyes over many years. Display them in well-lit living spaces, study desks, or bedside tables away from direct blazing heat.</p>
<h2>3. Moisture & Storage</h2>
<p>Crochet blooms love dry, cozy spaces. Avoid spraying water or perfumes directly on the petals. If you ever need to pack them away for travel, place them in a rigid gift box to prevent wire stems from bending.</p>`
  },
  {
    id: 'story-3',
    title: 'Behind the Stitches: How a Custom Crochet Top Comes to Life',
    slug: 'behind-the-stitches-how-a-custom-crochet-top-comes-to-life',
    status: 'published',
    published_at: '2026-03-01T10:00:00.000Z',
    created_at: '2026-03-01T10:00:00.000Z',
    author: 'Bhumika Nama',
    tags: ['Craftsmanship', 'Studio Diary'],
    read_time_minutes: 5,
    cover_image: 'assets/images/product-tote.webp',
    cover_image_alt: 'Handcrafted floral crochet tote bag',
    excerpt: 'From sizing measurements to selecting breathable cotton yarn — step inside our Jaipur atelier to see how bespoke wearable crochet pieces are crafted.',
    body: `<h2>Wearable Art Custom-Fitted to You</h2>
<p>A crochet garment is completely different from fast-fashion clothing. It is sculpted directly to your natural contours, stitch by stitch, loop by loop.</p>
<p>When a client shares their bust, waist, and underbust measurements with us, we calculate the exact stitch count needed so the corset top or halter fits like a second skin — supportive, breathable, and utterly unique.</p>
<blockquote>"Crochet conforms to the body with soft natural warmth that no synthetic fabric can duplicate."</blockquote>
<h2>Premium Cotton for Indian Weather</h2>
<p>We work exclusively with soft 4-ply and 5-ply combed milk cotton yarn. It is breathable in warm weather, gentle on sensitive skin, and retains its graceful drape wash after wash.</p>`
  }
];

function getLocalStoriesFallback() {
  try {
    let deletedIds = [];
    try {
      deletedIds = JSON.parse(localStorage.getItem('swan_permanently_deleted_story_ids') || '[]');
    } catch (e) {}

    const raw = localStorage.getItem('swan_admin_stories');
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => !deletedIds.includes(String(p.id)));
      }
    }
    return DEFAULT_STORIES_FALLBACK.filter(p => !deletedIds.includes(String(p.id)));
  } catch {
    return [];
  }
}

/**
 * Fetches published blog posts from Supabase (with resilient local fallback).
 */
async function fetchBlogPosts({ limit = 10 } = {}) {
  let deletedIds = [];
  try {
    deletedIds = JSON.parse(localStorage.getItem('swan_permanently_deleted_story_ids') || '[]');
  } catch (e) {}

  // 1. Check local server API first if returning JSON
  try {
    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    const res = await fetch(`${baseUrl}/api/blog`);
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        const filtered = json.data.filter(p => !deletedIds.includes(String(p.id)));
        return { isLive: true, data: filtered.slice(0, limit) };
      }
    }
  } catch (err) {}

  const client = getSupabaseClient();
  if (client) {
    try {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .is('deleted_at', null)
        .or(`published_at.is.null,published_at.lte.${now}`)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        const filtered = data.filter(p => !deletedIds.includes(String(p.id)));
        return { isLive: true, data: filtered };
      }
    } catch (err) {
      console.warn('fetchBlogPosts Supabase fallback:', err);
    }
  }

  // Local fallback
  const local = getLocalStoriesFallback();
  const published = local.filter(p => !p.deleted_at && (p.status || '').toLowerCase() === 'published' && !deletedIds.includes(String(p.id)));
  return { isLive: false, data: published.slice(0, limit) };
}

/**
 * Fetches a single blog post by slug from Supabase (with resilient local fallback).
 */
async function fetchBlogPostBySlug(slug) {
  if (!slug) return { isLive: false, data: null };

  // 1. Check local server API first if returning JSON
  try {
    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    const res = await fetch(`${baseUrl}/api/blog/${encodeURIComponent(slug)}`);
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const json = await res.json();
      if (json && json.data) {
        return { isLive: true, data: json.data };
      }
    }
  } catch (err) {}

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .is('deleted_at', null)
        .single();

      if (!error && data) return { isLive: true, data };
    } catch (err) {
      console.warn('fetchBlogPostBySlug Supabase fallback:', err);
    }
  }

  // Local fallback
  const local = getLocalStoriesFallback();
  const post = local.find(p => p.slug === slug && !p.deleted_at && (p.status || '').toLowerCase() === 'published');
  return { isLive: false, data: post || null };
}

/**
 * Normalizes review records from Supabase into a consistent client shape.
 */
function normalizeReview(r) {
  if (!r) return null;
  const supaUrl = (typeof window !== 'undefined' && window.SWAN_CONFIG && window.SWAN_CONFIG.supabaseUrl) || SUPABASE_CONFIG.url;
  
  const rawName = r.display_name || r.customer_name || r.author_name || r.reviewer_name || 'Kind Customer';
  const rawBody = r.body || r.comment || '';
  const photoPath = r.photo_path || null;
  const photoUrl = photoPath ? (
    photoPath.startsWith('http') 
      ? photoPath 
      : `${supaUrl}/storage/v1/object/public/public-review-photos/${photoPath}`
  ) : null;

  return {
    id: r.id,
    type: r.type || 'note',
    rating: parseInt(r.rating, 10) || 5,
    body: rawBody,
    displayName: rawName,
    display_name: rawName,
    city: r.city || r.author_city || '',
    productId: r.product_id || null,
    product_id: r.product_id || null,
    productName: r.product_name || r.products?.name || '',
    productSlug: r.product_slug || r.products?.slug || '',
    photoPath: photoPath,
    photo_path: photoPath,
    photoUrl: photoUrl,
    photo_url: photoUrl,
    isPublic: r.is_public !== false,
    is_public: r.is_public !== false,
    verifiedBuyer: Boolean(r.verified_buyer || r.is_verified_buyer || r.verified_purchase),
    verified_buyer: Boolean(r.verified_buyer || r.is_verified_buyer || r.verified_purchase),
    featured: Boolean(r.featured),
    adminReply: r.admin_reply || null,
    admin_reply: r.admin_reply || null,
    createdAt: r.created_at,
    created_at: r.created_at,
    approvedAt: r.approved_at || null,
    approved_at: r.approved_at || null
  };
}

/**
 * Fetches approved reviews for a product or the whole atelier.
 */
async function fetchApprovedReviews(productId = null) {
  const client = getSupabaseClient();
  const isUuid = Boolean(productId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId));
  let results = [];

  // 1. Query Supabase
  if (client) {
    try {
      let viewQuery = client
        .from('approved_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (isUuid) {
        viewQuery = viewQuery.eq('product_id', productId);
      }

      const { data: viewData, error: viewErr } = await viewQuery;
      if (!viewErr && Array.isArray(viewData)) {
        results = viewData.slice();
      } else {
        let query = client
          .from('reviews')
          .select('*, products(name, slug, image_url)')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (isUuid) {
          query = query.eq('product_id', productId);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          results = (data || []).filter(r => r.deleted_at === null || r.deleted_at === undefined);
        }
      }
    } catch (err) {
      console.warn('Supabase fetchApprovedReviews notice:', err);
    }
  }

  // 2. Merge with /api/reviews if returning JSON
  try {
    const apiRes = await fetch('/api/reviews');
    if (apiRes.ok && apiRes.headers.get('content-type')?.includes('application/json')) {
      const apiJson = await apiRes.json();
      if (apiJson.data && Array.isArray(apiJson.data)) {
        const existing = new Set(results.map(r => String(r.id)));
        for (const item of apiJson.data) {
          if (!existing.has(String(item.id))) {
            results.push(item);
            existing.add(String(item.id));
          }
        }
      }
    }
  } catch (e) {}

  if (productId && !isUuid) {
    results = results.filter(r => r.product_id === productId || r.productId === productId);
  }

  return { isLive: results.length > 0, data: results.map(normalizeReview).filter(Boolean) };
}

/**
 * Subscribes to live review updates and polls every 60s for seamless freshness without redeploy.
 */
function subscribeToApprovedReviews(onUpdate) {
  if (typeof onUpdate !== 'function') return () => {};
  const client = getSupabaseClient();
  let channel = null;

  if (client && typeof client.channel === 'function') {
    try {
      channel = client
        .channel('public:reviews:live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
          onUpdate();
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription note:', e);
    }
  }

  // 60-second polling fallback
  const intervalId = setInterval(() => {
    onUpdate();
  }, 60000);

  return () => {
    if (intervalId) clearInterval(intervalId);
    if (channel && client) {
      client.removeChannel(channel).catch(() => {});
    }
  };
}

/**
 * Fetches live site content by key (hero, banner, about, contact, policies).
 */
async function fetchSiteContent(key) {
  const client = getSupabaseClient();
  if (!client || !key) return { isLive: false, data: null };

  try {
    const { data, error } = await client
      .from('site_content')
      .select('data')
      .eq('key', key)
      .single();

    if (error || !data) return { isLive: false, data: null };
    return { isLive: true, data: data.data };
  } catch (err) {
    console.error('fetchSiteContent exception:', err);
    return { isLive: false, data: null };
  }
}

/**
 * Submits an order through the secure database RPC function.
 * Ensures totals are recomputed on the server and checks spam protection.
 */
async function submitOrderSecure({
  customerName,
  customerEmail,
  customerPhone,
  shippingAddress,
  customerNotes = '',
  items = [],
  couponCode = null,
  honeypot = null
}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Database connection is not configured.');
  }

  const { data, error } = await client.rpc('create_order_secure', {
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_customer_phone: customerPhone,
    p_shipping_address: shippingAddress,
    p_customer_notes: customerNotes,
    p_items: items,
    p_coupon_code: couponCode,
    p_honeypot: honeypot
  });

  if (error) {
    throw new Error(error.message || 'Unable to place order. Please try again or reach out on WhatsApp.');
  }

  return data;
}

/**
 * Submits a customer review through the secure database RPC function.
 * Reviews are always submitted as pending until approved by the atelier admin.
 */
async function submitReviewSecure({
  productId,
  orderId = null,
  customerName,
  customerEmail = '',
  rating,
  title = '',
  comment,
  honeypot = null
}) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Database connection is not configured.');
  }

  const { data, error } = await client.rpc('submit_review_secure', {
    p_product_id: productId,
    p_order_id: orderId,
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_rating: parseInt(rating, 10),
    p_title: title,
    p_comment: comment,
    p_honeypot: honeypot
  });

  if (error) {
    throw new Error(error.message || 'Unable to submit review.');
  }

  return data;
}

/**
 * Uploads an image to the Supabase "images" storage bucket and returns its public URL.
 */
async function uploadImageToBucket(file, pathPrefix = 'catalog') {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not connected.');
  }

  const fileExt = file.name.split('.').pop().toLowerCase();
  const fileName = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

  const { data, error } = await client.storage
    .from('images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(error.message || 'Image upload failed.');
  }

  const { data: urlData } = client.storage.from('images').getPublicUrl(data.path);
  return urlData.publicUrl;
}

if (typeof window !== 'undefined') {
  window.fetchApprovedReviews = fetchApprovedReviews;
  window.subscribeToApprovedReviews = subscribeToApprovedReviews;
  window.normalizeReview = normalizeReview;
}
