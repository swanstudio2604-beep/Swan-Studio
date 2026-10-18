/**
 * SWAN STUDIO — Admin Shared Navigation & Data Management Layer
 * Brand: Swan Studio | Founder: Bhumika Nama
 * 
 * SECURITY RULES (PRD Section 2 & 12):
 * 1. Admin access is guarded via server-side database role verification.
 * 2. Mandatory developer credit "Developed with ❤️ by Mridul" rendered in admin footer.
 * 3. Soft deletes (archived_at) preferred over hard deletions to preserve order history.
 */

const ADMIN = {
  activeProfile: null,

  /**
   * Initializes page security, mounts sidebar & footer
   */
  async init(activePageKey = 'overview') {
    // 1. Verify admin privilege
    this.activeProfile = await AUTH.requireAuth({
      requireAdmin: true,
      redirectUrl: '../login.html'
    });

    if (!this.activeProfile) return false;

    // 2. Render sidebar & footer
    this.renderSidebar(activePageKey);
    this.renderFooter();

    // Show main application
    const appEl = document.getElementById('admin-app');
    if (appEl) appEl.style.display = 'grid';

    return true;
  },

  /**
   * Renders the shared sidebar
   */
  renderSidebar(activeKey) {
    const mount = document.getElementById('admin-sidebar-mount');
    if (!mount) return;

    const navItems = [
      { key: 'overview', label: '📊 Overview', href: 'index.html' },
      { key: 'orders', label: '🛒 Orders', href: 'orders.html' },
      { key: 'products', label: '🧶 Products', href: 'products.html' },
      { key: 'categories', label: '📁 Categories', href: 'categories.html' },
      { key: 'inventory', label: '📦 Inventory', href: 'inventory.html' },
      { key: 'payments', label: '💳 Payments (UPI)', href: 'payments.html' },
      { key: 'coupons', label: '🏷️ Coupons', href: 'coupons.html' },
      { key: 'custom-orders', label: '✨ Custom Orders', href: 'custom-orders.html' },
      { key: 'reviews', label: '💌 Customer Reviews', href: '../reviews.html' },
      { key: 'content', label: '📝 Website Content & Story', href: 'content.html' },
      { key: 'settings', label: '⚙️ Store Settings', href: 'content.html' }
    ];

    mount.innerHTML = `
      <!-- Mobile Top App Bar (Visible on mobile screens <= 900px) -->
      <header class="admin-mobile-header">
        <button id="admin-mobile-menu-toggle" class="admin-mobile-menu-btn" type="button" aria-label="Open navigation menu">
          ☰
        </button>
        <div class="admin-mobile-brand">
          <span class="brand-title">Swan Studio</span>
          <span class="brand-badge">👑 Admin Atelier</span>
        </div>
        <a href="../index.html" class="admin-mobile-store-link" title="Visit Public Storefront">🛍️ Store</a>
      </header>

      <!-- Drawer Backdrop for mobile -->
      <div id="admin-mobile-overlay" class="admin-mobile-overlay"></div>

      <!-- Main Navigation Sidebar -->
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="admin-sidebar-header-row">
          <div class="admin-sidebar-brand" style="margin-bottom: 0; padding-bottom: 1.25rem;">
            <h2 class="admin-sidebar-title">Swan Studio</h2>
            <span class="admin-sidebar-badge">👑 Admin Atelier</span>
          </div>
          <button id="admin-sidebar-close-btn" class="admin-sidebar-close" type="button" aria-label="Close navigation menu">✕</button>
        </div>

        <nav aria-label="Admin Navigation" style="margin-top: 1rem; flex: 1;">
          <ul class="admin-nav">
            ${navItems.map(item => `
              <li>
                <a href="${item.href}" class="admin-nav-link ${item.key === activeKey ? 'active' : ''}">
                  ${item.label}
                </a>
              </li>
            `).join('')}
          </ul>
        </nav>

        <div class="admin-sidebar-footer">
          <p style="font-size: 0.8rem; color: #BAA9A0; margin-bottom: 0.75rem; word-break: break-all;">
            Signed in as:<br>
            <strong style="color: #FFF8F1;">${this.activeProfile.full_name || this.activeProfile.email}</strong>
          </p>
          <button id="admin-logout-btn" style="color: #E8B7C0; background: none; border: 1px solid rgba(232, 183, 192, 0.4); padding: 0.5rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.82rem; cursor: pointer; width: 100%; text-align: center;">
            🚪 Log Out
          </button>
        </div>
      </aside>
    `;

    // Mobile Drawer Logic
    const toggleBtn = document.getElementById('admin-mobile-menu-toggle');
    const closeBtn = document.getElementById('admin-sidebar-close-btn');
    const overlay = document.getElementById('admin-mobile-overlay');
    const sidebar = document.getElementById('admin-sidebar');

    const openDrawer = () => {
      sidebar.classList.add('open');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    if (toggleBtn) toggleBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);

    // Close drawer when clicking a link
    mount.querySelectorAll('.admin-nav-link').forEach(link => {
      link.addEventListener('click', closeDrawer);
    });

    document.getElementById('admin-logout-btn').addEventListener('click', async () => {
      await AUTH.signOut();
    });
  },

  /**
   * Renders the shared admin footer (including developer credit)
   */
  renderFooter() {
    const mount = document.getElementById('admin-footer-mount');
    if (!mount) return;

    mount.innerHTML = `
      <div style="text-align: center; padding-top: 2rem; border-top: 1px solid var(--admin-border); font-size: 0.85rem; color: #8A7670; margin-top: 3rem;">
        <p>Swan Studio Atelier Admin &copy; ${new Date().getFullYear()}. All rights reserved.</p>
        <p class="dev-credit" style="color: #8A7670; margin-top: 0.25rem;">Developed with ❤️ by Mridul</p>
      </div>
    `;
  },

  /**
   * Accessible, non-blocking custom confirmation dialog
   * Replaces fragile window.confirm() which can be blocked by browser dialog suppression
   */
  confirmDialog({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false
  } = {}) {
    return new Promise((resolve) => {
      let modal = document.getElementById('admin-confirm-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'admin-confirm-modal';
        modal.style.cssText = `
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(38, 28, 24, 0.65);
          backdrop-filter: blur(5px);
          display: flex; align-items: center; justify-content: center;
          padding: 1.25rem; opacity: 0; transition: opacity 0.22s ease;
        `;
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div style="background: #FFFFFF; border-radius: 14px; max-width: 440px; width: 100%; padding: 1.75rem; box-shadow: 0 20px 40px rgba(0,0,0,0.25); border: 1px solid rgba(232, 183, 192, 0.4); transform: scale(0.96); transition: transform 0.22s ease; font-family: 'Poppins', sans-serif;">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.85rem;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${danger ? '#FEE2E2' : '#FFF0F2'}; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
              ${danger ? '⚠️' : '🌸'}
            </div>
            <h3 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.4rem; color: #2C221E; font-weight: 700;">
              ${title}
            </h3>
          </div>
          <p style="margin: 0 0 1.5rem 0; font-size: 0.9rem; color: #6E5A53; line-height: 1.55;">
            ${message}
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
            <button id="admin-confirm-cancel" type="button" style="padding: 0.6rem 1.15rem; background: #F3EAE3; color: #5D4037; border: 1px solid #E2D3CA; border-radius: 8px; font-size: 0.88rem; font-weight: 500; cursor: pointer; transition: all 0.2s;">
              ${cancelText}
            </button>
            <button id="admin-confirm-ok" type="button" style="padding: 0.6rem 1.25rem; background: ${danger ? '#DC2626' : '#C47281'}; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.88rem; font-weight: 600; cursor: pointer; box-shadow: 0 2px 6px ${danger ? 'rgba(220, 38, 38, 0.3)' : 'rgba(196, 114, 129, 0.3)'}; transition: all 0.2s;">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      modal.style.display = 'flex';
      requestAnimationFrame(() => {
        modal.style.opacity = '1';
        const card = modal.querySelector('div');
        if (card) card.style.transform = 'scale(1)';
      });

      const cleanup = (result) => {
        modal.style.opacity = '0';
        const card = modal.querySelector('div');
        if (card) card.style.transform = 'scale(0.96)';
        setTimeout(() => {
          modal.style.display = 'none';
          document.removeEventListener('keydown', onKeyDown);
          resolve(result);
        }, 200);
      };

      const onKeyDown = (e) => {
        if (e.key === 'Escape') cleanup(false);
      };
      document.addEventListener('keydown', onKeyDown);

      const cancelBtn = modal.querySelector('#admin-confirm-cancel');
      const okBtn = modal.querySelector('#admin-confirm-ok');
      if (cancelBtn) cancelBtn.onclick = () => cleanup(false);
      if (okBtn) okBtn.onclick = () => cleanup(true);
      modal.onclick = (e) => {
        if (e.target === modal) cleanup(false);
      };
    });
  },

  /**
   * Displays an elegant feedback toast notification
   */
  showToast(message, type = 'success') {
    let toast = document.getElementById('admin-shared-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'admin-shared-toast';
      toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem; z-index: 10001;
        padding: 0.85rem 1.25rem; border-radius: 8px; font-size: 0.88rem; font-weight: 500;
        box-shadow: 0 6px 18px rgba(0,0,0,0.22); display: flex; align-items: center; gap: 0.6rem;
        transition: opacity 0.3s ease, transform 0.3s ease; opacity: 0; transform: translateY(10px);
        font-family: 'Poppins', sans-serif;
      `;
      document.body.appendChild(toast);
    }

    if (type === 'danger' || type === 'error') {
      toast.style.background = '#991B1B';
      toast.style.color = '#FFFFFF';
      toast.style.borderLeft = '4px solid #EF4444';
    } else if (type === 'warning') {
      toast.style.background = '#854D0E';
      toast.style.color = '#FFFFFF';
      toast.style.borderLeft = '4px solid #EAB308';
    } else {
      toast.style.background = '#1E293B';
      toast.style.color = '#FFFFFF';
      toast.style.borderLeft = '4px solid #10B981';
    }

    toast.innerHTML = message;
    toast.style.display = 'flex';
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 3500);
  },

  // --------------------------------------------------------------------------
  // PRODUCTS CRUD
  // --------------------------------------------------------------------------
  async getProducts() {
    const deletedIds = JSON.parse(localStorage.getItem('swan_deleted_product_ids') || '[]');
    const archivedIds = JSON.parse(localStorage.getItem('swan_archived_product_ids') || '[]');

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('products')
          .select('*, categories(id, name, slug)')
          .is('archived_at', null)
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data
            .filter(p => !deletedIds.includes(String(p.id)) && !archivedIds.includes(String(p.id)))
            .map(p => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              categoryId: p.category_id,
              categoryName: p.categories?.name || 'Uncategorized',
              price: parseFloat(p.price),
              salePrice: p.sale_price ? parseFloat(p.sale_price) : null,
              materials: p.materials,
              dimensions: p.dimensions,
              colors: p.colors || [],
              stock: p.stock_quantity,
              madeToOrder: p.made_to_order,
              prepTime: p.prep_time,
              isFeatured: p.is_featured,
              isPublished: p.is_published,
              imageUrl: p.image_url || null,
              iconType: p.icon_type || 'flower'
            }));
        }
      } catch (err) {
        console.warn('Supabase getProducts error, falling back to local storage:', err);
      }
    }

    // Demo / LocalStore persistence
    const stored = localStorage.getItem('swan_admin_products');
    let list = [];
    if (stored) {
      try { list = JSON.parse(stored); } catch (e) { list = []; }
    } else {
      list = typeof getDemoProducts === 'function' ? getDemoProducts() : [];
      localStorage.setItem('swan_admin_products', JSON.stringify(list));
    }

    return (list || [])
      .filter(p => 
        !p.archived_at && 
        !deletedIds.includes(String(p.id)) && 
        !deletedIds.includes(String(p.slug || '')) &&
        !archivedIds.includes(String(p.id)) &&
        !archivedIds.includes(String(p.slug || ''))
      )
      .map(p => ({
        ...p,
        isFeatured: p.isFeatured !== undefined ? Boolean(p.isFeatured) : (['prod-001', 'prod-002', 'prod-003', 'prod-004'].includes(String(p.id))),
        isPublished: p.isPublished !== undefined ? Boolean(p.isPublished) : true,
        stock: (p.stock !== undefined && p.stock !== null) ? parseInt(p.stock, 10) : 0
      }));
  },

  async saveProduct(product) {
    // 1. Validation per PRD Section 12
    if (!product.name || !product.name.trim()) throw new Error('Product name is required.');
    if (isNaN(product.price) || product.price < 0) throw new Error('Price must be a non-negative number.');
    if (product.salePrice !== null && (isNaN(product.salePrice) || product.salePrice < 0 || product.salePrice >= product.price)) {
      throw new Error('Sale price must be non-negative and less than the regular price.');
    }
    if (isNaN(product.stock) || product.stock < 0) throw new Error('Stock must be a non-negative integer.');

    const client = getSupabaseClient();
    if (client) {
      try {
        const payload = {
          name: product.name.trim(),
          slug: product.slug.trim(),
          category_id: product.categoryId || null,
          description: product.description || '',
          image_url: product.imageUrl || null,
          price: product.price,
          sale_price: product.salePrice,
          materials: product.materials || '100% Milk Cotton Yarn',
          dimensions: product.dimensions || '',
          colors: Array.isArray(product.colors) ? product.colors : [],
          stock_quantity: parseInt(product.stock, 10),
          made_to_order: Boolean(product.madeToOrder),
          prep_time: product.prepTime || '3-5 business days',
          is_featured: Boolean(product.isFeatured),
          is_published: product.isPublished !== undefined ? Boolean(product.isPublished) : true,
          icon_type: product.iconType || 'flower'
        };

        if (product.id && !String(product.id).startsWith('prod-')) {
          const { error } = await client.from('products').update(payload).eq('id', product.id);
          if (!error) return true;
        } else {
          const { error } = await client.from('products').insert([payload]);
          if (!error) return true;
        }
      } catch (err) {
        console.warn('Supabase saveProduct warning, persisting locally:', err);
      }
    }

    // Local Demo Persistence
    const products = await this.getProducts();
    if (product.id) {
      const idx = products.findIndex(p => String(p.id) === String(product.id));
      if (idx > -1) {
        products[idx] = { ...products[idx], ...product };
      } else {
        products.unshift(product);
      }
    } else {
      product.id = 'prod-' + Date.now();
      products.unshift(product);
    }
    localStorage.setItem('swan_admin_products', JSON.stringify(products));
    return true;
  },

  async toggleFeatured(productId, currentVal) {
    const nextVal = !currentVal;
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('products')
          .update({ is_featured: nextVal })
          .eq('id', productId);
        if (!error) return nextVal;
      } catch (err) {
        console.warn('Supabase toggleFeatured error:', err);
      }
    }

    const products = await this.getProducts();
    const target = products.find(p => String(p.id) === String(productId));
    if (target) {
      target.isFeatured = nextVal;
      localStorage.setItem('swan_admin_products', JSON.stringify(products));
    }
    return nextVal;
  },

  async togglePublished(productId, currentVal) {
    const nextVal = !currentVal;
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('products')
          .update({ is_published: nextVal })
          .eq('id', productId);
        if (!error) return nextVal;
      } catch (err) {
        console.warn('Supabase togglePublished error:', err);
      }
    }

    const products = await this.getProducts();
    const target = products.find(p => String(p.id) === String(productId));
    if (target) {
      target.isPublished = nextVal;
      localStorage.setItem('swan_admin_products', JSON.stringify(products));
    }
    return nextVal;
  },

  async archiveProduct(id) {
    const targetId = String(id);
    const products = await this.getProducts();
    const currentProd = products.find(p => String(p.id) === targetId);
    const targetSlug = currentProd ? String(currentProd.slug) : '';

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('products')
          .update({ archived_at: new Date().toISOString(), is_published: false })
          .eq('id', id);
        if (error) {
          console.warn('Supabase archive warning (falling back to local):', error);
        }
      } catch (err) {
        console.warn('Supabase archive exception (falling back to local):', err);
      }
    }

    // Persistent blacklist of archived IDs & Slugs
    const archivedIds = JSON.parse(localStorage.getItem('swan_archived_product_ids') || '[]');
    if (!archivedIds.includes(targetId)) archivedIds.push(targetId);
    if (targetSlug && !archivedIds.includes(targetSlug)) archivedIds.push(targetSlug);
    localStorage.setItem('swan_archived_product_ids', JSON.stringify(archivedIds));

    // Remove from local active products
    const stored = localStorage.getItem('swan_admin_products');
    let prodList = stored ? JSON.parse(stored) : (typeof getDemoProducts === 'function' ? getDemoProducts() : []);
    const updated = prodList.filter(p => String(p.id) !== targetId && (!targetSlug || String(p.slug) !== targetSlug));
    localStorage.setItem('swan_admin_products', JSON.stringify(updated));

    return true;
  },

  async deleteProduct(id) {
    const targetId = String(id);
    const products = await this.getProducts();
    const currentProd = products.find(p => String(p.id) === targetId);
    const targetSlug = currentProd ? String(currentProd.slug) : '';

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('products').delete().eq('id', id);
        if (error) {
          console.warn('Foreign key or RLS prevented hard delete, attempting archive:', error);
          await this.archiveProduct(id);
        }
      } catch (err) {
        console.warn('Supabase delete exception, falling back to local delete:', err);
      }
    }

    // Persistent blacklist of deleted IDs & Slugs
    const deletedIds = JSON.parse(localStorage.getItem('swan_deleted_product_ids') || '[]');
    if (!deletedIds.includes(targetId)) deletedIds.push(targetId);
    if (targetSlug && !deletedIds.includes(targetSlug)) deletedIds.push(targetSlug);
    localStorage.setItem('swan_deleted_product_ids', JSON.stringify(deletedIds));

    // Remove from local active products
    const stored = localStorage.getItem('swan_admin_products');
    let prodList = stored ? JSON.parse(stored) : (typeof getDemoProducts === 'function' ? getDemoProducts() : []);
    const updated = prodList.filter(p => String(p.id) !== targetId && (!targetSlug || String(p.slug) !== targetSlug));
    localStorage.setItem('swan_admin_products', JSON.stringify(updated));

    return true;
  },

  // --------------------------------------------------------------------------
  // INVENTORY QUICK ACTIONS
  // --------------------------------------------------------------------------
  async updateStock(productId, newStock) {
    const qty = parseInt(newStock, 10);
    if (isNaN(qty) || qty < 0) throw new Error('Stock quantity must be 0 or greater.');

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('products')
          .update({ stock_quantity: qty })
          .eq('id', productId);
        if (!error) return true;
      } catch (err) {
        console.warn('Supabase updateStock error:', err);
      }
    }

    const products = await this.getProducts();
    const target = products.find(p => String(p.id) === String(productId));
    if (target) {
      target.stock = qty;
      localStorage.setItem('swan_admin_products', JSON.stringify(products));
    }
    return true;
  },

  async toggleMadeToOrder(productId, currentVal) {
    const nextVal = !currentVal;
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('products')
          .update({ made_to_order: nextVal })
          .eq('id', productId);
        if (!error) return nextVal;
      } catch (err) {
        console.warn('Supabase toggleMadeToOrder error:', err);
      }
    }

    const products = await this.getProducts();
    const target = products.find(p => String(p.id) === String(productId));
    if (target) {
      target.madeToOrder = nextVal;
      localStorage.setItem('swan_admin_products', JSON.stringify(products));
    }
    return nextVal;
  },

  // --------------------------------------------------------------------------
  // CATEGORIES CRUD
  // --------------------------------------------------------------------------
  async getCategories() {
    const deletedCatIds = JSON.parse(localStorage.getItem('swan_deleted_category_ids') || '[]');

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true });
        if (!error && data) {
          return data.filter(c => !deletedCatIds.includes(String(c.id)));
        }
      } catch (err) {
        console.warn('Supabase getCategories error:', err);
      }
    }

    const stored = localStorage.getItem('swan_admin_categories');
    let cats = [];
    if (stored) {
      try { cats = JSON.parse(stored); } catch (e) { cats = []; }
    } else {
      cats = [
        { id: 'cat-1', name: 'Floral Bouquets', slug: 'bouquets', description: 'Everlasting flowers that never wilt.', icon_emoji: '🌸', sort_order: 1 },
        { id: 'cat-2', name: 'Bags & Totes', slug: 'bags', description: 'Handcrafted granny square bags.', icon_emoji: '👜', sort_order: 2 },
        { id: 'cat-3', name: 'Cute Plushies', slug: 'plushies', description: 'Amigurumi handmade companions.', icon_emoji: '🧸', sort_order: 3 },
        { id: 'cat-4', name: 'Personalized Gifts', slug: 'accessories', description: 'Keychains and bookmarks.', icon_emoji: '🎁', sort_order: 4 }
      ];
      localStorage.setItem('swan_admin_categories', JSON.stringify(cats));
    }
    return (cats || []).filter(c => !deletedCatIds.includes(String(c.id)));
  },

  async saveCategory(cat) {
    if (!cat.name || !cat.name.trim()) throw new Error('Category name is required.');
    if (!cat.slug || !cat.slug.trim()) throw new Error('Category slug is required.');

    const client = getSupabaseClient();
    if (client) {
      try {
        const payload = {
          name: cat.name.trim(),
          slug: cat.slug.trim(),
          description: cat.description || '',
          icon_emoji: cat.icon_emoji || '🧶',
          sort_order: parseInt(cat.sort_order, 10) || 0
        };

        if (cat.id && !String(cat.id).startsWith('cat-')) {
          const { error } = await client.from('categories').update(payload).eq('id', cat.id);
          if (!error) return true;
        } else {
          const { error } = await client.from('categories').insert([payload]);
          if (!error) return true;
        }
      } catch (err) {
        console.warn('Supabase saveCategory error:', err);
      }
    }

    const cats = await this.getCategories();
    if (cat.id) {
      const idx = cats.findIndex(c => String(c.id) === String(cat.id));
      if (idx > -1) cats[idx] = { ...cats[idx], ...cat };
      else cats.push(cat);
    } else {
      cat.id = 'cat-' + Date.now();
      cats.push(cat);
    }
    localStorage.setItem('swan_admin_categories', JSON.stringify(cats));
    return true;
  },

  async deleteCategory(id) {
    const targetId = String(id);
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('categories').delete().eq('id', id);
        if (error) console.warn('Supabase category delete warning:', error);
      } catch (err) {
        console.warn('Supabase category delete warning:', err);
      }
    }

    // Blacklist deleted category ID
    const deletedCatIds = JSON.parse(localStorage.getItem('swan_deleted_category_ids') || '[]');
    if (!deletedCatIds.includes(targetId)) {
      deletedCatIds.push(targetId);
      localStorage.setItem('swan_deleted_category_ids', JSON.stringify(deletedCatIds));
    }

    const stored = localStorage.getItem('swan_admin_categories');
    let cats = stored ? JSON.parse(stored) : await this.getCategories();
    const updated = cats.filter(c => String(c.id) !== targetId);
    localStorage.setItem('swan_admin_categories', JSON.stringify(updated));
    return true;
  }
};
