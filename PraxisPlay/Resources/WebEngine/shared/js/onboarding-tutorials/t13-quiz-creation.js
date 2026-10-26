/* T13: Quiz Creation & Question Types — runs on quiz/quiz-manager.html
   Create quizzes with 7 question types, set pass rate and time limit. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function openQuizEditor() {
    var modal = document.getElementById('quiz-modal');
    if (modal && !modal.classList.contains('show')) {
      modal.classList.add('show');
    }
  }

  function closeQuizEditor() {
    var modal = document.getElementById('quiz-modal');
    if (modal && modal.classList.contains('show')) {
      modal.classList.remove('show');
    }
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['quiz-creation'] = {
    slug: 'quiz-creation',
    title: 'Quiz Creation & Question Types',
    page: 'quiz/quiz-manager.html',
    requires: ['create-course'],
    isPrereq: true,
    steps: [
      {
        target: 'quiz-results-panel',
        title: 'Your Quizzes',
        content: '<p>Every quiz you can reach lives in this one list. Each <strong>row</strong> shows the title, topic, question count, which courses it is deployed in, and its status.</p><p>Click any column heading to sort by it.</p>'
      },
      {
        target: 'quiz-filters',
        title: 'Finding One Quiz Among Many',
        content: '<p>This is the part that matters once you have 50+ quizzes. Search by title, tool, chapter or tag, then narrow with <strong>Course</strong> to see just what you deployed in one class.</p><p>The <strong>Source</strong> chips switch between your own quizzes and the shared Praxis library you can copy from. Your filters are kept in the page URL, so you can bookmark a view you use often.</p>'
      },
      {
        target: 'quiz-title',
        title: 'Quiz Title & Tool',
        content: '<p>Give your quiz a clear name. Optionally link it to a specific tool — this enables <strong>Skills Check</strong> buttons to appear on that tool\'s page.</p>',
        onBefore: openQuizEditor
      },
      {
        target: 'time-limit',
        title: 'Time & Attempts',
        content: '<p>Set a <strong>time limit</strong> (in minutes) and <strong>max attempts</strong>. Students see a countdown timer during the quiz. Leave blank for unlimited.</p>'
      },
      {
        target: 'passing-score',
        title: 'Passing Score',
        content: '<p>Set the minimum percentage to pass (e.g., 70%). This feeds into badge triggers and prerequisite checks for other quizzes.</p>'
      },
      {
        target: 'allow-calculator',
        title: 'Student Tools & Test-Taking View',
        content: '<p>Expand <strong>Student Tools</strong> to optionally give students a <strong>calculator</strong>, <strong>scratchpad</strong>, or a <strong>formula sheet</strong> (Markdown + LaTeX) during the quiz.</p>' +
          '<div class="onb-student-preview">' +
            '<div class="onb-sp-header">💻 What Students Experience During Assessment</div>' +
            '<div class="onb-sp-mockup">' +
              '<div class="onb-sp-title">Focused, Fair Test Environment</div>' +
              '<div class="onb-sp-desc">Students see a clean question layout with a non-intrusive countdown timer, dockable formula reference sheet, and instant step-by-step rationale feedback on submission when allowed.</div>' +
              '<div class="onb-sp-pills">' +
                '<span class="onb-sp-pill">📐 Dockable Formulas</span>' +
                '<span class="onb-sp-pill">📝 Live Scratchpad</span>' +
                '<span class="onb-sp-pill">💡 Deep Rationale Feedback</span>' +
              '</div>' +
            '</div>' +
          '</div>'
      },
      {
        target: 'qe-readiness',
        title: 'Question Readiness',
        content: '<p>The <strong>Readiness Dashboard</strong> shows how many questions you have per difficulty level, flagging gaps. Aim for a mix of Easy, Medium, and Hard.</p>',
        onBefore: function () {
          openQuizEditor();
          var r = document.getElementById('qe-readiness');
          if (r) r.style.display = 'block';
        }
      },
      {
        target: 'qe-difficulty-chart',
        title: 'Difficulty Distribution',
        content: '<p>This chart visualizes your question spread. A well-balanced quiz has roughly 30% Easy, 50% Medium, 20% Hard.</p><p class="onb-nudge">👉 <strong>Try it:</strong> Click "Create Quiz" and build a short quiz for one of your tools!</p>',
        onBefore: function () {
          openQuizEditor();
          var r = document.getElementById('qe-readiness');
          if (r) r.style.display = 'block';
        },
        requireAction: function () {
          return OnboardingTutorial.checkApi('/quiz/manage/my-quizzes/', function (d) {
            return Array.isArray(d.quizzes) && d.quizzes.length > 0;
          });
        }
      }
    ],
    verify: function () {
      return OnboardingTutorial.verifyApi(
        '/quiz/manage/my-quizzes/',
        function (d) { return Array.isArray(d.quizzes) && d.quizzes.length > 0; },
        'You haven\'t created a quiz yet. Click <strong>Create Quiz</strong> and build one!'
      );
    }
  };
})();
