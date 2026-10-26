/* T8: Tool Catalog Tour — runs on course-settings.html (tool grid)
   Guided walkthrough: scroll to tools, explore categories, toggle visibility, custom labels. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['tool-catalog-tour'] = {
    slug: 'tool-catalog-tour',
    title: 'Tool Catalog Tour',
    page: 'course-settings.html',
    courseAware: true,
    requires: ['create-course'],
    steps: [
      {
        target: 'tool-visibility-section',
        title: '93 Analytics Tools',
        content: '<p>MktPraxis has <strong>93 analytics tools</strong> across 11+ categories. This section controls which ones your students see on the course homepage.</p>',
        onBefore: function () {
          var el = document.getElementById('tool-visibility-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      },
      {
        target: '#visible-count',
        title: 'Visibility Counts',
        content: '<p>These counters show how many tools are <strong>visible</strong> vs <strong>hidden</strong> for students. Cartridge templates pre-select a curated set, but you can customize freely.</p>'
      },
      {
        target: '.filter-bar',
        title: 'Filter & Bulk Actions',
        content: '<p>Use filters to show <strong>All</strong>, <strong>Visible only</strong>, or <strong>Hidden only</strong>. The <strong>Select All / Deselect All</strong> buttons let you reset quickly.</p><p class="onb-nudge">👉 <strong>Click "Hidden"</strong> to see which tools are turned off for students.</p>'
      },
      {
        target: 'tools-grid',
        title: 'Toggle a Tool',
        content: '<p>Each card has a <strong>checkbox</strong> — check it to show the tool to students, uncheck to hide it. Hiding a tool doesn\'t delete anything; students just can\'t see it.</p><p class="onb-nudge">👉 <strong>Try toggling a tool on or off</strong> to see the counter update.</p>'
      },
      {
        target: 'tools-grid',
        title: 'Customize & Reorder',
        content: '<p>Expand any tool card to add a <strong>custom label</strong> (e.g., "Week 3 — Regression"), a <strong>scheduled date</strong>, or an <strong>instructor note</strong>. Grab the <strong>☰ drag handle</strong> to reorder — the order here is exactly what students see.</p><p>📊 <strong>57 of 93 tools</strong> accept CSV uploads — you can also add <strong>custom case datasets</strong> per tool via the Manage Cases page.</p>'
      },
      {
        target: 'save-btn',
        title: 'Save When Ready',
        content: '<p>Changes aren\'t saved until you click <strong>💾 Save Changes</strong>. The yellow banner at the top reminds you if there are unsaved edits.</p><p class="onb-nudge">👉 No need to save now if you\'re just exploring. Explore the tools — each one has a <strong>Professor Mode</strong> tutorial built in!</p>',
        onBefore: function () {
          var el = document.getElementById('save-btn');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    ]
  };
})();
