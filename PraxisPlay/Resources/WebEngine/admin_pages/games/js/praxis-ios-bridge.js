/**
 * Praxis Play — Native iOS Bridge (WKWebView <-> SwiftUI)
 * Bridges CoreHaptics, Live Score/Rank HUD telemetry, WebSocket auto-heal,
 * and Solo Practice Arcade simulation for all 9 Praxis Play minigames.
 */
(function () {
    'use strict';

    if (window.__praxisIOSBridgeLoaded) return;
    window.__praxisIOSBridgeLoaded = true;

    function postToNative(payload) {
        try {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.praxisNative) {
                window.webkit.messageHandlers.praxisNative.postMessage(payload);
            }
        } catch (err) {
            console.warn('[Praxis-iOS] Native postMessage error:', err);
        }
    }

    window.PraxisIOSBridge = {
        post: postToNative,
        triggerReconnect: function () {
            console.log('[Praxis-iOS] Native foreground wakeup -> verifying WebSocket');
            if (typeof handleMobileTabWakeup === 'function') {
                handleMobileTabWakeup();
            } else if (typeof retryConnectionNow === 'function') {
                retryConnectionNow();
            }
        }
    };

    // 1. Bridge navigator.vibrate & triggerHapticAlert to iOS CoreHaptics / UIImpactFeedbackGenerator
    try {
        navigator.vibrate = function (pattern) {
            postToNative({
                type: 'haptic',
                pattern: Array.isArray(pattern) ? pattern : [Number(pattern) || 25]
            });
            return true;
        };
    } catch (_) {}

    window.triggerHapticAlert = function (pattern) {
        postToNative({
            type: 'haptic',
            pattern: Array.isArray(pattern) ? pattern : [Number(pattern) || 25]
        });
    };
    window.triggerHapticAndAudioAlert = window.triggerHapticAlert;

    // 2. Inject iOS-native CSS refinements (hide duplicate web header/footer since SwiftUI renders native HUD)
    function injectIOSStyles() {
        const style = document.createElement('style');
        style.id = 'praxis-ios-native-styles';
        style.textContent = `
            * {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
            }
            body {
                -webkit-user-select: none;
                user-select: none;
                padding-top: 8px !important;
                padding-bottom: env(safe-area-inset-bottom, 20px) !important;
                overflow-x: hidden;
            }
            input, textarea {
                -webkit-user-select: text !important;
                user-select: text !important;
                font-size: 16px !important; /* Prevents iOS auto-zoom on input focus */
            }
            .game-header {
                display: none !important;
            }
            footer {
                display: none !important;
            }
            .game-container {
                margin-top: 0 !important;
                padding-top: 4px !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectIOSStyles);
    } else {
        injectIOSStyles();
    }

    // 3. Tactile micro-haptics on interactive game controls
    document.addEventListener('touchstart', function (e) {
        const target = e.target && e.target.closest
            ? e.target.closest('.answer-btn, .crowd-wisdom-btn, .push-btn, .bb-btn, .bac-option, .mr-option-card, .buzzer-btn, #confirmBtn, #bbLockBtn, #bacLockBtn, #mrSubmitBtn, .submit-guess-btn, .submit-word-btn')
            : null;
        if (target && !target.disabled) {
            postToNative({ type: 'haptic', pattern: [18] });
        }
    }, { passive: true });

    // 4. Observe Score, Rank, and Connection State to sync with Native SwiftUI Top HUD
    function syncHUDToNative(extra) {
        const scoreEl = document.getElementById('playerScore');
        const rankEl = document.getElementById('playerRank');
        const score = scoreEl ? (parseInt(scoreEl.textContent, 10) || 0) : 0;
        const rankText = rankEl ? (rankEl.textContent || '-').trim() : '-';
        let wsState = 'connecting';
        if (window.DEV_MODE) {
            wsState = 'solo';
        } else if (typeof websocket !== 'undefined' && websocket) {
            wsState = websocket.readyState === 1 ? 'connected' : (websocket.readyState === 0 ? 'connecting' : 'reconnecting');
        }
        postToNative(Object.assign({
            type: 'hudUpdate',
            score: score,
            rank: rankText,
            gameType: typeof gameType !== 'undefined' ? (gameType || '') : '',
            roomCode: typeof roomCode !== 'undefined' ? (roomCode || '') : '',
            connectionState: wsState
        }, extra || {}));
    }

    document.addEventListener('DOMContentLoaded', function () {
        const scoreEl = document.getElementById('playerScore');
        const rankEl = document.getElementById('playerRank');
        const observer = new MutationObserver(function () {
            syncHUDToNative();
        });
        if (scoreEl) observer.observe(scoreEl, { childList: true, characterData: true, subtree: true });
        if (rankEl) observer.observe(rankEl, { childList: true, characterData: true, subtree: true });

        setInterval(function () {
            syncHUDToNative();
        }, 1500);
        syncHUDToNative();

        // Enhance MockWebSocket for Solo Practice Arcade across all 9 game modes
        enhanceSoloArcadeIfNeeded();
    });

    function enhanceSoloArcadeIfNeeded() {
        if (!window.DEV_MODE || typeof MockWebSocket === 'undefined') return;

        // Ensure Line Fit scatter data renders reliably once line-fit.js lazy-loads
        if (window.DEV_STATE && window.DEV_STATE.indexOf('line_fit') !== -1) {
            fetch('dev_data/snapshots/line_fit_active.json')
                .then(function (r) { return r.json(); })
                .then(function (snap) {
                    if (!snap || !snap.scatter_data_message) return;
                    let attempts = 0;
                    const poll = setInterval(function () {
                        attempts++;
                        if (typeof handleLineFitData === 'function' && typeof lineFitState !== 'undefined' && lineFitState.canvas) {
                            clearInterval(poll);
                            if (!lineFitState.scatterData) {
                                handleLineFitData(JSON.parse(JSON.stringify(snap.scatter_data_message)));
                            }
                        } else if (attempts > 40) {
                            clearInterval(poll);
                        }
                    }, 150);
                })
                .catch(function () {});
        }

        const originalSend = MockWebSocket.prototype.send;
        MockWebSocket.prototype.send = function (rawData) {
            let msg = {};
            try {
                msg = JSON.parse(rawData);
            } catch (_) {}

            const action = msg.action;
            const data = msg.data || {};
            const self = this;

            console.log('[Praxis-iOS Solo] Intercepted action:', action, data);

            if (action === 'identify' || action === 'speed_tap') {
                return originalSend.call(this, rawData);
            }

            if (action === 'line_fit_propose') {
                return;
            }

            // Closest Guess submission in Solo Mode
            if (action === 'submit_range' || action === 'closest_guess' || action === 'timer_expired') {
                if (action !== 'timer_expired') {
                    this.simulateMessage({
                        type: 'guess_submitted',
                        guess_min: data.guess_min,
                        guess_max: data.guess_max
                    });
                }
                setTimeout(async function () {
                    try {
                        const res = await fetch('dev_data/snapshots/closest_guess_results_correct.json');
                        const json = await res.json();
                        self.simulateMessage(json);
                        postToNative({ type: 'soloCompleted', gameType: 'closest_guess', points: 125 });
                    } catch (e) { console.error(e); }
                }, 1600);
                return;
            }

            // Crowd Wisdom submission in Solo Mode
            if (action === 'crowd_wisdom_answer' || action === 'submit_answer') {
                this.simulateMessage({
                    type: 'answer_submitted',
                    option_index: data.option_index
                });
                setTimeout(async function () {
                    try {
                        const res = await fetch('dev_data/snapshots/crowd_wisdom_results_correct.json');
                        const json = await res.json();
                        self.simulateMessage(json);
                        postToNative({ type: 'soloCompleted', gameType: 'crowd_wisdom', points: 140 });
                    } catch (e) { console.error(e); }
                }, 1800);
                return;
            }

            // Word Guess submission in Solo Mode
            if (action === 'word_guess' || action === 'submit_word_guess') {
                this.simulateMessage({
                    type: 'word_guess_correct',
                    points: 150,
                    answer: data.guess || 'ELASTICITY'
                });
                setTimeout(async function () {
                    try {
                        const res = await fetch('dev_data/snapshots/word_guess_results_correct.json');
                        const json = await res.json();
                        self.simulateMessage(json);
                        postToNative({ type: 'soloCompleted', gameType: 'word_guess', points: 150 });
                    } catch (e) { console.error(e); }
                }, 1800);
                return;
            }

            // Line Fit submission in Solo Mode
            if (action === 'submit_line' || action === 'line_fit_submit' || action === 'line_fit_confirm') {
                setTimeout(async function () {
                    try {
                        const res = await fetch('dev_data/snapshots/line_fit_results_correct.json');
                        const json = await res.json();
                        self.simulateMessage(json);
                        postToNative({ type: 'soloCompleted', gameType: 'line_fit', points: 145 });
                    } catch (e) { console.error(e); }
                }, 1600);
                return;
            }

            // Push Range button presses in Solo Mode
            if (action === 'push_range_press' || action === 'button_press') {
                if (!this.__pushSoloDone) {
                    this.__pushSoloDone = true;
                    setTimeout(async function () {
                        try {
                            const res = await fetch('dev_data/snapshots/push_range_results_correct.json');
                            const json = await res.json();
                            self.simulateMessage(json);
                            postToNative({ type: 'soloCompleted', gameType: 'push_range', points: 130 });
                        } catch (e) { console.error(e); }
                    }, 8000);
                }
                return;
            }

            // Budget Blitz submission in Solo Mode
            if (action === 'budget_blitz_submit') {
                const alloc = data.allocation_by_channel_id || {};
                this.simulateMessage({
                    type: 'budget_blitz_accepted',
                    allocation: alloc
                });
                setTimeout(function () {
                    const channels = (typeof budgetBlitzState !== 'undefined' && budgetBlitzState.channels) || [];
                    let myOutcome = 0;
                    channels.forEach(function (c) {
                        const n = alloc[c.id] || 0;
                        const rets = c.marginal_returns || [];
                        for (let i = 0; i < n && i < rets.length; i++) myOutcome += rets[i];
                    });
                    const best = 189;
                    const eff = Math.min(100, Math.round((myOutcome / best) * 100));
                    const pts = Math.round(eff * 1.5);
                    self.simulateMessage({
                        type: 'game_results',
                        game_type: 'budget_blitz',
                        current_round: 1,
                        total_rounds: 3,
                        player_scores: [{
                            player_id: (typeof playerSession !== 'undefined' && playerSession.id) || 999,
                            submitted: true,
                            outcome: myOutcome,
                            points: pts,
                            allocation: alloc
                        }],
                        game_specific: {
                            best_outcome: best,
                            response_unit: 'conversions',
                            best_allocations: [{ paid_search: 2, creator_reels: 2, retargeting_crm: 1 }],
                            channels: channels,
                            takeaway: 'Equimarginal Principle: Place each additional token where the NEXT marginal return is highest!'
                        }
                    });
                    postToNative({ type: 'soloCompleted', gameType: 'budget_blitz', points: pts });
                }, 1600);
                return;
            }

            // Buy a Clue actions in Solo Mode
            if (action === 'buy_a_clue_purchase') {
                this.simulateMessage({
                    type: 'buy_a_clue_clue',
                    clue_text: 'Hint: In CLV = ARPU / Churn, cutting churn from 5% to 2.5% divides the denominator by 2!'
                });
                return;
            }

            if (action === 'buy_a_clue_submit') {
                const optId = data.option_id;
                const bought = Boolean(typeof buyAClueState !== 'undefined' && buyAClueState.bought);
                this.simulateMessage({
                    type: 'buy_a_clue_accepted',
                    option_id: optId
                });
                setTimeout(function () {
                    const isCorrect = (optId === 'B');
                    const answerPts = isCorrect ? 100 : 0;
                    const clueCharge = bought ? 25 : 0;
                    const netPts = answerPts - clueCharge;
                    self.simulateMessage({
                        type: 'game_results',
                        game_type: 'buy_a_clue',
                        current_round: 2,
                        total_rounds: 3,
                        correct_answer: { text: 'CLV doubles by 100% (from $2,000 to $4,000)' },
                        player_scores: [{
                            player_id: (typeof playerSession !== 'undefined' && playerSession.id) || 999,
                            answered: true,
                            is_correct: isCorrect,
                            bought_clue: bought,
                            answer_points: answerPts,
                            clue_charge: clueCharge,
                            points: netPts
                        }],
                        game_specific: {
                            buyers: bought ? 9 : 8,
                            clue_cost: 25,
                            clue_text: 'Hint: In CLV = ARPU / Churn, cutting churn from 5% to 2.5% divides the denominator by 2!',
                            answer_explanation: 'Because churn is in the denominator of CLV = ARPU / c, halving churn from 5% to 2.5% doubles CLV from $2,000 to $4,000.',
                            takeaway: 'Value of Information (VoI): Buy research when uncertainty is high and the decision payoff exceeds the research cost.'
                        }
                    });
                    postToNative({ type: 'soloCompleted', gameType: 'buy_a_clue', points: Math.max(0, netPts) });
                }, 1600);
                return;
            }

            // Minority Rule submission in Solo Mode
            if (action === 'minority_rule_submit') {
                const chosenIdx = Number(data.option_index) || 0;
                this.simulateMessage({
                    type: 'minority_rule_accepted',
                    option_index: chosenIdx
                });
                setTimeout(function () {
                    const isBlueOcean = (chosenIdx === 1);
                    const isCrowded = (chosenIdx === 0);
                    const status = isBlueOcean ? 'minority_winner' : (isCrowded ? 'crowded_trap' : 'intermediate');
                    const pts = isBlueOcean ? 150 : (isCrowded ? 20 : 85);
                    self.simulateMessage({
                        type: 'game_results',
                        game_type: 'minority_rule',
                        current_round: 3,
                        total_rounds: 3,
                        player_scores: [{
                            player_id: (typeof playerSession !== 'undefined' && playerSession.id) || 999,
                            option_index: chosenIdx,
                            outcome_status: status,
                            points: pts
                        }],
                        game_specific: {
                            total_submissions: 30,
                            minority_options: [1],
                            majority_options: [0],
                            is_tie: false,
                            takeaway: 'When 54% of competitors crowd into High-Caffeine Pre-Workout cans, price wars destroy margins. Blue Ocean strategists capture underserved niches!',
                            distribution: [
                                { option_index: 0, text: '⚡ High-Caffeine Gym Pre-Workout Cans', count: 16, percent: 54 },
                                { option_index: 1, text: '🧠 Caffeine-Free Evening Focus & Tart Cherry Nootropic', count: 3, percent: 10 },
                                { option_index: 2, text: '🍓 Zero-Sugar Fruit Sparkling Hydration', count: 6, percent: 20 },
                                { option_index: 3, text: '☕ Cold-Brew Protein RTD Shake', count: 5, percent: 16 }
                            ]
                        }
                    });
                    postToNative({ type: 'soloCompleted', gameType: 'minority_rule', points: pts });
                }, 1600);
                return;
            }

            return originalSend.call(this, rawData);
        };
    }
})();
