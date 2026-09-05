// One shared client instance — used for both public reads (data-live.js) and,
// once signed in, authenticated writes (edit.html). Must load after the
// Supabase CDN script and supabase-config.js, before data-live.js.
//
// window.sb stays null until js/supabase-config.js has real values —
// createClient() throws synchronously on the "YOUR_..." placeholders, so we
// guard against that instead of letting it take down every page's data load.
window.sb = null;
var looksConfigured = SUPABASE_URL && SUPABASE_ANON_KEY &&
  SUPABASE_URL.indexOf('YOUR_') !== 0 && SUPABASE_ANON_KEY.indexOf('YOUR_') !== 0;
if (looksConfigured) {
  try {
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error('Supabase client failed to initialize:', e);
  }
}
