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

async function fetchProducts({ category = 'all', search = '', sort = 'featured', featuredOnly = false, maxPrice = null, hideSoldOut = false } = {}) {
  const client = getSupabaseClient();
  const deletedIds = JSON.parse(localStorage.getItem('swan_deleted_product_ids') || '[]');
  const archivedIds = JSON.parse(localStorage.getItem('swan_archived_product_ids') || '[]');

  if (!client) {
    // Graceful fallback to demo / admin catalog for local testing
    let list = [];
    const stored = localStorage.getItem('swan_admin_products');
    if (stored) {
      try { list = JSON.parse(stored); } catch (e) { list = []; }
    }
    if (!list || list.length === 0) {
      list = typeof getDemoProducts === 'function' ? getDemoProducts() : [];
    }

    // Exclude deleted, archived, and disabled/unpublished items
    list = list.filter(p => {
      const pid = String(p.id);
      const pslug = String(p.slug || '');
      if (deletedIds.includes(pid) || (pslug && deletedIds.includes(pslug))) return false;
      if (archivedIds.includes(pid) || (pslug && archivedIds.includes(pslug))) return false;
      if (p.archived_at) return false;
      // Must be published! If disabled (isPublished === false), omit from storefront
      if (p.isPublished === false || p.is_published === false) return false;
      return true;
    });

    // Populate defaults for isFeatured & stock
    list = list.map(p => ({
      ...p,
      isFeatured: p.isFeatured !== undefined ? Boolean(p.isFeatured) : (['prod-001', 'prod-002', 'prod-003', 'prod-004'].includes(String(p.id))),
      isPublished: true,
      stock: (p.stock !== undefined && p.stock !== null) ? parseInt(p.stock, 10) : 0
    }));

    if (featuredOnly) {
      list = list.filter(p => Boolean(p.isFeatured));
    }

    if (category && category !== 'all') {
      list = list.filter(p => p.category === category || p.categoryId === category);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    if (maxPrice !== null && !isNaN(Number(maxPrice))) {
      const limit = Number(maxPrice);
      list = list.filter(p => p.price <= limit);
    }

    // Optional: Hide sold-out items toggle
    if (hideSoldOut) {
      list = list.filter(p => !isProductSoldOut(p));
    }

    // Always sort sold-out items to the end of the list by default
    list.sort((a, b) => {
      const soA = isProductSoldOut(a) ? 1 : 0;
      const soB = isProductSoldOut(b) ? 1 : 0;
      if (soA !== soB) return soA - soB;

      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'name-asc') return a.name.localeCompare(b.name);

      // 'featured' sort: Featured products first!
      const featA = Boolean(a.isFeatured) ? 1 : 0;
      const featB = Boolean(b.isFeatured) ? 1 : 0;
      if (featB !== featA) return featB - featA;
      return (b.id || '').localeCompare(a.id || '');
    });

    return {
      isLive: false,
      data: list
    };
  }

  try {
    let query = client
      .from('products')
      .select('*, categories(name, slug)')
      .eq('is_published', true)
      .is('archived_at', null);

    if (featuredOnly) {
      query = query.eq('is_featured', true);
    }

    // Category filter
    if (category && category !== 'all') {
      query = query.eq('categories.slug', category);
    }

    // Search query
    if (search && search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    // Price upper limit filter
    if (maxPrice !== null && !isNaN(Number(maxPrice))) {
      query = query.lte('price', Number(maxPrice));
    }

    const { data, error } = await query;
    if (error) throw error;

    // Normalize format and filter out blacklisted local deletions
    let normalized = (data || [])
      .filter(p => {
        const pid = String(p.id);
        const pslug = String(p.slug || '');
        if (deletedIds.includes(pid) || (pslug && deletedIds.includes(pslug))) return false;
        if (archivedIds.includes(pid) || (pslug && archivedIds.includes(pslug))) return false;
        return true;
      })
      .map(p => ({
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

    if (hideSoldOut) {
      normalized = normalized.filter(p => !isProductSoldOut(p));
    }

    // Always push sold-out items to the end of the list by default
    normalized.sort((a, b) => {
      const soA = isProductSoldOut(a) ? 1 : 0;
      const soB = isProductSoldOut(b) ? 1 : 0;
      if (soA !== soB) return soA - soB;

      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'name-asc') return a.name.localeCompare(b.name);

      const featA = Boolean(a.isFeatured) ? 1 : 0;
      const featB = Boolean(b.isFeatured) ? 1 : 0;
      if (featB !== featA) return featB - featA;
      return (b.id || '').localeCompare(a.id || '');
    });

    return {
      isLive: true,
      data: normalized
    };
  } catch (err) {
    console.warn('Supabase fetch failed; falling back to demo data:', err);
    let list = [];
    const stored = localStorage.getItem('swan_admin_products');
    if (stored) {
      try { list = JSON.parse(stored); } catch (e) { list = []; }
    }
    if (!list || list.length === 0) {
      list = typeof getDemoProducts === 'function' ? getDemoProducts() : [];
    }
    list = list.filter(p => {
      const pid = String(p.id);
      const pslug = String(p.slug || '');
      if (deletedIds.includes(pid) || (pslug && deletedIds.includes(pslug))) return false;
      if (archivedIds.includes(pid) || (pslug && archivedIds.includes(pslug))) return false;
      if (p.archived_at) return false;
      if (p.isPublished === false || p.is_published === false) return false;
      return true;
    }).map(p => ({
      ...p,
      isFeatured: p.isFeatured !== undefined ? Boolean(p.isFeatured) : (['prod-001', 'prod-002', 'prod-003', 'prod-004'].includes(String(p.id))),
      isPublished: true,
      stock: (p.stock !== undefined && p.stock !== null) ? parseInt(p.stock, 10) : 0
    }));

    if (featuredOnly) {
      list = list.filter(p => Boolean(p.isFeatured));
    }
    if (category && category !== 'all') {
      list = list.filter(p => p.category === category || p.categoryId === category);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    if (maxPrice !== null && !isNaN(Number(maxPrice))) {
      list = list.filter(p => p.price <= Number(maxPrice));
    }
    if (hideSoldOut) {
      list = list.filter(p => !isProductSoldOut(p));
    }

    list.sort((a, b) => {
      const soA = isProductSoldOut(a) ? 1 : 0;
      const soB = isProductSoldOut(b) ? 1 : 0;
      if (soA !== soB) return soA - soB;

      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'name-asc') return a.name.localeCompare(b.name);

      const featA = Boolean(a.isFeatured) ? 1 : 0;
      const featB = Boolean(b.isFeatured) ? 1 : 0;
      if (featB !== featA) return featB - featA;
      return (b.id || '').localeCompare(a.id || '');
    });

    return {
      isLive: false,
      data: list
    };
  }
}

/**
 * Fetches a single product by slug.
 * Returns { isLive, data: null } if the product is deleted, archived, disabled, or not found.
 */
async function fetchProductBySlug(slug) {
  const deletedIds = JSON.parse(localStorage.getItem('swan_deleted_product_ids') || '[]');
  const archivedIds = JSON.parse(localStorage.getItem('swan_archived_product_ids') || '[]');

  if (deletedIds.includes(slug) || archivedIds.includes(slug)) {
    return { isLive: false, data: null };
  }

  const client = getSupabaseClient();

  if (!client) {
    let list = [];
    const stored = localStorage.getItem('swan_admin_products');
    if (stored) {
      try { list = JSON.parse(stored); } catch (e) { list = []; }
    }
    let item = list.find(p => p.slug === slug);
    if (!item && typeof getDemoProductBySlug === 'function') {
      const demoCandidate = getDemoProductBySlug(slug);
      if (demoCandidate && !deletedIds.includes(String(demoCandidate.id)) && !archivedIds.includes(String(demoCandidate.id))) {
        item = demoCandidate;
      }
    }

    if (!item) return { isLive: false, data: null };

    const pid = String(item.id);
    if (deletedIds.includes(pid) || (item.slug && deletedIds.includes(item.slug))) return { isLive: false, data: null };
    if (archivedIds.includes(pid) || (item.slug && archivedIds.includes(item.slug))) return { isLive: false, data: null };
    if (item.archived_at) return { isLive: false, data: null };
    if (item.isPublished === false || item.is_published === false) return { isLive: false, data: null };

    return {
      isLive: false,
      data: {
        ...item,
        isFeatured: item.isFeatured !== undefined ? Boolean(item.isFeatured) : (['prod-001', 'prod-002', 'prod-003', 'prod-004'].includes(String(item.id))),
        isPublished: true,
        stock: (item.stock !== undefined && item.stock !== null) ? parseInt(item.stock, 10) : 0
      }
    };
  }

  try {
    const { data, error } = await client
      .from('products')
      .select('*, categories(name, slug)')
      .eq('slug', slug)
      .eq('is_published', true)
      .is('archived_at', null)
      .single();

    if (error || !data) throw error || new Error('Product not found in Supabase');

    const pid = String(data.id);
    if (deletedIds.includes(pid) || deletedIds.includes(data.slug)) return { isLive: true, data: null };
    if (archivedIds.includes(pid) || archivedIds.includes(data.slug)) return { isLive: true, data: null };

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
        variants: data.variants || [],
        stock: (data.stock_quantity !== undefined && data.stock_quantity !== null) ? parseInt(data.stock_quantity, 10) : 0,
        madeToOrder: data.made_to_order,
        prepTime: data.prep_time,
        badge: data.badge || (data.made_to_order ? 'Made to Order' : 'Ready to Ship'),
        iconType: data.icon_type || 'flower',
        isFeatured: Boolean(data.is_featured),
        isPublished: Boolean(data.is_published)
      }
    };
  } catch (err) {
    console.warn('Supabase product fetch failed; checking demo data:', err);
    let list = [];
    const stored = localStorage.getItem('swan_admin_products');
    if (stored) {
      try { list = JSON.parse(stored); } catch (e) { list = []; }
    }
    let item = list.find(p => p.slug === slug);
    if (!item && typeof getDemoProductBySlug === 'function') {
      const demo = getDemoProductBySlug(slug);
      if (demo && !deletedIds.includes(String(demo.id)) && !archivedIds.includes(String(demo.id))) {
        item = demo;
      }
    }

    if (!item) return { isLive: false, data: null };
    const pid = String(item.id);
    if (deletedIds.includes(pid) || (item.slug && deletedIds.includes(item.slug))) return { isLive: false, data: null };
    if (archivedIds.includes(pid) || (item.slug && archivedIds.includes(item.slug))) return { isLive: false, data: null };
    if (item.archived_at) return { isLive: false, data: null };
    if (item.isPublished === false || item.is_published === false) return { isLive: false, data: null };

    return {
      isLive: false,
      data: {
        ...item,
        isFeatured: item.isFeatured !== undefined ? Boolean(item.isFeatured) : (['prod-001', 'prod-002', 'prod-003', 'prod-004'].includes(String(item.id))),
        isPublished: true,
        stock: (item.stock !== undefined && item.stock !== null) ? parseInt(item.stock, 10) : 0
      }
    };
  }
}
