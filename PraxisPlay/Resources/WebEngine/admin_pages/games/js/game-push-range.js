/**
 * Push Range Game Module
 * Handles the Push Range game mode logic
 */

let rapidPressCount = 0;
let rapidPressWindow = null;
let cooldownActive = false;
let cooldownTimeout = null;
let myTeam = 'left';
let myPressCount = 0;
let pendingPresses = 0;
let localLeftBoundary = 0;
let localRightBoundary = 100;
let totalPlayers = 10;
let teamRosters = {left: [], right: []};

// Performance optimization: throttle roster rendering for 100-player scalability
let latestRosterUpdate = null;
let rosterRenderInterval = null;
const ROSTER_RENDER_HZ = 10;  // Update other players' counts at 10 Hz instead of 20 Hz

function showPushRangeGame(message, timeLimit) {
    const imageHTML = typeof renderQuestionImageHTML === 'function' 
        ? renderQuestionImageHTML(message.image_url) 
        : (message.image_url ? `<img src="${message.image_url}" alt="Question image" style="max-width: ${window.isProjectorMode ? '90%' : '100%'}; max-height: ${window.isProjectorMode ? '48vh' : '28vh'}; margin: 12px auto; border-radius: 12px; display: block; object-fit: contain; background: white; padding: 10px;">` : '');
    
    // Check if we're in projector mode
    const isProjector = window.isProjectorMode || false;
    
    // Clean up any existing throttled render interval from previous round
    if (rosterRenderInterval) {
        clearInterval(rosterRenderInterval);
        rosterRenderInterval = null;
        latestRosterUpdate = null;
    }
    
    // Get team assignment (only for players, not projector)
    myTeam = !isProjector && message.team_assignments?.[playerSession?.id] ? message.team_assignments[playerSession.id].team : 'left';
    myPressCount = 0;
    pendingPresses = 0;
    localLeftBoundary = 0;
    localRightBoundary = 100;
    
    // Count total players for calculating press impact
    totalPlayers = Object.keys(message.team_assignments || {}).length || 10;
    
    // Organize team rosters
    teamRosters = {left: [], right: []};
    if (message.team_assignments) {
        Object.entries(message.team_assignments).forEach(([playerId, playerData]) => {
            teamRosters[playerData.team].push({
                id: parseInt(playerId),
                name: playerData.name,
                presses: 0
            });
        });
    }
    
    // Projector Mode: White box layout matching Closest Guess style
    if (isProjector) {
        document.getElementById('gameArea').innerHTML = `
            <div class="push-range-area">
                <div class="question-display" style="display: flex; justify-content: center; align-items: center; gap: 20px; flex-wrap: nowrap; margin: 20px 0;">
                    <div class="timer" id="timer" style="font-size: 80px; font-weight: 800; color: #ef4444; text-align: center; background: white; border-radius: 16px; padding: 20px 40px; flex-shrink: 0; min-width: 120px;">${timeLimit}</div>
                    <div class="question-text" style="font-size: 48px; font-weight: 700; text-align: center; background: white; border-radius: 16px; padding: 30px 50px; color: #1e293b; flex: 1; max-width: 70%;">${message.question_text}</div>
                    <div style="font-size: 48px; font-weight: 800; color: #10b981; text-align: center; background: white; border-radius: 16px; padding: 20px 40px; flex-shrink: 0; min-width: 160px;" id="availablePoints">100 pts</div>
                </div>
                ${imageHTML}
                
                <div class="push-range-visualization" style="margin: 40px 0;">
                    <div class="push-range-bar">
                        <div class="push-range-left-fill" id="leftFill" style="width: 0%"></div>
                        <div class="push-range-right-fill" id="rightFill" style="width: 0%"></div>
                    </div>
                    
                    <div class="guess-range-bracket" id="guessRangeBracket">
                        <div class="bracket-left-edge" id="bracketLeftEdge">
                            <span class="edge-value" id="leftEdgeValue">0%</span>
                        </div>
                        <div class="bracket-bottom">
                            <div class="bracket-label">
                                <span class="range-label">GUESS RANGE</span>
                            </div>
                        </div>
                        <div class="bracket-right-edge" id="bracketRightEdge">
                            <span class="edge-value" id="rightEdgeValue">100%</span>
                        </div>
                    </div>
                </div>
                
                <div class="push-range-teams" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 1200px; margin: 20px auto;">
                    <div class="team-panel left">
                        <h4>🔵 BLUE TEAM →</h4>
                        <div id="leftTeamRoster"></div>
                    </div>
                    <div class="team-panel right">
                        <h4>← 🔴 RED TEAM</h4>
                        <div id="rightTeamRoster"></div>
                    </div>
                </div>
            </div>
        `;
        updateTeamRosters();
        return;
    }
    
    // Player Mode: Original layout
    // Left team pushes the left boundary RIGHT (closing from the left)
    // Right team pushes the right boundary LEFT (closing from the right)
    const buttonHTML = myTeam === 'left' 
        ? '<button class="push-button left" id="pushButton"><div class="push-main">PUSH →</div><div class="push-count">#<span id="myPressCount">0</span> presses</div></button>'
        : '<button class="push-button right" id="pushButton"><div class="push-main">← PUSH</div><div class="push-count">#<span id="myPressCount">0</span> presses</div></button>';
    
    document.getElementById('gameArea').innerHTML = `
        <div class="push-range-area">
            <div class="question-display">
                <div class="question-text">${message.question_text}</div>
                ${imageHTML}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                    <div class="timer" id="timer">${timeLimit}</div>
                </div>
            </div>
            
            <div class="push-range-visualization">
                <div class="push-range-bar">
                    <div class="push-range-left-fill" id="leftFill" style="width: 0%"></div>
                    <div class="push-range-right-fill" id="rightFill" style="width: 0%"></div>
                </div>
                
                <!-- Bracket-style Guess Range Indicator -->
                <div class="guess-range-bracket" id="guessRangeBracket">
                    <div class="bracket-left-edge" id="bracketLeftEdge">
                        <span class="edge-value" id="leftEdgeValue">0%</span>
                    </div>
                    <div class="bracket-bottom">
                        <div class="bracket-label">
                            <span class="range-label">GUESS RANGE</span>
                            <!-- No percentage in the middle -->
                        </div>
                    </div>
                    <div class="bracket-right-edge" id="bracketRightEdge">
                        <span class="edge-value" id="rightEdgeValue">100%</span>
                    </div>
                </div>
            </div>
            
            ${!isProjector ? `<div class="push-button-container">
                ${buttonHTML}
            </div>` : ''}

            <div class="push-range-teams" style="${isProjector ? 'display: grid; grid-template-columns: 1fr 1fr; gap: 20px; max-width: 1200px; margin: 20px auto;' : ''}">
                <div class="team-panel left">
                    <h4>🔵 BLUE TEAM →</h4>
                    <div id="leftTeamRoster"></div>
                </div>
                <div class="team-panel right">
                    <h4>← 🔴 RED TEAM</h4>
                    <div id="rightTeamRoster"></div>
                </div>
            </div>
        </div>
    `;
    
    // Render initial team rosters
    updateTeamRosters();
    
    // Attach event handlers for speed tapping (each click/tap counts once)
    const pushBtn = document.getElementById('pushButton');
    if (pushBtn) {
        let lastTouchTapTime = 0;

        // Prevent default to avoid unwanted behavior
        pushBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
        
        // Mouse click - single press per click (ignore synthetic click right after touchend)
        pushBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (Date.now() - lastTouchTapTime < 350) return;
            registerPress();
        });
        
        // Touch tap - single press per tap
        pushBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            lastTouchTapTime = Date.now();
            registerPress();
        });
        
        // Keyboard support (spacebar/Enter when focused) - prevent repeat
        pushBtn.addEventListener('keydown', (e) => {
            if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
                e.preventDefault();
                registerPress();
            }
        });
    }
}

function registerPress() {
    // Check if cooldown is active
    if (cooldownActive) {
        return; // Ignore press during cooldown
    }
    
    // Track rapid pressing (14 presses in 1 second = anti-autoclicker cooldown)
    rapidPressCount++;
    
    // Start window timer on first press
    if (!rapidPressWindow) {
        rapidPressWindow = setTimeout(() => {
            rapidPressCount = 0;
            rapidPressWindow = null;
        }, 1000);
    }
    
    // Check if exceeded limit
    if (rapidPressCount >= 14) {
        activateCooldown();
        return;
    }
    
    pendingPresses++;
    myPressCount++;
    
    // Tactile elastic spring recoil feedback + mobile haptic
    const pushBtn = document.getElementById('pushButton');
    if (pushBtn) {
        pushBtn.classList.remove('push-spring-recoil');
        void pushBtn.offsetWidth;
        pushBtn.classList.add('push-spring-recoil');
    }
    if (navigator.vibrate) {
        try { navigator.vibrate(22); } catch (e) {}
    }
    
    // INSTANT feedback for YOUR button press (no throttle)
    document.getElementById('myPressCount').textContent = myPressCount;
    
    // OPTIMISTIC UPDATE: Move bar locally for instant feedback
    // Estimate: each press moves boundary ~0.1-0.5% depending on team size
    const moveAmount = Math.min(0.5, 5 / totalPlayers);
    
    if (myTeam === 'left') {
        localLeftBoundary = Math.min(localRightBoundary - 1, localLeftBoundary + moveAmount);
    } else {
        localRightBoundary = Math.max(localLeftBoundary + 1, localRightBoundary - moveAmount);
    }
    
    updateBarsLocally();
    
    // Send batches every 100ms (handled by the interval in sendPresses)
    if (pendingPresses >= 1) {
        sendPresses();
    }
}

function activateCooldown() {
    cooldownActive = true;
    rapidPressCount = 0;
    
    if (rapidPressWindow) {
        clearTimeout(rapidPressWindow);
        rapidPressWindow = null;
    }
    
    const pushBtn = document.getElementById('pushButton');
    if (pushBtn) {
        pushBtn.disabled = true;
        pushBtn.style.opacity = '0.5';
        pushBtn.style.cursor = 'not-allowed';
        pushBtn.innerHTML = myTeam === 'left' ? '⚠️ COOL DOWN!' : '⚠️ COOL DOWN!';
    }
    
    // Countdown display
    let secondsLeft = 2;
    const countdownInterval = setInterval(() => {
        secondsLeft--;
        const pushBtn = document.getElementById('pushButton');
        if (pushBtn) {
            if (secondsLeft > 0) {
                pushBtn.innerHTML = myTeam === 'left' 
                    ? `⏱️ Cool down (${secondsLeft}s)` 
                    : `⏱️ Cool down (${secondsLeft}s)`;
            } else {
                clearInterval(countdownInterval);
                deactivateCooldown();
            }
        }
    }, 1000);
    
    // Store interval ID for cleanup
    cooldownTimeout = countdownInterval;
}

function deactivateCooldown() {
    cooldownActive = false;
    const pushBtn = document.getElementById('pushButton');
    if (pushBtn) {
        pushBtn.disabled = false;
        pushBtn.style.opacity = '1';
        pushBtn.style.cursor = 'pointer';
        pushBtn.innerHTML = myTeam === 'left' 
            ? `<div class="push-main">PUSH →</div><div class="push-count">#<span id="myPressCount">${myPressCount}</span> presses</div>`
            : `<div class="push-main">← PUSH</div><div class="push-count">#<span id="myPressCount">${myPressCount}</span> presses</div>`;
    }
}

function updateBarsLocally() {
    const leftFill = document.getElementById('leftFill');
    const rightFill = document.getElementById('rightFill');
    
    if (leftFill) leftFill.style.width = localLeftBoundary + '%';
    if (rightFill) rightFill.style.width = (100 - localRightBoundary) + '%';
    
    // Update bracket positions too
    const bracketLeftEdge = document.getElementById('bracketLeftEdge');
    const bracketRightEdge = document.getElementById('bracketRightEdge');
    const bracketBottom = document.querySelector('.bracket-bottom');
    const leftEdgeValue = document.getElementById('leftEdgeValue');
    const rightEdgeValue = document.getElementById('rightEdgeValue');
    const rangeWidthValue = document.getElementById('rangeWidthValue');
    
    const openRange = Math.round(localRightBoundary - localLeftBoundary);
    
    if (bracketLeftEdge) bracketLeftEdge.style.left = localLeftBoundary + '%';
    if (bracketRightEdge) bracketRightEdge.style.right = (100 - localRightBoundary) + '%';
    if (bracketBottom) {
        bracketBottom.style.left = localLeftBoundary + '%';
        bracketBottom.style.right = (100 - localRightBoundary) + '%';
    }
    
    if (leftEdgeValue) leftEdgeValue.textContent = localLeftBoundary.toFixed(1) + '%';
    if (rightEdgeValue) rightEdgeValue.textContent = localRightBoundary.toFixed(1) + '%';
    
    if (rangeWidthValue) {
        rangeWidthValue.textContent = openRange > 0 ? openRange + '%' : '⚠️';
        rangeWidthValue.classList.remove('danger', 'caution');
        if (openRange <= 20) {
            rangeWidthValue.classList.add('danger');
        } else if (openRange <= 40) {
            rangeWidthValue.classList.add('caution');
        }
    }
}

function sendPresses() {
    if (pendingPresses === 0) return;
    
    sendGameAction('push_range_press', {
        player_session_id: playerSession.id,
        press_count: pendingPresses,
        team: myTeam
    });
    pendingPresses = 0;
}

function handlePushRangeUpdate(message) {
    // Sync with authoritative server state
    localLeftBoundary = message.left_boundary;
    localRightBoundary = message.right_boundary;
    
    console.log('[PUSH RANGE] Updating chart:', {
        left: localLeftBoundary,
        right: localRightBoundary,
        isProjector: window.isProjectorMode
    });
    
    // Update the visual bar fills
    const leftFill = document.getElementById('leftFill');
    const rightFill = document.getElementById('rightFill');
    
    console.log('[PUSH RANGE] Chart elements:', {
        leftFill: leftFill,
        rightFill: rightFill
    });
    
    if (leftFill) {
        leftFill.style.width = localLeftBoundary + '%';
        console.log('[PUSH RANGE] Set leftFill width to:', localLeftBoundary + '%');
    }
    if (rightFill) {
        rightFill.style.width = (100 - localRightBoundary) + '%';
        console.log('[PUSH RANGE] Set rightFill width to:', (100 - localRightBoundary) + '%');
    }
    
    // Update the bracket-style guess range indicator
    const bracketLeftEdge = document.getElementById('bracketLeftEdge');
    const bracketRightEdge = document.getElementById('bracketRightEdge');
    const bracketBottom = document.querySelector('.bracket-bottom');
    const leftEdgeValue = document.getElementById('leftEdgeValue');
    const rightEdgeValue = document.getElementById('rightEdgeValue');
    const rangeWidthValue = document.getElementById('rangeWidthValue');
    
    const leftBoundary = message.left_boundary;
    const rightBoundary = message.right_boundary;
    const openRange = Math.round(rightBoundary - leftBoundary);
    
    // Position bracket edges at the boundary positions
    if (bracketLeftEdge) bracketLeftEdge.style.left = leftBoundary + '%';
    if (bracketRightEdge) bracketRightEdge.style.right = (100 - rightBoundary) + '%';
    if (bracketBottom) {
        bracketBottom.style.left = leftBoundary + '%';
        bracketBottom.style.right = (100 - rightBoundary) + '%';
    }
    
    // Update edge values with bold percentages
    if (leftEdgeValue) leftEdgeValue.textContent = leftBoundary.toFixed(1) + '%';
    if (rightEdgeValue) rightEdgeValue.textContent = rightBoundary.toFixed(1) + '%';
    
    // Update range width value with color coding
    if (rangeWidthValue) {
        rangeWidthValue.textContent = openRange > 0 ? openRange + '%' : '⚠️';
        rangeWidthValue.classList.remove('danger', 'caution');
        if (openRange <= 20) {
            rangeWidthValue.classList.add('danger');
        } else if (openRange <= 40) {
            rangeWidthValue.classList.add('caution');
        }
    }
    
    // Update team rosters with press counts (THROTTLED for performance with 100 players)
    if (message.player_presses) {
        // Always update the data model immediately
        Object.entries(message.player_presses).forEach(([playerId, playerData]) => {
            const team = playerData.team;
            const roster = teamRosters[team];
            // Safety check: roster may be undefined during game transitions
            if (!roster) {
                console.log('[PUSH RANGE] Roster undefined for team:', team, '(likely game transitioning)');
                return;
            }
            const player = roster.find(p => p.id === parseInt(playerId));
            if (player) {
                player.presses = playerData.presses;
            }
        });
        
        // Store latest roster state for throttled rendering
        latestRosterUpdate = true;
        
        // Start throttled render loop if not already running
        if (!rosterRenderInterval) {
            rosterRenderInterval = setInterval(() => {
                if (latestRosterUpdate) {
                    updateTeamRosters();
                    latestRosterUpdate = null;
                }
            }, 1000 / ROSTER_RENDER_HZ);  // 10 Hz = 100ms
        }
    }
}

function updateTeamRosters() {
    const leftRoster = document.getElementById('leftTeamRoster');
    const rightRoster = document.getElementById('rightTeamRoster');
    
    // Sort rosters by presses (descending)
    teamRosters.left.sort((a, b) => b.presses - a.presses);
    teamRosters.right.sort((a, b) => b.presses - a.presses);
    
    if (leftRoster) {
        leftRoster.innerHTML = teamRosters.left.map(player => {
            const isOwn = player.id === playerSession.id;
            return `<div class="team-member ${isOwn ? 'own' : ''}">
                <span class="player-name">${player.name}</span>
                <span class="press-count">${player.presses}</span>
            </div>`;
        }).join('');
    }
    
    if (rightRoster) {
        rightRoster.innerHTML = teamRosters.right.map(player => {
            const isOwn = player.id === playerSession.id;
            return `<div class="team-member ${isOwn ? 'own right-team' : ''}">
                <span class="player-name">${player.name}</span>
                <span class="press-count">${player.presses}</span>
            </div>`;
        }).join('');
    }
}

function showPushRangeResults(chartData) {
    if (!chartData) return '';
    
    const leftBoundary = chartData.left_boundary || 0;
    const rightBoundary = chartData.right_boundary || 100;
    const correctAnswer = chartData.correct_answer;
    
    return `
        <div class="push-range-visualization" style="margin-bottom: 40px;">
            <div class="push-range-bar">
                <div class="push-range-left-fill" style="width: ${leftBoundary}%"></div>
                <div class="push-range-right-fill" style="width: ${100 - rightBoundary}%"></div>
            </div>
            
            <div class="guess-range-bracket">
                <div class="bracket-left-edge" style="left: ${leftBoundary}%;">
                    <span class="edge-value">${leftBoundary.toFixed(1)}%</span>
                </div>
                <div class="bracket-bottom" style="left: calc(${leftBoundary}% + 25px); right: calc(${100 - rightBoundary}% + 25px);">
                    <div class="bracket-label">
                        <span class="range-label">FINAL RANGE</span>
                    </div>
                </div>
                <div class="bracket-right-edge" style="left: ${rightBoundary}%;">
                    <span class="edge-value">${rightBoundary.toFixed(1)}%</span>
                </div>
                ${correctAnswer !== undefined && correctAnswer !== null ? `
                <div style="position: absolute; left: calc(${correctAnswer}% + 25px); top: -206px; width: 6px; height: 177px; background: #10b981; border-radius: 3px; transform: translateX(-50%);">
                    <span class="edge-value" style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); color: #10b981; white-space: nowrap;">${correctAnswer}%</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function handlePushRangeResults(message) {
    const resultClass = message.is_correct ? 'success' : 'failure';
    const resultIcon = message.is_correct ? '\ud83c\udf89' : '\ud83d\ude15';
    const _prCorrect = ['The range caught it!', 'Target acquired.', 'Right in the sweet spot.', 'Perfect market coverage.', 'The interval holds.', 'That\u2019s what teamwork looks like.', 'Captured the true value.', 'Range management: elite.', 'Inside the bounds. Nice.', 'Statistically significant teamwork.'];
    const _prIncorrect = ['The range missed \u2014 so close!', 'Just outside the interval.', 'The market slipped away.', 'Needed a wider confidence band.', 'Almost had it.', 'Off by a margin of error.', 'That range needed more push.', 'The true value escaped.', 'Forecast: slightly off.', 'Recalibrate and retry.'];
    const resultText = message.is_correct ? _prCorrect[Math.floor(Math.random() * _prCorrect.length)] : _prIncorrect[Math.floor(Math.random() * _prIncorrect.length)];
    
    const topPressersHTML = message.top_pressers && message.top_pressers.length > 0 ? `
        <div class="top-pressers">
            <h4>\ud83c\udfc6 Top Tap Champions</h4>
            ${message.top_pressers.map((presser, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                const teamColor = presser.team === 'left' ? '#3b82f6' : '#ef4444';
                return `<div class="top-presser-item">
                    <span>${medal} ${presser.name}</span>
                    <span style="color: ${teamColor}; font-weight: 700;">${presser.presses} presses</span>
                </div>`;
            }).join('')}
        </div>
    ` : '';
    
    document.getElementById('gameArea').innerHTML = `
        <div class="push-range-result ${resultClass}">
            <h2>${resultIcon} ${resultText}</h2>
            <div style="font-size: 1.5rem; margin: 1rem 0;">
                <strong>Correct Answer:</strong> ${message.correct_answer}%
            </div>
            <div style="font-size: 1.25rem; margin: 1rem 0;">
                <strong>Final Range:</strong> ${message.left_boundary}% - ${message.right_boundary}%
            </div>
            ${message.is_correct ? `
                <div style="margin-top: 1rem;">
                    <div><strong>🔴 Red Team Score:</strong> ${message.team_scores.left} pts</div>
                    <div><strong>🔵 Blue Team Score:</strong> ${message.team_scores.right} pts</div>
                </div>
            ` : ''}
            ${topPressersHTML}
            <p style="margin-top: 2rem; color: #64748b;">Peek at the leaderboard to see how your team stacks up \u2192</p>
        </div>
    `;
}

function startPushRangeTimer(seconds, startTime) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const timerEl = document.getElementById('timer');
    const endTime = startTime + (seconds * 1000);
    
    function updateTimer() {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
        
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
            
            // Disable all inputs universally
            disableAllInputs();
            
            // Send final presses
            if (pendingPresses > 0) {
                sendPresses();
            }
            
            // Server authoritative timer is primary.
            // Client sends a watchdog timeout only after a 2.5s grace period if round hasn't ended.
            const timeoutRoundInstance = typeof currentRoundInstanceId !== 'undefined' ? currentRoundInstanceId : null;
            setTimeout(() => {
                const stillSameRound = typeof currentRoundInstanceId !== 'undefined' ? currentRoundInstanceId === timeoutRoundInstance : true;
                if (stillSameRound && websocket && websocket.readyState === WebSocket.OPEN) {
                    sendGameAction('push_range_timeout', {
                        player_session_id: playerSession.id
                    });
                }
            }, 2500);
        }
    }
    
    updateTimer();
    timerInterval = setInterval(updateTimer, 100);
}

// Listen for player updates to keep rosters in sync
document.addEventListener('game-player-update', (e) => {
    const players = e.detail;
    
    // Only update if we are in push_range game mode (check if UI exists)
    const leftRoster = document.getElementById('leftTeamRoster');
    if (!leftRoster) return;
    
    // Rebuild rosters from the authoritative player list
    teamRosters = {left: [], right: []};
    
    players.forEach(p => {
        // Check game_state for team assignment
        // Note: game_state is added to player object in core/consumers.py
        const team = p.game_state?.push_range_team;
        
        if (team && (team === 'left' || team === 'right')) {
            teamRosters[team].push({
                id: p.id,
                name: p.name,
                presses: p.game_state.push_range_presses || 0
            });
        }
    });
    
    updateTeamRosters();
});
