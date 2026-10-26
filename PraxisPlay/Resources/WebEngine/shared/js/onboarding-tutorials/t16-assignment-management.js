/* T16: Assignment Management — runs on assignment-manager.html
   Create assignments (PDF, text, URL), set points, due dates, and late policies. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};

  function openAssignmentForm() {
    var modal = document.getElementById('modal-overlay');
    if (modal && !modal.classList.contains('active')) {
      if (typeof window.openCreateModal === 'function') { window.openCreateModal(); }
      else { modal.classList.add('active'); }
    }
  }

  function closeAssignmentForm() {
    var modal = document.getElementById('modal-overlay');
    if (modal && modal.classList.contains('active')) {
      if (typeof window.closeModal === 'function') { window.closeModal(); }
      else { modal.classList.remove('active'); }
    }
  }

  window.ONBOARDING_TUTORIAL_CONFIGS['assignment-management'] = {
    slug: 'assignment-management',
    title: 'Assignment Management',
    page: 'assignment-manager.html',
    courseAware: true,
    requires: ['create-course'],
    isPrereq: true,
    steps: [
      {
        target: 'course-select',
        title: 'Select Course',
        content: '<p>Choose a course to manage its assignments. The page shows all assignments for the selected course with status indicators.</p>'
      },
      {
        target: '.stats-row',
        title: 'Assignment Stats',
        content: '<p>Quick stats show <strong>total assignments</strong>, <strong>published count</strong>, <strong>submissions received</strong>, and <strong>graded count</strong>. A high-level health check at a glance.</p>'
      },
      {
        target: 'btn-create',
        title: 'Create Assignment',
        content: '<p>Click <strong>+ New Assignment</strong> to create one. Set the title, description, type (PDF upload, text entry, or URL submission), and point value.</p>'
      },
      {
        target: 'f-type',
        title: 'Assignment Types',
        content: '<p>Choose the submission type: <strong>PDF Upload</strong> for documents, <strong>Text Entry</strong> for inline responses, or <strong>External URL</strong> for links to work hosted elsewhere.</p>',
        onBefore: openAssignmentForm
      },
      {
        target: 'f-due-date',
        title: 'Due Date & Late Policy',
        content: '<p>Set a due date and choose a <strong>late policy</strong>: no late submissions, accept with penalty (deduct X% per day), or accept without penalty.</p>'
      },
      {
        target: 'f-points',
        title: 'Points & Status',
        content: '<p>Set the maximum points for grading. Assignments start as <strong>Draft</strong> — switch to <strong>Published</strong> when ready for students to see.</p><p class="onb-nudge">👉 <strong>Try it:</strong> Create a quick assignment for one of your courses!</p>',
        onBefore: closeAssignmentForm,
        requireAction: function () {
          var sel = document.getElementById('course-select');
          var courseId = sel ? sel.value : new URLSearchParams(window.location.search).get('course_id');
          if (!courseId) return false;
          return OnboardingTutorial.checkApi(
            '/courses/' + courseId + '/assignments/',
            function (d) { return Array.isArray(d.assignments) && d.assignments.length > 0; }
          );
        }
      }
    ],
    verify: function () {
      var sel = document.getElementById('course-select');
      var courseId = sel ? sel.value : new URLSearchParams(window.location.search).get('course_id');
      if (!courseId) {
        return { passed: false, message: 'Select a course and create an assignment first!' };
      }
      return OnboardingTutorial.verifyApi(
        '/courses/' + courseId + '/assignments/',
        function (d) { return Array.isArray(d.assignments) && d.assignments.length > 0; },
        'You haven\'t created an assignment yet. Click <strong>+ New Assignment</strong> and create one!'
      );
    }
  };
})();
