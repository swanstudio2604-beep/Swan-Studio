/**
 * SWAN STUDIO — Main JavaScript
 * Brand: Swan Studio | Founder: Bhumika Nama
 * Tagline: Every Stitch Tells a Story.
 * Developer Credit: Developed with ❤️ by Mridul
 */

// ---------------------------------------------------------------------------
// 1. Global Site Configuration
// ---------------------------------------------------------------------------
const SITE = {
  name: 'Swan Studio',
  tagline: 'Every Stitch Tells a Story.',
  founder: 'Bhumika Nama',
  whatsapp: '9509966512',
  whatsappUrl: 'https://wa.me/919509966512',
  upiId: '9509966512@fam',
  email: 'swanstudio2604@gmail.com', // Official atelier support email
  announcement: 'Handcrafted with love in India • Custom crochet creations & personalized gifts',
  social: {
    instagram: 'https://www.instagram.com/swan_handcrafted_studio.3568',
    instagramHandle: '@swan_handcrafted_studio.3568',
    youtube: ''
  }
};

// ---------------------------------------------------------------------------
// 2. Untrusted LocalStorage Helper: Cart Count
// ---------------------------------------------------------------------------
function getSafeCartCount() {
  try {
    const rawCart = localStorage.getItem('swan_cart');
    if (!rawCart) return 0;
    const parsed = JSON.parse(rawCart);
    if (!Array.isArray(parsed)) return 0;

    return parsed.reduce((total, item) => {
      const qty = parseInt(item?.quantity, 10);
      return total + (Number.isFinite(qty) && qty > 0 ? qty : 0);
    }, 0);
  } catch (err) {
    // Treat corrupt or tampered storage gracefully
    console.warn('Unable to parse cart count from localStorage:', err);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// 3. Header & Announcement Bar Injection
// ---------------------------------------------------------------------------
function renderHeader() {
  const headerContainer = document.getElementById('site-header');
  if (!headerContainer) return;

  // Apply custom content from memory or local cache
  try {
    const liveContent = window.SWAN_CONTENT || JSON.parse(localStorage.getItem('swan_site_content') || 'null');
    if (liveContent) {
      if (liveContent.announcement) SITE.announcement = liveContent.announcement;
    }
    const liveSettings = window.SWAN_SETTINGS || JSON.parse(localStorage.getItem('swan_site_settings') || 'null');
    if (liveSettings) {
      if (liveSettings.whatsapp) {
        SITE.whatsapp = liveSettings.whatsapp;
        SITE.whatsappUrl = `https://wa.me/91${liveSettings.whatsapp.replace(/[^0-9]/g, '')}`;
      }
      if (liveSettings.upiId) SITE.upiId = liveSettings.upiId;
      if (liveSettings.email) SITE.email = liveSettings.email;
      if (liveSettings.instagram) SITE.social.instagram = liveSettings.instagram.split('?')[0];
    }
  } catch (e) {}

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const cartCount = getSafeCartCount();

  const isCurrent = (page) => currentPath === page ? 'active' : '';

  headerContainer.innerHTML = `
    <!-- Announcement Bar -->
    <div class="announcement-bar" role="region" aria-label="Store announcement">
      <div class="container">
        <span>${SITE.announcement}</span>
      </div>
    </div>

    <!-- Navigation Bar -->
    <header class="site-header" id="navbar">
      <div class="container header-inner">
        <!-- Brand Wordmark -->
        <a href="index.html" class="brand-link" aria-label="Swan Studio Homepage">
          <span class="brand-title">${SITE.name}</span>
          <span class="brand-tagline-micro">Crochet Atelier</span>
        </a>

        <!-- Main Navigation Links -->
        <nav aria-label="Main Navigation">
          <ul class="nav-menu" id="primary-nav">
            <li><a href="index.html" class="nav-link ${isCurrent('index.html')}">Home</a></li>
            <li><a href="shop.html" class="nav-link ${isCurrent('shop.html')}">Shop</a></li>
            <li><a href="shop.html#collections" class="nav-link">Collections</a></li>
            <li><a href="blog.html" class="nav-link ${isCurrent('blog.html') || isCurrent('blog-post.html')}">Stories</a></li>
            <li><a href="about.html" class="nav-link ${isCurrent('about.html')}">Our Story</a></li>
            <li><a href="reviews.html" class="nav-link ${isCurrent('reviews.html')}">Reviews</a></li>
            <li><a href="custom-order.html" class="nav-link ${isCurrent('custom-order.html')}">Custom Orders</a></li>
            <li><a href="contact.html" class="nav-link ${isCurrent('contact.html')}">Contact</a></li>
          </ul>
        </nav>

        <!-- Header Actions: Account & Cart Bag -->
        <div class="header-actions">
          <a href="account.html" class="nav-link ${isCurrent('account.html')}" aria-label="Account / Sign In" title="Account">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </a>

          <a href="cart.html" class="bag-btn" aria-label="View Shopping Bag" id="bag-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <span>Bag</span>
            <span class="bag-count" id="bag-count" aria-label="${cartCount} items in bag">${cartCount}</span>
          </a>

          <!-- Mobile Hamburger Toggle -->
          <button class="mobile-toggle" id="menu-toggle" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="primary-nav">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  `;

  // Attach mobile toggle handlers
  initMobileNav();
  // Attach scroll listener
  initStickyHeader();
}

// ---------------------------------------------------------------------------
// 4. Mobile Navigation & Header Scroll Handlers
// ---------------------------------------------------------------------------
function initMobileNav() {
  const toggleBtn = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('primary-nav');
  if (!toggleBtn || !navMenu) return;

  function toggleMenu(forceClose = false) {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    const nextState = forceClose ? false : !isExpanded;
    toggleBtn.setAttribute('aria-expanded', String(nextState));
    navMenu.classList.toggle('is-open', nextState);
    document.body.style.overflow = nextState ? 'hidden' : '';

    if (nextState) {
      // Focus first link in menu
      const firstLink = navMenu.querySelector('a, button');
      if (firstLink) firstLink.focus();
    } else {
      toggleBtn.focus();
    }
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Close menu when clicking on any nav link
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggleMenu(true);
    });
  });

  // Focus trap inside open navigation menu
  navMenu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || toggleBtn.getAttribute('aria-expanded') !== 'true') return;
    const focusable = Array.from(navMenu.querySelectorAll('a, button, [tabindex="0"]'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  });

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggleBtn.getAttribute('aria-expanded') === 'true') {
      toggleMenu(true);
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (toggleBtn.getAttribute('aria-expanded') === 'true') {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        toggleMenu(true);
      }
    }
  });
}

function initStickyHeader() {
  const header = document.getElementById('navbar');
  if (!header) return;

  let lastScrollY = window.scrollY;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;

        // 1. Soft shadow appearing after first scroll
        if (currentY > 20) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }

        // 2. Shrinks and hides when scrolling down, returns when scrolling up
        const isMenuOpen = document.body.classList.contains('menu-open');
        const isModalOpen = document.body.classList.contains('swan-modal-open');
        if (currentY > 120 && currentY > lastScrollY && !isMenuOpen && !isModalOpen) {
          header.classList.add('header-hidden');
        } else {
          header.classList.remove('header-hidden');
        }

        lastScrollY = currentY;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// Slim Scroll-Progress Bar in Brand Gradient
function initScrollProgress() {
  let bar = document.getElementById('swan-scroll-progress');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'swan-scroll-progress';
    bar.className = 'swan-scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
  }

  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const progress = total > 0 ? (window.scrollY / total) * 100 : 0;
    bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }, { passive: true });
}

// Scroll Reveals & Self-Drawing Stitch Line Dividers
function initScrollReveals() {
  if (typeof IntersectionObserver === 'undefined') return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed', 'in-view');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  document.querySelectorAll('.reveal-on-scroll, .stitch-divider, .home-review-card, .category-card').forEach(el => {
    observer.observe(el);
  });
}

// Toast notification helper
function showSwanToast(message, iconSvg = '') {
  let toast = document.getElementById('swan-toast-banner');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'swan-toast-banner';
    toast.className = 'swan-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  const defaultIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  toast.innerHTML = `${iconSvg || defaultIcon}<span>${message}</span>`;
  toast.classList.add('is-active');

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove('is-active');
  }, 2600);
}
window.showSwanToast = showSwanToast;

// Wishlist toggle helper with spring heart pop & toast
function toggleWishlist(slug) {
  if (!slug) return false;
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem('swan_wishlist') || '[]');
  } catch (e) {
    list = [];
  }
  const index = list.indexOf(slug);
  let isSaved = false;
  if (index >= 0) {
    list.splice(index, 1);
    isSaved = false;
  } else {
    list.push(slug);
    isSaved = true;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch (e) {}
    }
  }
  localStorage.setItem('swan_wishlist', JSON.stringify(list));

  // Update all heart icons for this slug
  document.querySelectorAll(`.wishlist-btn[data-slug="${slug}"]`).forEach(btn => {
    btn.classList.toggle('active', isSaved);
    btn.setAttribute('aria-label', isSaved ? 'Remove from wishlist' : 'Save to wishlist');
  });

  showSwanToast(isSaved ? 'Saved to your wishlist' : 'Removed from wishlist', isSaved ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--rose)" stroke="var(--rose-text)" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>` : '');
  return isSaved;
}
window.toggleWishlist = toggleWishlist;

// ---------------------------------------------------------------------------
// 5. Shared Footer Injection (Including Non-Negotiable Developer Credit)
// ---------------------------------------------------------------------------
function renderFooter() {
  const footerContainer = document.getElementById('site-footer');
  if (!footerContainer) return;

  const currentYear = new Date().getFullYear();

  footerContainer.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <!-- Col 1: Brand Info -->
          <div class="footer-brand">
            <h3>${SITE.name}</h3>
            <p>${SITE.tagline}</p>
            <p style="margin-top: 0.8rem; font-size: 0.85rem; color: #BAA9A0;">
              Artisanal crochet creations handcrafted with love, patience, and premium yarn by Bhumika Nama in India.
            </p>
          </div>

          <!-- Col 2: Shop & Collections -->
          <div>
            <h4 class="footer-heading">Shop</h4>
            <ul class="footer-links" id="footer-shop-links">
              <li><a href="shop.html">All Creations</a></li>
            </ul>
          </div>

          <!-- Col 3: Support & Information -->
          <div>
            <h4 class="footer-heading">Support</h4>
            <ul class="footer-links">
              <li><a href="about.html">About the Maker</a></li>
              <li><a href="blog.html">Atelier Stories & Care</a></li>
              <li><a href="reviews.html">Customer Reviews & Notes</a></li>
              <li><a href="custom-order.html">Custom Orders</a></li>
              <li><a href="contact.html">Contact Us</a></li>
              <li><a href="shipping.html">Shipping Policy</a></li>
              <li><a href="returns.html">Returns & Refunds</a></li>
              <li><a href="privacy.html">Privacy Policy</a></li>
              <li><a href="terms.html">Terms & Conditions</a></li>
            </ul>
          </div>

          <!-- Col 4: Contact & Payment Info -->
          <div class="footer-contact-info">
            <h4 class="footer-heading">Connect</h4>
            <p>Direct inquiries & custom orders via WhatsApp:</p>
            <p>
              <a href="${SITE.whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="color: #FFF8F1; border-color: var(--blush); margin-top: 0.4rem; display: inline-flex; align-items: center; min-height: 44px; padding: 0.5rem 1rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.45rem; flex-shrink: 0;" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                WhatsApp: ${SITE.whatsapp}
              </a>
            </p>
            <p style="margin-top: 0.45rem;">
              <a href="mailto:${SITE.email}" class="btn btn-outline btn-sm" style="color: #FFF8F1; border-color: var(--blush); display: inline-flex; align-items: center; min-height: 44px; padding: 0.5rem 1rem; font-size: 0.85rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.45rem; flex-shrink: 0;" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                Email: ${SITE.email}
              </a>
            </p>

            <!-- Official Instagram Logo Button (Spot 1: Site Footer) -->
            <div style="margin-top: 1rem;">
              <a href="${SITE.social.instagram}" target="_blank" rel="noopener noreferrer" class="footer-instagram-row" aria-label="Swan Studio on Instagram" title="Follow @swan_handcrafted_studio.3568 on Instagram">
                <span class="instagram-logo-btn" aria-hidden="true">
                  <svg class="instagram-glyph-svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </span>
                <span class="footer-instagram-label">Follow us on Instagram &rarr;</span>
              </a>
            </div>

            <p style="margin-top: 0.85rem; font-size: 0.82rem; color: #BAA9A0;">
              Payments accepted via UPI (${SITE.upiId}). Orders verified manually with care.
            </p>
          </div>
        </div>

        <!-- Footer Bottom: Copyright & Developer Credit -->
        <div class="footer-bottom">
          <p class="footer-copyright">
            &copy; ${currentYear} ${SITE.name}. All rights reserved.
          </p>
          
          <!-- Mandatory Developer Credit (PRD Section 2 Requirement 1) -->
          <p class="dev-credit">Developed with ❤️ by Mridul</p>
        </div>
      </div>
    </footer>
  `;

  // Dynamically populate active collections in footer
  if (typeof fetchCategories === 'function') {
    fetchCategories().then(cats => {
      const linksContainer = document.getElementById('footer-shop-links');
      const list = Array.isArray(cats) ? cats : (cats && cats.data ? cats.data : []);
      if (linksContainer && list.length > 0) {
        linksContainer.innerHTML = `<li><a href="shop.html">All Creations</a></li>` +
          list.map(c => `<li><a href="shop.html?category=${encodeURIComponent(c.slug)}">${c.name}</a></li>`).join('');
      }
    }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// 6. Mobile Fixed Billing Notification Bar
// Firmly anchored at bottom of phone screens to direct customers to payment/checkout
// ---------------------------------------------------------------------------
function renderMobileBillingBar() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  // Do not show on checkout or order confirmation where customer is already paying
  if (currentPath === 'checkout.html' || currentPath === 'order-confirmation.html') {
    return;
  }

  let bar = document.getElementById('swan-mobile-billing-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'swan-mobile-billing-bar';
    bar.className = 'mobile-billing-bar';
    bar.setAttribute('aria-label', 'Shopping Bag & Billing Summary');
    bar.innerHTML = `
      <div class="mobile-billing-inner">
        <a href="cart.html" class="mobile-billing-info" id="mobile-bill-info-btn" aria-label="Review shopping bag items">
          <div class="mobile-billing-badge-row">
            <span class="mobile-billing-icon" aria-hidden="true" style="display: inline-flex; align-items: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            </span>
            <span id="mobile-bill-items-count" class="mobile-billing-count">0 items</span>
          </div>
          <div class="mobile-billing-amount-wrap">
            <span class="mobile-billing-label">Total:</span>
            <strong id="mobile-bill-total-price" class="mobile-billing-total">₹0</strong>
          </div>
        </a>
        <div class="mobile-billing-actions">
          <a href="checkout.html" id="mobile-bill-checkout-btn" class="mobile-billing-btn" aria-label="Proceed directly to payment and checkout">
            <span>Proceed to Payment</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
      </div>
    `;
    document.body.appendChild(bar);
  }

  updateMobileBillingBar();
}

function updateMobileBillingBar() {
  const bar = document.getElementById('swan-mobile-billing-bar');
  if (!bar) return;

  try {
    const rawCart = localStorage.getItem('swan_cart');
    const cart = rawCart ? JSON.parse(rawCart) : [];
    if (!Array.isArray(cart) || cart.length === 0) {
      bar.classList.remove('is-visible');
      document.body.classList.remove('has-mobile-billing-bar');
      return;
    }

    const totalQty = cart.reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 1), 0);
    const subtotal = cart.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * (parseInt(i.quantity, 10) || 1), 0);

    const countEl = document.getElementById('mobile-bill-items-count');
    const priceEl = document.getElementById('mobile-bill-total-price');

    if (countEl) {
      countEl.textContent = `${totalQty} item${totalQty === 1 ? '' : 's'}`;
    }
    if (priceEl) {
      priceEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    }

    bar.classList.add('is-visible');
    document.body.classList.add('has-mobile-billing-bar');

    // Trigger subtle pulse animation on update
    bar.classList.remove('pulse');
    void bar.offsetWidth;
    bar.classList.add('pulse');
  } catch (err) {
    console.warn('Error updating mobile billing bar:', err);
  }
}

window.updateMobileBillingBar = updateMobileBillingBar;

// ---------------------------------------------------------------------------
// 7. Action Dock: Unified Floating WhatsApp & Leave Note Stack (Bug 6 & 8 Fix)
// ---------------------------------------------------------------------------
function renderActionDock() {
  if (window.location.pathname.includes('/admin/')) return;
  const path = window.location.pathname.split('/').pop() || 'index.html';
  if (path === 'order-confirmation.html') return;

  let dock = document.getElementById('swan-action-dock');
  if (!dock) {
    dock = document.createElement('div');
    dock.id = 'swan-action-dock';
    dock.className = 'swan-action-dock';
    dock.setAttribute('role', 'region');
    dock.setAttribute('aria-label', 'Quick Actions');
    document.body.appendChild(dock);
  }

  // 1. Leave Note Button
  if (!document.getElementById('swan-floating-note-btn')) {
    const noteBtn = document.createElement('button');
    noteBtn.type = 'button';
    noteBtn.id = 'swan-floating-note-btn';
    noteBtn.className = 'dock-btn dock-note-btn';
    noteBtn.setAttribute('aria-label', 'Leave a kind note for Bhumika');
    noteBtn.setAttribute('title', 'Leave a note');
    noteBtn.innerHTML = `
      <span class="dock-btn-icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </span>
      <span class="dock-btn-label">Leave a note</span>
    `;
    noteBtn.addEventListener('click', () => {
      if (typeof openNoteModal === 'function') {
        openNoteModal();
      }
    });
    dock.appendChild(noteBtn);
  }

  // 2. WhatsApp Button
  if (!document.getElementById('swan-floating-whatsapp')) {
    const waBtn = document.createElement('a');
    waBtn.id = 'swan-floating-whatsapp';
    waBtn.className = 'dock-btn dock-wa-btn';
    const waNum = SITE.whatsapp || '9509966512';
    const waUrl = SITE.whatsappUrl || `https://wa.me/91${waNum}`;
    waBtn.href = `${waUrl}?text=${encodeURIComponent("Hi Bhumika! I'm browsing the Swan Studio website and would like to inquire about a crochet creation.")}`;
    waBtn.target = '_blank';
    waBtn.rel = 'noopener noreferrer';
    waBtn.setAttribute('aria-label', 'Chat directly with Bhumika on WhatsApp');
    waBtn.setAttribute('title', 'Chat on WhatsApp');
    waBtn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7.02 8.48 7.02 9.7C7.02 10.92 7.91 12.1 8.03 12.27C8.16 12.43 9.77 14.91 12.23 15.97C12.82 16.22 13.27 16.37 13.63 16.49C14.22 16.68 14.76 16.65 15.19 16.59C15.67 16.52 16.66 15.99 16.87 15.4C17.07 14.82 17.07 14.32 17.01 14.22C16.95 14.12 16.79 14.06 16.55 13.94C16.31 13.82 15.12 13.24 14.9 13.16C14.68 13.08 14.52 13.04 14.36 13.28C14.2 13.52 13.74 14.06 13.6 14.22C13.46 14.38 13.32 14.4 13.08 14.28C12.84 14.16 11.83 13.83 10.63 12.76C9.7 11.93 9.07 10.91 8.95 10.71C8.83 10.51 8.94 10.4 9.06 10.28C9.17 10.17 9.31 9.99 9.43 9.85C9.55 9.71 9.59 9.61 9.67 9.45C9.75 9.29 9.71 9.15 9.65 9.03C9.59 8.91 9.13 7.78 8.94 7.31C8.75 6.86 8.56 6.92 8.42 6.91L8.03 6.91C7.87 6.91 8.53 7.33 8.53 7.33Z"/>
      </svg>
    `;
    dock.appendChild(waBtn);
  }

  // Scroll collapse/expand & keyboard hide handlers
  setupDockInteractions(dock);
}

function setupDockInteractions(dock) {
  let lastY = window.scrollY;
  const noteBtn = document.getElementById('swan-floating-note-btn');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('scroll', () => {
    const curY = window.scrollY;
    // Collapse note button on scroll down, expand on scroll up
    if (noteBtn && !prefersReduced) {
      if (curY > lastY && curY > 80) {
        noteBtn.classList.add('collapsed');
      } else {
        noteBtn.classList.remove('collapsed');
      }
    }

    // Hide or elevate dock when approaching footer to guarantee 0 overlap
    const footer = document.querySelector('footer') || document.getElementById('site-footer');
    if (footer) {
      const footerRect = footer.getBoundingClientRect();
      if (footerRect.top < window.innerHeight) {
        const overlap = window.innerHeight - footerRect.top;
        dock.style.transform = `translateY(-${Math.max(0, overlap + 10)}px)`;
      } else {
        dock.style.transform = '';
      }
    }

    lastY = curY;
  }, { passive: true });

  // Virtual keyboard open detection (visualViewport)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.75;
      dock.classList.toggle('dock-hidden', isKeyboardOpen);
    });
  }

  // Input focus/blur hide protection
  document.addEventListener('focusin', (e) => {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select')) {
      dock.classList.add('dock-hidden');
    }
  });

  document.addEventListener('focusout', (e) => {
    if (e.target && e.target.matches && e.target.matches('input, textarea, select')) {
      setTimeout(() => {
        if (!document.activeElement || !document.activeElement.matches || !document.activeElement.matches('input, textarea, select')) {
          dock.classList.remove('dock-hidden');
        }
      }, 100);
    }
  });
}

function renderFloatingWhatsApp() {
  renderActionDock();
}

// ---------------------------------------------------------------------------
// 8. Dynamic Live Configuration Hydration (Single Source of Truth)
// ---------------------------------------------------------------------------
async function loadSiteConfig() {
  try {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    let changed = false;

    if (client) {
      try {
        const { data: rows, error } = await client.from('site_content').select('*');
        if (!error && Array.isArray(rows)) {
          const contentMap = {};
          rows.forEach(r => {
            contentMap[r.key] = r.data;
          });

          const content = contentMap.content || contentMap.story || {};
          const settings = contentMap.settings || contentMap.contact || {};
          const banner = contentMap.banner;
          const hero = contentMap.hero;
          const contact = contentMap.contact;

          if (banner?.message) {
            SITE.announcement = banner.message;
            changed = true;
          } else if (content.announcement) {
            SITE.announcement = content.announcement;
            changed = true;
          }

          if (contact?.whatsapp || settings.whatsapp) {
            const wa = contact?.whatsapp || settings.whatsapp;
            SITE.whatsapp = wa;
            SITE.whatsappUrl = `https://wa.me/91${wa.replace(/[^0-9]/g, '')}`;
            changed = true;
          }
          if (contact?.upiId || settings.upiId) {
            SITE.upiId = contact?.upiId || settings.upiId;
            changed = true;
          }
          if (contact?.email || settings.email) {
            SITE.email = contact?.email || settings.email;
            changed = true;
          }
          if (contact?.instagram || settings.instagram) {
            SITE.social.instagram = (contact?.instagram || settings.instagram).split('?')[0];
            changed = true;
          }

          window.SWAN_CONTENT = { ...content, hero, banner, contact, about: contentMap.about };
          window.SWAN_SETTINGS = settings;
        }
      } catch (supaErr) {
        console.warn('Supabase site_content fetch note:', supaErr);
      }
    }

    if (changed) {
      renderHeader();
      renderFooter();
      const waBtn = document.getElementById('swan-floating-whatsapp');
      if (waBtn) {
        waBtn.href = `${SITE.whatsappUrl}?text=${encodeURIComponent("Hi Bhumika! I'm browsing the Swan Studio website and would like to inquire about a crochet creation.")}`;
      }
    }

    // Dispatch event for page-specific hydration
    window.dispatchEvent(new CustomEvent('swan:content-ready', {
      detail: {
        content: window.SWAN_CONTENT || {},
        settings: window.SWAN_SETTINGS || {}
      }
    }));
  } catch (err) {
    console.warn('Live site configuration note:', err);
  }
}

window.loadSiteConfig = loadSiteConfig;

// ---------------------------------------------------------------------------
// 9. DOM Initialization & Mirror Guard
// ---------------------------------------------------------------------------
// Mirror redirect for GitHub Pages to primary canonical domain
if (typeof window !== 'undefined' && window.location && window.location.hostname === 'swanstudio2604-beep.github.io') {
  const targetPath = window.location.pathname.replace(/^\/Swan-Studio\/?/, '/') || '/';
  window.location.replace('https://swan-studio.onslate.in' + (targetPath.startsWith('/') ? targetPath : '/' + targetPath) + window.location.search + window.location.hash);
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();
  renderMobileBillingBar();
  renderActionDock();
  loadSiteConfig();
  initScrollProgress();
  initScrollReveals();

  // Load floating reviews & note modal on public storefront pages if not yet included
  if (!window.location.pathname.includes('/admin/') && !window.openNoteModal) {
    const existing = document.querySelector('script[src*="reviews-floating.js"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = window.location.pathname.includes('/admin/') ? '../js/reviews-floating.js' : 'js/reviews-floating.js';
      script.defer = true;
      document.body.appendChild(script);
    }
  }
});

// Sync cart across browser tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'swan_cart') {
    const count = getSafeCartCount();
    const bagCount = document.getElementById('bag-count');
    if (bagCount) bagCount.textContent = count;
    updateMobileBillingBar();
  }
});

