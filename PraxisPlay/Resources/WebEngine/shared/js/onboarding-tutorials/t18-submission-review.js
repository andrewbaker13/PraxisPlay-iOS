/* T18: Submission Review & Grading — runs on assignment-submissions.html
   Review submissions, grade with rubrics, manage resubmissions and grade history. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function openGradingOverlay() {
    var overlay = document.getElementById('grading-overlay');
    if (overlay && !overlay.classList.contains('active')) {
      overlay.classList.add('active');
    }
  }

  function closeGradingOverlay() {
    var overlay = document.getElementById('grading-overlay');
    if (overlay && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
    }
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['submission-review'] = {
    slug: 'submission-review',
    title: 'Submission Review & Grading',
    page: 'assignment-submissions.html',
    courseAware: true,
    requires: ['create-course', 'assignment-management'],
    steps: [
      {
        target: 'assignment-info',
        title: 'Assignment Details',
        content: '<p>The header shows the assignment title, due date, points, and submission type. Stats show total, graded, ungraded, and late submissions at a glance.</p>'
      },
      {
        target: 'submissions-body',
        title: 'Submission List',
        content: '<p>Each row shows a student\'s name, submission date, status, and score. Click any row to open the <strong>grading panel</strong>. Ungraded submissions are highlighted.</p>'
      },
      {
        target: 'grading-filter',
        title: 'Filter Submissions',
        content: '<p>Filter by <strong>All</strong>, <strong>Ungraded</strong>, <strong>Graded</strong>, or <strong>Late</strong> to focus your grading workflow. Combine with search to find specific students.</p>'
      },
      {
        target: 'grading-overlay',
        title: 'Grading Panel',
        content: '<p>The slide-in panel shows the student\'s submission content. Score with a <strong>simple point entry</strong> or a full <strong>rubric</strong>, add feedback, and save.</p>',
        onBefore: openGradingOverlay
      },
      {
        target: 'grade-feedback',
        title: 'Feedback',
        content: '<p>Add written feedback for the student. They\'ll see it when they view their graded submission. Feedback is optional but highly encouraged.</p>'
      },
      {
        target: 'btn-prev',
        title: 'Navigate Between Students',
        content: '<p>Use <strong>Previous</strong> and <strong>Next</strong> buttons to move between submissions without closing the panel. Efficient for batch grading.</p>'
      },
      {
        target: 'btn-resubmit',
        title: 'Resubmissions',
        content: '<p>If a student needs to revise, click <strong>Request Resubmission</strong>. This reopens the submission slot while preserving the grade history.</p><p class="onb-nudge">👉 <strong>Try it:</strong> Open an assignment\'s submissions and walk through the grading flow!</p>',
        onBefore: closeGradingOverlay
      }
    ]
  };
})();
