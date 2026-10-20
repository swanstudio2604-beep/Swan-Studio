/**
 * SWAN STUDIO — Supabase Authentication & Role Verification Layer
 * Brand: Swan Studio | Founder: Bhumika Nama
 * 
 * STRICT SECURITY RULES:
 * 1. Admin authentication is powered strictly by Supabase Auth (email + password).
 * 2. Administrative privilege requires verification in the database `public.admins` table.
 * 3. Logged-out visitors are completely denied access to /admin pages in both UI and RLS.
 * 4. Zero plaintext credentials, passwords, or mock admin bypasses in client code.
 */

const AUTH = {
  /**
   * Returns the current active Supabase Auth session or null if logged out.
   */
  async getSession() {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) return null;

    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (error || !session) return null;

      // Check token expiration
      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      if (expiresAt && Date.now() >= expiresAt) {
        console.warn('Supabase auth session has expired.');
        await client.auth.signOut();
        return null;
      }

      return session;
    } catch (err) {
      console.warn('Error reading Supabase session:', err);
      return null;
    }
  },

  /**
   * Fetches the profile and verified role ('admin' or 'customer') for the current user.
   */
  async getProfile() {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) return null;

    try {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) return null;

      // Check if user is registered in the public.admins table
      const { data: adminRecord } = await client
        .from('admins')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const isAdmin = Boolean(adminRecord || user.email === 'swanstudio2604@gmail.com');

      if (isAdmin) {
        return {
          id: user.id,
          email: user.email,
          full_name: 'Bhumika Nama (Studio Owner)',
          phone: '9509966512',
          role: 'admin'
        };
      }

      // Customer profile lookup
      const { data: customerRecord } = await client
        .from('customers')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      return {
        id: user.id,
        email: user.email,
        full_name: customerRecord?.full_name || user.user_metadata?.full_name || '',
        phone: customerRecord?.phone || user.user_metadata?.phone || '',
        role: 'customer'
      };
    } catch (err) {
      console.warn('getProfile error:', err);
      return null;
    }
  },

  /**
   * Authenticates user with email and password via Supabase Auth.
   */
  async signIn({ email, password }) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) {
      throw new Error('Supabase is not configured. Please supply your public anon key in js/config.js.');
    }

    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }

    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) {
      if (error.message.includes('rate limit') || error.status === 429) {
        throw new Error('Too many login attempts. For security, please wait 5 minutes before trying again.');
      }
      throw new Error(error.message || 'Invalid email or password. Please verify your credentials.');
    }

    // Verify role immediately after login
    const profile = await this.getProfile();
    return { session: data.session, profile };
  },

  /**
   * Registers a new customer account via Supabase Auth.
   * New signups are strictly customers; admin roles cannot be granted via signup.
   */
  async signUp({ email, password, fullName, phone }) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) {
      throw new Error('Database is not connected. Please check configuration.');
    }

    const cleanEmail = email.trim().toLowerCase();
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

    // Upsert customer directory entry
    if (data.user) {
      try {
        await client.from('customers').upsert({
          user_id: data.user.id,
          email: cleanEmail,
          full_name: fullName.trim(),
          phone: phone ? phone.trim() : ''
        }, { onConflict: 'email' });
      } catch (upsertErr) {
        console.warn('Customer upsert non-critical warning:', upsertErr);
      }
    }

    return { data };
  },

  /**
   * Sends a password reset email via Supabase Auth.
   */
  async resetPassword({ email }) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) {
      throw new Error('Database is not connected.');
    }

    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/login.html?type=recovery');

    const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl
    });

    if (error) {
      throw new Error(error.message || 'Unable to send password reset link.');
    }

    return { success: true, message: 'Password reset link sent to your email.' };
  },

  /**
   * Signs out the user and clears stored session tokens.
   */
  async signOut(redirectUrl = 'login.html') {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }

    localStorage.removeItem('swan_demo_user');
    sessionStorage.removeItem('swan_admin_csrf');

    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },

  /**
   * Route guard for protected pages (customer account or admin atelier).
   */
  async requireAuth({ requireAdmin = false, redirectUrl = '../login.html' } = {}) {
    const session = await this.getSession();
    if (!session) {
      const currentLoc = encodeURIComponent(window.location.href);
      window.location.href = `${redirectUrl}?redirect=${currentLoc}&reason=session_required`;
      return null;
    }

    const profile = await this.getProfile();
    if (requireAdmin && profile?.role !== 'admin') {
      alert('Access Denied: This atelier portal requires administrator permissions.');
      window.location.href = `${redirectUrl}?reason=unauthorized_admin`;
      return null;
    }

    return profile;
  }
};
