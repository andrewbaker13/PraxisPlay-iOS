/* T37: Lesson Builder — runs on module-builder.html
   Custom lesson authoring, pedagogical callouts, LaTeX, and live split-screen preview. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  window.ONBOARDING_TUTORIAL_CONFIGS['module-builder'] = {
    slug: 'module-builder',
    title: 'Lesson Builder',
    page: 'module-builder.html',
    requires: ['module-textbook-system'],
    steps: [
      {
        target: '.builder-header',
        title: 'Custom Lesson Builder',
        content: '<p>Create custom interactive lessons or syllabus pages. Combine conceptual reading, mathematical formulas, and live interactive mini-tools in a single student page.</p>'
      },
      {
        target: '.meta-bar',
        title: 'Lesson Settings',
        content: '<p>Set the lesson title, chapter order, estimated reading time, and short summary shown in the course homeroom.</p>'
      },
      {
        target: '.editor-toolbar',
        title: 'Pedagogical Components',
        content: '<p>One-click buttons to insert specialized teaching elements:<br>' +
          '• <strong>LaTeX Math</strong>: Render formulas beautifully.<br>' +
          '• <strong>Callout Boxes</strong>: Highlight Key Concepts, Common Pitfalls, or Industry Examples.<br>' +
          '• <strong>Mini-Tools</strong>: Embed live interactive visualizers right into the text.</p>'
      },
      {
        target: '.split-pane',
        title: 'Real-Time Split Preview',
        content: '<p>Edit Markdown on the left, while MathJax and the preview engine render exactly what your students will experience on the right.</p>'
      },
      {
        target: '.builder-actions',
        title: 'Save & Publish',
        content: '<p>Save drafts privately while writing, then click <strong>Publish</strong> when you\'re ready to add the lesson to your course.</p>'
      }
    ]
  };
})();
