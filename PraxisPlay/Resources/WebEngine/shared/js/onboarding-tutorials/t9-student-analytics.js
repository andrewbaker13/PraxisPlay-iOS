/* T9: Student Analytics Overview — runs on instructor-analytics-v2.html
   Command Center, Engagement Heat Grid, and Student Risk profiles. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function switchTab(tabName) {
    var btn = document.querySelector('.tab-button[data-tab="' + tabName + '"]');
    if (btn) btn.click();
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['student-analytics-overview'] = {
    slug: 'student-analytics-overview',
    title: 'Course Analytics — Command Center',
    page: 'instructor-analytics-v2.html',
    requires: ['create-course'],
    courseAware: true,
    steps: [
      {
        target: 'course-select',
        title: 'Select Your Course',
        content: '<p>Choose the course you want to inspect. Analytics update automatically to show real student data, engagement metrics, and risk factors.</p>'
      },
      {
        target: '.tab-button[data-tab="command-center"]',
        title: 'Command Center',
        content: '<p>The <strong>Command Center</strong> is your daily pulse check: high-risk student alerts, pending submissions, and recent milestone badges.</p>',
        onBefore: function () { switchTab('command-center'); }
      },
      {
        target: '#tab-command-center',
        title: 'At-Risk Detection',
        content: '<p>The system auto-flags students who are falling behind based on inactivity, zero tool usage, and missing assignments.<br>' +
          '• 🔴 <strong>High Risk</strong>: Inactive for 14+ days<br>' +
          '• 🟡 <strong>Medium Risk</strong>: Low activity or overdue work<br>' +
          '• 🟢 <strong>Low Risk / On Track</strong></p>'
      },
      {
        target: '.tab-button[data-tab="heat-grid"]',
        title: 'Engagement Heat Grid',
        content: '<p>See <strong>who is working on what</strong> in a compact visual matrix. Quickly spot which modules and tools have high engagement and which need class reinforcement.</p>',
        onBefore: function () { switchTab('heat-grid'); }
      },
      {
        target: '.tab-button[data-tab="students"]',
        title: 'Student Drill-Down',
        content: '<p>Search any student to inspect their full activity log: session times, tool runs, quiz scores, and badge achievements.</p>',
        onBefore: function () { switchTab('students'); }
      }
    ],
    verify: function () {
      var sel = document.getElementById('course-select');
      if (sel && sel.value) return { passed: true };
      return { passed: false, message: 'Please select a course from the dropdown above.' };
    }
  };
})();
