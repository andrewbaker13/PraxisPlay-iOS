/* T35: Date Manager & Canvas Sync — runs on date-manager.html
   Master schedule grid, bulk deadline shifting, and Canvas calendar sync. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  window.ONBOARDING_TUTORIAL_CONFIGS['date-manager'] = {
    slug: 'date-manager',
    title: 'Date Manager & Canvas Sync',
    page: 'date-manager.html',
    courseAware: true,
    requires: ['create-course'],
    steps: [
      {
        target: 'course-select',
        title: 'Choose Your Course',
        content: '<p>Select a course to inspect its unified schedule. Every reading, tool, quiz, and assignment appears in one combined table.</p>'
      },
      {
        target: '.toolbar',
        title: 'Filter by Content Type & Week',
        content: '<p>Filter by <strong>Quizzes, Assignments, Readings, or Tools</strong>, or isolate a specific week to review its deadlines before the term starts.</p>'
      },
      {
        target: '#grid',
        title: 'Master Date Matrix',
        content: '<p>View and edit three critical dates for every item:<br>' +
          '• <strong>Available From</strong>: When students can first open it.<br>' +
          '• <strong>Due / Close</strong>: When submissions lock.<br>' +
          '• <strong>Post-Due Visible</strong>: Whether solutions/readings stay visible after the deadline.</p>'
      },
      {
        target: '.bulk-bar',
        title: 'Bulk Shift Deadlines',
        content: '<p>Need to push everything forward due to a weather closure or syllabus adjustment? Select items and use <strong>Bulk Shift</strong> to move dates by N days in one click.</p>'
      },
      {
        target: '.page-header',
        title: 'Push Dates to Canvas LMS',
        content: '<p>Once your dates are set, jump to <strong>Teaching → Send Dates to Canvas</strong> to publish your deadlines into your students\' Canvas calendar and To-Do list.</p>'
      }
    ],
    verify: function () {
      var sel = document.getElementById('course-select');
      if (sel && sel.value) return { passed: true };
      return { passed: false, message: 'Please select a course to inspect its dates.' };
    }
  };
})();
