/* T15: Question Bank & Import — runs on quiz/question-bank.html
   Shared question library, CSV bulk import, randomization, quiz cloning. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['question-bank'] = {
    slug: 'question-bank',
    title: 'Question Bank & Import',
    page: 'quiz/question-bank.html',
    requires: ['create-course'],
    steps: [
      {
        target: 'questionsList',
        title: 'Question Library',
        content: '<p>The Question Bank holds all your questions in one place. Each card shows the question type, difficulty, associated tool, and usage count across quizzes.</p>'
      },
      {
        target: '.filters-section',
        title: 'Filter & Search',
        content: '<p>Use the filters to narrow by <strong>question type</strong>, <strong>difficulty</strong>, <strong>tool</strong>, or <strong>visibility scope</strong>. The search box matches question text.</p>'
      },
      {
        target: 'filterType',
        title: 'Question Types',
        content: '<p>MktPraxis supports <strong>7 question types</strong>: Multiple Choice, Select All, Numeric, Fill in the Blank, Written, Reorder, and Matching. Use this filter to focus on one type at a time.</p>'
      },
      {
        target: 'filterFeedback',
        title: 'Feedback & Usage Filters',
        content: '<p>Two new filters help you maintain quality: <strong>Feedback</strong> finds questions missing student feedback, and <strong>Usage</strong> shows which questions are already in a quiz vs. unused.</p>'
      },
      {
        target: 'quizBuilderPanel',
        title: 'Quiz Builder Panel',
        content: '<p>Select multiple questions using checkboxes, and the <strong>Quiz Builder</strong> panel appears at the bottom. From here you can create a new quiz from your selection in one click.</p>'
      },
      {
        target: 'question-editor-container',
        title: 'Create & Edit Questions',
        content: '<p>Click <strong>Create Question</strong> (or edit any card) to open the question editor. Set the stem, answers, feedback, difficulty, and point value.</p>'
      },
      {
        target: 'searchInput',
        title: 'Search Questions',
        content: '<p>Type any keyword to instantly search across question text, instructions, and tags. Combine with filters for precise results.</p>'
      },
      {
        target: 'question-editor-container',
        title: 'Create & Import Questions',
        content: '<p>Click <strong>Create Question</strong> to open the editor, or use <strong>Import CSV</strong> to upload dozens at once. The CSV format is documented in the import dialog.</p><p class="onb-nudge">👉 <strong>Now do it:</strong> Create at least one question to continue!</p>',
        requireAction: function () {
          return OnboardingTutorial.checkApi(
            '/quiz-questions/',
            function (d) { return Array.isArray(d) && d.length > 0; }
          );
        }
      }
    ],
    verify: function () {
      return OnboardingTutorial.verifyApi(
        '/quiz-questions/',
        function (d) { return Array.isArray(d) && d.length > 0; },
        'You haven\'t created any questions yet. Click <strong>Create Question</strong> or use <strong>Import CSV</strong> to add some!'
      );
    }
  };
})();
