// Loads restaurant data live from Supabase (instead of a static data.js
// snapshot), so edits made in edit.html are visible to everyone immediately.
// Fires a `data:ready` event on document once RESTAURANTS/NEIGHBORHOODS/META
// are populated — every page's init code waits for that before rendering.

function mapRow(row) {
  var stars = row.stars === null || row.stars === undefined ? null : row.stars;
  var coord = coordsFor(row.borough, row.hood);
  return {
    id: row.id,
    borough: row.borough,
    hood: row.hood,
    name: row.name,
    type: row.type,
    stars: stars,
    rated: stars !== null,
    cost: row.cost,
    costLevel: computeCostLevel(row.cost),
    mood: row.mood,
    rec: row.rec,
    recScore: computeRecScore(row.rec),
    dos: row.dos,
    donts: row.donts,
    rez: row.rez,
    misc: row.misc,
    topPick: !!row.top_pick,
    description: row.description,
    descriptionSource: row.description_source || "generic",
    lat: row.lat !== undefined ? row.lat : coord[0],
    lng: row.lng !== undefined ? row.lng : coord[1]
  };
}

function loadLiveData() {
  window.sb
    .from("restaurants")
    .select("*")
    .order("id")
    .then(function (res) {
      if (res.error) throw res.error;
      var restaurants = res.data.map(mapRow);
      var latest = restaurants.reduce(function (max, r) { return r.id > max ? r.id : max; }, 0);
      window.RESTAURANTS = restaurants;
      window.NEIGHBORHOODS = computeNeighborhoods(restaurants);
      window.META = computeMeta(restaurants, new Date().toISOString().slice(0, 10));
      document.dispatchEvent(new Event("data:ready"));
    })
    .catch(function (err) {
      console.error("Failed to load live data:", err);
      showDataErrorBanner();
      document.dispatchEvent(new CustomEvent("data:error", { detail: err }));
    });
}

function showDataErrorBanner() {
  var el = document.createElement("div");
  el.style.cssText = "position:sticky;top:0;z-index:100;background:#b8283a;color:#fff;text-align:center;padding:10px 16px;font:600 14px/1.4 sans-serif;";
  el.textContent = "Couldn't load restaurant data — check that js/supabase-config.js has your real project URL/key, and that supabase/schema.sql has been run.";
  document.body.prepend(el);
}

document.addEventListener("DOMContentLoaded", loadLiveData);
