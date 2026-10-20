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
    : ''
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
    stock: (p.stock_quantity !== undefined && p.stock_quantity !== null) ? parseInt(p.stock_quantity, 10) : 0,
    stock_quantity: (p.stock_quantity !== undefined && p.stock_quantity !== null) ? parseInt(p.stock_quantity, 10) : 0,
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
 * Fetches published products from live Supabase database with filters.
 */
async function fetchProducts({ category = 'all', search = '', sort = 'featured', featuredOnly = false, maxPrice = null, hideSoldOut = false } = {}) {
  const client = getSupabaseClient();
  if (!client) {
    return { isLive: false, data: [] };
  }

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

    if (sort === 'price-low') {
      query = query.order('price', { ascending: true });
    } else if (sort === 'price-high') {
      query = query.order('price', { ascending: false });
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
 * Fetches a single published product by slug from Supabase.
 */
async function fetchProductBySlug(slug) {
  const client = getSupabaseClient();
  if (!client || !slug) return { isLive: false, data: null };

  try {
    const { data, error } = await client
      .from('products')
      .select('*, categories(name, slug)')
      .eq('slug', slug)
      .eq('is_published', true)
      .eq('is_hidden', false)
      .is('deleted_at', null)
      .single();

    if (error || !data) return { isLive: false, data: null };
    return { isLive: true, data: normalizeProduct(data) };
  } catch (err) {
    console.error('fetchProductBySlug exception:', err);
    return { isLive: false, data: null };
  }
}

/**
 * Fetches active, non-deleted categories from Supabase.
 */
async function fetchCategories() {
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

/**
 * Fetches published blog posts from Supabase.
 */
async function fetchBlogPosts({ limit = 10 } = {}) {
  const client = getSupabaseClient();
  if (!client) return { isLive: false, data: [] };

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

    if (error) {
      console.warn('fetchBlogPosts error:', error.message);
      return { isLive: false, data: [] };
    }
    return { isLive: true, data: data || [] };
  } catch (err) {
    console.error('fetchBlogPosts exception:', err);
    return { isLive: false, data: [] };
  }
}

/**
 * Fetches a single blog post by slug from Supabase.
 */
async function fetchBlogPostBySlug(slug) {
  const client = getSupabaseClient();
  if (!client || !slug) return { isLive: false, data: null };

  try {
    const { data, error } = await client
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .is('deleted_at', null)
      .single();

    if (error || !data) return { isLive: false, data: null };
    return { isLive: true, data };
  } catch (err) {
    console.error('fetchBlogPostBySlug exception:', err);
    return { isLive: false, data: null };
  }
}

/**
 * Fetches approved reviews for a product or the whole atelier.
 */
async function fetchApprovedReviews(productId = null) {
  const client = getSupabaseClient();
  if (!client) return { isLive: false, data: [] };

  try {
    let query = client
      .from('reviews')
      .select('*, products(name, slug, image_url)')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('fetchApprovedReviews error:', error.message);
      return { isLive: false, data: [] };
    }
    return { isLive: true, data: data || [] };
  } catch (err) {
    console.error('fetchApprovedReviews exception:', err);
    return { isLive: false, data: [] };
  }
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
