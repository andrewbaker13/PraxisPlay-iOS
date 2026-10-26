/* T36: Teaching Library — runs on ../teaching-library.html
   Curated catalog of readings, mini-tools, and analytics applications. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  window.ONBOARDING_TUTORIAL_CONFIGS['teaching-library'] = {
    slug: 'teaching-library',
    title: 'Teaching Library',
    page: '../teaching-library.html',
    steps: [
      {
        target: '.tl-hero',
        title: 'The Teaching Library',
        content: '<p>Every reading, interactive mini-tool, and statistical analysis tool on the platform in one searchable catalog.</p>'
      },
      {
        target: '.tl-lenses',
        title: 'Curated Lenses',
        content: '<p>Quickly filter the entire catalog by the specific course you teach: <strong>Principles of Marketing, Marketing Research, Marketing Analytics, or Strategic Brand Management.</strong></p>'
      },
      {
        target: '.tl-kind-toggle',
        title: 'Filter by Content Type',
        content: '<p>Toggle between:<br>' +
          '• <strong>Readings</strong>: Core textbook chapters with embedded checks.<br>' +
          '• <strong>Mini-tools</strong>: Bite-sized conceptual interactives (e.g. Simpson\'s Paradox flipper, cohort retention curve).<br>' +
          '• <strong>Tools</strong>: Full analytics applications for datasets.</p>'
      },
      {
        target: '.tl-rail',
        title: 'Filter by Math Load',
        content: '<p>Filter by how much mathematical rigor your students can handle — from intuitive qualitative concepts to advanced regression and machine learning.</p>'
      },
      {
        target: '#tl-results',
        title: 'Preview & Shortlist',
        content: '<p>Click any card to read chapters, test interactive mini-tools, and click <strong>Add to Course</strong> to deploy content directly into your active course homeroom.</p>'
      }
    ]
  };
})();
