/* T5: Week View Setup — runs on course-settings.html (deeper into week config)
   Start date, week start day, breaks, and preview. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function ensureWeekViewEditors() {
    // Select Week View layout if not already selected
    var weekRadio = document.getElementById('layout-week');
    if (weekRadio && !weekRadio.checked) { weekRadio.click(); }
    // Ensure editors are visible
    var breaks = document.getElementById('schedule-breaks-editor');
    var labels = document.getElementById('week-labels-editor');
    if (breaks) breaks.style.display = 'block';
    if (labels) labels.style.display = 'block';
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['week-view-setup'] = {
    slug: 'week-view-setup',
    title: 'Week View Setup',
    page: 'course-settings.html',
    requires: ['create-course'],
    courseAware: true,
    steps: [
      {
        target: 'course-start-date',
        title: 'Anchor Your Calendar',
        content: '<p>This date anchors your entire semester. Week 1 starts here, and every subsequent week auto-calculates. Pick the Monday (or Sunday) of your first week of classes.</p>'
      },
      {
        target: 'week-start-chooser',
        title: 'Week Start Day',
        content: '<p>Match your institution\'s calendar. Most universities use Monday starts. If your class meets Tuesday-Thursday, you can pin weeks to your course day instead.</p>'
      },
      {
        target: 'schedule-breaks-editor',
        title: 'Schedule Breaks',
        content: '<p>Add breaks for Spring Break, Thanksgiving, reading days, etc. Three types:<br>• <strong>Skip</strong> — week disappears entirely<br>• <strong>Short</strong> — labeled as a shortened week<br>• <strong>Merge</strong> — combines with the next week</p>',
        onBefore: ensureWeekViewEditors
      },
      {
        target: 'week-labels-editor',
        title: 'Customize Week Labels',
        content: '<p>Give each week a meaningful name like <em>"Intro to Regression"</em> or <em>"Midterm Review."</em> Students see these labels on their homepage cards.</p>',
        onBefore: ensureWeekViewEditors
      },
      {
        target: 'preview-btn',
        title: 'Preview Your Homepage',
        content: '<p>Click <strong>Preview</strong> to see exactly what students will see. Date ranges, week labels, and breaks are all reflected in real time.</p><p class="onb-nudge">👉 Tip: You can come back and adjust week settings anytime without affecting student progress.</p>'
      }
    ]
  };
})();
