/**
 * Game Utilities
 * Shared helper functions for the game client
 */

// Pending action buffer for zero-drop gameplay during brief network reconnects
if (typeof window !== 'undefined') {
    window._pendingGameActions = window._pendingGameActions || [];
}

/**
 * Send a gameplay action, stamped with the round it belongs to.
 *
 * Optimistic & zero-drop:
 * 1. Triggers subtle haptic feedback on supported mobile devices.
 * 2. If the socket is open, dispatches immediately.
 * 3. If the socket is reconnecting, buffers the action and flushes upon open.
 */
function sendGameAction(action, data) {
    // 1. Instant tactile feedback on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(25);
        } catch (_) {}
    }

    const payload = Object.assign({ round_instance_id: typeof currentRoundInstanceId !== 'undefined' ? currentRoundInstanceId : null }, data || {});

    // 2. If socket is open, send immediately
    if (typeof websocket !== 'undefined' && websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            action: action,
            data: payload
        }));
        return true;
    }

    // 3. If socket is connecting or temporarily reconnecting, buffer action instead of dropping
    console.warn(`[GAME] Socket not open (state: ${typeof websocket !== 'undefined' && websocket ? websocket.readyState : 'none'}); buffering '${action}'`);
    if (typeof window !== 'undefined' && window._pendingGameActions) {
        window._pendingGameActions.push({
            action: action,
            data: payload,
            queuedAt: Date.now()
        });
    }
    return true; // Acknowledged & buffered optimistically
}

/**
 * Flush any buffered actions once the WebSocket connects/reconnects.
 */
function flushPendingGameActions() {
    if (typeof websocket === 'undefined' || !websocket || websocket.readyState !== WebSocket.OPEN) {
        return;
    }
    if (typeof window === 'undefined' || !window._pendingGameActions || window._pendingGameActions.length === 0) {
        return;
    }

    const pending = window._pendingGameActions.splice(0, window._pendingGameActions.length);
    const now = Date.now();
    for (const item of pending) {
        // Discard actions older than 30s or belonging to a previous round instance
        const isStale = (now - item.queuedAt) > 30000;
        const currentRound = typeof currentRoundInstanceId !== 'undefined' ? currentRoundInstanceId : null;
        const isOldRound = item.data.round_instance_id && currentRound && item.data.round_instance_id !== currentRound;
        if (!isStale && !isOldRound) {
            console.log(`[GAME] Flushing buffered action '${item.action}'`);
            websocket.send(JSON.stringify({
                action: item.action,
                data: item.data
            }));
        }
    }
}

/**
 * Render responsive question image HTML.
 * When on projector mode, scales image to 48vh with a crisp white card frame,
 * ensuring high visibility from the back of large lecture halls.
 */
function renderQuestionImageHTML(imageUrl) {
    if (!imageUrl) return '';
    const isProjector = typeof window !== 'undefined' && Boolean(window.isProjectorMode);
    if (isProjector) {
        return `
            <div class="question-image-container" style="text-align: center; margin: 16px auto; width: 100%; display: flex; justify-content: center;">
                <img src="${imageUrl}" alt="Question image" style="max-width: 90%; max-height: 48vh; min-height: 240px; border-radius: 14px; display: block; object-fit: contain; background: white; padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); border: 2px solid rgba(226,232,240,0.9);">
            </div>
        `;
    }
    return `
        <div class="question-image-container" style="text-align: center; margin: 0.5rem auto; width: 100%; display: flex; justify-content: center;">
            <img src="${imageUrl}" alt="Question image" style="max-width: 100%; max-height: 30vh; border-radius: 8px; display: block; object-fit: contain; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        </div>
    `;
}

// Fetch with timeout helper (optional timeout)
function fetchWithTimeout(url, options = {}, timeout = null) {
    if (!timeout) {
        return fetch(url, options);
    }
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

// Timing instrumentation for diagnostics
const timingData = {
    pageLoadStart: Date.now(),
    dnsLookup: null,
    tcpConnection: null,
    sslHandshake: null,
    firstByteTime: null,
    wsConnectionStart: null,
    wsConnectionComplete: null,
    apiRequestStart: null,
    apiResponseComplete: null
};

function logTiming(label, value) {
    console.log(`[TIMING] ${label}: ${value}ms`);
}

function displayTimingData() {
    const timingDisplay = document.createElement('div');
    timingDisplay.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: #0f0; padding: 10px; font-family: monospace; font-size: 11px; border-radius: 4px; max-width: 300px; z-index: 9999;';
    
    let html = '<strong>Connection Timing:</strong><br>';
    if (timingData.dnsLookup) html += `DNS: ${timingData.dnsLookup}ms<br>`;
    if (timingData.tcpConnection) html += `TCP: ${timingData.tcpConnection}ms<br>`;
    if (timingData.sslHandshake) html += `SSL: ${timingData.sslHandshake}ms<br>`;
    if (timingData.firstByteTime) html += `First Byte: ${timingData.firstByteTime}ms<br>`;
    if (timingData.apiRequestStart && timingData.apiResponseComplete) {
        html += `API Call: ${timingData.apiResponseComplete - timingData.apiRequestStart}ms<br>`;
    }
    if (timingData.wsConnectionStart && timingData.wsConnectionComplete) {
        html += `WebSocket: ${timingData.wsConnectionComplete - timingData.wsConnectionStart}ms<br>`;
    }
    html += `<br>Total: ${Date.now() - timingData.pageLoadStart}ms`;
    
    timingDisplay.innerHTML = html;
    document.body.appendChild(timingDisplay);
}

// Universal input lockout function - called when timer expires
function disableAllInputs() {
    // Speed Tap buttons
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
    
    // Closest Guess inputs and button
    const guessMin = document.getElementById('guessMin');
    const guessMax = document.getElementById('guessMax');
    const guessSubmitBtn = document.querySelector('.submit-guess-btn');
    
    if (guessMin) {
        guessMin.disabled = true;
        guessMin.style.opacity = '0.5';
    }
    if (guessMax) {
        guessMax.disabled = true;
        guessMax.style.opacity = '0.5';
    }
    if (guessSubmitBtn) {
        guessSubmitBtn.disabled = true;
        guessSubmitBtn.style.opacity = '0.5';
    }

    // Push Range buttons
    const pushButtons = document.querySelectorAll('.push-btn');
    if (pushButtons.length > 0) {
        pushButtons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    }

    // Crowd Wisdom buttons
    document.querySelectorAll('.crowd-wisdom-btn').forEach(btn => {
        btn.disabled = true;
    });

    // Word Guess input
    const wordInput = document.getElementById('wordGuessInput');
    const wordSubmitBtn = document.querySelector('.submit-word-btn');
    if (wordInput) wordInput.disabled = true;
    if (wordSubmitBtn) wordSubmitBtn.disabled = true;
}

// Universal Timer Urgency and Heartbeat Cleanup
function clearTimerUrgency() {
    if (typeof document === 'undefined') return;
    if (document.body) {
        document.body.classList.remove('timer-urgency', 'timer-critical');
    }
    const timerEl = document.getElementById('timer');
    if (timerEl) {
        timerEl.classList.remove('timer-beating', 'timer-critical-beat');
    }
}

// Generic timer function with Urgency Heartbeat & Haptics
let lastHapticTick = null;
function startTimer(seconds, startTime) {
    console.log('startTimer called for gameType:', gameType, 'seconds:', seconds);
    
    // Clear any existing timer & urgency effects first
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    clearTimerUrgency();
    clearSuspenseShimmer();
    lastHapticTick = null;
    
    const timerEl = document.getElementById('timer');
    const endTime = startTime + (seconds * 1000);
    
    function updateTimer() {
        const now = Date.now();
        const currentEndTime = (typeof expectedEndTime !== 'undefined' && expectedEndTime) ? expectedEndTime : endTime;
        const remaining = Math.max(0, Math.ceil((currentEndTime - now) / 1000));
        if (timerEl) {
            timerEl.textContent = remaining;
            
            if (remaining <= 5 && remaining > 3) {
                if (document.body && !document.body.classList.contains('timer-urgency')) {
                    document.body.classList.add('timer-urgency');
                    document.body.classList.remove('timer-critical');
                }
                if (!timerEl.classList.contains('timer-beating')) {
                    timerEl.classList.add('timer-beating');
                    timerEl.classList.remove('timer-critical-beat');
                }
            } else if (remaining <= 3 && remaining > 0) {
                if (document.body && !document.body.classList.contains('timer-critical')) {
                    document.body.classList.remove('timer-urgency');
                    document.body.classList.add('timer-critical');
                }
                if (!timerEl.classList.contains('timer-critical-beat')) {
                    timerEl.classList.remove('timer-beating');
                    timerEl.classList.add('timer-critical-beat');
                }
                // Haptic pulse on critical ticks (3, 2, 1)
                if (lastHapticTick !== remaining && typeof navigator !== 'undefined' && navigator.vibrate) {
                    lastHapticTick = remaining;
                    try { navigator.vibrate(20); } catch (_) {}
                }
            } else if (remaining > 5) {
                clearTimerUrgency();
            }
        }
        
        if (remaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            clearTimerUrgency();
            console.log('Timer hit zero! gameType:', gameType, 'wsState:', websocket?.readyState);
            
            // Disable all inputs universally
            disableAllInputs();
            
            // Show smooth suspense shimmer card while results are aggregated
            showSuspenseShimmer('feedback');
            
            // Trigger results calculation for closest_guess game
            if (gameType === 'closest_guess' && websocket && websocket.readyState === WebSocket.OPEN) {
                console.log('Closest Guess timer expired - sending timer_expired action');
                sendGameAction('timer_expired', { player_session_id: playerSession.id });
            } else {
                console.log('Timer expired but not sending:', { gameType, wsReady: websocket?.readyState });
            }
        }
    }
    
    // Initial update
    updateTimer();
    
    // Update every 100ms for smooth countdown
    timerInterval = setInterval(updateTimer, 100);
}

// Universal Locked In Stamp
const LOCKED_IN_LINES = [
    'Answer safely recorded. Waiting for room timer…',
    'Locked in! Fingers crossed for top score…',
    'Got it! Let’s see how the room responds…',
    'Hypothesis submitted. Awaiting results…',
    'Locked in! May the odds be in your favor.',
    'Submitted! No take-backs now.',
    'Answer vaulted. Waiting for reveal…'
];

function showLockedInStamp(target, options = {}) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(30); } catch (_) {}
    }

    const container = typeof target === 'string' ? document.getElementById(target) : (target || document.getElementById('feedback'));
    if (!container) return null;

    const subtext = options.message || LOCKED_IN_LINES[Math.floor(Math.random() * LOCKED_IN_LINES.length)];
    const stampEl = document.createElement('div');
    stampEl.className = 'locked-in-stamp-card';
    stampEl.innerHTML = `
        <div class="locked-in-header">
            <span class="locked-in-beacon"></span>
            <span class="locked-in-badge">🔒 LOCKED IN</span>
        </div>
        <p class="locked-in-subtext">${subtext}</p>
    `;

    container.innerHTML = '';
    container.appendChild(stampEl);
    return stampEl;
}

// ==========================================
// Haptic Alerting (Strictly Silent - No Audio)
// ==========================================
function playCueSound() {
    // Audio explicitly disabled per user preference
}
if (typeof window !== 'undefined') window.playCueSound = playCueSound;

function triggerHapticAlert(pattern = 25) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(pattern); } catch (_) {}
    }
}
if (typeof window !== 'undefined') {
    window.triggerHapticAlert = triggerHapticAlert;
    window.triggerHapticAndAudioAlert = triggerHapticAlert; // Backwards compatible alias
}

// Suspense Shimmer Transition
function showSuspenseShimmer(containerId = 'feedback') {
    // Check if round or entire game has already ended
    if (typeof window !== 'undefined' && (window.isRoundEnded || window.isGameCompleted)) return;

    // Check if results or debrief cards already landed
    if (typeof document !== 'undefined') {
        if (document.getElementById('roundCompleteBanner') || 
            document.querySelector('.bac-results') || 
            document.querySelector('.bb-results') || 
            document.querySelector('.results-display') ||
            document.getElementById('showFinaleBtn')) {
            return;
        }

        // Avoid duplicate shimmer banners
        if (document.getElementById('suspenseShimmerBanner')) return;
    }

    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    const shimmer = document.createElement('div');
    shimmer.id = 'suspenseShimmerBanner';
    shimmer.className = 'suspense-shimmer-card';
    shimmer.innerHTML = `
        <div class="suspense-shimmer-bar"></div>
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem; display: inline-block; animation: rotate 2.5s ease-in-out infinite;">⏳</div>
        <div style="font-size: 1.2rem; font-weight: 800; margin-bottom: 0.35rem; color: #f8fafc;">Time's Up!</div>
        <div style="font-size: 0.92rem; color: #94a3b8;">Aggregating room results & calculating standings…</div>
        <style>
            @keyframes rotate { 0% { transform: rotate(0deg); } 40% { transform: rotate(180deg); } 50% { transform: rotate(180deg); } 90% { transform: rotate(360deg); } 100% { transform: rotate(360deg); } }
        </style>
    `;

    // CRITICAL: If container is 'gameArea', NEVER erase existing content with innerHTML = ''!
    // Instead, prepend the banner on top so that underlying elements aren't permanently lost.
    if (container.id === 'gameArea') {
        container.prepend(shimmer);
    } else {
        container.innerHTML = '';
        container.appendChild(shimmer);
    }
}
if (typeof window !== 'undefined') window.showSuspenseShimmer = showSuspenseShimmer;

function clearSuspenseShimmer() {
    if (typeof document !== 'undefined') {
        const shimmer = document.getElementById('suspenseShimmerBanner');
        if (shimmer) shimmer.remove();
    }
}
if (typeof window !== 'undefined') window.clearSuspenseShimmer = clearSuspenseShimmer;

// Animated Score Count-Up with ease-out cubic
function animateScoreCountUp(element, startScore, targetScore, duration = 800) {
    if (!element) return;
    const start = Number(startScore) || 0;
    const end = Number(targetScore) || 0;
    if (start === end) {
        element.textContent = end;
        return;
    }

    element.classList.remove('score-pop');
    void element.offsetWidth; // trigger reflow
    element.classList.add('score-pop');

    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    function tick(currentTime) {
        const now = currentTime || ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now());
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * easeOut);
        element.textContent = current;

        if (progress < 1 && typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(tick);
        } else {
            element.textContent = end;
            setTimeout(() => {
                if (element) element.classList.remove('score-pop');
            }, 400);
        }
    }

    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(tick);
    } else {
        element.textContent = end;
    }
}

// Floating Points Celebration Pill
function spawnFloatingPoints(points, targetEl = null) {
    if (!points || points <= 0 || typeof document === 'undefined') return;

    const anchor = targetEl || document.getElementById('playerScore') || document.querySelector('.player-score');
    let x = (typeof window !== 'undefined' ? window.innerWidth : 800) / 2;
    let y = (typeof window !== 'undefined' ? window.innerHeight : 600) / 3;

    if (anchor && typeof anchor.getBoundingClientRect === 'function') {
        const rect = anchor.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top;
    }

    const pill = document.createElement('div');
    pill.className = 'floating-points-pill';
    pill.textContent = `+${points} PTS 🎯`;
    pill.style.left = `${x}px`;
    pill.style.top = `${y}px`;

    document.body.appendChild(pill);
    pill.addEventListener('animationend', () => pill.remove());
    setTimeout(() => { if (pill.parentNode) pill.remove(); }, 1400);
}

// YOU Anchor Badge for charts
function renderYouBadge(customText = 'YOU') {
    return `<span class="you-anchor-badge">★ ${customText}</span>`;
}


// Guest tag helpers for single-page join & stable player identity
const GUEST_TAG_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const GUEST_TAG_LENGTH = 4;
const GUEST_NAME_MAX = 100;

function getGuestTagKey(code) {
    return `praxisPlayGuestTag:${(code || '').toUpperCase()}`;
}

function makeGuestTag() {
    const draws = new Uint32Array(GUEST_TAG_LENGTH);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(draws);
    } else {
        for (let i = 0; i < GUEST_TAG_LENGTH; i++) {
            draws[i] = Math.floor(Math.random() * GUEST_TAG_CHARS.length);
        }
    }
    let tag = '';
    for (let i = 0; i < GUEST_TAG_LENGTH; i++) {
        tag += GUEST_TAG_CHARS[draws[i] % GUEST_TAG_CHARS.length];
    }
    return tag;
}

function guestTagFor(code) {
    try {
        const saved = localStorage.getItem(getGuestTagKey(code));
        if (saved && saved.length === GUEST_TAG_LENGTH) {
            return saved;
        }
    } catch (_) {}
    const tag = makeGuestTag();
    try {
        localStorage.setItem(getGuestTagKey(code), tag);
    } catch (_) {}
    return tag;
}

function decorateGuestName(code, typedName) {
    const suffix = ' ' + guestTagFor(code);
    return (typedName || '').slice(0, GUEST_NAME_MAX - suffix.length) + suffix;
}
