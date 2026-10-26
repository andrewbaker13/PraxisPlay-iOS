/* T32: Advanced Analytics Deep Dive — runs on instructor-analytics-v2.html
   Academics, Engagement metrics, and Longitudinal Trends. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function switchTab(tabName) {
    var btn = document.querySelector('.tab-button[data-tab="' + tabName + '"]');
    if (btn) btn.click();
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['advanced-analytics'] = {
    slug: 'advanced-analytics',
    title: 'Advanced Analytics Deep Dive',
    page: 'instructor-analytics-v2.html',
    requires: ['student-analytics-overview'],
    courseAware: true,
    steps: [
      {
        target: '.tab-button[data-tab="academics"]',
        title: 'Academics & Assessments',
        content: '<p>Review grade distributions, quiz pass rates, and assignment performance across the class. Pinpoint challenging questions or topics.</p>',
        onBefore: function () { switchTab('academics'); }
      },
      {
        target: '.tab-button[data-tab="engagement"]',
        title: 'Tool & Feature Adoption',
        content: '<p>Dive into detailed tool metrics: total executions, student exploration ratios, and feature adoption by module.</p>',
        onBefore: function () { switchTab('engagement'); }
      },
      {
        target: '.tab-button[data-tab="trends"]',
        title: 'Longitudinal Trends',
        content: '<p>Compare weekly engagement trends over the semester. See how homework deadlines and exams affect class activity volume.</p>',
        onBefore: function () { switchTab('trends'); }
      },
      {
        target: '#main-content',
        title: 'Actionable Teaching Takeaways',
        content: '<p>Use these metrics during weekly prep to adapt class pace, highlight exemplar work, or reach out to students who need extra support.</p>'
      }
    ]
  };
})();
