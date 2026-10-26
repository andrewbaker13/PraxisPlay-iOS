/* T30: Simulations — Deployment & Management — runs on apps/simulation_v2/manage/
   Deploy to course, assign teams, configure rounds, grade, debrief.

   Retargeted when admin_pages/sim-manage-v2.html was deleted. That page was an
   accordion; this one is tabbed, so cfgBody / cfg-status / previewBanner no
   longer exist and the accordion-expanding helper went with them. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  window.ONBOARDING_TUTORIAL_CONFIGS['simulation-deployment'] = {
    slug: 'simulation-deployment',
    title: 'Simulations — Deployment & Management',
    page: '../apps/simulation_v2/manage/',
    requires: ['create-course', 'simulation-building'],
    steps: [
      {
        target: '#main-content',
        title: 'Deployment Overview',
        content: '<p>This is your command center for a deployed simulation: status, current round, and how many teams have submitted.</p><p class="onb-nudge">💡 Select a session from the sidebar to access full team, roster, and grading controls.</p>'
      },
      {
        target: '[data-tab="roster"], #tab-roster, #dep-list',
        title: 'Roster — Who Is On Which Team',
        content: '<p>The <strong>Roster</strong> tab lists every enrolled student and their team. Assign students yourself, move them between teams, or use <strong>Auto-assign</strong> to fill teams evenly.</p><p>Students who drop the course stay visible here, so a team never silently loses a member.</p>'
      },
      {
        target: '[data-tab="teams"], #tab-teams, #dep-list',
        title: 'Team Management & Student Portal View',
        content: '<p>The <strong>Teams</strong> tab shows each team, its members, and whether it has submitted for the current round. This is where you check who you are waiting on before advancing.</p>' +
          '<div class="onb-student-preview">' +
            '<div class="onb-sp-header">💼 Student Simulation Team Homeroom</div>' +
            '<div class="onb-sp-mockup">' +
              '<div class="onb-sp-title">Collaborative Strategic Portal</div>' +
              '<div class="onb-sp-desc">Students log into their team portal to set price/R&D dials, review customer segment sensitivity curves, check teammate submission consensus, and inspect animated round outcome graphs.</div>' +
              '<div class="onb-sp-pills">' +
                '<span class="onb-sp-pill">📊 Segment Curves</span>' +
                '<span class="onb-sp-pill">🤝 Team Vote Consensus</span>' +
                '<span class="onb-sp-pill">📈 Round Debrief Graphs</span>' +
              '</div>' +
            '</div>' +
          '</div>'
      },
      {
        target: '[data-tab="analytics"], #tab-analytics, #dep-list',
        title: 'Analytics & Leaderboards',
        content: '<p>The <strong>Analytics</strong> and <strong>Leaderboard</strong> tabs show KPI trends, team rankings, and decision patterns across rounds. Use it to spot a struggling team or an interesting strategic move worth discussing in class.</p>'
      },
      {
        target: '[data-tab="grades"], #tab-grades, #dep-list',
        title: 'Grading',
        content: '<p>The <strong>Grades</strong> tab turns simulation performance into points. You choose the basis and the point range, and you can override any individual score with a reason attached.</p>'
      },
      {
        target: '[data-tab="settings-view"], #tab-settings-view, #settings-modal, #dep-list',
        title: 'Settings & Round Controls',
        content: '<p><strong>Settings</strong> controls team formation, how rounds advance, outcome randomness, and what students can see.</p><p>Settings are frozen when you deploy — so editing a case template later will not disrupt a simulation already in progress.</p><p class="onb-nudge">👉 <strong>Try it:</strong> Select a session, assign student teams, and run a round!</p>'
      }
    ]
  };
})();
