/* T3: Registration Codes — runs on admin-codes.html
   Generate, manage, and share enrollment codes. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function revealGenerateModal() {
    var modal = document.getElementById('generateModal');
    if (modal && modal.style.display !== 'block') {
      if (typeof window.showGenerateModal === 'function') { window.showGenerateModal(); }
      else { modal.style.display = 'block'; }
    }
  }

  function hideGenerateModal() {
    var modal = document.getElementById('generateModal');
    if (modal && modal.style.display !== 'none') {
      if (typeof window.closeGenerateModal === 'function') { window.closeGenerateModal(); }
      else { modal.style.display = 'none'; }
    }
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['registration-codes'] = {
    slug: 'registration-codes',
    title: 'Generate & Share Registration Codes',
    page: 'admin-codes.html',
    requires: ['create-course'],
    steps: [
      {
        target: 'course-filter',
        title: 'Select Your Course',
        content: '<p>Use this dropdown to filter codes by course. Each course has its own set of enrollment codes.</p>'
      },
      {
        target: 'generateModal',
        title: 'Generate New Codes',
        content: '<p>Click the <strong>Generate Codes</strong> button to open this form. Pick a course, set the number of codes, and choose an expiration date.</p><p>Each code is <strong>single-use</strong> — one code per student.</p>',
        onBefore: revealGenerateModal
      },
      {
        target: 'codes-table-body',
        title: 'Your Code List',
        content: '<p>All generated codes appear here with their status: <strong>Active</strong> (unused), <strong>Used</strong> (claimed by a student), or <strong>Expired</strong>. You can deactivate codes you no longer need.</p>',
        onBefore: hideGenerateModal
      },
      {
        target: 'status-filter',
        title: 'Copy & Export',
        content: '<p>Use the <strong>Export CSV</strong> button to download codes as a spreadsheet, or click the copy icon on any row to grab a single code. You can share codes via email, syllabus, or LMS.</p><p class="onb-nudge">👉 <strong>Now try it:</strong> Go to <a href="admin-codes.html">Teaching → Courses & Codes</a> and generate codes for your course!</p>'
      }
    ]
  };
})();
