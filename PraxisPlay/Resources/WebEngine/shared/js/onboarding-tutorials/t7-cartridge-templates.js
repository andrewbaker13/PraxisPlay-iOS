/* T7: Course Cartridge Wizard — runs on cartridge-wizard.html
   Blueprint setup: course schedule, textbook matching, and weekly planning. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['cartridge-templates'] = {
    slug: 'cartridge-templates',
    title: 'Course Cartridge Wizard',
    page: 'cartridge-wizard.html',
    requires: ['create-course'],
    steps: [
      {
        target: '.page-header',
        title: 'Course Cartridge Wizard',
        content: '<p>The <strong>Cartridge Wizard</strong> is the fastest way to design a complete course. Tell us your term schedule and the textbook you already use, and we\'ll map where MktPraxis tools and readings fit, week by week.</p>'
      },
      {
        target: '.stepper',
        title: '5 Guided Steps',
        content: '<p>The wizard walks you through: <strong>1. Your course, 2. Your students, 3. Your textbook, 4. Fit & schedule, and 5. Your draft.</strong> Nothing changes in your live course until you review and confirm.</p>'
      },
      {
        target: '.field-grid',
        title: 'Set Your Schedule',
        content: '<p>Specify your course name, number of weeks in the term (e.g., 15 weeks), meetings per week, and meeting duration.</p>'
      },
      {
        target: '#term-grid',
        title: 'Meeting Purpose Matrix',
        content: '<p>Mark what each meeting is for: lecture, lab, midterm exam, guest speaker, or holiday break. MktPraxis only schedules content on meetings you designate.</p>'
      },
      {
        target: '#next-1',
        title: 'Advance to Textbook Selection',
        content: '<p>Click <strong>Next</strong> to pick your textbook blueprint from our catalog or paste your syllabus outline. The wizard will automatically align tools and chapters!</p><p class="onb-nudge">👉 Click <strong>Next</strong> to start drafting your course cartridge.</p>'
      }
    ]
  };
})();
