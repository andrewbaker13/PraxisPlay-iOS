/* T4: Course Homepage Settings — runs on course-settings.html
   Enable the homepage, set title/description, choose layout mode. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['course-homepage-settings'] = {
    slug: 'course-homepage-settings',
    title: 'Course Homepage Settings',
    page: 'course-settings.html',
    requires: ['create-course'],
    courseAware: true,
    steps: [
      {
        target: 'homepage-enabled',
        title: 'Enable the Homepage',
        content: '<p>Toggle this on to give students a curated course homepage. When enabled, students see your selected tools and content instead of the default tool catalog.</p>'
      },
      {
        target: 'homepage-title',
        title: 'Course Title',
        content: '<p>Set the title students see at the top of your course homepage. Leave it empty to default to your course name.</p>'
      },
      {
        target: 'course-description',
        title: 'Course Description',
        content: '<p>Add a short description for context — e.g., <strong>"MKTG 301 Analytics tools for Spring 2026."</strong> Students see this on the homepage below the title.</p>'
      },
      {
        target: 'layout-section',
        title: 'Choose a Layout',
        content: '<p><strong>Category View</strong> groups tools by type (Descriptive, Regression, etc.). <strong>Week View</strong> organizes tools by calendar week — great for courses with a week-by-week schedule.</p>'
      },
      {
        target: 'course-start-date',
        title: 'Start Date',
        content: '<p>If using Week View, set your semester start date here. This anchors Week 1 and all subsequent weeks auto-calculate from it.</p>'
      },
      {
        target: 'week-start-chooser',
        title: 'Week Start Day',
        content: '<p>Choose whether weeks start on Monday, Sunday, or your course\'s meeting day. This affects how date ranges display on student tool cards.</p>'
      },
      {
        target: 'save-btn',
        title: 'Save Your Settings',
        content: '<p>Click <strong>Save Changes</strong> to apply. Students see updates immediately — no publish step needed.</p><p class="onb-nudge">👉 <strong>Now try it:</strong> Enable the homepage toggle above and click <strong>Save Changes</strong>!</p>',
        requireAction: function () {
          var courseId = new URLSearchParams(window.location.search).get('course_id');
          if (!courseId) return false;
          return OnboardingTutorial.checkApi(
            '/courses/' + courseId + '/homepage/',
            function (d) { return d && d.homepage_enabled === true; }
          );
        }
      }
    ]
  };
})();
