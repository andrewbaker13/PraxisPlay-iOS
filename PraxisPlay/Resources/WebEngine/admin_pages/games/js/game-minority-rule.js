/**
 * Minority Rule — "Escape the Crowd" / Blue Ocean Niche Strategy
 *
 * Core Marketing Concept:
 * When competitors crowd into the exact same market space, fierce price wars
 * and commoditization destroy margins. The winning strategists find and serve
 * viable, underserved niches — the Minority!
 */

let minorityRuleState = {
    options: [],
    selectedOptionIndex: null,
    isSubmitted: false,
    basePoints: 100,
    takeaway: '',
};

function mrEscapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showMinorityRuleGame(message, timeLimit) {
    console.log('[MINORITY RULE] Initializing round:', message);

    const config = message.game_config || {};
    let options = message.options || config.options || [];

    // Standardize options
    if (!options.length) {
        options = [
            { id: 0, text: 'Niche Segment A' },
            { id: 1, text: 'Niche Segment B' },
            { id: 2, text: 'Niche Segment C' },
            { id: 3, text: 'Niche Segment D' },
        ];
    }

    minorityRuleState = {
        options: options.map((opt, idx) => ({
            id: opt.id != null ? opt.id : idx,
            text: typeof opt === 'string' ? opt : (opt.text || `Option ${idx + 1}`)
        })),
        selectedOptionIndex: null,
        isSubmitted: false,
        basePoints: config.base_points != null ? config.base_points : (message.base_points || 100),
        takeaway: config.takeaway || message.takeaway || '',
    };

    window.isRoundEnded = false;
    if (typeof clearSuspenseShimmer === 'function') clearSuspenseShimmer();
    if (typeof clearTimerUrgency === 'function') clearTimerUrgency();

    const imageHTML = typeof renderQuestionImageHTML === 'function'
        ? renderQuestionImageHTML(message.image_url)
        : (message.image_url ? `<img src="${message.image_url}" alt="Scenario image" style="max-width: ${window.isProjectorMode ? '90%' : '100%'}; max-height: ${window.isProjectorMode ? '48vh' : '26vh'}; margin: 12px auto; border-radius: 12px; display: block; object-fit: contain; background: white; padding: 8px;">` : '');

    // ─────────────────────────────────────────────────────────────
    // PROJECTOR VIEW
    // ─────────────────────────────────────────────────────────────
    if (window.isProjectorMode) {
        const optionCards = minorityRuleState.options.map((opt, index) => `
            <div class="mr-projector-card" style="background: white; border: 3px solid #e2e8f0; border-radius: 16px; padding: 22px 26px; display: flex; align-items: center; gap: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); transition: transform 0.2s;">
                <div style="width: 50px; height: 50px; border-radius: 14px; background: linear-gradient(135deg, #0ea5e9, #2563eb); color: white; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; flex-shrink: 0; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
                    ${String.fromCharCode(65 + index)}
                </div>
                <div style="font-size: 26px; font-weight: 700; color: #1e293b; text-align: left; line-height: 1.35; flex: 1;">
                    ${mrEscapeHtml(opt.text)}
                </div>
            </div>
        `).join('');

        document.getElementById('gameArea').innerHTML = `
            <div class="mr-area" style="max-width: 1400px; padding: 2rem; margin: 0 auto;">
                <div style="display: flex; justify-content: center; align-items: center; gap: 24px; margin-bottom: 24px;">
                    <div class="timer" id="timer" style="font-size: 76px; font-weight: 800; color: #ef4444; background: white; border-radius: 16px; padding: 16px 36px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); min-width: 130px; text-align: center;">${Math.ceil(timeLimit)}</div>
                    <div style="flex: 1; font-size: 34px; font-weight: 800; color: #0f172a; background: white; border-radius: 16px; padding: 22px 36px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); text-align: center; border-left: 6px solid #0ea5e9;">
                        <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: #0284c7; letter-spacing: 0.1em; margin-bottom: 4px;">🐺 Blue Ocean Niche Strategy</div>
                        ${mrEscapeHtml(message.question_text || '')}
                    </div>
                </div>

                ${imageHTML}

                <div style="background: linear-gradient(135deg, rgba(14,165,233,0.08), rgba(99,102,241,0.08)); border: 1.5px solid rgba(14,165,233,0.3); border-radius: 16px; padding: 14px 24px; margin-bottom: 24px; display: flex; justify-content: space-around; align-items: center; font-size: 20px; font-weight: 600; color: #334155;">
                    <div>🎯 <strong style="color: #0369a1;">Goal:</strong> Escape the crowded majority and choose the viable niche!</div>
                    <div style="color: #cbd5e1;">•</div>
                    <div>🏆 <strong style="color: #059669;">Reward:</strong> Fewest competitors = Maximum margins & bonus points!</div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(${minorityRuleState.options.length > 2 ? '2' : '1'}, 1fr); gap: 20px; margin-bottom: 28px;">
                    ${optionCards}
                </div>

                <div id="mrParticipation" style="text-align: center; background: white; padding: 22px 32px; border-radius: 18px; box-shadow: 0 8px 30px rgba(0,0,0,0.08);">
                    <div style="font-size: 26px; font-weight: 800; color: #64748b; margin-bottom: 8px;">
                        Waiting for market strategists to commit positions…
                    </div>
                    <div id="mrProgressPct" style="font-size: 40px; font-weight: 900; color: #0f172a; margin-bottom: 12px;">0%</div>
                    <div style="background: #e2e8f0; height: 14px; border-radius: 999px; overflow: hidden; max-width: 600px; margin: 0 auto;">
                        <div id="mrProgressFill" style="background: linear-gradient(90deg, #0ea5e9, #10b981); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            </div>
        `;

        setupMinorityRuleTimer(timeLimit);
        return;
    }

    // ─────────────────────────────────────────────────────────────
    // STUDENT VIEW
    // ─────────────────────────────────────────────────────────────
    const optionCardsHTML = minorityRuleState.options.map((opt, index) => `
        <div class="mr-option-card" id="mrOption${index}" onclick="selectMinorityOption(${index})" style="background: white; border: 2.5px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; margin-bottom: 12px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <div class="mr-badge" style="width: 38px; height: 38px; border-radius: 10px; background: #f1f5f9; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; flex-shrink: 0; transition: all 0.2s ease;">
                ${String.fromCharCode(65 + index)}
            </div>
            <div style="flex: 1; font-size: 1.05rem; font-weight: 700; color: #1e293b; line-height: 1.35;">
                ${mrEscapeHtml(opt.text)}
            </div>
            <div class="mr-check" style="font-size: 20px; opacity: 0; transform: scale(0.5); transition: all 0.2s ease;">
                ✓
            </div>
        </div>
    `).join('');

    document.getElementById('gameArea').innerHTML = `
        <div class="mr-area" style="max-width: 640px; margin: 0 auto; padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 22px;">🐺</span>
                    <span style="font-size: 0.85rem; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(14,165,233,0.1); padding: 4px 10px; border-radius: 999px;">
                        Blue Ocean Niche
                    </span>
                </div>
                <div class="timer" id="timer" style="font-size: 2rem; font-weight: 800; color: #ef4444; background: white; padding: 4px 14px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">${Math.ceil(timeLimit)}</div>
            </div>

            <div style="background: white; border-radius: 16px; padding: 18px 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); margin-bottom: 16px; border-top: 4px solid #0ea5e9;">
                <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; line-height: 1.4; text-align: left;">
                    ${mrEscapeHtml(message.question_text || '')}
                </div>
                ${imageHTML}
            </div>

            <div style="font-size: 0.85rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; padding-left: 4px;">
                Select your market position:
            </div>

            <div id="mrOptionsContainer">
                ${optionCardsHTML}
            </div>

            <div id="mrActionContainer" style="margin-top: 16px;">
                <button id="mrSubmitBtn" onclick="submitSelectedMinorityOption()" disabled style="width: 100%; background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); color: white; border: none; border-radius: 14px; padding: 16px; font-size: 1.15rem; font-weight: 800; cursor: pointer; box-shadow: 0 4px 14px rgba(37,99,235,0.3); opacity: 0.5; transition: all 0.2s ease;">
                    Select an Option Above
                </button>
            </div>

            <div id="feedback" style="margin-top: 16px; min-height: 36px; text-align: center;"></div>
        </div>

        <style>
            .mr-option-card.selected {
                border-color: #0ea5e9 !important;
                background: linear-gradient(135deg, rgba(14,165,233,0.06), rgba(37,99,235,0.06)) !important;
                box-shadow: 0 0 0 2px rgba(14,165,233,0.4), 0 4px 14px rgba(14,165,233,0.15) !important;
                transform: translateY(-2px);
            }
            .mr-option-card.selected .mr-badge {
                background: #0ea5e9 !important;
                color: white !important;
                box-shadow: 0 2px 8px rgba(14,165,233,0.35);
            }
            .mr-option-card.selected .mr-check {
                opacity: 1 !important;
                transform: scale(1) !important;
                color: #0ea5e9;
                font-weight: 800;
            }
            .mr-option-card.locked {
                cursor: not-allowed !important;
            }
        </style>
    `;

    // Check if player reconnecting already answered
    if (message.accepted_state && message.accepted_state.submitted) {
        const lockedIdx = message.accepted_state.option_index;
        if (lockedIdx != null) {
            selectMinorityOption(lockedIdx);
            markMinorityRuleLocked(lockedIdx);
        }
    }

    setupMinorityRuleTimer(timeLimit);
}

function selectMinorityOption(index) {
    if (minorityRuleState.isSubmitted) return;

    minorityRuleState.selectedOptionIndex = index;

    document.querySelectorAll('.mr-option-card').forEach((card, idx) => {
        if (idx === index) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    const submitBtn = document.getElementById('mrSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.textContent = '🔒 Lock In Market Position';
    }
}

function submitSelectedMinorityOption() {
    if (minorityRuleState.isSubmitted) return;
    if (minorityRuleState.selectedOptionIndex == null) return;

    const chosenIdx = minorityRuleState.selectedOptionIndex;
    minorityRuleState.isSubmitted = true;

    if (typeof triggerHapticAlert === 'function') {
        triggerHapticAlert(35);
    }

    // Send payload over WebSocket (via sendGameAction / global websocket)
    if (typeof sendGameAction === 'function') {
        sendGameAction('minority_rule_submit', {
            option_index: chosenIdx,
            round_instance_id: window.currentRoundInstanceId || null
        });
    } else if (typeof websocket !== 'undefined' && websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            action: 'minority_rule_submit',
            option_index: chosenIdx,
            round_instance_id: window.currentRoundInstanceId || null,
            player_session_id: (typeof playerSession !== 'undefined' && playerSession.id) || 999
        }));
    }

    markMinorityRuleLocked(chosenIdx);
}

function markMinorityRuleLocked(chosenIdx) {
    minorityRuleState.isSubmitted = true;

    document.querySelectorAll('.mr-option-card').forEach((card, idx) => {
        card.classList.add('locked');
        if (idx !== chosenIdx) {
            card.style.opacity = '0.45';
        }
    });

    const actionContainer = document.getElementById('mrActionContainer');
    if (actionContainer) {
        actionContainer.innerHTML = `
            <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 2px solid #10b981; border-radius: 14px; padding: 14px 18px; text-align: center; box-shadow: 0 4px 14px rgba(16,185,129,0.15); animation: pulse 2s infinite ease-in-out;">
                <div style="font-size: 1.1rem; font-weight: 800; color: #065f46; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span>🔒</span>
                    <span>Strategy Locked! Awaiting Room Reveal…</span>
                </div>
                <div style="font-size: 0.85rem; color: #047857; margin-top: 4px; font-weight: 600;">
                    Uncrowded niches capture maximum margins. Good luck!
                </div>
            </div>
        `;
    }
}

function handleMinorityRuleAccepted(message) {
    console.log('[MINORITY RULE] Submission accepted by server:', message);
    if (message.option_index != null) {
        markMinorityRuleLocked(message.option_index);
    }
}

function setupMinorityRuleTimer(timeLimit) {
    if (typeof timerInterval !== 'undefined' && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    const timerEl = document.getElementById('timer');
    const endTime = Date.now() + (timeLimit * 1000);

    function tick() {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        if (timerEl) {
            timerEl.textContent = remaining;
            if (remaining <= 5 && remaining > 0) {
                timerEl.style.color = '#ef4444';
                timerEl.classList.add(remaining <= 2 ? 'timer-beat-critical' : 'timer-beat');
                document.body.classList.add(remaining <= 2 ? 'timer-urgency-critical' : 'timer-urgency');
                if (navigator.vibrate && remaining <= 3) {
                    try { navigator.vibrate(remaining === 1 ? [40, 40, 40] : 35); } catch (e) {}
                }
            } else if (remaining > 5) {
                if (typeof clearTimerUrgency === 'function') clearTimerUrgency(timerEl);
            }
        }

        if (remaining <= 0) {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            if (typeof clearTimerUrgency === 'function') clearTimerUrgency(timerEl);
            if (typeof showSuspenseShimmer === 'function') showSuspenseShimmer('gameArea');

            // Disable student choices
            document.querySelectorAll('.mr-option-card').forEach(c => {
                c.classList.add('locked');
            });
            const submitBtn = document.getElementById('mrSubmitBtn');
            if (submitBtn && !minorityRuleState.isSubmitted) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
                submitBtn.textContent = 'Time Expired';
            }
            if (!minorityRuleState.isSubmitted && typeof sendGameAction === 'function') {
                sendGameAction('minority_rule_timeout', {
                    round_instance_id: window.currentRoundInstanceId || null
                });
            }
        }
    }

    tick();
    timerInterval = setInterval(tick, 200);
}

// ─────────────────────────────────────────────────────────────
// RESULTS & DEBRIEF HANDLER
// ─────────────────────────────────────────────────────────────
function handleMinorityRuleResults(message) {
    console.log('[MINORITY RULE] Rendering results:', message);

    window.isRoundEnded = true;
    if (typeof timerInterval !== 'undefined' && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (typeof clearSuspenseShimmer === 'function') clearSuspenseShimmer();
    if (typeof clearTimerUrgency === 'function') clearTimerUrgency();

    const gs = message.game_specific || {};
    const distribution = gs.distribution || [];
    const minorityOptions = gs.minority_options || [];
    const majorityOptions = gs.majority_options || [];
    const isTie = !!gs.is_tie;
    const takeaway = gs.takeaway || minorityRuleState.takeaway || (
        "When competitors crowd into the exact same market space, price wars destroy margins. " +
        "Sustainable competitive advantage comes from identifying and claiming underserved niches."
    );
    const isFinalRound = (message && (message.is_final_round || (message.current_round && message.total_rounds && message.current_round >= message.total_rounds))) || false;

    // ─────────────────────────────────────────────────────────────
    // PROJECTOR RESULTS VIEW
    // ─────────────────────────────────────────────────────────────
    if (window.isProjectorMode) {
        const area = document.getElementById('gameArea');
        if (!area) return;

        const totalVotes = gs.total_submissions || 0;

        const distBarsHTML = distribution.map((item, idx) => {
            const isWinner = minorityOptions.includes(item.option_index);
            const isCrowded = majorityOptions.includes(item.option_index);

            let barGradient = 'linear-gradient(90deg, #94a3b8, #64748b)';
            let statusBadge = '';
            let cardBorder = '2px solid #e2e8f0';
            let bgGlow = 'white';

            if (isTie) {
                barGradient = 'linear-gradient(90deg, #818cf8, #6366f1)';
                statusBadge = '<span style="background: #e0e7ff; color: #4338ca; font-weight: 800; font-size: 16px; padding: 4px 14px; border-radius: 999px;">⚖️ Balanced Market</span>';
            } else if (isWinner) {
                barGradient = 'linear-gradient(90deg, #10b981, #059669)';
                statusBadge = '<span style="background: #d1fae5; color: #065f46; font-weight: 900; font-size: 16px; padding: 4px 14px; border-radius: 999px; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">🐺 BLUE OCEAN (Minority Winner)</span>';
                cardBorder = '3px solid #10b981';
                bgGlow = '#f0fdf4';
            } else if (isCrowded) {
                barGradient = 'linear-gradient(90deg, #ef4444, #dc2626)';
                statusBadge = '<span style="background: #fee2e2; color: #991b1b; font-weight: 800; font-size: 16px; padding: 4px 14px; border-radius: 999px;">🐑 CROWDED TRAP (Red Ocean)</span>';
                cardBorder = '3px solid #fca5a5';
                bgGlow = '#fef2f2';
            }

            return `
                <div style="background: ${bgGlow}; border: ${cardBorder}; border-radius: 16px; padding: 18px 24px; margin-bottom: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <span style="width: 38px; height: 38px; border-radius: 10px; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800;">
                                ${String.fromCharCode(65 + idx)}
                            </span>
                            <span style="font-size: 22px; font-weight: 700; color: #0f172a;">${mrEscapeHtml(item.text)}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 16px;">
                            ${statusBadge}
                            <span style="font-size: 26px; font-weight: 900; color: #0f172a;">${item.count} <span style="font-size: 18px; color: #64748b; font-weight: 600;">(${item.percent}%)</span></span>
                        </div>
                    </div>
                    <div style="background: #e2e8f0; height: 16px; border-radius: 999px; overflow: hidden;">
                        <div style="background: ${barGradient}; width: ${item.percent}%; height: 100%; border-radius: 999px; transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
                    </div>
                </div>
            `;
        }).join('');

        area.innerHTML = `
            <div class="mr-results" style="max-width: 1400px; padding: 2.5rem; margin: 1rem auto; color: #1e293b; background: white; border-radius: 24px; box-shadow: 0 12px 40px rgba(0,0,0,0.12);">
                <div style="display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 24px;">
                    <span style="font-size: 48px;">🐺</span>
                    <h2 style="font-size: 40px; font-weight: 900; color: #0f172a; margin: 0;">
                        ${isTie ? 'Market Equilibrium Tie!' : 'The Blue Ocean Verdict'}
                    </h2>
                </div>

                <div style="margin-bottom: 30px;">
                    ${distBarsHTML}
                </div>

                <div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 2px solid #cbd5e1; border-radius: 18px; padding: 22px 28px; text-align: left; margin-bottom: 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
                    <div style="font-size: 16px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                        <span>💡</span>
                        <span>Key Marketing Takeaway</span>
                    </div>
                    <div style="font-size: 22px; font-weight: 600; color: #334155; line-height: 1.45;">
                        ${mrEscapeHtml(takeaway)}
                    </div>
                </div>

                ${isFinalRound ? `
                    <div style="margin-top: 32px; text-align: center;">
                        <button id="showFinaleBtn" onclick="triggerShowFinalStandings()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; border-radius: 14px; padding: 18px 36px; font-size: 22px; font-weight: 900; cursor: pointer; box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4); transition: transform 0.1s, box-shadow 0.2s;">
                            🏆 Reveal Final Winner & Standings
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        return;
    }

    // ─────────────────────────────────────────────────────────────
    // STUDENT RESULTS VIEW
    // ─────────────────────────────────────────────────────────────
    const playerScores = message.player_scores || [];
    const myId = (typeof myPlayerSessionId !== 'undefined' && myPlayerSessionId)
        || (typeof window.playerSessionId !== 'undefined' && window.playerSessionId)
        || null;

    let mine = null;
    if (myId != null) {
        mine = playerScores.find(p => String(p.player_id) === String(myId));
    }
    if (!mine && playerScores.length === 1) {
        mine = playerScores[0];
    }

    let verdictIcon = '⚖️';
    let verdictTitle = 'Market Equilibrium';
    let verdictSubtitle = 'All positions had balanced participation!';
    let verdictClass = 'verdict-neutral';
    let earnedPoints = mine ? mine.points : 0;

    if (mine) {
        if (mine.outcome_status === 'minority_winner') {
            verdictIcon = '🐺';
            verdictTitle = 'BLUE OCEAN VICTORY!';
            verdictSubtitle = 'You escaped the crowded trap and claimed an uncrowded niche!';
            verdictClass = 'verdict-correct';
        } else if (mine.outcome_status === 'crowded_trap') {
            verdictIcon = '🐑';
            verdictTitle = 'RED OCEAN CROWDED TRAP!';
            verdictSubtitle = 'You crowded into the saturated space. Fierce competition slashed margins!';
            verdictClass = 'verdict-wrong';
        } else if (mine.outcome_status === 'intermediate') {
            verdictIcon = '⛵';
            verdictTitle = 'MODERATE MARKET SHARE';
            verdictSubtitle = 'You avoided the main crowd with viable niche positioning.';
            verdictClass = 'verdict-partial';
        } else if (mine.outcome_status === 'tie') {
            verdictIcon = '⚖️';
            verdictTitle = 'MARKET EQUILIBRIUM!';
            verdictSubtitle = 'Equal distribution across the market.';
            verdictClass = 'verdict-neutral';
        } else {
            verdictIcon = '⏰';
            verdictTitle = 'TIME EXPIRED';
            verdictSubtitle = 'No market position was committed before the deadline.';
            verdictClass = 'verdict-wrong';
        }
    }

    const distBarsStudentHTML = distribution.map((item, idx) => {
        const isWinner = minorityOptions.includes(item.option_index);
        const isCrowded = majorityOptions.includes(item.option_index);

        let barColor = '#64748b';
        let badgeLabel = '';
        if (isTie) {
            barColor = '#6366f1';
        } else if (isWinner) {
            barColor = '#10b981';
            badgeLabel = '🐺 Niche Winner';
        } else if (isCrowded) {
            barColor = '#ef4444';
            badgeLabel = '🐑 Crowded Trap';
        }

        return `
            <div style="margin-bottom: 12px; background: #f8fafc; border-radius: 12px; padding: 10px 14px; border: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 4px;">
                    <span>${String.fromCharCode(65 + idx)}. ${mrEscapeHtml(item.text)}</span>
                    <span style="color: ${barColor}; font-weight: 800;">${item.percent}% ${badgeLabel ? `(${badgeLabel})` : ''}</span>
                </div>
                <div style="background: #e2e8f0; height: 10px; border-radius: 999px; overflow: hidden;">
                    <div style="background: ${barColor}; width: ${item.percent}%; height: 100%; border-radius: 999px; transition: width 0.6s ease;"></div>
                </div>
            </div>
        `;
    }).join('');

    const area = document.getElementById('gameArea');
    if (!area) return;

    area.innerHTML = `
        <div class="mr-results" style="max-width: 640px; margin: 0 auto; padding: 16px;">
            <div class="round-verdict-hero ${verdictClass}" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px; border-radius: 16px; margin-bottom: 16px;">
                <div style="font-size: 48px; margin-bottom: 6px;">${verdictIcon}</div>
                <div style="font-size: 1.35rem; font-weight: 900; line-height: 1.2;">${verdictTitle}</div>
                <div style="font-size: 0.95rem; margin-top: 4px; font-weight: 600; opacity: 0.9;">${verdictSubtitle}</div>
            </div>

            <div style="background: white; border-radius: 14px; padding: 14px 18px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; border: 1.5px solid #e2e8f0;">
                <span style="font-size: 1.1rem; font-weight: 800; color: #1e293b;">Points Awarded:</span>
                <span style="font-size: 1.5rem; font-weight: 900; color: ${earnedPoints > 0 ? '#10b981' : '#64748b'};">
                    +${earnedPoints} pts
                </span>
            </div>

            <div style="background: white; border-radius: 16px; padding: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); margin-bottom: 16px;">
                <div style="font-size: 0.9rem; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 10px;">
                    Room Market Distribution
                </div>
                ${distBarsStudentHTML}
            </div>

            <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 14px; padding: 14px 16px; margin-bottom: 16px;">
                <div style="font-size: 0.85rem; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                    💡 Strategic Takeaway
                </div>
                <div style="font-size: 0.95rem; color: #0369a1; font-weight: 600; line-height: 1.4;">
                    ${mrEscapeHtml(takeaway)}
                </div>
            </div>

            ${isFinalRound ? `
                <div style="margin-top: 24px; text-align: center;">
                    <div style="font-size: 1.1rem; font-weight: 700; color: #f59e0b; margin-bottom: 12px;">
                        🏁 That was the final question!
                    </div>
                    <button id="showFinaleBtn" onclick="triggerShowFinalStandings()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; border-radius: 12px; padding: 14px 28px; font-size: 17px; font-weight: 800; cursor: pointer; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4); transition: transform 0.1s, box-shadow 0.2s;">
                        🏆 Reveal Final Winner & Standings
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    const scoreEl = document.getElementById('playerScore');
    if (scoreEl && earnedPoints > 0) {
        const currentScore = parseInt(scoreEl.textContent, 10) || 0;
        const targetScore = (message.leaderboard && Array.isArray(message.leaderboard))
            ? ((message.leaderboard.find(p => p.player_id == (typeof playerSession !== 'undefined' ? playerSession.id : 999)) || {}).score || (currentScore + earnedPoints))
            : (currentScore + earnedPoints);
        if (typeof animateScoreCountUp === 'function') {
            animateScoreCountUp(scoreEl, targetScore, 900);
        } else {
            scoreEl.textContent = targetScore;
        }
    }
    if (earnedPoints > 0 && typeof spawnFloatingPoints === 'function') {
        spawnFloatingPoints(earnedPoints, scoreEl);
    }
}
