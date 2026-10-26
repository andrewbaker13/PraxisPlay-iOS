/**
 * Praxis Play — Native iOS & iPadOS Bridge (WKWebView <-> SwiftUI)
 * - Option A: Cohesive Native iOS Dark-Glass UI Theme across all 9 minigames
 * - Touch Upgrades:
 *   1. Line Fit 60fps Live Touch-Drag (press & slide to pivot regression line + grab endpoints)
 *   2. Closest Guess Tactile Thumb Sliders & Quick Steppers (-5 / -1 / +1 / +5)
 *   3. Word Guess Built-in Dark-Glass QWERTY Tile Keypad (no system keyboard covering the screen)
 *   4. Automatic iOS Virtual Keyboard Scroll Snap-Back
 * - CoreHaptics Bridge, Live Score/Rank HUD Telemetry, & Solo Practice Arcade Simulation
 */
(function () {
    'use strict';

    if (window.__praxisIOSBridgeLoaded) return;
    window.__praxisIOSBridgeLoaded = true;

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function postToNative(payload) {
        try {
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.praxisNative) {
                window.webkit.messageHandlers.praxisNative.postMessage(payload);
            }
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ source: 'praxisNative', payload: payload }, '*');
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
            try {
                document.dispatchEvent(new Event('visibilitychange'));
            } catch (_) {}
        }
    };

    const isClassicPlayPage = function () {
        return Boolean(
            document.getElementById('gameArea') ||
            (window.location.pathname.indexOf('/games/play.html') !== -1)
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Bridge navigator.vibrate & triggerHapticAlert to iOS CoreHaptics
    // ─────────────────────────────────────────────────────────────────────────
    try {
        navigator.vibrate = function (pattern) {
            postToNative({
                type: 'haptic',
                pattern: Array.isArray(pattern) ? pattern : [Number(pattern) || 22]
            });
            return true;
        };
    } catch (_) {}

    window.triggerHapticAlert = function (pattern) {
        postToNative({
            type: 'haptic',
            pattern: Array.isArray(pattern) ? pattern : [Number(pattern) || 22]
        });
    };
    window.triggerHapticAndAudioAlert = window.triggerHapticAlert;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Native Lively Classroom Daylight Theme & Single-Screen Viewport Layout
    // ─────────────────────────────────────────────────────────────────────────
    function injectIOSStyles() {
        if (!isClassicPlayPage()) return;
        if (document.getElementById('praxis-ios-native-styles')) return;
        const style = document.createElement('style');
        style.id = 'praxis-ios-native-styles';
        style.textContent = `
            :root {
                --ios-bg-top: #5B6CF9;
                --ios-bg-mid: #6366F1;
                --ios-bg-bot: #7C3AED;
                --ios-card-bg: #FFFFFF;
                --ios-surface: #F8FAFC;
                --ios-surface-elevated: #F1F5F9;
                --ios-surface-deep: #F8FAFC;
                --ios-border: #CBD5E1;
                --ios-border-highlight: #3B82F6;
                --ios-text-primary: #0F172A;
                --ios-text-secondary: #475569;
                --ios-accent-blue: #2563EB;
                --ios-accent-indigo: #4F46E5;
                --ios-accent-emerald: #10B981;
                --ios-accent-amber: #D97706;
                --ios-accent-rose: #E11D48;
            }

            * {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
                box-sizing: border-box;
                font-family: -apple-system, 'SF Pro Rounded', 'SF Pro Display', 'SF Pro Text', BlinkMacSystemFont, system-ui, sans-serif !important;
                -webkit-font-smoothing: antialiased;
            }

            html, body {
                -webkit-user-select: none;
                user-select: none;
                margin: 0 !important;
                padding: 4px 8px env(safe-area-inset-bottom, 12px) 8px !important;
                min-height: 100vh !important;
                background: linear-gradient(135deg, var(--ios-bg-top) 0%, var(--ios-bg-mid) 50%, var(--ios-bg-bot) 100%) !important;
                color: var(--ios-text-primary) !important;
                overflow-x: hidden;
            }

            input, textarea {
                -webkit-user-select: text !important;
                user-select: text !important;
                font-size: 16px !important; /* Prevents iOS auto-zoom on focus */
            }

            .game-header, footer, .skip-link {
                display: none !important;
            }

            /* Vertically Centered Single-Screen Container */
            .game-container {
                margin: 0 auto !important;
                padding: 0 !important;
                max-width: 700px !important;
                min-height: calc(100vh - 18px) !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                gap: 10px !important;
            }

            /* Crisp Daylight White Main Arena Card */
            .game-area {
                margin-bottom: 0 !important;
                padding: 14px !important;
                border-radius: 22px !important;
                min-height: auto !important;
                background: #FFFFFF !important;
                border: 1px solid rgba(255, 255, 255, 0.85) !important;
                box-shadow: 0 16px 40px rgba(15, 23, 42, 0.22) !important;
                color: var(--ios-text-primary) !important;
            }

            /* Collapsible Daylight Leaderboard Pill */
            .leaderboard {
                padding: 10px 16px !important;
                border-radius: 16px !important;
                margin-top: 0 !important;
                background: rgba(255, 255, 255, 0.96) !important;
                border: 1px solid #E2E8F0 !important;
                box-shadow: 0 10px 25px rgba(15, 23, 42, 0.16) !important;
                cursor: pointer;
                user-select: none;
            }
            .leaderboard h3 {
                margin: 0 !important;
                font-size: 0.9rem !important;
                font-weight: 700 !important;
                color: #0F172A !important;
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
            }
            .leaderboard h3::after {
                content: 'Tap to expand ▾';
                font-size: 0.75rem;
                font-weight: 700;
                color: #2563EB;
                background: #EFF6FF;
                border: 1px solid #BFDBFE;
                padding: 3px 9px;
                border-radius: 999px;
            }
            .leaderboard.ios-expanded h3::after {
                content: 'Hide ▴';
            }
            .leaderboard #leaderboardList {
                display: none;
                margin-top: 10px !important;
                max-height: 200px;
                overflow-y: auto;
            }
            .leaderboard.ios-expanded #leaderboardList {
                display: block !important;
            }
            .leaderboard-item {
                background: #F8FAFC !important;
                border: 1px solid #E2E8F0 !important;
                color: #0F172A !important;
                border-radius: 10px !important;
                padding: 8px 12px !important;
                margin-bottom: 6px !important;
            }
            .leaderboard-item.own {
                background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%) !important;
                border: 1.5px solid #10B981 !important;
                color: #065F46 !important;
            }

            /* Universal Question & Timer Styling */
            .question-display {
                margin-bottom: 10px !important;
            }
            .question-text {
                font-size: 1.06rem !important;
                font-weight: 700 !important;
                line-height: 1.32 !important;
                color: #0F172A !important;
                margin-bottom: 6px !important;
                letter-spacing: -0.01em !important;
            }
            .timer {
                font-size: 1.45rem !important;
                font-weight: 800 !important;
                line-height: 1.1 !important;
                margin: 2px 0 !important;
                color: #E11D48 !important;
                background: #FFF1F2 !important;
                border: 1.5px solid #FECDD3 !important;
                padding: 4px 12px !important;
                border-radius: 12px !important;
                display: inline-block !important;
                font-variant-numeric: tabular-nums !important;
            }
            #availablePoints, .available-points {
                font-variant-numeric: tabular-nums !important;
                background: #ECFDF5 !important;
                border: 1px solid #A7F3D0 !important;
                color: #059669 !important;
                padding: 4px 10px !important;
                border-radius: 10px !important;
                font-size: 1.05rem !important;
            }

            /* Waiting State & Alerts in Classroom Daylight */
            .waiting-state h2 {
                color: #0F172A !important;
            }
            .waiting-state p {
                color: #475569 !important;
            }
            .alert-info {
                background: #EFF6FF !important;
                border: 1px solid #BFDBFE !important;
                color: #1E40AF !important;
            }
            .alert-success {
                background: #ECFDF5 !important;
                border: 1px solid #A7F3D0 !important;
                color: #065F46 !important;
            }
            .alert-error, .alert-danger {
                background: #FFF1F2 !important;
                border: 1px solid #FECDD3 !important;
                color: #9F1239 !important;
            }

            /* ── 1. SPEED TAP: 3D Tactile Daylight Answer Cards ── */
            .answer-options {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                gap: 10px !important;
                margin: 10px 0 !important;
            }
            .answer-btn {
                padding: 14px 12px !important;
                font-size: 0.98rem !important;
                font-weight: 700 !important;
                min-height: 64px !important;
                color: #0F172A !important;
                background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%) !important;
                border: 2px solid #CBD5E1 !important;
                border-radius: 16px !important;
                box-shadow: 0 4px 0 #CBD5E1, 0 6px 14px rgba(15, 23, 42, 0.08) !important;
                transition: transform 0.1s ease, border-color 0.15s ease, background 0.15s ease !important;
            }
            .answer-btn:active:not(:disabled) {
                transform: translateY(3px) scale(0.98) !important;
                box-shadow: 0 1px 0 #CBD5E1 !important;
            }
            .answer-btn.selected, .answer-btn.correct {
                background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
                border-color: #047857 !important;
                color: #FFFFFF !important;
                box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35) !important;
            }
            .answer-btn.unselected {
                background: #F1F5F9 !important;
                border-color: #E2E8F0 !important;
                color: #94A3B8 !important;
                opacity: 0.65 !important;
                box-shadow: none !important;
            }

            /* ── 2. BUDGET BLITZ: 3-Column Daylight Optimizer ── */
            .bb-area {
                padding: 2px !important;
            }
            .bb-header {
                gap: 8px !important;
                margin-bottom: 10px !important;
                flex-wrap: nowrap !important;
            }
            .bb-header .timer {
                font-size: 1.35rem !important;
                padding: 6px 10px !important;
                flex-shrink: 0 !important;
            }
            .bb-prompt {
                font-size: 0.9rem !important;
                line-height: 1.28 !important;
                padding: 8px 11px !important;
                min-width: 0 !important;
                background: #F8FAFC !important;
                border: 1px solid #CBD5E1 !important;
                color: #0F172A !important;
                border-radius: 14px !important;
            }
            .bb-remaining {
                font-size: 1.05rem !important;
                padding: 6px 10px !important;
                flex-shrink: 0 !important;
                line-height: 1.1 !important;
                background: #EFF6FF !important;
                border: 1.5px solid #93C5FD !important;
                color: #1D4ED8 !important;
                border-radius: 14px !important;
                font-variant-numeric: tabular-nums !important;
            }
            .bb-remaining small {
                color: #475569 !important;
            }
            .bb-channels {
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                gap: 7px !important;
                margin-bottom: 10px !important;
            }
            .bb-channel {
                padding: 9px 6px !important;
                background: #F8FAFC !important;
                border: 1.5px solid #CBD5E1 !important;
                border-radius: 15px !important;
                box-shadow: 0 3px 10px rgba(15, 23, 42, 0.06) !important;
            }
            .bb-channel.bb-has-tokens {
                border-color: #2563EB !important;
                background: linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%) !important;
                box-shadow: 0 4px 14px rgba(37, 99, 235, 0.14) !important;
            }
            .bb-channel-name {
                font-size: 0.76rem !important;
                line-height: 1.15 !important;
                min-height: 2.25em !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin-bottom: 2px !important;
                color: #0F172A !important;
                font-weight: 700 !important;
            }
            .bb-channel-tokens {
                font-size: 1.7rem !important;
                color: #2563EB !important;
                font-variant-numeric: tabular-nums !important;
            }
            .bb-channel-stats {
                font-size: 0.68rem !important;
                margin: 4px 0 6px 0 !important;
                line-height: 1.2 !important;
                color: #475569 !important;
            }
            .bb-channel-stats strong {
                color: #0F172A !important;
            }
            .bb-controls {
                gap: 6px !important;
            }
            .bb-btn {
                width: 38px !important;
                height: 36px !important;
                font-size: 1.25rem !important;
                border-radius: 10px !important;
                transition: transform 0.08s ease !important;
            }
            .bb-btn:active:not(:disabled) {
                transform: scale(0.91) !important;
            }
            .bb-minus {
                background: #E2E8F0 !important;
                color: #0F172A !important;
                border: 1px solid #CBD5E1 !important;
            }
            .bb-plus {
                background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%) !important;
                color: #FFFFFF !important;
                box-shadow: 0 3px 10px rgba(37, 99, 235, 0.25) !important;
            }
            .bb-outcome {
                padding: 8px 12px !important;
                font-size: 0.95rem !important;
                margin-bottom: 7px !important;
                background: #F8FAFC !important;
                border: 1px solid #CBD5E1 !important;
                color: #0F172A !important;
                border-radius: 12px !important;
            }
            .bb-outcome strong {
                color: #059669 !important;
                font-size: 1.08rem !important;
            }
            .bb-table {
                padding: 6px 12px !important;
                margin-bottom: 9px !important;
                font-size: 0.8rem !important;
                background: #F8FAFC !important;
                border: 1px solid #CBD5E1 !important;
                color: #334155 !important;
                border-radius: 12px !important;
            }
            .bb-table th, .bb-table td {
                border-bottom: 1px solid #E2E8F0 !important;
                color: #0F172A !important;
            }
            .bb-lock {
                padding: 13px !important;
                font-size: 1rem !important;
                border-radius: 14px !important;
                background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
                box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3) !important;
            }
            .bb-lock:disabled {
                background: #E2E8F0 !important;
                color: #64748B !important;
                box-shadow: none !important;
            }

            /* ── 3. MINORITY RULE: Daylight Blue Ocean Cards ── */
            .mr-area {
                padding: 2px !important;
            }
            .mr-area > div:first-child {
                margin-bottom: 8px !important;
            }
            .mr-area > div:nth-child(2) {
                padding: 11px 14px !important;
                margin-bottom: 10px !important;
                background: #F0F9FF !important;
                border: 1px solid #BAE6FD !important;
                border-top: 3px solid #0284C7 !important;
                border-radius: 16px !important;
                box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08) !important;
            }
            .mr-area > div:nth-child(2) > div {
                font-size: 0.95rem !important;
                line-height: 1.32 !important;
                color: #0F172A !important;
            }
            .mr-option-card {
                padding: 10px 12px !important;
                margin-bottom: 7px !important;
                border-radius: 14px !important;
                gap: 10px !important;
                background: #F8FAFC !important;
                border: 1.5px solid #CBD5E1 !important;
                box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05) !important;
            }
            .mr-option-card .mr-badge {
                width: 30px !important;
                height: 30px !important;
                font-size: 14px !important;
                background: #EFF6FF !important;
                color: #2563EB !important;
                border: 1px solid #93C5FD !important;
            }
            .mr-option-card > div:nth-child(2) {
                font-size: 0.91rem !important;
                line-height: 1.25 !important;
                color: #0F172A !important;
            }
            .mr-option-card.selected {
                border-color: #0284C7 !important;
                background: #E0F2FE !important;
                box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.25), 0 4px 12px rgba(2, 132, 199, 0.14) !important;
            }
            #mrActionContainer {
                margin-top: 10px !important;
            }
            #mrSubmitBtn {
                padding: 13px !important;
                font-size: 1rem !important;
                border-radius: 14px !important;
            }

            /* ── 4. BUY A CLUE: Daylight VoI Decision Cards ── */
            .bac-area {
                padding: 2px !important;
            }
            .bac-header {
                gap: 8px !important;
                margin-bottom: 7px !important;
                flex-wrap: nowrap !important;
            }
            .bac-prompt {
                font-size: 0.92rem !important;
                line-height: 1.28 !important;
                padding: 9px 12px !important;
                min-width: 0 !important;
                background: #F8FAFC !important;
                border: 1px solid #CBD5E1 !important;
                color: #0F172A !important;
                border-radius: 14px !important;
            }
            .bac-rules {
                padding: 7px 10px !important;
                margin-bottom: 8px !important;
                font-size: 0.8rem !important;
                background: #F1F5F9 !important;
                border: 1px solid #CBD5E1 !important;
                color: #334155 !important;
                border-radius: 12px !important;
            }
            .bac-rules strong {
                color: #2563EB !important;
            }
            .bac-rules-note {
                color: #475569 !important;
            }
            .bac-clue {
                padding: 9px 12px !important;
                margin-bottom: 8px !important;
                font-size: 0.88rem !important;
                background: #FEF9C3 !important;
                border: 1.5px solid #EAB308 !important;
                color: #713F12 !important;
                border-radius: 12px !important;
            }
            .bac-options {
                gap: 7px !important;
                margin-bottom: 9px !important;
            }
            .bac-option {
                padding: 11px 13px !important;
                font-size: 0.92rem !important;
                background: #F8FAFC !important;
                border: 1.5px solid #CBD5E1 !important;
                color: #0F172A !important;
                border-radius: 14px !important;
                transition: transform 0.08s ease, border-color 0.15s ease !important;
            }
            .bac-option:active:not(:disabled) {
                transform: scale(0.985) !important;
            }
            .bac-option.bac-selected {
                border-color: #2563EB !important;
                background: #EFF6FF !important;
                color: #1E3A8A !important;
                box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2) !important;
            }
            .bac-actions {
                grid-template-columns: 1fr 1fr !important;
                gap: 8px !important;
            }
            .bac-buy {
                padding: 11px 8px !important;
                font-size: 0.88rem !important;
                background: #FEF3C7 !important;
                border: 1.5px solid #F59E0B !important;
                color: #92400E !important;
                border-radius: 14px !important;
            }
            .bac-lock {
                padding: 11px 8px !important;
                font-size: 0.92rem !important;
                border-radius: 14px !important;
                background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
                color: #FFFFFF !important;
            }
            .bac-lock:disabled {
                background: #E2E8F0 !important;
                color: #64748B !important;
            }

            /* ── 5. CLOSEST GUESS: Tactile Sliders + Stepper Pills ── */
            .closest-guess-area {
                padding: 2px !important;
            }
            .range-inputs {
                margin: 6px auto !important;
                gap: 8px !important;
            }
            .range-input-group label {
                color: #475569 !important;
                font-size: 0.74rem !important;
                text-transform: uppercase !important;
                letter-spacing: 0.06em !important;
                margin-bottom: 4px !important;
            }
            .range-input-group input[type="number"] {
                padding: 8px !important;
                font-size: 1.3rem !important;
                font-weight: 800 !important;
                background: #F8FAFC !important;
                border: 1.5px solid #3B82F6 !important;
                color: #0F172A !important;
                border-radius: 12px !important;
                font-variant-numeric: tabular-nums !important;
            }
            .range-separator {
                font-size: 1.2rem !important;
                color: #64748B !important;
                font-weight: 700 !important;
            }
            /* Custom Tactile Stepper & Slider Controls */
            .ios-cg-touch-deck {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin: 6px 0 8px 0;
            }
            .ios-cg-col {
                background: #F8FAFC;
                border: 1px solid #CBD5E1;
                border-radius: 12px;
                padding: 7px 8px;
            }
            .ios-cg-slider {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 6px;
                border-radius: 999px;
                background: #CBD5E1;
                outline: none;
                margin: 4px 0 8px 0;
            }
            .ios-cg-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: #2563EB;
                border: 2.5px solid #FFFFFF;
                box-shadow: 0 2px 6px rgba(15, 23, 42, 0.3);
                cursor: pointer;
            }
            .ios-cg-steppers {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 4px;
            }
            .ios-cg-step-btn {
                background: #FFFFFF;
                border: 1px solid #CBD5E1;
                color: #0F172A;
                font-size: 0.74rem;
                font-weight: 700;
                padding: 5px 0;
                border-radius: 8px;
                cursor: pointer;
                text-align: center;
                user-select: none;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
            }
            .ios-cg-step-btn:active {
                transform: scale(0.92);
                background: #EFF6FF;
                border-color: #2563EB;
            }
            .closest-guess-preview-card {
                margin: 6px auto !important;
                padding: 8px 12px !important;
                background: #F8FAFC !important;
                border: 1px solid #CBD5E1 !important;
                border-radius: 12px !important;
            }
            #bracketWidthLabel {
                color: #0F172A !important;
            }
            #bracketBadge {
                background: #EFF6FF !important;
                border: 1px solid #93C5FD !important;
                color: #1D4ED8 !important;
            }
            .submit-guess-btn {
                padding: 12px !important;
                font-size: 1.02rem !important;
                font-weight: 800 !important;
                margin-top: 6px !important;
                border-radius: 14px !important;
                box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3) !important;
            }
            .numberline-container {
                margin: 8px 0 2px 0 !important;
                padding: 10px !important;
                background: #F8FAFC !important;
                border: 1px solid #CBD5E1 !important;
                border-radius: 14px !important;
            }
            .numberline-title {
                font-size: 0.72rem !important;
                color: #475569 !important;
                margin-bottom: 6px !important;
            }
            .numberline {
                height: 64px !important;
                margin: 6px 0 !important;
            }
            .numberline-axis {
                background: #94A3B8 !important;
            }
            .range-box {
                height: 52px !important;
                background: rgba(37, 99, 235, 0.18) !important;
                border: 1px solid #3B82F6 !important;
            }
            .range-box.own {
                background: rgba(16, 185, 129, 0.25) !important;
                border: 1.5px solid #059669 !important;
            }
            .numberline-labels,
            .numberline-labels span,
            .numberline-labels div,
            #numberlineMin,
            #numberlineMax {
                color: #334155 !important;
                font-size: 0.82rem !important;
            }

            /* ── 6. CROWD WISDOM: Daylight Live Distribution Bars ── */
            .crowd-wisdom-area {
                padding: 2px !important;
            }
            .timer-points-row {
                margin: 8px 0 !important;
            }
            .distribution-container {
                margin-top: 8px !important;
            }
            .distribution-row {
                padding: 7px 8px !important;
                margin-bottom: 7px !important;
                background: #F8FAFC !important;
                border: 1px solid #CBD5E1 !important;
                border-radius: 14px !important;
            }
            .distribution-row.unanswered-row {
                background: #FFF1F2 !important;
                border: 1px solid #FECDD3 !important;
            }
            .distribution-label {
                width: 130px !important;
                font-size: 0.82rem !important;
                color: #E11D48 !important;
            }
            .crowd-wisdom-btn {
                width: 130px !important;
                padding: 9px 10px !important;
                font-size: 0.85rem !important;
                font-weight: 700 !important;
                background: #FFFFFF !important;
                border: 1.5px solid #2563EB !important;
                color: #1E3A8A !important;
                border-radius: 10px !important;
                box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12) !important;
            }
            .crowd-wisdom-btn.selected {
                background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%) !important;
                border-color: #1D4ED8 !important;
                color: #FFFFFF !important;
            }
            .distribution-bar-wrapper {
                background: #E2E8F0 !important;
                height: 20px !important;
                border-radius: 10px !important;
                border: 1px solid #CBD5E1 !important;
            }
            .distribution-percent {
                color: #0F172A !important;
                font-size: 0.85rem !important;
                font-variant-numeric: tabular-nums !important;
            }

            /* ── 7. PUSH RANGE: Daylight Team Tug-of-War ── */
            .push-range-area {
                padding: 2px !important;
            }
            .push-range-visualization {
                margin: 8px 0 !important;
                padding: 10px !important;
                background: #F8FAFC !important;
                border: 1px solid #CBD5E1 !important;
                border-radius: 16px !important;
            }
            .push-range-bar {
                height: 40px !important;
                background: #FEF3C7 !important;
                border: 1.5px solid #F59E0B !important;
                border-radius: 10px !important;
            }
            .guess-range-bracket {
                height: 46px !important;
                margin-left: 18px !important;
                margin-right: 18px !important;
            }
            .bracket-left-edge, .bracket-right-edge,
            .bracket-bottom::before, .bracket-bottom::after {
                background: #475569 !important;
            }
            .bracket-left-edge .edge-value {
                font-size: 1.1rem !important;
                top: -26px !important;
                color: #2563EB !important;
            }
            .bracket-right-edge .edge-value {
                font-size: 1.1rem !important;
                top: -26px !important;
                color: #DC2626 !important;
            }
            .bracket-label {
                background: #F1F5F9 !important;
                border: 1px solid #CBD5E1 !important;
                color: #0F172A !important;
                padding: 3px 10px !important;
            }
            .range-label {
                color: #334155 !important;
            }
            .push-button-container {
                margin: 10px 0 !important;
            }
            .push-button {
                padding: 14px 32px !important;
                width: 100% !important;
                max-width: 310px !important;
                border-radius: 18px !important;
            }
            .push-button .push-main {
                font-size: 1.5rem !important;
            }
            .push-range-teams {
                gap: 8px !important;
                margin: 8px 0 0 0 !important;
            }
            .team-panel {
                padding: 8px !important;
                max-height: 120px !important;
                overflow-y: auto !important;
                background: #F8FAFC !important;
                border-width: 1.5px !important;
                border-radius: 14px !important;
            }
            .team-panel.left {
                border-color: #93C5FD !important;
            }
            .team-panel.right {
                border-color: #FCA5A5 !important;
            }
            .team-panel h4 {
                font-size: 0.85rem !important;
                margin-bottom: 6px !important;
            }
            .team-member {
                background: #FFFFFF !important;
                border: 1px solid #E2E8F0 !important;
                color: #0F172A !important;
                font-size: 0.82rem !important;
                padding: 5px 8px !important;
            }

            /* ── 8. WORD GUESS: Daylight Tiles + Built-in Tactile QWERTY Pad ── */
            .word-guess-area {
                padding: 2px !important;
            }
            .word-guess-grid {
                margin: 8px 0 !important;
                gap: 6px !important;
            }
            .word-space {
                height: 4px !important;
            }
            .letter-box {
                width: 32px !important;
                height: 40px !important;
                background: #F0F9FF !important;
                border: 1.5px solid #0284C7 !important;
                border-radius: 8px !important;
                box-shadow: 0 2px 6px rgba(2, 132, 199, 0.12) !important;
                font-size: 18px !important;
            }
            .player-letter {
                color: #0F172A !important;
                font-weight: 800 !important;
            }
            .revealed-letter {
                color: #0284C7 !important;
                font-weight: 800 !important;
            }
            .word-guess-input-area {
                display: none !important; /* Replaced by native-style on-screen QWERTY tile pad */
            }
            .ios-wg-keyboard {
                margin-top: 10px;
                padding: 6px 4px;
                background: #F1F5F9;
                border-radius: 14px;
                border: 1px solid #E2E8F0;
                width: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                gap: 6px;
                user-select: none;
            }
            .ios-wg-row {
                display: flex;
                justify-content: center;
                gap: 3px;
                width: 100%;
            }
            .ios-wg-key {
                flex: 1 1 0;
                min-width: 0;
                max-width: 31px;
                height: 39px;
                padding: 0;
                border-radius: 7px;
                background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
                border: 1px solid #CBD5E1;
                box-shadow: 0 2px 0 #94A3B8;
                color: #0F172A;
                font-size: 0.88rem;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: transform 0.06s ease, background 0.1s ease;
            }
            .ios-wg-key.ios-wg-wide {
                max-width: 48px;
                flex: 1.45 1 0;
                font-size: 0.78rem;
                font-weight: 800;
            }
            .ios-wg-key.ios-wg-go {
                background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                border-color: #047857;
                box-shadow: 0 2px 0 #065F46;
                color: #FFFFFF;
            }
            .ios-wg-key.ios-wg-go.disabled {
                background: #E2E8F0;
                border-color: #CBD5E1;
                box-shadow: none;
                color: #94A3B8;
            }
            .ios-wg-key:active {
                transform: translateY(2px) scale(0.94);
                background: #2563EB;
                color: #FFFFFF;
            }

            /* ── 9. LINE FIT: Daylight Analytics Chart & Live Drag Controls ── */
            .line-fit-area {
                padding: 2px !important;
            }
            .line-fit-container {
                margin: 6px auto !important;
            }
            #scatterCanvas {
                max-height: 34vh !important;
                width: auto !important;
                max-width: 100% !important;
                object-fit: contain !important;
                background: #F8FAFC !important;
                border: 1.5px solid #93C5FD !important;
                border-radius: 14px !important;
                box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08) !important;
            }
            #lineStats {
                padding: 6px 10px !important;
                margin-bottom: 6px !important;
                background: #F0F9FF !important;
                border: 1.5px solid #BAE6FD !important;
                border-radius: 12px !important;
            }
            #lineStats > div:first-child {
                color: #0369A1 !important;
                font-size: 0.78rem !important;
                text-transform: uppercase !important;
                letter-spacing: 0.05em !important;
            }
            #lineEquation {
                font-size: 0.92rem !important;
                color: #0284C7 !important;
            }
            #lineCorrelation {
                font-size: 0.82rem !important;
                color: #6D28D9 !important;
            }
            .canvas-instructions {
                margin-top: 6px !important;
                padding: 7px 10px !important;
                font-size: 0.88rem !important;
                background: #EFF6FF !important;
                border: 1px solid #93C5FD !important;
                color: #1D4ED8 !important;
                border-radius: 10px !important;
            }
            .line-fit-controls {
                margin-top: 8px !important;
                gap: 8px !important;
            }
            .line-fit-btn {
                padding: 10px 16px !important;
                font-size: 0.95rem !important;
                font-weight: 700 !important;
                min-width: 130px !important;
                border-radius: 12px !important;
            }

            /* ── 10. BETWEEN-ROUND DEBRIEFS, VISUALIZATIONS & TRANSITIONS ── */
            .qr-code-box {
                display: none !important;
            }

            .waiting-state {
                padding: 20px 12px !important;
            }
            .waiting-state h2 {
                font-size: 1.25rem !important;
                font-weight: 800 !important;
                color: #0F172A !important;
                margin-bottom: 6px !important;
            }

            /* Countdown Overlay (5, 4, 3, 2, 1, GO!) */
            #countdownOverlay {
                background: rgba(79, 70, 229, 0.92) !important;
                backdrop-filter: blur(18px) !important;
                -webkit-backdrop-filter: blur(18px) !important;
            }
            #countdownNumber {
                font-size: 92px !important;
                font-weight: 900 !important;
                letter-spacing: -0.03em !important;
            }
            #countdownRoundInfo {
                font-size: 1.2rem !important;
                color: #E0E7FF !important;
                margin-top: 16px !important;
            }

            /* Locked-In Stamp & Suspense Shimmer */
            .locked-in-stamp-card {
                background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%) !important;
                border: 1.5px solid #10B981 !important;
                color: #065F46 !important;
                border-radius: 14px !important;
                padding: 10px 14px !important;
                box-shadow: 0 6px 18px rgba(16, 185, 129, 0.16) !important;
            }
            .locked-in-stamp-sub {
                color: #047857 !important;
            }
            .suspense-shimmer-bar {
                background: #EFF6FF !important;
                border: 1px solid #93C5FD !important;
                color: #1D4ED8 !important;
                border-radius: 12px !important;
            }

            /* Unified Round Complete Banner (#roundCompleteBanner) */
            #roundCompleteBanner {
                background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%) !important;
                border: 1.5px solid #CBD5E1 !important;
                border-radius: 18px !important;
                padding: 10px 12px !important;
                margin-bottom: 4px !important;
                color: #0F172A !important;
                box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12) !important;
            }
            #roundCompleteBanner ~ div {
                display: none !important;
            }
            .round-verdict-hero {
                padding: 7px 12px !important;
                font-size: 0.88rem !important;
                margin-bottom: 6px !important;
                border-radius: 12px !important;
            }
            #roundCompleteBanner h2 {
                font-size: 1.12rem !important;
                margin: 0 0 6px 0 !important;
                color: #0F172A !important;
                letter-spacing: -0.01em !important;
            }
            #gameSpecificResults {
                margin: 6px 0 !important;
                padding-top: 0 !important;
            }
            #lineFitResultsCanvas {
                max-height: 22vh !important;
                width: auto !important;
                max-width: 100% !important;
                object-fit: contain !important;
                background: #F8FAFC !important;
                border: 1.5px solid #93C5FD !important;
                border-radius: 12px !important;
                box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08) !important;
            }
            #speedTapResultsDotPlot {
                max-height: 20vh !important;
                width: 100% !important;
                background: #F8FAFC !important;
                border: 1.5px solid #93C5FD !important;
                border-radius: 12px !important;
                box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08) !important;
            }

            /* Budget Blitz Results Debrief (.bb-results) */
            .bb-results {
                padding: 4px !important;
            }
            .bb-res-banner {
                padding: 12px !important;
                border-radius: 16px !important;
                margin-bottom: 8px !important;
            }
            .bb-res-title {
                font-size: 1.15rem !important;
            }
            .bb-res-grid {
                gap: 7px !important;
                margin-bottom: 8px !important;
            }
            .bb-res-stat {
                background: #F8FAFC !important;
                border: 1px solid #CBD5E1 !important;
                border-radius: 12px !important;
                padding: 8px 6px !important;
            }
            .bb-res-stat-label {
                color: #475569 !important;
                font-size: 0.65rem !important;
            }
            .bb-res-stat-val {
                color: #2563EB !important;
                font-size: 1.15rem !important;
            }
            .bb-res-card {
                background: #F8FAFC !important;
                border: 1px solid #CBD5E1 !important;
                border-radius: 14px !important;
                padding: 10px 12px !important;
                margin-bottom: 8px !important;
                color: #0F172A !important;
            }
            .bb-res-card h4 {
                color: #475569 !important;
                margin: 0 0 6px 0 !important;
                font-size: 0.75rem !important;
            }
            .bb-alloc-row {
                border-bottom: 1px solid #E2E8F0 !important;
                padding: 5px 0 !important;
                font-size: 0.84rem !important;
                color: #0F172A !important;
            }
            .bb-alloc-opt {
                background: #ECFDF5 !important;
                border: 1px solid #6EE7B7 !important;
                color: #065F46 !important;
            }
            .bb-alloc-you {
                background: #EFF6FF !important;
                border: 1px solid #93C5FD !important;
                color: #1D4ED8 !important;
            }
            .bb-takeaway {
                background: #F0F9FF !important;
                border: 1px solid #BAE6FD !important;
                border-left: 4px solid #0284C7 !important;
                color: #0C4A6E !important;
                padding: 9px 11px !important;
                border-radius: 12px !important;
                font-size: 0.82rem !important;
                margin-bottom: 6px !important;
            }
            .bb-wait {
                color: #475569 !important;
                margin-top: 6px !important;
                font-size: 0.82rem !important;
            }

            /* Buy a Clue Results Debrief (.bac-results) */
            .bac-results {
                padding: 4px !important;
            }
            .bac-res-banner {
                padding: 12px !important;
                border-radius: 16px !important;
                margin-bottom: 8px !important;
            }
            .bac-res-title {
                font-size: 1.15rem !important;
            }
            .bac-ledger {
                gap: 7px !important;
                margin-bottom: 8px !important;
            }
            .bac-ledger-cell {
                background: #F8FAFC !important;
                border: 1px solid #CBD5E1 !important;
                border-radius: 12px !important;
                padding: 8px 6px !important;
            }
            .bac-ledger-cell span {
                color: #475569 !important;
                font-size: 0.65rem !important;
            }
            .bac-ledger-cell strong {
                color: #0F172A !important;
                font-size: 1.15rem !important;
            }
            .bac-ledger-net {
                background: #EFF6FF !important;
                border-color: #93C5FD !important;
            }
            .bac-ledger-net strong {
                color: #2563EB !important;
            }
            .bac-res-card {
                background: #F8FAFC !important;
                border: 1px solid #CBD5E1 !important;
                color: #0F172A !important;
                border-radius: 12px !important;
                padding: 9px 11px !important;
                margin-bottom: 7px !important;
                font-size: 0.84rem !important;
            }
            .bac-res-card p {
                color: #475569 !important;
                margin: 4px 0 0 0 !important;
            }
            .bac-takeaway {
                background: #FFFBEB !important;
                border: 1px solid #FDE68A !important;
                border-left: 4px solid #F59E0B !important;
                color: #78350F !important;
                padding: 9px 11px !important;
                border-radius: 12px !important;
                font-size: 0.82rem !important;
                margin-bottom: 6px !important;
            }
            .bac-wait {
                color: #475569 !important;
                margin-top: 6px !important;
                font-size: 0.82rem !important;
            }

            /* Solo Practice Play Again Action Button */
            .ios-solo-replay-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                margin-top: 10px;
                padding: 12px 16px;
                border-radius: 14px;
                border: 1.5px solid rgba(56, 189, 248, 0.5);
                background: linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%);
                color: #FFFFFF;
                font-size: 0.96rem;
                font-weight: 800;
                cursor: pointer;
                box-shadow: 0 6px 20px rgba(14, 165, 233, 0.35);
                transition: transform 0.08s ease;
            }
            .ios-solo-replay-btn:active {
                transform: scale(0.97);
            }

            /* ── 11. iPadOS TABLET RESPONSIVE SCALING (@media min-width: 768px) ── */
            @media (min-width: 768px) {
                .game-container {
                    max-width: 760px !important;
                    padding: 12px 24px !important;
                    gap: 14px !important;
                }
                .game-area {
                    padding: 24px 28px !important;
                    border-radius: 26px !important;
                }
                .question-text {
                    font-size: 1.24rem !important;
                    margin-bottom: 10px !important;
                }
                .answer-options {
                    gap: 14px !important;
                }
                .answer-btn {
                    min-height: 92px !important;
                    padding: 16px 14px !important;
                    font-size: 1.04rem !important;
                    border-radius: 18px !important;
                }
                #scatterCanvas {
                    max-height: 44vh !important;
                }
                #lineFitResultsCanvas {
                    max-height: 36vh !important;
                }
                #speedTapResultsDotPlot {
                    max-height: 26vh !important;
                }
                .letter-box {
                    width: 44px !important;
                    height: 52px !important;
                    font-size: 22px !important;
                    border-radius: 10px !important;
                }
                .ios-wg-row {
                    gap: 6px !important;
                }
                .ios-wg-key {
                    max-width: 48px !important;
                    height: 48px !important;
                    font-size: 1.02rem !important;
                    border-radius: 9px !important;
                }
                .ios-wg-key.ios-wg-wide {
                    max-width: 74px !important;
                    font-size: 0.9rem !important;
                }
                .bb-channel, .mr-option-card, .bac-option {
                    padding: 13px 16px !important;
                }
                #roundCompleteBanner {
                    padding: 18px 22px !important;
                    border-radius: 22px !important;
                }
                .ios-solo-replay-btn {
                    padding: 14px 20px !important;
                    font-size: 1.05rem !important;
                }
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    onReady(injectIOSStyles);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Global Touch Haptics & iOS Virtual Keyboard Scroll Snap-Back
    // ─────────────────────────────────────────────────────────────────────────
    document.addEventListener('touchstart', function (e) {
        const target = e.target && e.target.closest
            ? e.target.closest('.answer-btn, .crowd-wisdom-btn, .push-button, .bb-btn, .bac-option, .mr-option-card, .buzzer-btn, #confirmBtn, #redrawBtn, #bbLockBtn, #bacLockBtn, #bacBuyBtn, #mrSubmitBtn, .submit-guess-btn, .submit-word-btn, .ios-cg-step-btn, .ios-wg-key, .ios-solo-replay-btn, .pick, .btn, .info, .tp-solo-pill')
            : null;
        if (target && !target.disabled && !target.classList.contains('disabled')) {
            postToNative({ type: 'haptic', pattern: [16] });
        }
    }, { passive: true });

    // Prevent WKWebView from getting stuck scrolled down after iOS keyboard closes
    document.addEventListener('focusout', function () {
        setTimeout(function () {
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        }, 60);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Interactive Touch Upgrades & Between-Round Visualization Renderers
    // ─────────────────────────────────────────────────────────────────────────
    function installIOSTouchEnhancements() {
        const gameArea = document.getElementById('gameArea');
        if (!gameArea) return;

        installDarkResultsRenderers();

        // Ensure lazy-loaded scripts (line-fit.js, game-push-range.js) never overwrite our dark-slate iOS results renderers
        if (typeof window.loadGameScript === 'function' && !window.loadGameScript.__iosWrapped) {
            const origLoadScript = window.loadGameScript;
            const wrappedLoad = function (gType) {
                return origLoadScript.apply(this, arguments).then(function (res) {
                    installDarkResultsRenderers();
                    return res;
                });
            };
            wrappedLoad.__iosWrapped = true;
            window.loadGameScript = wrappedLoad;
        }
        if (typeof window.handleUnifiedGameResults === 'function' && !window.handleUnifiedGameResults.__iosWrapped) {
            const origUnified = window.handleUnifiedGameResults;
            const wrappedUnified = function (message) {
                installDarkResultsRenderers();
                return origUnified.apply(this, arguments);
            };
            wrappedUnified.__iosWrapped = true;
            window.handleUnifiedGameResults = wrappedUnified;
        }

        const enhanceCurrentGameDOM = function () {
            installDarkResultsRenderers();
            enhanceLineFitTouchAndTheme();
            enhanceClosestGuessTouchControls();
            enhanceWordGuessTouchKeyboard();
            enhanceBetweenRoundResultsDOM();
        };

        const domObserver = new MutationObserver(function () {
            enhanceCurrentGameDOM();
        });
        domObserver.observe(gameArea, { childList: true, subtree: true });
        enhanceCurrentGameDOM();
    }

    // 4.0 Dark-Slate Canvas & DOM Renderers for Between-Round Summary Visualizations
    function installDarkResultsRenderers() {
        // A. Line Fit Between-Round Results Renderer (Returns HTML string for handleUnifiedGameResults)
        window.showLineFitResults = function (dataOrGs) {
            const gs = (dataOrGs && dataOrGs.game_specific) ? dataOrGs.game_specific : (dataOrGs || {});
            const scatterData = gs.scatter_data;
            const trueLine = gs.true_line || gs.correct_line;
            const allSubmissions = gs.all_submissions || [];
            const correlation = gs.correlation;
            const rSquared = gs.r_squared != null ? gs.r_squared : (gs.accuracy_metrics && gs.accuracy_metrics.r_squared);

            if (!scatterData || !trueLine) return '';

            const myId = (typeof playerSession !== 'undefined' && playerSession && playerSession.id) || 999;
            const playerSub = allSubmissions.find(function (s) { return s.player_id == myId; }) || gs.your_line;

            const formatEq = function (slope, intercept) {
                const s = Number(slope || 0).toFixed(2);
                const i = Number(intercept || 0);
                return `y = ${s}x ${i >= 0 ? '+' : '-'} ${Math.abs(i).toFixed(1)}`;
            };

            const trueEq = formatEq(trueLine.slope, trueLine.intercept);
            const youEq = playerSub ? formatEq(playerSub.slope, playerSub.intercept) : 'No submission';

            const html = `
                <div style="margin: 6px 0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                        <div style="background: #FFFBEB; border: 1.5px solid #F59E0B; border-radius: 12px; padding: 7px 10px; text-align: left;">
                            <div style="font-size: 0.66rem; font-weight: 800; color: #B45309; text-transform: uppercase; letter-spacing: 0.05em;">✨ True OLS Line</div>
                            <div style="font-size: 0.88rem; font-weight: 800; color: #78350F; font-family: ui-monospace, SFMono-Regular, monospace; margin-top: 2px;">${trueEq}</div>
                            <div style="font-size: 0.68rem; color: #92400E; margin-top: 2px;">R² = ${Number(rSquared || 0.85).toFixed(2)} • r = ${Number(correlation || 0.92).toFixed(2)}</div>
                        </div>
                        <div style="background: #EFF6FF; border: 1.5px solid #3B82F6; border-radius: 12px; padding: 7px 10px; text-align: left;">
                            <div style="font-size: 0.66rem; font-weight: 800; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.05em;">🎯 Your Fit</div>
                            <div style="font-size: 0.88rem; font-weight: 800; color: #1E3A8A; font-family: ui-monospace, SFMono-Regular, monospace; margin-top: 2px;">${youEq}</div>
                            <div style="font-size: 0.68rem; color: #1E40AF; margin-top: 2px;">${playerSub && playerSub.rank ? ('Rank #' + playerSub.rank + ' • SSE ' + Number(playerSub.sse || 0).toFixed(1)) : 'Visual OLS Fit'}</div>
                        </div>
                    </div>
                    <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 14px; padding: 8px; text-align: center;">
                        <canvas id="lineFitResultsCanvas" width="600" height="390"></canvas>
                        <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-top: 6px; font-size: 0.72rem; color: #334155; font-weight: 600;">
                            <span><strong style="color: #D97706;">━━</strong> True OLS</span>
                            <span><strong style="color: #2563EB;">╌╌</strong> ★ You</span>
                            <span><strong style="color: #059669;">━━</strong> Top 3</span>
                            <span><strong style="color: #94A3B8;">━━</strong> Class (${allSubmissions.length})</span>
                        </div>
                    </div>
                </div>
            `;

            setTimeout(function () {
                window.drawLineFitResultsCanvas(scatterData, trueLine, allSubmissions);
            }, 60);

            return html;
        };

        window.drawLineFitResultsCanvas = function (scatterData, trueLine, allSubmissions) {
            const canvas = document.getElementById('lineFitResultsCanvas');
            if (!canvas || !scatterData) return;
            const ctx = canvas.getContext('2d');
            const margins = { top: 24, right: 28, bottom: 42, left: 52 };
            const plotW = canvas.width - margins.left - margins.right;
            const plotH = canvas.height - margins.top - margins.bottom;

            const bounds = scatterData.bounds || {
                x_min: scatterData.x_bounds ? scatterData.x_bounds[0] : 0,
                x_max: scatterData.x_bounds ? scatterData.x_bounds[1] : 10,
                y_min: scatterData.y_bounds ? scatterData.y_bounds[0] : 0,
                y_max: scatterData.y_bounds ? scatterData.y_bounds[1] : 100
            };

            const toCanvas = function (x, y) {
                const xNorm = (x - bounds.x_min) / ((bounds.x_max - bounds.x_min) || 1);
                const yNorm = (y - bounds.y_min) / ((bounds.y_max - bounds.y_min) || 1);
                return {
                    x: margins.left + xNorm * plotW,
                    y: margins.top + (1 - yNorm) * plotH
                };
            };

            const drawClippedLine = function (slope, intercept) {
                const pts = [];
                const yAtXMin = slope * bounds.x_min + intercept;
                if (yAtXMin >= bounds.y_min && yAtXMin <= bounds.y_max) pts.push({ x: bounds.x_min, y: yAtXMin });
                const yAtXMax = slope * bounds.x_max + intercept;
                if (yAtXMax >= bounds.y_min && yAtXMax <= bounds.y_max) pts.push({ x: bounds.x_max, y: yAtXMax });
                if (Math.abs(slope) > 0.0001) {
                    const xAtYMin = (bounds.y_min - intercept) / slope;
                    if (xAtYMin > bounds.x_min && xAtYMin < bounds.x_max) pts.push({ x: xAtYMin, y: bounds.y_min });
                    const xAtYMax = (bounds.y_max - intercept) / slope;
                    if (xAtYMax > bounds.x_min && xAtYMax < bounds.x_max) pts.push({ x: xAtYMax, y: bounds.y_max });
                }
                if (pts.length >= 2) {
                    const p1 = toCanvas(pts[0].x, pts[0].y);
                    const p2 = toCanvas(pts[1].x, pts[1].y);
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                    return p2;
                }
                return null;
            };

            // 1. Crisp Daylight Canvas Fill
            ctx.fillStyle = '#F8FAFC';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Subtle Gridlines
            ctx.strokeStyle = '#E2E8F0';
            ctx.lineWidth = 1;
            for (let i = 1; i <= 4; i++) {
                const gx = margins.left + (plotW * i) / 4;
                const gy = margins.top + (plotH * i) / 4;
                ctx.beginPath();
                ctx.moveTo(gx, margins.top);
                ctx.lineTo(gx, margins.top + plotH);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(margins.left, gy);
                ctx.lineTo(margins.left + plotW, gy);
                ctx.stroke();
            }

            // 3. Axes & Labels
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(margins.left, margins.top + plotH);
            ctx.lineTo(margins.left + plotW, margins.top + plotH);
            ctx.moveTo(margins.left, margins.top);
            ctx.lineTo(margins.left, margins.top + plotH);
            ctx.stroke();

            const labels = scatterData.axis_labels || { x: 'X', y: 'Y' };
            ctx.fillStyle = '#0F172A';
            ctx.font = '600 14px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels.x || 'X', margins.left + plotW / 2, canvas.height - 8);

            ctx.font = '600 12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = '#475569';
            ctx.textBaseline = 'top';
            ctx.fillText(bounds.x_min.toFixed(1), margins.left, margins.top + plotH + 6);
            ctx.fillText(((bounds.x_min + bounds.x_max) / 2).toFixed(1), margins.left + plotW / 2, margins.top + plotH + 6);
            ctx.fillText(bounds.x_max.toFixed(1), margins.left + plotW, margins.top + plotH + 6);

            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(bounds.y_max.toFixed(0), margins.left - 8, margins.top);
            ctx.fillText(((bounds.y_min + bounds.y_max) / 2).toFixed(0), margins.left - 8, margins.top + plotH / 2);
            ctx.fillText(bounds.y_min.toFixed(0), margins.left - 8, margins.top + plotH);

            // 4. Other Class Submissions
            const myId = (typeof playerSession !== 'undefined' && playerSession && playerSession.id) || 999;
            let playerSub = null;
            (allSubmissions || []).forEach(function (sub) {
                if (sub.player_id == myId) playerSub = sub;
                if (sub.rank > 3 && sub.player_id != myId) {
                    ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
                    ctx.lineWidth = 1.75;
                    ctx.setLineDash([]);
                    drawClippedLine(sub.slope, sub.intercept);
                }
            });

            // 5. Top 3 Class Submissions (Emerald)
            (allSubmissions || []).forEach(function (sub) {
                if (sub.rank <= 3 && sub.player_id != myId) {
                    ctx.strokeStyle = '#059669';
                    ctx.lineWidth = 2.5;
                    ctx.setLineDash([]);
                    drawClippedLine(sub.slope, sub.intercept);
                }
            });

            // 6. True OLS Regression Line (Warm Gold-Amber)
            if (trueLine) {
                ctx.save();
                ctx.shadowColor = 'rgba(217, 119, 6, 0.35)';
                ctx.shadowBlur = 6;
                ctx.strokeStyle = '#D97706';
                ctx.lineWidth = 4;
                ctx.setLineDash([]);
                drawClippedLine(trueLine.slope, trueLine.intercept);
                ctx.restore();
            }

            // 7. Player's Own Line (Dashed Royal Blue + ★ YOU Badge)
            if (playerSub) {
                ctx.save();
                ctx.shadowColor = 'rgba(37, 99, 235, 0.35)';
                ctx.shadowBlur = 6;
                ctx.strokeStyle = '#2563EB';
                ctx.lineWidth = 3.5;
                ctx.setLineDash([8, 5]);
                const endPt = drawClippedLine(playerSub.slope, playerSub.intercept);
                ctx.restore();

                if (endPt) {
                    const bx = Math.max(margins.left + 40, Math.min(margins.left + plotW - 36, endPt.x - 28));
                    const by = Math.max(margins.top + 16, Math.min(margins.top + plotH - 16, endPt.y - 18));
                    ctx.save();
                    ctx.fillStyle = '#2563EB';
                    ctx.beginPath();
                    ctx.roundRect(bx - 28, by - 11, 56, 22, 6);
                    ctx.fill();
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '800 11px -apple-system, BlinkMacSystemFont, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('★ YOU', bx, by);
                    ctx.restore();
                }
            }

            // 8. Scatter Points
            (scatterData.points || []).forEach(function (pt) {
                const x = Array.isArray(pt) ? pt[0] : pt.x;
                const y = Array.isArray(pt) ? pt[1] : pt.y;
                const c = toCanvas(x, y);
                ctx.save();
                ctx.fillStyle = '#FFFFFF';
                ctx.strokeStyle = '#2563EB';
                ctx.lineWidth = 2.75;
                ctx.beginPath();
                ctx.arc(c.x, c.y, 6.5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            });
        };

        // B. Speed Tap Between-Round Response-Time Dot Plot Renderer (Daylight)
        window.showSpeedTapDotPlot = function (chartData) {
            const canvasId = 'speedTapResultsDotPlot';
            setTimeout(function () {
                window.drawSpeedTapDotPlot(canvasId, chartData, (chartData && chartData.game_time_limit) || 12);
            }, 60);
            return `
                <div style="margin: 6px 0; padding: 8px 10px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 14px; text-align: center;">
                    <div style="font-size: 0.78rem; color: #0F172A; margin-bottom: 6px; font-weight: 700;">⚡ Class Response Time Distribution</div>
                    <canvas id="${canvasId}" width="600" height="175"></canvas>
                    <div style="display: flex; justify-content: center; gap: 14px; margin-top: 5px; font-size: 0.7rem; color: #334155; font-weight: 600;">
                        <span><strong style="color: #059669;">●</strong> Correct</span>
                        <span><strong style="color: #E11D48;">●</strong> Missed</span>
                        <span><strong style="color: #D97706;">★</strong> Your Speed</span>
                    </div>
                </div>
            `;
        };

        window.drawSpeedTapDotPlot = function (canvasId, chartDataOrArray, fallbackMaxTime) {
            const canvas = document.getElementById(canvasId);
            if (!canvas || !chartDataOrArray) return;
            const rawList = Array.isArray(chartDataOrArray)
                ? chartDataOrArray
                : (chartDataOrArray.all_responses || []);
            if (rawList.length === 0) return;

            const maxTime = Number((chartDataOrArray && chartDataOrArray.game_time_limit) || fallbackMaxTime || 12);
            const responseTimes = rawList.map(function (r) {
                return {
                    player_id: r.player_id || r.player_session_id,
                    player_name: r.player_name,
                    time: r.time != null ? Number(r.time) : (Number(r.response_time_ms || 0) / 1000),
                    is_correct: Boolean(r.is_correct)
                };
            });

            const ctx = canvas.getContext('2d');
            const W = canvas.width;
            const H = canvas.height;
            const pad = { left: 36, right: 36, top: 32, bottom: 34 };
            const plotW = W - pad.left - pad.right;

            ctx.fillStyle = '#F8FAFC';
            ctx.fillRect(0, 0, W, H);

            const axisY = H - pad.bottom;

            // Vertical time gridlines & ticks
            const numTicks = 4;
            ctx.font = '600 12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            for (let i = 0; i <= numTicks; i++) {
                const t = (maxTime / numTicks) * i;
                const x = pad.left + (i / numTicks) * plotW;

                ctx.strokeStyle = '#E2E8F0';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, pad.top - 8);
                ctx.lineTo(x, axisY);
                ctx.stroke();

                ctx.fillStyle = '#475569';
                ctx.fillText(`${t.toFixed(0)}s`, x, axisY + 17);
            }

            // Horizontal axis line
            ctx.strokeStyle = '#64748B';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pad.left, axisY);
            ctx.lineTo(W - pad.right, axisY);
            ctx.stroke();

            // Bin dots to stack vertically
            const dotRadius = 8;
            const dotSpacing = 18;
            const numBins = 28;
            const binWidth = maxTime / numBins;
            const bins = Array.from({ length: numBins }, function () { return []; });
            let currentPlayerDot = null;
            const myId = (typeof playerSession !== 'undefined' && playerSession && playerSession.id) || 999;

            responseTimes.forEach(function (item) {
                const clamped = Math.max(0, Math.min(maxTime, Number(item.time) || 0));
                const bIdx = Math.min(Math.floor(clamped / binWidth), numBins - 1);
                bins[bIdx].push(item);
            });

            bins.forEach(function (bin) {
                bin.forEach(function (item, stackIdx) {
                    const clamped = Math.max(0, Math.min(maxTime, Number(item.time) || 0));
                    const x = pad.left + (clamped / maxTime) * plotW;
                    const y = axisY - 14 - stackIdx * dotSpacing;
                    const isMe = (item.player_id == myId);

                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(x, y, isMe ? dotRadius + 2 : dotRadius, 0, Math.PI * 2);
                    ctx.fillStyle = item.is_correct ? '#10B981' : '#F43F5E';
                    ctx.fill();
                    ctx.lineWidth = isMe ? 3 : 1.5;
                    ctx.strokeStyle = isMe ? '#D97706' : '#FFFFFF';
                    ctx.stroke();
                    ctx.restore();

                    if (isMe) {
                        currentPlayerDot = { x: x, y: y, time: clamped };
                    }
                });
            });

            if (currentPlayerDot) {
                const bx = Math.max(54, Math.min(W - 54, currentPlayerDot.x));
                const by = Math.max(16, currentPlayerDot.y - 22);
                ctx.save();
                ctx.fillStyle = '#F59E0B';
                ctx.beginPath();
                ctx.roundRect(bx - 44, by - 10, 88, 20, 6);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '800 11px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`★ YOU (${currentPlayerDot.time.toFixed(1)}s)`, bx, by);
                ctx.restore();
            }
        };

        // C. Push Range Between-Round Final Tug-of-War Bracket (Compact Daylight)
        window.showPushRangeResults = function (data) {
            const gs = (data && data.game_specific) ? data.game_specific : (data || {});
            const rangeMatch = (gs.final_range || '').match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
            const leftVal = rangeMatch ? parseFloat(rangeMatch[1]) : 40;
            const rightVal = rangeMatch ? parseFloat(rangeMatch[2]) : 85;
            const correctVal = parseFloat((data && data.correct_answer) || gs.correct_answer || 87);
            const hasCorrect = !isNaN(correctVal);
            const topPressers = gs.top_pressers || [];

            const pressersHTML = topPressers.length > 0 ? `
                <div style="display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
                    ${topPressers.slice(0, 3).map(function (p, i) {
                        const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : '🥉');
                        const color = p.team === 'left' ? '#2563EB' : '#DC2626';
                        return `<span style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 999px; padding: 3px 9px; font-size: 0.72rem; color: #0F172A; font-weight: 700;">${medal} <span style="color:${color};">${p.player_name}</span> (${p.presses} taps)</span>`;
                    }).join('')}
                </div>
            ` : '';

            return `
                <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 14px; padding: 32px 12px 10px 12px; margin: 6px 0; position: relative;">
                    <div style="position: relative; height: 34px; background: #FEF3C7; border: 1.5px solid #F59E0B; border-radius: 10px; overflow: visible;">
                        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${leftVal}%; background: linear-gradient(90deg, #2563EB, #3B82F6); border-radius: 8px 0 0 8px;"></div>
                        <div style="position: absolute; right: 0; top: 0; bottom: 0; width: ${Math.max(0, 100 - rightVal)}%; background: linear-gradient(270deg, #DC2626, #EF4444); border-radius: 0 8px 8px 0;"></div>
                        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.76rem; font-weight: 800; color: #78350F;">
                            FINAL TEAM BRACKET: ${leftVal.toFixed(0)}% – ${rightVal.toFixed(0)}%
                        </div>
                        ${hasCorrect ? `
                            <div style="position: absolute; left: ${correctVal}%; top: -24px; bottom: -4px; width: 3px; background: #10B981; transform: translateX(-50%); z-index: 10; box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);">
                                <div style="position: absolute; top: -3px; left: 50%; transform: translate(-50%, -100%); background: #10B981; color: #FFFFFF; font-size: 0.68rem; font-weight: 900; padding: 2px 7px; border-radius: 6px; white-space: nowrap;">
                                    🎯 Truth: ${correctVal}%
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    ${pressersHTML}
                </div>
            `;
        };
    }

    // 4.1 Post-Process Between-Round Debrief DOM (#roundCompleteBanner, Closest Guess Viz, Minority Rule, Solo Replay)
    function enhanceBetweenRoundResultsDOM() {
        const gameArea = document.getElementById('gameArea');
        if (!gameArea) return;

        // A. Compact Daylight #roundCompleteBanner
        const banner = document.getElementById('roundCompleteBanner');
        if (banner && !banner.__iosBannerEnhanced) {
            banner.__iosBannerEnhanced = true;

            // Compact 3-column bottom KPI grid (Players Scored / Your Round Score / Total Score)
            banner.querySelectorAll('div').forEach(function (div) {
                const st = (div.getAttribute('style') || '').toLowerCase();

                if (st.includes('grid-template-columns: 1fr 1fr 1fr')) {
                    div.style.gap = '8px';
                    div.style.marginTop = '8px';
                    Array.from(div.children).forEach(function (cell) {
                        cell.style.padding = '7px 6px';
                        cell.style.background = '#F8FAFC';
                        cell.style.border = '1px solid #CBD5E1';
                        cell.style.borderRadius = '10px';
                        cell.style.color = '#0F172A';
                        if (cell.children[0]) {
                            cell.children[0].style.fontSize = '0.68rem';
                            cell.children[0].style.color = '#475569';
                        }
                        if (cell.children[1]) {
                            cell.children[1].style.fontSize = '1.15rem';
                            cell.children[1].style.color = '#0F172A';
                        }
                    });
                }

                // Compact top info strips inside #roundCompleteBanner (e.g. Top Scorer / Fastest Correct / Correct Answer)
                if (st.includes('rgba(255,255,255,0.15)') || st.includes('rgba(255,255,255,0.2)')) {
                    if (!st.includes('backdrop-filter')) {
                        div.style.padding = '7px 10px';
                        div.style.marginBottom = '6px';
                        div.style.background = '#F8FAFC';
                        div.style.border = '1px solid #CBD5E1';
                        div.style.borderRadius = '10px';
                        div.style.color = '#0F172A';
                        div.querySelectorAll('div').forEach(function (inner) {
                            inner.style.fontSize = '0.88rem';
                            inner.style.color = '#0F172A';
                        });
                    }
                }

                // Compact Closest Guess "All Player Ranges" Laser Numberline in Daylight
                if (div.querySelector && div.querySelector('.laser-answer-line') && st.includes('position: relative')) {
                    const outerWrap = div.parentElement;
                    if (outerWrap) {
                        outerWrap.style.margin = '6px 0';
                        const titleEl = outerWrap.firstElementChild;
                        if (titleEl && titleEl !== div) {
                            titleEl.style.color = '#0F172A';
                            titleEl.style.fontSize = '0.8rem';
                            titleEl.style.marginBottom = '6px';
                        }
                        const pillsWrap = outerWrap.lastElementChild;
                        if (pillsWrap && pillsWrap !== div) {
                            pillsWrap.style.marginTop = '8px';
                            pillsWrap.style.gap = '6px';
                        }
                    }

                    div.style.minHeight = '126px';
                    div.style.height = '126px';
                    div.style.background = '#F8FAFC';
                    div.style.border = '1.5px solid #93C5FD';
                    div.style.borderRadius = '14px';
                    div.style.padding = '10px 12px';

                    Array.from(div.children).forEach(function (child) {
                        const cst = (child.getAttribute('style') || '').toLowerCase();
                        const txt = (child.textContent || '').trim();
                        if (child.classList.contains('laser-answer-line')) {
                            child.style.height = '62px';
                            child.style.bottom = '20px';
                        } else if (cst.includes('border-radius: 6px')) {
                            child.style.height = '42px';
                            child.style.bottom = '20px';
                        } else if (cst.includes('dotted')) {
                            child.style.height = '50px';
                            child.style.bottom = '20px';
                            child.style.borderLeft = '2px dashed #2563EB';
                        } else if (txt.includes('Average Guess')) {
                            child.style.bottom = '74px';
                            child.style.padding = '3px 7px';
                            child.style.borderRadius = '8px';
                            child.style.background = '#EFF6FF';
                            child.style.border = '1.5px solid #2563EB';
                            child.style.transform = 'translateX(-105%)';
                            if (child.children[0]) {
                                child.children[0].style.fontSize = '0.78rem';
                                child.children[0].style.color = '#1D4ED8';
                            }
                            if (child.children[1]) {
                                child.children[1].style.fontSize = '0.6rem';
                                child.children[1].style.color = '#2563EB';
                            }
                        } else if (txt.includes('Correct Answer')) {
                            child.style.bottom = '74px';
                            child.style.padding = '3px 7px';
                            child.style.borderRadius = '8px';
                            child.style.background = '#ECFDF5';
                            child.style.border = '1.5px solid #059669';
                            child.style.transform = 'translateX(5%)';
                            if (child.children[0]) {
                                child.children[0].style.fontSize = '0.78rem';
                                child.children[0].style.color = '#065F46';
                            }
                            if (child.children[1]) {
                                child.children[1].style.fontSize = '0.6rem';
                                child.children[1].style.color = '#047857';
                            }
                        } else if (txt.includes('(min)') || txt.includes('(max)')) {
                            child.style.bottom = '10px';
                            if (child.children[0]) {
                                child.children[0].style.fontSize = '0.76rem';
                                child.children[0].style.color = '#0F172A';
                            }
                            if (child.children[1]) {
                                child.children[1].style.fontSize = '0.62rem';
                                child.children[1].style.color = '#475569';
                            }
                        }
                    });
                }

                // Compact Crowd Wisdom result rows in Daylight
                if (st.includes('background: #f8fafc') || st.includes('background:#f8fafc')) {
                    div.style.padding = '6px 8px';
                    div.style.marginBottom = '5px';
                }
                if (st.includes('width: 180px')) {
                    div.style.width = '112px';
                    div.style.fontSize = '0.76rem';
                    div.style.color = '#0F172A';
                }
            });
        }

        // B. Minority Rule Results (.mr-results) Compact Daylight Layout
        const mrResults = gameArea.querySelector('.mr-results');
        if (mrResults && !mrResults.__iosMrEnhanced) {
            mrResults.__iosMrEnhanced = true;
            mrResults.style.padding = '2px';
            mrResults.querySelectorAll('div').forEach(function (div) {
                const st = (div.getAttribute('style') || '').toLowerCase();
                if (st.includes('padding: 28px 20px')) {
                    div.style.padding = '12px 14px';
                    div.style.marginBottom = '8px';
                    div.style.borderRadius = '16px';
                    if (div.children[0]) div.children[0].style.fontSize = '28px';
                    if (div.children[1]) div.children[1].style.fontSize = '1.08rem';
                } else if (st.includes('background: white')) {
                    div.style.padding = '8px 10px';
                    div.style.marginBottom = '7px';
                    div.style.borderRadius = '12px';
                } else if (st.includes('#f8fafc') || st.includes('#eff6ff') || st.includes('#f0f9ff') || st.includes('#e0f2fe')) {
                    div.style.padding = '8px 10px';
                    div.style.marginBottom = '6px';
                    div.style.borderRadius = '12px';
                }
            });
        }

        // C. Finale Screen ("That's a Wrap!" .results-display)
        const finalDisplay = gameArea.querySelector('.results-display');
        if (finalDisplay && !finalDisplay.__iosFinalEnhanced) {
            finalDisplay.__iosFinalEnhanced = true;
        }

        // D. Solo Practice Mode: Next Game / Replay Controls, Push Range Lock-In Button, & Timer-Expiry Auto-Grading
        if (window.DEV_MODE) {
            const soloRotation = [
                { game: 'line_fit', snap: 'line_fit_active', label: '📈 Line Fit' },
                { game: 'budget_blitz', snap: 'budget_blitz_active', label: '💰 Budget Blitz' },
                { game: 'closest_guess', snap: 'closest_guess_active', label: '🎯 Closest Guess' },
                { game: 'buy_a_clue', snap: 'buy_a_clue_active', label: '🕵️ Buy a Clue' },
                { game: 'minority_rule', snap: 'minority_rule_active', label: '🌊 Minority Rule' },
                { game: 'crowd_wisdom', snap: 'crowd_wisdom_active', label: '🧠 Crowd Wisdom' },
                { game: 'speed_tap', snap: 'speed_tap_active', label: '⚡ Speed Tap' },
                { game: 'push_range', snap: 'push_range_active', label: '⚔️ Push Range' },
                { game: 'word_guess', snap: 'word_guess_active', label: '🔤 Word Guess' }
            ];
            const currentGameType = (typeof gameType !== 'undefined' && gameType)
                || new URLSearchParams(window.location.search).get('game')
                || 'speed_tap';
            const curIdx = Math.max(0, soloRotation.findIndex(function (g) { return g.game === currentGameType; }));
            const nextSolo = soloRotation[(curIdx + 1) % soloRotation.length];

            const navigateToSoloGame = function (targetObj) {
                postToNative({ type: 'haptic', pattern: [20, 40, 20] });
                window.__PRAXIS_IOS_SOLO_RESULTS = false;
                const url = new URL(window.location.href);
                url.searchParams.set('room', 'SOLO');
                url.searchParams.set('dev', '1');
                url.searchParams.set('solo', '1');
                url.searchParams.set('game', targetObj.game);
                url.searchParams.set('state', targetObj.snap);
                url.searchParams.set('snapshot', targetObj.snap);
                url.searchParams.delete('results');
                window.location.href = url.toString();
            };

            // D1. Push Range Solo Mode: Add "⚡ Lock Range & View Results" button below #pushButton
            const pushBtn = document.getElementById('pushButton');
            if (pushBtn && !document.getElementById('iosSoloPushFinishBtn')) {
                const finishBtn = document.createElement('button');
                finishBtn.type = 'button';
                finishBtn.id = 'iosSoloPushFinishBtn';
                finishBtn.innerHTML = '⚡ Lock In Team Range & View Results';
                finishBtn.style.cssText = 'display: block; width: 100%; max-width: 340px; margin: 10px auto 0 auto; padding: 11px 16px; border-radius: 12px; border: 1.5px solid #2563EB; background: #EFF6FF; color: #1D4ED8; font-size: 0.9rem; font-weight: 800; cursor: pointer; box-shadow: 0 3px 10px rgba(37, 99, 235, 0.14);';
                finishBtn.addEventListener('click', function () {
                    postToNative({ type: 'haptic', pattern: [25, 40] });
                    finishBtn.disabled = true;
                    finishBtn.textContent = 'Scoring Team Bracket...';
                    if (typeof websocket !== 'undefined' && websocket) {
                        websocket.send(JSON.stringify({ action: 'push_range_finish' }));
                    }
                });
                pushBtn.insertAdjacentElement('afterend', finishBtn);
            }

            // D2. Auto-resolve if round timer hits 0 and shows .suspense-shimmer-card in Solo Mode
            const shimmer = gameArea.querySelector('.suspense-shimmer-card');
            if (shimmer && !shimmer.__iosSoloTimeoutHandled && !window.__iosSoloResultPending) {
                shimmer.__iosSoloTimeoutHandled = true;
                setTimeout(function () {
                    if (window.isRoundEnded || typeof websocket === 'undefined' || !websocket) return;
                    websocket.send(JSON.stringify({
                        action: 'solo_timer_expired',
                        data: { game_type: currentGameType }
                    }));
                }, 900);
            }

            // D3. Inject "🔄 Play Again" + "▶️ Next Game" action bar on any debrief screen
            const debriefRoot = document.getElementById('roundCompleteBanner')
                || gameArea.querySelector('.bb-results')
                || gameArea.querySelector('.bac-results')
                || gameArea.querySelector('.mr-results');

            if (debriefRoot && !gameArea.querySelector('.ios-solo-replay-btn')) {
                // Hide passive "Waiting for instructor..." text in Solo Mode
                debriefRoot.querySelectorAll('div').forEach(function (d) {
                    if (d.children.length === 0 && (d.textContent || '').includes('⏳')) {
                        d.style.display = 'none';
                    }
                });

                const btnRow = document.createElement('div');
                btnRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;';

                const btnReplay = document.createElement('button');
                btnReplay.type = 'button';
                btnReplay.className = 'ios-solo-replay-btn';
                btnReplay.style.marginTop = '0';
                btnReplay.innerHTML = '🔄 Play Again';
                btnReplay.addEventListener('click', function () {
                    postToNative({ type: 'haptic', pattern: [20, 40, 20] });
                    window.__PRAXIS_IOS_SOLO_RESULTS = false;
                    window.location.reload();
                });

                const btnNext = document.createElement('button');
                btnNext.type = 'button';
                btnNext.className = 'ios-solo-replay-btn';
                btnNext.style.cssText = 'margin-top: 0; background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important; box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35) !important;';
                btnNext.innerHTML = '▶️ Next: ' + nextSolo.label;
                btnNext.addEventListener('click', function () {
                    navigateToSoloGame(nextSolo);
                });

                btnRow.appendChild(btnReplay);
                btnRow.appendChild(btnNext);
                debriefRoot.appendChild(btnRow);

                // Also make "📋 Next Round Preview" card clickable in Solo Mode if present
                gameArea.querySelectorAll('div').forEach(function (card) {
                    if (!card.__iosNextCardBound && (card.textContent || '').includes('Next Round Preview') && (card.getAttribute('style') || '').includes('border: 2px solid #cbd5e1')) {
                        card.__iosNextCardBound = true;
                        card.style.cursor = 'pointer';
                        card.addEventListener('click', function () {
                            navigateToSoloGame(nextSolo);
                        });
                    }
                });
            }
        }
    }

    // 4A. Line Fit: Dark-Slate Analytics Renderer + 60fps Live Touch-Drag
    function enhanceLineFitTouchAndTheme() {
        const canvas = document.getElementById('scatterCanvas');
        if (!canvas || canvas.__iosLineFitEnhanced) return;
        canvas.__iosLineFitEnhanced = true;

        // Upgrade global drawScatterPlot to render a crisp Daylight Analytics Chart
        window.drawScatterPlot = function () {
            if (typeof lineFitState === 'undefined') return;
            const ctx = lineFitState.ctx;
            const cvs = lineFitState.canvas;
            const config = lineFitState.config;
            const margins = lineFitState.canvasMargins;

            if (!ctx || !cvs || !config) {
                setTimeout(window.drawScatterPlot, 80);
                return;
            }

            // Crisp daylight background
            ctx.fillStyle = '#F8FAFC';
            ctx.fillRect(0, 0, cvs.width, cvs.height);

            const plotWidth = cvs.width - margins.left - margins.right;
            const plotHeight = cvs.height - margins.top - margins.bottom;
            const plotLeft = margins.left;
            const plotTop = margins.top;

            // Subtle coordinate gridlines
            ctx.strokeStyle = '#E2E8F0';
            ctx.lineWidth = 1;
            for (let i = 1; i <= 4; i++) {
                const gx = plotLeft + (plotWidth * i) / 4;
                const gy = plotTop + (plotHeight * i) / 4;
                ctx.beginPath();
                ctx.moveTo(gx, plotTop);
                ctx.lineTo(gx, plotTop + plotHeight);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(plotLeft, gy);
                ctx.lineTo(plotLeft + plotWidth, gy);
                ctx.stroke();
            }

            // Crisp Axes
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(plotLeft, plotTop + plotHeight);
            ctx.lineTo(plotLeft + plotWidth, plotTop + plotHeight);
            ctx.moveTo(plotLeft, plotTop);
            ctx.lineTo(plotLeft, plotTop + plotHeight);
            ctx.stroke();

            // Axis Titles
            ctx.fillStyle = '#0F172A';
            ctx.font = '600 15px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(config.x_label || 'X', plotLeft + plotWidth / 2, cvs.height - 12);

            ctx.save();
            ctx.translate(16, plotTop + plotHeight / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(config.y_label || 'Y', 0, 0);
            ctx.restore();

            // Tick Labels
            ctx.font = '600 13px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = '#475569';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const xMid = (config.x_min + config.x_max) / 2;
            ctx.fillText(config.x_min.toFixed(1), plotLeft, plotTop + plotHeight + 6);
            ctx.fillText(xMid.toFixed(1), plotLeft + plotWidth / 2, plotTop + plotHeight + 6);
            ctx.fillText(config.x_max.toFixed(1), plotLeft + plotWidth, plotTop + plotHeight + 6);

            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            const yMid = (config.y_min + config.y_max) / 2;
            ctx.fillText(config.y_max.toFixed(0), plotLeft - 8, plotTop);
            ctx.fillText(yMid.toFixed(0), plotLeft - 8, plotTop + plotHeight / 2);
            ctx.fillText(config.y_min.toFixed(0), plotLeft - 8, plotTop + plotHeight);

            // Peer lines (if any)
            ctx.lineWidth = 2;
            (lineFitState.otherLines || []).forEach(function (line) {
                ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
                drawLine(line.slope, line.intercept);
            });

            // Proposed Line + Ghost Residual Springs
            if (lineFitState.proposedLine) {
                if (lineFitState.scatterData && lineFitState.scatterData.points) {
                    ctx.save();
                    ctx.setLineDash([4, 4]);
                    lineFitState.scatterData.points.forEach(function (pt) {
                        const yPred = lineFitState.proposedLine.slope * pt.x + lineFitState.proposedLine.intercept;
                        const pPoint = dataToCanvas(pt.x, pt.y);
                        const pLine = dataToCanvas(pt.x, yPred);
                        const residual = Math.abs(pt.y - yPred);
                        if (residual < 2.2) {
                            ctx.strokeStyle = 'rgba(5, 150, 105, 0.85)';
                        } else if (residual < 5.0) {
                            ctx.strokeStyle = 'rgba(217, 119, 6, 0.8)';
                        } else {
                            ctx.strokeStyle = 'rgba(225, 29, 72, 0.75)';
                        }
                        ctx.lineWidth = 1.75;
                        ctx.beginPath();
                        ctx.moveTo(pPoint.x, pPoint.y);
                        ctx.lineTo(pLine.x, pLine.y);
                        ctx.stroke();
                    });
                    ctx.restore();
                }

                ctx.save();
                ctx.shadowColor = 'rgba(2, 132, 199, 0.35)';
                ctx.shadowBlur = 6;
                ctx.strokeStyle = '#0284C7';
                ctx.lineWidth = 3.5;
                drawLine(lineFitState.proposedLine.slope, lineFitState.proposedLine.intercept);
                ctx.restore();
            }

            // Scatter Points
            if (lineFitState.scatterData && lineFitState.scatterData.points) {
                lineFitState.scatterData.points.forEach(function (pt) {
                    const c = dataToCanvas(pt.x, pt.y);
                    ctx.save();
                    ctx.fillStyle = '#FFFFFF';
                    ctx.strokeStyle = '#2563EB';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, 7.5, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    ctx.restore();
                });
            }

            // Draggable Endpoint Handles with Touch Halo
            const drawHandle = function (pt) {
                const c = dataToCanvas(pt.x, pt.y);
                ctx.save();
                ctx.fillStyle = 'rgba(2, 132, 199, 0.20)';
                ctx.beginPath();
                ctx.arc(c.x, c.y, 18, 0, 2 * Math.PI);
                ctx.fill();

                ctx.fillStyle = '#0284C7';
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(c.x, c.y, 8.5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            };

            if (lineFitState.point1) drawHandle(lineFitState.point1);
            if (lineFitState.point2) drawHandle(lineFitState.point2);
        };

        // Helper to seed or preserve the 2 draggable cyan handles whenever scatter data arrives
        function seedInitialHandlesIfNeeded(forceReset) {
            if (typeof lineFitState === 'undefined' || !lineFitState.config) return;
            if (!lineFitState.scatterData && lineFitState.config.points) {
                lineFitState.scatterData = {
                    type: 'line_fit_data',
                    points: lineFitState.config.points.map(function (p) {
                        return Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y };
                    }),
                    x_bounds: [lineFitState.config.x_min, lineFitState.config.x_max],
                    y_bounds: [lineFitState.config.y_min, lineFitState.config.y_max],
                    axis_labels: { x: lineFitState.config.x_label, y: lineFitState.config.y_label }
                };
            }
            if (!lineFitState.scatterData || lineFitState.mode === 'confirmed') return;

            const cfg = lineFitState.config;
            const xSpan = cfg.x_max - cfg.x_min;
            const ySpan = cfg.y_max - cfg.y_min;
            if (forceReset || !lineFitState.point1 || !lineFitState.point2) {
                lineFitState.point1 = {
                    x: Number((cfg.x_min + xSpan * 0.18).toFixed(2)),
                    y: Number((cfg.y_min + ySpan * 0.30).toFixed(2))
                };
                lineFitState.point2 = {
                    x: Number((cfg.x_min + xSpan * 0.84).toFixed(2)),
                    y: Number((cfg.y_min + ySpan * 0.78).toFixed(2))
                };
            }
            lineFitState.mode = 'proposed';
            if (typeof calculateLineFromPoints === 'function') calculateLineFromPoints();
            const controls = document.getElementById('lineFitControls');
            if (controls && !window.isProjectorMode) controls.style.display = 'flex';
            const confirmBtn = document.getElementById('confirmBtn');
            const redrawBtn = document.getElementById('redrawBtn');
            if (confirmBtn) confirmBtn.disabled = false;
            if (redrawBtn) redrawBtn.disabled = false;
            const inst = document.getElementById('canvasInstructions');
            if (inst) {
                inst.innerHTML = '👆 Drag either cyan handle to fit the line, then Confirm';
                inst.style.color = '#38BDF8';
            }
            window.drawScatterPlot();
        }

        // Hook processScatterData so the 500ms scatter_data_message does not wipe mode back to 'placing_first'
        if (typeof window.processScatterData === 'function' && !window.processScatterData.__iosWrapped) {
            const origProcessScatter = window.processScatterData;
            const wrappedProcessScatter = function () {
                const hadHandles = (typeof lineFitState !== 'undefined' && lineFitState.point1 && lineFitState.point2);
                const savedP1 = hadHandles ? { x: lineFitState.point1.x, y: lineFitState.point1.y } : null;
                const savedP2 = hadHandles ? { x: lineFitState.point2.x, y: lineFitState.point2.y } : null;
                origProcessScatter.apply(this, arguments);
                if (savedP1 && savedP2 && lineFitState.mode !== 'confirmed') {
                    lineFitState.point1 = savedP1;
                    lineFitState.point2 = savedP2;
                }
                seedInitialHandlesIfNeeded(false);
            };
            wrappedProcessScatter.__iosWrapped = true;
            window.processScatterData = wrappedProcessScatter;
        }

        // Hook redrawLineFit so tapping Redraw resets the 2 draggable handles cleanly
        if (typeof window.redrawLineFit === 'function' && !window.redrawLineFit.__iosWrapped) {
            const origRedraw = window.redrawLineFit;
            const wrappedRedraw = function () {
                origRedraw.apply(this, arguments);
                seedInitialHandlesIfNeeded(true);
            };
            wrappedRedraw.__iosWrapped = true;
            window.redrawLineFit = wrappedRedraw;
        }

        setTimeout(function () {
            seedInitialHandlesIfNeeded(false);
        }, 120);

        // Live 60fps Touch & Pointer Drag Handler
        let lastDragHaptic = 0;
        let isDragging = false;

        function clampDataPoint(pt) {
            const cfg = lineFitState.config;
            if (!cfg) return pt;
            return {
                x: Math.max(cfg.x_min, Math.min(cfg.x_max, pt.x)),
                y: Math.max(cfg.y_min, Math.min(cfg.y_max, pt.y))
            };
        }

        function onDragStart(e) {
            if (typeof lineFitState === 'undefined' || lineFitState.mode === 'confirmed') return;
            e.preventDefault();
            e.stopPropagation();

            const raw = getCanvasCoordinates(e);
            if (!raw) return;
            const dataPt = clampDataPoint(canvasToData(raw.x, raw.y));

            isDragging = true;
            postToNative({ type: 'haptic', pattern: [18] });

            if (lineFitState.point1 && lineFitState.point2) {
                lineFitState.mode = 'proposed';
                // Grab whichever endpoint is closer to the touch/pointer
                const c1 = dataToCanvas(lineFitState.point1.x, lineFitState.point1.y);
                const c2 = dataToCanvas(lineFitState.point2.x, lineFitState.point2.y);
                const d1 = Math.hypot(raw.x - c1.x, raw.y - c1.y);
                const d2 = Math.hypot(raw.x - c2.x, raw.y - c2.y);
                if (d1 < d2) {
                    // Swap so point1 is the fixed anchor and point2 tracks the finger/cursor
                    lineFitState.point1 = lineFitState.point2;
                }
                lineFitState.point2 = dataPt;
                calculateLineFromPoints();
                const confirmBtn = document.getElementById('confirmBtn');
                const redrawBtn = document.getElementById('redrawBtn');
                if (confirmBtn) confirmBtn.disabled = false;
                if (redrawBtn) redrawBtn.disabled = false;
                window.drawScatterPlot();
            } else if (lineFitState.mode === 'placing_second' && lineFitState.point1) {
                if (validateMinimumDistance(lineFitState.point1, dataPt)) {
                    lineFitState.point2 = dataPt;
                    lineFitState.mode = 'proposed';
                    calculateLineFromPoints();
                    const confirmBtn = document.getElementById('confirmBtn');
                    const redrawBtn = document.getElementById('redrawBtn');
                    if (confirmBtn) confirmBtn.disabled = false;
                    if (redrawBtn) redrawBtn.disabled = false;
                    const inst = document.getElementById('canvasInstructions');
                    if (inst) {
                        inst.innerHTML = '✨ Drag handles to fine-tune, or tap Confirm Line';
                        inst.style.color = '#34D399';
                    }
                    window.drawScatterPlot();
                }
            } else {
                lineFitState.point1 = dataPt;
                lineFitState.point2 = null;
                lineFitState.proposedLine = null;
                lineFitState.mode = 'placing_second';
                window.drawScatterPlot();
            }
        }

        function onDragMove(e) {
            if (!isDragging || typeof lineFitState === 'undefined' || lineFitState.mode === 'confirmed' || !lineFitState.point1) return;
            e.preventDefault();
            e.stopPropagation();

            const raw = getCanvasCoordinates(e);
            if (!raw) return;
            const dataPt = clampDataPoint(canvasToData(raw.x, raw.y));

            if (validateMinimumDistance(lineFitState.point1, dataPt)) {
                lineFitState.point2 = dataPt;
                lineFitState.mode = 'proposed';
                calculateLineFromPoints();

                const confirmBtn = document.getElementById('confirmBtn');
                const redrawBtn = document.getElementById('redrawBtn');
                if (confirmBtn) confirmBtn.disabled = false;
                if (redrawBtn) redrawBtn.disabled = false;

                const inst = document.getElementById('canvasInstructions');
                if (inst) {
                    inst.innerHTML = '✨ Drag handles to fine-tune, or tap Confirm Line';
                    inst.style.color = '#34D399';
                }

                window.drawScatterPlot();

                const now = Date.now();
                if (now - lastDragHaptic > 130) {
                    lastDragHaptic = now;
                    postToNative({ type: 'haptic', pattern: [10] });
                }
            }
        }

        function onDragEnd(e) {
            if (!isDragging || typeof lineFitState === 'undefined' || lineFitState.mode === 'confirmed') return;
            e.preventDefault();
            e.stopPropagation();
            isDragging = false;

            if (lineFitState.mode === 'proposed' && lineFitState.point1 && lineFitState.point2) {
                sendLineProposal();
                postToNative({ type: 'haptic', pattern: [22] });
            } else if (lineFitState.mode === 'placing_second') {
                const inst = document.getElementById('canvasInstructions');
                if (inst) {
                    inst.innerHTML = '🎯 Tap or drag to place your SECOND point';
                    inst.style.color = '#38BDF8';
                }
            }
        }

        canvas.addEventListener('touchstart', onDragStart, { capture: true, passive: false });
        canvas.addEventListener('touchmove', onDragMove, { capture: true, passive: false });
        canvas.addEventListener('touchend', onDragEnd, { capture: true, passive: false });
        canvas.addEventListener('mousedown', onDragStart, { capture: true });
        canvas.addEventListener('mousemove', onDragMove, { capture: true });
        window.addEventListener('mouseup', onDragEnd, { capture: true });
        canvas.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
        }, { capture: true });
    }

    // 4B. Closest Guess: Tactile Dual Thumb Sliders + Stepper Pills (-5 / -1 / +1 / +5)
    function enhanceClosestGuessTouchControls() {
        const minInput = document.getElementById('guessMin');
        const maxInput = document.getElementById('guessMax');
        const rangeInputs = document.querySelector('.range-inputs');
        if (!minInput || !maxInput || !rangeInputs || rangeInputs.__iosEnhanced) return;
        rangeInputs.__iosEnhanced = true;

        minInput.setAttribute('inputmode', 'decimal');
        maxInput.setAttribute('inputmode', 'decimal');

        const lo = typeof initialNumberlineMin === 'number' ? initialNumberlineMin : 0;
        const hi = typeof initialNumberlineMax === 'number' ? initialNumberlineMax : 100;
        const span = Math.max(10, hi - lo);

        // Pre-seed sensible initial values if empty so student can immediately slide or step
        if (!minInput.value && !maxInput.value) {
            const defaultMin = Math.round(lo + span * 0.35);
            const defaultMax = Math.round(lo + span * 0.50);
            minInput.value = defaultMin;
            maxInput.value = defaultMax;
            if (typeof updateBracketPreview === 'function') updateBracketPreview();
        }

        const deck = document.createElement('div');
        deck.className = 'ios-cg-touch-deck';
        deck.innerHTML = `
            <div class="ios-cg-col">
                <input type="range" id="iosMinSlider" class="ios-cg-slider" min="${lo}" max="${hi}" step="1" value="${minInput.value || lo}">
                <div class="ios-cg-steppers">
                    <button type="button" class="ios-cg-step-btn" data-target="min" data-delta="-5">-5</button>
                    <button type="button" class="ios-cg-step-btn" data-target="min" data-delta="-1">-1</button>
                    <button type="button" class="ios-cg-step-btn" data-target="min" data-delta="1">+1</button>
                    <button type="button" class="ios-cg-step-btn" data-target="min" data-delta="5">+5</button>
                </div>
            </div>
            <div class="ios-cg-col">
                <input type="range" id="iosMaxSlider" class="ios-cg-slider" min="${lo}" max="${hi}" step="1" value="${maxInput.value || hi}">
                <div class="ios-cg-steppers">
                    <button type="button" class="ios-cg-step-btn" data-target="max" data-delta="-5">-5</button>
                    <button type="button" class="ios-cg-step-btn" data-target="max" data-delta="-1">-1</button>
                    <button type="button" class="ios-cg-step-btn" data-target="max" data-delta="1">+1</button>
                    <button type="button" class="ios-cg-step-btn" data-target="max" data-delta="5">+5</button>
                </div>
            </div>
        `;
        rangeInputs.insertAdjacentElement('afterend', deck);

        const minSlider = document.getElementById('iosMinSlider');
        const maxSlider = document.getElementById('iosMaxSlider');
        let lastSliderHaptic = 0;

        function syncValues(changed, newVal) {
            if (minInput.disabled) return;
            let vMin = parseFloat(minInput.value);
            let vMax = parseFloat(maxInput.value);
            if (isNaN(vMin)) vMin = lo;
            if (isNaN(vMax)) vMax = hi;

            if (changed === 'min') {
                vMin = Math.max(lo, Math.min(hi - 1, newVal));
                if (vMin >= vMax) vMax = Math.min(hi, vMin + 1);
            } else {
                vMax = Math.max(lo + 1, Math.min(hi, newVal));
                if (vMax <= vMin) vMin = Math.max(lo, vMax - 1);
            }

            minInput.value = Number(vMin.toFixed(1));
            maxInput.value = Number(vMax.toFixed(1));
            if (minSlider) minSlider.value = vMin;
            if (maxSlider) maxSlider.value = vMax;
            if (typeof updateBracketPreview === 'function') updateBracketPreview();
        }

        if (minSlider) {
            minSlider.addEventListener('input', function () {
                syncValues('min', parseFloat(minSlider.value));
                const now = Date.now();
                if (now - lastSliderHaptic > 90) {
                    lastSliderHaptic = now;
                    postToNative({ type: 'haptic', pattern: [10] });
                }
            });
        }
        if (maxSlider) {
            maxSlider.addEventListener('input', function () {
                syncValues('max', parseFloat(maxSlider.value));
                const now = Date.now();
                if (now - lastSliderHaptic > 90) {
                    lastSliderHaptic = now;
                    postToNative({ type: 'haptic', pattern: [10] });
                }
            });
        }

        deck.querySelectorAll('.ios-cg-step-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const target = btn.getAttribute('data-target');
                const delta = parseFloat(btn.getAttribute('data-delta') || '0');
                const current = parseFloat(target === 'min' ? minInput.value : maxInput.value) || 0;
                syncValues(target, current + delta);
            });
        });

        minInput.addEventListener('input', function () {
            if (minSlider && !isNaN(parseFloat(minInput.value))) minSlider.value = parseFloat(minInput.value);
        });
        maxInput.addEventListener('input', function () {
            if (maxSlider && !isNaN(parseFloat(maxInput.value))) maxSlider.value = parseFloat(maxInput.value);
        });
    }

    // 4C. Word Guess: Built-in Wordle-Style Tactile QWERTY Keypad (Prevents System Keyboard Overlap)
    function enhanceWordGuessTouchKeyboard() {
        const input = document.getElementById('wordGuessInput');
        const area = document.querySelector('.word-guess-area');
        if (!input || !area || area.__iosWgEnhanced) return;
        area.__iosWgEnhanced = true;

        // Prevent iOS system keyboard from popping up and covering 45% of the screen
        input.setAttribute('inputmode', 'none');
        input.setAttribute('readonly', 'readonly');
        input.blur();

        const rows = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['⌫', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'GO']
        ];

        const kb = document.createElement('div');
        kb.className = 'ios-wg-keyboard';
        kb.innerHTML = rows.map(function (row) {
            return '<div class="ios-wg-row">' + row.map(function (k) {
                const isWide = (k === '⌫' || k === 'GO');
                const extraClass = k === 'GO' ? 'ios-wg-wide ios-wg-go disabled' : (isWide ? 'ios-wg-wide' : '');
                return `<button type="button" class="ios-wg-key ${extraClass}" data-key="${k}">${k}</button>`;
            }).join('') + '</div>';
        }).join('');

        const feedback = area.querySelector('#feedback');
        if (feedback) {
            area.insertBefore(kb, feedback);
        } else {
            area.appendChild(kb);
        }

        const goBtn = kb.querySelector('.ios-wg-go');

        function handleKeyTap(key) {
            if (typeof wordGuessState === 'undefined' || wordGuessState.hasAnswered) return;
            const maxLen = wordGuessState.letterCount || 20;
            let current = (input.value || '').replace(/[^A-Z]/gi, '').toUpperCase();

            if (key === '⌫') {
                current = current.slice(0, -1);
            } else if (key === 'GO') {
                if (current.length === maxLen && typeof submitWordGuess === 'function') {
                    submitWordGuess();
                }
                return;
            } else if (/^[A-Z]$/.test(key)) {
                if (current.length < maxLen) {
                    current += key;
                }
            }

            input.value = current;
            if (typeof handleWordGuessInput === 'function') {
                handleWordGuessInput({ target: input });
            }

            if (goBtn) {
                if (current.length === maxLen) {
                    goBtn.classList.remove('disabled');
                } else {
                    goBtn.classList.add('disabled');
                }
            }
        }

        kb.querySelectorAll('.ios-wg-key').forEach(function (btn) {
            btn.addEventListener('click', function () {
                handleKeyTap(btn.getAttribute('data-key'));
            });
        });

        // Support physical iPad Magic Keyboard / desktop keyboard typing while readonly is active
        if (!window.__iosWgKeydownBound) {
            window.__iosWgKeydownBound = true;
            window.addEventListener('keydown', function (e) {
                const activeInput = document.getElementById('wordGuessInput');
                if (!activeInput || typeof wordGuessState === 'undefined' || wordGuessState.hasAnswered) return;
                if (e.metaKey || e.ctrlKey || e.altKey) return;
                if (e.key === 'Backspace') {
                    e.preventDefault();
                    handleKeyTap('⌫');
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    handleKeyTap('GO');
                } else if (/^[a-zA-Z]$/.test(e.key)) {
                    e.preventDefault();
                    handleKeyTap(e.key.toUpperCase());
                }
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Observe Score, Rank, and Connection State -> Native SwiftUI Top HUD
    // ─────────────────────────────────────────────────────────────────────────
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

    onReady(function () {
        if (!isClassicPlayPage()) return;
        const scoreEl = document.getElementById('playerScore');
        const rankEl = document.getElementById('playerRank');
        const lbEl = document.getElementById('leaderboard');
        if (lbEl && !lbEl.__iosToggleBound) {
            lbEl.__iosToggleBound = true;
            lbEl.addEventListener('click', function () {
                lbEl.classList.toggle('ios-expanded');
                postToNative({ type: 'haptic', pattern: [15] });
            });
        }
        const observer = new MutationObserver(function () {
            syncHUDToNative();
        });
        if (scoreEl) observer.observe(scoreEl, { childList: true, characterData: true, subtree: true });
        if (rankEl) observer.observe(rankEl, { childList: true, characterData: true, subtree: true });

        setInterval(function () {
            syncHUDToNative();
        }, 1500);
        syncHUDToNative();

        installIOSTouchEnhancements();
        enhanceSoloArcadeIfNeeded();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Solo Practice Arcade Simulation for All 9 Minigames
    // ─────────────────────────────────────────────────────────────────────────
    function enhanceSoloArcadeIfNeeded() {
        if (!window.DEV_MODE || typeof MockWebSocket === 'undefined') return;
        if (MockWebSocket.prototype.__iosSoloPatched) return;
        MockWebSocket.prototype.__iosSoloPatched = true;

        const originalSend = MockWebSocket.prototype.send;
        MockWebSocket.prototype.send = function (rawData) {
            let msg = {};
            try {
                msg = JSON.parse(rawData);
            } catch (_) {}

            const action = msg.action;
            const data = msg.data || {};
            const self = this;

            if (action === 'identify') {
                return originalSend.call(this, rawData);
            }

            // Route generic Solo timer expiration to the active game's grading pipeline
            if (action === 'solo_timer_expired' || action === 'minority_rule_timeout') {
                const gType = data.game_type || (typeof gameType !== 'undefined' && gameType) || '';
                if (gType === 'line_fit' || String(window.DEV_STATE || '').indexOf('line_fit') === 0) {
                    const prop = (typeof lineFitState !== 'undefined' && lineFitState.proposedLine) || { slope: 4.5, intercept: 55 };
                    return this.send(JSON.stringify({ action: 'line_fit_confirm', data: { slope: prop.slope, intercept: prop.intercept } }));
                } else if (gType === 'closest_guess' || String(window.DEV_STATE || '').indexOf('closest_guess') === 0) {
                    const minEl = document.getElementById('guessMin');
                    const maxEl = document.getElementById('guessMax');
                    return this.send(JSON.stringify({
                        action: 'submit_guess',
                        data: {
                            guess_min: minEl ? parseFloat(minEl.value) : 35,
                            guess_max: maxEl ? parseFloat(maxEl.value) : 50
                        }
                    }));
                } else if (gType === 'push_range' || String(window.DEV_STATE || '').indexOf('push_range') === 0) {
                    return this.send(JSON.stringify({ action: 'push_range_finish' }));
                } else if (gType === 'budget_blitz' || String(window.DEV_STATE || '').indexOf('budget_blitz') === 0) {
                    const alloc = (typeof budgetBlitzState !== 'undefined' && budgetBlitzState.allocation) || {};
                    return this.send(JSON.stringify({ action: 'budget_blitz_submit', data: { allocation_by_channel_id: alloc } }));
                } else if (gType === 'buy_a_clue' || String(window.DEV_STATE || '').indexOf('buy_a_clue') === 0) {
                    const optId = (typeof buyAClueState !== 'undefined' && buyAClueState.selectedOptionId) || 'A';
                    return this.send(JSON.stringify({ action: 'buy_a_clue_submit', data: { option_id: optId } }));
                } else if (gType === 'minority_rule' || action === 'minority_rule_timeout' || String(window.DEV_STATE || '').indexOf('minority_rule') === 0) {
                    const optIdx = (typeof minorityRuleState !== 'undefined' && minorityRuleState.selectedOptionIndex != null) ? minorityRuleState.selectedOptionIndex : 0;
                    return this.send(JSON.stringify({ action: 'minority_rule_submit', data: { option_index: optIdx } }));
                } else if (gType === 'crowd_wisdom' || String(window.DEV_STATE || '').indexOf('crowd_wisdom') === 0) {
                    return this.send(JSON.stringify({ action: 'crowd_wisdom_answer', data: { option_index: -1 } }));
                } else if (gType === 'word_guess' || String(window.DEV_STATE || '').indexOf('word_guess') === 0) {
                    return this.send(JSON.stringify({ action: 'word_guess_timeout', data: { answer: 'MARKETING MIX' } }));
                } else {
                    return this.send(JSON.stringify({ action: 'speed_tap', data: { answer: '' } }));
                }
            }

            // 1. Speed Tap submission in Solo Mode
            if (action === 'speed_tap') {
                window.__iosSoloResultPending = true;
                const chosenAns = data.answer != null ? String(data.answer) : 'Retention Rate';
                const isCorrect = (chosenAns === 'Retention Rate');
                const elapsedMs = (typeof speedTapStartTime === 'number' && speedTapStartTime > 0)
                    ? Math.max(600, Math.min(11500, Date.now() - speedTapStartTime))
                    : 2600;
                const pts = isCorrect ? Math.max(65, Math.round(115 - (elapsedMs / 1000) * 4)) : 0;
                setTimeout(async function () {
                    try {
                        const file = isCorrect ? 'speed_tap_results_correct.json' : 'speed_tap_results_incorrect.json';
                        const res = await fetch('dev_data/snapshots/' + file);
                        const json = await res.json();
                        json.player_answer = chosenAns || 'No Answer';
                        json.is_correct = isCorrect;
                        json.points = pts;
                        json.round_stats = json.round_stats || {};
                        json.round_stats.player_stats = json.round_stats.player_stats || {};
                        json.round_stats.player_stats['999'] = {
                            player_round_score: pts,
                            player_total_score: 380 + pts
                        };
                        json.game_specific = json.game_specific || {};
                        const synthResponses = [
                            { player_id: 1, player_name: 'Alice', response_time_ms: 1900, time: 1.9, is_correct: true },
                            { player_id: 2, player_name: 'Bob', response_time_ms: 2300, time: 2.3, is_correct: true },
                            { player_id: 999, player_name: 'You', response_time_ms: elapsedMs, time: Number((elapsedMs / 1000).toFixed(1)), is_correct: isCorrect },
                            { player_id: 3, player_name: 'Charlie', response_time_ms: 3400, time: 3.4, is_correct: true },
                            { player_id: 4, player_name: 'Diana', response_time_ms: 4100, time: 4.1, is_correct: true },
                            { player_id: 6, player_name: 'Ethan', response_time_ms: 5200, time: 5.2, is_correct: false },
                            { player_id: 7, player_name: 'Fiona', response_time_ms: 6000, time: 6.0, is_correct: true },
                            { player_id: 8, player_name: 'George', response_time_ms: 7400, time: 7.4, is_correct: false }
                        ];
                        json.game_specific.response_times = synthResponses;
                        json.game_specific.chart_data = {
                            game_time_limit: 12,
                            all_responses: synthResponses,
                            non_responders: []
                        };
                        window.__iosSoloResultPending = false;
                        self.simulateMessage(json);
                        postToNative({ type: 'soloCompleted', gameType: 'speed_tap', points: pts });
                    } catch (e) { console.error(e); }
                }, 1100);
                return;
            }

            if (action === 'line_fit_propose' || action === 'line_fit_redraw') {
                return;
            }

            // 2. Closest Guess submission in Solo Mode (Dynamic Range & Width Scoring)
            if (action === 'submit_guess' || action === 'submit_range' || action === 'closest_guess' || action === 'timer_expired') {
                window.__iosSoloResultPending = true;
                let gMin = parseFloat(data.guess_min);
                let gMax = parseFloat(data.guess_max);
                if (isNaN(gMin) || isNaN(gMax)) {
                    const minEl = document.getElementById('guessMin');
                    const maxEl = document.getElementById('guessMax');
                    gMin = minEl && !isNaN(parseFloat(minEl.value)) ? parseFloat(minEl.value) : 65;
                    gMax = maxEl && !isNaN(parseFloat(maxEl.value)) ? parseFloat(maxEl.value) : 75;
                }
                if (gMin > gMax) {
                    const tmp = gMin; gMin = gMax; gMax = tmp;
                }
                if (action !== 'timer_expired') {
                    this.simulateMessage({
                        type: 'guess_submitted',
                        guess_min: gMin,
                        guess_max: gMax,
                        submission_order: 1
                    });
                }
                setTimeout(async function () {
                    try {
                        const res = await fetch('dev_data/snapshots/closest_guess_results_correct.json');
                        const json = await res.json();
                        const truth = Number(json.correct_answer || 71);
                        const captured = (gMin <= truth && gMax >= truth);
                        const width = Math.max(1, Number((gMax - gMin).toFixed(1)));
                        const pts = captured ? Math.max(25, Math.min(100, Math.round(100 - width * 0.85))) : 0;
                        const rangeStr = `${gMin}-${gMax}`;

                        json.player_answer = rangeStr;
                        json.points = pts;
                        json.is_correct = captured;
                        json.round_stats = json.round_stats || {};
                        json.round_stats.player_stats = json.round_stats.player_stats || {};
                        json.round_stats.player_stats['999'] = {
                            player_id: 999,
                            player_name: 'You',
                            player_round_score: pts,
                            player_total_score: 380 + pts,
                            answered: true,
                            range: rangeStr,
                            range_width: width,
                            captured_answer: captured
                        };
                        if (Array.isArray(json.leaderboard)) {
                            const me = json.leaderboard.find(function (p) { return p.player_id == 999; });
                            if (me) {
                                me.player_name = 'You';
                                me.score = 380 + pts;
                            }
                        }
                        window.__iosSoloResultPending = false;
                        self.simulateMessage(json);
                        postToNative({ type: 'soloCompleted', gameType: 'closest_guess', points: pts });
                    } catch (e) { console.error(e); }
                }, 1200);
                return;
            }

            // 3. Crowd Wisdom submission in Solo Mode (Dynamic Option Grading)
            if (action === 'crowd_wisdom' || action === 'crowd_wisdom_answer' || action === 'submit_answer') {
                window.__iosSoloResultPending = true;
                const chosenOpt = (data.option_index !== undefined && data.option_index !== null) ? Number(data.option_index) : -1;
                if (chosenOpt >= 0) {
                    this.simulateMessage({
                        type: 'answer_submitted',
                        option_index: chosenOpt
                    });
                }
                setTimeout(async function () {
                    try {
                        const res = await fetch('dev_data/snapshots/crowd_wisdom_results_correct.json');
                        const json = await res.json();
                        const correctIdx = (json.game_specific && json.game_specific.correct_option_index != null)
                            ? Number(json.game_specific.correct_option_index)
                            : 1;
                        const isCorrect = (chosenOpt === correctIdx);
                        const pts = isCorrect ? 94 : 0;
                        const dist = (json.game_specific && json.game_specific.final_distribution) || [];
                        const chosenText = (dist.find(function (d) { return d.option_index === chosenOpt; }) || {}).text || 'No Answer';

                        json.is_correct = isCorrect;
                        json.points = pts;
                        json.player_answer = chosenText;
                        json.correct_answer = (dist.find(function (d) { return d.option_index === correctIdx; }) || {}).text || 'Merge Sort';
                        json.game_specific = json.game_specific || {};
                        json.game_specific.your_answer_index = chosenOpt;
                        json.game_specific.points_breakdown = {
                            base_points: isCorrect ? 100 : 0,
                            speed_multiplier: isCorrect ? 0.94 : 0,
                            tough_bonus: false,
                            final_points: pts
                        };
                        json.round_stats = json.round_stats || {};
                        json.round_stats.player_stats = json.round_stats.player_stats || {};
                        json.round_stats.player_stats['999'] = {
                            player_id: 999,
                            player_name: 'You',
                            answered: chosenOpt >= 0,
                            correct: isCorrect,
                            points_earned: pts,
                            total_score: 450 + pts,
                            player_round_score: pts,
                            player_total_score: 450 + pts,
                            answer_time: 3.8,
                            got_tough_bonus: false
                        };
                        if (typeof handleCrowdWisdomResults === 'function') {
                            try { handleCrowdWisdomResults(json); } catch (_) {}
                        }
                        window.__iosSoloResultPending = false;
                        self.simulateMessage(json);
                        postToNative({ type: 'soloCompleted', gameType: 'crowd_wisdom', points: pts });
                    } catch (e) { console.error(e); }
                }, 1300);
                return;
            }

            // 4. Word Guess submission in Solo Mode (Supports word_guess_submit + Live Validation)
            if (action === 'word_guess_submit' || action === 'word_guess' || action === 'submit_word_guess' || action === 'word_guess_timeout') {
                const rawGuess = String(data.answer || data.guess || '').trim();
                const normalizedGuess = rawGuess.replace(/[^A-Z]/gi, '').toUpperCase();
                const isTimeout = (action === 'word_guess_timeout');
                const isCorrect = !isTimeout && (normalizedGuess === 'MARKETINGMIX');

                if (!isCorrect && !isTimeout) {
                    this.simulateMessage({
                        type: 'word_guess_incorrect',
                        message: '❌ "' + rawGuess.toUpperCase() + '" is not right — use ⌫ to edit and try again!'
                    });
                    // Re-enable custom iOS GO button so player can edit and resubmit
                    setTimeout(function () {
                        const goBtn = document.querySelector('.ios-wg-go');
                        const inp = document.getElementById('wordGuessInput');
                        if (goBtn && inp) {
                            const maxLen = (typeof wordGuessState !== 'undefined' && wordGuessState.letterCount) || 12;
                            const curLen = (inp.value || '').replace(/[^A-Z]/gi, '').length;
                            if (curLen === maxLen) goBtn.classList.remove('disabled');
                        }
                    }, 60);
                    return;
                }

                window.__iosSoloResultPending = true;
                const cluesUsed = (typeof wordGuessState !== 'undefined' && wordGuessState.revealedCount) || 1;
                const pts = isCorrect ? Math.max(55, 110 - (cluesUsed - 1) * 15) : 0;

                if (isCorrect) {
                    this.simulateMessage({
                        type: 'word_guess_correct',
                        points: pts,
                        answer: 'MARKETING MIX'
                    });
                }
                setTimeout(async function () {
                    try {
                        const res = await fetch('dev_data/snapshots/word_guess_results_correct.json');
                        const json = await res.json();
                        json.points = pts;
                        json.is_correct = isCorrect;
                        json.player_answer = isCorrect ? 'MARKETING MIX' : (rawGuess || 'Time Expired');
                        json.round_stats = json.round_stats || {};
                        json.round_stats.player_stats = json.round_stats.player_stats || {};
                        json.round_stats.player_stats['999'] = {
                            player_round_score: pts,
                            player_total_score: 450 + pts
                        };
                        window.__iosSoloResultPending = false;
                        self.simulateMessage(json);
                        postToNative({ type: 'soloCompleted', gameType: 'word_guess', points: pts });
                    } catch (e) { console.error(e); }
                }, isCorrect ? 1400 : 400);
                return;
            }

            // 5. Line Fit submission in Solo Mode (Real OLS SSE, RMSE, R², & Rank Calculation)
            if (action === 'submit_line' || action === 'line_fit_submit' || action === 'line_fit_confirm') {
                window.__iosSoloResultPending = true;
                const prop = (typeof lineFitState !== 'undefined' && lineFitState.proposedLine) || {};
                const slope = Number((data.slope != null ? data.slope : (prop.slope != null ? prop.slope : 4.5)).toFixed(2));
                const intercept = Number((data.intercept != null ? data.intercept : (prop.intercept != null ? prop.intercept : 55.0)).toFixed(2));

                setTimeout(async function () {
                    try {
                        const res = await fetch('dev_data/snapshots/line_fit_results_correct.json');
                        const json = await res.json();
                        const gs = json.game_specific = json.game_specific || {};
                        const rawPts = (gs.scatter_data && gs.scatter_data.points) || [
                            [1.2, 60], [2.5, 65], [3.8, 72], [4.1, 75], [5.5, 78],
                            [6.2, 82], [7.0, 86], [7.8, 89], [8.5, 92], [9.2, 95]
                        ];
                        const ptsList = rawPts.map(function (p) { return Array.isArray(p) ? { x: p[0], y: p[1] } : p; });
                        const meanY = ptsList.reduce(function (s, p) { return s + p.y; }, 0) / (ptsList.length || 1);
                        let sse = 0;
                        let ssTot = 0;
                        ptsList.forEach(function (p) {
                            const yHat = slope * p.x + intercept;
                            sse += Math.pow(p.y - yHat, 2);
                            ssTot += Math.pow(p.y - meanY, 2);
                        });
                        sse = Number(sse.toFixed(1));
                        const rmse = Number(Math.sqrt(sse / (ptsList.length || 1)).toFixed(2));
                        const rSq = Number(Math.max(0, Math.min(0.99, 1 - (sse / (ssTot || 1)))).toFixed(2));
                        const eqStr = `y = ${slope}x ${intercept >= 0 ? '+' : '-'} ${Math.abs(intercept)}`;

                        const peerSubs = [
                            { slope: 4.7, intercept: 54.0, player_id: 1, player_name: 'Alice', sse: 15.2 },
                            { slope: 4.4, intercept: 56.0, player_id: 3, player_name: 'Charlie', sse: 18.7 },
                            { slope: 4.2, intercept: 57.0, player_id: 2, player_name: 'Bob', sse: 28.4 },
                            { slope: slope, intercept: intercept, player_id: 999, player_name: 'You', sse: sse }
                        ].sort(function (a, b) { return a.sse - b.sse; });
                        peerSubs.forEach(function (s, i) { s.rank = i + 1; });

                        const myEntry = peerSubs.find(function (s) { return s.player_id == 999; }) || { rank: 1, sse: sse };
                        const pts = Math.max(20, Math.min(100, Math.round(100 * Math.exp(-Math.max(0, sse - 10.5) / 150))));

                        gs.your_line = { slope: slope, intercept: intercept, equation: eqStr, sse: sse, rank: myEntry.rank };
                        gs.all_submissions = peerSubs;
                        gs.accuracy_metrics = { r_squared: rSq, rmse: rmse, accuracy_percent: Math.round(rSq * 100) };
                        gs.average_sse = Number((peerSubs.reduce(function (acc, s) { return acc + s.sse; }, 0) / peerSubs.length).toFixed(1));

                        json.points = pts;
                        json.is_correct = (pts >= 50);
                        json.player_answer = eqStr;
                        json.round_stats = json.round_stats || {};
                        json.round_stats.percent_scored = 92;
                        json.round_stats.player_stats = json.round_stats.player_stats || {};
                        json.round_stats.player_stats['999'] = {
                            player_id: 999,
                            player_name: 'You',
                            answered: true,
                            correct: pts >= 50,
                            points_earned: pts,
                            total_score: 380 + pts,
                            player_round_score: pts,
                            player_total_score: 380 + pts,
                            your_line: { slope: slope, intercept: intercept }
                        };
                        window.__iosSoloResultPending = false;
                        self.simulateMessage(json);
                        postToNative({ type: 'soloCompleted', gameType: 'line_fit', points: pts });
                    } catch (e) { console.error(e); }
                }, 1100);
                return;
            }

            // 6. Push Range button presses & finish in Solo Mode
            if (action === 'push_range_press' || action === 'button_press') {
                const count = Math.max(1, Number(data.press_count || 1));
                const st = this.__pushState = this.__pushState || {
                    leftBoundary: 15,
                    rightBoundary: 85,
                    myPresses: 0,
                    peerPresses: {
                        '100': 4, '101': 3, '102': 5, '103': 2,
                        '104': 6, '105': 4, '106': 5, '107': 3, '108': 4
                    }
                };
                st.myPresses += count;
                st.leftBoundary = Math.min(st.rightBoundary - 3, st.leftBoundary + count * 0.55);

                const playerPresses = Object.assign({}, st.peerPresses, { '999': st.myPresses });
                const leftTotal = (playerPresses['999'] || 0) + (playerPresses['100'] || 0) + (playerPresses['101'] || 0) + (playerPresses['102'] || 0) + (playerPresses['103'] || 0);
                const rightTotal = (playerPresses['104'] || 0) + (playerPresses['105'] || 0) + (playerPresses['106'] || 0) + (playerPresses['107'] || 0) + (playerPresses['108'] || 0);

                this.simulateMessage({
                    type: 'push_range_update',
                    left_boundary: parseFloat(st.leftBoundary.toFixed(2)),
                    right_boundary: parseFloat(st.rightBoundary.toFixed(2)),
                    player_presses: playerPresses,
                    team_stats: {
                        left: { total_presses: leftTotal, players: 5 },
                        right: { total_presses: rightTotal, players: 5 }
                    }
                });
                return;
            }

            if (action === 'push_range_finish') {
                if (this.__pushSoloDone) return;
                this.__pushSoloDone = true;
                window.__iosSoloResultPending = true;
                if (this.__pushUpdateInterval) clearInterval(this.__pushUpdateInterval);

                const st = this.__pushState || { leftBoundary: 72, rightBoundary: 92, myPresses: 28 };
                const leftB = Math.round(typeof localLeftBoundary === 'number' ? localLeftBoundary : st.leftBoundary);
                const rightB = Math.round(typeof localRightBoundary === 'number' ? localRightBoundary : st.rightBoundary);
                const myTaps = Math.max(st.myPresses || 0, typeof myPressCount === 'number' ? myPressCount : 0);

                setTimeout(async function () {
                    try {
                        const res = await fetch('dev_data/snapshots/push_range_results_correct.json');
                        const json = await res.json();
                        const truth = Number(json.correct_answer || 87);
                        const captured = (leftB <= truth && rightB >= truth);
                        const width = Math.max(2, rightB - leftB);
                        const pts = captured
                            ? Math.max(45, Math.min(100, Math.round(95 - width * 0.45) + Math.min(20, Math.round(myTaps * 0.5))))
                            : Math.min(35, Math.round(myTaps * 0.6));
                        const finalRangeStr = `${leftB}-${rightB}%`;
                        const topPressers = [
                            { player_id: 999, player_name: 'You', team: 'left', presses: myTaps, points: pts },
                            { player_id: 1, player_name: 'Alice', team: 'left', presses: 34, points: 78 },
                            { player_id: 2, player_name: 'Bob', team: 'right', presses: 31, points: 72 }
                        ].sort(function (a, b) { return b.presses - a.presses; });

                        json.points = pts;
                        json.is_correct = captured;
                        json.player_answer = captured ? `Team Captured (${finalRangeStr})` : `Missed (${finalRangeStr})`;
                        json.round_stats = json.round_stats || {};
                        json.round_stats.player_stats = json.round_stats.player_stats || {};
                        json.round_stats.player_stats['999'] = {
                            player_round_score: pts,
                            player_total_score: 430 + pts
                        };
                        json.game_specific = {
                            is_correct: captured,
                            final_range: finalRangeStr,
                            top_pressers: topPressers,
                            chart_data: {
                                final_left: leftB,
                                final_right: rightB,
                                correct_answer: truth,
                                top_pressers: topPressers
                            }
                        };
                        window.__iosSoloResultPending = false;
                        self.simulateMessage(json);
                        postToNative({ type: 'soloCompleted', gameType: 'push_range', points: pts });
                    } catch (e) { console.error(e); }
                }, 600);
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
                const chosenIdx = Number(data.option_index != null ? data.option_index : msg.option_index) || 0;
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

        // Optional Direct Results Preview Mode (used by deep links with &results=1)
        if (window.__PRAXIS_IOS_SOLO_RESULTS || window.location.search.indexOf('results=1') !== -1) {
            setTimeout(function () {
                if (typeof websocket === 'undefined' || !websocket) return;
                const st = String(window.DEV_STATE || '');
                if (st.indexOf('line_fit') === 0) {
                    websocket.send(JSON.stringify({ action: 'submit_line', data: { slope: 4.6, intercept: 54.5 } }));
                } else if (st.indexOf('closest_guess') === 0) {
                    websocket.send(JSON.stringify({ action: 'submit_guess', data: { guess_min: 65, guess_max: 75 } }));
                } else if (st.indexOf('speed_tap') === 0) {
                    websocket.send(JSON.stringify({ action: 'speed_tap', data: { answer: 'Retention Rate' } }));
                } else if (st.indexOf('minority_rule') === 0) {
                    websocket.send(JSON.stringify({ action: 'minority_rule_submit', data: { option_index: 1 } }));
                } else if (st.indexOf('budget_blitz') === 0) {
                    websocket.send(JSON.stringify({ action: 'budget_blitz_submit', data: { allocation_by_channel_id: { paid_search: 2, creator_reels: 2, retargeting_crm: 1 } } }));
                } else if (st.indexOf('buy_a_clue') === 0) {
                    websocket.send(JSON.stringify({ action: 'buy_a_clue_submit', data: { option_id: 'B' } }));
                } else if (st.indexOf('push_range') === 0) {
                    fetch('dev_data/snapshots/push_range_results_correct.json')
                        .then(function (r) { return r.json(); })
                        .then(function (j) { websocket.simulateMessage(j); });
                } else if (st.indexOf('crowd_wisdom') === 0) {
                    websocket.send(JSON.stringify({ action: 'crowd_wisdom_answer', data: { option_index: 1 } }));
                }
            }, 900);
        }
    }
})();
