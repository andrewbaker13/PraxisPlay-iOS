/* T6: Tool Visibility & Card Customization — runs on course-settings.html
   Show/hide tools, drag-drop reorder, custom labels, notes, scheduled dates. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['tool-visibility'] = {
    slug: 'tool-visibility',
    title: 'Tool Visibility & Customization',
    page: 'course-settings.html',
    requires: ['create-course'],
    courseAware: true,
    steps: [
      {
        target: 'tool-visibility-section',
        title: 'Your Tool Grid',
        content: '<p>Every checkbox controls whether students can see this tool on their homepage. Uncheck tools that aren\'t relevant to your course.</p>'
      },
      {
        target: 'visible-count',
        title: 'Toggle Tools On & Off',
        content: '<p>These counters show how many tools are visible vs hidden. New tools added to the platform default to <strong>hidden</strong> after you\'ve customized once — no surprises mid-semester.</p>'
      },
      {
        target: 'tools-grid',
        title: 'Drag to Reorder',
        content: '<p>Drag tool cards to set the order students see them. Put your most-used tools at the top. The order is reflected on the student homepage immediately.</p>'
      },
      {
        target: 'tools-grid',
        title: 'Customize Tool Cards',
        content: '<p>Click any tool card to expand it and access three customizations:</p><ul><li><strong>Custom label</strong> — e.g., <em>"Week 3 — Exploring Relationships"</em> (appears above the card)</li><li><strong>Instructor note</strong> — e.g., <em>"Required for Homework 2"</em> (appears below the card)</li><li><strong>Scheduled date</strong> — shows the tool as "Coming Soon" until that date</li></ul>'
      },
      {
        target: 'save-btn',
        title: 'Save Your Changes',
        content: '<p>Click <strong>Save Changes</strong> and students see updates immediately.</p><p class="onb-nudge">👉 <strong>Now try it:</strong> Go to <a href="course-settings.html">Homeroom Design</a>, scroll to the tool grid, and pick which tools to show!</p>'
      }
    ]
  };
})();
