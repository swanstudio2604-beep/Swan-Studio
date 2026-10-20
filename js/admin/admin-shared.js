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
  // PRODUCTS CRUD (Single Source of Truth Database API)
  // --------------------------------------------------------------------------
  async getProducts({ trash = false } = {}) {
    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    try {
      const res = await fetch(`${baseUrl}/api/admin/products${trash ? '?trash=1' : ''}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('Backend API getProducts error:', err);
    }
    return [];
  },

  async saveProduct(product) {
    if (!product.name || !product.name.trim()) throw new Error('Product name is required.');
    if (isNaN(product.price) || product.price < 0) throw new Error('Price must be a non-negative number.');
    if (product.salePrice !== null && product.salePrice !== undefined && product.salePrice !== '') {
      const saleP = parseFloat(product.salePrice);
      if (isNaN(saleP) || saleP < 0 || saleP >= parseFloat(product.price)) {
        throw new Error('Sale price must be non-negative and less than regular price.');
      }
    }

    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    const isEdit = Boolean(product.id);
    const url = isEdit ? `${baseUrl}/api/admin/products/${encodeURIComponent(product.id)}` : `${baseUrl}/api/admin/products`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(product)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Couldn't save product. Please try again.");
    }
    const json = await res.json();
    return json.data;
  },

  async deleteProduct(id, { permanent = false } = {}) {
    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    const url = `${baseUrl}/api/admin/products/${encodeURIComponent(id)}${permanent ? '?permanent=1' : ''}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Couldn't delete product. Please try again.");
    }
    return data;
  },

  async restoreProduct(id) {
    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    const res = await fetch(`${baseUrl}/api/admin/products/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) throw new Error("Couldn't restore product.");
    return await res.json();
  },

  async bulkProductAction(action, ids, extra = {}) {
    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    const res = await fetch(`${baseUrl}/api/admin/products/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, ids, ...extra })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to execute bulk action.");
    }
    return data;
  },

  async toggleFeatured(productId, currentVal) {
    const nextVal = !currentVal;
    await this.saveProduct({ id: productId, isFeatured: nextVal });
    return nextVal;
  },

  async togglePublished(productId, currentVal) {
    const nextVal = !currentVal;
    await this.saveProduct({ id: productId, isPublished: nextVal });
    return nextVal;
  },

  async toggleHideProduct(productId, isHidden) {
    return await this.saveProduct({ id: productId, isHidden: Boolean(isHidden) });
  },

  // --------------------------------------------------------------------------
  // INVENTORY QUICK ACTIONS
  // --------------------------------------------------------------------------
  async updateStock(productId, newStock) {
    const qty = parseInt(newStock, 10);
    if (isNaN(qty) || qty < 0) throw new Error('Stock quantity must be 0 or greater.');
    return await this.saveProduct({ id: productId, stock: qty });
  },

  async toggleMadeToOrder(productId, currentVal) {
    const nextVal = !currentVal;
    return await this.saveProduct({ id: productId, madeToOrder: nextVal });
  },

  // --------------------------------------------------------------------------
  // CATEGORIES CRUD (Single Source of Truth Database API)
  // --------------------------------------------------------------------------
  async getCategories({ trash = false } = {}) {
    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    try {
      const res = await fetch(`${baseUrl}/api/admin/categories${trash ? '?trash=1' : ''}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn('Backend API getCategories error:', err);
    }
    return [];
  },

  async saveCategory(cat) {
    if (!cat.name || !cat.name.trim()) throw new Error('Category name is required.');
    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    const isEdit = Boolean(cat.id);
    const url = isEdit ? `${baseUrl}/api/admin/categories/${encodeURIComponent(cat.id)}` : `${baseUrl}/api/admin/categories`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(cat)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "Couldn't save collection. Please try again.");
    }
    const json = await res.json();
    return json.data;
  },

  async deleteCategory(id, { permanent = false, moveToCategoryId = null, deleteProducts = false } = {}) {
    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    const params = new URLSearchParams();
    if (permanent) params.set('permanent', '1');
    if (moveToCategoryId) params.set('move_to', moveToCategoryId);
    if (deleteProducts) params.set('delete_products', '1');

    const res = await fetch(`${baseUrl}/api/admin/categories/${encodeURIComponent(id)}?${params.toString()}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ moveToCategoryId, deleteProducts })
    });

    const data = await res.json().catch(() => ({}));
    if (res.status === 409) {
      return { success: false, requiresResolution: true, productCount: data.productCount, message: data.message };
    }
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Couldn't delete collection. Please try again.");
    }
    return data;
  },

  async restoreCategory(id) {
    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    const res = await fetch(`${baseUrl}/api/admin/categories/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) throw new Error("Couldn't restore collection.");
    return await res.json();
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

  async compressAndUploadImage(file, { maxWidth = 1600, maxHeight = 1600, quality = 0.85, altText = '' } = {}) {
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

    const baseUrl = typeof SWAN_API !== 'undefined' ? SWAN_API.getBaseUrl() : '';
    const res = await fetch(`${baseUrl}/api/admin/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': this.activeProfile?.token || ''
      },
      credentials: 'include',
      body: JSON.stringify({
        dataUrl: comp.dataUrl,
        filename: comp.name,
        altText
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Upload failed (HTTP ${res.status})`);
    }

    const json = await res.json();
    return {
      ...json,
      width: comp.width,
      height: comp.height
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
