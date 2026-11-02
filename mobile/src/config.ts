import Constants from 'expo-constants';

/**
 * Where the app points, read from app.json's `extra`.
 *
 * One place decides this, and a build can override it without anyone editing
 * code. The anon key is public by design -- the web and Android apps ship it
 * too -- and row level security is what protects the data. The service role
 * key has no business anywhere near a phone.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

function required(name: string, value: string | undefined): string {
  if (!value) {
    // A missing value here is a first-run setup mistake, and the symptom
    // without this is a blank screen and a 401 nobody can explain.
    throw new Error(`${name} is missing from app.json > expo.extra`);
  }
  return value;
}

export const API_BASE_URL = required('apiBaseUrl', extra.apiBaseUrl);
export const SUPABASE_URL = required('supabaseUrl', extra.supabaseUrl);
export const SUPABASE_ANON_KEY = required('supabaseAnonKey', extra.supabaseAnonKey);

/**
 * The website. A password-reset email has to land somewhere that can set the
 * new password, and a phone browser cannot hand a session back to this app.
 */
export const WEB_BASE_URL = extra.webBaseUrl ?? 'https://east-market-web.vercel.app';
