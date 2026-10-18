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

    if (!client) {
      // Local Demo Mode Simulation
      const demoProfile = {
        id: 'demo-user-' + Date.now(),
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        phone: phone ? phone.trim() : '',
        role: 'customer' // Always customer
      };
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
      email: email.trim().toLowerCase(),
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
      throw new Error('Please enter both email and password.');
    }

    if (!client) {
      // Local / GitHub Pages Demo Login Simulation
      const cleanEmail = email.trim().toLowerCase();
      const isDemoAdmin = cleanEmail === 'swanstudio2604@gmail.com';

      if (isDemoAdmin) {
        // Enforce verified admin password (default: Bhumika26##)
        const storedAdminPassword = localStorage.getItem('swan_admin_password') || 'Bhumika26##';
        if (password !== storedAdminPassword) {
          localStorage.removeItem('swan_demo_user');
          throw new Error('Invalid email or password.');
        }

        const demoProfile = {
          id: 'admin-bhumika-1',
          email: cleanEmail,
          full_name: 'Bhumika Nama',
          phone: '9509966512',
          role: 'admin'
        };
        const demoSession = {
          user: { id: demoProfile.id, email: demoProfile.email },
          profile: demoProfile,
          isDemo: true
        };
        localStorage.setItem('swan_demo_user', JSON.stringify(demoSession));
        return { session: demoSession, profile: demoProfile, isDemo: true };
      }

      // Customer demo login
      const demoProfile = {
        id: 'demo-user-1',
        email: cleanEmail,
        full_name: 'Demo Customer',
        phone: '9509966512',
        role: 'customer'
      };
      const demoSession = {
        user: { id: demoProfile.id, email: demoProfile.email },
        profile: demoProfile,
        isDemo: true
      };
      localStorage.setItem('swan_demo_user', JSON.stringify(demoSession));
      return { session: demoSession, profile: demoProfile, isDemo: true };
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
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
  async signOut() {
    const client = getSupabaseClient();
    localStorage.removeItem('swan_demo_user');

    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Signout error:', err);
      }
    }

    window.location.href = 'index.html';
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
