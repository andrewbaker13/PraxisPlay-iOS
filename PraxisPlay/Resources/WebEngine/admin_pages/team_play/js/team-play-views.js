/**
 * Praxis Play Team Edition: pure rendering helpers shared by the phone, the projector and the console.
 * No fetch, no socket, no DOM lookups: every function takes data and returns a string or a value, so
 * tests can pin them. Everything that came from the server is escaped before it becomes HTML.
 */
(function (root) {
  'use strict';

  var TEAM_COLOURS = { red: '#c8402f', blue: '#2b62c2' };
  var DESK_LABELS = { analytics: 'Internal analytics', research: 'Market research', environment: 'Environment', brand: 'Brand' };
  var DECISION_LABELS = { hook: 'the hook', channel: 'the channel', creative: 'the creative', offer: 'the offer' };
  var REVEAL_STEPS = ['choices', 'key', 'why: hook', 'why: channel', 'why: creative', 'why: offer', 'scores', 'lesson', 'integration'];

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function teamColour(key) { return TEAM_COLOURS[key] || '#4f5a68'; }
  function deskLabel(key, teamMap) {
    var hit = (teamMap || []).filter(function (d) { return d.desk === key; })[0];
    return hit ? hit.label : (DESK_LABELS[key] || key);
  }
  function decisionLabel(key) { return DECISION_LABELS[key] || key; }

  function formatClock(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--';
    var s = Math.max(0, Math.ceil(seconds));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /** Which screen a player's `me` payload is on. */
  function screenFor(me) {
    var match = me && me.session && me.session.match;
    if (!match) return 'join';
    if (match.state === 'round' && !me.desk) return 'waiting';
    return match.state || 'join';
  }

  function spriteSrc(iconId) {
    return iconId ? '../../art_assets/pixel/' + encodeURIComponent(iconId) + '.png' : '';
  }

  function iconImg(iconId, size) {
    if (!iconId) return '';
    var px = size || 96;
    return '<img class="px" width="' + px + '" height="' + px + '" src="' + spriteSrc(iconId) + '" alt="" aria-hidden="true">';
  }

  function tableHtml(table) {
    if (!table || !table.columns) return '';
    var h = '<table><thead><tr>';
    table.columns.forEach(function (c) { h += '<th scope="col">' + esc(c) + '</th>'; });
    h += '</tr></thead><tbody>';
    (table.rows || []).forEach(function (row) {
      h += '<tr>';
      row.forEach(function (cell) { h += '<td>' + esc(cell) + '</td>'; });
      h += '</tr>';
    });
    return h + '</tbody></table>';
  }

  /** A desk's card or slice, as the server shaped it. */
  function renderCard(card) {
    if (!card) return '';
    var h = '';
    if (card.title) h += '<h4>' + esc(card.title) + '</h4>';
    if (card.full === false) h += '<div class="small">Your slice: ' + esc(card.slice) + ' of ' + esc(card.slices) + '. Your desk-mates hold the rest.</div>';
    h += tableHtml(card.table);
    (card.quotes || []).forEach(function (q) { h += '<div class="quote">&ldquo;' + esc(q.text) + '&rdquo; <span class="who">' + esc(q.who) + '</span></div>'; });
    if (card.lines) Object.keys(card.lines).forEach(function (k) { h += '<div class="line">' + esc(card.lines[k]) + '</div>'; });
    (card.items || []).forEach(function (it) {
      h += '<div class="item"><strong>' + esc(it.label) + '.</strong> ' + esc(it.text) + '</div>';
      if (it.creative) h += '<div class="creative"><span class="small">' + esc(it.creative.brand || 'competitor') + ' creative</span><strong>' + esc(it.creative.headline) + '</strong><span class="small">tone: ' + esc(it.creative.tone) + ' &middot; ' + esc(it.creative.format) + '</span></div>';
    });
    if (card.positioning) h += '<div class="line"><strong>Positioning:</strong> &ldquo;' + esc(card.positioning) + '&rdquo;</div>';
    if (card.guardrails) h += '<div class="line"><strong>Guardrails:</strong> ' + card.guardrails.map(esc).join(' &middot; ') + '</div>';
    if (card.cost_floor) h += '<div class="line">' + esc(card.cost_floor) + '</div>';
    if (card.budget) h += '<div class="line">' + esc(card.budget) + '</div>';
    (card.notes || []).forEach(function (n) { h += '<div class="small">' + esc(n) + '</div>'; });
    return h;
  }

  /** One option row with its info button; `selected` marks the player's current vote. */
  function renderOption(opt, selected) {
    var k = esc(opt.key);
    var meta = [opt.tone, opt.format].filter(Boolean).map(esc).join(' &middot; ');
    return '<div class="opt' + (selected ? ' sel' : '') + '" data-key="' + k + '">' +
      '<button type="button" class="pick" data-key="' + k + '" aria-pressed="' + (selected ? 'true' : 'false') + '">' +
      '<span class="k">' + k + '</span><span class="t">' + esc(opt.text) + (meta ? '<span class="small"> ' + meta + '</span>' : '') + '</span></button>' +
      (opt.detail ? '<button type="button" class="info" aria-expanded="false" aria-controls="detail-' + k + '" aria-label="More about option ' + k + '">i</button>' +
        '<div class="detail" id="detail-' + k + '" hidden>' + esc(opt.detail) + '</div>' : '') +
      '</div>';
  }

  /** The team map on the briefing screen: four seats, the player's own highlighted. */
  function renderTeamMap(teamMap, myDesk) {
    return '<div class="teammap">' + (teamMap || []).map(function (d) {
      var you = d.desk === myDesk;
      var who = (d.holders || []).map(esc).join(' &middot; ') || '<em>empty</em>';
      return '<div class="seat' + (you ? ' you' : '') + '">' + iconImg(d.icon, 96) + '<b>' + esc(d.label) + '</b>' +
        '<span class="who">' + (you ? 'you' + ((d.holders || []).length > 1 ? ' &middot; ' : '') + (d.holders || []).filter(function (n, i) { return i > 0; }).map(esc).join(' &middot; ') : who) + '</span>' +
        '<span class="dec">decides ' + esc(decisionLabel(d.decides)) + '</span></div>';
    }).join('') + '</div>';
  }

  function standingsHtml(teams) {
    var max = Math.max.apply(null, [1].concat((teams || []).map(function (t) { return t.score || 0; })));
    return (teams || []).map(function (t) {
      var pct = Math.round(100 * (t.score || 0) / max);
      return '<div class="standing"><span class="pennant" style="background:' + esc(teamColour(t.key)) + '"></span>' +
        '<span class="bar"><i style="width:' + pct + '%;background:' + esc(teamColour(t.key)) + '"></i></span>' +
        '<span class="score" style="color:' + esc(teamColour(t.key)) + '">' + esc(t.name) + ' ' + esc(t.score || 0) + '</span></div>';
    }).join('');
  }

  var TeamPlayViews = {
    esc: esc, teamColour: teamColour, deskLabel: deskLabel, decisionLabel: decisionLabel, formatClock: formatClock,
    screenFor: screenFor, spriteSrc: spriteSrc, iconImg: iconImg, renderCard: renderCard, renderOption: renderOption,
    renderTeamMap: renderTeamMap, standingsHtml: standingsHtml, REVEAL_STEPS: REVEAL_STEPS, DESK_LABELS: DESK_LABELS,
  };
  root.TeamPlayViews = TeamPlayViews;
  if (typeof module !== 'undefined' && module.exports) module.exports = TeamPlayViews;
})(typeof window !== 'undefined' ? window : globalThis);
