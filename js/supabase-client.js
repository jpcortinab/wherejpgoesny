// One shared client instance — used for both public reads (data-live.js) and,
// once signed in, authenticated writes (edit.html). Must load after the
// Supabase CDN script and supabase-config.js, before data-live.js.
window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
