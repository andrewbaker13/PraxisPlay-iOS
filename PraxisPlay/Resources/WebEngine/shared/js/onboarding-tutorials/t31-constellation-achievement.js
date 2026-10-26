/* T31: Constellation & Achievement Map — runs on achievement-map.html
   Guided walkthrough: mountain trails view, stats, trail cards, switch to constellations, star maps. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['constellation-achievement'] = {
    slug: 'constellation-achievement',
    title: 'Constellation & Achievement Map',
    page: 'achievement-map.html',
    steps: [
      {
        target: '.journey-view-tabs',
        title: 'Two Visualizations',
        content: '<p>The achievement map has two views: <strong>Mountain Trails</strong> (linear progression paths) and <strong>Constellations</strong> (star map patterns).</p><p>Let\'s start with Mountain Trails — it\'s already selected.</p>',
        onBefore: function () {
          var tab = document.getElementById('tab-mountains');
          if (tab) tab.click();
        }
      },
      {
        target: 'journey-stats',
        title: 'Your Stats at a Glance',
        content: '<p>The stats banner shows: <strong>badges earned</strong>, <strong>total available</strong>, <strong>trails started</strong>, and <strong>summits reached</strong>.</p><p>For students, these numbers are a motivational snapshot of their journey.</p>'
      },
      {
        target: 'mountain-grid',
        title: 'Explore Trail Cards',
        content: '<p>Each card is a themed learning trail — e.g., "Data Explorer", "Quiz Champion", "Engagement Pioneer". The progress bar fills as related badges are earned.</p><p class="onb-nudge">👉 <strong>Click any trail card</strong> to see its milestones and which badges are needed to complete it.</p>'
      },
      {
        target: '#tab-constellations',
        title: 'Switch to Constellations',
        content: '<p>Now let\'s see the same achievements as star maps. Each constellation is a category of mastery.</p><p class="onb-nudge">👉 <strong>Click the Constellations tab</strong> to switch views.</p>',
        onBefore: function () {
          var tab = document.getElementById('tab-constellations');
          if (tab) tab.click();
        }
      },
      {
        target: 'constellation-grid',
        title: 'Star Maps',
        content: '<p>Each constellation represents a set of related achievements. As badges are earned, new <strong>stars illuminate and connect</strong> into patterns — like unlocking a constellation in the night sky.</p><p class="onb-nudge">👉 <strong>Click a constellation</strong> to zoom in and see individual star details.</p>'
      },
      {
        target: '#tab-mountains',
        title: 'Student Motivation',
        content: '<p>Both views give students a visual sense of <strong>progress and accomplishment</strong>. The achievement map is linked from the student dashboard and updates in real time.</p><p>As an instructor, you design the badges — the map renders them automatically.</p>',
        onBefore: function () {
          var tab = document.getElementById('tab-mountains');
          if (tab) tab.click();
        }
      }
    ]
  };
})();
