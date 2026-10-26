/* T23: Praxis Play — Hosting & Templates — runs on admin-games.html
   Build templates, host live games, QR codes, projector view, export results. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['game-hosting'] = {
    slug: 'game-hosting',
    title: 'Praxis Play — Hosting & Templates',
    page: 'admin-games.html',
    requires: ['game-types'],
    steps: [
      {
        target: 'templates-tab',
        title: 'Start from a Template',
        content: '<p>The fastest way to host a game is from a <strong>template</strong>. Templates bundle questions, timing, and settings — just pick one and launch.</p>',
        onBefore: function () {
          if (typeof switchTab === 'function') switchTab('templates');
        }
      },
      {
        target: 'templates-list',
        title: 'Build Your Own',
        content: '<p>Create custom templates by selecting questions from the bank, setting time limits per round, and choosing scoring rules. Save them for reuse across courses.</p>'
      },
      {
        target: 'session-course-filter',
        title: 'Course Scoping',
        content: '<p>Filter sessions by course to see only the games relevant to a specific class. Games can be course-specific or open to all.</p>',
        onBefore: function () {
          if (typeof switchTab === 'function') switchTab('sessions');
        }
      },
      {
        target: 'sessions-table-body',
        title: 'Session Management',
        content: '<p>Active sessions show a <strong>room code</strong> students use to join. You can also share a <strong>QR code</strong> or direct link. Open the <strong>projector view</strong> to display the game on a classroom screen.</p>'
      },
      {
        target: 'session-status-filter',
        title: 'Session Status',
        content: '<p>Filter by <strong>Waiting</strong> (lobby open), <strong>Active</strong> (game in progress), or <strong>Completed</strong> (results ready). Completed sessions let you export results and review per-student performance.</p><p class="onb-nudge">👉 <strong>Try it:</strong> Create a template and host a test game — you can play solo to see the flow!</p>'
      }
    ]
  };
})();
