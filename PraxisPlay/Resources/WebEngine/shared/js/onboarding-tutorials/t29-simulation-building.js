/* T29: Simulations — Case Building — runs on sim-case-builder-v2.html
   Create sim cases with narratives, decision variables, KPIs, and AI competitors. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function activatePanel(name) {
    var item = document.querySelector('.sidebar-item[data-panel="' + name + '"]');
    if (item && typeof switchPanel === 'function') {
      switchPanel(item);
    } else {
      // Fallback: toggle classes directly
      var panels = document.querySelectorAll('.panel-section');
      panels.forEach(function (p) { p.classList.remove('active'); });
      var target = document.getElementById('panel-' + name);
      if (target) target.classList.add('active');
      var items = document.querySelectorAll('.sidebar-item');
      items.forEach(function (i) { i.classList.remove('active'); });
      if (item) item.classList.add('active');
    }
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['simulation-building'] = {
    slug: 'simulation-building',
    title: 'Simulations — Case Building',
    page: 'sim-case-builder-v2.html',
    isPrereq: true,
    steps: [
      {
        target: '.sidebar',
        title: 'Builder Sidebar',
        content: '<p>The sidebar shows all sections of a simulation case. Each section has a count badge showing how many items are configured. Click any section to edit it.</p>'
      },
      {
        target: 'panel-general',
        title: 'General Settings',
        content: '<p>Set the case <strong>name</strong>, <strong>industry</strong>, <strong>difficulty</strong>, and <strong>narrative overview</strong>. This is what students see when they enter the simulation.</p>',
        onBefore: function () { activatePanel('general'); }
      },
      {
        target: 'panel-decision-vars',
        title: 'Decision Variables',
        content: '<p><strong>Decision variables</strong> are the levers students control each round — pricing, ad spend, distribution, etc. Set bounds, defaults, and step sizes.</p>',
        onBefore: function () { activatePanel('decision-vars'); }
      },
      {
        target: 'panel-kpis',
        title: 'KPIs',
        content: '<p>Define the <strong>Key Performance Indicators</strong> teams are measured on: revenue, market share, ROI, customer satisfaction, etc. KPIs drive the leaderboard ranking.</p>',
        onBefore: function () { activatePanel('kpis'); }
      },
      {
        target: 'panel-competitive',
        title: 'AI Competitors',
        content: '<p>Add <strong>AI agent competitors</strong> that react to student decisions. Configure their strategy (aggressive, defensive, random) and market share allocation.</p>',
        onBefore: function () { activatePanel('competitive'); }
      },
      {
        target: 'panel-events',
        title: 'Market Events',
        content: '<p><strong>Events</strong> are shocks that happen during the sim — supply chain disruption, competitor price war, regulatory change. They test students\' ability to adapt.</p>',
        onBefore: function () { activatePanel('events'); }
      },
      {
        target: 'panel-json-preview',
        title: 'Preview & Export',
        content: '<p>Preview the full case definition as JSON. You can <strong>export</strong> to share with colleagues or <strong>import</strong> cases from other instructors.</p><p class="onb-nudge">👉 <strong>Try it:</strong> Open a sample case and explore the different panels!</p>',
        onBefore: function () { activatePanel('json-preview'); }
      }
    ]
  };
})();
