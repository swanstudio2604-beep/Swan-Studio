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
      { key: 'reviews', label: '💌 Customer Reviews', href: 'reviews.html' },
      { key: 'customers', label: '👥 Customers', href: 'customers.html' },
      { key: 'content', label: '📝 Website Content', href: 'content.html' },
      { key: 'blog', label: '📰 Blog Stories', href: 'blog.html' },
      { key: 'settings', label: '⚙️ Store Settings', href: 'settings.html' }
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
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <button type="button" id="admin-mobile-help-btn" class="btn btn-secondary btn-sm" style="padding: 0.35rem 0.6rem; font-size: 0.78rem; min-height: 38px;" title="Screen Help">
            💡 Help
          </button>
          <a href="../index.html" class="admin-mobile-store-link" title="Visit Public Storefront" target="_blank">🛍️ Store</a>
        </div>
      </header>

      <!-- Drawer Backdrop for mobile -->
      <div id="admin-mobile-overlay" class="admin-mobile-overlay"></div>

      <!-- Main Navigation Sidebar (Desktop & Mobile Drawer) -->
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="admin-sidebar-header-row">
          <div class="admin-sidebar-brand" style="margin-bottom: 0; padding-bottom: 0.85rem;">
            <h2 class="admin-sidebar-title">Swan Studio</h2>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.35rem;">
              <span class="admin-sidebar-badge">👑 Admin Atelier</span>
              <button type="button" id="admin-sidebar-help-btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #FFF; font-size: 0.75rem; border-radius: 999px; padding: 0.2rem 0.55rem; cursor: pointer;">
                💡 Screen Guide
              </button>
            </div>
          </div>
          <button id="admin-sidebar-close-btn" class="admin-sidebar-close" type="button" aria-label="Close navigation menu">✕</button>
        </div>

        <nav aria-label="Admin Navigation" style="margin-top: 0.5rem; flex: 1;">
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
          <button id="admin-logout-btn" style="color: #E8B7C0; background: none; border: 1px solid rgba(232, 183, 192, 0.4); padding: 0.5rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.82rem; cursor: pointer; width: 100%; text-align: center; min-height: 44px;">
            🚪 Log Out
          </button>
        </div>
      </aside>

      <!-- Sticky Mobile Bottom Tab Bar (Thumb-Reachable on phones <= 900px) -->
      <nav class="admin-bottom-tabbar" aria-label="Mobile Navigation">
        <a href="index.html" class="admin-tabbar-item ${activeKey === 'overview' ? 'active' : ''}">
          <span class="tab-icon">📊</span>
          <span class="tab-label">Overview</span>
        </a>
        <a href="orders.html" class="admin-tabbar-item ${activeKey === 'orders' ? 'active' : ''}">
          <span class="tab-icon">🛒</span>
          <span class="tab-label">Orders</span>
        </a>
        <a href="products.html" class="admin-tabbar-item ${activeKey === 'products' ? 'active' : ''}">
          <span class="tab-icon">🧶</span>
          <span class="tab-label">Products</span>
        </a>
        <a href="custom-orders.html" class="admin-tabbar-item ${activeKey === 'custom-orders' ? 'active' : ''}">
          <span class="tab-icon">✨</span>
          <span class="tab-label">Custom</span>
        </a>
        <button type="button" class="admin-tabbar-item" id="admin-tabbar-more-btn" aria-label="Open full menu">
          <span class="tab-icon">☰</span>
          <span class="tab-label">More</span>
        </button>
      </nav>
    `;

    // Mobile Drawer Logic
    const toggleBtn = document.getElementById('admin-mobile-menu-toggle');
    const tabbarMoreBtn = document.getElementById('admin-tabbar-more-btn');
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
    if (tabbarMoreBtn) tabbarMoreBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);

    // Close drawer when clicking a link
    mount.querySelectorAll('.admin-nav-link').forEach(link => {
      link.addEventListener('click', closeDrawer);
    });

    document.getElementById('admin-logout-btn').addEventListener('click', async () => {
      await AUTH.signOut();
    });

    // Wire In-App Help Buttons
    const openHelp = () => this.showHelpModal(activeKey);
    const mHelp = document.getElementById('admin-mobile-help-btn');
    const sHelp = document.getElementById('admin-sidebar-help-btn');
    if (mHelp) mHelp.addEventListener('click', openHelp);
    if (sHelp) sHelp.addEventListener('click', openHelp);
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
   * Alias for confirmDialog supporting onConfirm callback or Promise
   */
  confirm(options) {
    if (typeof options.onConfirm === 'function') {
      return this.confirmDialog(options).then(confirmed => {
        if (confirmed) options.onConfirm();
        return confirmed;
      });
    }
    return this.confirmDialog(options);
  },

  /**
   * Displays an elegant feedback toast notification with optional 10-second Undo button
   */
  showToast(message, type = 'success', { undoCallback = null, duration = 4000 } = {}) {
    let toast = document.getElementById('admin-shared-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'admin-shared-toast';
      toast.style.cssText = `
        position: fixed; bottom: calc(2rem + env(safe-area-inset-bottom, 0px)); right: 1.5rem; z-index: 10001;
        max-width: 90vw; padding: 0.85rem 1.25rem; border-radius: 8px; font-size: 0.88rem; font-weight: 500;
        box-shadow: 0 6px 18px rgba(0,0,0,0.22); display: flex; align-items: center; justify-content: space-between; gap: 0.85rem;
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

    toast.innerHTML = `
      <span style="display: flex; align-items: center; gap: 0.5rem;">${message}</span>
      ${undoCallback ? `<button id="admin-toast-undo-btn" type="button" style="background: #FFFFFF; color: #1E293B; border: none; padding: 0.4rem 0.85rem; border-radius: 6px; font-weight: 600; font-size: 0.82rem; cursor: pointer; min-height: 44px; display: inline-flex; align-items: center; gap: 0.3rem;">↩️ Undo</button>` : ''}
    `;

    if (undoCallback) {
      const undoBtn = toast.querySelector('#admin-toast-undo-btn');
      if (undoBtn) {
        undoBtn.onclick = () => {
          clearTimeout(this._toastTimeout);
          toast.style.opacity = '0';
          setTimeout(() => { toast.style.display = 'none'; }, 200);
          undoCallback();
        };
      }
    }

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
    }, undoCallback ? 10000 : duration);
  },

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // PRODUCTS CRUD (Single Source of Truth Database API: Supabase PostgreSQL)
  // --------------------------------------------------------------------------
  async getProducts({ trash = false } = {}) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) {
      console.warn('Supabase client not initialized in getProducts');
      return [];
    }

    try {
      let query = client
        .from('products')
        .select(`
          *,
          categories:category_id (
            id,
            name,
            slug
          )
        `)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (trash) {
        query = query.not('archived_at', 'is', null);
      } else {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Supabase getProducts error:', error.message);
        return [];
      }

      return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        categoryId: p.category_id,
        category: p.categories?.slug || p.category_id,
        categoryName: p.categories?.name || 'Handmade',
        price: parseFloat(p.price) || 0,
        salePrice: p.sale_price !== null && p.sale_price !== undefined ? parseFloat(p.sale_price) : null,
        description: p.description || '',
        materials: p.materials || '',
        dimensions: p.dimensions || '',
        colors: Array.isArray(p.colors) ? p.colors : [],
        tags: Array.isArray(p.variants) ? p.variants : [],
        stock: p.stock_quantity ?? 0,
        imageUrl: p.image_url || '',
        image: p.image_url || '',
        isFeatured: Boolean(p.is_featured),
        isPublished: Boolean(p.is_published),
        isHidden: Boolean(p.is_hidden),
        madeToOrder: Boolean(p.made_to_order),
        prepTime: p.prep_time || '',
        sortOrder: p.sort_order || 0,
        archivedAt: p.archived_at,
        deletedAt: p.deleted_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
    } catch (err) {
      console.error('getProducts exception:', err);
      return [];
    }
  },

  async saveProduct(product) {
    if (!product.name || !product.name.trim()) throw new Error('Product name is required.');
    if (isNaN(product.price) || parseFloat(product.price) < 0) throw new Error('Price must be a non-negative number.');
    if (product.salePrice !== null && product.salePrice !== undefined && product.salePrice !== '') {
      const saleP = parseFloat(product.salePrice);
      if (isNaN(saleP) || saleP < 0 || saleP >= parseFloat(product.price)) {
        throw new Error('Sale price must be non-negative and less than regular price.');
      }
    }

    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Supabase client is not connected.');

    // Ensure valid slug
    const cleanSlug = product.slug || product.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Resolve category_id
    let resolvedCategoryId = product.categoryId;
    if (!resolvedCategoryId && product.category) {
      const { data: cat } = await client.from('categories').select('id').eq('slug', product.category).maybeSingle();
      if (cat) resolvedCategoryId = cat.id;
    }
    if (!resolvedCategoryId) {
      // Pick first existing category
      const { data: firstCat } = await client.from('categories').select('id').order('sort_order', { ascending: true }).limit(1).maybeSingle();
      if (firstCat) resolvedCategoryId = firstCat.id;
    }
    if (!resolvedCategoryId) {
      throw new Error('Please select a valid collection/category for this creation.');
    }

    const record = {
      name: product.name.trim(),
      slug: cleanSlug,
      category_id: resolvedCategoryId,
      price: parseFloat(product.price),
      sale_price: (product.salePrice !== null && product.salePrice !== undefined && product.salePrice !== '') ? parseFloat(product.salePrice) : null,
      description: product.description || '',
      materials: product.materials || '',
      dimensions: product.dimensions || '',
      colors: Array.isArray(product.colors) ? product.colors : [],
      variants: Array.isArray(product.tags) ? product.tags : (Array.isArray(product.variants) ? product.variants : []),
      image_url: product.imageUrl || product.image || null,
      stock_quantity: parseInt(product.stock ?? product.stock_quantity ?? 0, 10),
      is_featured: Boolean(product.isFeatured ?? product.is_featured ?? false),
      is_published: product.isPublished !== undefined ? Boolean(product.isPublished) : (product.is_published !== undefined ? Boolean(product.is_published) : true),
      is_hidden: Boolean(product.isHidden ?? product.is_hidden ?? false),
      made_to_order: Boolean(product.madeToOrder ?? product.made_to_order ?? false),
      prep_time: product.prepTime || product.prep_time || ''
    };

    if (product.sortOrder !== undefined) record.sort_order = parseInt(product.sortOrder, 10);

    if (product.id) {
      const { data, error } = await client
        .from('products')
        .update(record)
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw new Error(error.message || "Couldn't update product.");
      return data;
    } else {
      const { data, error } = await client
        .from('products')
        .insert([record])
        .select()
        .single();

      if (error) throw new Error(error.message || "Couldn't insert product.");
      return data;
    }
  },

  async deleteProduct(id, { permanent = false } = {}) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Supabase client is not connected.');

    if (permanent) {
      const { error } = await client.from('products').delete().eq('id', id);
      if (error) throw new Error(error.message || "Couldn't permanently delete product.");
      return { success: true };
    } else {
      const { error } = await client
        .from('products')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message || "Couldn't archive product.");
      return { success: true };
    }
  },

  async restoreProduct(id) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Supabase client is not connected.');

    const { error } = await client
      .from('products')
      .update({ archived_at: null, deleted_at: null })
      .eq('id', id);

    if (error) throw new Error(error.message || "Couldn't restore product.");
    return { success: true };
  },

  async bulkProductAction(action, ids, extra = {}) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Supabase client is not connected.');
    if (!Array.isArray(ids) || ids.length === 0) return { success: true };

    let updatePayload = {};
    if (action === 'publish') updatePayload = { is_published: true, is_hidden: false };
    else if (action === 'unpublish') updatePayload = { is_published: false };
    else if (action === 'hide') updatePayload = { is_hidden: true };
    else if (action === 'show') updatePayload = { is_hidden: false };
    else if (action === 'feature') updatePayload = { is_featured: true };
    else if (action === 'unfeature') updatePayload = { is_featured: false };
    else if (action === 'trash') updatePayload = { archived_at: new Date().toISOString() };
    else if (action === 'restore') updatePayload = { archived_at: null, deleted_at: null };
    else if (action === 'delete_permanent') {
      const { error } = await client.from('products').delete().in('id', ids);
      if (error) throw new Error(error.message);
      return { success: true };
    }

    const { error } = await client.from('products').update(updatePayload).in('id', ids);
    if (error) throw new Error(error.message || 'Failed bulk action.');
    return { success: true };
  },

  async toggleFeatured(productId, currentVal) {
    const nextVal = !currentVal;
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) return nextVal;
    await client.from('products').update({ is_featured: nextVal }).eq('id', productId);
    return nextVal;
  },

  async togglePublished(productId, currentVal) {
    const nextVal = !currentVal;
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) return nextVal;
    await client.from('products').update({ is_published: nextVal }).eq('id', productId);
    return nextVal;
  },

  async toggleHideProduct(productId, isHidden) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) return isHidden;
    await client.from('products').update({ is_hidden: Boolean(isHidden) }).eq('id', productId);
    return Boolean(isHidden);
  },

  // --------------------------------------------------------------------------
  // INVENTORY QUICK ACTIONS
  // --------------------------------------------------------------------------
  async updateStock(productId, newStock) {
    const qty = parseInt(newStock, 10);
    if (isNaN(qty) || qty < 0) throw new Error('Stock quantity must be 0 or greater.');
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Database not connected');
    const { data, error } = await client.from('products').update({ stock_quantity: qty }).eq('id', productId).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async toggleMadeToOrder(productId, currentVal) {
    const nextVal = !currentVal;
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) return nextVal;
    await client.from('products').update({ made_to_order: nextVal }).eq('id', productId);
    return nextVal;
  },

  // --------------------------------------------------------------------------
  // CATEGORIES CRUD (Single Source of Truth Database API: Supabase PostgreSQL)
  // --------------------------------------------------------------------------
  async getCategories({ trash = false } = {}) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) {
      console.warn('Supabase client not initialized in getCategories');
      return [];
    }

    try {
      let query = client
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (trash) {
        query = query.not('deleted_at', 'is', null);
      } else {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('getCategories error:', error.message);
        return [];
      }

      return (data || []).map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        icon: c.icon_emoji || '🌸',
        iconEmoji: c.icon_emoji || '🌸',
        image: c.image_url || '',
        imageUrl: c.image_url || '',
        sortOrder: c.sort_order || 0,
        isHidden: Boolean(c.is_hidden),
        deletedAt: c.deleted_at,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      }));
    } catch (err) {
      console.error('getCategories exception:', err);
      return [];
    }
  },

  async saveCategory(cat) {
    if (!cat.name || !cat.name.trim()) throw new Error('Category name is required.');
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Supabase client is not connected.');

    const cleanSlug = cat.slug || cat.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const record = {
      name: cat.name.trim(),
      slug: cleanSlug,
      description: cat.description || '',
      icon_emoji: cat.icon || cat.iconEmoji || cat.icon_emoji || '🌸',
      image_url: cat.image || cat.imageUrl || null,
      sort_order: parseInt(cat.sortOrder ?? cat.sort_order ?? 0, 10),
      is_hidden: Boolean(cat.isHidden ?? cat.is_hidden ?? false)
    };

    if (cat.id) {
      const { data, error } = await client
        .from('categories')
        .update(record)
        .eq('id', cat.id)
        .select()
        .single();

      if (error) throw new Error(error.message || "Couldn't update collection.");
      return data;
    } else {
      const { data, error } = await client
        .from('categories')
        .insert([record])
        .select()
        .single();

      if (error) throw new Error(error.message || "Couldn't insert collection.");
      return data;
    }
  },

  async deleteCategory(id, { permanent = false, moveToCategoryId = null, deleteProducts = false } = {}) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Supabase client is not connected.');

    // Check if category has active products to respect ON DELETE RESTRICT
    const { count, error: countErr } = await client
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .is('archived_at', null);

    if (count && count > 0) {
      if (moveToCategoryId) {
        const { error: moveErr } = await client
          .from('products')
          .update({ category_id: moveToCategoryId })
          .eq('category_id', id);
        if (moveErr) throw new Error('Failed to move creations: ' + moveErr.message);
      } else if (deleteProducts) {
        const { error: archiveErr } = await client
          .from('products')
          .update({ archived_at: new Date().toISOString() })
          .eq('category_id', id);
        if (archiveErr) throw new Error('Failed to archive creations: ' + archiveErr.message);
      } else {
        return {
          success: false,
          requiresResolution: true,
          productCount: count,
          message: `This collection contains ${count} active creation(s). Please select an action to move or archive them.`
        };
      }
    }

    if (permanent) {
      const { error } = await client.from('categories').delete().eq('id', id);
      if (error) throw new Error(error.message || "Couldn't delete collection.");
    } else {
      const { error } = await client
        .from('categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(error.message || "Couldn't delete collection.");
    }
    return { success: true };
  },

  async restoreCategory(id) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Supabase client is not connected.');

    const { error } = await client
      .from('categories')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw new Error(error.message || "Couldn't restore collection.");
    return { success: true };
  },

  // --------------------------------------------------------------------------
  // ORDERS CRUD (Single Source of Truth Database API: Supabase PostgreSQL)
  // --------------------------------------------------------------------------
  async getOrders() {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_email,
          customer_phone,
          shipping_address,
          subtotal,
          discount_amount,
          shipping_fee,
          total_amount,
          coupon_code,
          payment_status,
          order_status,
          utr_number,
          tracking_number,
          admin_notes,
          customer_notes,
          created_at,
          order_items (
            id,
            product_name,
            unit_price,
            quantity,
            total_price,
            product_image
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('getOrders error:', error.message);
        return [];
      }

      return (data || []).map(o => {
        let addrStr = '';
        if (typeof o.shipping_address === 'string') {
          addrStr = o.shipping_address;
        } else if (o.shipping_address && typeof o.shipping_address === 'object') {
          addrStr = [
            o.shipping_address.street || o.shipping_address.address || '',
            o.shipping_address.city || '',
            o.shipping_address.state || '',
            o.shipping_address.pincode || o.shipping_address.zip || ''
          ].filter(Boolean).join(', ');
        }

        return {
          id: o.id,
          orderId: o.order_number || o.id,
          orderNumber: o.order_number,
          customerName: o.customer_name,
          customerEmail: o.customer_email,
          customerPhone: o.customer_phone,
          shippingAddress: addrStr,
          rawAddress: o.shipping_address,
          subtotal: parseFloat(o.subtotal || 0),
          discountAmount: parseFloat(o.discount_amount || 0),
          shippingFee: parseFloat(o.shipping_fee || 0),
          totalAmount: parseFloat(o.total_amount || 0),
          couponCode: o.coupon_code,
          paymentStatus: o.payment_status,
          status: o.order_status,
          utr: o.utr_number,
          trackingNumber: o.tracking_number,
          adminNotes: o.admin_notes,
          customerNotes: o.customer_notes,
          createdAt: o.created_at,
          items: (o.order_items || []).map(i => ({
            id: i.id,
            name: i.product_name,
            price: parseFloat(i.unit_price),
            quantity: i.quantity,
            total: parseFloat(i.total_price),
            image: i.product_image
          }))
        };
      });
    } catch (err) {
      console.error('getOrders exception:', err);
      return [];
    }
  },

  async updateOrderStatus(orderId, nextStatus, { trackingNumber = null, adminNotes = null } = {}) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Database not connected');

    const updates = { order_status: nextStatus };
    if (trackingNumber !== null) updates.tracking_number = trackingNumber;
    if (adminNotes !== null) updates.admin_notes = adminNotes;

    const { data, error } = await client
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Audit log insertion
    await client.from('order_status_history').insert([{
      order_id: orderId,
      old_status: 'PREVIOUS',
      new_status: nextStatus,
      notes: adminNotes || `Status updated to ${nextStatus}`
    }]).catch(() => {});

    return data;
  },

  async updatePaymentStatus(orderId, paymentStatus, { utr = null } = {}) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Database not connected');

    const updates = { payment_status: paymentStatus };
    if (utr !== null) updates.utr_number = utr;

    const { data, error } = await client
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // --------------------------------------------------------------------------
  // CLIENT-SIDE IMAGE COMPRESSION (For 5-10MB Phone Camera Photos)
  // --------------------------------------------------------------------------
  async compressImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = {}) {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Please select a valid photo file (JPG, PNG, or WebP).');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to decode image data.'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG/WebP
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const compressedBytes = Math.round((dataUrl.length - 22) * 0.75);

          resolve({
            dataUrl,
            width,
            height,
            name: file.name,
            originalSize: file.size,
            compressedSize: compressedBytes,
            ratio: Math.round((1 - compressedBytes / file.size) * 100)
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  async compressAndUploadImage(file, { maxWidth = 1600, maxHeight = 1600, quality = 0.85, altText = '', folder = 'catalog' } = {}) {
    let processedFile = file;
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    if (isHeic && window.heic2any) {
      try {
        const convertedBlob = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        processedFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
      } catch (heicErr) {
        console.warn('HEIC conversion fallback:', heicErr);
      }
    }

    const comp = await this.compressImage(processedFile, { maxWidth, maxHeight, quality });

    // Upload to Supabase Storage Bucket 'images'
    try {
      const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
      if (client) {
        const res = await fetch(comp.dataUrl);
        const blob = await res.blob();
        const cleanName = (comp.name || 'photo.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
        const uploadFile = new File([blob], cleanName, { type: 'image/jpeg' });

        if (typeof uploadImageToBucket === 'function') {
          const publicUrl = await uploadImageToBucket(uploadFile, folder);
          return {
            url: publicUrl,
            publicUrl: publicUrl,
            dataUrl: comp.dataUrl,
            width: comp.width,
            height: comp.height,
            size: comp.compressedSize
          };
        }
      }
    } catch (uploadErr) {
      console.warn('Supabase storage upload error:', uploadErr);
      throw new Error('Image upload failed: ' + uploadErr.message);
    }

    return {
      url: comp.dataUrl,
      publicUrl: comp.dataUrl,
      dataUrl: comp.dataUrl,
      width: comp.width,
      height: comp.height,
      size: comp.compressedSize
    };
  },

  // --------------------------------------------------------------------------
  // ORDER CSV EXPORT (Excel / Spreadsheet Compatible)
  // --------------------------------------------------------------------------
  exportOrdersCSV(orders) {
    if (!orders || orders.length === 0) {
      this.showToast('No orders available to export.', 'warning');
      return;
    }

    const headers = ['Order Ref', 'Date', 'Customer Name', 'Phone', 'Email', 'Shipping Address', 'Items Summary', 'Total Amount (₹)', 'Payment Status', 'Fulfillment Stage', 'UPI UTR', 'Courier', 'Tracking Number', 'Notes'];

    const rows = orders.map(o => {
      const itemsText = (o.items || []).map(i => `${i.quantity}x ${i.name}`).join('; ');
      const dateText = o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '';
      return [
        o.orderId || '',
        dateText,
        o.customerName || '',
        o.customerPhone || '',
        o.customerEmail || '',
        o.shippingAddress || '',
        itemsText,
        o.totalAmount || 0,
        o.paymentStatus || '',
        o.status || '',
        o.utr || '',
        o.courier || '',
        o.trackingNumber || '',
        o.notes || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `swan-studio-orders-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast('✓ Orders exported to CSV spreadsheet!');
  },

  // --------------------------------------------------------------------------
  // IN-APP SCREEN HELP MODAL (Plain Language Guide for Bhumika)
  // --------------------------------------------------------------------------
  showHelpModal(screenKey) {
    let modal = document.getElementById('admin-help-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'admin-help-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 520px;">
          <div class="modal-header">
            <h2 id="help-modal-title" style="font-size: 1.35rem; color: var(--cocoa); display: flex; align-items: center; gap: 0.5rem;">
              <span>💡</span> <span id="help-title-text">Screen Guide</span>
            </h2>
            <button class="modal-close-btn" id="help-modal-close">&times;</button>
          </div>
          <div id="help-modal-body" style="font-size: 0.9rem; color: var(--cocoa); line-height: 1.6; padding: 0.5rem 0 1rem;">
            <!-- Injected dynamically -->
          </div>
          <div style="display: flex; justify-content: flex-end; padding-top: 0.75rem; border-top: 1px solid var(--admin-border);">
            <button type="button" class="btn btn-primary btn-sm" id="help-modal-done" style="min-height: 44px; padding: 0.5rem 1.25rem;">
              Got it, thanks!
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeModal = () => { modal.style.display = 'none'; };
      document.getElementById('help-modal-close').addEventListener('click', closeModal);
      document.getElementById('help-modal-done').addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    const helpContents = {
      overview: {
        title: 'Atelier Overview Guide',
        html: `
          <p><strong>Welcome, Bhumika!</strong> Here is how to check your shop at a glance:</p>
          <ul style="padding-left: 1.25rem; margin-top: 0.5rem;">
            <li><strong>Verified Revenue:</strong> Shows total money received from verified paid orders.</li>
            <li><strong>Awaiting Verification:</strong> Shows customers who paid via UPI and entered their UTR number. Tap to verify.</li>
            <li><strong>Awaiting Processing:</strong> Confirmed orders ready for you to crochet loop-by-loop.</li>
            <li><strong>Low Stock:</strong> Warns you when an item has 2 or fewer units left in inventory.</li>
          </ul>
        `
      },
      products: {
        title: 'Creations & Products Guide',
        html: `
          <p><strong>Managing your catalog on mobile:</strong></p>
          <ul style="padding-left: 1.25rem; margin-top: 0.5rem;">
            <li><strong>Adding Photos:</strong> Take photos straight from your phone camera or gallery! Swan Studio automatically compresses large 5–10MB phone pictures so your pages load fast for buyers.</li>
            <li><strong>Stock & Sold Out:</strong> Tap "Sold Out" to mark out of stock instantly. Or adjust stock (+/-) right on each card.</li>
            <li><strong>Hide/Publish:</strong> Toggle "Published" to hide an unfinished draft from public view.</li>
          </ul>
        `
      },
      orders: {
        title: 'Customer Orders Guide',
        html: `
          <p><strong>Fulfilling orders loop-by-loop:</strong></p>
          <ul style="padding-left: 1.25rem; margin-top: 0.5rem;">
            <li><strong>Fulfillment Stages:</strong> Update status from Pending &rarr; Confirmed &rarr; Preparing (crocheting) &rarr; Dispatched (with tracking) &rarr; Delivered.</li>
            <li><strong>1-Tap WhatsApp:</strong> Tap "💬 WhatsApp" to open WhatsApp with a ready message containing their tracking number!</li>
            <li><strong>Export CSV:</strong> Tap "📥 Export CSV" to download an Excel-friendly list of orders for courier booking.</li>
          </ul>
        `
      },
      'custom-orders': {
        title: 'Custom Commissions Guide',
        html: `
          <p><strong>Handling custom crochet requests:</strong></p>
          <ul style="padding-left: 1.25rem; margin-top: 0.5rem;">
            <li>Review the customer's idea, reference images, desired colors, and deadline.</li>
            <li>Update the stage to "Quoted" and enter your quoted price in ₹.</li>
            <li>Tap "💬 WhatsApp" to share the quote directly with the customer.</li>
          </ul>
        `
      },
      inventory: {
        title: 'Quick Inventory Guide',
        html: `
          <p>Tap <strong>+</strong> or <strong>-</strong> next to any creation to quickly increment or decrement your available stock. Tap "Mark Sold Out" if you run out of yarn.</p>
        `
      },
      reviews: {
        title: 'Customer Reviews Guide',
        html: `
          <p><strong>Keeping your store authentic:</strong></p>
          <ul style="padding-left: 1.25rem; margin-top: 0.5rem;">
            <li>New customer reviews appear under <strong>⏳ Pending</strong>.</li>
            <li>Tap <strong>✓ Approve & Publish</strong> to make a genuine review live on your public store.</li>
            <li>Tap <strong>🚫 Hide</strong> if you want to take a review down.</li>
          </ul>
        `
      },
      customers: {
        title: 'Customer Directory Guide',
        html: `
          <p>Your directory of gift buyers across India. Tap <strong>💬 WhatsApp</strong> or <strong>📞 Call</strong> to speak directly with the customer, or <strong>View Orders</strong> to see their full purchase history.</p>
        `
      },
      settings: {
        title: 'Store Settings Guide',
        html: `
          <p>Update your primary UPI ID (e.g. <code>9509966512@fam</code>), WhatsApp number, delivery fees, and change your administrator password securely.</p>
        `
      }
    };

    const info = helpContents[screenKey] || {
      title: 'Admin Atelier Guide',
      html: '<p>Manage your handmade crochet studio smoothly from your phone.</p>'
    };

    document.getElementById('help-title-text').textContent = info.title;
    document.getElementById('help-modal-body').innerHTML = info.html;
    modal.style.display = 'flex';
  }
};
