/* T24: Moderating — 7+ Activity Types — runs on moderating/activities.html
   Card Sort, Magnetic Poetry, Collage Engine, Spectrum Wall, Hot Spot Map, Emoji Pulse, Brand Portrait. */

(function () {
  window.ONBOARDING_TUTORIAL_CONFIGS = window.ONBOARDING_TUTORIAL_CONFIGS || {};
  window.ONBOARDING_TUTORIAL_CONFIGS['moderating-activities'] = {
    slug: 'moderating-activities',
    title: 'Moderator Activities Gallery',
    page: 'moderating/activities.html',
    isPrereq: true,
    steps: [
      {
        target: '.act-hero',
        title: 'Live Qualitative Activities',
        content: '<p>Moderator activities are fast, interactive classroom exercises designed to surface student perceptions, mental models, and priorities in real time.</p>'
      },
      {
        target: '.act-how',
        title: 'The 4-Step Flow & Student Experience',
        content: '<p><strong>1. Host</strong> from your laptop with a preset template.<br><strong>2. Project</strong> the shared screen with a QR code and live updates.<br><strong>3. Students Join</strong> from their phones using a simple 4-letter room code.<br><strong>4. Debrief</strong> with built-in discussion prompts.</p>' +
          '<div class="onb-student-preview">' +
            '<div class="onb-sp-header">📱 Student Perspective (Mobile View)</div>' +
            '<div class="onb-sp-mockup">' +
              '<div class="onb-sp-title">Zero Friction Participation</div>' +
              '<div class="onb-sp-desc">Students need <strong>no app download or account login</strong>. Scanning the projector QR code takes them straight to the room where they drag idea magnets, vote on spectrums, or submit card sorts with live haptic feedback.</div>' +
              '<div class="onb-sp-pills">' +
                '<span class="onb-sp-pill">⚡ Instant QR Join</span>' +
                '<span class="onb-sp-pill">🔒 Anonymous or Named</span>' +
                '<span class="onb-sp-pill">📱 Mobile Responsive</span>' +
              '</div>' +
            '</div>' +
          '</div>'
      },
      {
        target: '#actGrid',
        title: 'Browse Available Activities',
        content: '<p>Choose from <strong>Magnetic Poetry, Collage Engine, Spectrum Wall, Hot Spot Map, Card Sort, Emoji Pulse, and Brand Portrait</strong>. Each card highlights estimated time, recommended group size, and what it teaches best.</p>'
      },
      {
        target: '.act-history-link',
        title: 'Session History & Export',
        content: '<p>Past sessions are saved automatically. You can review past runs, export responses to CSV or JSON, and share debrief snapshots with your class.</p><p class="onb-nudge">👉 Pick an activity and click <strong>Create Session</strong> to test a host lobby!</p>'
      }
    ]
  };
})();
