/* T17: Rubric System — runs on assignment-manager.html
   Build rubrics with dimensions, performance levels, and template scopes. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function openFormAndShowRubricToggle() {
    var modal = document.getElementById('modal-overlay');
    if (modal && !modal.classList.contains('active')) {
      if (typeof window.openCreateModal === 'function') { window.openCreateModal(); }
      else { modal.classList.add('active'); }
    }
  }

  function expandRubricSection() {
    openFormAndShowRubricToggle();
    var body = document.querySelector('.rubric-body');
    var toggle = document.getElementById('rubric-toggle');
    if (body && !body.classList.contains('open')) {
      body.classList.add('open');
      if (toggle) toggle.classList.add('open');
    }
  }

  function closeAssignmentForm() {
    var modal = document.getElementById('modal-overlay');
    if (modal && modal.classList.contains('active')) {
      if (typeof window.closeModal === 'function') { window.closeModal(); }
      else { modal.classList.remove('active'); }
    }
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['rubric-system'] = {
    slug: 'rubric-system',
    title: 'Rubric System',
    page: 'assignment-manager.html',
    courseAware: true,
    requires: ['create-course', 'assignment-management'],
    steps: [
      {
        target: 'rubric-toggle',
        title: 'Enable Rubric Grading',
        content: '<p>Toggle <strong>Rubric Grading</strong> on to attach a structured rubric to any assignment. When enabled, graders score each dimension separately instead of giving a single score.</p>',
        onBefore: openFormAndShowRubricToggle
      },
      {
        target: 'rubric-template-select',
        title: 'Rubric Templates',
        content: '<p>Start from a <strong>template</strong> (e.g., "Research Paper", "Data Analysis") or build from scratch. Templates save time and ensure consistency across assignments.</p>',
        onBefore: expandRubricSection
      },
      {
        target: '.dim-list',
        title: 'Dimensions',
        content: '<p>Each rubric has <strong>dimensions</strong> (rows) like "Analysis Quality", "Writing Clarity", or "Data Visualization". Add as many as you need and set the weight for each.</p>'
      },
      {
        target: 'rubric-body',
        title: 'Performance Levels',
        content: '<p>Each dimension has <strong>performance levels</strong> (columns) with descriptions and point values. Common scales: Excellent / Good / Needs Work / Incomplete.</p>'
      },
      {
        target: 'btn-export',
        title: 'Export & Import',
        content: '<p>You can <strong>export</strong> assignments (with rubrics) as JSON and <strong>import</strong> them into other courses. Great for reusing rubrics across semesters.</p><p class="onb-nudge">👉 <strong>Try it:</strong> Open an assignment, enable rubric mode, and try a template!</p>',
        onBefore: closeAssignmentForm
      }
    ]
  };
})();
