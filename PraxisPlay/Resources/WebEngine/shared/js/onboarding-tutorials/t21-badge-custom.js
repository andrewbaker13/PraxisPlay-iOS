/* T21: Badge System — Custom Badges — runs on manage-badges.html
   Create custom badges per course, manual award/revoke, evaluate all. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function ensureCourseSelected() {
    var sel = document.getElementById('course-select');
    if (sel && (!sel.value || sel.value === '') && sel.options.length > 1) {
      sel.selectedIndex = 1;
      if (typeof onCourseChange === 'function') onCourseChange();
    }
  }

  function showCustomTab() {
    ensureCourseSelected();
    if (typeof switchTab === 'function') switchTab('custom');
  }

  function openCreateForm() {
    showCustomTab();
    var modal = document.getElementById('create-modal');
    if (modal && !modal.classList.contains('active')) {
      if (typeof openCreateModal === 'function') { openCreateModal(); }
      else { modal.classList.add('active'); }
    }
  }

  function showStudentsTab() {
    var modal = document.getElementById('create-modal');
    if (modal && modal.classList.contains('active')) {
      if (typeof closeCreateModal === 'function') { closeCreateModal(); }
      else { modal.classList.remove('active'); }
    }
    if (typeof switchTab === 'function') switchTab('students');
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['badge-custom'] = {
    slug: 'badge-custom',
    title: 'Badge System — Custom Badges',
    page: 'manage-badges.html',
    courseAware: true,
    requires: ['create-course'],
    steps: [
      {
        target: '.tab[data-tab="custom"]',
        title: 'Custom Badges Tab',
        content: '<p>The <strong>Custom</strong> tab is where you create badges unique to your course. Define your own triggers, icons, and tiers.</p>',
        onBefore: showCustomTab
      },
      {
        target: '#custom-badges',
        title: 'Your Custom Badges',
        content: '<p>All custom badges you\'ve created appear here. Each card shows the name, trigger condition, tier, and how many students have earned it.</p>'
      },
      {
        target: 'badge-name',
        title: 'Badge Details',
        content: '<p>Give your badge a <strong>name</strong> and <strong>description</strong>. Pick a category that matches the achievement type (engagement, mastery, community, etc.).</p>',
        onBefore: openCreateForm
      },
      {
        target: 'emoji-btn',
        title: 'Choose an Icon',
        content: '<p>Pick an <strong>emoji</strong> icon or upload a custom <strong>SVG</strong>. The icon appears on the badge card, in student notifications, and on the achievement map.</p>'
      },
      {
        target: 'tier-options',
        title: 'Badge Tier',
        content: '<p>Choose a tier: <strong>Bronze</strong>, <strong>Silver</strong>, <strong>Gold</strong>, or <strong>Platinum</strong>. Higher tiers have more visual prominence and carry more weight in the constellation map.</p>'
      },
      {
        target: 'badge-trigger',
        title: 'Trigger Conditions',
        content: '<p>Set the <strong>primary trigger</strong> (e.g., "Complete Quiz") and threshold. Add a <strong>second condition</strong> with AND/OR logic for compound badges like "Pass Quiz AND use tool 5 times".</p>'
      },
      {
        target: 'badge-preview',
        title: 'Live Preview',
        content: '<p>The preview card updates in real-time as you edit. See exactly what students will see when they earn the badge.</p>'
      },
      {
        target: '.tab[data-tab="students"]',
        title: 'Manual Award',
        content: '<p>Switch to the <strong>Students</strong> tab to manually award badges. Select a badge and student, add an optional note, and award. Great for participation or subjective achievements.</p><p class="onb-nudge">👉 <strong>Now do it:</strong> Create a custom badge for your course!</p>',
        onBefore: showStudentsTab,
        requireAction: function () {
          var sel = document.getElementById('course-select');
          var courseId = sel ? sel.value : null;
          if (!courseId) return false;
          return OnboardingTutorial.checkApi(
            '/courses/' + courseId + '/badges/',
            function (d) { return d && d.badge_counts && d.badge_counts.custom > 0; }
          );
        }
      }
    ]
  };
})();
