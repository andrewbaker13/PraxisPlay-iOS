/* ─── Onboarding Tutorial Engine ─────────────────────────────────────────────
   Lightweight sidebar tutorial adapted from the professor-mode pattern.
   Runs on admin pages, highlights elements via data-onboard attributes,
   tracks progress via the onboarding API.

   Usage:
     OnboardingTutorial.start({
       slug: 'create-course',
       title: 'Create Your First Course',
       steps: [
         { target: 'course-list', title: 'Your Courses', content: '<p>…</p>' },
         …
       ]
     });
────────────────────────────────────────────────────────────────────────────── */

window.OnboardingTutorial = (function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────
  var config = null;       // current tutorial config
  var currentStep = 0;
  var isActive = false;
  var isMinimized = false;

  var actionPollTimer = null; // polling interval for requireAction gates

  // DOM refs (created once)
  var sidebar = null;
  var overlay = null;
  var pill = null;
  var floatCard = null;
  var highlightedEl = null;

  // ── Public API ─────────────────────────────────────────────────────────

  function start(cfg) {
    if (isActive) stop();
    if (!cfg || !cfg.steps || !cfg.steps.length) {
      console.warn('[Onboarding] No steps provided');
      return;
    }

    // If tutorial has prerequisites, check them first
    if (cfg.requires && cfg.requires.length) {
      checkPrereqs(cfg);
      return;
    }

    launchTutorial(cfg);
  }

  function launchTutorial(cfg) {
    config = cfg;
    currentStep = 0;
    isActive = true;
    isMinimized = false;

    ensureDOM();
    sidebar.classList.add('active');
    overlay.classList.add('active');
    document.body.classList.add('onboarding-active');

    document.addEventListener('keydown', handleEscapeKey);

    renderStep();
    if (!config.reviewMode) markStepStarted(config.slug);
  }

  function checkPrereqs(cfg) {
    fetch(getApiBase() + '/onboarding/steps/', { headers: getAuthHeaders() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) { launchTutorial(cfg); return; }

        // Build lookup of completed slugs and step metadata
        var steps = Array.isArray(data) ? data : (data.results || []);
        var completedSlugs = {};
        var stepInfo = {};
        steps.forEach(function (s) {
          stepInfo[s.slug] = s;
          if (s.status === 'completed') completedSlugs[s.slug] = true;
        });

        // Find missing prereqs
        var missing = [];
        cfg.requires.forEach(function (slug) {
          if (!completedSlugs[slug]) {
            var info = stepInfo[slug];
            missing.push({
              slug: slug,
              title: info ? info.title : slug,
              icon: info ? (info.icon || '📋') : '📋',
              page: info ? info.tutorial_page : null
            });
          }
        });

        if (missing.length === 0) {
          launchTutorial(cfg);
        } else {
          showPrereqBlock(cfg, missing);
        }
      })
      .catch(function () {
        // Network error — don't block the user
        launchTutorial(cfg);
      });
  }

  function showPrereqBlock(cfg, missing) {
    ensureDOM();
    isActive = true;
    config = cfg;

    sidebar.classList.add('active');
    overlay.classList.add('active');
    document.body.classList.add('onboarding-active');

    // Header
    var headerTitle = sidebar.querySelector('#onboarding-sidebar-title');
    headerTitle.textContent = cfg.title || 'Getting Started';

    // Progress bar at 0%
    sidebar.querySelector('.onboarding-progress-fill').style.width = '0%';

    // Build missing prereq list
    var listHtml = '';
    missing.forEach(function (m) {
      listHtml +=
        '<li class="onb-prereq-item">' +
          '<span class="onb-prereq-icon">' + m.icon + '</span>' +
          '<span class="onb-prereq-name">' + escapeHtml(m.title) + '</span>' +
        '</li>';
    });

    // Content
    var content = sidebar.querySelector('#onboarding-content');
    content.innerHTML =
      '<div class="onboarding-prereq-block">' +
        '<div class="onboarding-prereq-lock">🔒</div>' +
        '<h3 class="onboarding-step-title">Complete These First</h3>' +
        '<p class="onboarding-prereq-msg">This tutorial builds on earlier steps. ' +
          'Complete the following before starting:</p>' +
        '<ul class="onb-prereq-list">' + listHtml + '</ul>' +
      '</div>';
    content.scrollTop = 0;

    // Footer buttons
    var footer = sidebar.querySelector('#onboarding-footer');
    if (missing.length === 1 && missing[0].page) {
      var prereqSlug = missing[0].slug;
      var prereqPage = missing[0].page;
      footer.innerHTML =
        '<button class="onboarding-btn onboarding-btn-exit" id="onb-prereq-close">Close</button>' +
        '<button class="onboarding-btn onboarding-btn-primary" id="onb-prereq-go">' +
          'Start ' + escapeHtml(missing[0].title) + ' →</button>';

      footer.querySelector('#onb-prereq-close').addEventListener('click', stop);
      footer.querySelector('#onb-prereq-go').addEventListener('click', function () {
        stop();
        // Navigate to the prereq tutorial page with autostart
        var base = getHubUrl().replace('instructor-onboarding.html', '');
        window.location.href = base + prereqPage + '?onboarding=' + encodeURIComponent(prereqSlug);
      });
    } else {
      footer.innerHTML =
        '<button class="onboarding-btn onboarding-btn-exit" id="onb-prereq-close">Close</button>' +
        '<button class="onboarding-btn onboarding-btn-primary" id="onb-prereq-hub">' +
          '← Back to Getting Started</button>';

      footer.querySelector('#onb-prereq-close').addEventListener('click', stop);
      footer.querySelector('#onb-prereq-hub').addEventListener('click', function () {
        stop();
        window.location.href = getHubUrl();
      });
    }
  }

  function stop() {
    if (!isActive) return;
    isActive = false;
    isMinimized = false;

    clearActionPoll();
    clearHighlight();
    removeFloatCard();

    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    if (pill) pill.classList.remove('visible');
    document.body.classList.remove('onboarding-active');

    document.removeEventListener('keydown', handleEscapeKey);

    config = null;
    currentStep = 0;
  }

  function clearActionPoll() {
    if (actionPollTimer) {
      clearInterval(actionPollTimer);
      actionPollTimer = null;
    }
  }

  function handleEscapeKey(e) {
    if (e.key === 'Escape' && isActive) stop();
  }

  function unlockAdvance(btn, isLast) {
    clearActionPoll();
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove('onboarding-btn-waiting');
    btn.innerHTML = isLast ? '✓ Done' : 'Next →';
    btn.classList.add('onboarding-btn-unlocked');
    setTimeout(function () { btn.classList.remove('onboarding-btn-unlocked'); }, 1200);
  }

  function nextStep() {
    if (!isActive || !config) return;
    if (currentStep < config.steps.length - 1) {
      currentStep++;
      renderStep();
    } else {
      // Last step — run verification if defined, then complete
      finishTutorial();
    }
  }

  function prevStep() {
    if (!isActive || currentStep <= 0) return;
    currentStep--;
    renderStep();
  }

  function minimize() {
    if (!isActive) return;
    isMinimized = true;
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.classList.remove('onboarding-active');
    clearHighlight();
    removeFloatCard();
    pill.classList.add('visible');
    updatePillText();
  }

  function restore() {
    if (!isActive) return;
    isMinimized = false;
    pill.classList.remove('visible');
    sidebar.classList.add('active');
    overlay.classList.add('active');
    document.body.classList.add('onboarding-active');
    renderStep();
  }

  // ── DOM Construction (once) ────────────────────────────────────────────

  function ensureDOM() {
    if (sidebar) return; // already built

    // Overlay
    overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.addEventListener('click', function () { /* swallow clicks on overlay */ });
    document.body.appendChild(overlay);

    // Sidebar
    sidebar = document.createElement('div');
    sidebar.id = 'onboarding-sidebar';
    sidebar.innerHTML =
      '<div class="onboarding-sidebar-header">' +
        '<h2 id="onboarding-sidebar-title">Getting Started</h2>' +
        '<div class="onboarding-header-buttons">' +
          '<button class="onboarding-minimize-btn" aria-label="Minimize tutorial">—</button>' +
          '<button class="onboarding-close-btn" aria-label="Close tutorial">×</button>' +
        '</div>' +
      '</div>' +
      '<div class="onboarding-progress-bar"><div class="onboarding-progress-fill" style="width:0%"></div></div>' +
      '<div class="onboarding-sidebar-content" id="onboarding-content"></div>' +
      '<div class="onboarding-sidebar-footer" id="onboarding-footer"></div>';
    document.body.appendChild(sidebar);

    sidebar.querySelector('.onboarding-minimize-btn').addEventListener('click', minimize);
    sidebar.querySelector('.onboarding-close-btn').addEventListener('click', stop);

    // Minimize pill
    pill = document.createElement('button');
    pill.id = 'onboarding-pill';
    pill.setAttribute('aria-label', 'Restore onboarding tutorial');
    pill.innerHTML = '<span class="onboarding-pill-icon">📋</span><span class="onboarding-pill-text">Step 1/1</span>';
    pill.addEventListener('click', restore);
    document.body.appendChild(pill);
  }

  // ── Render Current Step ────────────────────────────────────────────────

  function renderStep() {
    if (!config || !sidebar) return;

    var step = config.steps[currentStep];
    var total = config.steps.length;
    var isLast = currentStep === total - 1;
    var isFirst = currentStep === 0;

    // Update header title
    var headerTitle = sidebar.querySelector('#onboarding-sidebar-title');
    headerTitle.textContent = config.title || 'Getting Started';

    // Progress bar
    var pct = ((currentStep + 1) / total) * 100;
    sidebar.querySelector('.onboarding-progress-fill').style.width = pct + '%';

    // Content
    var content = sidebar.querySelector('#onboarding-content');
    content.innerHTML =
      '<span class="onboarding-step-badge">Step ' + (currentStep + 1) + ' of ' + total + '</span>' +
      '<h3 class="onboarding-step-title">' + escapeHtml(step.title || '') + '</h3>' +
      '<div class="onboarding-step-body">' + (step.content || '') + '</div>';
    content.scrollTop = 0;

    // Footer buttons
    var footer = sidebar.querySelector('#onboarding-footer');
    var btns = '';
    btns += '<button class="onboarding-btn onboarding-btn-exit" id="onb-exit">Exit</button>';
    if (!isFirst) {
      btns += '<button class="onboarding-btn onboarding-btn-secondary" id="onb-back">← Back</button>';
    }
    if (isLast) {
      btns += '<button class="onboarding-btn onboarding-btn-primary" id="onb-done">✓ Done</button>';
    } else {
      btns += '<button class="onboarding-btn onboarding-btn-primary" id="onb-next">Next →</button>';
    }
    footer.innerHTML = btns;

    footer.querySelector('#onb-exit').addEventListener('click', stop);
    var backBtn = footer.querySelector('#onb-back');
    if (backBtn) backBtn.addEventListener('click', prevStep);
    var nextBtn = footer.querySelector('#onb-next');
    if (nextBtn) nextBtn.addEventListener('click', nextStep);
    var doneBtn = footer.querySelector('#onb-done');
    if (doneBtn) doneBtn.addEventListener('click', nextStep); // nextStep handles completion on last step

    // requireAction gate — disable advance button until condition met
    clearActionPoll();
    var advanceBtn = nextBtn || doneBtn;
    if (typeof step.requireAction === 'function' && advanceBtn) {
      advanceBtn.disabled = true;
      advanceBtn.classList.add('onboarding-btn-waiting');
      advanceBtn.innerHTML = '⏳ Complete the action above…';

      var pollAction = function () {
        try {
          var result = step.requireAction();
          if (result && typeof result.then === 'function') {
            result.then(function (passed) { if (passed) unlockAdvance(advanceBtn, isLast); });
          } else if (result) {
            unlockAdvance(advanceBtn, isLast);
          }
        } catch (e) { /* keep polling */ }
      };
      // Check immediately, then poll every 2s
      pollAction();
      actionPollTimer = setInterval(pollAction, 2000);
    }

    // Run onBefore hook (tab clicks, section scrolls, etc.) then highlight
    if (typeof step.onBefore === 'function') {
      try { step.onBefore(); } catch (e) { console.warn('[Onboarding] onBefore error:', e); }
      // Small delay lets DOM update after onBefore actions (tab switches, reveals)
      setTimeout(function () { highlightTarget(step); }, 250);
    } else {
      highlightTarget(step);
    }
    updatePillText();
  }

  // ── Highlighting ───────────────────────────────────────────────────────

  function highlightTarget(step) {
    clearHighlight();
    removeFloatCard();

    if (!step.target) {
      // No target — show overlay only, no highlight
      overlay.classList.add('active');
      return;
    }

    // Look up by data-onboard attribute first, then by id fallback.
    // If target looks like a CSS selector (starts with [ . #), use querySelector directly.
    var el;
    if (/^[\[\.#]/.test(step.target)) {
      el = document.querySelector(step.target);
    } else {
      el = document.querySelector('[data-onboard="' + step.target + '"]') ||
           document.getElementById(step.target);
    }

    if (!el) {
      // Target not found — show centered float card instead of crashing
      showFloatCard(step);
      return;
    }

    highlightedEl = el;
    el.classList.add('onboarding-highlight');

    if (step.scrollTo !== false) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function clearHighlight() {
    if (highlightedEl) {
      highlightedEl.classList.remove('onboarding-highlight');
      highlightedEl = null;
    }
  }

  // ── Float Card (fallback) ──────────────────────────────────────────────

  function showFloatCard(step) {
    removeFloatCard();
    floatCard = document.createElement('div');
    floatCard.className = 'onboarding-float-card';
    floatCard.innerHTML =
      '<h3 class="onboarding-step-title">' + escapeHtml(step.title || '') + '</h3>' +
      '<div class="onboarding-step-body">' + (step.content || '') + '</div>' +
      '<p style="margin-top:12px;color:var(--app-muted);font-size:0.82rem;">' +
        '(The target element for this step wasn\'t found on the page.)' +
      '</p>';
    document.body.appendChild(floatCard);
  }

  function removeFloatCard() {
    if (floatCard && floatCard.parentNode) {
      floatCard.parentNode.removeChild(floatCard);
    }
    floatCard = null;
  }

  // ── Minimize Pill ──────────────────────────────────────────────────────

  function updatePillText() {
    if (!pill || !config) return;
    var txt = pill.querySelector('.onboarding-pill-text');
    if (txt) {
      txt.textContent = 'Step ' + (currentStep + 1) + '/' + config.steps.length;
    }
  }

  // ── Toast ──────────────────────────────────────────────────────────────

  function showToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'onboarding-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 4000);
  }

  // ── Finish / Verification / Post-Tutorial Nav ──────────────────────────

  function finishTutorial() {
    if (!config) return;
    var cfg = config; // capture before stop() clears it

    if (typeof cfg.verify !== 'function') {
      // No verification — complete immediately
      completeAndShowNav(cfg);
      return;
    }

    // Run the async verify function
    var verifyResult;
    try {
      verifyResult = cfg.verify();
    } catch (e) {
      // If verify throws synchronously, treat as pass
      completeAndShowNav(cfg);
      return;
    }

    // Handle both sync and async verify
    if (verifyResult && typeof verifyResult.then === 'function') {
      verifyResult.then(function (result) {
        handleVerifyResult(result, cfg);
      }).catch(function () {
        // On network error, give benefit of the doubt
        completeAndShowNav(cfg);
      });
    } else {
      handleVerifyResult(verifyResult, cfg);
    }
  }

  function handleVerifyResult(result, cfg) {
    if (!result || result.passed) {
      completeAndShowNav(cfg);
    } else {
      showVerifyPrompt(result.message || 'It looks like you haven\'t completed the action yet.', cfg);
    }
  }

  function completeAndShowNav(cfg) {
    if (!cfg.reviewMode) markStepCompleted(cfg.slug);
    stop();
    showPostTutorialNav(cfg);
  }

  function showVerifyPrompt(message, cfg) {
    // Dim the sidebar content and show the verification prompt in its place
    var content = sidebar.querySelector('#onboarding-content');
    var footer = sidebar.querySelector('#onboarding-footer');

    content.innerHTML =
      '<div class="onboarding-verify-prompt">' +
        '<span class="onboarding-verify-icon">🔍</span>' +
        '<h3 class="onboarding-step-title">Almost there!</h3>' +
        '<p class="onboarding-verify-msg">' + message + '</p>' +
      '</div>';

    var footerHtml = '<button class="onboarding-btn onboarding-btn-primary" id="onb-verify-go">Go Do It</button>';
    if (!cfg.isPrereq) {
      footerHtml += '<button class="onboarding-btn onboarding-btn-secondary" id="onb-verify-skip">Skip for Now</button>';
    }
    footer.innerHTML = footerHtml;

    footer.querySelector('#onb-verify-go').addEventListener('click', function () {
      // Close tutorial without marking complete — user goes to do the action
      stop();
    });

    var skipBtn = footer.querySelector('#onb-verify-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', function () {
        // Mark as skipped (not completed) and show nav
        markStepSkipped(cfg.slug);
        stop();
        showPostTutorialNav(cfg);
      });
    }
  }

  function showPostTutorialNav(cfg) {
    var modal = document.createElement('div');
    modal.className = 'onboarding-nav-modal-backdrop';
    modal.innerHTML =
      '<div class="onboarding-nav-modal">' +
        '<div class="onboarding-nav-check">✓</div>' +
        '<h3>' + escapeHtml(cfg.title || 'Tutorial') + '</h3>' +
        '<p class="onboarding-nav-subtitle">Nice work! What would you like to do next?</p>' +
        '<div class="onboarding-nav-buttons">' +
          '<button class="onboarding-btn onboarding-btn-primary" id="onb-nav-hub">' +
            '← Back to Getting Started' +
          '</button>' +
          '<button class="onboarding-btn onboarding-btn-secondary" id="onb-nav-stay">' +
            'Stay &amp; Explore' +
          '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    // Animate in
    requestAnimationFrame(function () {
      modal.classList.add('visible');
    });

    modal.querySelector('#onb-nav-hub').addEventListener('click', function () {
      removeNavModal(modal);
      window.location.href = getHubUrl();
    });

    modal.querySelector('#onb-nav-stay').addEventListener('click', function () {
      removeNavModal(modal);
    });

    // Also close on backdrop click
    modal.addEventListener('click', function (e) {
      if (e.target === modal) removeNavModal(modal);
    });

    // Try to find the next incomplete tutorial and add a "Next" button
    fetchNextTutorial(cfg.slug, function (next) {
      if (!next) return;
      var btnArea = modal.querySelector('.onboarding-nav-buttons');
      if (!btnArea) return;

      var nextBtn = document.createElement('button');
      nextBtn.className = 'onboarding-btn onboarding-btn-accent';
      nextBtn.id = 'onb-nav-next';
      nextBtn.innerHTML = 'Next: ' + escapeHtml(next.title) + ' →';
      btnArea.insertBefore(nextBtn, btnArea.firstChild);

      nextBtn.addEventListener('click', function () {
        removeNavModal(modal);
        navigateToTutorial(next.slug);
      });
    });
  }

  function fetchNextTutorial(currentSlug, callback) {
    fetch(getApiBase() + '/onboarding/steps/', { headers: getAuthHeaders() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) { callback(null); return; }
        var steps = Array.isArray(data) ? data : (data.results || []);

        // Find current step's display_order
        var currentOrder = -1;
        steps.forEach(function (s) {
          if (s.slug === currentSlug) currentOrder = s.display_order;
        });

        // Find next incomplete step after current
        var next = null;
        steps.forEach(function (s) {
          if (s.display_order > currentOrder &&
              s.status !== 'completed' && s.status !== 'skipped' &&
              !next) {
            next = s;
          }
        });

        callback(next);
      })
      .catch(function () { callback(null); });
  }

  function navigateToTutorial(slug) {
    var configs = window.ONBOARDING_TUTORIAL_CONFIGS || {};
    var cfg = configs[slug];

    if (cfg && cfg.page) {
      var base = getHubUrl().replace('instructor-onboarding.html', '');
      var url = base + cfg.page + '?onboarding=' + encodeURIComponent(slug);
      // courseAware tutorials also pass the demo course ID
      if (cfg.courseAware && window._onbDemoCourseId) {
        url += '&course_id=' + encodeURIComponent(window._onbDemoCourseId);
      }
      window.location.href = url;
    } else {
      // No config or no page — go to hub
      window.location.href = getHubUrl();
    }
  }

  function removeNavModal(modal) {
    modal.classList.remove('visible');
    setTimeout(function () {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    }, 250);
  }

  function getHubUrl() {
    // Resolve the hub page relative to current location
    var path = window.location.pathname;
    // Admin pages are at /admin_pages/ or /admin_pages/subdir/
    if (path.indexOf('/admin_pages/') !== -1) {
      var depth = path.split('/admin_pages/')[1].split('/').length - 1;
      var prefix = depth > 0 ? '../'.repeat(depth) : '';
      return prefix + 'instructor-onboarding.html';
    }
    return '/admin_pages/instructor-onboarding.html';
  }

  // ── API Calls ──────────────────────────────────────────────────────────

  function getApiBase() {
    return window.API_BASE;
  }

  function getAuthHeaders() {
    var token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Token ' + token;
    return headers;
  }

  function postWithRetry(url) {
    fetch(url, { method: 'POST', headers: getAuthHeaders() })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
      })
      .catch(function () {
        // Retry once after 2 seconds
        setTimeout(function () {
          fetch(url, { method: 'POST', headers: getAuthHeaders() }).catch(function () {});
        }, 2000);
      });
  }

  function markStepStarted(slug) {
    postWithRetry(getApiBase() + '/onboarding/steps/' + encodeURIComponent(slug) + '/start/');
  }

  function markStepCompleted(slug) {
    postWithRetry(getApiBase() + '/onboarding/steps/' + encodeURIComponent(slug) + '/complete/');
  }

  function markStepSkipped(slug) {
    postWithRetry(getApiBase() + '/onboarding/steps/' + encodeURIComponent(slug) + '/skip/');
  }

  // ── Utilities ──────────────────────────────────────────────────────────

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /**
   * Helper for verify functions: fetch an API endpoint and check a condition.
   * Returns a Promise resolving to {passed: bool, message: string}.
   */
  function verifyApi(path, check, failMessage) {
    return fetch(getApiBase() + path, { headers: getAuthHeaders() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !check(data)) {
          return { passed: false, message: failMessage };
        }
        return { passed: true };
      })
      .catch(function () {
        // Network error — don't block the user
        return { passed: true };
      });
  }

  /** Lightweight API check for requireAction — returns Promise<boolean>. */
  function checkApi(path, check) {
    return fetch(getApiBase() + path, { headers: getAuthHeaders() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { return !!data && check(data); })
      .catch(function () { return false; });
  }

  // ── Public Surface ─────────────────────────────────────────────────────

  return {
    start: start,
    stop: stop,
    nextStep: nextStep,
    prevStep: prevStep,
    minimize: minimize,
    restore: restore,
    verifyApi: verifyApi,
    checkApi: checkApi
  };

})();
