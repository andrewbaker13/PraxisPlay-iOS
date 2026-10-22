/**
 * Buy a Clue — answer for full marks, or pay for information first.
 *
 * The cost of the clue is shown before the decision, not after, because the
 * whole lesson is deciding whether more information is worth its price.
 * Selecting an option is local; only Lock answer commits it.
 */

let buyAClueState = {
    options: [],
    selected: null,
    bought: false,
    answered: false,
    pending: false,
    clueCost: 25,
    basePoints: 100,
};

function showBuyAClueGame(message, timeLimit) {
    const config = message.game_config || {};
    const outcomes = config.outcomes || {};

    buyAClueState = {
        options: config.options || [],
        selected: null,
        bought: false,
        answered: false,
        pending: false,
        clueCost: config.clue_cost != null ? config.clue_cost : 25,
        basePoints: config.base_points != null ? config.base_points : 100,
        outcomes: outcomes,
    };

    if (window.isProjectorMode) {
        const optionCards = buyAClueState.options.map((opt, index) => `
            <div style="background: white; border: 3px solid #e2e8f0; border-radius: 16px; padding: 24px 28px; display: flex; align-items: center; gap: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
                <div style="width: 48px; height: 48px; border-radius: 12px; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; flex-shrink: 0;">
                    ${String.fromCharCode(65 + index)}
                </div>
                <div style="font-size: 28px; font-weight: 700; color: #1e293b; text-align: left; line-height: 1.3;">
                    ${bacEscapeHtml(opt.text)}
                </div>
            </div>
        `).join('');

        document.getElementById('gameArea').innerHTML = `
            <div class="bac-area" style="max-width: 1400px; padding: 2rem; margin: 0 auto;">
                <div style="display: flex; justify-content: center; align-items: center; gap: 24px; margin-bottom: 24px;">
                    <div class="timer" id="timer" style="font-size: 80px; font-weight: 800; color: #ef4444; background: white; border-radius: 16px; padding: 16px 36px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">${Math.ceil(timeLimit)}</div>
                    <div style="flex: 1; font-size: 38px; font-weight: 700; color: #1e293b; background: white; border-radius: 16px; padding: 24px 36px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); text-align: center;">
                        ${bacEscapeHtml(message.question_text || '')}
                    </div>
                </div>

                <div style="background: white; border-radius: 18px; padding: 20px 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); margin-bottom: 24px; display: flex; justify-content: space-around; align-items: center; font-size: 22px;">
                    <div>
                        <span style="color: #64748b; font-weight: 600;">Unassisted:</span>
                        <strong style="color: #10b981; margin-left: 6px;">+${outcomes.no_clue_correct != null ? outcomes.no_clue_correct : buyAClueState.basePoints} pts</strong>
                        <span style="color: #94a3b8; margin: 0 6px;">/</span>
                        <strong style="color: #64748b;">${outcomes.no_clue_wrong != null ? outcomes.no_clue_wrong : 0} pts</strong>
                    </div>
                    <div style="color: #cbd5e1; font-size: 28px;">•</div>
                    <div>
                        <span style="color: #64748b; font-weight: 600;">With Clue:</span>
                        <strong style="color: #2563eb; margin-left: 6px;">+${outcomes.clue_correct} pts</strong>
                        <span style="color: #94a3b8; margin: 0 6px;">/</span>
                        <strong style="color: #ef4444;">${outcomes.clue_wrong} pts</strong>
                    </div>
                    <div style="color: #cbd5e1; font-size: 28px;">•</div>
                    <div style="font-size: 18px; color: #b45309; font-weight: 700; background: #fef3c7; padding: 6px 14px; border-radius: 999px;">
                        💡 Clue Costs ${buyAClueState.clueCost} pts
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 28px;">
                    ${optionCards}
                </div>

                <div id="bacParticipation" style="text-align: center; background: white; padding: 24px 32px; border-radius: 18px; box-shadow: 0 8px 30px rgba(0,0,0,0.08);">
                    <div style="font-size: 36px; font-weight: 800; color: #64748b; margin-bottom: 12px;">
                        Waiting for decisions...
                    </div>
                    <div style="font-size: 48px; font-weight: 900; color: #1e293b; margin-bottom: 16px;">0%</div>
                    <div style="background: #e2e8f0; height: 16px; border-radius: 999px; overflow: hidden; max-width: 600px; margin: 0 auto;">
                        <div class="bac-progress-fill" style="background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const isProjector = window.isProjectorMode;
    const optionButtons = buyAClueState.options.map(opt => `
        <button type="button" class="bac-option" data-option="${bacEscapeAttr(opt.id)}">
            ${bacEscapeHtml(opt.text)}
        </button>
    `).join('');

    document.getElementById('gameArea').innerHTML = `
        <div class="bac-area">
            <div class="bac-header">
                <div class="timer" id="timer">${Math.ceil(timeLimit)}</div>
                <div class="bac-prompt">${bacEscapeHtml(message.question_text || '')}</div>
            </div>

            <div class="bac-rules">
                Correct <strong>+${outcomes.no_clue_correct != null ? outcomes.no_clue_correct : buyAClueState.basePoints}</strong> ·
                Incorrect <strong>${outcomes.no_clue_wrong != null ? outcomes.no_clue_wrong : 0}</strong> ·
                With a clue <strong>${outcomes.clue_correct}</strong> / <strong>${outcomes.clue_wrong}</strong>
                <div class="bac-rules-note">The clue costs ${buyAClueState.clueCost} points whether or not you get it right.</div>
            </div>

            <div id="bacCluePanel" class="bac-clue" style="display:none;"></div>

            <div class="bac-options">${optionButtons}</div>

            <div class="bac-actions">
                <button type="button" id="bacBuyBtn" class="bac-buy">
                    💡 Buy clue — costs ${buyAClueState.clueCost} points
                </button>
                <button type="button" id="bacLockBtn" class="bac-lock" disabled>
                    Choose an answer first
                </button>
            </div>
            <div id="feedback" class="bac-feedback"></div>
        </div>
        <style>
            .bac-area { padding: ${isProjector ? '2rem' : '1rem'}; max-width: 760px; margin: 0 auto; }
            .bac-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
            .bac-header .timer { font-size: ${isProjector ? '64px' : '2rem'}; font-weight: 800; color: #ef4444; background: white; border-radius: 12px; padding: 0.4rem 1rem; }
            .bac-prompt { flex: 1; min-width: 12rem; font-size: ${isProjector ? '40px' : '1.05rem'}; font-weight: 600; background: white; border-radius: 12px; padding: 0.75rem 1rem; color: #1e293b; }
            .bac-rules { background: rgba(255,255,255,0.92); border-radius: 12px; padding: 0.6rem 1rem; margin-bottom: 0.75rem; text-align: center; color: #1e293b; font-size: 0.95rem; }
            .bac-rules-note { font-size: 0.8rem; color: #64748b; margin-top: 0.25rem; }
            .bac-clue { background: #fef9c3; border: 2px solid #facc15; border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem; color: #713f12; font-size: 1.05rem; }
            .bac-options { display: grid; gap: 0.6rem; margin-bottom: 1rem; }
            .bac-option { padding: 1.1rem; font-size: 1.05rem; font-weight: 600; border: 3px solid #e2e8f0; border-radius: 12px; background: white; color: #1e293b; cursor: pointer; text-align: left; }
            .bac-option.bac-selected { border-color: #3b82f6; background: #eff6ff; }
            .bac-option:disabled { opacity: 0.55; cursor: not-allowed; }
            .bac-actions { display: grid; gap: 0.6rem; }
            .bac-buy { padding: 0.9rem; font-size: 1rem; font-weight: 700; border: 2px solid #f59e0b; border-radius: 12px; background: white; color: #b45309; cursor: pointer; }
            .bac-buy:disabled { opacity: 0.5; cursor: not-allowed; }
            .bac-lock { padding: 1rem; font-size: 1.1rem; font-weight: 700; border: none; border-radius: 12px; background: #10b981; color: white; cursor: pointer; }
            .bac-lock:disabled { background: #94a3b8; cursor: not-allowed; }
            .bac-feedback { text-align: center; margin-top: 0.75rem; min-height: 1.5rem; color: white; font-weight: 600; }
        </style>
    `;

    document.querySelectorAll('.bac-option').forEach(btn => {
        btn.addEventListener('click', () => selectClueOption(btn.dataset.option));
    });
    document.getElementById('bacBuyBtn').addEventListener('click', buyTheClue);
    document.getElementById('bacLockBtn').addEventListener('click', lockClueAnswer);
}

function bacEscapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function bacEscapeAttr(value) {
    return bacEscapeHtml(value).replace(/"/g, '&quot;');
}

function selectClueOption(optionId) {
    if (buyAClueState.answered || buyAClueState.pending) return;
    buyAClueState.selected = optionId;
    document.querySelectorAll('.bac-option').forEach(btn => {
        btn.classList.toggle('bac-selected', btn.dataset.option === optionId);
    });
    const lockBtn = document.getElementById('bacLockBtn');
    if (lockBtn) {
        lockBtn.disabled = false;
        lockBtn.textContent = 'Lock answer';
    }
}

function buyTheClue() {
    if (buyAClueState.bought || buyAClueState.answered || buyAClueState.pending) return;
    const buyBtn = document.getElementById('bacBuyBtn');
    if (buyBtn) {
        buyBtn.disabled = true;
        buyBtn.textContent = 'Getting your clue…';
    }
    // Committing an answer while a purchase is in flight would be ambiguous.
    const lockBtn = document.getElementById('bacLockBtn');
    if (lockBtn) lockBtn.disabled = true;

    const sent = sendGameAction('buy_a_clue_purchase', {
        player_session_id: playerSession.id,
    });
    if (!sent && buyBtn) {
        buyBtn.disabled = false;
        buyBtn.textContent = `💡 Buy clue — costs ${buyAClueState.clueCost} points`;
        if (lockBtn) lockBtn.disabled = !buyAClueState.selected;
    }
}

function handleBuyAClueClue(message) {
    buyAClueState.bought = true;
    const panel = document.getElementById('bacCluePanel');
    if (panel) {
        panel.textContent = message.clue_text || '';
        panel.style.display = 'block';
        panel.classList.remove('bac-clue-unlocked');
        void panel.offsetWidth;
        panel.classList.add('bac-clue-unlocked');
    }
    if (navigator.vibrate) {
        try { navigator.vibrate([30, 40, 50]); } catch (e) {}
    }
    const buyBtn = document.getElementById('bacBuyBtn');
    if (buyBtn) {
        buyBtn.disabled = true;
        buyBtn.textContent = `💡 Clue bought — ${buyAClueState.clueCost} points charged`;
    }
    const lockBtn = document.getElementById('bacLockBtn');
    if (lockBtn) lockBtn.disabled = !buyAClueState.selected;

    const correct = buyAClueState.outcomes.clue_correct;
    const wrong = buyAClueState.outcomes.clue_wrong;
    showClueFeedback(`Clue illuminated! Correct ${correct >= 0 ? '+' : ''}${correct} / Incorrect ${wrong}.`);
}

function lockClueAnswer() {
    if (buyAClueState.answered || buyAClueState.pending || !buyAClueState.selected) return;

    buyAClueState.pending = true;
    const lockBtn = document.getElementById('bacLockBtn');
    if (lockBtn) {
        lockBtn.disabled = true;
        lockBtn.textContent = 'Sending…';
    }
    const buyBtn = document.getElementById('bacBuyBtn');
    if (buyBtn) buyBtn.disabled = true;

    const sent = sendGameAction('buy_a_clue_submit', {
        player_session_id: playerSession.id,
        option_id: buyAClueState.selected,
    });
    if (!sent) {
        buyAClueState.pending = false;
        if (lockBtn) {
            lockBtn.disabled = false;
            lockBtn.textContent = 'Lock answer';
        }
        showClueFeedback('⚠️ Could not reach the game — try again.');
    }
}

function handleBuyAClueAccepted(message) {
    buyAClueState.pending = false;
    buyAClueState.answered = true;
    if (message.option_id) buyAClueState.selected = message.option_id;

    document.querySelectorAll('.bac-option').forEach(btn => {
        btn.disabled = true;
        btn.classList.toggle('bac-selected', btn.dataset.option === buyAClueState.selected);
    });
    const lockBtn = document.getElementById('bacLockBtn');
    if (lockBtn) {
        lockBtn.disabled = true;
        lockBtn.textContent = '✅ Answer locked';
    }
    const buyBtn = document.getElementById('bacBuyBtn');
    if (buyBtn) buyBtn.disabled = true;

    if (typeof showLockedInStamp === 'function') {
        showLockedInStamp('feedback', {
            title: 'ANSWER LOCKED 🔒',
            message: 'Your decision is locked. No turning back!',
            subtext: buyAClueState.bought
                ? `Answer submitted with intel (${buyAClueState.clueCost} pt clue)`
                : 'Raw conviction! Playing for maximum unassisted points.'
        });
    } else {
        showClueFeedback('Answer locked. Waiting for the rest of the class…');
    }
}

function handleBuyAClueRejected(message) {
    if (!buyAClueState.pending) return;
    buyAClueState.pending = false;

    const code = message && message.code;
    if (code === 'deadline_passed' || code === 'waiting_to_enter') {
        buyAClueState.answered = true;
        return;
    }
    const lockBtn = document.getElementById('bacLockBtn');
    if (lockBtn && buyAClueState.selected) {
        lockBtn.disabled = false;
        lockBtn.textContent = 'Lock answer';
    }
    const buyBtn = document.getElementById('bacBuyBtn');
    if (buyBtn && !buyAClueState.bought) buyBtn.disabled = false;
    showClueFeedback('⚠️ That did not go through — try again.');
}

function showClueFeedback(text) {
    const feedback = document.getElementById('feedback');
    if (feedback) feedback.textContent = text;
}

function handleBuyAClueProgress(message) {
    if (window.isProjectorMode) {
        const answered = message.answered || 0;
        const eligible = message.eligible || 0;
        const pct = eligible > 0 ? Math.round((answered / eligible) * 100) : 0;
        const el = document.getElementById('bacParticipation');
        if (el) {
            el.innerHTML = `
                <div style="font-size: 36px; font-weight: 800; color: #3b82f6; margin-bottom: 12px;">
                    ${answered} / ${eligible} Decisions Locked In
                </div>
                <div style="font-size: 48px; font-weight: 900; color: #1e293b; margin-bottom: 16px;">${pct}%</div>
                <div style="background: #e2e8f0; height: 16px; border-radius: 999px; overflow: hidden; max-width: 600px; margin: 0 auto;">
                    <div class="bac-progress-fill" style="background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; width: ${pct}%; transition: width 0.3s ease;"></div>
                </div>
            `;
        }
        return;
    }
    if (buyAClueState.answered) {
        showClueFeedback(`Answer locked. ${message.answered} of ${message.eligible} in.`);
    }
}

// Reconnect path. The clue is withheld from game_config for everyone, so a
// student who already paid gets it back here or loses both points and hint.
function restoreBuyAClueSubmission(accepted) {
    if (!accepted) return;
    if (accepted.bought_clue) {
        handleBuyAClueClue({ clue_text: accepted.clue_text || '' });
    }
    if (accepted.submitted) {
        handleBuyAClueAccepted({ option_id: accepted.option_id });
    }
}

function startBuyAClueTimer(seconds, startTime) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    const timerEl = document.getElementById('timer');
    const endTime = startTime + seconds * 1000;

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
            clearInterval(timerInterval);
            if (typeof clearTimerUrgency === 'function') clearTimerUrgency(timerEl);
            if (typeof showSuspenseShimmer === 'function') showSuspenseShimmer('gameArea');
            document.querySelectorAll('.bac-option').forEach(b => { b.disabled = true; });
            const buyBtn = document.getElementById('bacBuyBtn');
            const lockBtn = document.getElementById('bacLockBtn');
            if (buyBtn) buyBtn.disabled = true;
            if (lockBtn && !buyAClueState.answered) {
                lockBtn.disabled = true;
                lockBtn.textContent = 'Time is up';
                showClueFeedback(buyAClueState.bought
                    ? `No answer submitted. The clue still cost ${buyAClueState.clueCost}.`
                    : 'No answer submitted.');
            }
        }
    }

    tick();
    timerInterval = setInterval(tick, 200);
}

function handleBuyAClueResults(message) {
    window.isRoundEnded = true;
    if (typeof timerInterval !== 'undefined' && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (typeof clearSuspenseShimmer === 'function') clearSuspenseShimmer();
    if (typeof clearTimerUrgency === 'function') clearTimerUrgency();

    const gs = (message && message.game_specific) || {};
    const isFinalRound = (message && (message.is_final_round || (message.current_round && message.total_rounds && message.current_round >= message.total_rounds))) || false;

    if (window.isProjectorMode) {
        const playerScores = message.player_scores || [];
        const totalPlayers = playerScores.length;
        const buyers = playerScores.filter(p => p.bought_clue);
        const nonBuyers = playerScores.filter(p => !p.bought_clue);
        const buyerCount = buyers.length;
        const buyerPct = totalPlayers > 0 ? Math.round((buyerCount / totalPlayers) * 100) : 0;
        
        const buyersCorrect = buyers.filter(p => p.is_correct).length;
        const buyerAccuracy = buyerCount > 0 ? Math.round((buyersCorrect / buyerCount) * 100) : 0;

        const nonBuyersCorrect = nonBuyers.filter(p => p.is_correct).length;
        const nonBuyerAccuracy = nonBuyers.length > 0 ? Math.round((nonBuyersCorrect / nonBuyers.length) * 100) : 0;

        const correctText = (message.correct_answer && message.correct_answer.text)
            || message.correct_answer || '';

        const area = document.getElementById('gameArea');
        if (!area) return;
        area.innerHTML = `
            <div class="bac-results" style="max-width: 1400px; padding: 2.5rem; margin: 1rem auto; text-align: center; color: #1e293b; background: white; border-radius: 24px; box-shadow: 0 12px 40px rgba(0,0,0,0.12);">
                <div style="display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 24px;">
                    <span style="font-size: 48px;">💡</span>
                    <h2 style="font-size: 44px; font-weight: 900; color: #1e293b; margin: 0;">Value of Information (VoI) Debrief</h2>
                </div>

                <div style="background: rgba(16, 185, 129, 0.1); border: 2.5px solid #10b981; border-radius: 18px; padding: 20px; margin-bottom: 28px;">
                    <div style="font-size: 16px; font-weight: 800; color: #047857; text-transform: uppercase;">Correct Answer</div>
                    <div style="font-size: 36px; font-weight: 900; color: #065f46; margin-top: 4px;">${bacEscapeHtml(correctText)}</div>
                </div>

                ${gs.clue_text ? `
                    <div style="background: #fefce8; border: 2px solid #facc15; border-radius: 16px; padding: 18px 24px; margin-bottom: 28px; text-align: left;">
                        <span style="font-size: 16px; font-weight: 800; color: #854d0e; text-transform: uppercase; display: block; margin-bottom: 4px;">Intel For Sale (${gs.clue_cost || 25} pts)</span>
                        <div style="font-size: 24px; font-weight: 700; color: #713f12; font-style: italic;">"${bacEscapeHtml(gs.clue_text)}"</div>
                    </div>
                ` : ''}

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 16px; padding: 22px;">
                        <div style="font-size: 16px; font-weight: 700; color: #475569; text-transform: uppercase;">Purchased Intel</div>
                        <div style="font-size: 48px; font-weight: 900; color: #b45309; margin-top: 4px;">${buyerCount} <span style="font-size: 24px; font-weight: 700;">(${buyerPct}%)</span></div>
                        <div style="font-size: 16px; color: #64748b; margin-top: 4px;">Win Rate: <strong style="color: #1e293b;">${buyerAccuracy}%</strong> (${buyersCorrect}/${buyerCount})</div>
                    </div>
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 16px; padding: 22px;">
                        <div style="font-size: 16px; font-weight: 700; color: #475569; text-transform: uppercase;">Unassisted Conviction</div>
                        <div style="font-size: 48px; font-weight: 900; color: #2563eb; margin-top: 4px;">${nonBuyers.length} <span style="font-size: 24px; font-weight: 700;">(${100 - buyerPct}%)</span></div>
                        <div style="font-size: 16px; color: #64748b; margin-top: 4px;">Win Rate: <strong style="color: #1e293b;">${nonBuyerAccuracy}%</strong> (${nonBuyersCorrect}/${nonBuyers.length})</div>
                    </div>
                    <div style="background: ${buyerAccuracy > nonBuyerAccuracy ? '#f0fdf4' : '#fff7ed'}; border: 2px solid ${buyerAccuracy > nonBuyerAccuracy ? '#86efac' : '#fed7aa'}; border-radius: 16px; padding: 22px;">
                        <div style="font-size: 16px; font-weight: 700; color: ${buyerAccuracy > nonBuyerAccuracy ? '#166534' : '#9a3412'}; text-transform: uppercase;">Information ROI</div>
                        <div style="font-size: 44px; font-weight: 900; color: ${buyerAccuracy > nonBuyerAccuracy ? '#15803d' : '#ea580c'}; margin-top: 4px;">
                            ${buyerAccuracy > nonBuyerAccuracy ? `+${buyerAccuracy - nonBuyerAccuracy}%` : `${buyerAccuracy - nonBuyerAccuracy}%`}
                        </div>
                        <div style="font-size: 16px; color: #64748b; margin-top: 4px;">${buyerAccuracy > nonBuyerAccuracy ? 'Intel lifted accuracy above baseline' : 'Intel failed to beat intuition'}</div>
                    </div>
                </div>

                ${gs.answer_explanation ? `
                    <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 20px; font-size: 20px; color: #334155; text-align: left; line-height: 1.5; margin-bottom: 20px;">
                        <strong>Explanation:</strong> ${bacEscapeHtml(gs.answer_explanation)}
                    </div>
                ` : ''}

                ${gs.takeaway ? `
                    <div style="background: #fefce8; border: 2px solid #fef08a; border-radius: 16px; padding: 20px; font-size: 22px; color: #854d0e; text-align: left; line-height: 1.5;">
                        🧠 <strong>Decision Theory Takeaway:</strong> ${bacEscapeHtml(gs.takeaway)}
                    </div>
                ` : ''}

                ${isFinalRound ? `
                    <div style="margin-top: 30px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 700; color: #f59e0b; margin-bottom: 14px;">
                            🏁 That was the final question!
                        </div>
                        <button id="showFinaleBtn" onclick="triggerShowFinalStandings()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; border-radius: 12px; padding: 18px 42px; font-size: 28px; font-weight: 800; cursor: pointer; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4); transition: transform 0.1s, box-shadow 0.2s;">
                            🏆 Reveal Final Winner & Standings
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        return;
    }

    const mine = (message.player_scores || []).find(
        p => String(p.player_id) === String(playerSession.id)
    );

    // Score count-up and floating points
    if (mine && mine.points != null) {
        const scoreEl = document.getElementById('playerScore');
        if (scoreEl) {
            const currentDisplayed = parseInt(scoreEl.textContent) || 0;
            const targetScore = currentDisplayed + Number(mine.points);
            if (typeof animateScoreCountUp === 'function') {
                animateScoreCountUp(scoreEl, currentDisplayed, targetScore);
            } else {
                scoreEl.textContent = targetScore;
            }
        }
        if (typeof spawnFloatingPoints === 'function' && Number(mine.points) > 0) {
            spawnFloatingPoints(mine.points);
        }
    }

    let verdictClass = 'verdict-neutral';
    let verdictIcon = '⏳';
    let verdictText = 'No Answer Submitted';

    if (mine && mine.answered) {
        if (mine.is_correct) {
            verdictClass = 'verdict-positive';
            verdictIcon = '🎯';
            verdictText = 'Correct Answer Locked In!';
        } else {
            verdictClass = 'verdict-neutral';
            verdictIcon = '❌';
            verdictText = 'Not Quite This Time';
        }
    }

    // Value of Information ROI Banner
    let roiBannerHTML = '';
    if (mine && mine.answered) {
        if (mine.bought_clue && mine.is_correct) {
            roiBannerHTML = `
                <div class="bac-roi-banner roi-profitable">
                    <span>💡</span>
                    <span><strong>HIGH ROI!</strong> Information secured the correct answer (+${mine.points} net).</span>
                </div>
            `;
        } else if (!mine.bought_clue && mine.is_correct) {
            roiBannerHTML = `
                <div class="bac-roi-banner roi-pure-confidence">
                    <span>🧠</span>
                    <span><strong>PURE CONVICTION!</strong> Pocketed full points (+${mine.points}) without spending on intel.</span>
                </div>
            `;
        } else if (mine.bought_clue && !mine.is_correct) {
            roiBannerHTML = `
                <div class="bac-roi-banner roi-expensive">
                    <span>⚠️</span>
                    <span><strong>EXPENSIVE MISS!</strong> Clue cost ${mine.clue_charge} pts without payoff (${mine.points} net).</span>
                </div>
            `;
        } else {
            roiBannerHTML = `
                <div class="bac-roi-banner roi-expensive">
                    <span>📉</span>
                    <span><strong>UNASSISTED MISS!</strong> Took the shot raw and missed the target.</span>
                </div>
            `;
        }
    }

    const breakdown = mine ? `
        <div style="background: #f8fafc; border-radius: 12px; padding: 12px 16px; margin: 12px 0; border: 1.5px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.95rem; margin-bottom: 4px; color: #475569;">
                <span>Answer payout:</span>
                <strong style="color: ${mine.is_correct ? '#10b981' : '#64748b'};">+${mine.answer_points} pts</strong>
            </div>
            ${mine.bought_clue ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.95rem; margin-bottom: 4px; color: #b45309;">
                <span>Clue purchased:</span>
                <strong>-${mine.clue_charge} pts</strong>
            </div>` : `
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 4px; color: #64748b;">
                <span>Clue purchased:</span>
                <span>None (0 pts)</span>
            </div>`}
            <div style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 800; border-top: 1.5px solid #e2e8f0; padding-top: 6px; margin-top: 4px; color: #1e293b;">
                <span>Net Score:</span>
                <span style="color: ${Number(mine.points) > 0 ? '#10b981' : (Number(mine.points) < 0 ? '#ef4444' : '#64748b')};">${Number(mine.points) > 0 ? '+' : ''}${mine.points} pts</span>
            </div>
        </div>
    ` : '';

    const correctText = (message.correct_answer && message.correct_answer.text)
        || message.correct_answer || '';

    const totalInClass = (message.player_scores || []).length;
    const buyerCount = gs.buyers || 0;
    const buyerPct = totalInClass > 0 ? Math.round((buyerCount / totalInClass) * 100) : null;

    const area = document.getElementById('gameArea');
    if (!area) return;
    area.innerHTML = `
        <div class="bac-results">
            <div class="round-verdict-hero ${verdictClass}">
                <span>${verdictIcon}</span>
                <span>${verdictText}</span>
            </div>

            ${roiBannerHTML}

            <div style="background: rgba(16, 185, 129, 0.08); border: 1.5px solid rgba(16, 185, 129, 0.35); border-radius: 12px; padding: 12px; margin-bottom: 12px;">
                <div style="font-size: 0.85rem; font-weight: 700; color: #047857; text-transform: uppercase;">Correct Answer</div>
                <div style="font-size: 1.2rem; font-weight: 800; color: #065f46; margin-top: 2px;">${bacEscapeHtml(correctText)}</div>
            </div>

            ${breakdown}

            ${gs.answer_explanation ? `<div class="bac-explain">${bacEscapeHtml(gs.answer_explanation)}</div>` : ''}
            ${gs.clue_text ? `<div class="bac-clue-reveal">💡 Clue provided: "${bacEscapeHtml(gs.clue_text)}"</div>` : ''}

            <div class="bac-buyers">
                ${buyerCount} ${buyerCount === 1 ? 'player' : 'players'} in the class bought the clue${buyerPct !== null ? ` (${buyerPct}%)` : ''}.
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
        <style>
            .bac-results { background: white; border-radius: 16px; padding: 1.5rem; max-width: 620px; margin: 1rem auto; text-align: center; color: #1e293b; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
            .bac-explain { margin-top: 0.85rem; color: #475569; font-size: 0.95rem; line-height: 1.4; text-align: left; background: #f8fafc; padding: 10px 14px; border-radius: 8px; }
            .bac-clue-reveal { margin-top: 0.6rem; font-style: italic; color: #b45309; font-size: 0.9rem; }
            .bac-buyers { margin-top: 0.85rem; font-size: 0.85rem; font-weight: 600; color: #64748b; }
        </style>
    `;
}
