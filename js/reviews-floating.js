/**
 * SWAN STUDIO — Floating Note Action Button & Review Form Modal
 * Brand: Swan Studio | Founder: Bhumika Nama
 * 
 * Features:
 * - Floating accessible button (collapses on scroll down, expands on scroll up)
 * - Safe area aware & never collides with WhatsApp, cart, or billing bars
 * - Mobile bottom sheet (90dvh) / Desktop modal (480px)
 * - Rating (1-5), First Name, City, Product selector, 10-600 char note
 * - Optional photo with HEIC/JPEG conversion and phone compression (<400KB, max 1200px)
 * - Anti-spam: honeypot, link blocking, min time-on-form, rate limiting
 * - Visibility toggle (Public with consent, or Private to Bhumika)
 * - Draft persistence via sessionStorage
 * - Failure fallback to direct WhatsApp pre-filled note
 */

(function () {
  'use strict';

  // Do not initialize inside admin panel
  if (window.location.pathname.includes('/admin/')) {
    return;
  }

  // Do not show during active checkout payment
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPath === 'order-confirmation.html') {
    return;
  }

  const STORAGE_KEY = 'swan_note_form_draft_v1';
  let formOpenTime = 0;
  let compressedPhotoBlob = null;
  let compressedPhotoDataUrl = null;
  let lastScrollY = window.scrollY;
  let scrollTicking = false;
  let productsCache = [];

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // 1. DOM Injection: Floating "Leave a note" Action Button inside Action Dock
  // ---------------------------------------------------------------------------
  function renderFloatingButton() {
    if (document.getElementById('swan-floating-note-btn')) return;

    // Hide if payment step on checkout.html or if on reviews page (page has dedicated review actions)
    if (window.location.pathname.toLowerCase().includes('reviews') || currentPath === 'checkout.html' || currentPath === 'order-confirmation.html') {
      return;
    }

    let dock = document.getElementById('swan-action-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'swan-action-dock';
      dock.className = 'swan-action-dock';
      dock.setAttribute('role', 'region');
      dock.setAttribute('aria-label', 'Quick Actions');
      document.body.appendChild(dock);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'swan-floating-note-btn';
    btn.className = 'dock-btn dock-note-btn';
    btn.setAttribute('aria-label', 'Leave a kind note for Bhumika');
    btn.setAttribute('title', 'Leave a kind note');
    btn.innerHTML = `
      <span class="dock-btn-icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </span>
      <span class="dock-note-label">Leave a note</span>
    `;

    btn.addEventListener('click', () => {
      openNoteModal();
    });

    // Place Leave a Note button above WhatsApp in the dock
    if (dock.firstChild) {
      dock.insertBefore(btn, dock.firstChild);
    } else {
      dock.appendChild(btn);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. DOM Injection: Floating Bottom Sheet / Centered Modal (Bug 3, 4, 5 Fix)
  // ---------------------------------------------------------------------------
  function renderNoteModal() {
    if (document.getElementById('swan-note-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'swan-note-modal-overlay';
    overlay.className = 'swan-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'note-modal-title');
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <div class="swan-modal-backdrop" id="swan-modal-backdrop"></div>
      <div class="swan-bottom-sheet" id="swan-bottom-sheet">
        <div class="sheet-drag-handle-wrap" id="sheet-drag-handle-wrap" aria-hidden="true">
          <div class="sheet-drag-handle"></div>
        </div>
        
        <!-- Sheet Header -->
        <div class="sheet-header">
          <div>
            <div class="sheet-badge-top">
              <span>💌</span> Handcrafted Note
            </div>
            <h2 class="sheet-title" id="note-modal-title">Leave a kind note</h2>
            <p class="sheet-subtitle">Share what you received and how it felt to open it.</p>
          </div>
          <button type="button" class="sheet-close-btn" id="swan-note-close-btn" aria-label="Close note form">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Sheet Scrollable Content -->
        <div class="sheet-body" id="swan-note-sheet-body">
          <form id="swan-floating-note-form" novalidate>
            <!-- Honeypot anti-spam field -->
            <div style="position: absolute; left: -9999px; top: -9999px; opacity: 0; pointer-events: none;" aria-hidden="true">
              <input type="text" name="website_url_hp" id="note-hp-field" tabindex="-1" autocomplete="off">
            </div>

            <!-- Star Rating (1 to 5) with Gold Palette and Tap Pop -->
            <div class="form-group rating-group">
              <label class="form-label" id="star-rating-label">How did you like it? <span class="badge-field-req">Required</span></label>
              <div class="star-picker-card">
                <div class="star-picker" role="radiogroup" aria-labelledby="star-rating-label" id="star-picker">
                  ${[1, 2, 3, 4, 5].map(val => `
                    <button type="button" class="star-btn ${val <= 5 ? 'active' : ''}" data-value="${val}" role="radio" aria-checked="${val === 5}" aria-label="${val} star${val > 1 ? 's' : ''}">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="${val <= 5 ? '#F5A623' : '#E5E7EB'}" stroke="${val <= 5 ? '#D97706' : '#D1D5DB'}" stroke-width="1" aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </button>
                  `).join('')}
                </div>
                <div class="rating-feedback-text" id="rating-feedback-text">✨ 5 out of 5 — Loved it! Absolutely delighted</div>
              </div>
              <input type="hidden" name="rating" id="note-rating-input" value="5">
              <div class="form-error-msg" id="err-rating"></div>
            </div>

            <!-- Your Note Body with Character Counter Underneath -->
            <div class="form-group">
              <label for="note-body-input" class="form-label">Your note <span class="badge-field-req">Required</span></label>
              <textarea 
                id="note-body-input" 
                name="body" 
                rows="4" 
                class="form-control" 
                placeholder="What did you receive, and how did it feel to open it? Tell Bhumika your thoughts..."
                minlength="10" 
                maxlength="600"
                required
              ></textarea>
              <div class="char-counter-row">
                <span class="char-counter-bottom" id="note-char-counter">0 / 600</span>
              </div>
              <div class="form-error-msg" id="err-body"></div>
            </div>

            <!-- First Name & City Row (Clean 2-col on mobile) -->
            <div class="form-row form-row-compact">
              <div class="form-group flex-1">
                <label for="note-name-input" class="form-label">First name <span class="badge-field-req">Required</span></label>
                <input 
                  type="text" 
                  id="note-name-input" 
                  name="first_name" 
                  class="form-control" 
                  placeholder="e.g. Priya" 
                  maxlength="50"
                  required
                >
                <div class="form-error-msg" id="err-name"></div>
              </div>

              <div class="form-group flex-1">
                <label for="note-city-input" class="form-label">City <span class="badge-field-opt">Optional</span></label>
                <input 
                  type="text" 
                  id="note-city-input" 
                  name="city" 
                  class="form-control" 
                  placeholder="e.g. Jaipur" 
                  maxlength="50"
                >
              </div>
            </div>

            <!-- Which piece? (Real DB dropdown) -->
            <div class="form-group">
              <label for="note-product-select" class="form-label">Which piece was it? <span class="badge-field-opt">Optional</span></label>
              <select id="note-product-select" name="product_id" class="form-control form-select">
                <option value="">Select a piece (or leave blank)</option>
                <option value="custom_order">Custom order</option>
                <option value="not_sure">Not sure</option>
              </select>
            </div>

            <!-- Custom Styled Photo Upload Card (Bug 5 Fix) -->
            <div class="form-group">
              <label class="form-label">Photo <span class="badge-field-opt">Optional</span></label>
              <div class="photo-upload-card" id="photo-upload-card">
                <input 
                  type="file" 
                  id="note-photo-file" 
                  accept="image/*,.heic,.heif" 
                  class="photo-file-input"
                  style="position: absolute !important; width: 1px !important; height: 1px !important; opacity: 0 !important; pointer-events: none !important; overflow: hidden !important;"
                  tabindex="-1"
                >
                <label for="note-photo-file" class="photo-upload-dropzone" id="photo-upload-trigger">
                  <div class="upload-icon-circle" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </div>
                  <div class="upload-text-block">
                    <span class="upload-main-text">Add a photo (gallery or camera)</span>
                    <span class="upload-sub-text">Compressed directly on your phone • Private until approved</span>
                  </div>
                </label>
                <div class="photo-preview-wrap" id="note-photo-preview-wrap" style="display: none;">
                  <img src="" alt="Photo preview" id="note-photo-preview-img" class="photo-preview-img">
                  <div class="photo-preview-info">
                    <span id="photo-file-name" class="photo-file-name">Photo attached</span>
                    <span id="photo-file-size" class="photo-file-size">Ready to upload</span>
                    <div class="photo-progress-bar" id="photo-compress-progress" style="display: none;">
                      <div class="photo-progress-fill" id="photo-progress-fill"></div>
                    </div>
                  </div>
                  <button type="button" class="photo-remove-btn" id="note-photo-remove-btn" aria-label="Remove attached photo">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span>Remove</span>
                  </button>
                </div>
              </div>
              <div class="form-error-msg" id="err-photo"></div>
            </div>

            <!-- Segmented Control for Visibility Choice (Bug 5 Fix) -->
            <div class="form-group visibility-box">
              <label class="form-label">Note visibility</label>
              <div class="segmented-control" role="radiogroup" aria-label="Note visibility choice">
                <button type="button" class="segment-btn active" id="seg-public" role="radio" aria-checked="true" data-value="public">
                  Show on the website
                </button>
                <button type="button" class="segment-btn" id="seg-private" role="radio" aria-checked="false" data-value="private">
                  Only send to Bhumika
                </button>
              </div>
              <input type="hidden" name="visibility" id="note-visibility-input" value="public">

              <!-- Consent checkbox (required for public option) -->
              <div class="consent-checkbox-wrap" id="consent-container">
                <label class="consent-checkbox-label">
                  <input type="checkbox" id="note-consent-check" class="custom-checkbox" checked required>
                  <span class="consent-text">Bhumika may display my first name, city, note and photo on this website.</span>
                </label>
                <div class="form-error-msg" id="err-consent"></div>
              </div>
              <div class="private-note-hint" id="private-note-hint" style="display: none;">
                💌 This note will be sent directly to Bhumika as private feedback and will never appear on the website.
              </div>
            </div>

            <!-- Optional Order ID or Phone (Verified Buyer Accordion) -->
            <div class="form-group" style="margin-top: 0.5rem;">
              <details class="order-link-accordion" id="order-link-accordion">
                <summary class="order-link-summary">
                  <span>Have an order ID or phone number? (optional)</span>
                  <svg class="accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </summary>
                <div class="order-link-fields">
                  <input 
                    type="text" 
                    id="note-order-contact" 
                    class="form-control" 
                    placeholder="Order ID (e.g. SWAN-1001) or phone number"
                  >
                  <div class="privacy-microcopy">
                    🔒 Used only to confirm your order for a Verified Buyer badge. Never shown publicly or shared with anyone.
                  </div>
                </div>
              </details>
            </div>

            <!-- Form Global Error Notification -->
            <div class="form-global-error" id="note-form-global-error" style="display: none;"></div>
          </form>

          <!-- Success State -->
          <div class="note-state-box note-success-box" id="note-success-view" style="display: none;">
            <div class="state-icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drawn-check">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 class="state-title" id="success-name-heading">Thank you!</h3>
            <p class="state-desc" id="success-desc-text">
              Bhumika reads every note personally. Public notes appear on the website after she approves them.
            </p>
            <div class="state-actions">
              <button type="button" class="btn btn-outline" id="success-close-btn">Close</button>
              <a href="https://www.instagram.com/swan_handcrafted_studio.3568" target="_blank" rel="noopener noreferrer" class="btn btn-primary instagram-cta-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span>Follow on Instagram</span>
              </a>
            </div>
          </div>

          <!-- Failure State with WhatsApp Fallback -->
          <div class="note-state-box note-error-box" id="note-failure-view" style="display: none;">
            <div class="state-icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 class="state-title">Unable to send note</h3>
            <p class="state-desc" id="failure-error-msg">
              We encountered a connection issue. Don't worry, your words are not lost!
            </p>
            <div class="state-actions">
              <button type="button" class="btn btn-primary" id="failure-retry-btn">Try again</button>
              <a href="#" target="_blank" rel="noopener noreferrer" class="btn btn-outline whatsapp-fallback-btn" id="failure-whatsapp-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7.02 8.48 7.02 9.7C7.02 10.92 7.91 12.1 8.03 12.27C8.16 12.43 9.77 14.91 12.23 15.97C12.82 16.22 13.27 16.37 13.63 16.49C14.22 16.68 14.76 16.65 15.19 16.59C15.67 16.52 16.66 15.99 16.87 15.4C17.07 14.82 17.07 14.32 17.01 14.22C16.95 14.12 16.79 14.06 16.55 13.94C16.31 13.82 15.12 13.24 14.9 13.16C14.68 13.08 14.52 13.04 14.36 13.28C14.2 13.52 13.74 14.06 13.6 14.22C13.46 14.38 13.32 14.4 13.08 14.28C12.84 14.16 11.83 13.83 10.63 12.76C9.7 11.93 9.07 10.91 8.95 10.71C8.83 10.51 8.94 10.4 9.06 10.28C9.17 10.17 9.31 9.99 9.43 9.85C9.55 9.71 9.59 9.61 9.67 9.45C9.75 9.29 9.71 9.15 9.65 9.03C9.59 8.91 9.13 7.78 8.94 7.31C8.75 6.86 8.56 6.92 8.42 6.91L8.03 6.91C7.87 6.91 8.53 7.33 8.53 7.33Z"/>
                </svg>
                <span>Send via WhatsApp instead</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Sticky Bottom Submit Action (Bug 5 Fix) -->
        <div class="sheet-sticky-footer" id="sheet-sticky-footer">
          <button type="submit" form="swan-floating-note-form" class="btn btn-primary btn-block submit-btn" id="swan-note-submit-btn">
            <span class="btn-text" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
              <span>Send note with love</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </span>
            <span class="btn-spinner" aria-hidden="true" style="display: none;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10"></path>
              </svg>
              <span style="margin-left: 8px;">Sending note...</span>
            </span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    bindModalEvents();
    populateProductDropdown();
    restoreDraft();
  }

  // ---------------------------------------------------------------------------
  // 3. Event Listeners & Interaction
  // ---------------------------------------------------------------------------
  function bindModalEvents() {
    const overlay = document.getElementById('swan-note-modal-overlay');
    const backdrop = document.getElementById('swan-modal-backdrop');
    const closeBtn = document.getElementById('swan-note-close-btn');
    const successCloseBtn = document.getElementById('success-close-btn');
    const failureRetryBtn = document.getElementById('failure-retry-btn');
    const form = document.getElementById('swan-floating-note-form');

    // Close triggers
    backdrop.addEventListener('click', closeNoteModal);
    closeBtn.addEventListener('click', closeNoteModal);
    successCloseBtn.addEventListener('click', closeNoteModal);

    failureRetryBtn.addEventListener('click', () => {
      document.getElementById('note-failure-view').style.display = 'none';
      form.style.display = 'block';
    });

    // Close on Escape & Focus Trap
    document.addEventListener('keydown', (e) => {
      if (overlay.style.display !== 'none') {
        if (e.key === 'Escape') {
          closeNoteModal();
        } else if (e.key === 'Tab') {
          handleFocusTrap(e, overlay);
        }
      }
    });

    // Star rating buttons with gold fill and pop animation
    const starButtons = document.querySelectorAll('#star-picker .star-btn');
    const ratingInput = document.getElementById('note-rating-input');
    const ratingText = document.getElementById('rating-feedback-text');
    const ratingDescriptions = {
      1: '😞 1 out of 5 — Disappointed, we want to make it right',
      2: '🌱 2 out of 5 — Could be better',
      3: '🌸 3 out of 5 — It was nice and thoughtful',
      4: '⭐ 4 out of 5 — Really liked it! Beautiful work',
      5: '✨ 5 out of 5 — Loved it! Absolutely delighted'
    };

    starButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.getAttribute('data-value'), 10);
        ratingInput.value = val;
        ratingText.textContent = ratingDescriptions[val] || 'Loved it';
        starButtons.forEach(b => {
          const bVal = parseInt(b.getAttribute('data-value'), 10);
          const isActive = bVal <= val;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-checked', bVal === val ? 'true' : 'false');
          const svg = b.querySelector('svg');
          if (svg) {
            svg.setAttribute('fill', isActive ? '#F5A623' : '#E5E7EB');
            svg.setAttribute('stroke', isActive ? '#D97706' : '#D1D5DB');
          }
        });
        btn.classList.remove('tap-pop');
        void btn.offsetWidth; // trigger reflow for animation
        btn.classList.add('tap-pop');
        saveDraft();
      });

      // Keyboard arrow navigation
      btn.addEventListener('keydown', (e) => {
        let current = parseInt(ratingInput.value, 10);
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          const next = Math.min(5, current + 1);
          const target = document.querySelector(`#star-picker .star-btn[data-value="${next}"]`);
          if (target) { target.click(); target.focus(); }
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          const prev = Math.max(1, current - 1);
          const target = document.querySelector(`#star-picker .star-btn[data-value="${prev}"]`);
          if (target) { target.click(); target.focus(); }
        }
      });
    });

    // Live character counter & autosave
    const noteTextarea = document.getElementById('note-body-input');
    const charCounter = document.getElementById('note-char-counter');
    noteTextarea.addEventListener('input', () => {
      const len = noteTextarea.value.length;
      charCounter.textContent = `${len} / 600`;
      if (len > 600) {
        charCounter.classList.add('exceeded');
      } else {
        charCounter.classList.remove('exceeded');
      }
      saveDraft();
    });

    // Autosave inputs
    ['note-name-input', 'note-city-input', 'note-product-select', 'note-order-contact'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', saveDraft);
    });

    // Segmented Control (Show on website / Only send to Bhumika)
    const segPublic = document.getElementById('seg-public');
    const segPrivate = document.getElementById('seg-private');
    const visInput = document.getElementById('note-visibility-input');
    const consentContainer = document.getElementById('consent-container');
    const consentCheck = document.getElementById('note-consent-check');
    const privateNoteHint = document.getElementById('private-note-hint');

    if (segPublic && segPrivate) {
      segPublic.addEventListener('click', () => {
        segPublic.classList.add('active');
        segPublic.setAttribute('aria-checked', 'true');
        segPrivate.classList.remove('active');
        segPrivate.setAttribute('aria-checked', 'false');
        if (visInput) visInput.value = 'public';
        if (consentContainer) consentContainer.style.display = 'block';
        if (consentCheck) consentCheck.required = true;
        if (privateNoteHint) privateNoteHint.style.display = 'none';
        saveDraft();
      });

      segPrivate.addEventListener('click', () => {
        segPrivate.classList.add('active');
        segPrivate.setAttribute('aria-checked', 'true');
        segPublic.classList.remove('active');
        segPublic.setAttribute('aria-checked', 'false');
        if (visInput) visInput.value = 'private';
        if (consentContainer) consentContainer.style.display = 'none';
        if (consentCheck) consentCheck.required = false;
        if (privateNoteHint) privateNoteHint.style.display = 'block';
        saveDraft();
      });
    }

    // Swipe-down gesture to dismiss bottom sheet on mobile
    const sheet = document.getElementById('swan-bottom-sheet');
    const dragTarget = document.getElementById('sheet-drag-handle-wrap') || document.querySelector('.sheet-header');
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    if (dragTarget && sheet) {
      dragTarget.addEventListener('touchstart', (e) => {
        if (window.innerWidth > 600) return;
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
        sheet.style.transition = 'none';
      }, { passive: true });

      dragTarget.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        if (deltaY > 0) {
          sheet.style.transform = `translateY(${deltaY}px)`;
        }
      }, { passive: true });

      dragTarget.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = '';
        const deltaY = currentY - startY;
        if (deltaY > 70) {
          closeNoteModal();
        } else {
          sheet.style.transform = '';
        }
      });
    }

    // Photo input & phone compression
    const photoInput = document.getElementById('note-photo-file');
    const photoPreviewWrap = document.getElementById('note-photo-preview-wrap');
    const photoPreviewImg = document.getElementById('note-photo-preview-img');
    const photoRemoveBtn = document.getElementById('note-photo-remove-btn');
    const photoTrigger = document.getElementById('photo-upload-trigger');
    const photoErr = document.getElementById('err-photo');

    photoInput.addEventListener('change', async (e) => {
      photoErr.textContent = '';
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      try {
        photoTrigger.classList.add('loading');
        photoTrigger.querySelector('span').textContent = 'Compressing photo on phone...';
        
        const compressed = await compressImageOnPhone(file);
        compressedPhotoBlob = compressed.blob;
        compressedPhotoDataUrl = compressed.dataUrl;

        photoPreviewImg.src = compressedPhotoDataUrl;
        photoPreviewWrap.style.display = 'flex';
        photoTrigger.style.display = 'none';
      } catch (err) {
        console.error('Photo processing error:', err);
        photoErr.textContent = err.message || 'Unable to process this image. Please choose a JPEG or PNG.';
        compressedPhotoBlob = null;
        compressedPhotoDataUrl = null;
        photoInput.value = '';
      } finally {
        photoTrigger.classList.remove('loading');
        photoTrigger.querySelector('span').textContent = 'Add a photo (gallery or camera)';
      }
    });

    photoRemoveBtn.addEventListener('click', () => {
      compressedPhotoBlob = null;
      compressedPhotoDataUrl = null;
      photoInput.value = '';
      photoPreviewWrap.style.display = 'none';
      photoTrigger.style.display = 'flex';
      photoErr.textContent = '';
    });

    // Form submission
    form.addEventListener('submit', handleFormSubmit);
  }

  // ---------------------------------------------------------------------------
  // 4. Modal Open/Close & Focus Management
  // ---------------------------------------------------------------------------
  function openNoteModal() {
    renderNoteModal();
    const overlay = document.getElementById('swan-note-modal-overlay');
    const sheet = document.getElementById('swan-bottom-sheet');
    const form = document.getElementById('swan-floating-note-form');
    const successView = document.getElementById('note-success-view');
    const failureView = document.getElementById('note-failure-view');

    // Reset views
    form.style.display = 'block';
    successView.style.display = 'none';
    failureView.style.display = 'none';

    overlay.style.display = 'flex';
    document.body.classList.add('swan-modal-open');
    const dock = document.getElementById('swan-action-dock');
    if (dock) dock.style.display = 'none';
    formOpenTime = Date.now();

    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add('is-active');
      sheet.classList.add('is-active');
      // Focus first actionable field
      const nameField = document.getElementById('note-name-input');
      if (nameField && !nameField.value) {
        nameField.focus();
      } else {
        const bodyField = document.getElementById('note-body-input');
        if (bodyField) bodyField.focus();
      }
    });
  }

  function closeNoteModal() {
    const overlay = document.getElementById('swan-note-modal-overlay');
    const sheet = document.getElementById('swan-bottom-sheet');
    if (!overlay || overlay.style.display === 'none') return;

    overlay.classList.remove('is-active');
    sheet.classList.remove('is-active');
    document.body.classList.remove('swan-modal-open');
    const dock = document.getElementById('swan-action-dock');
    if (dock) dock.style.display = '';

    setTimeout(() => {
      overlay.style.display = 'none';
      // Return focus to floating button if it exists
      const floatBtn = document.getElementById('swan-floating-note-btn');
      if (floatBtn) floatBtn.focus();
    }, 280);
  }

  function handleFocusTrap(e, container) {
    const focusable = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Image Compression & Format Normalization (HEIC / JPEG / WebP)
  // Max dimension 1200px, quality 0.82, target < 400KB
  // ---------------------------------------------------------------------------
  async function compressImageOnPhone(file) {
    return new Promise((resolve, reject) => {
      // Basic size sanity check
      if (file.size > 25 * 1024 * 1024) {
        return reject(new Error('Image is too large (over 25MB). Please choose a smaller photo.'));
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Unable to read selected image file.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Unable to decode image. If using iPhone HEIC, please pick from camera roll.'));
        img.onload = () => {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          const maxDim = 1200;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG at 0.82 quality
          canvas.toBlob((blob) => {
            if (!blob) {
              return reject(new Error('Canvas compression failed.'));
            }
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve({ blob, dataUrl, width, height, size: blob.size });
          }, 'image/jpeg', 0.82);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Draft Persistence via sessionStorage
  // ---------------------------------------------------------------------------
  function saveDraft() {
    try {
      const draft = {
        rating: document.getElementById('note-rating-input')?.value || '5',
        body: document.getElementById('note-body-input')?.value || '',
        first_name: document.getElementById('note-name-input')?.value || '',
        city: document.getElementById('note-city-input')?.value || '',
        product_id: document.getElementById('note-product-select')?.value || '',
        visibility: document.getElementById('note-visibility-input')?.value || 'public',
        consent: document.getElementById('note-consent-check')?.checked ?? true,
        order_contact: document.getElementById('note-order-contact')?.value || '',
        timestamp: Date.now()
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (err) {}
  }

  function restoreDraft() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== 'object') return;

      if (draft.rating) {
        const star = document.querySelector(`#star-picker .star-btn[data-value="${draft.rating}"]`);
        if (star) star.click();
      }
      if (draft.body) {
        const b = document.getElementById('note-body-input');
        if (b) {
          b.value = draft.body;
          const counter = document.getElementById('note-char-counter');
          if (counter) counter.textContent = `${draft.body.length} / 600`;
        }
      }
      if (draft.first_name) {
        const n = document.getElementById('note-name-input');
        if (n) n.value = draft.first_name;
      }
      if (draft.city) {
        const c = document.getElementById('note-city-input');
        if (c) c.value = draft.city;
      }
      if (draft.product_id) {
        const p = document.getElementById('note-product-select');
        if (p) p.value = draft.product_id;
      }
      if (draft.visibility) {
        if (draft.visibility === 'private') {
          const segPrivate = document.getElementById('seg-private');
          if (segPrivate) segPrivate.click();
        } else {
          const segPublic = document.getElementById('seg-public');
          if (segPublic) segPublic.click();
        }
      }
      if (draft.consent !== undefined) {
        const check = document.getElementById('note-consent-check');
        if (check) check.checked = Boolean(draft.consent);
      }
      if (draft.order_contact) {
        const oc = document.getElementById('note-order-contact');
        if (oc) oc.value = draft.order_contact;
      }
    } catch (err) {}
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      const form = document.getElementById('swan-floating-note-form');
      if (form) form.reset();
      compressedPhotoBlob = null;
      compressedPhotoDataUrl = null;
      const preview = document.getElementById('note-photo-preview-wrap');
      if (preview) preview.style.display = 'none';
      const trigger = document.getElementById('photo-upload-trigger');
      if (trigger) trigger.style.display = 'flex';
      const counter = document.getElementById('note-char-counter');
      if (counter) counter.textContent = '0 / 600';
    } catch (err) {}
  }

  // ---------------------------------------------------------------------------
  // 7. Product Dropdown Hydration (Database & Cache)
  // ---------------------------------------------------------------------------
  async function populateProductDropdown() {
    const select = document.getElementById('note-product-select');
    if (!select) return;

    try {
      let products = productsCache;
      if (!products.length && typeof fetchProducts === 'function') {
        const res = await fetchProducts();
        products = Array.isArray(res) ? res : (res && res.data ? res.data : []);
        productsCache = products;
      }

      if (products.length > 0) {
        // Clear old product options while preserving "Custom order" and "Not sure"
        select.innerHTML = `
          <option value="">Select a piece (or leave blank)</option>
          ${products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
          <option value="custom_order">Custom order</option>
          <option value="not_sure">Not sure</option>
        `;

        // Auto-select current product if on product detail page
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const currentSlug = urlParams.get('slug');
          if (currentSlug) {
            const matching = products.find(p => p.slug === currentSlug);
            if (matching) {
              select.value = matching.id;
            }
          }
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Could not populate product selector:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Form Validation & Submission
  // ---------------------------------------------------------------------------
  async function handleFormSubmit(e) {
    e.preventDefault();
    clearErrors();

    // 1. Anti-spam honeypot
    const hp = document.getElementById('note-hp-field')?.value || '';
    if (hp.trim().length > 0) {
      console.warn('Spam honeypot triggered');
      showGlobalError('Invalid submission flagged. Please try again.');
      return;
    }

    // 2. Extract inputs
    const rating = parseInt(document.getElementById('note-rating-input').value, 10) || 5;
    const body = (document.getElementById('note-body-input').value || '').trim();
    const firstName = (document.getElementById('note-name-input').value || '').trim();
    const city = (document.getElementById('note-city-input').value || '').trim();
    const productIdRaw = document.getElementById('note-product-select').value;
    const isPublic = (document.getElementById('note-visibility-input')?.value || 'public') === 'public';
    const consent = document.getElementById('note-consent-check').checked;
    const orderContact = (document.getElementById('note-order-contact')?.value || '').trim();

    let hasError = false;

    // First Name validation
    if (!firstName || firstName.length < 2) {
      setError('err-name', 'Please enter your first name (at least 2 letters).');
      hasError = true;
    }

    // Note length validation (10 to 600)
    if (!body || body.length < 10) {
      setError('err-body', 'Please write at least 10 characters so Bhumika can cherish your note.');
      hasError = true;
    } else if (body.length > 600) {
      setError('err-body', 'Your note must be under 600 characters.');
      hasError = true;
    }

    // Link blocking: reject any URLs
    const urlPattern = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|in|org|net|xyz|co|io|biz|info|site|online|me|app))/i;
    if (urlPattern.test(body)) {
      setError('err-body', 'To protect our community, notes cannot contain website links or URLs.');
      hasError = true;
    }

    // Consent validation for public notes
    if (isPublic && !consent) {
      setError('err-consent', 'Please tick the consent box to display your note on the website.');
      hasError = true;
    }

    if (hasError) {
      const firstErr = document.querySelector('.form-error-msg:not(:empty)');
      if (firstErr) {
        firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Minimum time-on-form check (> 2 seconds)
    const timeSpentMs = Date.now() - formOpenTime;
    if (timeSpentMs < 2000) {
      showGlobalError('Please take a moment to review your note before submitting.');
      return;
    }

    // 4. Rate Limiting Check (Device localStorage count)
    if (isRateLimited()) {
      showGlobalError('You have shared several notes recently. Please wait a little while before submitting another.');
      return;
    }

    // 5. Submit Process: Disable button, show loading spinner
    const submitBtn = document.getElementById('swan-note-submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');

    submitBtn.disabled = true;
    btnText.textContent = 'Sending note with love...';
    btnSpinner.style.display = 'inline-block';

    try {
      const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
      let photoPath = null;

      // Upload photo if attached
      if (compressedPhotoBlob && client) {
        try {
          const fileExt = 'jpg';
          const fileName = `note_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          
          const { data: uploadData, error: uploadErr } = await client.storage
            .from('pending-review-photos')
            .upload(fileName, compressedPhotoBlob, {
              contentType: 'image/jpeg',
              upsert: false
            });

          if (!uploadErr && uploadData?.path) {
            photoPath = uploadData.path;
          } else {
            console.warn('Pending photo upload note:', uploadErr?.message);
          }
        } catch (storageErr) {
          console.warn('Storage upload exception (proceeding without photo):', storageErr);
        }
      }

      // Resolve valid UUID for product_id
      const isValidUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const productId = isValidUUID(productIdRaw) ? productIdRaw : null;

      // Resolve order ID if given
      const orderId = isValidUUID(orderContact) ? orderContact : null;
      const contactInfo = !orderId ? orderContact : null;

      let submissionSuccess = false;

      // A) Primary: Try RPC submit_customer_note
      if (client) {
        try {
          const { data: rpcData, error: rpcErr } = await client.rpc('submit_customer_note', {
            p_type: 'note',
            p_rating: rating,
            p_body: body,
            p_display_name: firstName,
            p_city: city,
            p_product_id: productId,
            p_photo_path: photoPath,
            p_is_public: isPublic,
            p_consent_public: isPublic ? consent : false,
            p_order_id: orderId,
            p_customer_contact: contactInfo,
            p_honeypot: ''
          });

          if (!rpcErr) {
            submissionSuccess = true;
          } else {
            console.warn('RPC submit_customer_note error, attempting table fallback:', rpcErr.message);
          }
        } catch (rpcCallErr) {
          console.warn('RPC call exception:', rpcCallErr);
        }

        // B) Secondary fallback: Direct INSERT into reviews table
        if (!submissionSuccess) {
          try {
            const insertPayload = {
              body: body,
              display_name: firstName,
              city: city,
              rating: rating,
              product_id: productId,
              order_id: orderId,
              photo_path: photoPath,
              is_public: isPublic,
              consent_public: isPublic ? consent : false,
              status: 'pending',
              verified_buyer: false,
              customer_contact: contactInfo,
              // Legacy columns for backward-compat
              comment: body,
              author_name: firstName,
              customer_name: firstName,
              verified_purchase: false,
              created_at: new Date().toISOString()
            };

            const { error: insertErr } = await client
              .from('reviews')
              .insert([insertPayload]);

            if (!insertErr) {
              submissionSuccess = true;
            } else {
              console.warn('Direct table insert failed, trying legacy columns insert:', insertErr.message);
              const legacyPayload = {
                customer_name: firstName,
                comment: body,
                title: `Note from ${firstName}`,
                rating: rating,
                status: 'pending',
                is_verified_buyer: false,
                product_id: productId,
                order_id: orderId,
                customer_email: contactInfo || ''
              };
              const { error: legacyErr } = await client.from('reviews').insert([legacyPayload]);
              if (!legacyErr) {
                submissionSuccess = true;
              } else {
                console.warn('Legacy Supabase insert also failed:', legacyErr.message);
              }
            }
          } catch (directErr) {
            console.warn('Direct insert exception:', directErr);
          }
        }
      }

      // C) Tertiary fallback: /api/reviews endpoint
      if (!submissionSuccess) {
        try {
          const apiRes = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              author_name: firstName,
              display_name: firstName,
              city: city,
              body: body,
              comment: body,
              rating: rating,
              product_id: productId,
              order_id: orderId,
              photo_path: photoPath,
              is_public: isPublic,
              consent_public: isPublic ? consent : false,
              customer_contact: contactInfo
            })
          });
          if (apiRes.ok) {
            submissionSuccess = true;
          }
        } catch (apiErr) {
          console.warn('Local /api/reviews fallback exception:', apiErr);
        }
      }

      if (submissionSuccess) {
        recordSubmissionSuccess();
        clearDraft();
        btnSpinner.style.display = 'none';
        btnText.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="drawn-check" style="margin-right: 6px; display: inline-block;">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Sent with love!</span>
        `;
        submitBtn.style.background = '#16A34A';
        submitBtn.style.borderColor = '#16A34A';
        setTimeout(() => {
          showSuccessView(firstName, isPublic);
          submitBtn.style.background = '';
          submitBtn.style.borderColor = '';
        }, 700);
      } else {
        throw new Error('Could not record your note to database or local storage.');
      }

    } catch (err) {
      console.error('Submission failure:', err);
      showFailureView(err.message, firstName, body, rating);
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = 'Send note with love';
      btnSpinner.style.display = 'none';
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Rate Limiter Helper (Device-Level Max 3 Submissions / Hour)
  // ---------------------------------------------------------------------------
  function isRateLimited() {
    try {
      const records = JSON.parse(localStorage.getItem('swan_recent_notes_v1') || '[]');
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recent = records.filter(ts => ts > oneHourAgo);
      return recent.length >= 3;
    } catch (e) {
      return false;
    }
  }

  function recordSubmissionSuccess() {
    try {
      const records = JSON.parse(localStorage.getItem('swan_recent_notes_v1') || '[]');
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recent = records.filter(ts => ts > oneHourAgo);
      recent.push(Date.now());
      localStorage.setItem('swan_recent_notes_v1', JSON.stringify(recent));
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // 10. UI State Handlers: Error, Success & WhatsApp Fallback
  // ---------------------------------------------------------------------------
  function setError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message;
  }

  function clearErrors() {
    document.querySelectorAll('.form-error-msg').forEach(el => el.textContent = '');
    const globalErr = document.getElementById('note-form-global-error');
    if (globalErr) {
      globalErr.textContent = '';
      globalErr.style.display = 'none';
    }
  }

  function showGlobalError(msg) {
    const el = document.getElementById('note-form-global-error');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function showSuccessView(name, isPublic) {
    const form = document.getElementById('swan-floating-note-form');
    const successView = document.getElementById('note-success-view');
    const heading = document.getElementById('success-name-heading');
    const desc = document.getElementById('success-desc-text');

    form.style.display = 'none';
    heading.textContent = `Thank you, ${escapeHtml(name)}! 🌸`;

    if (isPublic) {
      desc.textContent = 'Bhumika reads every note personally. Public notes appear on the website after she approves them.';
    } else {
      desc.textContent = 'Your private note has been sent directly to Bhumika. Thank you for your warmth and reflection!';
    }

    successView.style.display = 'block';

    // Broadcast event so active reviews or homepage sections can reload if applicable
    window.dispatchEvent(new CustomEvent('swan:note-submitted', {
      detail: { firstName: name, isPublic }
    }));
  }

  function showFailureView(errorMsg, name, noteText, rating) {
    const form = document.getElementById('swan-floating-note-form');
    const failureView = document.getElementById('note-failure-view');
    const errText = document.getElementById('failure-error-msg');
    const waBtn = document.getElementById('failure-whatsapp-btn');

    form.style.display = 'none';
    errText.textContent = errorMsg ? `Error: ${errorMsg}` : 'Connection error. Please try again or send via WhatsApp.';

    // Construct fallback WhatsApp link with note text prefilled
    const waPhone = '919509966512';
    const waMessage = `Hi Bhumika! I wanted to leave a ${rating}-star note for Swan Studio from ${name || 'a customer'}:\n\n"${noteText}"`;
    waBtn.href = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;

    failureView.style.display = 'block';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------------------------------------------------------------------------
  // 11. Public Window API & DOM Ready Hook
  // ---------------------------------------------------------------------------
  window.openNoteModal = openNoteModal;
  window.closeNoteModal = closeNoteModal;
  window.escapeSwanHtml = escapeHtml;

  window.formatSwanDate = function (dateString) {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return '';
    }
  };

  window.renderSwanStars = function (rating, size = 16) {
    const fullStars = Math.floor(rating);
    const hasHalf = (rating - fullStars) >= 0.3 && (rating - fullStars) < 0.8;
    const total = 5;
    let html = '';

    for (let i = 1; i <= total; i++) {
      if (i <= fullStars) {
        html += `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#F5A623" stroke="#D97706" stroke-width="1" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        `;
      } else if (i === fullStars + 1 && hasHalf) {
        const clipId = `half-star-${Math.random().toString(36).substr(2, 6)}`;
        html += `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <clipPath id="${clipId}">
                <rect x="0" y="0" width="12" height="24" />
              </clipPath>
            </defs>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#E5E7EB" stroke="#D1D5DB" stroke-width="1"></polygon>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#F5A623" stroke="#D97706" stroke-width="1" clip-path="url(#${clipId})"></polygon>
          </svg>
        `;
      } else {
        html += `
          <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#E5E7EB" stroke="#D1D5DB" stroke-width="1" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        `;
      }
    }
    return html;
  };

  function initReviewsFloating() {
    renderFloatingButton();
    // Intercept any click on links or buttons with data-open-note-modal or href="#write-review"
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-open-note-modal], [href="#write-review"], [href="#leave-note"], .open-note-modal-btn');
      if (target) {
        e.preventDefault();
        openNoteModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReviewsFloating);
  } else {
    initReviewsFloating();
  }

})();
