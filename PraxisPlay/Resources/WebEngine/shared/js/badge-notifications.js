/* ── Badge notification system ────────────────────────────────────
   Checks for unseen earned badges on page load and shows celebratory
   slide-in notifications. Self-contained — only needs window.API_BASE
   and localStorage auth_token / is_staff.

   Include on every page:
     <link rel="stylesheet" href="[path]/shared/css/badge-notification.css">
     <script src="[path]/shared/js/badge-notifications.js"></script>
   ──────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────── */
  var MAX_TOASTS = 3;           // Show at most 3 per page load
  var AUTO_DISMISS_MS = 10000;  // 10 seconds
  var GAP_BETWEEN_MS = 800;     // Delay between sequential cards
  var FETCH_TIMEOUT_MS = 10000; // Abort fetch after 10 s (Render cold-starts)

  var HYPE_STATEMENTS = [
    "You're on fire!",
    "Achievement unlocked!",
    "Look at you go!",
    "You're crushing it!",
    "Way to go, superstar!",
    "Badge earned \u2014 keep it up!",
    "Nice work! You earned this!",
    "Woohoo! New badge alert!",
    "Another one in the bag!",
    "That\u2019s how it\u2019s done!",
    "Someone call the stats police!",
    "Main character energy!",
    "Legend in the making!",
    "Tell your group chat!",
    "Data never looked so good on you!",
    "You didn\u2019t come to play \u2014 you came to slay!",
    "MktPraxis MVP right here!",
    "Regression to the mean? Not you!",
    "Certified above the confidence interval!",
    "Standard deviation? You deviate from standard!",
    "Correlation: you + badges = 1.0",
    "Now THAT\u2019s brand equity!",
    "Top of the funnel? No \u2014 top of the class!",
    "Your personal brand just leveled up!",
    "Talk about return on investment!",
    "Consider yourself a leading indicator!"
  ];

  var CONFETTI_COLORS = ['#7c3aed','#f59e0b','#ec4899','#22c55e','#3b82f6','#f97316','#06b6d4'];

  var TIER_PRIORITY = { legendary: 0, gold: 1, silver: 2, bronze: 3 };

  /* ── State ──────────────────────────────────────────── */
  var queue = [];
  var overflowCount = 0;      // Badges beyond MAX_TOASTS
  var allBadgeIds = [];       // Every unseen badge id (for mark-seen)
  var isShowing = false;
  var dismissTimer = null;
  var currentCard = null;
  var isPaused = false;
  var timerRemaining = AUTO_DISMISS_MS;
  var timerStart = 0;
  var container = null;

  /* ── Helpers ────────────────────────────────────────── */
  function randomHype() {
    return HYPE_STATEMENTS[Math.floor(Math.random() * HYPE_STATEMENTS.length)];
  }

  function getApiBase() {
    return window.API_BASE || 'http://localhost:8000/api';
  }

  function getRelativeRoot() {
    var path = window.location.pathname;
    // Dynamically compute depth — count directory segments above the file
    var segments = path.split('/').filter(function(s) { return s.length > 0; });
    // Remove filename (last segment if it has a dot extension)
    if (segments.length > 0 && segments[segments.length - 1].indexOf('.') !== -1) {
      segments.pop();
    }
    var prefix = '';
    for (var i = 0; i < segments.length; i++) prefix += '../';
    return prefix;
  }

  function getDashboardUrl() {
    return getRelativeRoot() + 'admin_pages/student-dashboard.html';
  }

  /* ── Bootstrap ──────────────────────────────────────── */
  function init() {
    if (sessionStorage.getItem('isGuest') === 'true') return;  // Guest players don't earn badges
    var token = localStorage.getItem('auth_token');
    if (!token) return;                          // Not logged in
    if (localStorage.getItem('is_staff') === 'true') return;  // Instructors don't earn badges

    fetchUnseen(token);
  }

  function fetchUnseen(token) {
    var url = getApiBase() + '/badges/unseen/';
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var tid = ctrl ? setTimeout(function () { ctrl.abort(); }, FETCH_TIMEOUT_MS) : null;

    fetch(url, {
      headers: { 'Authorization': 'Token ' + token },
      signal: ctrl ? ctrl.signal : undefined
    })
    .then(function (res) {
      if (tid) clearTimeout(tid);
      if (res.status === 401) {
        // Stale or invalid token in localStorage; clear to stop 401 error spam
        localStorage.removeItem('auth_token');
        return [];
      }
      if (!res.ok) return [];
      return res.json();
    })
    .then(function (badges) {
      if (!badges || !badges.length) return;

      // Collect ALL ids so we can mark them all seen
      allBadgeIds = badges.map(function (b) { return b.id; });

      // Sort by tier priority (legendary first, bronze last)
      badges.sort(function (a, b) {
        var pa = TIER_PRIORITY[a.tier] !== undefined ? TIER_PRIORITY[a.tier] : 9;
        var pb = TIER_PRIORITY[b.tier] !== undefined ? TIER_PRIORITY[b.tier] : 9;
        return pa - pb;
      });

      // Show the top MAX_TOASTS individually; track overflow for summary
      queue = badges.slice(0, MAX_TOASTS);
      overflowCount = Math.max(0, badges.length - MAX_TOASTS);

      ensureContainer();
      processQueue();
    })
    .catch(function () {
      if (tid) clearTimeout(tid);
      // Silent fail — badge notifications are non-critical
    });
  }

  /* ── Container ──────────────────────────────────────── */
  function ensureContainer() {
    if (container) return;
    container = document.createElement('div');
    container.className = 'badge-notif-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  /* ── Queue processing ───────────────────────────────── */
  function processQueue() {
    if (isShowing) return;
    if (queue.length > 0) {
      isShowing = true;
      renderNotification(queue.shift());
      return;
    }
    // Queue empty — show overflow summary if applicable
    if (overflowCount > 0) {
      isShowing = true;
      renderOverflowCard(overflowCount);
      overflowCount = 0;
      return;
    }
  }

  /* ── Render a single notification card ──────────────── */
  function renderNotification(badge) {
    var tier = badge.tier || 'bronze';
    var hype = randomHype();

    var card = document.createElement('div');
    card.className = 'badge-notif tier-' + tier;
    card.setAttribute('role', 'status');

    card.innerHTML =
      '<div class="badge-notif-accent ' + tier + '"></div>' +
      '<div class="badge-notif-inner">' +
        '<div class="badge-notif-icon-wrap ' + tier + '">' +
          '<span class="badge-notif-icon">' + escapeHtml(badge.icon || '\u2B50') + '</span>' +
        '</div>' +
        '<div class="badge-notif-body">' +
          '<div class="badge-notif-hype ' + tier + '">' + escapeHtml(hype) + '</div>' +
          '<div class="badge-notif-name">' + escapeHtml(badge.name) + '</div>' +
          '<div class="badge-notif-desc">' + escapeHtml(badge.description) + '</div>' +
          '<a class="badge-notif-cta" href="' + getDashboardUrl() + '">See Your Badges</a>' +
        '</div>' +
      '</div>' +
      '<button class="badge-notif-close" aria-label="Dismiss notification">&times;</button>' +
      '<div class="badge-notif-timer">' +
        '<div class="badge-notif-timer-bar ' + tier + '"></div>' +
      '</div>';

    createConfetti(card);

    // Close button
    card.querySelector('.badge-notif-close').addEventListener('click', function () {
      dismissCurrent(false);
    });

    // CTA link — mark any remaining unseen (overflow) before navigation
    card.querySelector('.badge-notif-cta').addEventListener('click', function () {
      markSeen(allBadgeIds.slice());
    });

    // Hover pauses auto-dismiss
    card.addEventListener('mouseenter', function () {
      isPaused = true;
      card.classList.add('paused');
      if (dismissTimer) {
        clearTimeout(dismissTimer);
        timerRemaining -= (Date.now() - timerStart);
        if (timerRemaining < 0) timerRemaining = 0;
      }
      var bar = card.querySelector('.badge-notif-timer-bar');
      if (bar) bar.style.transition = 'none';
    });

    card.addEventListener('mouseleave', function () {
      isPaused = false;
      card.classList.remove('paused');
      startDismissTimer(timerRemaining);
      var bar = card.querySelector('.badge-notif-timer-bar');
      if (bar) {
        bar.style.transition = 'transform ' + timerRemaining + 'ms linear';
        bar.style.transform = 'scaleX(0)';
      }
    });

    container.innerHTML = '';
    container.appendChild(card);
    currentCard = card;

    // Mark this badge seen immediately so navigation won't replay it
    markSeen([badge.id]);

    // Escape key dismisses the current card
    card._escHandler = function (e) {
      if (e.key === 'Escape') dismissCurrent(false);
    };
    document.addEventListener('keydown', card._escHandler);

    // Timer bar animation
    timerRemaining = AUTO_DISMISS_MS;
    requestAnimationFrame(function () {
      var bar = card.querySelector('.badge-notif-timer-bar');
      if (bar) {
        bar.style.transform = 'scaleX(1)';
        requestAnimationFrame(function () {
          bar.style.transition = 'transform ' + AUTO_DISMISS_MS + 'ms linear';
          bar.style.transform = 'scaleX(0)';
        });
      }
    });

    startDismissTimer(AUTO_DISMISS_MS);
  }

  /* ── Confetti ───────────────────────────────────────── */
  function createConfetti(card) {
    for (var i = 0; i < 12; i++) {
      var dot = document.createElement('div');
      dot.className = 'badge-confetti';
      var angle = (i / 12) * 360;
      var dist = 30 + Math.random() * 50;
      var rad = angle * Math.PI / 180;
      dot.style.setProperty('--cx', Math.cos(rad) * dist + 'px');
      dot.style.setProperty('--cy', Math.sin(rad) * dist + 'px');
      dot.style.setProperty('--cr', (Math.random() * 360) + 'deg');
      dot.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      dot.style.top = '30%';
      dot.style.left = '12%';
      card.appendChild(dot);
    }
  }

  /* ── Timer ──────────────────────────────────────────── */
  function startDismissTimer(ms) {
    clearTimeout(dismissTimer);
    timerStart = Date.now();
    timerRemaining = ms;
    dismissTimer = setTimeout(function () {
      dismissCurrent(false);
    }, ms);
  }

  function dismissCurrent(navigate) {
    clearTimeout(dismissTimer);
    if (!currentCard) return;
    if (currentCard._escHandler) {
      document.removeEventListener('keydown', currentCard._escHandler);
    }
    currentCard.classList.add('dismiss');

    setTimeout(function () {
      if (container) container.innerHTML = '';
      currentCard = null;
      isShowing = false;
      isPaused = false;
      timerRemaining = AUTO_DISMISS_MS;
      setTimeout(processQueue, GAP_BETWEEN_MS);
    }, 350);
  }

  /* ── Overflow summary card ──────────────────────────── */
  function renderOverflowCard(count) {
    var card = document.createElement('div');
    card.className = 'badge-notif tier-gold badge-notif-overflow';
    card.setAttribute('role', 'status');

    var _overflowHype = [
      'You\u2019re on a roll!',
      'Badge machine!',
      'The badges can\u2019t keep up with you!',
      'At this rate, you\u2019ll need a bigger dashboard.',
      'Overachieving is your thing, huh?',
      'The distribution is skewed in your favor.',
      'Bulk badge delivery!',
      'Running a surplus of achievements over here.',
      'Someone\u2019s maximizing their output.',
      'Portfolio diversification: badges edition.'
    ];
    var _ohPick = _overflowHype[Math.floor(Math.random() * _overflowHype.length)];

    card.innerHTML =
      '<div class="badge-notif-accent gold"></div>' +
      '<div class="badge-notif-inner">' +
        '<div class="badge-notif-icon-wrap gold">' +
          '<span class="badge-notif-icon">' + escapeHtml('\uD83C\uDF89') + '</span>' +
        '</div>' +
        '<div class="badge-notif-body">' +
          '<div class="badge-notif-hype gold">' + escapeHtml(_ohPick) + '</div>' +
          '<div class="badge-notif-name">+' + count + ' more badge' + (count === 1 ? '' : 's') + ' earned!</div>' +
          '<div class="badge-notif-desc">Head to your dashboard to see them all.</div>' +
          '<a class="badge-notif-cta" href="' + getDashboardUrl() + '">See Your Badges</a>' +
        '</div>' +
      '</div>' +
      '<button class="badge-notif-close" aria-label="Dismiss notification">&times;</button>' +
      '<div class="badge-notif-timer">' +
        '<div class="badge-notif-timer-bar gold"></div>' +
      '</div>';

    card.querySelector('.badge-notif-close').addEventListener('click', function () {
      dismissCurrent(false);
    });
    card.querySelector('.badge-notif-cta').addEventListener('click', function () {
      markSeen(allBadgeIds.slice());
    });

    // Hover pauses
    card.addEventListener('mouseenter', function () {
      isPaused = true;
      card.classList.add('paused');
      if (dismissTimer) {
        clearTimeout(dismissTimer);
        timerRemaining -= (Date.now() - timerStart);
        if (timerRemaining < 0) timerRemaining = 0;
      }
      var bar = card.querySelector('.badge-notif-timer-bar');
      if (bar) bar.style.transition = 'none';
    });
    card.addEventListener('mouseleave', function () {
      isPaused = false;
      card.classList.remove('paused');
      startDismissTimer(timerRemaining);
      var bar = card.querySelector('.badge-notif-timer-bar');
      if (bar) {
        bar.style.transition = 'transform ' + timerRemaining + 'ms linear';
        bar.style.transform = 'scaleX(0)';
      }
    });

    card._escHandler = function (e) {
      if (e.key === 'Escape') dismissCurrent(false);
    };
    document.addEventListener('keydown', card._escHandler);

    container.innerHTML = '';
    container.appendChild(card);
    currentCard = card;

    // Mark all overflow badges seen immediately (user is told about them via summary)
    markSeen(allBadgeIds.slice());
    allBadgeIds = [];

    timerRemaining = AUTO_DISMISS_MS;
    requestAnimationFrame(function () {
      var bar = card.querySelector('.badge-notif-timer-bar');
      if (bar) {
        bar.style.transform = 'scaleX(1)';
        requestAnimationFrame(function () {
          bar.style.transition = 'transform ' + AUTO_DISMISS_MS + 'ms linear';
          bar.style.transform = 'scaleX(0)';
        });
      }
    });

    startDismissTimer(AUTO_DISMISS_MS);
  }

  /* ── Mark seen (API call) ───────────────────────────── */
  function markSeen(ids) {
    if (!ids || !ids.length) return;
    var token = localStorage.getItem('auth_token');
    if (!token) return;

    // keepalive: true lets the request survive page unload
    fetch(getApiBase() + '/badges/mark-seen/', {
      method: 'POST',
      headers: {
        'Authorization': 'Token ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ badge_ids: ids }),
      keepalive: true
    }).catch(function () {
      // Silent fail — will retry on next page load
    });
  }

  /* ── XSS protection ────────────────────────────────── */
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ── Go ─────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
