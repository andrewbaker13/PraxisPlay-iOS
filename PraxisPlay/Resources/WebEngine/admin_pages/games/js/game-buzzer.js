/**
 * Live Buzzer Game Module
 * Handles buzzer button states, time synchronization, and buzz submissions
 */

// Buzzer state
const buzzerState = {
    phase: 'RESET', // RESET, ARMED, LIVE
    roundId: null,
    releaseAtServerMs: null,
    hasBuzzed: false,
    isDisqualified: false,
    hasPenalty: false,
    falseStartPenalty: 250, // Configurable penalty (received from backend)
    rubberBandingMs: 0, // Rubber-banding handicap for winners
    wasWinnerLastRound: false, // Track if this player won last round
    myRank: null,
    clockOffsetMs: 0, // Client time ahead of server by this amount
    syncHistory: [], // Store last 5 sync measurements
    syncIntervalId: null,
    countdownIntervalId: null,
    autoResetMs: 0,
    activePlayerCount: 0,
    buzzedCount: 0,
    falseStartCount: 0
};

// Track last press time to prevent duplicate touch/click events
let lastBuzzerPressTime = 0;

// Time sync - track offset between client and server clocks
function startTimeSync() {
    console.log('[BUZZER] Starting time sync...');
    
    // Initial sync
    sendTimePing();
    
    // Start with default interval
    if (buzzerState.syncIntervalId) {
        clearInterval(buzzerState.syncIntervalId);
    }
    
    // Adaptive sync frequency: faster during active gameplay for better fairness
    function scheduleSyncInterval() {
        if (buzzerState.syncIntervalId) {
            clearInterval(buzzerState.syncIntervalId);
        }
        
        // Sync every 3 seconds during active rounds (ARMED/LIVE), every 12 seconds when idle (RESET)
        const intervalMs = (buzzerState.phase === 'ARMED' || buzzerState.phase === 'LIVE') ? 3000 : 12000;
        
        buzzerState.syncIntervalId = setInterval(() => {
            sendTimePing();
            scheduleSyncInterval(); // Re-evaluate interval based on current phase
        }, intervalMs);
    }
    
    scheduleSyncInterval();
}

function sendTimePing() {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
    const clientSendMs = Date.now();
    websocket.send(JSON.stringify({
        action: 'buzzer_time_ping',
        data: { clientSendMs }
    }));
}

function handleTimePong(data) {
    const clientReceiveMs = Date.now();
    const { clientSendMs, serverNowMs } = data;
    
    // Calculate round-trip time and one-way delay
    const rttMs = clientReceiveMs - clientSendMs;
    const owdMs = rttMs / 2;
    
    // Estimate offset: how much client is ahead of server
    const offsetMs = (clientSendMs + owdMs) - serverNowMs;
    
    console.log('[BUZZER TIME SYNC]', {
        rttMs: rttMs.toFixed(1),
        offsetMs: offsetMs.toFixed(1)
    });
    
    // Store in history (keep last 5)
    buzzerState.syncHistory.push({ rttMs, offsetMs, timestamp: clientReceiveMs });
    if (buzzerState.syncHistory.length > 5) {
        buzzerState.syncHistory.shift();
    }
    
    // Use "lowest RTT wins" strategy - most direct path
    const bestSync = buzzerState.syncHistory.reduce((best, current) => 
        current.rttMs < best.rttMs ? current : best
    );
    
    buzzerState.clockOffsetMs = bestSync.offsetMs;
    console.log('[BUZZER] Clock offset updated:', buzzerState.clockOffsetMs.toFixed(1), 'ms');
}

// Show buzzer UI
function showBuzzerUI(gameData) {
    console.log('[BUZZER] Initializing buzzer UI');
    
    const gameArea = document.getElementById('gameArea');
    gameArea.innerHTML = `
        <div class="buzzer-area">
            <div class="buzzer-status locked" id="buzzerStatus">
                \u26aa Waiting for your instructor to arm the round\u2026
            </div>

            <div id="buzzerParticipationStrip" style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap; margin: 0.75rem 0 1rem;">
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 999px; padding: 0.45rem 0.75rem; font-size: 0.85rem; font-weight: 800;">
                    Live: <span id="buzzerActiveCount">0</span>
                </div>
                <div style="background: #ecfdf5; border: 1px solid #bbf7d0; color: #166534; border-radius: 999px; padding: 0.45rem 0.75rem; font-size: 0.85rem; font-weight: 800;">
                    Buzzed: <span id="buzzerBuzzedCount">0</span>/<span id="buzzerBuzzedTotal">0</span>
                </div>
            </div>
            
            <div id="buzzerPenaltyNotice" style="display: none;" class="buzzer-penalty-notice">
                ⚠️ You have a 250ms delay this round (false start penalty)
            </div>
            
            <div class="buzzer-button-container" id="buzzerButtonContainer">
                <button class="buzzer-btn locked" id="buzzerBtn" disabled>
                    DON'T PRESS
                </button>
            </div>
            
            <div id="countdownDisplay" style="display: none; text-align: center; margin: 1rem 0; padding: 1rem; background: #fef3c7; border: 2px solid #fbbf24; border-radius: 12px; position: relative; z-index: 10;">
                <div style="font-size: 0.85rem; font-weight: 700; color: #92400e; margin-bottom: 0.25rem;">Round ends in</div>
                <div style="font-size: 2rem; font-weight: 900; color: #b45309; font-family: 'Courier New', monospace;" id="countdownTimer">--</div>
            </div>
            
            <div id="buzzerResultsDisplay" style="display: none; padding: 1rem;">
                <!-- Waiting message -->
                <div id="waitingMessage" style="text-align: center; padding: 2rem; background: #f8fafc; border-radius: 12px; margin-bottom: 1.5rem;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⏳</div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: #475569;">Hang tight \u2014 next round is loading\u2026</div>
                </div>
                
                <!-- Results sections (same style as host) -->
                <div id="playerRankedSection" style="display: none; margin-bottom: 1.5rem;">
                    <div style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 6px;">
                        🏆 Buzz Order
                    </div>
                    <div id="playerRankedList"></div>
                </div>
                
                <div id="playerFalseStartSection" style="display: none; margin-bottom: 1.5rem;">
                    <div style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 6px;">
                        ❌ False Starts
                    </div>
                    <div id="playerFalseStartList"></div>
                </div>
                
                <div id="playerNoBuzzSection" style="display: none; margin-bottom: 1.5rem;">
                    <div style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 6px;">
                        💤 Didn't Buzz
                    </div>
                    <div id="playerNoBuzzList"></div>
                </div>
            </div>
            
            <div id="buzzerRankDisplay" style="display: none;" class="buzzer-rank-display">
                <div class="buzzer-rank-number" id="buzzerRankNumber">-</div>
                <div class="buzzer-rank-label" id="buzzerRankLabel">Your Rank</div>
            </div>
            
            <div id="buzzerTop3" style="display: none;" class="buzzer-top-3">
                <h3>🏆 Top 3</h3>
                <div id="buzzerTop3List"></div>
            </div>
        </div>
    `;
    
    // Attach button events - touchstart for reliable mobile, click for desktop fallback
    const buzzerBtn = document.getElementById('buzzerBtn');
    buzzerBtn.addEventListener('touchstart', handleBuzzerPress);
    buzzerBtn.addEventListener('click', handleBuzzerPress);
    
    // Start time synchronization
    startTimeSync();
}

// Handle buzzer button press
function handleBuzzerPress(event) {
    const now = Date.now();
    
    // Prevent duplicate events within 100ms (touch + synthesized click)
    if (now - lastBuzzerPressTime < 100) {
        return;
    }
    lastBuzzerPressTime = now;
    
    // Prevent synthesized click after touchstart
    if (event.type === 'touchstart') {
        event.preventDefault();
    }
    
    // Check if disqualified
    if (buzzerState.isDisqualified) {
        console.log('[BUZZER] ⚠️ PRESS BLOCKED - isDisqualified=true (this may indicate a bug if not in a false-start round)');
        console.log('[BUZZER] Current phase:', buzzerState.phase, 'roundId:', buzzerState.roundId);
        return;
    }
    
    // Check if already buzzed
    if (buzzerState.hasBuzzed) {
        console.log('[BUZZER] Ignoring press - already buzzed');
        return;
    }
    
    // Check current phase
    if (buzzerState.phase === 'LOCKED' || buzzerState.phase === 'ARMED' || buzzerState.phase === 'LIVE_SCHEDULED') {
        // FALSE START!
        console.log('[BUZZER] FALSE START - pressed while locked/armed/scheduled (phase:', buzzerState.phase, ')');
        buzzerState.isDisqualified = true;
        buzzerState.hasBuzzed = true;
        
        // Show dramatic punishment overlay
        const buzzerArea = document.querySelector('.buzzer-area');
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(239, 68, 68, 0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: redFlash 0.5s ease-out;
        `;
        overlay.innerHTML = `
            <div style="font-size: 5rem; margin-bottom: 1rem; animation: shakeText 0.5s ease-in-out;">⚠️</div>
            <div style="font-size: 2.5rem; font-weight: 900; color: white; text-transform: uppercase; letter-spacing: 0.1em; text-shadow: 0 4px 8px rgba(0,0,0,0.3); animation: shakeText 0.5s ease-in-out;">TOO EARLY!</div>
            <div style="font-size: 1.2rem; font-weight: 600; color: white; margin-top: 1rem; opacity: 0.9;">Disqualified this round</div>
        `;
        
        // Add flash animation styles if not already present
        if (!document.getElementById('falseStartStyles')) {
            const style = document.createElement('style');
            style.id = 'falseStartStyles';
            style.textContent = `
                @keyframes redFlash {
                    0% { opacity: 0; }
                    10% { opacity: 1; background: rgba(239, 68, 68, 0.95); }
                    100% { opacity: 0; }
                }
                @keyframes shakeText {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-15px); }
                    20%, 40%, 60%, 80% { transform: translateX(15px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 500);
        
        websocket.send(JSON.stringify({
            action: 'buzzer_false_start',
            data: {
                roundId: buzzerState.roundId,
                pressClientMs: now
            }
        }));
        
        updateBuzzerButton('disqualified', '❌ FALSE START', true);
        updateBuzzerStatus('disqualified', 'FALSE START — OUT THIS ROUND');
        return;
    }
    
    if (buzzerState.phase === 'LIVE') {
        // Valid buzz!
        console.log('[BUZZER] Valid buzz!');
        buzzerState.hasBuzzed = true;
        
        // Calculate server timestamp estimate
        const pressServerMsEstimate = now - buzzerState.clockOffsetMs;
        
        websocket.send(JSON.stringify({
            action: 'buzzer_buzz',
            data: {
                roundId: buzzerState.roundId,
                pressServerMsEstimate
            }
        }));
        
        updateBuzzerButton('buzzed', '✓ LOCKED IN', true);
        updateBuzzerStatus('buzzed', 'Buzz recorded! Waiting for your rank\u2026');
    }
}

// Handle buzzer state updates from server
function handleBuzzerArm(data) {
    console.log('[BUZZER] Round armed:', data);
    console.log('[BUZZER] Previous state - isDisqualified:', buzzerState.isDisqualified, 'hasBuzzed:', buzzerState.hasBuzzed);
    
    buzzerState.phase = 'ARMED';
    buzzerState.roundId = data.roundId;
    buzzerState.hasBuzzed = false;
    buzzerState.isDisqualified = false;
    buzzerState.myRank = null;
    buzzerState.releaseAtServerMs = null;
    
    console.log('[BUZZER] State reset - isDisqualified:', buzzerState.isDisqualified, 'hasBuzzed:', buzzerState.hasBuzzed);
    
    // Show button, hide results
    document.getElementById('buzzerButtonContainer').style.display = 'block';
    document.getElementById('buzzerResultsDisplay').style.display = 'none';
    
    // Store penalty setting if provided
    if (data.falseStartPenalty !== undefined) {
        buzzerState.falseStartPenalty = data.falseStartPenalty;
    }
    
    // Store rubber-banding setting and check if this player won last round
    if (data.rubberBandingMs !== undefined) {
        buzzerState.rubberBandingMs = data.rubberBandingMs;
    }
    
    const playerSession = JSON.parse(sessionStorage.getItem('playerSession') || '{}');
    const myPlayerId = playerSession.id;
    
    // Check if this player won last round (gets rubber-banding handicap)
    if (data.lastRoundWinnerId && data.lastRoundWinnerId === myPlayerId && buzzerState.rubberBandingMs > 0) {
        buzzerState.wasWinnerLastRound = true;
        console.log(`[BUZZER] Player won last round - will receive +${buzzerState.rubberBandingMs}ms hidden handicap`);
    } else {
        buzzerState.wasWinnerLastRound = false;
    }
    
    // Check if this player has a penalty
    const penalizedPlayerIds = data.penalizedPlayerIds || [];
    
    if (penalizedPlayerIds.includes(myPlayerId)) {
        buzzerState.hasPenalty = true;
        console.log(`[BUZZER] Player ${myPlayerId} has penalty: +${buzzerState.falseStartPenalty}ms delay`);
    } else {
        buzzerState.hasPenalty = false;
    }
    
    // Clear rank display
    document.getElementById('buzzerRankDisplay').style.display = 'none';
    document.getElementById('buzzerTop3').style.display = 'none';
    
    // Clear countdown
    clearCountdown();
    
    // Show penalty notice if applicable
    const penaltyNotice = document.getElementById('buzzerPenaltyNotice');
    if (buzzerState.hasPenalty) {
        const penaltyText = buzzerState.falseStartPenalty === 0 
            ? 'No delay penalty (but still disqualified last round)'
            : `${buzzerState.falseStartPenalty}ms delay this round (false start penalty)`;
        penaltyNotice.innerHTML = `⚠️ ${penaltyText}`;
        penaltyNotice.style.display = 'block';
    } else {
        penaltyNotice.style.display = 'none';
    }
    
    updateBuzzerButton('locked', 'DON\'T PRESS', false);
    updateBuzzerStatus('locked', '🔶 Round armed - button will turn green soon...');
    
    // Refresh time sync immediately when round arms (gives ~200-500ms for response before ENABLE)
    // This ensures we have a fresh clock offset before the button goes live
    sendTimePing();
}

function handleBuzzerEnable(data) {
    console.log('[BUZZER] Buzzer enabled:', data);
    
    // DEFENSIVE RESET: Additional safeguard in case ARM handler didn't fire
    // Only reset if not already buzzed in this round
    if (!buzzerState.hasBuzzed) {
        buzzerState.isDisqualified = false;
        console.log('[BUZZER] Enable - defensive reset of isDisqualified flag');
    }
    
    // Set to LIVE_SCHEDULED - not actually live until release time!
    buzzerState.phase = 'LIVE_SCHEDULED';
    buzzerState.releaseAtServerMs = data.releaseAtServerMs;
    buzzerState.autoResetMs = data.autoResetMs || 0;
    
    console.log('[BUZZER] Phase set to LIVE_SCHEDULED - will go LIVE at release time');
    console.log('[BUZZER] Auto-reset value received:', buzzerState.autoResetMs);
    
    // Store penalty setting. `??`, not `||`: a configured zero is a real
    // setting meaning no delay, and was being replaced by the 250ms default.
    buzzerState.falseStartPenalty = data.falseStartPenalty ?? 250;
    
    // Calculate when to show green button
    const serverNow = Date.now() - buzzerState.clockOffsetMs;
    let delayMs = buzzerState.releaseAtServerMs - serverNow;
    
    // Apply false start penalty if present
    if (buzzerState.hasPenalty) {
        delayMs += buzzerState.falseStartPenalty;
        console.log(`[BUZZER] False start penalty applied: +${buzzerState.falseStartPenalty}ms delay`);
        // Clear penalty after applying
        buzzerState.hasPenalty = false;
    }
    
    // Apply rubber-banding handicap if player won last round (hidden from player)
    if (buzzerState.wasWinnerLastRound) {
        delayMs += buzzerState.rubberBandingMs;
        console.log(`[BUZZER] 🎯 Rubber-banding handicap applied: +${buzzerState.rubberBandingMs}ms (hidden)`);
        // Clear flag after applying
        buzzerState.wasWinnerLastRound = false;
    }
    
    updateBuzzerStatus('locked', '🟡 Get ready...');
    
    // Schedule BOTH button UI update AND phase transition to LIVE at the same time
    setTimeout(() => {
        if (!buzzerState.hasBuzzed && !buzzerState.isDisqualified) {
            // Now it's actually LIVE - button and phase sync!
            buzzerState.phase = 'LIVE';
            console.log('[BUZZER] Phase transitioned to LIVE - button is now active!');
            
            updateBuzzerButton('live', '🟢 BUZZ IN', false);
            updateBuzzerStatus('live', '🟢 BUZZ NOW!');
        }
    }, Math.max(0, delayMs));
    
    // Start countdown if auto-reset is enabled
    if (buzzerState.autoResetMs > 0) {
        startCountdown(buzzerState.autoResetMs);
    }
}

function handleBuzzerReset(data) {
    console.log('[BUZZER] Round reset:', data);
    
    buzzerState.phase = 'RESET';
    
    // DEFENSIVE RESET: Clear disqualified/buzzed state to prevent permanent lockout
    // This ensures player can participate in next round even if ARM message is missed
    buzzerState.isDisqualified = false;
    buzzerState.hasBuzzed = false;
    console.log('[BUZZER] Reset - cleared isDisqualified and hasBuzzed flags');
    
    // Clear countdown
    clearCountdown();
    
    // Hide button, show results
    document.getElementById('buzzerButtonContainer').style.display = 'none';
    document.getElementById('buzzerResultsDisplay').style.display = 'block';
    
    // Show results if available
    if (data.rankedBuzzers || data.falseStarts || data.allPlayers) {
        displayFullResults(data);
    }
    
    updateBuzzerStatus('locked', '\u26aa Round over \u2014 next one\'s coming\u2026');
}

function handleBuzzerState(data) {
    console.log('[BUZZER] Buzzer state update:', data);

    if (data.target_player_id !== undefined && typeof playerSession !== 'undefined' && playerSession && String(data.target_player_id) !== String(playerSession.id)) {
        console.log('[BUZZER] Ignoring targeted state for another player:', data.target_player_id);
        return;
    }

    // SAFETY NET: If the buzzer DOM hasn't been built yet (e.g. mid-game reload
    // before a fresh `game_started` arrives), bootstrap it now so that subsequent
    // rank/top3/penalty updates and `buzzer_arm`/`buzzer_enable` messages have
    // elements to target. Server-side resync should normally cover this, but this
    // keeps the client resilient against older backends.
    if (!document.getElementById('buzzerBtn') && typeof showBuzzerUI === 'function') {
        console.log('[BUZZER] No buzzer DOM detected on state update — bootstrapping UI');
        showBuzzerUI({});
    }

    // Update rank if provided
    if (data.myRank !== undefined && data.myRank !== null) {
        displayMyRank(data.myRank);
    }
    
    // Update top 3 if provided
    if (data.top3) {
        displayTop3(data.top3);
    }
    
    // Update penalty status
    if (data.hasPenaltyNextRound !== undefined) {
        buzzerState.hasPenalty = data.hasPenaltyNextRound;
    }

    updateBuzzerParticipation(data);

    if (data.message) {
        updateBuzzerStatus('locked', data.message);
    }
}

function handleBuzzerRosterUpdate(data) {
    console.log('[BUZZER] Roster update:', data);
    updateBuzzerParticipation({
        activePlayerCount: data.summary ? data.summary.live : undefined,
        buzzedCount: data.summary ? data.summary.buzzed : undefined,
        falseStartCount: data.summary ? data.summary.falseStarts : undefined
    });
}

function updateBuzzerParticipation(data) {
    if (!data) return;
    if (data.activePlayerCount !== undefined) buzzerState.activePlayerCount = data.activePlayerCount;
    if (data.buzzedCount !== undefined) buzzerState.buzzedCount = data.buzzedCount;
    if (data.falseStartCount !== undefined) buzzerState.falseStartCount = data.falseStartCount;

    const activeEl = document.getElementById('buzzerActiveCount');
    const buzzedEl = document.getElementById('buzzerBuzzedCount');
    const totalEl = document.getElementById('buzzerBuzzedTotal');
    if (activeEl) activeEl.textContent = buzzerState.activePlayerCount || 0;
    if (buzzedEl) buzzedEl.textContent = buzzerState.buzzedCount || 0;
    if (totalEl) totalEl.textContent = buzzerState.activePlayerCount || 0;
}

function displayMyRank(rank) {
    buzzerState.myRank = rank;
    
    const rankDisplay = document.getElementById('buzzerRankDisplay');
    const rankNumber = document.getElementById('buzzerRankNumber');
    const rankLabel = document.getElementById('buzzerRankLabel');
    
    rankDisplay.style.display = 'block';
    rankNumber.textContent = `#${rank}`;
    
    // Apply medal colors
    rankNumber.className = 'buzzer-rank-number';
    if (rank === 1) {
        rankNumber.classList.add('first');
        rankLabel.textContent = '🥇 First Place!';
        rankDisplay.classList.add('ranked');
    } else if (rank === 2) {
        rankNumber.classList.add('second');
        rankLabel.textContent = '🥈 Second Place!';
        rankDisplay.classList.add('ranked');
    } else if (rank === 3) {
        rankNumber.classList.add('third');
        rankLabel.textContent = '🥉 Third Place!';
        rankDisplay.classList.add('ranked');
    } else {
        rankLabel.textContent = 'Your Rank';
    }
}

function displayTop3(top3) {
    const top3Container = document.getElementById('buzzerTop3');
    const top3List = document.getElementById('buzzerTop3List');
    
    if (!top3 || top3.length === 0) return;
    
    top3Container.style.display = 'block';
    
    top3List.innerHTML = top3.map((player, index) => `
        <div class="buzzer-top-item">
            <span><strong>#${index + 1}</strong> ${player.name}</span>
            <span>${player.timeMs ? `${player.timeMs.toFixed(0)}ms` : '-'}</span>
        </div>
    `).join('');
}

function displayBuzzerResults(data) {
    // Show all ranked buzzers
    if (data.rankedBuzzers) {
        const myPlayerId = window.playerSessionId;
        const myBuzz = data.rankedBuzzers.find(b => b.playerId === myPlayerId);
        
        if (myBuzz) {
            displayMyRank(myBuzz.rank);
        } else if (!buzzerState.isDisqualified) {
            // Player didn't buzz
            updateBuzzerStatus('locked', '💤 You didn\'t buzz this round');
        }
        
        // Show top 3
        const top3 = data.rankedBuzzers.slice(0, 3).map(b => ({
            name: b.playerName,
            timeMs: b.timeAfterReleaseMs
        }));
        displayTop3(top3);
    }
}

function displayFullResults(data) {
    console.log('[BUZZER] Displaying full results:', data);
    
    const rankedSection = document.getElementById('playerRankedSection');
    const rankedList = document.getElementById('playerRankedList');
    const falseStartSection = document.getElementById('playerFalseStartSection');
    const falseStartList = document.getElementById('playerFalseStartList');
    const noBuzzSection = document.getElementById('playerNoBuzzSection');
    const noBuzzList = document.getElementById('playerNoBuzzList');
    
    // Get my player ID to highlight my entry
    const playerSession = JSON.parse(sessionStorage.getItem('playerSession') || '{}');
    const myPlayerId = playerSession.id;
    
    // Display ranked buzzers
    if (data.rankedBuzzers && data.rankedBuzzers.length > 0) {
        rankedSection.style.display = 'block';
        rankedList.innerHTML = data.rankedBuzzers.map(buzz => {
            const isMe = buzz.playerId === myPlayerId;
            const rank = buzz.rank;
            
            // Dramatic styling based on rank
            let cardStyle, rankStyle, borderColor, bgGradient;
            
            if (rank === 1) {
                // GOLD PODIUM - Huge and special
                cardStyle = 'padding: 1.5rem; font-size: 1.1rem; box-shadow: 0 8px 20px rgba(251, 191, 36, 0.4); transform: scale(1.05);';
                rankStyle = 'font-size: 3rem; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 2px 4px rgba(251, 191, 36, 0.5));';
                borderColor = '#fbbf24';
                bgGradient = 'background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, white 100%);';
            } else if (rank === 2) {
                // SILVER - Notable
                cardStyle = 'padding: 1.2rem; box-shadow: 0 4px 12px rgba(148, 163, 184, 0.3);';
                rankStyle = 'font-size: 2.2rem; background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;';
                borderColor = '#cbd5e1';
                bgGradient = 'background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, white 100%);';
            } else if (rank === 3) {
                // BRONZE - Respectable
                cardStyle = 'padding: 1.2rem; box-shadow: 0 4px 12px rgba(180, 83, 9, 0.2);';
                rankStyle = 'font-size: 2.2rem; color: #cd7f32; filter: drop-shadow(0 1px 2px rgba(180, 83, 9, 0.3));';
                borderColor = '#d97706';
                bgGradient = 'background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, white 100%);';
            } else if (rank <= data.rankedBuzzers.length * 0.25) {
                // Top 25% - Green (good job)
                cardStyle = 'padding: 0.9rem;';
                rankStyle = 'font-size: 1.8rem; color: #10b981;';
                borderColor = '#10b981';
                bgGradient = 'background: linear-gradient(90deg, #d1fae5 0%, white 100%);';
            } else if (rank <= data.rankedBuzzers.length * 0.75) {
                // Middle 50% - Yellow (okay)
                cardStyle = 'padding: 0.9rem;';
                rankStyle = 'font-size: 1.8rem; color: #f59e0b;';
                borderColor = '#f59e0b';
                bgGradient = 'background: white;';
            } else {
                // Bottom 25% - Red/Pink (room to improve)
                cardStyle = 'padding: 0.9rem;';
                rankStyle = 'font-size: 1.8rem; color: #ef4444;';
                borderColor = '#fecaca';
                bgGradient = 'background: linear-gradient(90deg, #fee2e2 0%, white 100%);';
            }
            
            // Enhanced YOU highlighting
            const youHighlight = isMe ? `
                border: 3px solid #3b82f6 !important;
                box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2), 0 8px 16px rgba(59, 130, 246, 0.3) !important;
                animation: pulseYou 2s ease-in-out infinite;
                position: relative;
            ` : '';
            
            const youBadge = isMe ? `
                <div style="position: absolute; top: -12px; right: 10px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 0.4rem 0.8rem; border-radius: 12px; font-size: 0.75rem; font-weight: 900; box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4); letter-spacing: 0.05em;">
                    🎯 YOU
                </div>
            ` : '';
            
            // Add animation style for YOU pulsing
            if (isMe && !document.getElementById('youPulseStyle')) {
                const style = document.createElement('style');
                style.id = 'youPulseStyle';
                style.textContent = `
                    @keyframes pulseYou {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.02); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            return `
                <div style="${bgGradient} border: 2px solid ${borderColor}; border-radius: 12px; ${cardStyle} margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; ${youHighlight} transition: all 0.3s ease;">
                    ${youBadge}
                    <div style="${rankStyle} font-weight: 900; width: 50px; text-align: center;">
                        ${rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">${buzz.playerName}</div>
                        <div style="font-size: 0.85rem; color: #64748b; font-family: 'Courier New', monospace; font-weight: 600;">+${buzz.timeAfterReleaseMs.toFixed(0)}ms</div>
                    </div>
                    ${buzz.hadPenalty ? '<div style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.65rem; font-weight: 800; background: #f59e0b; color: white;">PENALTY</div>' : ''}
                </div>
            `;
        }).join('');
    } else {
        rankedSection.style.display = 'none';
    }
    
    // Display false starts
    if (data.falseStarts && data.falseStarts.length > 0) {
        falseStartSection.style.display = 'block';
        falseStartList.innerHTML = data.falseStarts.map(player => {
            const isMe = player.playerId === myPlayerId;
            const highlightStyle = isMe ? 'background: linear-gradient(90deg, #fee2e2 0%, white 100%); border: 2px solid #ef4444;' : '';
            
            return `
                <div style="background: white; border: 2px solid #e2e8f0; border-left: 4px solid #ef4444; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; ${highlightStyle}">
                    <div style="flex: 1;">
                        <div style="font-size: 0.95rem; font-weight: 700; color: #1e293b;">${player.playerName}${isMe ? ' (You)' : ''}</div>
                        <div style="font-size: 0.8rem; color: #64748b;">Pressed while locked</div>
                    </div>
                    <div style="padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.65rem; font-weight: 800; background: #ef4444; color: white;">FALSE START</div>
                </div>
            `;
        }).join('');
    } else {
        falseStartSection.style.display = 'none';
    }
    
    // Display no buzz players
    if (data.rankedBuzzers && data.falseStarts && data.allPlayers) {
        const buzzedIds = new Set([
            ...data.rankedBuzzers.map(b => b.playerId),
            ...data.falseStarts.map(f => f.playerId)
        ]);
        
        const noBuzzPlayers = data.allPlayers.filter(p => !buzzedIds.has(p.id));
        
        if (noBuzzPlayers.length > 0) {
            noBuzzSection.style.display = 'block';
            noBuzzList.innerHTML = noBuzzPlayers.map(player => {
                const isMe = player.id === myPlayerId;
                const playerName = player.display_name || player.guest_name || player.username || `Player ${player.id}`;
                const highlightStyle = isMe ? 'background: linear-gradient(90deg, #f1f5f9 0%, white 100%); border: 2px solid #94a3b8;' : '';
                
                return `
                    <div style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; ${highlightStyle}">
                        <div style="font-size: 0.95rem; font-weight: 700; color: #1e293b;">${playerName}${isMe ? ' (You)' : ''}</div>
                        <div style="font-size: 0.8rem; color: #64748b;">No buzz this round</div>
                    </div>
                `;
            }).join('');
        } else {
            noBuzzSection.style.display = 'none';
        }
    }
}

function updateBuzzerButton(state, text, disabled) {
    const btn = document.getElementById('buzzerBtn');
    btn.className = `buzzer-btn ${state}`;
    btn.textContent = text;
    btn.disabled = disabled;
}

function updateBuzzerStatus(state, text) {
    const status = document.getElementById('buzzerStatus');
    status.className = `buzzer-status ${state}`;
    status.textContent = text;
}

// Countdown timer functions
function startCountdown(durationMs) {
    console.log('[BUZZER] Starting countdown:', durationMs, 'ms');
    
    clearCountdown();
    
    const countdownDisplay = document.getElementById('countdownDisplay');
    const countdownTimer = document.getElementById('countdownTimer');
    
    console.log('[BUZZER] Countdown elements:', countdownDisplay, countdownTimer);
    
    if (!countdownDisplay || !countdownTimer) {
        console.error('[BUZZER] Countdown elements not found!');
        return;
    }
    
    countdownDisplay.style.display = 'block';
    console.log('[BUZZER] Countdown display set to visible');
    
    let endTime = Date.now() + durationMs;
    
    function updateTimer() {
        const remaining = Math.max(0, endTime - Date.now());
        const seconds = (remaining / 1000).toFixed(1);
        
        countdownTimer.textContent = `${seconds}s`;
        
        // Change color as time runs out
        if (remaining <= 3000) {
            countdownDisplay.style.background = '#fee2e2';
            countdownDisplay.style.borderColor = '#ef4444';
            countdownTimer.style.color = '#dc2626';
        } else if (remaining <= 5000) {
            countdownDisplay.style.background = '#fef3c7';
            countdownDisplay.style.borderColor = '#fbbf24';
            countdownTimer.style.color = '#b45309';
        }
        
        if (remaining <= 0) {
            clearCountdown();
        }
    }
    
    // Update immediately
    updateTimer();
    
    // Update every 100ms for smooth countdown
    buzzerState.countdownIntervalId = setInterval(updateTimer, 100);
    console.log('[BUZZER] Countdown interval started');
}

function clearCountdown() {
    if (buzzerState.countdownIntervalId) {
        clearInterval(buzzerState.countdownIntervalId);
        buzzerState.countdownIntervalId = null;
    }
    
    const countdownDisplay = document.getElementById('countdownDisplay');
    if (countdownDisplay) {
        countdownDisplay.style.display = 'none';
    }
}

// Register buzzer message handlers
if (window.registerGameHandler) {
    window.registerGameHandler('buzzer_arm', handleBuzzerArm);
    window.registerGameHandler('buzzer_enable', handleBuzzerEnable);
    window.registerGameHandler('buzzer_reset', handleBuzzerReset);
    window.registerGameHandler('buzzer_state', handleBuzzerState);
    window.registerGameHandler('buzzer_roster_update', handleBuzzerRosterUpdate);
    window.registerGameHandler('buzzer_time_pong', handleTimePong);
}

// Hide leaderboard for buzzer game (not relevant)
const leaderboard = document.getElementById('leaderboard');
if (leaderboard) {
    leaderboard.style.display = 'none';
}

// Cleanup on disconnect
window.addEventListener('beforeunload', () => {
    if (buzzerState.syncIntervalId) {
        clearInterval(buzzerState.syncIntervalId);
    }
    if (buzzerState.countdownIntervalId) {
        clearInterval(buzzerState.countdownIntervalId);
    }
});

console.log('[BUZZER] Module loaded');
