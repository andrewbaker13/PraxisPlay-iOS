/* T28: Custom Cases & Datasets — runs on manage-cases.html
   Upload instructor CSV datasets per tool, schema validation, student access. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function openUploadModal() {
    var modal = document.getElementById('upload-modal');
    if (modal && !modal.classList.contains('active')) {
      modal.classList.add('active');
    }
  }

  function closeUploadModal() {
    var modal = document.getElementById('upload-modal');
    if (modal && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['custom-cases'] = {
    slug: 'custom-cases',
    title: 'Custom Cases & Datasets',
    page: 'manage-cases.html',
    courseAware: true,
    requires: ['create-course'],
    steps: [
      {
        target: 'filter-course',
        title: 'Course & Tool Filters',
        content: '<p>Filter by <strong>course</strong> and <strong>tool</strong> to see which custom datasets are available. Each dataset is scoped to a specific tool and validated against its schema.</p>'
      },
      {
        target: 'stats-row',
        title: 'Dataset Stats',
        content: '<p>Quick stats show total cases, how many are active, and usage counts. A high-level view of your custom content library.</p>'
      },
      {
        target: 'cases-container',
        title: 'Your Datasets',
        content: '<p>Each row shows the dataset name, associated tool, course, status (active/draft), and student usage count. Click to edit or view validation results.</p>'
      },
      {
        target: 'upload-modal',
        title: 'Upload a Dataset',
        content: '<p>Click <strong>+ Upload</strong> to add a new CSV dataset. The system validates your file against the tool\'s expected schema — column names, data types, and row limits.</p>',
        onBefore: openUploadModal
      },
      {
        target: 'csv-drop-zone',
        title: 'Drag & Drop Upload',
        content: '<p>Drag a CSV file onto the dropzone or click to browse. The validator runs instantly and shows per-column results before you save.</p>'
      },
      {
        target: 'validation-results',
        title: 'Schema Validation',
        content: '<p>The validation report shows which columns matched, which are missing, and any data type issues. Fix problems in your CSV and re-upload — no partially valid datasets are saved.</p><p class="onb-nudge">👉 <strong>Try it:</strong> Upload a sample CSV for one of your tools and see the validation in action!</p>',
        onBefore: closeUploadModal
      }
    ]
  };
})();
