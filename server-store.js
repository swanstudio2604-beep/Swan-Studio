/**
 * SWAN STUDIO — Database & Persistence Layer
 * Brand: Swan Studio | Founder: Bhumika Nama
 * 
 * Provides single-source-of-truth persistence for products and categories:
 * - Soft delete (deleted_at timestamp)
 * - Trash restore and permanent deletion
 * - Visibility controls (is_hidden)
 * - Foreign key safety (category product counts, move or cascade delete)
 * - Public catalog filters (only non-deleted, visible items with active products)
 */

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'data', 'store.json');

function ensureStoreExists() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial = {
      categories: [],
      products: []
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
  }
}

function readStore() {
  ensureStoreExists();
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading store.json:', err);
    return { categories: [], products: [] };
  }
}

function writeStore(data) {
  ensureStoreExists();
  const tmpPath = `${STORE_PATH}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, STORE_PATH);
    return true;
  } catch (err) {
    console.error('Error writing store.json:', err);
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch (e) {}
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// PUBLIC CATALOG METHODS
// ---------------------------------------------------------------------------

/**
 * Returns active public products:
 * is_published === true AND is_hidden !== true AND deleted_at === null
 */
function getPublicProducts({ category = 'all', search = '', sort = 'featured', maxPrice = null, hideSoldOut = false, featuredOnly = false } = {}) {
  const store = readStore();
  const categoryMap = new Map();
  (store.categories || []).forEach(c => {
    categoryMap.set(String(c.id), c);
    if (c.slug) categoryMap.set(String(c.slug), c);
  });

  let list = (store.products || []).filter(p => {
    if (p.deleted_at) return false;
    if (p.is_hidden === true) return false;
    if (p.is_published === false) return false;
    if (p.archived_at) return false;
    return true;
  });

  // Attach resolved category info
  list = list.map(p => {
    const cat = categoryMap.get(String(p.category_id)) || categoryMap.get(String(p.category)) || null;
    return {
      ...p,
      category: cat ? cat.slug : (p.category || 'other'),
      categoryName: cat ? cat.name : (p.categoryName || 'Crochet Creation')
    };
  });

  if (featuredOnly) {
    list = list.filter(p => Boolean(p.is_featured));
  }

  if (category && category !== 'all') {
    list = list.filter(p => p.category === category || String(p.category_id) === category);
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(p => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
      return name.includes(q) || desc.includes(q) || tags.includes(q);
    });
  }

  if (maxPrice !== null && !isNaN(Number(maxPrice))) {
    list = list.filter(p => Number(p.price) <= Number(maxPrice));
  }

  if (hideSoldOut) {
    list = list.filter(p => {
      const isMto = Boolean(p.made_to_order || p.madeToOrder);
      const stock = Number(p.stock_quantity ?? p.stock ?? 0);
      return isMto || stock > 0;
    });
  }

  // Sorting
  list.sort((a, b) => {
    const isMtoA = Boolean(a.made_to_order || a.madeToOrder);
    const stockA = Number(a.stock_quantity ?? a.stock ?? 0);
    const soldOutA = !isMtoA && stockA <= 0;

    const isMtoB = Boolean(b.made_to_order || b.madeToOrder);
    const stockB = Number(b.stock_quantity ?? b.stock ?? 0);
    const soldOutB = !isMtoB && stockB <= 0;

    // Push sold out to end
    if (soldOutA !== soldOutB) return soldOutA ? 1 : -1;

    if (sort === 'price-asc') return Number(a.price) - Number(b.price);
    if (sort === 'price-desc') return Number(b.price) - Number(a.price);
    if (sort === 'name-asc') return (a.name || '').localeCompare(b.name || '');

    // Default 'featured': featured first
    const featA = Boolean(a.is_featured || a.isFeatured) ? 1 : 0;
    const featB = Boolean(b.is_featured || b.isFeatured) ? 1 : 0;
    if (featB !== featA) return featB - featA;
    return (b.id || '').localeCompare(a.id || '');
  });

  return list;
}

/**
 * Returns single public product by slug or id
 */
function getPublicProductBySlug(slugOrId) {
  const products = getPublicProducts();
  return products.find(p => p.slug === slugOrId || String(p.id) === String(slugOrId)) || null;
}

/**
 * Returns active public categories:
 * - deleted_at === null AND is_hidden !== true
 * - ONLY if it has at least one visible active product
 */
function getPublicCategories() {
  const store = readStore();
  const activeProducts = getPublicProducts();

  // Count active products per category
  const counts = new Map();
  activeProducts.forEach(p => {
    const catId = String(p.category_id || '');
    const catSlug = String(p.category || '');
    counts.set(catId, (counts.get(catId) || 0) + 1);
    if (catSlug) counts.set(catSlug, (counts.get(catSlug) || 0) + 1);
  });

  const categories = (store.categories || [])
    .filter(c => {
      if (c.deleted_at) return false;
      if (c.is_hidden === true) return false;
      const count = counts.get(String(c.id)) || counts.get(String(c.slug)) || 0;
      return count > 0;
    })
    .map(c => ({
      ...c,
      productCount: counts.get(String(c.id)) || counts.get(String(c.slug)) || 0
    }))
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

  return categories;
}

// ---------------------------------------------------------------------------
// ADMIN METHODS (Products)
// ---------------------------------------------------------------------------

function getAdminProducts({ trash = false } = {}) {
  const store = readStore();
  const categoryMap = new Map();
  (store.categories || []).forEach(c => {
    categoryMap.set(String(c.id), c);
    if (c.slug) categoryMap.set(String(c.slug), c);
  });

  return (store.products || [])
    .filter(p => trash ? p.deleted_at !== null : p.deleted_at === null)
    .map(p => {
      const cat = categoryMap.get(String(p.category_id)) || categoryMap.get(String(p.category)) || null;
      return {
        ...p,
        category: cat ? cat.slug : (p.category || 'other'),
        categoryName: cat ? cat.name : (p.categoryName || 'Crochet Creation')
      };
    })
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function createProduct(payload) {
  const store = readStore();
  const now = new Date().toISOString();
  const id = `prod-${Date.now()}`;
  
  let slug = payload.slug ? String(payload.slug).trim().toLowerCase() : '';
  if (!slug) {
    slug = String(payload.name || id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // Ensure unique slug
  let uniqueSlug = slug;
  let counter = 1;
  while (store.products.some(p => p.slug === uniqueSlug)) {
    uniqueSlug = `${slug}-${counter++}`;
  }

  // Resolve category name
  const targetCat = payload.categoryId || payload.category_id || payload.category;
  const cat = (store.categories || []).find(c => String(c.id) === String(targetCat) || c.slug === targetCat);
  const categoryId = cat ? cat.id : (targetCat || null);
  const categorySlug = cat ? cat.slug : (payload.category || 'other');
  const categoryName = cat ? cat.name : (payload.categoryName || 'Crochet Creation');

  const product = {
    id,
    category_id: categoryId,
    category: categorySlug,
    categoryName,
    name: String(payload.name || 'Untitled Creation').trim(),
    slug: uniqueSlug,
    description: String(payload.description || '').trim(),
    price: parseFloat(payload.price) || 0,
    sale_price: payload.sale_price ? parseFloat(payload.sale_price) : null,
    materials: payload.materials || '100% Milk Cotton Yarn',
    dimensions: payload.dimensions || '',
    colors: Array.isArray(payload.colors) ? payload.colors : [],
    stock_quantity: parseInt(payload.stock_quantity ?? payload.stock ?? 0, 10),
    made_to_order: Boolean(payload.made_to_order ?? payload.madeToOrder),
    prep_time: payload.prep_time || '2-4 business days',
    badge: payload.badge || '',
    icon_type: payload.icon_type || 'flower',
    image_url: payload.image_url || payload.imageUrl || null,
    imageUrl: payload.image_url || payload.imageUrl || null,
    images: Array.isArray(payload.images) ? payload.images : [],
    is_featured: Boolean(payload.is_featured ?? payload.isFeatured),
    is_published: payload.is_published !== undefined ? Boolean(payload.is_published) : (payload.isPublished !== undefined ? Boolean(payload.isPublished) : true),
    is_hidden: Boolean(payload.is_hidden || payload.isHidden),
    deleted_at: null,
    created_at: now,
    updated_at: now
  };

  store.products.unshift(product);
  writeStore(store);
  return product;
}

function updateProduct(id, updates) {
  const store = readStore();
  const index = store.products.findIndex(p => String(p.id) === String(id));
  if (index === -1) return null;

  const current = store.products[index];
  const now = new Date().toISOString();

  // Handle category change
  let categoryId = current.category_id;
  let categorySlug = current.category;
  let categoryName = current.categoryName;
  if (updates.categoryId !== undefined || updates.category_id !== undefined || updates.category !== undefined) {
    const targetCatId = updates.categoryId || updates.category_id || updates.category;
    const cat = (store.categories || []).find(c => String(c.id) === String(targetCatId) || c.slug === targetCatId);
    if (cat) {
      categoryId = cat.id;
      categorySlug = cat.slug;
      categoryName = cat.name;
    }
  }

  const updated = {
    ...current,
    ...updates,
    category_id: categoryId,
    category: categorySlug,
    categoryName,
    price: updates.price !== undefined ? parseFloat(updates.price) : current.price,
    sale_price: updates.sale_price !== undefined ? (updates.sale_price ? parseFloat(updates.sale_price) : null) : current.sale_price,
    stock_quantity: updates.stock_quantity !== undefined ? parseInt(updates.stock_quantity, 10) : (updates.stock !== undefined ? parseInt(updates.stock, 10) : current.stock_quantity),
    is_featured: updates.is_featured !== undefined ? Boolean(updates.is_featured) : (updates.isFeatured !== undefined ? Boolean(updates.isFeatured) : current.is_featured),
    is_published: updates.is_published !== undefined ? Boolean(updates.is_published) : (updates.isPublished !== undefined ? Boolean(updates.isPublished) : current.is_published),
    is_hidden: updates.is_hidden !== undefined ? Boolean(updates.is_hidden) : current.is_hidden,
    image_url: updates.image_url !== undefined ? updates.image_url : (updates.imageUrl !== undefined ? updates.imageUrl : current.image_url),
    imageUrl: updates.image_url !== undefined ? updates.image_url : (updates.imageUrl !== undefined ? updates.imageUrl : current.imageUrl),
    updated_at: now
  };

  store.products[index] = updated;
  writeStore(store);
  return updated;
}

/**
 * Soft delete or permanent delete of product
 */
function deleteProduct(id, permanent = false) {
  const store = readStore();
  const index = store.products.findIndex(p => String(p.id) === String(id));
  if (index === -1) return { success: false, rowsAffected: 0, error: 'Product not found' };

  if (permanent) {
    store.products.splice(index, 1);
  } else {
    store.products[index].deleted_at = new Date().toISOString();
    store.products[index].is_featured = false; // Detach from featured lists
  }

  writeStore(store);
  return {
    success: true,
    rowsAffected: 1,
    permanent,
    id
  };
}

/**
 * Restore soft-deleted product
 */
function restoreProduct(id) {
  const store = readStore();
  const product = store.products.find(p => String(p.id) === String(id));
  if (!product) return { success: false, error: 'Product not found' };

  product.deleted_at = null;
  product.updated_at = new Date().toISOString();
  writeStore(store);
  return { success: true, data: product };
}

/**
 * Bulk action on products
 */
function bulkProductAction(action, ids, extra = {}) {
  const store = readStore();
  const idSet = new Set(ids.map(String));
  let count = 0;
  const now = new Date().toISOString();

  store.products.forEach(p => {
    if (!idSet.has(String(p.id))) return;
    count++;

    if (action === 'hide') {
      p.is_hidden = true;
      p.updated_at = now;
    } else if (action === 'unhide') {
      p.is_hidden = false;
      p.updated_at = now;
    } else if (action === 'delete') {
      p.deleted_at = now;
      p.is_featured = false;
      p.updated_at = now;
    } else if (action === 'restore') {
      p.deleted_at = null;
      p.updated_at = now;
    } else if (action === 'move_category') {
      const targetCatId = extra.targetCategoryId;
      const cat = (store.categories || []).find(c => String(c.id) === String(targetCatId) || c.slug === targetCatId);
      if (cat) {
        p.category_id = cat.id;
        p.category = cat.slug;
        p.categoryName = cat.name;
        p.updated_at = now;
      }
    }
  });

  if (action === 'delete_forever') {
    store.products = store.products.filter(p => !idSet.has(String(p.id)));
  }

  writeStore(store);
  return { success: true, count };
}

// ---------------------------------------------------------------------------
// ADMIN METHODS (Categories)
// ---------------------------------------------------------------------------

function getAdminCategories({ trash = false } = {}) {
  const store = readStore();
  const products = (store.products || []).filter(p => p.deleted_at === null);

  const counts = new Map();
  products.forEach(p => {
    const id = String(p.category_id || '');
    const slug = String(p.category || '');
    counts.set(id, (counts.get(id) || 0) + 1);
    if (slug) counts.set(slug, (counts.get(slug) || 0) + 1);
  });

  return (store.categories || [])
    .filter(c => trash ? c.deleted_at !== null : c.deleted_at === null)
    .map(c => ({
      ...c,
      productCount: counts.get(String(c.id)) || counts.get(String(c.slug)) || 0
    }))
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
}

function createCategory(payload) {
  const store = readStore();
  const now = new Date().toISOString();
  const id = `cat-${Date.now()}`;

  let slug = payload.slug ? String(payload.slug).trim().toLowerCase() : '';
  if (!slug) {
    slug = String(payload.name || id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  let uniqueSlug = slug;
  let counter = 1;
  while (store.categories.some(c => c.slug === uniqueSlug)) {
    uniqueSlug = `${slug}-${counter++}`;
  }

  const category = {
    id,
    name: String(payload.name || 'New Collection').trim(),
    slug: uniqueSlug,
    description: String(payload.description || '').trim(),
    icon_emoji: payload.icon_emoji || '🌸',
    sort_order: parseInt(payload.sort_order || store.categories.length + 1, 10),
    is_hidden: Boolean(payload.is_hidden),
    deleted_at: null,
    created_at: now,
    updated_at: now
  };

  store.categories.push(category);
  writeStore(store);
  return category;
}

function updateCategory(id, updates) {
  const store = readStore();
  const index = store.categories.findIndex(c => String(c.id) === String(id));
  if (index === -1) return null;

  const current = store.categories[index];
  const now = new Date().toISOString();

  const updated = {
    ...current,
    ...updates,
    sort_order: updates.sort_order !== undefined ? parseInt(updates.sort_order, 10) : current.sort_order,
    is_hidden: updates.is_hidden !== undefined ? Boolean(updates.is_hidden) : current.is_hidden,
    updated_at: now
  };

  store.categories[index] = updated;

  // Also sync category name / slug in products if name or slug changed
  if (updates.name || updates.slug) {
    store.products.forEach(p => {
      if (String(p.category_id) === String(id) || p.category === current.slug) {
        if (updates.name) p.categoryName = updates.name;
        if (updates.slug) p.category = updates.slug;
      }
    });
  }

  writeStore(store);
  return updated;
}

/**
 * Delete category rules:
 * - If category has products, requires resolution (move_to or delete_products)
 * - If empty, deletes right away
 */
function deleteCategory(id, { permanent = false, moveToCategoryId = null, deleteProducts = false } = {}) {
  const store = readStore();
  const cat = store.categories.find(c => String(c.id) === String(id));
  if (!cat) return { success: false, rowsAffected: 0, error: 'Collection not found' };

  // Check active products belonging to this category
  const linkedProducts = store.products.filter(p => 
    (String(p.category_id) === String(id) || p.category === cat.slug) && p.deleted_at === null
  );

  if (linkedProducts.length > 0 && !moveToCategoryId && !deleteProducts) {
    return {
      success: false,
      requiresResolution: true,
      productCount: linkedProducts.length,
      message: `This collection contains ${linkedProducts.length} product${linkedProducts.length === 1 ? '' : 's'}. Choose to move them to another collection or delete them too.`
    };
  }

  const now = new Date().toISOString();

  // If move specified
  if (moveToCategoryId) {
    const targetCat = store.categories.find(c => String(c.id) === String(moveToCategoryId) || c.slug === moveToCategoryId);
    if (!targetCat) return { success: false, error: 'Target collection not found' };
    linkedProducts.forEach(p => {
      p.category_id = targetCat.id;
      p.category = targetCat.slug;
      p.categoryName = targetCat.name;
      p.updated_at = now;
    });
  } else if (deleteProducts) {
    // Delete linked products too
    linkedProducts.forEach(p => {
      if (permanent) {
        const pIdx = store.products.indexOf(p);
        if (pIdx !== -1) store.products.splice(pIdx, 1);
      } else {
        p.deleted_at = now;
        p.is_featured = false;
        p.updated_at = now;
      }
    });
  }

  // Delete category
  const catIndex = store.categories.findIndex(c => String(c.id) === String(id));
  if (permanent) {
    if (catIndex !== -1) store.categories.splice(catIndex, 1);
  } else {
    store.categories[catIndex].deleted_at = now;
  }

  writeStore(store);
  return {
    success: true,
    rowsAffected: 1,
    permanent,
    id
  };
}

function restoreCategory(id) {
  const store = readStore();
  const cat = store.categories.find(c => String(c.id) === String(id));
  if (!cat) return { success: false, error: 'Category not found' };

  cat.deleted_at = null;
  cat.updated_at = new Date().toISOString();
  writeStore(store);
  return { success: true, data: cat };
}

// ---------------------------------------------------------------------------
// SITEMAP XML GENERATOR
// ---------------------------------------------------------------------------
function generateSitemapXml(baseUrl = 'https://swan-studio.onrender.com') {
  const products = getPublicProducts();
  const categories = getPublicCategories();
  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Core static pages
  const staticPages = [
    { loc: '', priority: '1.0', changefreq: 'daily' },
    { loc: 'shop.html', priority: '0.9', changefreq: 'daily' },
    { loc: 'about.html', priority: '0.7', changefreq: 'monthly' },
    { loc: 'reviews.html', priority: '0.8', changefreq: 'weekly' },
    { loc: 'custom-order.html', priority: '0.8', changefreq: 'monthly' },
    { loc: 'contact.html', priority: '0.6', changefreq: 'monthly' },
    { loc: 'shipping.html', priority: '0.5', changefreq: 'monthly' },
    { loc: 'returns.html', priority: '0.5', changefreq: 'monthly' },
    { loc: 'privacy.html', priority: '0.3', changefreq: 'yearly' },
    { loc: 'terms.html', priority: '0.3', changefreq: 'yearly' }
  ];

  staticPages.forEach(p => {
    xml += `  <url>\n    <loc>${baseUrl}/${p.loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  });

  // Active Category URLs only (never deleted or hidden)
  categories.forEach(c => {
    xml += `  <url>\n    <loc>${baseUrl}/shop.html?category=${c.slug}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  // Active Product URLs only (never deleted or hidden)
  products.forEach(p => {
    xml += `  <url>\n    <loc>${baseUrl}/product.html?slug=${p.slug}</loc>\n    <lastmod>${p.updated_at ? p.updated_at.split('T')[0] : now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  xml += `</urlset>`;
  return xml;
}

module.exports = {
  readStore,
  writeStore,
  getPublicProducts,
  getPublicProductBySlug,
  getPublicCategories,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  bulkProductAction,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  generateSitemapXml
};
