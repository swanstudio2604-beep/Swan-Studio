/**
 * SWAN STUDIO — Supabase Client Configuration Template
 * 
 * INSTRUCTIONS FOR USER:
 * 1. Copy this file to create `js/config.js`:
 *    cp js/config.example.js js/config.js
 * 2. In your Supabase dashboard (https://supabase.com/dashboard/project/hzlimdfxvojkqsszmulj),
 *    navigate to: Project Settings -> API.
 * 3. Copy your publishable "anon public" key.
 * 4. Open `js/config.js` and paste your key replacing 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE'.
 * 
 * STRICT SECURITY RULES:
 * - ONLY paste the `anon` (public) key here. It is safe for browser clients because
 *   Row Level Security (RLS) protects the database.
 * - NEVER paste the `service_role` key, database password, or personal access tokens!
 */

window.SWAN_CONFIG = {
  // Swan Studio Supabase Project URL
  supabaseUrl: 'https://hzlimdfxvojkqsszmulj.supabase.co',

  // PASTE YOUR PUBLISHABLE ANON KEY BETWEEN THE QUOTES:
  supabaseAnonKey: 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE'
};
