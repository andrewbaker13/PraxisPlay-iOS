/* T1: Platform Orientation — runs on instructor-onboarding.html (the hub)
   Guided walkthrough of the modern MktPraxis instructor navigation. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['platform-orientation'] = {
    slug: 'platform-orientation',
    title: 'Platform Orientation',
    page: 'instructor-onboarding.html',
    steps: [
      {
        target: 'admin-nav-container',
        title: 'Your Command Center',
        content: '<p>This top navigation bar appears on every page. It adapts to your role, giving instructors instant access to course setup, teaching tools, grading, and live engagement.</p>'
      },
      {
        target: '[data-page="instructor-onboarding"]',
        title: 'Getting Started Hub',
        content: '<p>You can return to this <strong>🚀 Getting Started</strong> hub anytime. It tracks your setup progress across courses, highlights recommended next moves, and walks you through new features at your own pace.</p>'
      },
      {
        target: '#nav-course-switch',
        title: 'Active Course Switcher',
        content: '<p>Shows which course you are currently working in. When you switch courses here, your active context stays preserved as you jump between Homeroom Design, Assignments, Gradebook, and Analytics.</p>',
        onBefore: function () {
          var pill = document.getElementById('nav-course-switch');
          if (pill && (pill.style.display === 'none' || (window.getComputedStyle && window.getComputedStyle(pill).display === 'none'))) {
            pill.style.display = 'inline-flex';
            var name = pill.querySelector('#nav-course-name');
            if (name && (!name.textContent || name.textContent.trim() === '…' || name.textContent.trim() === '')) {
              name.textContent = 'MKTG 301 (Preview)';
            }
          }
        }
      },
      {
        target: '[data-group="teaching"]',
        title: 'The Teaching Menu',
        content: '<p>Your central workstation: <strong>Homeroom Design, Lesson Builder, Assignments, Gradebook, Quizzes, Date Manager, Badges, Simulations, Live Games, and Moderator Tools.</strong></p><p class="onb-nudge">👉 Open this menu to explore its sections. Future tutorials will guide you through each one.</p>'
      },
      {
        target: '[data-page="tool-finder"]',
        title: 'Find a Tool',
        content: '<p>Quickly search every analysis tool and mini-tool on MktPraxis, or answer a few guided questions to pinpoint the exact method for any dataset or research question.</p>'
      },
      {
        target: '#nav-profile-dropdown',
        title: 'Your Account & Settings',
        content: '<p>Access your user profile, view system notifications, or sign out.</p><p class="onb-nudge">👉 Click <strong>Done</strong> below to complete your orientation and pick your next step!</p>'
      }
    ]
  };
})();
