/* T11: Textbook Reader Experience — runs on textbook/reader.html
   Guided walkthrough: use TOC, scroll content, drag divider, explore tool panel, check resources. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['textbook-reader-experience'] = {
    slug: 'textbook-reader-experience',
    title: 'Textbook Reader Experience',
    page: '../textbook/reader.html',
    requires: ['create-course', 'module-textbook-system'],
    steps: [
      {
        target: 'reader-layout',
        title: 'Split-Panel Reader',
        content: '<p>This is what students see when they open a lesson. The <strong>three-panel layout</strong> shows a TOC on the left, content in the middle, and an interactive tool on the right.</p><p>Let\'s explore each piece.</p>'
      },
      {
        target: 'reader-toc',
        title: 'Navigate with the TOC',
        content: '<p>The sidebar <strong>Table of Contents</strong> lists all sections in the current lesson. It highlights the student\'s current position as they scroll.</p><p class="onb-nudge">👉 <strong>Click any section</strong> in the TOC to jump to it. The content panel scrolls automatically.</p>'
      },
      {
        target: 'module-body',
        title: 'Read the Content',
        content: '<p>The content panel renders markdown with text, images, equations, and embedded examples. Students scroll at their own pace.</p><p class="onb-nudge">👉 <strong>Scroll down</strong> to see how the progress bar at the top updates as you read.</p>'
      },
      {
        target: 'reader-divider',
        title: 'Drag the Divider',
        content: '<p>Students can <strong>drag this divider</strong> left or right to resize the content and tool panels. Great for focusing on reading or the interactive tool.</p><p class="onb-nudge">👉 <strong>Try dragging it</strong> — grab the bar and slide it left or right.</p>',
        onBefore: function () {
          var el = document.getElementById('reader-divider');
          if (el && el.style.display === 'none') el.style.display = '';
        }
      },
      {
        target: 'reader-tool-panel',
        title: 'Interactive Tool Panel',
        content: '<p>The right panel loads the lesson\'s paired analytics tool in an iframe. Students use it alongside the reading — no tab-switching needed.</p><p>The toolbar has controls to <strong>expand fullscreen</strong> or <strong>close the panel</strong> for more reading space.</p>',
        onBefore: function () {
          var el = document.getElementById('reader-tool-panel');
          if (el && el.style.display === 'none') el.style.display = '';
        }
      },
      {
        target: 'module-resources',
        title: 'Downloadable Resources',
        content: '<p>Slides, datasets, and handouts appear here. Students can download them directly from the reader.</p><p>Instructors can add course-specific resources via the <strong>Manage Resources</strong> page.</p>',
        onBefore: function () {
          var el = document.getElementById('module-resources');
          if (el && el.style.display === 'none') el.style.display = '';
        }
      },
      {
        target: 'reader-progress-bar',
        title: 'Progress Tracking',
        content: '<p>The progress bar tracks how far the student has read. Completion is tracked automatically and feeds into <strong>analytics dashboards</strong> and <strong>badge triggers</strong>.</p><p class="onb-nudge">👉 <strong>Scroll to the bottom</strong> of the content to see the bar fill up!</p>',
        onBefore: function () {
          var el = document.getElementById('reader-progress-bar');
          if (el && el.style.display === 'none') el.style.display = '';
        }
      }
    ]
  };
})();
