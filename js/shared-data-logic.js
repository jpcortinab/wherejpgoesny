// Shared logic used both by the live data loader and the editor.
// Ports the same rules originally used to build data/data.js from the source
// spreadsheet, so restaurants added/edited live behave identically to seeded ones.

const HOOD_COORDS = {
  "Manhattan|West Village": [40.7358, -74.0036],
  "Manhattan|Upper East Side": [40.7736, -73.9566],
  "Manhattan|Soho": [40.7233, -74.003],
  "Manhattan|Greenwich Village": [40.7336, -74.0027],
  "Manhattan|East Village": [40.7265, -73.9815],
  "Manhattan|Lower East Side": [40.715, -73.9843],
  "Manhattan|Flatiron": [40.741, -73.9896],
  "Manhattan|Noho": [40.728, -73.9925],
  "Manhattan|Chelsea": [40.7465, -74.0014],
  "Manhattan|Midtown East": [40.755, -73.9707],
  "Manhattan|Midtown West": [40.76, -73.988],
  "Manhattan|Nolita": [40.7223, -73.995],
  "Manhattan|Tribeca": [40.7163, -74.0086],
  "Brooklyn|Bushwick": [40.6944, -73.9213],
  "Manhattan|Upper West Side": [40.787, -73.9754],
  "Brooklyn|Williamsburg": [40.7081, -73.9571],
  "Manhattan|FiDi": [40.7075, -74.0113],
  "Manhattan|Chinatown": [40.7158, -73.997],
  "Brooklyn|Greenpoint": [40.7305, -73.9515],
  "Brooklyn|Brooklyn Heights": [40.6958, -73.9936],
  "Queens|Flushing": [40.7654, -73.8318],
  "Manhattan|Harlem": [40.8116, -73.9465],
  "Brooklyn|DUMBO": [40.7033, -73.9887],
  "Queens|Jackson Heights": [40.7556, -73.883],
  "Queens|Long Island City": [40.7447, -73.9485],
  "Manhattan|Hudson Yards": [40.7538, -74.0022],
  "Brooklyn|Bedford-Stuyvesant": [40.6872, -73.9418],
  "Staten Island|Staten Island": [40.5795, -74.1502],
  "Brooklyn|Red Hook": [40.6743, -74.0107],
  "Manhattan|Rockefeller Center": [40.7587, -73.9787],
  "Queens|Elmhurst": [40.7362, -73.8801],
  "Queens|Ridgewood": [40.7043, -73.9018],
  "Queens|Ozone": [40.6803, -73.837],
  "Bronx|Fordham Heights": [40.861, -73.903],
  "Brooklyn|Carroll Gardens": [40.6799, -73.9997],
  "Brooklyn|New Lots": [40.6656, -73.8815],
  "Brooklyn|Downtown Brooklyn": [40.6913, -73.9847],
  "Brooklyn|Sunset Park": [40.6459, -74.0107],
  "Brooklyn|Bensonhurst": [40.6026, -73.9954],
  "Brooklyn|Sheepshead Bay": [40.5946, -73.9433],
  "Brooklyn|Fort Greene": [40.6896, -73.9745],
  "Brooklyn|Gravesend": [40.5946, -73.9738],
  "Manhattan|Murray Hill": [40.7479, -73.9776],
  "Manhattan|Hudson Square": [40.7255, -74.0089],
  "Queens|Forest Hills": [40.7196, -73.8448],
  "Queens|Astoria": [40.7643, -73.9235],
  "Queens|South Ozone": [40.6764, -73.8093],
  "Queens|South Ozone Park": [40.6764, -73.8103]
};

const MOOD_OPTIONS = [
  "Casual", "Elevated Casual", "Nice", "Formal", "Fine Dining", "Street / Quick", "Bar & Drinks"
];

const BUDGET_OPTIONS = ["$", "$$", "$$$", "$$$$", "$$$$$"];

function coordsFor(borough, hood) {
  return HOOD_COORDS[borough + "|" + hood] || [null, null];
}

function computeRecScore(rec) {
  if (!rec) return 0;
  var s = String(rec).trim();
  var bangs = (s.match(/!/g) || []).length;
  var up = s.toUpperCase();
  if (up.indexOf("NEVER") !== -1) return -3;
  if (up.indexOf("NO") === 0) return -1 - 0.4 * bangs;
  if (up.indexOf("NEH") !== -1) return -0.5;
  if (up.indexOf("MEH") !== -1) return 0.5;
  if (up.indexOf("MM") === 0) return 1.5;
  if (up.indexOf("YES") === 0) return 2 + 0.4 * bangs;
  return 1;
}

function computeCostLevel(cost) {
  return cost ? cost.length : null;
}

// Builds NEIGHBORHOODS (aggregated per borough+hood) from a flat RESTAURANTS array —
// same shape/rules as the one-time Python build used for the original static site.
function computeNeighborhoods(restaurants) {
  var byHood = {};
  restaurants.forEach(function (r) {
    var key = r.borough + "|" + r.hood;
    if (!byHood[key]) byHood[key] = { borough: r.borough, hood: r.hood, spots: [] };
    byHood[key].spots.push(r);
  });
  return Object.keys(byHood).map(function (key) {
    var g = byHood[key];
    var rated = g.spots.filter(function (s) { return s.rated; });
    var topRating = rated.length ? Math.max.apply(null, rated.map(function (s) { return s.stars; })) : null;
    var best = topRating !== null
      ? rated.filter(function (s) { return s.stars === topRating; }).sort(function (a, b) { return b.recScore - a.recScore; })
      : [];
    var coord = coordsFor(g.borough, g.hood);
    return {
      borough: g.borough,
      hood: g.hood,
      count: g.spots.length,
      topRating: topRating,
      bestSpots: best.slice(0, 3).map(function (s) { return s.name; }),
      lat: coord[0],
      lng: coord[1]
    };
  }).sort(function (a, b) { return b.count - a.count; });
}

function computeMeta(restaurants, lastUpdated) {
  var boroughs = {}, types = {}, moods = {};
  var rated = 0;
  restaurants.forEach(function (r) {
    if (r.borough) boroughs[r.borough] = true;
    if (r.type) types[r.type] = true;
    if (r.mood) moods[r.mood] = true;
    if (r.rated) rated++;
  });
  return {
    boroughs: Object.keys(boroughs).sort(),
    types: Object.keys(types).sort(),
    moods: Object.keys(moods).sort(),
    totalCount: restaurants.length,
    ratedCount: rated,
    lastUpdated: lastUpdated
  };
}
