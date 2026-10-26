/* Onboarding auto-start — include on any admin page that hosts tutorials.
   Reads ?onboarding=<slug> from the URL and starts the corresponding tutorial
   after a short delay to let the page render.
   Also shows a contextual "tutorials available" FAB when no tutorial is active.
   
   Requires: onboarding-tutorial.js + the relevant t*-*.js config file(s)
   loaded before this script, OR in the same page as <script> tags. */

(function () {
  'use strict';
  var params = new URLSearchParams(window.location.search);
  var slug = params.get('onboarding');

  /* ── Autostart branch — ?onboarding=<slug> is present ──────────────── */
  if (slug) {
    var attempts = 0;
    var maxAttempts = 4;

    function tryStart() {
      var CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
      var cfg = CONFIGS[slug];
      if (cfg && window.OnboardingTutorial) {
        // Check if this was launched in review mode from the hub
        var reviewSlug = sessionStorage.getItem('onboarding_review_mode');
        if (reviewSlug === slug) {
          sessionStorage.removeItem('onboarding_review_mode');
          var reviewCfg = {};
          for (var k in cfg) { if (cfg.hasOwnProperty(k)) reviewCfg[k] = cfg[k]; }
          reviewCfg.reviewMode = true;
          window.OnboardingTutorial.start(reviewCfg);
        } else {
          window.OnboardingTutorial.start(cfg);
        }
        return true;
      }
      return false;
    }

    function tryStartWithRetry() {
      if (tryStart()) return;
      if (++attempts < maxAttempts) {
        setTimeout(tryStartWithRetry, 500);
      }
    }

    if (document.readyState === 'complete') {
      setTimeout(tryStartWithRetry, 800);
    } else {
      window.addEventListener('load', function () {
        setTimeout(tryStartWithRetry, 800);
      });
    }
    return; // don't show FAB when a tutorial is launching
  }

  /* ── Contextual FAB branch — no tutorial active ────────────────────── */

  function getPageKey() {
    var path = window.location.pathname;
    // Normalize: grab everything after the last admin_pages/ or textbook/ segment
    var match = path.match(/(?:admin_pages|textbook)\/(.+)$/);
    return match ? match[1] : path.split('/').pop();
  }

  function matchesPage(configPage, pageKey) {
    // Strip leading ../ from config page values like "../textbook/reader.html"
    var normalized = configPage.replace(/^(\.\.\/)+/, '');
    // For textbook paths, the key already includes the filename
    return pageKey === normalized || pageKey.replace(/^textbook\//, '') === normalized.replace(/^textbook\//, '');
  }

  function getMatchingTutorials() {
    var CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
    var pageKey = getPageKey();
    var matches = [];
    for (var s in CONFIGS) {
      if (!CONFIGS.hasOwnProperty(s)) continue;
      if (isTutorialHidden(s) || isTutorialSnoozed(s)) continue;
      var cfg = CONFIGS[s];
      if (cfg.page && matchesPage(cfg.page, pageKey)) {
        matches.push({ slug: s, title: cfg.title || s });
      }
    }
    return matches;
  }

  function buildFAB(tutorials) {
    var pageKey = getPageKey();
    // Check session dismissal
    if (sessionStorage.getItem('onboarding_fab_dismissed_' + pageKey)) return;

    var fab = document.createElement('button');
    fab.className = 'onboarding-fab';
    fab.setAttribute('aria-label', tutorials.length + ' tutorials available for this page');
    fab.innerHTML = '<span class="onboarding-fab-icon">\uD83D\uDCCB</span> ' +
      tutorials.length + ' tutorial' + (tutorials.length > 1 ? 's' : '');
    document.body.appendChild(fab);

    var popover = document.createElement('div');
    popover.className = 'onboarding-fab-popover';
    var header = '<div class="onboarding-fab-popover-header">' +
      '<strong>Tutorials on this page</strong>' +
      '<button class="onboarding-fab-dismiss" aria-label="Dismiss tutorial list">&times;</button>' +
      '</div>';
    var list = '<ul class="onboarding-fab-list">';
    for (var i = 0; i < tutorials.length; i++) {
      var t = tutorials[i];
      list += '<li data-tutorial-slug="' + escapeHtml(t.slug) + '">' +
        '<a href="?onboarding=' + encodeURIComponent(t.slug) + '" class="onboarding-fab-link">' +
          '<span class="onboarding-fab-play">&#9654;</span> ' + escapeHtml(t.title) +
        '</a>' +
        '<button class="onboarding-fab-item-dismiss" aria-label="Dismiss ' + escapeHtml(t.title) + '" title="Dismiss">&times;</button>' +
      '</li>';
    }
    list += '</ul>';
    popover.innerHTML = header + list;
    document.body.appendChild(popover);

    // Per-tutorial dismiss: snooze (session) or hide permanently
    popover.querySelectorAll('.onboarding-fab-item-dismiss').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var li = btn.closest('li');
        var tSlug = li.getAttribute('data-tutorial-slug');
        showDismissChoice(li, tSlug, fab, popover, pageKey);
      });
    });

    var open = false;
    fab.addEventListener('click', function () {
      open = !open;
      popover.classList.toggle('visible', open);
      fab.classList.toggle('active', open);
    });

    popover.querySelector('.onboarding-fab-dismiss').addEventListener('click', function (e) {
      e.stopPropagation();
      sessionStorage.setItem('onboarding_fab_dismissed_' + pageKey, '1');
      popover.classList.remove('visible');
      fab.style.display = 'none';
    });

    // Close popover when clicking outside
    document.addEventListener('click', function (e) {
      if (open && !fab.contains(e.target) && !popover.contains(e.target)) {
        open = false;
        popover.classList.remove('visible');
        fab.classList.remove('active');
      }
    });

    // First-visit: auto-open the popover once per page (persists via localStorage)
    var firstVisitKey = 'onb_firstvisit_' + pageKey;
    if (!localStorage.getItem(firstVisitKey)) {
      localStorage.setItem(firstVisitKey, '1');
      setTimeout(function () {
        open = true;
        popover.classList.add('visible');
        fab.classList.add('active');
      }, 1500);
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function isTutorialHidden(slug) {
    // Permanently hidden via localStorage
    return !!localStorage.getItem('onb_hidden_' + slug);
  }

  function isTutorialSnoozed(slug) {
    // Snoozed for this browser session
    return !!sessionStorage.getItem('onb_snoozed_' + slug);
  }

  function showDismissChoice(li, slug, fab, popover, pageKey) {
    // Replace the list item with snooze/hide buttons
    var original = li.innerHTML;
    li.innerHTML =
      '<div class="onboarding-fab-dismiss-choice">' +
        '<button class="onb-fab-snooze" title="Hide until next visit">Snooze</button>' +
        '<button class="onb-fab-hide" title="Not relevant — hide permanently">Not relevant</button>' +
        '<button class="onb-fab-cancel" title="Cancel">&larr;</button>' +
      '</div>';

    li.querySelector('.onb-fab-cancel').addEventListener('click', function (e) {
      e.stopPropagation();
      li.innerHTML = original;
      reattachItemDismiss(li, slug, fab, popover, pageKey);
    });

    li.querySelector('.onb-fab-snooze').addEventListener('click', function (e) {
      e.stopPropagation();
      sessionStorage.setItem('onb_snoozed_' + slug, '1');
      removeTutorialItem(li, fab, popover, pageKey);
    });

    li.querySelector('.onb-fab-hide').addEventListener('click', function (e) {
      e.stopPropagation();
      localStorage.setItem('onb_hidden_' + slug, '1');
      removeTutorialItem(li, fab, popover, pageKey);
    });
  }

  function reattachItemDismiss(li, slug, fab, popover, pageKey) {
    var btn = li.querySelector('.onboarding-fab-item-dismiss');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        showDismissChoice(li, slug, fab, popover, pageKey);
      });
    }
  }

  function removeTutorialItem(li, fab, popover, pageKey) {
    li.parentNode.removeChild(li);
    // Check if any items remain
    var remaining = popover.querySelectorAll('.onboarding-fab-list li');
    if (remaining.length === 0) {
      // All hidden — collapse FAB entirely
      popover.classList.remove('visible');
      fab.style.display = 'none';
      sessionStorage.setItem('onboarding_fab_dismissed_' + pageKey, '1');
    } else {
      // Update FAB badge count
      fab.innerHTML = '<span class="onboarding-fab-icon">\uD83D\uDCCB</span> ' +
        remaining.length + ' tutorial' + (remaining.length > 1 ? 's' : '');
    }
  }

  function initFAB() {
    var fabAttempts = 0;
    function tryFAB() {
      var tutorials = getMatchingTutorials();
      if (tutorials.length > 0) {
        buildFAB(tutorials);
      } else if (++fabAttempts < 4) {
        setTimeout(tryFAB, 500);
      }
    }
    // Delay initial check to let config scripts load
    setTimeout(tryFAB, 1000);
  }

  if (document.readyState === 'complete') {
    initFAB();
  } else {
    window.addEventListener('load', initFAB);
  }
})();
