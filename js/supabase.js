/**
 * SWAN STUDIO — Supabase Client & Data Access Layer
 * Brand: Swan Studio | Founder: Bhumika Nama
 * 
 * SECURITY RULES (PRD Section 2 & 5):
 * 1. ONLY the public Project URL and Publishable (anon) Key appear here.
 * 2. NEVER put the service_role key or database passwords in this file.
 * 3. All database reads and writes are protected by Row Level Security (RLS).
 */

const SUPABASE_CONFIG = {
  // Replace these placeholders with your real Supabase Project credentials:
  url: 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY'
};

let _supabaseClient = null;

/**
 * Checks whether the user has supplied real Supabase credentials.
 */
function isSupabaseConfigured() {
  return (
    SUPABASE_CONFIG.url &&
    !SUPABASE_CONFIG.url.includes('YOUR_SUPABASE_PROJECT_ID') &&
    SUPABASE_CONFIG.anonKey &&
    !SUPABASE_CONFIG.anonKey.includes('YOUR_SUPABASE_ANON_KEY')
  );
}

/**
 * Returns an initialized Supabase client instance or null if unconfigured.
 */
function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!_supabaseClient && window.supabase) {
    _supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }
  return _supabaseClient;
}

/**
 * Fetches products from Supabase with search, category filter, and sorting.
 * If Supabase is not configured yet, seamlessly returns active demo/admin products with full filtering.
 */
function isProductSoldOut(p) {
  if (!p) return false;
  if (p.isSoldOut || p.sold_out) return true;
  // For made-to-order items, show nothing, since they can always be ordered
  if (p.madeToOrder || p.made_to_order) return false;
  const stock = (p.stock !== undefined && p.stock !== null) 
    ? Number(p.stock) 
    : ((p.stock_quantity !== undefined && p.stock_quantity !== null) ? Number(p.stock_quantity) : 0);
  return stock <= 0;
}

/**
 * Fetches products from database (via SWAN_API backend or Supabase if configured).
 * The database is the single source of truth. Never uses hardcoded demo products.
 */
async function fetchProducts({ category = 'all', search = '', sort = 'featured', featuredOnly = false, maxPrice = null, hideSoldOut = false } = {}) {
  const client = getSupabaseClient();

  // 1. Try Supabase if configured
  if (client) {
    try {
      let query = client
        .from('products')
        .select('*, categories(name, slug)')
        .eq('is_published', true)
        .eq('is_hidden', false)
        .is('deleted_at', null)
        .is('archived_at', null);

      if (featuredOnly) query = query.eq('is_featured', true);
      if (category && category !== 'all') query = query.eq('categories.slug', category);
      if (search && search.trim()) query = query.ilike('name', `%${search.trim()}%`);
      if (maxPrice !== null && !isNaN(Number(maxPrice))) query = query.lte('price', Number(maxPrice));

      const { data, error } = await query;
      if (!error && data) {
        let normalized = data.map(p => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          imageUrl: p.image_url || null,
          category: p.categories?.slug || 'other',
          categoryName: p.categories?.name || 'Crochet Creation',
          price: parseFloat(p.price),
          salePrice: p.sale_price ? parseFloat(p.sale_price) : null,
          description: p.description,
          materials: p.materials,
          dimensions: p.dimensions,
          colors: p.colors || [],
          variants: p.variants || [],
          stock: (p.stock_quantity !== undefined && p.stock_quantity !== null) ? parseInt(p.stock_quantity, 10) : 0,
          madeToOrder: Boolean(p.made_to_order),
          prepTime: p.prep_time,
          badge: p.badge || (p.made_to_order ? 'Made to Order' : 'Ready to Ship'),
          iconType: p.icon_type || 'flower',
          isFeatured: Boolean(p.is_featured),
          isPublished: Boolean(p.is_published)
        }));
        if (hideSoldOut) normalized = normalized.filter(p => !isProductSoldOut(p));
        return { isLive: true, data: normalized };
      }
    } catch (err) {
      console.warn('Supabase fetch products error:', err);
    }
  }

  // 2. Primary / Connected Backend API (Single Source of Truth)
  try {
    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (search && search.trim()) params.set('search', search.trim());
    if (sort) params.set('sort', sort);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (hideSoldOut) params.set('hideSoldOut', '1');
    if (featuredOnly) params.set('featured', '1');

    const res = await fetch(`${baseUrl}/api/products?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return { isLive: true, data: json.data };
      }
    }
  } catch (err) {
    console.warn('Backend API fetch products error:', err);
  }

  return { isLive: false, data: [] };
}

/**
 * Fetches a single product by slug from the database.
 * Returns { isLive, data: null } if the product is deleted, archived, hidden, or not found.
 */
async function fetchProductBySlug(slug) {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('products')
        .select('*, categories(name, slug)')
        .eq('slug', slug)
        .eq('is_published', true)
        .eq('is_hidden', false)
        .is('deleted_at', null)
        .is('archived_at', null)
        .single();
      if (!error && data) {
        return {
          isLive: true,
          data: {
            id: data.id,
            slug: data.slug,
            name: data.name,
            imageUrl: data.image_url || null,
            category: data.categories?.slug || 'other',
            categoryName: data.categories?.name || 'Crochet Creation',
            price: parseFloat(data.price),
            salePrice: data.sale_price ? parseFloat(data.sale_price) : null,
            description: data.description,
            materials: data.materials,
            dimensions: data.dimensions,
            colors: data.colors || [],
            stock: (data.stock_quantity !== undefined && data.stock_quantity !== null) ? parseInt(data.stock_quantity, 10) : 0,
            madeToOrder: Boolean(data.made_to_order),
            prepTime: data.prep_time,
            badge: data.badge,
            iconType: data.icon_type,
            isFeatured: Boolean(data.is_featured),
            isPublished: Boolean(data.is_published)
          }
        };
      }
    } catch (e) {}
  }

  try {
    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    const res = await fetch(`${baseUrl}/api/products/${encodeURIComponent(slug)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return { isLive: true, data: json.data };
      }
    }
  } catch (err) {
    console.warn('Backend API fetchProductBySlug error:', err);
  }

  return { isLive: false, data: null };
}

/**
 * Fetches active categories from database:
 * Only returns categories that exist, are visible, not deleted, and have >= 1 visible product.
 */
async function fetchCategories() {
  const client = getSupabaseClient();
  let list = [];
  let isLive = false;

  if (client) {
    try {
      const { data, error } = await client
        .from('active_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        list = data;
        isLive = true;
      }
    } catch (e) {}
  }

  if (!isLive) {
    try {
      const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
      const res = await fetch(`${baseUrl}/api/categories`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          list = json.data;
          isLive = true;
        }
      }
    } catch (err) {
      console.warn('Backend API fetchCategories error:', err);
    }
  }

  list.isLive = isLive;
  list.data = list;
  return list;
}


