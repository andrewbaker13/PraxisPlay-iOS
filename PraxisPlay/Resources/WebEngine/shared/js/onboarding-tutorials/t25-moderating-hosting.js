/* T25: Moderating — Host/Projector/Join Flow — runs on games/game-host.html
   Three-screen architecture, real-time sync, spotlight, session history. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function revealGameSection() {
    var setup = document.getElementById('setupSection');
    var game = document.getElementById('gameSection');
    var projBtn = document.getElementById('projectorButtonContainer');
    var qr = document.getElementById('qrCodeContainer');
    if (setup) setup.style.display = 'none';
    if (game) game.style.display = 'block';
    if (projBtn) projBtn.style.display = '';
    if (qr) qr.style.display = 'block';
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['moderating-hosting'] = {
    slug: 'moderating-hosting',
    title: 'Moderating — Host/Projector/Join Flow',
    page: 'games/game-host.html',
    requires: ['moderating-activities'],
    steps: [
      {
        target: 'setupSection',
        title: 'Creating a Game',
        content: '<p>This is where you <strong>create a game session</strong>. Pick a game type, select a template or custom questions, choose a course, and click <strong>Create Game</strong>.</p><p>Once created, the live controls panel appears. Let\'s preview that now.</p>'
      },
      {
        target: 'gameSection',
        title: 'Live Game Controls',
        content: '<p>Once a game is created, the <strong>live controls</strong> panel appears. You see the current question, timer, player count, and round controls all in one view.</p>',
        onBefore: revealGameSection
      },
      {
        target: 'roomCodeDisplay',
        title: 'Room Code & QR — Student Mobile Controller',
        content: '<p>Share the <strong>room code</strong> or <strong>QR code</strong> with students. They join from any device — phone, tablet, or laptop. No app install needed.</p>' +
          '<div class="onb-student-preview">' +
            '<div class="onb-sp-header">📱 What Students See On Their Phones</div>' +
            '<div class="onb-sp-mockup">' +
              '<div class="onb-sp-title">Live Speed Quiz Controller</div>' +
              '<div class="onb-sp-desc">Students get 4 vibrant touch cards matching the projector options, a pulsing countdown ring, and immediate streak score badges (+150 pts!) when they submit quickly.</div>' +
              '<div class="onb-sp-pills">' +
                '<span class="onb-sp-pill">🎯 Instant Tap Input</span>' +
                '<span class="onb-sp-pill">⚡ Speed Bonus Streak</span>' +
                '<span class="onb-sp-pill">🏆 Live Ranking Updates</span>' +
              '</div>' +
            '</div>' +
          '</div>'
      },
      {
        target: 'qrCodeContainer',
        title: 'QR Code',
        content: '<p>Display the QR code on a projector for easy classroom access. Students scan and join instantly — great for large lecture halls.</p>'
      },
      {
        target: 'openProjectorBtn',
        title: 'Projector View',
        content: '<p>Open the <strong>Projector View</strong> in a new tab. It shows a clean, full-screen display optimized for classroom screens — questions, results, and leaderboards.</p>'
      },
      {
        target: 'playersList',
        title: 'Player Management',
        content: '<p>See who has joined in real-time. You can <strong>kick</strong> disruptive players and monitor response activity during each round.</p>'
      },
      {
        target: 'gameStatus',
        title: 'Game Flow',
        content: '<p>The host controls the pace: <strong>Start</strong> the game, advance rounds with <strong>Next Round</strong>, and <strong>End Game</strong> when done. Results sync in real-time across all three screens.</p><p class="onb-nudge">👉 <strong>Try it:</strong> Create a test game, open the projector view, and step through a few rounds!</p>'
      }
    ]
  };
})();
