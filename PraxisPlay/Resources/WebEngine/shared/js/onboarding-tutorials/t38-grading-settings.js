/* T38: Grading Settings & Drop Rules — runs on grading-settings.html
   Configure course grading mode, category weightings, and drop-lowest rules. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  window.ONBOARDING_TUTORIAL_CONFIGS['grading-settings'] = {
    slug: 'grading-settings',
    title: 'Grading Settings & Drop Rules',
    page: 'grading-settings.html',
    courseAware: true,
    requires: ['gradebook'],
    steps: [
      {
        target: 'course-select',
        title: 'Select Course',
        content: '<p>Choose the course you want to configure. Grading settings dictate how the gradebook aggregates all individual quizzes and assignments into a final score.</p>'
      },
      {
        target: '#settings',
        title: 'Choose Calculation Mode',
        content: '<p>Select how your course total is calculated:<br>' +
          '• <strong>Sum of Points</strong>: Classic cumulative points.<br>' +
          '• <strong>Flat Mean</strong>: Equal weighting across all items.<br>' +
          '• <strong>Weighted Category Groups</strong>: Set percentage weights (e.g., 40% Homework, 30% Quizzes, 30% Projects).</p>'
      },
      {
        target: '.mode-option',
        title: 'Adjust Item Point Weights',
        content: '<p>Fine-tune point values for each quiz or assignment. MktPraxis keeps weights synchronized between your gradebook and student view.</p>'
      },
      {
        target: '.card-header',
        title: 'Drop-Lowest Rules',
        content: '<p>Configure automated drop rules (e.g., "drop 1 lowest quiz"). Dropped grades are automatically struck through in the Gradebook.</p>'
      },
      {
        target: '.page-header',
        title: 'Preview Student Grade Impact',
        content: '<p>Before applying grading scheme changes, MktPraxis shows a live impact preview of which students\' letter grades move up or down.</p>'
      }
    ],
    verify: function () {
      var sel = document.getElementById('course-select');
      if (sel && sel.value) return { passed: true };
      return { passed: false, message: 'Please select a course to configure grading settings.' };
    }
  };
})();
