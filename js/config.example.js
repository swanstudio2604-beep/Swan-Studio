/**
 * SWAN STUDIO — Supabase Frontend Configuration Example
 * 
 * INSTRUCTIONS FOR DEVELOPER:
 * 1. Create your free project on https://supabase.com
 * 2. Go to Project Settings -> API
 * 3. Copy your "Project URL" and your "Publishable (anon) API Key"
 * 4. Paste them into js/supabase.js (NEVER use or expose the service_role secret key!)
 */

const SUPABASE_CONFIG = {
  // Your unique Supabase Project URL (e.g. 'https://xyzabcdefgh.supabase.co')
  url: 'YOUR_SUPABASE_PROJECT_URL',

  // Your public/anon API key (Safe for public browser code protected by RLS)
  anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
