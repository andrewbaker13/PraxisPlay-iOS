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
    // 2. Native iOS Dark-Glass Theme & Single-Screen Centered Viewport Layout
    // ─────────────────────────────────────────────────────────────────────────
    function injectIOSStyles() {
        if (document.getElementById('praxis-ios-native-styles')) return;
        const style = document.createElement('style');
        style.id = 'praxis-ios-native-styles';
        style.textContent = `
            :root {
                --ios-bg-top: #090D16;
                --ios-bg-mid: #0F172A;
                --ios-bg-bot: #131C31;
                --ios-card-bg: rgba(21, 31, 52, 0.94);
                --ios-surface: rgba(30, 41, 59, 0.88);
                --ios-surface-elevated: rgba(51, 65, 85, 0.65);
                --ios-surface-deep: rgba(11, 17, 32, 0.88);
                --ios-border: rgba(148, 163, 184, 0.18);
                --ios-border-highlight: rgba(56, 189, 248, 0.45);
                --ios-text-primary: #F8FAFC;
                --ios-text-secondary: #94A3B8;
                --ios-accent-blue: #38BDF8;
                --ios-accent-indigo: #6366F1;
                --ios-accent-emerald: #10B981;
                --ios-accent-amber: #F59E0B;
                --ios-accent-rose: #F43F5E;
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
                background: linear-gradient(180deg, var(--ios-bg-top) 0%, var(--ios-bg-mid) 52%, var(--ios-bg-bot) 100%) !important;
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

            /* Frosted Dark-Slate Main Arena Card */
            .game-area {
                margin-bottom: 0 !important;
                padding: 14px !important;
                border-radius: 22px !important;
                min-height: auto !important;
                background: linear-gradient(180deg, rgba(23, 33, 56, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%) !important;
                border: 1px solid var(--ios-border) !important;
                box-shadow: 0 20px 45px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.09) !important;
                color: var(--ios-text-primary) !important;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
            }

            /* Collapsible Dark-Glass Leaderboard Pill */
            .leaderboard {
                padding: 10px 16px !important;
                border-radius: 16px !important;
                margin-top: 0 !important;
                background: rgba(19, 28, 49, 0.88) !important;
                border: 1px solid var(--ios-border) !important;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35) !important;
                cursor: pointer;
                user-select: none;
            }
            .leaderboard h3 {
                margin: 0 !important;
                font-size: 0.9rem !important;
                font-weight: 700 !important;
                color: #E2E8F0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
            }
            .leaderboard h3::after {
                content: 'Tap to expand ▾';
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--ios-accent-blue);
                background: rgba(56, 189, 248, 0.12);
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
                background: rgba(30, 41, 59, 0.85) !important;
                border: 1px solid rgba(255, 255, 255, 0.07) !important;
                color: var(--ios-text-primary) !important;
                border-radius: 10px !important;
                padding: 8px 12px !important;
                margin-bottom: 6px !important;
            }
            .leaderboard-item.own {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.28) 0%, rgba(5, 150, 105, 0.22) 100%) !important;
                border: 1.5px solid #10B981 !important;
                color: #FFFFFF !important;
            }

            /* Universal Question & Timer Styling */
            .question-display {
                margin-bottom: 10px !important;
            }
            .question-text {
                font-size: 1.06rem !important;
                font-weight: 700 !important;
                line-height: 1.32 !important;
                color: var(--ios-text-primary) !important;
                margin-bottom: 6px !important;
                letter-spacing: -0.01em !important;
            }
            .timer {
                font-size: 1.45rem !important;
                font-weight: 800 !important;
                line-height: 1.1 !important;
                margin: 2px 0 !important;
                color: #FDA4AF !important;
                background: rgba(244, 63, 94, 0.16) !important;
                border: 1.5px solid rgba(244, 63, 94, 0.4) !important;
                padding: 4px 12px !important;
                border-radius: 12px !important;
                display: inline-block !important;
                font-variant-numeric: tabular-nums !important;
            }
            #availablePoints, .available-points {
                font-variant-numeric: tabular-nums !important;
                background: rgba(16, 185, 129, 0.14) !important;
                border: 1px solid rgba(16, 185, 129, 0.35) !important;
                padding: 4px 10px !important;
                border-radius: 10px !important;
                font-size: 1.05rem !important;
            }

            /* Waiting State & Alerts in Dark Glass */
            .waiting-state h2 {
                color: var(--ios-text-primary) !important;
            }
            .waiting-state p {
                color: var(--ios-text-secondary) !important;
            }
            .alert-info {
                background: rgba(56, 189, 248, 0.14) !important;
                border: 1px solid rgba(56, 189, 248, 0.3) !important;
                color: #BAE6FD !important;
            }
            .alert-success {
                background: rgba(16, 185, 129, 0.18) !important;
                border: 1px solid rgba(16, 185, 129, 0.4) !important;
                color: #A7F3D0 !important;
            }
            .alert-error, .alert-danger {
                background: rgba(244, 63, 94, 0.18) !important;
                border: 1px solid rgba(244, 63, 94, 0.4) !important;
                color: #FECDD3 !important;
            }

            /* ── 1. SPEED TAP: 3D Tactile Dark-Glass Answer Cards ── */
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
                color: var(--ios-text-primary) !important;
                background: linear-gradient(180deg, rgba(38, 52, 79, 0.95) 0%, rgba(22, 32, 54, 0.95) 100%) !important;
                border: 1.5px solid rgba(148, 163, 184, 0.25) !important;
                border-radius: 16px !important;
                box-shadow: 0 4px 0 rgba(8, 12, 24, 0.85), 0 8px 16px rgba(0, 0, 0, 0.25) !important;
                transition: transform 0.1s ease, border-color 0.15s ease, background 0.15s ease !important;
            }
            .answer-btn:active:not(:disabled) {
                transform: translateY(3px) scale(0.98) !important;
                box-shadow: 0 1px 0 rgba(8, 12, 24, 0.85) !important;
            }
            .answer-btn.selected, .answer-btn.correct {
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.32) 0%, rgba(5, 150, 105, 0.25) 100%) !important;
                border-color: #10B981 !important;
                color: #FFFFFF !important;
                box-shadow: 0 0 20px rgba(16, 185, 129, 0.3) !important;
            }
            .answer-btn.unselected {
                background: rgba(15, 23, 42, 0.6) !important;
                border-color: rgba(148, 163, 184, 0.12) !important;
                color: #64748B !important;
                opacity: 0.55 !important;
                box-shadow: none !important;
            }

            /* ── 2. BUDGET BLITZ: 3-Column Dark-Slate Optimizer ── */
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
                background: var(--ios-surface) !important;
                border: 1px solid var(--ios-border) !important;
                color: var(--ios-text-primary) !important;
                border-radius: 14px !important;
            }
            .bb-remaining {
                font-size: 1.05rem !important;
                padding: 6px 10px !important;
                flex-shrink: 0 !important;
                line-height: 1.1 !important;
                background: rgba(56, 189, 248, 0.14) !important;
                border: 1.5px solid rgba(56, 189, 248, 0.38) !important;
                color: #38BDF8 !important;
                border-radius: 14px !important;
                font-variant-numeric: tabular-nums !important;
            }
            .bb-remaining small {
                color: #94A3B8 !important;
            }
            .bb-channels {
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                gap: 7px !important;
                margin-bottom: 10px !important;
            }
            .bb-channel {
                padding: 9px 6px !important;
                background: var(--ios-surface) !important;
                border: 1.5px solid var(--ios-border) !important;
                border-radius: 15px !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
            }
            .bb-channel.bb-has-tokens {
                border-color: #38BDF8 !important;
                background: linear-gradient(180deg, rgba(14, 165, 233, 0.22) 0%, rgba(30, 41, 59, 0.92) 100%) !important;
                box-shadow: 0 0 18px rgba(56, 189, 248, 0.2) !important;
            }
            .bb-channel-name {
                font-size: 0.76rem !important;
                line-height: 1.15 !important;
                min-height: 2.25em !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin-bottom: 2px !important;
                color: #F1F5F9 !important;
            }
            .bb-channel-tokens {
                font-size: 1.7rem !important;
                color: #38BDF8 !important;
                font-variant-numeric: tabular-nums !important;
            }
            .bb-channel-stats {
                font-size: 0.68rem !important;
                margin: 4px 0 6px 0 !important;
                line-height: 1.2 !important;
                color: #94A3B8 !important;
            }
            .bb-channel-stats strong {
                color: #E2E8F0 !important;
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
                background: rgba(51, 65, 85, 0.9) !important;
                color: #F8FAFC !important;
                border: 1px solid rgba(255, 255, 255, 0.14) !important;
            }
            .bb-plus {
                background: linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%) !important;
                color: #FFFFFF !important;
                box-shadow: 0 3px 10px rgba(37, 99, 235, 0.35) !important;
            }
            .bb-outcome {
                padding: 8px 12px !important;
                font-size: 0.95rem !important;
                margin-bottom: 7px !important;
                background: var(--ios-surface-deep) !important;
                border: 1px solid var(--ios-border) !important;
                color: #E2E8F0 !important;
                border-radius: 12px !important;
            }
            .bb-outcome strong {
                color: #34D399 !important;
                font-size: 1.08rem !important;
            }
            .bb-table {
                padding: 6px 12px !important;
                margin-bottom: 9px !important;
                font-size: 0.8rem !important;
                background: var(--ios-surface-deep) !important;
                border: 1px solid var(--ios-border) !important;
                color: #CBD5E1 !important;
                border-radius: 12px !important;
            }
            .bb-table th, .bb-table td {
                border-bottom: 1px solid rgba(148, 163, 184, 0.15) !important;
                color: #E2E8F0 !important;
            }
            .bb-lock {
                padding: 13px !important;
                font-size: 1rem !important;
                border-radius: 14px !important;
                background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
                box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35) !important;
            }
            .bb-lock:disabled {
                background: rgba(51, 65, 85, 0.75) !important;
                color: #94A3B8 !important;
                box-shadow: none !important;
            }

            /* ── 3. MINORITY RULE: Dark-Glass Blue Ocean Cards ── */
            .mr-area {
                padding: 2px !important;
            }
            .mr-area > div:first-child {
                margin-bottom: 8px !important;
            }
            .mr-area > div:nth-child(2) {
                padding: 11px 14px !important;
                margin-bottom: 10px !important;
                background: var(--ios-surface) !important;
                border: 1px solid rgba(56, 189, 248, 0.3) !important;
                border-top: 3px solid #38BDF8 !important;
                border-radius: 16px !important;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25) !important;
            }
            .mr-area > div:nth-child(2) > div {
                font-size: 0.95rem !important;
                line-height: 1.32 !important;
                color: var(--ios-text-primary) !important;
            }
            .mr-option-card {
                padding: 10px 12px !important;
                margin-bottom: 7px !important;
                border-radius: 14px !important;
                gap: 10px !important;
                background: linear-gradient(180deg, rgba(34, 47, 73, 0.92) 0%, rgba(22, 32, 54, 0.92) 100%) !important;
                border: 1.5px solid rgba(148, 163, 184, 0.22) !important;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.22) !important;
            }
            .mr-option-card .mr-badge {
                width: 30px !important;
                height: 30px !important;
                font-size: 14px !important;
                background: rgba(15, 23, 42, 0.85) !important;
                color: #38BDF8 !important;
                border: 1px solid rgba(56, 189, 248, 0.35) !important;
            }
            .mr-option-card > div:nth-child(2) {
                font-size: 0.91rem !important;
                line-height: 1.25 !important;
                color: var(--ios-text-primary) !important;
            }
            .mr-option-card.selected {
                border-color: #38BDF8 !important;
                background: linear-gradient(135deg, rgba(14, 165, 233, 0.25), rgba(37, 99, 235, 0.25)) !important;
                box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.35), 0 6px 18px rgba(14, 165, 233, 0.25) !important;
            }
            #mrActionContainer {
                margin-top: 10px !important;
            }
            #mrSubmitBtn {
                padding: 13px !important;
                font-size: 1rem !important;
                border-radius: 14px !important;
            }

            /* ── 4. BUY A CLUE: Dark-Glass VoI Decision Cards ── */
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
                background: var(--ios-surface) !important;
                border: 1px solid var(--ios-border) !important;
                color: var(--ios-text-primary) !important;
                border-radius: 14px !important;
            }
            .bac-rules {
                padding: 7px 10px !important;
                margin-bottom: 8px !important;
                font-size: 0.8rem !important;
                background: var(--ios-surface-deep) !important;
                border: 1px solid var(--ios-border) !important;
                color: #CBD5E1 !important;
                border-radius: 12px !important;
            }
            .bac-rules strong {
                color: #38BDF8 !important;
            }
            .bac-rules-note {
                color: #94A3B8 !important;
            }
            .bac-clue {
                padding: 9px 12px !important;
                margin-bottom: 8px !important;
                font-size: 0.88rem !important;
                background: rgba(250, 204, 21, 0.14) !important;
                border: 1.5px solid #FACC15 !important;
                color: #FEF08A !important;
                border-radius: 12px !important;
            }
            .bac-options {
                gap: 7px !important;
                margin-bottom: 9px !important;
            }
            .bac-option {
                padding: 11px 13px !important;
                font-size: 0.92rem !important;
                background: linear-gradient(180deg, rgba(34, 47, 73, 0.92) 0%, rgba(22, 32, 54, 0.92) 100%) !important;
                border: 1.5px solid rgba(148, 163, 184, 0.22) !important;
                color: var(--ios-text-primary) !important;
                border-radius: 14px !important;
                transition: transform 0.08s ease, border-color 0.15s ease !important;
            }
            .bac-option:active:not(:disabled) {
                transform: scale(0.985) !important;
            }
            .bac-option.bac-selected {
                border-color: #38BDF8 !important;
                background: linear-gradient(135deg, rgba(14, 165, 233, 0.26) 0%, rgba(37, 99, 235, 0.24) 100%) !important;
                color: #FFFFFF !important;
                box-shadow: 0 0 16px rgba(56, 189, 248, 0.25) !important;
            }
            .bac-actions {
                grid-template-columns: 1fr 1fr !important;
                gap: 8px !important;
            }
            .bac-buy {
                padding: 11px 8px !important;
                font-size: 0.88rem !important;
                background: rgba(245, 158, 11, 0.14) !important;
                border: 1.5px solid rgba(245, 158, 11, 0.55) !important;
                color: #FCD34D !important;
                border-radius: 14px !important;
            }
            .bac-lock {
                padding: 11px 8px !important;
                font-size: 0.92rem !important;
                border-radius: 14px !important;
                background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
            }
            .bac-lock:disabled {
                background: rgba(51, 65, 85, 0.75) !important;
                color: #94A3B8 !important;
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
                color: #94A3B8 !important;
                font-size: 0.74rem !important;
                text-transform: uppercase !important;
                letter-spacing: 0.06em !important;
                margin-bottom: 4px !important;
            }
            .range-input-group input[type="number"] {
                padding: 8px !important;
                font-size: 1.3rem !important;
                font-weight: 800 !important;
                background: var(--ios-surface-deep) !important;
                border: 1.5px solid rgba(56, 189, 248, 0.4) !important;
                color: #F8FAFC !important;
                border-radius: 12px !important;
                font-variant-numeric: tabular-nums !important;
            }
            .range-separator {
                font-size: 1.2rem !important;
                color: #64748B !important;
                font-weight: 700 !important;
            }
            /* Custom iOS Tactile Stepper & Slider Controls */
            .ios-cg-touch-deck {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin: 6px 0 8px 0;
            }
            .ios-cg-col {
                background: rgba(15, 23, 42, 0.65);
                border: 1px solid rgba(148, 163, 184, 0.16);
                border-radius: 12px;
                padding: 7px 8px;
            }
            .ios-cg-slider {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 6px;
                border-radius: 999px;
                background: rgba(51, 65, 85, 0.9);
                outline: none;
                margin: 4px 0 8px 0;
            }
            .ios-cg-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: #38BDF8;
                border: 2.5px solid #FFFFFF;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
                cursor: pointer;
            }
            .ios-cg-steppers {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 4px;
            }
            .ios-cg-step-btn {
                background: rgba(30, 41, 59, 0.95);
                border: 1px solid rgba(148, 163, 184, 0.25);
                color: #E2E8F0;
                font-size: 0.74rem;
                font-weight: 700;
                padding: 5px 0;
                border-radius: 8px;
                cursor: pointer;
                text-align: center;
                user-select: none;
            }
            .ios-cg-step-btn:active {
                transform: scale(0.92);
                background: rgba(56, 189, 248, 0.25);
                border-color: #38BDF8;
            }
            .closest-guess-preview-card {
                margin: 6px auto !important;
                padding: 8px 12px !important;
                background: var(--ios-surface-deep) !important;
                border: 1px solid var(--ios-border) !important;
                border-radius: 12px !important;
            }
            #bracketWidthLabel {
                color: #E2E8F0 !important;
            }
            #bracketBadge {
                background: rgba(56, 189, 248, 0.16) !important;
                border: 1px solid rgba(56, 189, 248, 0.38) !important;
                color: #7DD3FC !important;
            }
            .submit-guess-btn {
                padding: 12px !important;
                font-size: 1.02rem !important;
                font-weight: 800 !important;
                margin-top: 6px !important;
                border-radius: 14px !important;
                box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35) !important;
            }
            .numberline-container {
                margin: 8px 0 2px 0 !important;
                padding: 10px !important;
                background: var(--ios-surface-deep) !important;
                border: 1px solid var(--ios-border) !important;
                border-radius: 14px !important;
            }
            .numberline-title {
                font-size: 0.72rem !important;
                color: #94A3B8 !important;
                margin-bottom: 6px !important;
            }
            .numberline {
                height: 64px !important;
                margin: 6px 0 !important;
            }
            .numberline-axis {
                background: rgba(148, 163, 184, 0.35) !important;
            }
            .range-box {
                height: 52px !important;
                background: rgba(56, 189, 248, 0.22) !important;
                border: 1px solid rgba(56, 189, 248, 0.4) !important;
            }
            .range-box.own {
                background: rgba(16, 185, 129, 0.32) !important;
                border: 1.5px solid #10B981 !important;
            }
            .numberline-labels,
            .numberline-labels span,
            .numberline-labels div,
            #numberlineMin,
            #numberlineMax {
                color: #CBD5E1 !important;
                font-size: 0.82rem !important;
            }

            /* ── 6. CROWD WISDOM: Dark-Glass Live Distribution Bars ── */
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
                background: var(--ios-surface) !important;
                border: 1px solid var(--ios-border) !important;
                border-radius: 14px !important;
            }
            .distribution-row.unanswered-row {
                background: rgba(244, 63, 94, 0.12) !important;
                border: 1px solid rgba(244, 63, 94, 0.3) !important;
            }
            .distribution-label {
                width: 130px !important;
                font-size: 0.82rem !important;
                color: #FDA4AF !important;
            }
            .crowd-wisdom-btn {
                width: 130px !important;
                padding: 9px 10px !important;
                font-size: 0.85rem !important;
                font-weight: 700 !important;
                background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(11, 17, 32, 0.95) 100%) !important;
                border: 1.5px solid #38BDF8 !important;
                color: #F8FAFC !important;
                border-radius: 10px !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
            }
            .crowd-wisdom-btn.selected {
                background: linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%) !important;
                border-color: #7DD3FC !important;
                color: #FFFFFF !important;
            }
            .distribution-bar-wrapper {
                background: rgba(11, 17, 32, 0.85) !important;
                height: 20px !important;
                border-radius: 10px !important;
                border: 1px solid rgba(255, 255, 255, 0.06) !important;
            }
            .distribution-percent {
                color: #E2E8F0 !important;
                font-size: 0.85rem !important;
                font-variant-numeric: tabular-nums !important;
            }

            /* ── 7. PUSH RANGE: Dark-Glass Team Tug-of-War ── */
            .push-range-area {
                padding: 2px !important;
            }
            .push-range-visualization {
                margin: 8px 0 !important;
                padding: 10px !important;
                background: var(--ios-surface-deep) !important;
                border: 1px solid var(--ios-border) !important;
                border-radius: 16px !important;
            }
            .push-range-bar {
                height: 40px !important;
                background: rgba(254, 243, 199, 0.12) !important;
                border: 1.5px solid rgba(251, 191, 36, 0.35) !important;
                border-radius: 10px !important;
            }
            .guess-range-bracket {
                height: 46px !important;
                margin-left: 18px !important;
                margin-right: 18px !important;
            }
            .bracket-left-edge, .bracket-right-edge,
            .bracket-bottom::before, .bracket-bottom::after {
                background: #64748B !important;
            }
            .bracket-left-edge .edge-value {
                font-size: 1.1rem !important;
                top: -26px !important;
                color: #60A5FA !important;
            }
            .bracket-right-edge .edge-value {
                font-size: 1.1rem !important;
                top: -26px !important;
                color: #F87171 !important;
            }
            .bracket-label {
                background: #1E293B !important;
                border: 1px solid rgba(148, 163, 184, 0.25) !important;
                padding: 3px 10px !important;
            }
            .range-label {
                color: #CBD5E1 !important;
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
                background: var(--ios-surface-deep) !important;
                border-width: 1.5px !important;
                border-radius: 14px !important;
            }
            .team-panel.left {
                border-color: rgba(59, 130, 246, 0.5) !important;
            }
            .team-panel.right {
                border-color: rgba(239, 68, 68, 0.5) !important;
            }
            .team-panel h4 {
                font-size: 0.85rem !important;
                margin-bottom: 6px !important;
            }
            .team-member {
                background: rgba(30, 41, 59, 0.8) !important;
                color: #E2E8F0 !important;
                font-size: 0.82rem !important;
                padding: 5px 8px !important;
            }

            /* ── 8. WORD GUESS: Dark-Glass Tiles + Built-in Tactile QWERTY Pad ── */
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
                background: var(--ios-surface-deep) !important;
                border: 1.5px solid #38BDF8 !important;
                border-radius: 8px !important;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
                font-size: 18px !important;
            }
            .player-letter {
                color: #F8FAFC !important;
                font-weight: 800 !important;
            }
            .revealed-letter {
                color: #38BDF8 !important;
                font-weight: 800 !important;
            }
            .word-guess-input-area {
                display: none !important; /* Replaced by native-style on-screen QWERTY tile pad */
            }
            .ios-wg-keyboard {
                margin-top: 10px;
                padding: 0 2px;
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
                background: linear-gradient(180deg, rgba(51, 65, 85, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);
                border: 1px solid rgba(148, 163, 184, 0.28);
                box-shadow: 0 2px 0 rgba(2, 6, 23, 0.9);
                color: #F8FAFC;
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
                border-color: #34D399;
                color: #FFFFFF;
            }
            .ios-wg-key.ios-wg-go.disabled {
                background: rgba(51, 65, 85, 0.5);
                border-color: rgba(148, 163, 184, 0.15);
                color: #64748B;
            }
            .ios-wg-key:active {
                transform: translateY(2px) scale(0.94);
                background: #38BDF8;
                color: #0F172A;
            }

            /* ── 9. LINE FIT: Dark-Slate Analytics Chart & Live Drag Controls ── */
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
                background: #0B1120 !important;
                border: 1.5px solid rgba(56, 189, 248, 0.35) !important;
                border-radius: 14px !important;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45) !important;
            }
            #lineStats {
                padding: 6px 10px !important;
                margin-bottom: 6px !important;
                background: rgba(14, 165, 233, 0.14) !important;
                border: 1.5px solid rgba(56, 189, 248, 0.4) !important;
                border-radius: 12px !important;
            }
            #lineStats > div:first-child {
                color: #BAE6FD !important;
                font-size: 0.78rem !important;
                text-transform: uppercase !important;
                letter-spacing: 0.05em !important;
            }
            #lineEquation {
                font-size: 0.92rem !important;
                color: #38BDF8 !important;
            }
            #lineCorrelation {
                font-size: 0.82rem !important;
                color: #A78BFA !important;
            }
            .canvas-instructions {
                margin-top: 6px !important;
                padding: 7px 10px !important;
                font-size: 0.88rem !important;
                background: rgba(15, 23, 42, 0.85) !important;
                border: 1px solid rgba(56, 189, 248, 0.35) !important;
                color: #38BDF8 !important;
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
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    onReady(injectIOSStyles);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Global Touch Haptics & iOS Virtual Keyboard Scroll Snap-Back
    // ─────────────────────────────────────────────────────────────────────────
    document.addEventListener('touchstart', function (e) {
        const target = e.target && e.target.closest
            ? e.target.closest('.answer-btn, .crowd-wisdom-btn, .push-button, .bb-btn, .bac-option, .mr-option-card, .buzzer-btn, #confirmBtn, #redrawBtn, #bbLockBtn, #bacLockBtn, #bacBuyBtn, #mrSubmitBtn, .submit-guess-btn, .submit-word-btn, .ios-cg-step-btn, .ios-wg-key')
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
    // 4. Interactive Touch Upgrades for Line Fit, Closest Guess & Word Guess
    // ─────────────────────────────────────────────────────────────────────────
    function installIOSTouchEnhancements() {
        const gameArea = document.getElementById('gameArea');
        if (!gameArea) return;

        const enhanceCurrentGameDOM = function () {
            enhanceLineFitTouchAndTheme();
            enhanceClosestGuessTouchControls();
            enhanceWordGuessTouchKeyboard();
        };

        const domObserver = new MutationObserver(function () {
            enhanceCurrentGameDOM();
        });
        domObserver.observe(gameArea, { childList: true, subtree: true });
        enhanceCurrentGameDOM();
    }

    // 4A. Line Fit: Dark-Slate Analytics Renderer + 60fps Live Touch-Drag
    function enhanceLineFitTouchAndTheme() {
        const canvas = document.getElementById('scatterCanvas');
        if (!canvas || canvas.__iosLineFitEnhanced) return;
        canvas.__iosLineFitEnhanced = true;

        // Upgrade global drawScatterPlot to render a crisp Dark-Slate Analytics Chart
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

            // Dark-slate background
            ctx.fillStyle = '#0B1120';
            ctx.fillRect(0, 0, cvs.width, cvs.height);

            const plotWidth = cvs.width - margins.left - margins.right;
            const plotHeight = cvs.height - margins.top - margins.bottom;
            const plotLeft = margins.left;
            const plotTop = margins.top;

            // Subtle coordinate gridlines
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
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
            ctx.strokeStyle = '#64748B';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(plotLeft, plotTop + plotHeight);
            ctx.lineTo(plotLeft + plotWidth, plotTop + plotHeight);
            ctx.moveTo(plotLeft, plotTop);
            ctx.lineTo(plotLeft, plotTop + plotHeight);
            ctx.stroke();

            // Axis Titles
            ctx.fillStyle = '#E2E8F0';
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
            ctx.fillStyle = '#94A3B8';
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
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
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
                            ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
                        } else if (residual < 5.0) {
                            ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
                        } else {
                            ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
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
                ctx.shadowColor = 'rgba(34, 211, 238, 0.6)';
                ctx.shadowBlur = 10;
                ctx.strokeStyle = '#22D3EE';
                ctx.lineWidth = 3.5;
                drawLine(lineFitState.proposedLine.slope, lineFitState.proposedLine.intercept);
                ctx.restore();
            }

            // Glowing Scatter Points
            if (lineFitState.scatterData && lineFitState.scatterData.points) {
                lineFitState.scatterData.points.forEach(function (pt) {
                    const c = dataToCanvas(pt.x, pt.y);
                    ctx.save();
                    ctx.fillStyle = '#0B1120';
                    ctx.strokeStyle = '#38BDF8';
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
                ctx.fillStyle = 'rgba(34, 211, 238, 0.22)';
                ctx.beginPath();
                ctx.arc(c.x, c.y, 18, 0, 2 * Math.PI);
                ctx.fill();

                ctx.fillStyle = '#22D3EE';
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

        // Ensure scatter data is loaded immediately if config already has points,
        // and seed an initial draggable 2-handle line so touch affordance is immediate
        setTimeout(function () {
            if (typeof lineFitState !== 'undefined' && !lineFitState.scatterData && lineFitState.config && lineFitState.config.points) {
                handleLineFitData({
                    type: 'line_fit_data',
                    points: JSON.parse(JSON.stringify(lineFitState.config.points)),
                    x_bounds: [lineFitState.config.x_min, lineFitState.config.x_max],
                    y_bounds: [lineFitState.config.y_min, lineFitState.config.y_max],
                    axis_labels: { x: lineFitState.config.x_label, y: lineFitState.config.y_label }
                });
            }
            if (typeof lineFitState !== 'undefined' && lineFitState.config && lineFitState.scatterData && !lineFitState.point1) {
                const cfg = lineFitState.config;
                const xSpan = cfg.x_max - cfg.x_min;
                const ySpan = cfg.y_max - cfg.y_min;
                lineFitState.point1 = {
                    x: Number((cfg.x_min + xSpan * 0.18).toFixed(2)),
                    y: Number((cfg.y_min + ySpan * 0.30).toFixed(2))
                };
                lineFitState.point2 = {
                    x: Number((cfg.x_min + xSpan * 0.84).toFixed(2)),
                    y: Number((cfg.y_min + ySpan * 0.78).toFixed(2))
                };
                lineFitState.mode = 'proposed';
                if (typeof calculateLineFromPoints === 'function') calculateLineFromPoints();
                const confirmBtn = document.getElementById('confirmBtn');
                const redrawBtn = document.getElementById('redrawBtn');
                if (confirmBtn) confirmBtn.disabled = false;
                if (redrawBtn) redrawBtn.disabled = false;
                window.drawScatterPlot();
            }
            const inst = document.getElementById('canvasInstructions');
            if (inst && typeof lineFitState !== 'undefined') {
                inst.innerHTML = '👆 Drag either cyan handle to fit the line, then Confirm';
                inst.style.color = '#38BDF8';
            }
        }, 120);

        // Live 60fps Touch-Drag Handler
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

        canvas.addEventListener('touchstart', function (e) {
            if (typeof lineFitState === 'undefined' || lineFitState.mode === 'confirmed') return;
            e.preventDefault();
            e.stopPropagation();

            const raw = getCanvasCoordinates(e);
            if (!raw) return;
            const dataPt = clampDataPoint(canvasToData(raw.x, raw.y));

            isDragging = true;
            postToNative({ type: 'haptic', pattern: [18] });

            if (lineFitState.mode === 'proposed' && lineFitState.point1 && lineFitState.point2) {
                // Grab whichever endpoint is closer to the touch
                const c1 = dataToCanvas(lineFitState.point1.x, lineFitState.point1.y);
                const c2 = dataToCanvas(lineFitState.point2.x, lineFitState.point2.y);
                const d1 = Math.hypot(raw.x - c1.x, raw.y - c1.y);
                const d2 = Math.hypot(raw.x - c2.x, raw.y - c2.y);
                if (d1 < d2) {
                    // Swap so point1 is the fixed anchor and point2 tracks the finger
                    lineFitState.point1 = lineFitState.point2;
                }
                lineFitState.point2 = dataPt;
                calculateLineFromPoints();
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
        }, { capture: true, passive: false });

        canvas.addEventListener('touchmove', function (e) {
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
        }, { capture: true, passive: false });

        canvas.addEventListener('touchend', function (e) {
            if (typeof lineFitState === 'undefined' || lineFitState.mode === 'confirmed') return;
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
        }, { capture: true, passive: false });
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

            if (action === 'identify' || action === 'speed_tap') {
                return originalSend.call(this, rawData);
            }

            if (action === 'line_fit_propose' || action === 'line_fit_redraw') {
                return;
            }

            // Closest Guess submission in Solo Mode
            if (action === 'submit_guess' || action === 'submit_range' || action === 'closest_guess' || action === 'timer_expired') {
                if (action !== 'timer_expired') {
                    this.simulateMessage({
                        type: 'guess_submitted',
                        guess_min: data.guess_min,
                        guess_max: data.guess_max,
                        submission_order: 1
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
            if (action === 'crowd_wisdom' || action === 'crowd_wisdom_answer' || action === 'submit_answer') {
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
                    answer: data.guess || 'MARKETING MIX'
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
    }
})();
