/* T10: Module / Textbook System — runs on admin-modules.html
   Guided walkthrough: browse shared library, switch to Course Deploy, add a module. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['module-textbook-system'] = {
    slug: 'module-textbook-system',
    title: 'Lessons & Pages',
    page: 'admin-modules.html',
    requires: ['create-course'],
    isPrereq: true,
    steps: [
      {
        target: '.page-header',
        title: 'Lessons & Pages Hub',
        content: '<p>This page manages all your <strong>Lessons</strong> (rich interactive content) and <strong>Pages</strong> (lightweight notes &amp; links). MktPraxis ships with dozens of ready-to-use lessons covering marketing analytics, research methods, and statistical tools.</p><p>Let\'s take a guided tour of the tabs.</p>'
      },
      {
        target: '[data-tab="shared-library"]',
        title: 'Open Shared Library',
        content: '<p>The <strong>Shared Library</strong> contains all platform-provided lessons and pages. You can preview any item and fork it to customize for your course.</p><p class="onb-nudge">👉 <strong>Click this tab now</strong> to see what\'s available.</p>',
        onBefore: function () {
          var tab = document.querySelector('[data-tab="shared-library"]');
          if (tab) tab.click();
        }
      },
      {
        target: 'shared-grid',
        title: 'Browse Content',
        content: '<p>Each card shows the title, type (📖 Lesson or 📄 Page), and topic. Click any card to preview its content.</p><p class="onb-nudge">👉 <strong>Use the search bar</strong> above to filter by topic — try "regression" or "survey".</p>'
      },
      {
        target: '[data-tab="course-deploy"]',
        title: 'Switch to Course Deploy',
        content: '<p>The <strong>Course Deploy</strong> tab is where you assign lessons and pages to a specific course and control the order students see them.</p><p class="onb-nudge">👉 <strong>Click this tab</strong> to set up deployment.</p>',
        onBefore: function () {
          var tab = document.querySelector('[data-tab="course-deploy"]');
          if (tab) tab.click();
        }
      },
      {
        target: 'deploy-course-picker',
        title: 'Select a Course',
        content: '<p>Choose which course to deploy to. Once selected, you\'ll see all currently deployed lessons and pages and can add, remove, or reorder them.</p><p class="onb-nudge">👉 <strong>Select a course</strong> from the dropdown to see what\'s deployed.</p>'
      },
      {
        target: '.deploy-add-bar, #deploy-content',
        title: 'Add Content',
        content: '<p>Use this dropdown to choose a lesson or page, then click <strong>"+ Add"</strong>. It is instantly added to the course and students can access it from the reader.</p><p>Content deploys with <strong>Immediate</strong> unlock by default. You can change this to <strong>Sequential</strong> (complete previous first) or <strong>Date-Gated</strong> (opens on a specific date).</p>',
        requireAction: function () {
          var sel = document.getElementById('deploy-course-picker');
          var courseId = sel ? sel.value : null;
          if (!courseId) return false;
          return OnboardingTutorial.checkApi(
            '/courses/' + courseId + '/modules/',
            function (d) { return d && Array.isArray(d.modules) && d.modules.length > 0; }
          );
        }
      },
      {
        target: '[data-tab="my-modules"]',
        title: 'My Content',
        content: '<p>The <strong>My Content</strong> tab shows lessons and pages you\'ve created or forked. You can edit titles, descriptions, content, and control sharing visibility.</p><p class="onb-nudge">👉 <strong>Click this tab</strong> to explore, or move on to the next tutorial!</p>',
        onBefore: function () {
          var tab = document.querySelector('[data-tab="my-modules"]');
          if (tab) tab.click();
        }
      }
    ]
  };
})();
