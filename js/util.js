// Shared helpers used across pages. Expects RESTAURANTS / NEIGHBORHOODS / META
// from data.js to already be loaded on the page.

function starsHtml(stars) {
  if (stars === null || stars === undefined) return '<span class="faint">not yet rated</span>';
  var full = '★★★★★'.slice(0, stars);
  var dim = '★★★★★'.slice(stars);
  return '<span class="stars">' + full + '<span class="dim">' + dim + '</span></span>';
}

function costLabel(cost) {
  return cost ? cost : '';
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function recPillHtml(spot) {
  if (!spot.rec) return '';
  var cls = 'pill-neutral';
  if (spot.recScore >= 2) cls = 'pill-good';
  else if (spot.recScore >= 0.5) cls = 'pill-gold';
  else if (spot.recScore < 0) cls = 'pill-bad';
  // Labeled as a personal call on purpose — it's separate from the stars. A
  // 5★ place can still get a "meh" here (e.g. a perennial best-restaurant
  // winner or a $400 prix fixe isn't something I'd actually "recommend").
  return '<span class="pill ' + cls + '" title="My personal recommendation — would I actually tell a friend to go? Separate from the star rating.">My rec: ' + escapeHtml(spot.rec) + '</span>';
}

// The one place the "what does My rec mean" explanation lives. Shown at the
// top of every page that lists restaurant cards (see data-rec-note placeholders
// and the quiz results), so edit the wording here and it updates everywhere.
function recNoteHtml() {
  return (
    '<div class="rec-note">' +
      '<div><b>How to read &ldquo;My rec&rdquo;:</b> the stars are how good a place is. ' +
      '<b>My rec</b> is whether I&rsquo;d personally tell a friend to go &mdash; so a 5&#9733; spot can still get a &ldquo;meh&rdquo; from me. ' +
      'I won&rsquo;t &ldquo;recommend&rdquo; a restaurant that&rsquo;s been voted best in the city year after year, or a $400 prix fixe &mdash; that would be a little absurd.</div>' +
      '<div class="rec-note-example">' + starsHtml(5) +
        '<span class="pill pill-gold">My rec: MEH</span>' +
        '<span>= extraordinary, just not something I&rsquo;d send you to.</span></div>' +
    '</div>'
  );
}

function setupRecNotes() {
  document.querySelectorAll('[data-rec-note]').forEach(function (el) {
    el.innerHTML = recNoteHtml();
  });
}

function moodPillHtml(spot) {
  if (!spot.mood) return '';
  return '<span class="pill pill-neutral">' + escapeHtml(spot.mood) + '</span>';
}

function mofePillHtml(spot) {
  if (!spot.topPick) return '';
  return '<span class="pill pill-accent" title="Mofe — an intangible swagger a place has, beyond the food">✦ Mofe</span>';
}

function closedPillHtml(spot) {
  if (!spot.closed) return '';
  return '<span class="pill pill-bad">Permanently closed</span>';
}

function spotCardHtml(spot, opts) {
  opts = opts || {};
  var notes = [];
  if (spot.dos) notes.push('<div><b>Order:</b> ' + escapeHtml(spot.dos) + '</div>');
  if (spot.donts) notes.push('<div><b>Skip:</b> ' + escapeHtml(spot.donts) + '</div>');
  if (spot.rez) notes.push('<div><b>Reservation:</b> ' + escapeHtml(spot.rez) + '</div>');
  if (spot.misc) notes.push('<div><b>Note:</b> ' + escapeHtml(spot.misc) + '</div>');

  var locLine = opts.hideLocation
    ? ''
    : '<div class="spot-meta">' + escapeHtml(spot.hood) + ', ' + escapeHtml(spot.borough) + '</div>';

  var descClass = spot.descriptionSource === 'researched' ? 'spot-description' : 'spot-description spot-description-generic';
  var descHtml = spot.description
    ? '<div class="' + descClass + ' hidden">' + escapeHtml(spot.description) + '</div>'
    : '';

  return (
    '<div class="spot-card' + (spot.closed ? ' spot-card-closed' : '') + '">' +
      '<div class="spot-top">' +
        '<div>' +
          '<h3 class="spot-name-toggle" tabindex="0" role="button" aria-expanded="false">' + escapeHtml(spot.name) + '<span class="toggle-arrow">›</span></h3>' +
          locLine +
        '</div>' +
        '<div>' + starsHtml(spot.stars) + '</div>' +
      '</div>' +
      descHtml +
      '<div class="spot-meta">' +
        '<span>' + escapeHtml(spot.type || '') + '</span>' +
        (spot.cost ? '<span>&middot; ' + escapeHtml(spot.cost) + '</span>' : '') +
      '</div>' +
      '<div class="spot-tags">' +
        closedPillHtml(spot) + recPillHtml(spot) + moodPillHtml(spot) + mofePillHtml(spot) +
      '</div>' +
      (notes.length ? '<div class="spot-notes">' + notes.join('') + '</div>' : '') +
    '</div>'
  );
}

function setupSpotToggles() {
  function toggle(nameEl) {
    var card = nameEl.closest('.spot-card');
    var desc = card && card.querySelector('.spot-description');
    if (!desc) return;
    var willShow = desc.classList.contains('hidden');
    desc.classList.toggle('hidden');
    nameEl.classList.toggle('open', willShow);
    nameEl.setAttribute('aria-expanded', willShow ? 'true' : 'false');
  }
  document.addEventListener('click', function (e) {
    var nameEl = e.target.closest('.spot-name-toggle');
    if (nameEl) toggle(nameEl);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var nameEl = e.target.closest('.spot-name-toggle');
    if (!nameEl) return;
    e.preventDefault();
    toggle(nameEl);
  });
}

function setupNav() {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }
  var here = document.body.getAttribute('data-page');
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    if (a.getAttribute('data-page') === here) a.classList.add('active');
  });
}

function setupLastUpdated() {
  var el = document.getElementById('last-updated');
  if (!el || typeof META === 'undefined' || !META.lastUpdated) return;
  var d = new Date(META.lastUpdated + 'T00:00:00');
  el.textContent = '· list last updated ' + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

document.addEventListener('data:ready', setupLastUpdated);

document.addEventListener('DOMContentLoaded', setupNav);

document.addEventListener('DOMContentLoaded', setupSpotToggles);

document.addEventListener('DOMContentLoaded', setupRecNotes);
