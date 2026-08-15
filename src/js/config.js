// =========================================================
// ENVIRONMENT CONFIGURATION
// Direct Supabase credentials configuration for static client
// =========================================================

export const ENV_CONFIG = {
  SUPABASE_URL: 'https://ixxklhuvflkeefryfsej.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_rqwDELlT8ckXvzmeNglV5w_LbJk5V-C'
};

export const ADMIN_CREDENTIALS = {
  email: 'admin@isbevents.pk',
  password: 'adminpassword123',
  name: 'System Administrator',
  role: 'admin'
};

export async function loadEnvCredentials() {
  return ENV_CONFIG;
}
