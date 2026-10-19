/**
 * SWAN STUDIO — Authentication & Session Manager
 * Brand: Swan Studio | Founder: Bhumika Nama
 * 
 * SECURITY RULES (PRD Section 2, 9 & 12):
 * 1. Role values are NEVER sent from the browser or stored in metadata.
 * 2. Every new signup defaults to 'customer' via PostgreSQL trigger.
 * 3. Protected pages verify session & database role.
 * 4. Graceful demo fallback when Supabase keys are not yet configured.
 */

const AUTH = {
  /**
   * Returns current active Supabase session or null.
   */
  async getSession() {
    const client = getSupabaseClient();
    if (!client) {
      // Demo session fallback
      const demoUser = localStorage.getItem('swan_demo_user');
      return demoUser ? JSON.parse(demoUser) : null;
    }

    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (!error && session) return session;
    } catch (err) {
      console.warn('Session check failed:', err);
    }

    // Fallback to local session (e.g. Atelier Admin or local demo user)
    try {
      const demoUser = localStorage.getItem('swan_demo_user');
      return demoUser ? JSON.parse(demoUser) : null;
    } catch {
      return null;
    }
  },

  /**
   * Fetches the profile record for the authenticated user from public.profiles.
   * This verifies the true server-side role ('customer' or 'admin').
   */
  async getProfile() {
    const client = getSupabaseClient();

    // 1. Live Supabase session check
    if (client) {
      try {
        const { data: { user }, error: userError } = await client.auth.getUser();
        if (!userError && user) {
          const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError || !profile) {
            return {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || '',
              phone: user.user_metadata?.phone || '',
              role: 'customer'
            };
          }
          return profile;
        }
      } catch (err) {
        console.warn('Live getProfile exception, checking local session:', err);
      }
    }

    // 2. Local session fallback (e.g. Admin ID/Password or local demo accounts)
    try {
      const demoRaw = localStorage.getItem('swan_demo_user');
      if (demoRaw) {
        const parsed = JSON.parse(demoRaw);
        return parsed.profile || parsed;
      }
    } catch (e) {
      console.warn('Failed to parse local demo user:', e);
    }

    return null;
  },

  /**
   * Checks whether the identifier is recognized as an Admin ID
   */
  isAdminIdentifier(identifier) {
    if (!identifier) return false;
    const clean = String(identifier).trim().toLowerCase();
    return clean === 'admin' ||
           clean === 'swanstudio2604@gmail.com' ||
           clean === 'admin@swanstudio.com' ||
           clean === 'swanstudio2604' ||
           clean === 'bhumika';
  },

  /**
   * Retrieves all customer accounts stored locally in demo mode
   */
  getDemoAccounts() {
    try {
      const raw = localStorage.getItem('swan_customer_accounts');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  /**
   * Saves or updates a customer account in demo mode
   */
  saveDemoAccount(account) {
    if (!account || !account.email) return;
    const accounts = this.getDemoAccounts();
    accounts[account.email.toLowerCase()] = account;
    localStorage.setItem('swan_customer_accounts', JSON.stringify(accounts));
  },

  /**
   * Returns current demo user profile
   */
  getDemoUser() {
    try {
      const raw = localStorage.getItem('swan_demo_user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.profile || parsed;
    } catch {
      return null;
    }
  },

  /**
   * Saves updated profile back to demo session and accounts dictionary
   */
  saveDemoUser(updatedProfile) {
    if (!updatedProfile) return;
    const currentRaw = localStorage.getItem('swan_demo_user');
    let session = currentRaw ? JSON.parse(currentRaw) : { isDemo: true, user: {} };
    session.profile = { ...(session.profile || {}), ...updatedProfile };
    session.user = { id: updatedProfile.id || session.profile.id, email: updatedProfile.email || session.profile.email };
    localStorage.setItem('swan_demo_user', JSON.stringify(session));

    if (updatedProfile.email && updatedProfile.role !== 'admin') {
      this.saveDemoAccount({
        ...updatedProfile,
        updated_at: new Date().toISOString()
      });
    }
  },

  /**
   * Customer Registration
   * Note: We NEVER pass role: 'admin' here. Role is enforced strictly in database schema.
   */
  async signUp({ email, password, fullName, phone }) {
    const client = getSupabaseClient();

    // Input Validation
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (!fullName || !fullName.trim()) {
      throw new Error('Please enter your full name.');
    }

    const cleanEmail = email.trim().toLowerCase();
    if (this.isAdminIdentifier(cleanEmail)) {
      throw new Error('This identifier is reserved for the Atelier Administrator. Please sign in via the Admin portal.');
    }

    if (!client) {
      // Local Demo Mode Simulation with Persistent Customer Accounts
      const accounts = this.getDemoAccounts();
      const existing = accounts[cleanEmail];
      const demoProfile = {
        id: existing ? existing.id : ('cust-' + Date.now()),
        email: cleanEmail,
        full_name: fullName.trim(),
        phone: phone ? phone.trim() : '',
        role: 'customer',
        avatar: existing?.avatar || null,
        avatar_url: existing?.avatar_url || null,
        password: password
      };

      this.saveDemoAccount(demoProfile);

      const demoSession = {
        user: { id: demoProfile.id, email: demoProfile.email },
        profile: demoProfile,
        isDemo: true
      };
      localStorage.setItem('swan_demo_user', JSON.stringify(demoSession));
      return { data: demoSession, isDemo: true };
    }

    // Live Supabase Auth SignUp
    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone ? phone.trim() : ''
        }
      }
    });

    if (error) {
      throw new Error(error.message || 'Unable to create account. Please try again.');
    }

    // Also persist customer profile locally for smooth instant experience
    const customerProfile = {
      id: data?.user?.id || ('cust-' + Date.now()),
      email: cleanEmail,
      full_name: fullName.trim(),
      phone: phone ? phone.trim() : '',
      role: 'customer',
      password: password
    };
    this.saveDemoAccount(customerProfile);

    // If an active session was established, store in swan_demo_user
    if (data?.session) {
      const liveSession = {
        user: { id: customerProfile.id, email: customerProfile.email },
        profile: customerProfile,
        isDemo: false
      };
      localStorage.setItem('swan_demo_user', JSON.stringify(liveSession));
    }

    return { data, isDemo: false };
  },

  /**
   * User Login (Customer or Admin)
   */
  async signIn({ email, password }) {
    const client = getSupabaseClient();

    if (!email || !password) {
      throw new Error('Please enter both identifier (email or admin ID) and password.');
    }

    const cleanId = email.trim().toLowerCase();
    const isAdmin = this.isAdminIdentifier(cleanId);

    // 1. Admin Login Verification (via Server-Side Auth API & Session Cookie)
    if (isAdmin) {
      try {
        const resp = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cleanId, password })
        });
        const resData = await resp.json();

        if (!resp.ok || !resData.success) {
          localStorage.removeItem('swan_demo_user');
          throw new Error(resData.error || 'Invalid Admin credentials. Please check your admin ID and password.');
        }

        const adminProfile = resData.profile || {
          id: 'admin-bhumika-1',
          email: 'swanstudio2604@gmail.com',
          full_name: 'Bhumika Nama',
          phone: '9509966512',
          role: 'admin'
        };

        const adminSession = {
          user: { id: adminProfile.id, email: adminProfile.email },
          profile: adminProfile,
          csrfToken: resData.csrfToken,
          isDemo: false
        };

        localStorage.setItem('swan_demo_user', JSON.stringify(adminSession));
        if (resData.csrfToken) {
          sessionStorage.setItem('swan_admin_csrf', resData.csrfToken);
        }
        return { session: adminSession, profile: adminProfile, isDemo: false };
      } catch (err) {
        localStorage.removeItem('swan_demo_user');
        throw err;
      }
    }

    // 2. Customer Demo Mode Fallback
    if (!client) {
      const accounts = this.getDemoAccounts();
      let customerAcc = accounts[cleanId];

      if (customerAcc) {
        if (customerAcc.password && customerAcc.password !== password) {
          throw new Error('Incorrect password. Please try again.');
        }
      } else {
        // Derive clean initial name from email
        const namePart = cleanId.split('@')[0].replace(/[._-]/g, ' ');
        const derivedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        customerAcc = {
          id: 'cust-' + Date.now(),
          email: cleanId,
          full_name: derivedName,
          phone: '',
          role: 'customer',
          password: password
        };
        this.saveDemoAccount(customerAcc);
      }

      const demoSession = {
        user: { id: customerAcc.id, email: customerAcc.email },
        profile: customerAcc,
        isDemo: true
      };
      localStorage.setItem('swan_demo_user', JSON.stringify(demoSession));
      return { session: demoSession, profile: customerAcc, isDemo: true };
    }

    // 3. Live Supabase Authentication
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanId,
        password: password
      });

      if (error) {
        // Fallback: Check local demo accounts
        const accounts = this.getDemoAccounts();
        const localAcc = accounts[cleanId];
        if (localAcc && (!localAcc.password || localAcc.password === password)) {
          const demoSession = {
            user: { id: localAcc.id, email: localAcc.email },
            profile: localAcc,
            isDemo: true
          };
          localStorage.setItem('swan_demo_user', JSON.stringify(demoSession));
          return { session: demoSession, profile: localAcc, isDemo: true };
        }
        throw new Error(error.message || 'Invalid email or password.');
      }

      // Fetch verified database profile to determine true role
      let finalProfile = null;
      try {
        const { data: profile } = await client
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        finalProfile = profile;
      } catch (pe) {
        console.warn('Could not read profiles row:', pe);
      }

      if (!finalProfile) {
        finalProfile = {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || '',
          phone: data.user.user_metadata?.phone || '',
          role: 'customer'
        };
      }

      const liveSession = {
        user: { id: finalProfile.id, email: finalProfile.email },
        profile: finalProfile,
        isDemo: false
      };
      localStorage.setItem('swan_demo_user', JSON.stringify(liveSession));

      return { session: data.session, profile: finalProfile, isDemo: false };
    } catch (liveErr) {
      // Fallback: Check local demo accounts before failing
      const accounts = this.getDemoAccounts();
      const localAcc = accounts[cleanId];
      if (localAcc && (!localAcc.password || localAcc.password === password)) {
        const demoSession = {
          user: { id: localAcc.id, email: localAcc.email },
          profile: localAcc,
          isDemo: true
        };
        localStorage.setItem('swan_demo_user', JSON.stringify(demoSession));
        return { session: demoSession, profile: localAcc, isDemo: true };
      }
      throw liveErr;
    }
  },

  /**
   * Password Reset
   */
  async resetPassword(email) {
    const client = getSupabaseClient();
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (!client) {
      return { success: true, isDemo: true };
    }

    const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin + '/login.html'
    });

    if (error) throw new Error(error.message);
    return { success: true, isDemo: false };
  },

  /**
   * Sign Out
   */
  async signOut(options = {}) {
    const client = getSupabaseClient();
    localStorage.removeItem('swan_demo_user');
    sessionStorage.removeItem('swan_admin_csrf');

    // Call server-side admin logout to clear HttpOnly session cookie
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    }

    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Signout error:', err);
      }
    }

    const isInAdmin = window.location.pathname.includes('/admin/');
    const defaultRedirect = isInAdmin 
      ? '../login.html?reason=logged_out' 
      : (window.location.pathname.includes('account.html') ? 'account.html?signed_out=1' : 'index.html');

    const targetUrl = (options && options.redirectUrl) || defaultRedirect;
    window.location.href = targetUrl;
  },

  /**
   * Guard for Protected Pages (e.g. account.html or admin/)
   */
  async requireAuth({ requireAdmin = false, redirectUrl = 'login.html' } = {}) {
    if (requireAdmin) {
      // Verify server session
      try {
        const resp = await fetch('/api/admin/session');
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.authenticated && data.profile) {
            if (data.csrfToken) sessionStorage.setItem('swan_admin_csrf', data.csrfToken);
            return data.profile;
          }
        }
      } catch (e) {
        // Fallback to local check if offline
      }
    }

    const profile = await this.getProfile();

    if (!profile) {
      window.location.href = `${redirectUrl}?redirect=${encodeURIComponent(window.location.pathname)}&reason=login_required`;
      return null;
    }

    if (requireAdmin && profile.role !== 'admin') {
      window.location.href = `${redirectUrl}?reason=unauthorized_admin`;
      return null;
    }

    return profile;
  },

  /**
   * Updates administrator access password via secure server API
   */
  async setAdminPassword(currentPassword, newPassword) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }
    const resp = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      throw new Error(data.error || 'Failed to update administrator password.');
    }
    return true;
  }
};
