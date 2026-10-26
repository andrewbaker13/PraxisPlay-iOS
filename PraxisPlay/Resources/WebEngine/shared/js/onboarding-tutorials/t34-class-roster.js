/* T34: Class Roster & Email Invites — runs on course-roster.html
   Roster upload, 1-click email invitation links, and enrollment management. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function openImportTab() {
    var btn = document.getElementById('tab-import');
    if (btn) btn.click();
  }

  function openCurrentTab() {
    var btn = document.getElementById('tab-roster');
    if (btn) btn.click();
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['class-roster'] = {
    slug: 'class-roster',
    title: 'Class Roster & Email Invites',
    page: 'course-roster.html',
    courseAware: true,
    requires: ['create-course'],
    steps: [
      {
        target: 'course-select',
        title: 'Choose Your Course',
        content: '<p>Select the course you want to enroll students into. The roster displays active students, pending invites, and account status.</p>'
      },
      {
        target: '#tab-import',
        title: 'Import & Invite Students',
        content: '<p>Skip manually emailing individual registration codes! Use this tab to batch-invite your entire class with 1-click setup links.</p>',
        onBefore: openImportTab
      },
      {
        target: 'dropzone',
        title: 'Drop Your Roster File',
        content: '<p>Export a roster CSV or Excel spreadsheet from <strong>Canvas, Blackboard, or your university registrar</strong> and drop it here. We only need student names and emails.</p>'
      },
      {
        target: '.paste-block',
        title: 'Or Paste Names & Emails',
        content: '<p>You can also paste a simple list of <code>Name, Email</code> rows directly. The parser automatically validates student email formats and detects duplicates.</p>'
      },
      {
        target: '#tab-roster',
        title: 'Track Invites & Enrollments',
        content: '<p>Once invites are sent, monitor who has completed account setup, resend invitations to students who missed the email, or manage drops.</p>',
        onBefore: openCurrentTab
      }
    ],
    verify: function () {
      var sel = document.getElementById('course-select');
      if (sel && sel.value) return { passed: true };
      return { passed: false, message: 'Please select a course to view its roster.' };
    }
  };
})();
