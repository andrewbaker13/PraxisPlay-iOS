/* T14: Quiz Deployment & Prerequisites — runs on quiz/quiz-manager.html
   Deploy quizzes to courses, set 5 prerequisite types, per-course overrides. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function openDeployPanel() {
    var modal = document.getElementById('deploy-modal');
    if (modal && !modal.classList.contains('show')) {
      modal.classList.add('show');
    }
  }

  function closeDeployPanel() {
    var modal = document.getElementById('deploy-modal');
    if (modal && modal.classList.contains('show')) {
      modal.classList.remove('show');
    }
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['quiz-deployment'] = {
    slug: 'quiz-deployment',
    title: 'Quiz Deployment & Prerequisites',
    page: 'quiz/quiz-manager.html',
    requires: ['create-course', 'quiz-creation'],
    steps: [
      {
        target: 'quiz-results-panel',
        title: 'Pick a Quiz to Deploy',
        content: '<p>To deploy a quiz, click <strong>Deploy</strong> on its row. You can deploy the same quiz to multiple courses with different settings.</p><p>To put several quizzes into a course at once, tick their checkboxes and use <strong>Add to course</strong> in the bar that appears at the bottom.</p>'
      },
      {
        target: 'course-list',
        title: 'Select Courses',
        content: '<p>Check one or more courses to deploy to. Each deployment is independent — you can have different dates, prerequisites, and active status per course.</p>',
        onBefore: openDeployPanel
      },
      {
        target: 'deploy-active',
        title: 'Active Toggle',
        content: '<p>Toggle <strong>Active</strong> on/off. Inactive quizzes are hidden from students but retain all settings. Useful for scheduling ahead.</p>'
      },
      {
        target: 'available-from',
        title: 'Availability Window',
        content: '<p>Set <strong>Available From</strong> and <strong>Available Until</strong> dates. Students can only start the quiz within this window. Leave blank for always-available.</p>'
      },
      {
        target: 'per-course-dates-toggle',
        title: 'Per-Course Overrides',
        content: '<p>Check <strong>Per-course date overrides</strong> to set different availability windows and max-attempt limits for each course. Useful when sections have different schedules.</p>'
      },
      {
        target: 'prereq-type',
        title: 'Prerequisites',
        content: '<p>Choose from <strong>5 prerequisite types</strong>: pass another quiz, complete a module, reach a tool usage count, earn a badge, or complete an assignment. Students must meet the requirement before starting.</p>'
      },
      {
        target: 'prereq-min-count',
        title: 'Prerequisite Threshold',
        content: '<p>For count-based prerequisites (e.g., "use the tool 3 times"), set the minimum count here. For pass-based ones, the student just needs a passing score.</p><p class="onb-nudge">👉 <strong>Now do it:</strong> Deploy one of your quizzes to a course!</p>',
        requireAction: function () {
          return OnboardingTutorial.checkApi(
            '/quiz/manage/my-quizzes/',
            function (d) {
              if (!Array.isArray(d.quizzes)) return false;
              return d.quizzes.some(function (q) { return q.course_count > 0; });
            }
          );
        }
      }
    ],
    verify: function () {
      return OnboardingTutorial.verifyApi(
        '/quiz/manage/my-quizzes/',
        function (d) {
          if (!Array.isArray(d.quizzes)) return false;
          return d.quizzes.some(function (q) { return q.course_count > 0; });
        },
        'None of your quizzes are deployed to a course yet. Click <strong>Deploy</strong> on a quiz row!'
      );
    }
  };
})();
