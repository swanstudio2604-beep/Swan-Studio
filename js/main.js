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
  announcement: '✨ Handcrafted with love in India • Custom crochet creations & personalized gifts ✨',
  social: {
    instagram: 'https://www.instagram.com/swan_handcrafted_studio.3568?utm_source=qr&rpxt=MXc1azF0eDFkeGw5aw==',
    instagramHandle: '@swan_handcrafted_studio.3568',
    instagramQr: 'assets/images/instagram-qr.jpeg',
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

  // Apply custom content from admin CMS if saved
  try {
    const customContent = localStorage.getItem('swan_site_content');
    if (customContent) {
      const parsed = JSON.parse(customContent);
      if (parsed.announcement) SITE.announcement = parsed.announcement;
    }
    const customSettings = localStorage.getItem('swan_site_settings');
    if (customSettings) {
      const s = JSON.parse(customSettings);
      if (s.whatsapp) {
        SITE.whatsapp = s.whatsapp;
        SITE.whatsappUrl = `https://wa.me/91${s.whatsapp.replace(/[^0-9]/g, '')}`;
      }
      if (s.upiId) SITE.upiId = s.upiId;
      if (s.email) SITE.email = s.email;
      if (s.instagram) SITE.social.instagram = s.instagram;
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

  function toggleMenu(expand) {
    const isExpanded = expand ?? (toggleBtn.getAttribute('aria-expanded') === 'true');
    const nextState = !isExpanded;
    toggleBtn.setAttribute('aria-expanded', String(nextState));
    navMenu.classList.toggle('is-open', nextState);
  }

  toggleBtn.addEventListener('click', () => toggleMenu());

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggleBtn.getAttribute('aria-expanded') === 'true') {
      toggleMenu(true);
      toggleBtn.focus();
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

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

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
            <ul class="footer-links">
              <li><a href="shop.html">All Creations</a></li>
              <li><a href="shop.html?category=bouquets">Crochet Bouquets</a></li>
              <li><a href="shop.html?category=bags">Bags & Totes</a></li>
              <li><a href="shop.html?category=plushies">Cute Plushies</a></li>
              <li><a href="shop.html?category=accessories">Personalized Gifts</a></li>
            </ul>
          </div>

          <!-- Col 3: Support & Information -->
          <div>
            <h4 class="footer-heading">Support</h4>
            <ul class="footer-links">
              <li><a href="about.html">About the Maker</a></li>
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
              <a href="${SITE.whatsappUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="color: #FFF8F1; border-color: var(--blush); margin-top: 0.4rem; display: inline-flex;">
                💬 WhatsApp: ${SITE.whatsapp}
              </a>
            </p>
            <p style="margin-top: 0.45rem;">
              <a href="mailto:${SITE.email}" class="btn btn-outline btn-sm" style="color: #FFF8F1; border-color: var(--blush); display: inline-flex; font-size: 0.78rem;">
                ✉️ Email Support: ${SITE.email}
              </a>
            </p>

            <!-- Instagram Connect Card & QR -->
            <div style="margin-top: 1rem; padding: 0.75rem 0.85rem; background: rgba(255, 255, 255, 0.07); border-radius: 12px; border: 1px solid rgba(232, 183, 192, 0.25); display: flex; align-items: center; gap: 0.75rem;">
              <a href="${SITE.social.instagram}" target="_blank" rel="noopener noreferrer" style="flex-shrink: 0;" title="Scan QR or visit Instagram">
                <img src="${SITE.social.instagramQr}" alt="Swan Studio Instagram QR" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; background: #fff; padding: 2px; display: block; border: 1px solid rgba(255,255,255,0.4);">
              </a>
              <div>
                <a href="${SITE.social.instagram}" target="_blank" rel="noopener noreferrer" style="color: #FFF8F1; font-weight: 600; font-size: 0.82rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem;">
                  <span>📷 Follow Instagram</span> &rarr;
                </a>
                <div style="font-size: 0.72rem; color: #BAA9A0; margin-top: 0.15rem;">${SITE.social.instagramHandle}</div>
              </div>
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
}

// ---------------------------------------------------------------------------
// 6. DOM Initialization
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();
});
