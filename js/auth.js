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
      if (error) throw error;
      return session;
    } catch (err) {
      console.warn('Session check failed:', err);
      return null;
    }
  },

  /**
   * Fetches the profile record for the authenticated user from public.profiles.
   * This verifies the true server-side role ('customer' or 'admin').
   */
  async getProfile() {
    const client = getSupabaseClient();
    if (!client) {
      const demoUser = localStorage.getItem('swan_demo_user');
      return demoUser ? JSON.parse(demoUser).profile : null;
    }

    try {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) return null;

      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.warn('Profile read error:', profileError);
        return {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          phone: user.user_metadata?.phone || '',
          role: 'customer'
        };
      }

      return profile;
    } catch (err) {
      console.error('getProfile exception:', err);
      return null;
    }
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

    // 1. Admin Login Verification (via admin ID or email)
    if (isAdmin) {
      const storedAdminPassword = this.getAdminPassword();
      if (password !== storedAdminPassword) {
        localStorage.removeItem('swan_demo_user');
        throw new Error('Invalid Admin credentials. Please check your admin ID and password.');
      }

      const adminProfile = {
        id: 'admin-bhumika-1',
        email: 'swanstudio2604@gmail.com',
        full_name: 'Bhumika Nama',
        phone: '9509966512',
        role: 'admin'
      };
      const adminSession = {
        user: { id: adminProfile.id, email: adminProfile.email },
        profile: adminProfile,
        isDemo: true
      };
      localStorage.setItem('swan_demo_user', JSON.stringify(adminSession));
      return { session: adminSession, profile: adminProfile, isDemo: true };
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
    const { data, error } = await client.auth.signInWithPassword({
      email: cleanId,
      password: password
    });

    if (error) {
      throw new Error(error.message || 'Invalid email or password.');
    }

    // Fetch verified database profile to determine true role
    const { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return { session: data.session, profile, isDemo: false };
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
   * Retrieves the current administrator access password
   */
  getAdminPassword() {
    return localStorage.getItem('swan_admin_password') || 'Bhumika26##';
  },

  /**
   * Updates administrator access password
   */
  setAdminPassword(newPassword) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    localStorage.setItem('swan_admin_password', newPassword);
    return true;
  }
};
