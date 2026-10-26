/* T12: Module Resources — runs on manage-resources.html
   Upload resources (PDF, PPTX, etc.), manage defaults vs course-specific, reorder. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function openAddModal() {
    var modal = document.getElementById('modal-overlay');
    if (modal && !modal.classList.contains('active')) {
      if (typeof openModal === 'function') { openModal(null); }
      else { modal.classList.add('active'); }
    }
  }

  function closeAddModal() {
    var modal = document.getElementById('modal-overlay');
    if (modal && modal.classList.contains('active')) {
      if (typeof closeModal === 'function') { closeModal(); }
      else { modal.classList.remove('active'); }
    }
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['module-resources'] = {
    slug: 'module-resources',
    title: 'Module Resources',
    page: 'manage-resources.html',
    courseAware: true,
    requires: ['create-course'],
    steps: [
      {
        target: 'course-select',
        title: 'Select Course & Module',
        content: '<p>First, pick a <strong>course</strong> and <strong>module</strong> from the dropdowns. Resources are scoped per course — you can customize what each class sees.</p>'
      },
      {
        target: '.stats-row',
        title: 'Resource Stats',
        content: '<p>The stat pills show your total resources, how many are platform defaults, course-specific additions, and hidden items. A quick way to see what students will see.</p>'
      },
      {
        target: 'table-body',
        title: 'Resource Table',
        content: '<p>All resources for this module appear here. Each row shows the label, type, source (platform vs course), and actions. <strong>Drag rows</strong> to reorder.</p>'
      },
      {
        target: 'btn-add',
        title: 'Add a Resource',
        content: '<p>Click <strong>+ Add Resource</strong> to upload a file (PDF, PPTX, DOCX, up to 10 MB) or add an external URL. Resources appear immediately in the student reader.</p>'
      },
      {
        target: 'modal-overlay',
        title: 'Upload or Link',
        content: '<p>Toggle between <strong>Upload File</strong> and <strong>External URL</strong>. Set a label, choose the resource type (Slides, Handout, Dataset, etc.), and save.</p>',
        onBefore: openAddModal
      },
      {
        target: 'table-body',
        title: 'Hide Platform Defaults',
        content: '<p>Platform defaults (slides, datasets) are shared across all courses. If one doesn\'t fit your class, you can <strong>hide</strong> it — it only hides for your course, not for others.</p><p class="onb-nudge">👉 <strong>Try it:</strong> Select a course and module, then add a resource!</p>',
        onBefore: closeAddModal
      }
    ]
  };
})();
