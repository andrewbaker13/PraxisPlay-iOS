/* T20: Badge System — Pool Badges — runs on manage-badges.html
   Toggle system/pool badges per course, 20 trigger types, 4 tiers. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  function ensureCourseSelected() {
    var sel = document.getElementById('course-select');
    if (sel && (!sel.value || sel.value === '') && sel.options.length > 1) {
      sel.selectedIndex = 1;
      if (typeof onCourseChange === 'function') onCourseChange();
    }
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['badge-pool'] = {
    slug: 'badge-pool',
    title: 'Badge System — Pool Badges',
    page: 'manage-badges.html',
    courseAware: true,
    requires: ['create-course'],
    steps: [
      {
        target: 'course-select',
        title: 'Select Course',
        content: '<p>Choose a course to manage its badges. Each course can have its own mix of system, pool, and custom badges.</p>'
      },
      {
        target: 'badge-panel',
        title: 'Badge Tabs',
        content: '<p>Badges are organized into tabs: <strong>System</strong> (always active), <strong>Pool</strong> (toggle per course), <strong>Custom</strong> (create your own), and <strong>Students</strong> (who earned what).</p>',
        onBefore: ensureCourseSelected
      },
      {
        target: '.tab[data-tab="system"]',
        title: 'System Badges',
        content: '<p><strong>System badges</strong> are platform-wide and always active. They fire automatically when students hit milestones like "First Tool Use" or "Quiz Ace".</p>'
      },
      {
        target: '.tab[data-tab="pool"]',
        title: 'Pool Badges',
        content: '<p><strong>Pool badges</strong> are pre-built but toggled per course. Browse 20+ badges with triggers like "use 5 different tools", "complete 3 modules", or "score 90% on a quiz".</p>'
      },
      {
        target: '#pool-badges',
        title: 'Toggle & Preview',
        content: '<p>Each pool badge shows its trigger condition, tier (Bronze → Platinum), and icon. <strong>Toggle</strong> any badge on/off for your course — students only see active ones.</p>',
        onBefore: function () {
          if (typeof switchTab === 'function') switchTab('pool');
        }
      },
      {
        target: 'eval-btn',
        title: 'Evaluate All',
        content: '<p>Click <strong>Evaluate All</strong> to retroactively check every student against all active badge triggers. New badges are awarded instantly — students see a celebration toast on their next page load.</p><p class="onb-nudge">👉 <strong>Now do it:</strong> Toggle at least one pool badge on for your course!</p>',
        requireAction: function () {
          var sel = document.getElementById('course-select');
          var courseId = sel ? sel.value : null;
          if (!courseId) return false;
          return OnboardingTutorial.checkApi(
            '/courses/' + courseId + '/badges/',
            function (d) { return d && d.badge_counts && d.badge_counts.pool_enabled > 0; }
          );
        }
      }
    ]
  };
})();
