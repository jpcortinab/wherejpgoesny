(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const app = window.JPArt;
  if (!app) return;
  const config = window.JP_ART_CLOUD || {};
  const configured = Boolean(config.url && config.anonKey && window.supabase?.createClient);
  let client = null, user = null, timer = null, busy = false;

  function message(text) { $('cloudStatus').textContent = text; }
  function status(text) { $('cloudBtn').textContent = text; }
  function ui() {
    $('cloudLoginForm').hidden = !configured || Boolean(user);
    $('cloudSignedIn').hidden = !user;
    $('cloudSetup').hidden = configured;
    if (user) {
      $('cloudAccount').textContent = user.email || 'Signed in';
      status('☁ Sync on');
    } else {
      status(configured ? '☁ Connect sync' : '⇄ Sync / share');
    }
    if (!configured) message('Cloud sync is not connected yet. Your visits still save in this browser. Use a transfer link to move your list to another device.');
    else if (!user) message('Sign in with an email link to keep your watchlist and visited shows in sync across devices.');
  }
  async function upload() {
    if (!user || busy) return;
    busy = true;
    status('☁ Syncing…');
    const payload = app.getState();
    try {
      const {error} = await client.from('art_tracker_state').upsert({user_id:user.id,payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      if (error) throw error;
      message('Saved to your private cloud watchlist.');
      status('☁ Synced ✓');
    } catch (error) {
      message('Could not sync right now. Your changes remain saved in this browser. ' + error.message);
      status('☁ Sync offline');
    } finally {
      busy = false;
    }
  }
  async function download() {
    if (!user || busy) return;
    if (timer) {clearTimeout(timer);timer=null;await upload();}
    busy = true;
    try {
      const {data,error} = await client.from('art_tracker_state').select('payload').eq('user_id',user.id).maybeSingle();
      if (error) throw error;
      if (!data) {
        busy=false;
        await upload();
        return;
      }
      if (data.payload && JSON.stringify(data.payload)!==JSON.stringify(app.getState())) {
        try {localStorage.setItem('jp-art-before-cloud-restore',JSON.stringify(app.getState()));}catch(_){}
        app.setState(data.payload, false);
      }
      message('Cloud watchlist loaded. This browser is now up to date.');
      status('☁ Synced ✓');
    } catch (error) {
      message('Could not load cloud data. Your local watchlist is safe. ' + error.message);
      status('☁ Sync offline');
    } finally {
      busy=false;
    }
  }
  async function signedIn(account) {
    user=account;
    ui();
    if (user) await download();
  }
  async function startCloud() {
    if (!configured) {ui();return;}
    try {
      client=window.supabase.createClient(config.url,config.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data,error}=await client.auth.getUser();
      if (error && !/session missing|auth session missing/i.test(error.message)) message(error.message);
      if (data?.user) await signedIn(data.user);
      else ui();
      client.auth.onAuthStateChange((event,session)=>{
        if (event==='SIGNED_IN' && session?.user && session.user.id!==user?.id) setTimeout(()=>signedIn(session.user),0);
        if (event==='SIGNED_OUT') {user=null;ui();}
      });
      document.addEventListener('jp-art-changed',()=>{
        if (!user) return;
        clearTimeout(timer);timer=setTimeout(()=>{timer=null;upload();},800);
      });
      document.addEventListener('visibilitychange',()=>{if(!document.hidden && user && !timer)download();});
    } catch(error) {message('Cloud sync could not start. Local saving remains available.');status('☁ Sync offline');}
  }
  function encode(data) {
    const bytes=new TextEncoder().encode(JSON.stringify(data));
    let binary='';for (const b of bytes) binary+=String.fromCharCode(b);
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function decode(data) {
    const padded=data.replace(/-/g,'+').replace(/_/g,'/');
    const bytes=Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  async function share() {
    if (location.protocol==='file:') {message('Open the hosted website to create a transfer link.');return;}
    const data={version:1,month:app.getMonth(),state:app.getState()};
    const encoded=encode(data);
    if (encoded.length>18000) {message('This list is too large for a link. Use Save backup / Import JSON instead.');return;}
    const url=location.origin+location.pathname+'#transfer='+encoded;
    try {
      await navigator.clipboard.writeText(url);
      message('Transfer link copied! Open it on your other device to import this snapshot. Anyone with the link can see the list.');
    } catch(error) {
      window.prompt('Copy this transfer link:',url);
      message('This is a one-time snapshot, not automatic sync.');
    }
  }
  function maybeImportLink() {
    if (!location.hash.startsWith('#transfer=')) return;
    const raw=location.hash.slice('#transfer='.length);
    try { history.replaceState(null,'',location.pathname+location.search+'#watchlist'); } catch (_) { /* Keep the transfer hash if this environment disallows History API. */ }
    if(raw.length>25000){message('That transfer link is too long.');return;}
    try {
      const entry=decode(raw);
      if(!entry || entry.version!==1 || !entry.state || !/^\d{4}-\d{2}$/.test(entry.month||''))throw new Error('Invalid data');
      if(!window.confirm('Import the watchlist from this link? It will replace the list saved in this browser.'))return;
      try {localStorage.setItem('jp-art-before-transfer',JSON.stringify(app.getState()));}catch(_){}
      app.setState(entry.state,true);
      app.setMonth(entry.month);
      message('Watchlist imported. Your exhibitions and visited status are now on this device.');
      $('cloudDialog').showModal();
    } catch(error) {message('Could not import this transfer link.');$('cloudDialog').showModal();}
  }
  $('cloudBtn').addEventListener('click',()=>{$('cloudDialog').showModal();ui();});
  $('closeCloud').addEventListener('click',()=>$('cloudDialog').close());
  $('cloudDialog').addEventListener('click',e=>{if(e.target===$('cloudDialog'))$('cloudDialog').close();});
  $('copyTransfer').addEventListener('click',share);
  $('cloudLoginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    if (!client) return;
    const email=$('cloudEmail').value.trim();
    if(!email)return;
    const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
    message(error ? 'Could not send sign-in email: '+error.message : 'Check your email for a secure sign-in link.');
  });
  $('cloudUpload').addEventListener('click',async()=>{
    if(!window.confirm('Replace the cloud watchlist with the exhibitions saved on this device?'))return;
    await upload();
  });
  $('cloudDownload').addEventListener('click',download);
  $('cloudSignOut').addEventListener('click',async()=>{if(client)await client.auth.signOut();user=null;ui();});
  window.addEventListener('hashchange',maybeImportLink);
  ui();
  maybeImportLink();
  startCloud();
})();