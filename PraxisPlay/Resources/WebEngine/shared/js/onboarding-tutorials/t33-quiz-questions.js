/* T33: Quiz Question Management — runs on quiz/quiz-questions.html
   Reorder questions, add from bank, review shared-question changes. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function openBank() {
    if (typeof showBankModal === 'function') { showBankModal(); }
    else {
      var m = document.getElementById('bank-modal');
      if (m) m.classList.add('active');
    }
  }

  function closeBank() {
    if (typeof closeBankModal === 'function') { closeBankModal(); }
    else {
      var m = document.getElementById('bank-modal');
      if (m) m.classList.remove('active');
    }
  }

  function showChangeBanner() {
    closeBank();
    var b = document.getElementById('change-banner');
    if (b) b.style.display = 'block';
  }

  function openReview() {
    var b = document.getElementById('change-banner');
    if (b) b.style.display = 'none';
    if (typeof showReviewModal === 'function') { showReviewModal(); }
    else {
      var m = document.getElementById('review-modal');
      if (m) m.classList.add('active');
    }
  }

  function closeReview() {
    if (typeof closeReviewModal === 'function') { closeReviewModal(); }
    else {
      var m = document.getElementById('review-modal');
      if (m) m.classList.remove('active');
    }
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['quiz-question-management'] = {
    slug: 'quiz-question-management',
    title: 'Quiz Question Management',
    page: 'quiz/quiz-questions.html',
    requires: ['quiz-creation'],
    steps: [
      {
        target: 'questions-list',
        title: 'Question Order',
        content: '<p>Drag questions by the handle to reorder them, or use <strong>Alt + Up/Down</strong> on your keyboard. The order here is exactly what students see.</p>'
      },
      {
        target: 'bank-modal',
        title: 'Add from Bank',
        content: '<p>Click <strong>Add from Bank</strong> to browse the shared question library. Search by keyword, filter by type and difficulty, then click "Add" on any question.</p>',
        onBefore: openBank
      },
      {
        target: 'question-editor-container',
        title: 'Create New Questions',
        content: '<p>Click <strong>Create New</strong> to build a question directly inside this quiz. It\'s also added to your Question Bank for reuse later.</p>',
        onBefore: closeBank
      },
      {
        target: 'change-banner',
        title: 'Review Changes',
        content: '<p>When a shared question is updated by its owner, a <strong>banner</strong> appears showing how many questions changed. Click "Review Changes" to see what\'s different.</p>',
        onBefore: showChangeBanner
      },
      {
        target: 'review-modal',
        title: 'Accept or Keep',
        content: '<p>For each changed question, you can <strong>Accept</strong> the update, <strong>Keep your version</strong> (detach), or <strong>Skip</strong> for later. Bulk actions let you handle them all at once.</p><p class="onb-nudge">\ud83d\udc49 <strong>Try it:</strong> Add a few questions from the bank and drag them into your preferred order!</p>',
        onBefore: openReview
      }
    ],
    verify: function () {
      var params = new URLSearchParams(window.location.search);
      var quizId = params.get('quiz_id');
      if (!quizId) return { passed: true };
      return OnboardingTutorial.verifyApi(
        '/quiz/' + quizId + '/questions/',
        function (d) { return Array.isArray(d.questions) && d.questions.length > 0; },
        'This quiz has no questions yet. Click <strong>Add from Bank</strong> or <strong>Create New</strong> to add some!'
      );
    }
  };
})();
