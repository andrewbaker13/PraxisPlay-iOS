/**
 * Budget Blitz — spend every token across channels with diminishing returns.
 *
 * Editing is entirely local: nothing reaches the server until the student locks
 * their budget in. That keeps the room quiet during play and, more importantly,
 * means no allocation is broadcast for classmates to copy.
 */

let budgetBlitzState = {
    tokens: 0,
    channels: [],
    allocation: {},
    submitted: false,
    pending: false,
};

function showBudgetBlitzGame(message, timeLimit) {
    const config = message.game_config || {};
    const channels = config.channels || [];
    const tokens = config.budget_tokens || 0;
    const unit = config.response_unit || 'response units';

    budgetBlitzState = {
        tokens: tokens,
        channels: channels,
        allocation: Object.fromEntries(channels.map(c => [c.id, 0])),
        submitted: false,
        pending: false,
        unit: unit,
    };

    if (window.isProjectorMode) {
        const tableHeaders = ['Channel', ...Array.from({ length: tokens }, (_, i) => `T${i + 1}`)];
        const tableRows = channels.map(c => `
            <tr>
                <th scope="row" style="text-align: left; padding: 14px 20px; font-weight: 700; color: #1e293b; border-bottom: 2px solid #e2e8f0; font-size: 24px;">${escapeHtml(c.label || c.id)}</th>
                ${(c.marginal_returns || []).map(v => `<td style="padding: 14px 16px; text-align: center; font-size: 26px; font-weight: 800; color: #3b82f6; border-bottom: 2px solid #e2e8f0;">+${v}</td>`).join('')}
            </tr>
        `).join('');

        document.getElementById('gameArea').innerHTML = `
            <div class="bb-area" style="max-width: 1400px; padding: 2rem; margin: 0 auto;">
                <div style="display: flex; justify-content: center; align-items: center; gap: 24px; margin-bottom: 24px;">
                    <div class="timer" id="timer" style="font-size: 80px; font-weight: 800; color: #ef4444; background: white; border-radius: 16px; padding: 16px 36px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">${Math.ceil(timeLimit)}</div>
                    <div style="flex: 1; font-size: 38px; font-weight: 700; color: #1e293b; background: white; border-radius: 16px; padding: 24px 36px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); text-align: center;">
                        ${escapeHtml(message.question_text || '')}
                    </div>
                    <div style="background: white; border-radius: 16px; padding: 16px 28px; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,0.08); min-width: 180px;">
                        <div style="font-size: 42px; font-weight: 800; color: #3b82f6; line-height: 1;">${tokens}</div>
                        <div style="font-size: 16px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 4px;">Tokens to Allocate</div>
                    </div>
                </div>

                <div style="background: white; border-radius: 18px; padding: 28px; box-shadow: 0 8px 30px rgba(0,0,0,0.08); margin-bottom: 28px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3 style="font-size: 26px; font-weight: 800; color: #1e293b; margin: 0;">📉 Marginal Return Schedule (${escapeHtml(unit)})</h3>
                        <span style="font-size: 18px; font-weight: 600; color: #64748b;">Notice diminishing returns: each additional token yields less</span>
                    </div>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8fafc;">
                                    ${tableHeaders.map((h, i) => `<th style="padding: 12px 16px; text-align: ${i === 0 ? 'left' : 'center'}; font-size: 20px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1;">${escapeHtml(h)}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="bbParticipation" style="text-align: center; background: white; padding: 24px 32px; border-radius: 18px; box-shadow: 0 8px 30px rgba(0,0,0,0.08);">
                    <div style="font-size: 36px; font-weight: 800; color: #64748b; margin-bottom: 12px;">
                        Waiting for budgets...
                    </div>
                    <div style="font-size: 48px; font-weight: 900; color: #1e293b; margin-bottom: 16px;">0%</div>
                    <div style="background: #e2e8f0; height: 16px; border-radius: 999px; overflow: hidden; max-width: 600px; margin: 0 auto;">
                        <div class="bb-progress-fill" style="background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const isProjector = window.isProjectorMode;
    const cards = channels.map(channel => `
        <div class="bb-channel" data-channel="${escapeAttr(channel.id)}">
            <div class="bb-channel-name">${escapeHtml(channel.label || channel.id)}</div>
            <div class="bb-channel-tokens" id="bbTokens-${escapeAttr(channel.id)}">0</div>
            <div class="bb-channel-stats">
                <div>Total: <strong id="bbTotal-${escapeAttr(channel.id)}">0</strong></div>
                <div class="bb-next">Next token: <strong id="bbNext-${escapeAttr(channel.id)}">—</strong></div>
            </div>
            <div class="bb-controls">
                <button type="button" class="bb-btn bb-minus" data-channel="${escapeAttr(channel.id)}" aria-label="Remove a token from ${escapeAttr(channel.label || channel.id)}">−</button>
                <button type="button" class="bb-btn bb-plus" data-channel="${escapeAttr(channel.id)}" aria-label="Add a token to ${escapeAttr(channel.label || channel.id)}">+</button>
            </div>
        </div>
    `).join('');

    document.getElementById('gameArea').innerHTML = `
        <div class="bb-area">
            <div class="bb-header">
                <div class="timer" id="timer">${Math.ceil(timeLimit)}</div>
                <div class="bb-prompt">${escapeHtml(message.question_text || '')}</div>
                <div class="bb-remaining">
                    <span id="bbRemaining">${tokens}</span> of ${tokens}<br><small>tokens left</small>
                </div>
            </div>

            <div class="bb-channels">${cards}</div>

            <div class="bb-outcome">
                Projected result: <strong id="bbOutcome">0</strong> ${escapeHtml(unit)}
            </div>

            <details class="bb-table">
                <summary>See the full payoff table</summary>
                <div id="bbTableBody"></div>
            </details>

            <button type="button" id="bbLockBtn" class="bb-lock" disabled>
                Spend all ${tokens} tokens to lock in
            </button>
            <div id="feedback" class="bb-feedback"></div>
        </div>
        <style>
            .bb-area { padding: ${isProjector ? '2rem' : '1rem'}; max-width: 900px; margin: 0 auto; }
            .bb-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
            .bb-header .timer { font-size: ${isProjector ? '64px' : '2rem'}; font-weight: 800; color: #ef4444; background: white; border-radius: 12px; padding: 0.4rem 1rem; }
            .bb-prompt { flex: 1; min-width: 12rem; font-size: ${isProjector ? '40px' : '1.05rem'}; font-weight: 600; background: white; border-radius: 12px; padding: 0.75rem 1rem; color: #1e293b; }
            .bb-remaining { text-align: center; background: white; border-radius: 12px; padding: 0.5rem 1rem; font-size: ${isProjector ? '32px' : '1.25rem'}; font-weight: 800; color: #3b82f6; }
            .bb-remaining small { font-weight: 600; color: #64748b; font-size: 0.6em; }
            .bb-channels { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
            .bb-channel { background: white; border-radius: 12px; padding: 1rem; text-align: center; border: 3px solid #e2e8f0; }
            .bb-channel.bb-has-tokens { border-color: #3b82f6; }
            .bb-channel-name { font-weight: 700; color: #1e293b; margin-bottom: 0.25rem; }
            .bb-channel-tokens { font-size: 2.5rem; font-weight: 800; color: #3b82f6; line-height: 1; }
            .bb-channel-stats { font-size: 0.8rem; color: #64748b; margin: 0.5rem 0; }
            .bb-controls { display: flex; gap: 0.5rem; justify-content: center; }
            .bb-btn { width: 48px; height: 48px; border-radius: 10px; border: none; font-size: 1.5rem; font-weight: 800; cursor: pointer; background: #e2e8f0; color: #1e293b; }
            .bb-btn:disabled { opacity: 0.35; cursor: not-allowed; }
            .bb-plus { background: #3b82f6; color: white; }
            .bb-outcome { text-align: center; background: rgba(255,255,255,0.92); border-radius: 12px; padding: 0.75rem; font-size: 1.1rem; margin-bottom: 0.75rem; color: #1e293b; }
            .bb-table { background: rgba(255,255,255,0.92); border-radius: 12px; padding: 0.5rem 1rem; margin-bottom: 1rem; color: #1e293b; }
            .bb-table summary { cursor: pointer; font-weight: 600; }
            .bb-table table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 0.5rem; }
            .bb-table th, .bb-table td { padding: 0.3rem 0.5rem; text-align: center; border-bottom: 1px solid #e2e8f0; }
            .bb-lock { width: 100%; padding: 1rem; font-size: 1.1rem; font-weight: 700; border: none; border-radius: 12px; background: #10b981; color: white; cursor: pointer; }
            .bb-lock:disabled { background: #94a3b8; cursor: not-allowed; }
            .bb-feedback { text-align: center; margin-top: 0.75rem; min-height: 1.5rem; color: white; font-weight: 600; }
        </style>
    `;

    renderBudgetTable();
    updateBudgetBlitzView();

    document.querySelectorAll('.bb-plus').forEach(btn => {
        btn.addEventListener('click', () => adjustBudget(btn.dataset.channel, 1));
    });
    document.querySelectorAll('.bb-minus').forEach(btn => {
        btn.addEventListener('click', () => adjustBudget(btn.dataset.channel, -1));
    });
    const lockBtn = document.getElementById('bbLockBtn');
    if (lockBtn) lockBtn.addEventListener('click', submitBudgetBlitz);
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
}

function renderBudgetTable() {
    const container = document.getElementById('bbTableBody');
    if (!container) return;
    const tokens = budgetBlitzState.tokens;
    const header = ['Channel'].concat(
        Array.from({ length: tokens }, (_, i) => `Token ${i + 1}`)
    );
    const rows = budgetBlitzState.channels.map(c => {
        const cells = (c.marginal_returns || []).map(v => `<td>${v}</td>`).join('');
        return `<tr><th scope="row">${escapeHtml(c.label || c.id)}</th>${cells}</tr>`;
    }).join('');
    container.innerHTML = `
        <table>
            <thead><tr>${header.map(h => `<th scope="col">${escapeHtml(h)}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <p style="font-size:0.8rem;color:#64748b;margin:0.5rem 0 0;">
            Each extra token in a channel adds the amount shown. Later tokens add less.
        </p>
    `;
}

function budgetSpent() {
    return Object.values(budgetBlitzState.allocation).reduce((a, b) => a + b, 0);
}

function budgetOutcome() {
    return budgetBlitzState.channels.reduce((total, channel) => {
        const count = budgetBlitzState.allocation[channel.id] || 0;
        const returns = channel.marginal_returns || [];
        return total + returns.slice(0, count).reduce((a, b) => a + b, 0);
    }, 0);
}

function adjustBudget(channelId, delta) {
    if (budgetBlitzState.submitted || budgetBlitzState.pending) return;
    const current = budgetBlitzState.allocation[channelId] || 0;
    const next = current + delta;
    if (next < 0) return;
    if (delta > 0 && budgetSpent() >= budgetBlitzState.tokens) return;
    budgetBlitzState.allocation[channelId] = next;
    updateBudgetBlitzView();

    // Tactile micro-bounce animation + mobile haptic
    const tokenEl = document.getElementById(`bbTokens-${channelId}`);
    if (tokenEl) {
        tokenEl.classList.remove('bb-token-bump');
        void tokenEl.offsetWidth;
        tokenEl.classList.add('bb-token-bump');
    }
    if (navigator.vibrate) {
        try { navigator.vibrate(18); } catch (e) {}
    }
}

function updateBudgetBlitzView() {
    const spent = budgetSpent();
    const remaining = budgetBlitzState.tokens - spent;

    const remainingEl = document.getElementById('bbRemaining');
    if (remainingEl) remainingEl.textContent = remaining;

    budgetBlitzState.channels.forEach(channel => {
        const count = budgetBlitzState.allocation[channel.id] || 0;
        const returns = channel.marginal_returns || [];
        const tokensEl = document.getElementById(`bbTokens-${channel.id}`);
        const totalEl = document.getElementById(`bbTotal-${channel.id}`);
        const nextEl = document.getElementById(`bbNext-${channel.id}`);
        const card = document.querySelector(`.bb-channel[data-channel="${channel.id}"]`);

        if (tokensEl) tokensEl.textContent = count;
        if (totalEl) totalEl.textContent = returns.slice(0, count).reduce((a, b) => a + b, 0);
        if (nextEl) nextEl.textContent = count < returns.length ? `+${returns[count]}` : '—';
        if (card) card.classList.toggle('bb-has-tokens', count > 0);
    });

    document.querySelectorAll('.bb-plus').forEach(btn => {
        btn.disabled = budgetBlitzState.submitted || remaining <= 0;
    });
    document.querySelectorAll('.bb-minus').forEach(btn => {
        btn.disabled = budgetBlitzState.submitted ||
            (budgetBlitzState.allocation[btn.dataset.channel] || 0) <= 0;
    });

    const outcomeEl = document.getElementById('bbOutcome');
    if (outcomeEl) outcomeEl.textContent = budgetOutcome();

    const lockBtn = document.getElementById('bbLockBtn');
    if (lockBtn && !budgetBlitzState.submitted && !budgetBlitzState.pending) {
        const ready = remaining === 0;
        lockBtn.disabled = !ready;
        lockBtn.textContent = ready
            ? 'Lock budget'
            : `Spend all ${budgetBlitzState.tokens} tokens to lock in`;
    }
}

function submitBudgetBlitz() {
    if (budgetBlitzState.submitted || budgetBlitzState.pending) return;
    if (budgetSpent() !== budgetBlitzState.tokens) return;

    // Pending, not accepted: only a server receipt may say "locked".
    budgetBlitzState.pending = true;
    const lockBtn = document.getElementById('bbLockBtn');
    if (lockBtn) {
        lockBtn.disabled = true;
        lockBtn.textContent = 'Sending budget…';
    }

    const sent = sendGameAction('budget_blitz_submit', {
        player_session_id: playerSession.id,
        allocation_by_channel_id: { ...budgetBlitzState.allocation },
    });
    if (!sent) {
        budgetBlitzState.pending = false;
        showBudgetFeedback('⚠️ Could not reach the game — try again.');
        updateBudgetBlitzView();
    }
}

function handleBudgetBlitzAccepted(message) {
    budgetBlitzState.pending = false;
    budgetBlitzState.submitted = true;
    if (message.allocation) {
        budgetBlitzState.allocation = { ...message.allocation };
    }
    updateBudgetBlitzView();
    const lockBtn = document.getElementById('bbLockBtn');
    if (lockBtn) {
        lockBtn.disabled = true;
        lockBtn.textContent = '✅ Budget locked';
    }
    if (typeof showLockedInStamp === 'function') {
        showLockedInStamp('feedback', {
            title: 'BUDGET COMMITTED 📊',
            message: 'Allocation locked in! Let’s see how your portfolio yields.',
            subtext: `${budgetOutcome()} ${budgetBlitzState.unit} projected`
        });
    } else {
        showBudgetFeedback('Budget locked. Waiting for the rest of the class…');
    }
}

function handleBudgetBlitzRejected(message) {
    if (!budgetBlitzState.pending) return;
    budgetBlitzState.pending = false;
    const code = message && message.code;
    if (code === 'deadline_passed' || code === 'waiting_to_enter') {
        budgetBlitzState.submitted = true;
        updateBudgetBlitzView();
        return;
    }
    updateBudgetBlitzView();
    showBudgetFeedback('⚠️ That did not go through — adjust and lock again.');
}

function handleBudgetBlitzProgress(message) {
    if (window.isProjectorMode) {
        const submitted = message.submitted || 0;
        const eligible = message.eligible || 0;
        const pct = eligible > 0 ? Math.round((submitted / eligible) * 100) : 0;
        const el = document.getElementById('bbParticipation');
        if (el) {
            el.innerHTML = `
                <div style="font-size: 36px; font-weight: 800; color: #3b82f6; margin-bottom: 12px;">
                    ${submitted} / ${eligible} Budgets Locked In
                </div>
                <div style="font-size: 48px; font-weight: 900; color: #1e293b; margin-bottom: 16px;">${pct}%</div>
                <div style="background: #e2e8f0; height: 16px; border-radius: 999px; overflow: hidden; max-width: 600px; margin: 0 auto;">
                    <div class="bb-progress-fill" style="background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; width: ${pct}%; transition: width 0.3s ease;"></div>
                </div>
            `;
        }
        return;
    }
    if (budgetBlitzState.submitted) {
        showBudgetFeedback(`Budget locked. ${message.submitted} of ${message.eligible} in.`);
    }
}

// Reconnect path: the server already holds this allocation, so the student must
// come back to it locked rather than to an empty board they could re-spend.
function restoreBudgetBlitzSubmission(accepted) {
    if (!accepted || !accepted.submitted) return;
    handleBudgetBlitzAccepted({ allocation: accepted.allocation });
}

function showBudgetFeedback(text) {
    const feedback = document.getElementById('feedback');
    if (feedback) feedback.textContent = text;
}

function startBudgetBlitzTimer(seconds, startTime) {
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
            document.querySelectorAll('.bb-btn').forEach(b => { b.disabled = true; });
            const lockBtn = document.getElementById('bbLockBtn');
            if (lockBtn && !budgetBlitzState.submitted) {
                lockBtn.disabled = true;
                lockBtn.textContent = 'Time is up';
                showBudgetFeedback('No budget submitted.');
            }
        }
    }

    tick();
    timerInterval = setInterval(tick, 200);
}

function handleBudgetBlitzResults(message) {
    window.isRoundEnded = true;
    if (typeof timerInterval !== 'undefined' && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (typeof clearSuspenseShimmer === 'function') clearSuspenseShimmer();
    if (typeof clearTimerUrgency === 'function') clearTimerUrgency();

    const gs = (message && message.game_specific) || {};
    const best = Number(gs.best_outcome) || 0;
    const unit = gs.response_unit || 'response units';
    const bestAllocation = (gs.best_allocations || [])[0] || {};
    const channels = gs.channels || budgetBlitzState.channels || [];
    const isFinalRound = (message && (message.is_final_round || (message.current_round && message.total_rounds && message.current_round >= message.total_rounds))) || false;

    if (window.isProjectorMode) {
        const playerScores = message.player_scores || [];
        const totalSubmissions = playerScores.filter(p => p.submitted).length;
        const optimalPlayers = playerScores.filter(p => p.submitted && p.outcome === best).length;
        const optimalPct = totalSubmissions > 0 ? Math.round((optimalPlayers / totalSubmissions) * 100) : 0;
        const avgYield = totalSubmissions > 0 
            ? Math.round(playerScores.filter(p => p.submitted).reduce((acc, p) => acc + (p.outcome || 0), 0) / totalSubmissions)
            : 0;
        const avgEff = (best > 0 && avgYield > 0) ? Math.round((avgYield / best) * 100) : 0;

        const optimalCards = channels.map(c => {
            const count = bestAllocation[c.id] || 0;
            const returns = c.marginal_returns || [];
            const channelYield = returns.slice(0, count).reduce((a, b) => a + b, 0);
            return `
                <div style="background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 2.5px solid #10b981; text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 8px;">${escapeHtml(c.label || c.id)}</div>
                    <div style="font-size: 52px; font-weight: 900; color: #10b981; line-height: 1;">${count}</div>
                    <div style="font-size: 16px; font-weight: 700; color: #059669; text-transform: uppercase; margin-top: 4px;">Optimal Tokens</div>
                    <div style="font-size: 18px; color: #64748b; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
                        Yield: <strong>+${channelYield}</strong> ${escapeHtml(unit)}
                    </div>
                </div>
            `;
        }).join('');

        const area = document.getElementById('gameArea');
        if (!area) return;
        area.innerHTML = `
            <div class="bb-results" style="max-width: 1400px; padding: 2.5rem; margin: 1rem auto; text-align: center; color: #1e293b; background: white; border-radius: 24px; box-shadow: 0 12px 40px rgba(0,0,0,0.12);">
                <div style="display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 24px;">
                    <span style="font-size: 48px;">🏆</span>
                    <h2 style="font-size: 44px; font-weight: 900; color: #1e293b; margin: 0;">Optimal Resource Allocation Revealed</h2>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 16px; padding: 20px;">
                        <div style="font-size: 16px; font-weight: 700; color: #166534; text-transform: uppercase;">Maximum Possible Yield</div>
                        <div style="font-size: 48px; font-weight: 900; color: #15803d; margin-top: 4px;">${best} <span style="font-size: 24px; font-weight: 700;">${escapeHtml(unit)}</span></div>
                    </div>
                    <div style="background: #eff6ff; border: 2px solid #93c5fd; border-radius: 16px; padding: 20px;">
                        <div style="font-size: 16px; font-weight: 700; color: #1e40af; text-transform: uppercase;">Hit Optimal Strategy</div>
                        <div style="font-size: 48px; font-weight: 900; color: #2563eb; margin-top: 4px;">${optimalPlayers} <span style="font-size: 24px; font-weight: 700;">(${optimalPct}%)</span></div>
                    </div>
                    <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 16px; padding: 20px;">
                        <div style="font-size: 16px; font-weight: 700; color: #475569; text-transform: uppercase;">Class Average Yield</div>
                        <div style="font-size: 48px; font-weight: 900; color: #334155; margin-top: 4px;">${avgYield} <span style="font-size: 24px; font-weight: 700;">(${avgEff}%)</span></div>
                    </div>
                </div>

                <div style="margin-bottom: 24px; text-align: left;">
                    <div style="font-size: 22px; font-weight: 800; color: #1e293b; margin-bottom: 16px;">
                        🎯 Optimal Channel Distribution
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        ${optimalCards}
                    </div>
                </div>

                ${gs.takeaway ? `
                    <div style="background: #fefce8; border: 2px solid #fef08a; border-radius: 16px; padding: 20px; font-size: 22px; color: #854d0e; text-align: left; line-height: 1.5; margin-top: 24px;">
                        💡 <strong>Instructor Takeaway:</strong> ${escapeHtml(gs.takeaway)}
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
    const labelById = Object.fromEntries(channels.map(c => [c.id, c.label || c.id]));

    // Animate score count-up and floating points celebration
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

    const efficiency = (mine && mine.submitted && best > 0) 
        ? Math.min(100, Math.round((mine.outcome / best) * 100)) 
        : 0;

    let verdictClass = 'verdict-neutral';
    let verdictIcon = '📊';
    let verdictText = 'Budget Debrief';
    let effBadgeClass = 'eff-suboptimal';

    if (mine && mine.submitted) {
        if (efficiency >= 100) {
            verdictClass = 'verdict-positive';
            verdictIcon = '🏆';
            verdictText = 'Optimal Allocation! Hit 100% of maximum yield';
            effBadgeClass = 'eff-optimal';
        } else if (efficiency >= 85) {
            verdictClass = 'verdict-positive';
            verdictIcon = '✨';
            verdictText = `Strong Portfolio! Captured ${efficiency}% of potential yield`;
            effBadgeClass = 'eff-high';
        } else {
            verdictClass = 'verdict-neutral';
            verdictIcon = '⚖️';
            verdictText = `Suboptimal Allocation (${efficiency}% yield efficiency)`;
            effBadgeClass = 'eff-suboptimal';
        }
    } else {
        verdictText = 'No budget submitted for this round.';
    }

    // Channel comparison rows
    const myAlloc = (mine && mine.allocation) || budgetBlitzState.allocation || {};
    const comparisonCards = channels.map(c => {
        const myCount = myAlloc[c.id] || 0;
        const optCount = bestAllocation[c.id] || 0;
        const match = myCount === optCount;
        return `
            <div style="background: #f8fafc; border-radius: 8px; padding: 10px 14px; border: 1.5px solid ${match ? '#10b981' : '#cbd5e1'}; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 700; color: #1e293b;">${escapeHtml(c.label || c.id)}</span>
                <div style="display: flex; gap: 10px; align-items: center; font-size: 0.9rem;">
                    <span style="color: #475569;">You: <strong style="color: ${match ? '#059669' : '#3b82f6'};">${myCount}</strong></span>
                    <span style="color: #94a3b8;">·</span>
                    <span style="color: #64748b;">Optimal: <strong style="color: #10b981;">${optCount}</strong></span>
                    ${match ? '<span style="color: #10b981; font-weight: 800;">✓</span>' : ''}
                </div>
            </div>
        `;
    }).join('');

    const area = document.getElementById('gameArea');
    if (!area) return;
    area.innerHTML = `
        <div class="bb-results">
            <div class="round-verdict-hero ${verdictClass}">
                <span>${verdictIcon}</span>
                <span>${verdictText}</span>
            </div>

            ${mine && mine.submitted ? `
                <div class="bb-efficiency-badge ${effBadgeClass}">
                    <span>⚡ Yield Efficiency: <strong>${efficiency}%</strong></span>
                    <span>•</span>
                    <span>${mine.outcome} / ${best} ${escapeHtml(unit)}</span>
                </div>
                <div style="font-size: 1.15rem; font-weight: 700; color: #10b981; margin: 8px 0 16px 0;">
                    +${mine.points} Game Points
                </div>
            ` : '<div style="margin: 12px 0; color: #64748b;">No budget was committed before timeout.</div>'}

            <div style="margin: 16px 0 12px 0; text-align: left;">
                <div style="font-size: 0.9rem; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
                    Channel Portfolio Breakdown
                </div>
                ${comparisonCards}
            </div>

            ${gs.takeaway ? `<div class="bb-takeaway">${escapeHtml(gs.takeaway)}</div>` : ''}

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
            .bb-results { background: white; border-radius: 16px; padding: 1.5rem; max-width: 620px; margin: 1rem auto; text-align: center; color: #1e293b; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
            .bb-takeaway { font-style: italic; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 0.85rem; margin-top: 1rem; font-size: 0.95rem; }
        </style>
    `;
}
