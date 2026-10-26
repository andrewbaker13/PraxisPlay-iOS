/* T19: Gradebook — runs on gradebook.html
   Guided walkthrough: select demo course, read summary, explore matrix, search, export. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['gradebook'] = {
    slug: 'gradebook',
    title: 'Gradebook',
    page: 'gradebook.html',
    requires: ['create-course'],
    courseAware: true,
    steps: [
      {
        target: 'courseSelect',
        title: 'Select the Demo Course',
        content: '<p>Choose the <strong>Demo Course</strong> — it has 18 students with quiz attempts and assignment submissions so the gradebook is fully populated.</p><p class="onb-nudge">👉 <strong>Select it now</strong> to load the grade matrix.</p>'
      },
      {
        target: 'summaryRow',
        title: 'Class Summary',
        content: '<p>These stat cards show: <strong>enrolled students</strong>, <strong>quiz count</strong>, <strong>class average</strong>, <strong>completion rate</strong>, and <strong>assignment count</strong>.</p><p>A quick pulse on how the class is doing overall.</p>'
      },
      {
        target: 'gradebookTable',
        title: 'The Grade Matrix',
        content: '<p>Each row is a student, each column is a quiz or assignment. Cells are color-coded:</p><ul style="margin:0.4em 0 0.4em 1.2em;"><li>🟢 Green = passing</li><li>🔴 Red = failing</li><li>⬜ Gray = not attempted</li></ul><p class="onb-nudge">👉 <strong>Hover over any cell</strong> to see the exact score.</p>'
      },
      {
        target: 'searchInput',
        title: 'Search & Sort',
        content: '<p>Type a student name to filter the table instantly. Use the <strong>sort dropdown</strong> to order by name, overall average, or a specific assessment score.</p><p class="onb-nudge">👉 <strong>Try typing a name</strong> — the table filters as you type.</p>'
      },
      {
        target: 'exportBtn',
        title: 'Export to CSV or Canvas',
        content: '<p>Click <strong>Export</strong> to download grades as CSV. Two formats available:</p><ul style="margin:0.4em 0 0.4em 1.2em;"><li><strong>Standard CSV</strong> — generic spreadsheet</li><li><strong>Canvas-compatible</strong> — maps student IDs for direct LMS import</li></ul><p class="onb-nudge">👉 <strong>Click Export</strong> to see the format options.</p>'
      },
      {
        target: 'gradebookWrapper',
        title: 'Scrollable Matrix',
        content: '<p>The table scrolls horizontally when there are many assessments. Student names stay pinned on the left for easy reference.</p><p class="onb-nudge">👉 <strong>Scroll right</strong> if you see more columns, or move on to the next tutorial!</p>'
      }
    ],
    verify: function () {
      var cs = document.getElementById('courseSelect');
      if (cs && cs.value) return { passed: true };
      return { passed: false, message: 'Select the Demo Course from the dropdown to see gradebook data.' };
    }
  };
})();
