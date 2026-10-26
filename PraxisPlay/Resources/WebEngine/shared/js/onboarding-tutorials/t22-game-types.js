/* T22: Praxis Play — Game Types — runs on admin-games.html
   Guided walkthrough: browse sessions, explore templates, create a game, view questions. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['game-types'] = {
    slug: 'game-types',
    title: 'Praxis Play — Game Types',
    page: 'admin-games.html',
    isPrereq: true,
    steps: [
      {
        target: '.page-header',
        title: 'Games Hub',
        content: '<p>Welcome to <strong>Praxis Play</strong> — live classroom games that turn marketing concepts into interactive competitions.</p><p>This page manages sessions, templates, and question banks across <strong>10 game types</strong>.</p>'
      },
      {
        target: 'sessions-tab',
        title: 'Game Sessions',
        content: '<p>This tab shows all <strong>live and past game sessions</strong>. Each entry shows the game type, room code, player count, and status (waiting, active, completed).</p><p class="onb-nudge">👉 <strong>Use the filters</strong> above to narrow by status or course.</p>',
        onBefore: function () {
          if (typeof switchTab === 'function') switchTab('sessions');
        }
      },
      {
        target: 'templates-tab',
        title: 'Browse Templates',
        content: '<p><strong>Templates</strong> are pre-built question sets you can launch instantly. Each card shows the game type, question count, and difficulty.</p><p class="onb-nudge">👉 <strong>Click any template card</strong> to preview its questions and settings.</p>',
        onBefore: function () {
          if (typeof switchTab === 'function') switchTab('templates');
        }
      },
      {
        target: 'templates-list',
        title: 'Launch a Game',
        content: '<p>To start a live game, click <strong>Launch</strong> on any template. This creates a session with a <strong>room code</strong> students use to join.</p><p>You can also <strong>create your own templates</strong> with custom questions, timing, and scoring rules.</p>'
      },
      {
        target: 'questions-tab',
        title: 'Question Bank',
        content: '<p>The <strong>Questions</strong> tab holds all individual game questions. You can search, filter by template, and create new questions.</p><p>Ten game types, each with unique mechanics:</p><ul style="margin:0.4em 0 0.4em 1.2em;font-size:0.9em;"><li><strong>Speed Tap</strong> — quick recall races</li><li><strong>Crowd Wisdom</strong> — group estimate averaging</li><li><strong>Closest Guess</strong> — numeric precision</li><li><strong>Push Range</strong> — interval bets</li><li><strong>Word Guess</strong> — term recall</li><li><strong>Line Fit</strong> — visual regression</li><li><strong>Budget Blitz</strong> — resource allocation</li><li><strong>Buy a Clue</strong> — strategic hint trading</li><li><strong>Minority Rule</strong> — contrarian niche selection</li><li><strong>RPG Party Battle</strong> — cooperative boss raids</li></ul>',
        onBefore: function () {
          if (typeof switchTab === 'function') switchTab('questions');
        }
      },
      {
        target: 'questions-table-body',
        title: 'Explore Questions',
        content: '<p>Browse existing questions or click <strong>Create Question</strong> to add your own. Questions are shared across templates — edit once, update everywhere.</p><p class="onb-nudge">👉 <strong>Try creating a Speed Tap question</strong> to see the question editor!</p>'
      }
    ]
  };
})();
