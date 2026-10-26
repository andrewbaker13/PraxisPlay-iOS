/* T2: Create a Course — runs on instructor.html
   Walks through creating a new course. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['create-course'] = {
    slug: 'create-course',
    title: 'Create Your First Course',
    page: 'instructor.html',
    isPrereq: true,
    steps: [
      {
        target: 'courses-list',
        title: 'Your Courses',
        content: '<p>This is your course management page. All courses you own or co-instruct appear here, along with enrollment stats.</p>'
      },
      {
        target: 'create-course-form',
        title: 'Create a Course',
        content: '<p>Use this form to create a new course. Pick a clear name students will recognize — e.g., <strong>"MKTG 301 — Spring 2026"</strong>.</p>'
      },
      {
        target: 'course-name',
        title: 'Course Name',
        content: '<p>Enter your course name here. This is what students see when they enroll and on their dashboard.</p>'
      },
      {
        target: 'code-count',
        title: 'Registration Codes',
        content: '<p>Set how many one-time enrollment codes to generate. Each code lets one student join your course. You can always generate more later.</p>'
      },
      {
        target: 'create-btn',
        title: 'Save & Generate',
        content: '<p>Click <strong>Create Course & Generate Codes</strong> to save. Your course will appear in the list, and you\'ll get enrollment codes to share with students.</p><p class="onb-nudge">👉 <strong>Now try it:</strong> Go to <a href="instructor.html">Teaching → Courses & Codes</a> and create your real course!</p>',
        requireAction: function () {
          return OnboardingTutorial.checkApi('/courses/', function (d) {
            return Array.isArray(d) && d.length > 0;
          });
        }
      }
    ],
    verify: function () {
      return OnboardingTutorial.verifyApi(
        '/courses/',
        function (d) { return Array.isArray(d) && d.length > 0; },
        'You haven\'t created a course yet. Head to <strong>Teaching → Courses &amp; Codes</strong> and create one!'
      );
    }
  };
})();
