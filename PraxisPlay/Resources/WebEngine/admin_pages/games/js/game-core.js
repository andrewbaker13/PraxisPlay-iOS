/**
 * Game Core
 * Handles WebSocket connection, message routing, and global game state
 */

// Rotating between-round messages
var _betweenRoundLines = [
    'Next round incoming\u2026',
    'Stretch those thumbs\u2026',
    'Recounting the scores\u2026 for drama.',
    'Your instructor is picking the next question\u2026',
    'Deep breaths. You\u2019ve got this.',
    'Plot twist coming in 3\u2026 2\u2026',
    'Quick \u2014 pretend you have a strategy.',
    'The market is volatile. So is this leaderboard.',
    'Recalculating everyone\u2019s brand equity\u2026',
    'Adjusting for heteroscedasticity\u2026 just kidding.',
    'Your p-value is showing.',
    'This is the intermission. Act casual.',
    'Coefficients are shifting. Stay alert.',
    'Refreshing the competitive landscape\u2026',
];
function _pickBetweenRound() { return _betweenRoundLines[Math.floor(Math.random() * _betweenRoundLines.length)]; }

const API_BASE = window.API_BASE;
const WS_BASE = window.WS_BASE;

// 🚧 DEV MODE - Mock WebSocket for UI testing without backend
class MockWebSocket {
    constructor(url) {
        console.log('🚧 MockWebSocket created:', url);
        this.url = url;
        this.readyState = 0; // CONNECTING
        
        // Simulate connection opening
        setTimeout(() => {
            this.readyState = 1; // OPEN
            if (this.onopen) {
                console.log('🚧 MockWebSocket: Triggering onopen');
                this.onopen({});
            }
            
            // Load snapshot data
            this.loadSnapshot();
        }, 100);
    }
    
    async loadSnapshot() {
        try {
            const snapshotPath = window.DEV_SNAPSHOT_PATH;
            console.log('🚧 Loading snapshot from:', snapshotPath);
            
            const response = await fetch(snapshotPath);
            if (!response.ok) {
                throw new Error(`Failed to load snapshot: ${response.status}`);
            }
            
            const snapshot = await response.json();
            console.log('🚧 Snapshot loaded:', snapshot.type);
            
            // 🚧 DEV MODE: Dynamically update timestamps to "now" so timer doesn't instantly expire
            if (snapshot.type === 'game_started' && snapshot.start_time) {
                const now = new Date().toISOString();
                console.log(`🚧 Updating start_time from ${snapshot.start_time} to ${now}`);
                snapshot.start_time = now;
                
                // Override time limit to 30 seconds for faster dev testing
                console.log(`🚧 Overriding game_time_limit from ${snapshot.game_time_limit} to 30 seconds`);
                snapshot.game_time_limit = 30;
            }
            
            // Send snapshot message to game handler
            setTimeout(() => {
                if (this.onmessage) {
                    console.log('🚧 MockWebSocket: Sending snapshot message');
                    this.onmessage({ data: JSON.stringify(snapshot) });
                }
                
                // 🚧 DEV MODE: Send initial leaderboard if snapshot has one
                if (snapshot.leaderboard) {
                    setTimeout(() => {
                        console.log('🚧 MockWebSocket: Sending initial leaderboard');
                        this.simulateMessage({
                            type: 'leaderboard_update',
                            leaderboard: snapshot.leaderboard
                        });
                    }, 300);
                }
                
                // 🚧 DEV MODE: For projector, simulate players list
                if (snapshot.players && window.isProjectorMode) {
                    setTimeout(() => {
                        console.log('🚧 MockWebSocket: Sending player list for projector');
                        this.simulateMessage({
                            type: 'player_list_update',
                            players: snapshot.players
                        });
                    }, 400);
                }
                
                // 🚧 DEV MODE: For push_range, send periodic boundary updates
                if (snapshot.game_type === 'push_range' && snapshot.team_assignments) {
                    // Cooperative state shared with Solo Mode MockWebSocket.send so player taps persist
                    this.__pushState = {
                        leftBoundary: typeof snapshot.left_boundary === 'number' ? snapshot.left_boundary : 15,
                        rightBoundary: typeof snapshot.right_boundary === 'number' ? snapshot.right_boundary : 85,
                        myPresses: 0,
                        peerPresses: {
                            '100': 4, '101': 3, '102': 5, '103': 2,
                            '104': 6, '105': 4, '106': 5, '107': 3, '108': 4
                        }
                    };
                    if (this.__pushUpdateInterval) clearInterval(this.__pushUpdateInterval);
                    const updateInterval = setInterval(() => {
                        if (window.isRoundEnded) {
                            clearInterval(updateInterval);
                            return;
                        }
                        const st = this.__pushState;
                        // Simulate active bots on both teams while preserving player's real presses
                        st.leftBoundary = Math.min(st.rightBoundary - 4, st.leftBoundary + (Math.random() * 1.4));
                        st.rightBoundary = Math.max(st.leftBoundary + 4, st.rightBoundary - (Math.random() * 1.8));
                        Object.keys(st.peerPresses).forEach(pid => {
                            if (Math.random() > 0.35) st.peerPresses[pid] += Math.floor(Math.random() * 3) + 1;
                        });
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
                    }, 1500);
                    this.__pushUpdateInterval = updateInterval;
                    
                    // Stop updates after 30 seconds (or time limit)
                    setTimeout(() => clearInterval(updateInterval), (snapshot.game_time_limit || 30) * 1000);
                }
                
                // 🚧 DEV MODE: For closest_guess, send submitted_ranges as range_submitted messages
                if (snapshot.submitted_ranges && snapshot.game_type === 'closest_guess') {
                    snapshot.submitted_ranges.forEach((range, index) => {
                        setTimeout(() => {
                            console.log(`🚧 MockWebSocket: Sending range submission from ${range.player_name}`);
                            this.simulateMessage({
                                type: 'range_submitted',
                                player_id: range.player_id,
                                player_name: range.player_name,
                                guess_min: range.min,
                                guess_max: range.max
                            });
                        }, 500 + (index * 150));
                    });
                }
                
                // 🚧 DEV MODE: For crowd_wisdom, send distribution updates
                if (snapshot.distribution_updates && snapshot.game_type === 'crowd_wisdom') {
                    snapshot.distribution_updates.forEach((update) => {
                        setTimeout(() => {
                            console.log(`🚧 MockWebSocket: Sending crowd wisdom distribution update`);
                            this.simulateMessage({
                                type: 'crowd_wisdom_distribution',
                                distribution: update.distribution,
                                percent_answered: update.percent_answered,
                                percent_unanswered: update.percent_unanswered
                            });
                        }, update.delay_ms);
                    });
                }
                
                // 🚧 DEV MODE: For line_fit, send scatter data
                if (snapshot.game_type === 'line_fit') {
                    // Send scatter data immediately after game starts
                    if (snapshot.scatter_data_message) {
                        setTimeout(() => {
                            console.log('🚧 MockWebSocket: Sending line fit scatter data');
                            this.simulateMessage(snapshot.scatter_data_message);
                        }, 500);
                    }
                    
                    // NOTE: other_submissions should NOT be sent during active game
                    // They should only appear in the results phase (game_results message)
                }
                
                // 🚧 DEV MODE: For word_guess, simulate letter reveals over time
                if (snapshot.game_type === 'word_guess' && snapshot.game_config?.answer) {
                    const answer = snapshot.game_config.answer.toUpperCase().replace(/ /g, '');
                    const timeLimit = snapshot.game_time_limit || 90;
                    const numReveals = Math.min(3, Math.floor(answer.length / 3)); // Reveal ~1/3 of letters
                    
                    // Generate random indices to reveal
                    const indicesToReveal = [];
                    const availableIndices = Array.from({length: answer.length}, (_, i) => i);
                    for (let i = 0; i < numReveals; i++) {
                        const randomIdx = Math.floor(Math.random() * availableIndices.length);
                        indicesToReveal.push(availableIndices[randomIdx]);
                        availableIndices.splice(randomIdx, 1);
                    }
                    
                    // Send reveal messages at intervals throughout the game
                    indicesToReveal.forEach((index, i) => {
                        const delayMs = ((timeLimit * 1000) / (numReveals + 1)) * (i + 1);
                        setTimeout(() => {
                            console.log(`🚧 MockWebSocket: Revealing letter at index ${index}`);
                            this.simulateMessage({
                                type: 'word_guess_reveal',
                                revealed_letters: [{
                                    index: index,
                                    letter: answer[index]
                                }]
                            });
                        }, delayMs);
                    });
                }
            }, 200);
            
        } catch (error) {
            console.error('🚧 Failed to load snapshot:', error);
            if (this.onerror) {
                this.onerror(error);
            }
        }
    }
    
    send(data) {
        const message = JSON.parse(data);
        console.log('🚧 MockWebSocket: Would send:', message.action, message.data);
        
        // Simulate some responses based on actions
        setTimeout(() => {
            if (message.action === 'identify') {
                this.simulateMessage({
                    type: 'identified',
                    game_types: ['speed_tap']
                });
            } else if (message.action === 'speed_tap') {
                // Player submitted answer - simulate results after 2 seconds
                console.log('🚧 MockWebSocket: Player answered:', message.data.answer);
                console.log('🚧 MockWebSocket: Will show results in 2 seconds...');
                
                setTimeout(() => {
                    // Load the corresponding results snapshot
                    const currentState = window.DEV_STATE;
                    
                    // If currently showing active game, automatically load results
                    if (currentState.includes('_active')) {
                        console.log('🚧 MockWebSocket: Auto-loading results snapshot');
                        this.loadResultsSnapshot(message.data.answer);
                    }
                }, 2000);
            }
        }, 100);
    }
    
    async loadResultsSnapshot(playerAnswer) {
        try {
            // Determine if answer was correct by checking the active snapshot's correct answer
            // For demo purposes, let's assume "Retention Rate" is correct (from our mock data)
            const correctAnswer = "Retention Rate";
            const isCorrect = playerAnswer === correctAnswer;
            
            const resultsFile = isCorrect 
                ? 'speed_tap_results_correct.json' 
                : 'speed_tap_results_incorrect.json';
            
            console.log(`🚧 Loading results: ${resultsFile}`);
            
            const response = await fetch(`dev_data/snapshots/${resultsFile}`);
            if (!response.ok) {
                throw new Error(`Failed to load results: ${response.status}`);
            }
            
            const results = await response.json();
            
            // Override with player's actual answer
            results.player_answer = playerAnswer;
            results.is_correct = isCorrect;
            
            console.log('🚧 MockWebSocket: Sending results');
            if (this.onmessage) {
                this.onmessage({ data: JSON.stringify(results) });
            }
            
        } catch (error) {
            console.error('🚧 Failed to load results snapshot:', error);
        }
    }
    
    simulateMessage(message) {
        if (this.onmessage) {
            console.log('🚧 MockWebSocket: Simulating message:', message.type);
            this.onmessage({ data: JSON.stringify(message) });
        }
    }
    
    close() {
        console.log('🚧 MockWebSocket: Closing');
        this.readyState = 3; // CLOSED
        if (this.onclose) {
            this.onclose({ wasClean: true });
        }
    }
}

function connectWebSocket() {
    logTiming('wsConnectionStart', Date.now());
    
    // Show initial connecting state
    updateConnectionProgress();
    progressMessageInterval = setInterval(updateConnectionProgress, 1000);
    
    const wsUrl = `${WS_BASE}/ws/game/${roomCode}/?session_id=${playerSession.id}`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    // 🚧 DEV MODE: Use MockWebSocket instead of real WebSocket
    if (window.DEV_MODE) {
        console.log('🚧 Using MockWebSocket (dev mode)');
        websocket = new MockWebSocket(wsUrl);
    } else {
        websocket = new WebSocket(wsUrl);
    }
    
    websocket.onopen = function(e) {
        logTiming('wsConnectionComplete', Date.now());
        console.log('WebSocket connected');
        reconnectAttempts = 0;
        requestScreenWakeLock();
        
        // Clear connection progress interval
        if (progressMessageInterval) {
            clearInterval(progressMessageInterval);
            progressMessageInterval = null;
        }
        
        // Send identification
        websocket.send(JSON.stringify({
            action: 'identify',
            data: {
                player_session_id: playerSession.id,
                role: window.isProjectorMode ? 'spectator' : 'player'
            }
        }));

        // Flush any game actions buffered during reconnect
        if (typeof flushPendingGameActions === 'function') {
            flushPendingGameActions();
        }
        
        // If we were waiting to enter, show that state
        if (isWaitingToEnter) {
            showWaitingState();
        } else {
            // Otherwise show generic waiting state until game starts
            showWaitingState();
        }
    };
    
    websocket.onmessage = function(e) {
        const message = JSON.parse(e.data);
        handleMessage(message);
    };
    
    websocket.onclose = function(e) {
        console.log('WebSocket closed:', e);
        if (progressMessageInterval) {
            clearInterval(progressMessageInterval);
            progressMessageInterval = null;
        }
        
        // A clean closing handshake is a fact about the transport, not a
        // statement that the lesson ended. Treating wasClean as terminal left
        // students on a usable-looking screen whose taps reached nobody.
        if (sessionEndedDeliberately) {
            return;
        }
        
        showConnectionError();
        scheduleReconnect();
    };
    
    websocket.onerror = function(e) {
        console.error('WebSocket error:', e);
        // Error will be handled by onclose
    };
}

/**
 * Reconnect with bounded exponential backoff and jitter.
 * A fixed 3s retry meant a whole class hammered the server in lockstep when a
 * room blipped.
 */
function scheduleReconnect() {
    if (reconnectTimer) {
        return;
    }
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        showReconnectExhausted();
        return;
    }
    const base = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
    const delay = base + Math.floor(Math.random() * 1000);
    reconnectAttempts++;
    console.log(`Reconnect attempt ${reconnectAttempts} in ${delay}ms`);
    reconnectTimer = setTimeout(function () {
        reconnectTimer = null;
        connectWebSocket();
    }, delay);
}

function showReconnectExhausted() {
    const gameArea = document.getElementById('gameArea');
    if (!gameArea) return;
    gameArea.innerHTML = `
        <div style="text-align:center; padding:2rem;">
            <div style="font-size:3rem; margin-bottom:1rem;">📶</div>
            <h2 style="margin-bottom:0.5rem;">Still can't reach the game</h2>
            <p style="color:#64748b; margin-bottom:1.5rem;">
                Your answers so far are safe. Check your connection, then try again.
            </p>
            <button onclick="retryConnectionNow()" style="padding:0.85rem 1.75rem; font-size:1rem; border:none; border-radius:8px; background:#3b82f6; color:white; cursor:pointer;">
                Try again
            </button>
        </div>
    `;
}

function retryConnectionNow() {
    reconnectAttempts = 0;
    connectWebSocket();
}

// Mobile sleep / tab backgrounding handler
// Reconnects immediately when tab becomes active, with jitter to prevent server thundering herd
let lastVisibilityCheckTime = 0;
function handleMobileTabWakeup() {
    if (sessionEndedDeliberately) return;
    const now = Date.now();
    if (now - lastVisibilityCheckTime < 2000) return; // 2s cooldown
    lastVisibilityCheckTime = now;
    
    if (!websocket || websocket.readyState === WebSocket.CLOSED || websocket.readyState === WebSocket.CLOSING) {
        console.log('[VISIBILITY] Tab resumed, socket disconnected — reconnecting with jitter');
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        // Jitter 100-600ms so multiple students unlocking phones don't hit Daphne simultaneously
        const jitter = Math.floor(Math.random() * 500) + 100;
        setTimeout(() => {
            reconnectAttempts = 0;
            connectWebSocket();
        }, jitter);
    } else if (websocket.readyState === WebSocket.OPEN) {
        // Socket still open; send lightweight ping to verify connection health
        try {
            websocket.send(JSON.stringify({ action: 'ping', data: { timestamp: Date.now() } }));
        } catch (e) {}
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        handleMobileTabWakeup();
    }
});

window.addEventListener('pageshow', (event) => {
    handleMobileTabWakeup();
});

function updateConnectionProgress() {
    const elapsed = Math.floor((Date.now() - connectionAttemptStart) / 1000);
    const gameArea = document.getElementById('gameArea');
    
    var _connectLines = [
        'Warming up the buzzer…',
        'Shuffling the questions…',
        'Polishing the leaderboard…',
        'Loading competitive spirit…',
        'Calibrating the scoreboard…'
    ];
    if (elapsed < 5) {
        // First 5 seconds - just connecting
        gameArea.innerHTML = `
            <div class="waiting-state" style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 1rem;">🎮</div>
                <h2>Connecting to Game...</h2>
                <p style="color: #64748b;">${_connectLines[Math.floor(Math.random() * _connectLines.length)]}</p>
                <div style="margin-top: 1.5rem;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
            </div>
        `;
    } else if (elapsed < 60) {
        // 5-60 seconds - show it may take time
        gameArea.innerHTML = `
            <div class="waiting-state" style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 1rem;">⏳</div>
                <h2>Still Connecting...</h2>
                <p style="color: #64748b; margin-bottom: 0.5rem;">The server is waking up — hang tight (1-2 min)</p>
                <p style="color: #94a3b8; font-size: 0.875rem;">${elapsed}s and counting…</p>
                <div style="margin-top: 1.5rem;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
                <button onclick="location.reload()" style="background: #ef4444; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 1.5rem;">
                    ❌ Cancel & Retry
                </button>
            </div>
        `;
    } else {
        // After 60 seconds - something may be wrong
        gameArea.innerHTML = `
            <div class="waiting-state" style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 1rem;">😅</div>
                <h2>This Is Taking a While</h2>
                <p style="color: #f59e0b; margin-bottom: 0.5rem;">Still working on it…</p>
                <p style="color: #64748b;">The game server might be napping. Try reloading.</p>
                <div style="margin-top: 1.5rem;">
                    <button onclick="location.reload()" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-right: 10px;">
                        🔄 Reload Page
                    </button>
                    <a href="game-join.html" style="display: inline-block; background: #94a3b8; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        ⬅️ Back to Join
                    </a>
                </div>
            </div>
        `;
    }
}

function showConnectionError() {
    const gameArea = document.getElementById('gameArea');
    gameArea.innerHTML = `
        <div class="waiting-state" style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 1rem;">🔌</div>
            <h2>Connection Lost</h2>
            <p style="color: #ef4444;">Disconnected from the game server</p>
            <p style="color: #64748b; margin-top: 0.5rem;">Trying to reconnect — sit tight…</p>
            <div style="margin-top: 1.5rem;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #ef4444; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
        </div>
    `;
}

function handleMessage(message) {
    console.log('Received message:', message.type);
    
    switch (message.type) {
        case 'connection_established':
            console.log('Connection established');
            // If we have a game type, show waiting state with that type
            if (message.game_session && message.game_session.game_type) {
                showWaitingState(message.game_session.game_type);
            } else if (message.game_type) {
                showWaitingState(message.game_type);
            }
            break;
            
        case 'identified':
            console.log('Player identified');
            // Preload all game scripts for this session
            if (message.game_types && message.game_types.length > 0) {
                preloadAllGameScripts(message.game_types);
            }
            break;
            
        case 'player_list_update':
            console.log('Players updated:', message.players);
            // Store players globally - CRITICAL for projector mode  
            window.latestPlayers = message.players || [];
            
            // Always update player count in projector mode
            if (window.isProjectorMode && message.players) {
                const playerCountEl = document.getElementById('playerCount');
                console.log('[PROJECTOR] Player count element:', playerCountEl);
                console.log('[PROJECTOR] Setting player count to:', message.players.length);
                if (playerCountEl) {
                    playerCountEl.textContent = message.players.length;
                    playerCountEl.style.color = '#1e293b';
                }
                // Update speed tap participation tracker
                if (window.speedTapParticipation) {
                    window.speedTapParticipation.totalPlayers = message.players.length;
                }
            }
            
            // Update speed tap participation tracker
            if (window.speedTapParticipation && message.players) {
                window.speedTapParticipation.totalPlayers = message.players.length;
            }
            
            // Update line fit participation tracker
            if (window.lineFitParticipation && message.players) {
                window.lineFitParticipation.totalPlayers = message.players.length;
                if (typeof updateLineFitParticipation === 'function') {
                    updateLineFitParticipation();
                }
            }
            break;
            
        case 'countdown_start':
            handleCountdownStart(message);
            break;
            
        case 'timer_sync':
            handleTimerSync(message);
            break;
            
        case 'timer_update':
            handleTimerUpdate(message);
            break;
            
        case 'game_started':
            handleGameStart(message);
            break;
            
        case 'speed_tap_answer':
            // Track participation in projector mode
            if (window.isProjectorMode && window.speedTapParticipation && message.player_id) {
                window.speedTapParticipation.respondedPlayers.add(message.player_id);
                if (typeof window.updateSpeedTapParticipation === 'function') {
                    window.updateSpeedTapParticipation();
                }
            }
            if (typeof handleSpeedTapAnswer === 'function') {
                handleSpeedTapAnswer(message);
            }
            break;
            
        case 'range_submitted':
            if (typeof handleRangeSubmitted === 'function') {
                handleRangeSubmitted(message);
            }
            break;
            
        case 'guess_submitted':
            // Handle personal confirmation for closest guess
            if (typeof handleRangeSubmitted === 'function') {
                // Map backend 'guess_submitted' format to what handleRangeSubmitted expects
                handleRangeSubmitted({
                    ...message,
                    player_id: playerSession.id // Ensure it's treated as own submission
                });
            }
            break;
            
        case 'guess_results':
            if (typeof handleGuessResults === 'function') {
                handleGuessResults(message);
            }
            break;
            
        case 'push_range_update':
            if (typeof handlePushRangeUpdate === 'function') {
                handlePushRangeUpdate(message);
            }
            break;
            
        case 'push_range_results':
            if (typeof handlePushRangeResults === 'function') {
                handlePushRangeResults(message);
            }
            break;
            
        case 'crowd_wisdom_distribution':
            if (typeof handleCrowdWisdomDistribution === 'function') {
                handleCrowdWisdomDistribution(message);
            }
            break;
            
        case 'crowd_wisdom_results':
            if (typeof handleCrowdWisdomResults === 'function') {
                handleCrowdWisdomResults(message);
            }
            break;
            
        case 'word_guess_correct':
            // Handle correct word guess confirmation
            if (typeof handleWordGuessResult === 'function') {
                handleWordGuessResult({
                    is_correct: true,
                    points: message.points,
                    correct_answer: message.answer
                });
            }
            break;

        case 'word_guess_incorrect':
            // Handle incorrect word guess feedback
            const feedback = document.getElementById('feedback');
            if (feedback) {
                feedback.innerHTML = `<div style="color: #ef4444; font-size: 18px;">❌ ${message.message}</div>`;
                setTimeout(() => { feedback.innerHTML = ''; }, 2000);
            }
            // Re-enable input
            const input = document.getElementById('wordGuessInput');
            const submitBtn = document.querySelector('.submit-word-btn');
            if (input) input.disabled = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Answer';
                submitBtn.style.opacity = '1';
            }
            break;

        case 'word_guess_reveal':
            if (typeof handleWordGuessReveal === 'function') {
                handleWordGuessReveal(message);
            }
            break;
            
        case 'word_guess_result':
            if (typeof handleWordGuessResult === 'function') {
                handleWordGuessResult(message);
            }
            break;
            
        case 'word_guess_results':
            // End of round results for Word Guess
            if (typeof handleWordGuessResults === 'function') {
                handleWordGuessResults(message);
            }
            break;
            
        case 'line_fit_data':
            // Handle scatter data for Line Fit game
            if (typeof handleLineFitData === 'function') {
                handleLineFitData(message);
            }
            break;
            
        case 'line_fit_submission':
            // Handle line submission from another player
            if (typeof handleLineFitSubmission === 'function') {
                handleLineFitSubmission(message);
            }
            break;
            
        case 'line_fit_player_data':
            // Store player's own line data for use in results display
            if (!window.lineFitPlayerData) {
                window.lineFitPlayerData = {};
            }
            window.lineFitPlayerData = message;
            console.log('[LINE FIT] Received player-specific line data:', message);
            break;
            
        case 'game_results':
            handleUnifiedGameResults(message);
            break;
            
        case 'leaderboard_update':
            console.log('📊 Received leaderboard_update message:', message);
            updateLeaderboard(message.leaderboard);
            break;
            
        case 'ping':
            // Respond to server heartbeat ping with proper message format
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                    action: 'pong',  // Backend expects 'action' not 'type'
                    data: {
                        timestamp: message.timestamp || Date.now()
                    }
                }));
            }
            break;
            
        case 'show_final_standings':
            console.log('🏆 Received show_final_standings broadcast');
            showFinalStandings(lastResultsMessage || message, lastLeaderboardVisibility);
            break;

        case 'game_ended':
            handleGameEnd(message);
            break;
            
        case 'round_changed':
            handleRoundChange(message);
            break;
            
        case 'answer_submitted':
            // The server has always sent this; nothing handled it, so a student
            // saw "locked in" before anything had been recorded.
            if (gameType === 'crowd_wisdom' && typeof handleCrowdWisdomAccepted === 'function') {
                handleCrowdWisdomAccepted(message);
            }
            break;
            
        case 'budget_blitz_accepted':
            if (typeof handleBudgetBlitzAccepted === 'function') handleBudgetBlitzAccepted(message);
            break;
            
        case 'budget_blitz_progress':
            if (typeof handleBudgetBlitzProgress === 'function') handleBudgetBlitzProgress(message);
            break;
            
        case 'buy_a_clue_clue':
            if (typeof handleBuyAClueClue === 'function') handleBuyAClueClue(message);
            break;
            
        case 'buy_a_clue_accepted':
            if (typeof handleBuyAClueAccepted === 'function') handleBuyAClueAccepted(message);
            break;
            
        case 'buy_a_clue_progress':
            if (typeof handleBuyAClueProgress === 'function') handleBuyAClueProgress(message);
            break;

        case 'minority_rule_accepted':
            if (typeof handleMinorityRuleAccepted === 'function') handleMinorityRuleAccepted(message);
            break;
            
        case 'error':
            if (gameType === 'crowd_wisdom' && typeof handleCrowdWisdomRejected === 'function') {
                handleCrowdWisdomRejected(message);
            }
            if (gameType === 'budget_blitz' && typeof handleBudgetBlitzRejected === 'function') {
                handleBudgetBlitzRejected(message);
            }
            if (gameType === 'buy_a_clue' && typeof handleBuyAClueRejected === 'function') {
                handleBuyAClueRejected(message);
            }
            handleError(message);
            break;
            
        case 'player_disconnected':
            console.log('Player disconnected:', message.player_id);
            break;
            
        case 'player_kicked':
            handlePlayerKicked(message);
            break;
            
        case 'answer_result':
            // Handle wrong answer feedback for Speed Tap
            if (!message.is_correct) {
                const feedback = document.getElementById('feedback');
                if (feedback) {
                    feedback.innerHTML = `<div class="alert alert-danger">${message.message}</div>`;
                }
            }
            break;
            
        // Live Buzzer messages
        case 'buzzer_arm':
            if (typeof handleBuzzerArm === 'function') {
                handleBuzzerArm(message);
            }
            break;
            
        case 'buzzer_armed':
            // Host notification - no action needed on player side
            console.log('[BUZZER] Round armed by host');
            break;
            
        case 'buzzer_enable':
            if (typeof handleBuzzerEnable === 'function') {
                handleBuzzerEnable(message);
            }
            break;
            
        case 'buzzer_enabled':
            // Host notification - no action needed on player side
            console.log('[BUZZER] Buzzer enabled by host');
            break;
            
        case 'buzzer_state_update':
            if (typeof updateBuzzerState === 'function') {
                updateBuzzerState(message);
            }
            break;

        case 'buzzer_roster_update':
            if (typeof handleBuzzerRosterUpdate === 'function') {
                handleBuzzerRosterUpdate(message);
            }
            break;
            
        case 'buzzer_reset':
            if (typeof handleBuzzerReset === 'function') {
                handleBuzzerReset(message);
            }
            break;
            
        case 'buzzer_time_pong':
            if (typeof handleTimePong === 'function') {
                handleTimePong(message);
            }
            break;
    }
}

function getInstructionCardHTML(gameType) {
    // Get game type helper text
    const gameTypeHelpers = {
        'speed_tap': {
            title: '⚡ Speed Tap',
            description: 'Fast and right wins big. Fast and wrong? That costs you.<br>Think quick — the clock is not your friend.'
        },
        'closest_guess': {
            title: '🎯 Closest Guess',
            description: 'Pick a range that traps the right answer.<br>Tighter range = more points. Speed bonus if you\'re quick about it!'
        },
        'push_range': {
            title: '🤜🟦🟥🤛 Push Range',
            description: 'Mash the button to drag the bracket toward the answer!<br>Risky ranges pay more. Tap hard, tap fast, tap together.'
        },
        'crowd_wisdom': {
            title: '🧠 Crowd Wisdom',
            description: 'See what everyone else is guessing in real time.<br>First movers earn more — but herd instinct is real. Be bold.'
        },
        'word_guess': {
            title: '🔤 Word Guess',
            description: 'Hangman, but make it analytics.<br>Letters reveal over time. Guess early for maximum points!'
        },
        'line_fit': {
            title: '📈 Line Fit',
            description: 'Eyeball the scatter plot. Click two points. Draw your best-fit line.<br>Closest to the real regression wins. Trust your instincts.'
        },
        'budget_blitz': {
            title: '💰 Budget Blitz',
            description: 'Spend every token across the channels.<br>Watch what the NEXT token buys — the first one is never the decision.'
        },
        'buy_a_clue': {
            title: '🔎 Buy a Clue',
            description: 'Answer now, or pay points for a hint first.<br>The clue costs you either way. Is it worth it?'
        },
        'minority_rule': {
            title: '🐺 Minority Rule',
            description: 'Escape the crowd! Choose the market niche with the fewest competitors.<br>Crowded red oceans destroy margins; uncrowded blue oceans claim maximum profit.'
        },
        'rpg_battle': {
            title: '⚔️ RPG Battle',
            description: 'Team up to slay the boss!<br>Right answers deal damage. Wrong ones? The boss hits back.'
        }
    };
    
    const helper = gameType && gameTypeHelpers[gameType] ? gameTypeHelpers[gameType] : null;
    
    if (!helper) return '';
    
    const fontSize = window.isProjectorMode ? '64px' : '2rem';
    const descSize = window.isProjectorMode ? '40px' : '1.1rem';
    const maxWidth = window.isProjectorMode ? '1200px' : '500px';
    const padding = window.isProjectorMode ? '3rem' : '2rem';
    
    return `
        <div class="instruction-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: ${padding}; border-radius: 12px; margin: 2rem auto; max-width: ${maxWidth}; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
            <div class="title" style="font-size: ${fontSize}; margin-bottom: 1rem;">${helper.title}</div>
            <div class="description" style="font-size: ${descSize}; line-height: 1.6;">${helper.description}</div>
        </div>
    `;
}

function showWaitingState(gameTypeFromServer) {
    // The card text lives in getInstructionCardHTML. A second copy used to sit
    // here unread, so adding a game to one map appeared to do nothing.
    const gameExplanationHTML = getInstructionCardHTML(gameTypeFromServer);
    
    // Check if player joined mid-round and is waiting
    if (isWaitingToEnter) {
        document.getElementById('gameArea').innerHTML = `
            <div class="waiting-state">
                <h2>⏸️ Hold Tight!</h2>
                <div class="spinner"></div>
                <p style="color: #f59e0b; font-weight: 600;">You jumped in mid-round — nice hustle.</p>
                <p style="color: #64748b;">You'll be in the game when the next round kicks off!</p>
                ${gameExplanationHTML}
            </div>
        `;
        return;
    }
    
    // Only show QR code if game hasn't started yet (no gameType or gameStartTime means pre-game)
    const showQR = !gameType && !gameStartTime;
    const qrCodeHTML = showQR ? `
                <div class="qr-code-box">
                    <h3>📱 Share with Classmates</h3>
                    <div id="qrcode"></div>
                    <p>Scan this QR code to join the game!</p>
                </div>
    ` : '';
    
    if (showQR) {
        document.getElementById('gameArea').innerHTML = `
            <div class="waiting-state">
                <h2>🎮 Waiting for your instructor to launch…</h2>
                <div class="spinner"></div>
                <p style="color: #64748b;">${(function(){var _ll=['Warm up those thumbs. It\u2019s almost go time.','Any second now. Look alive.','The calm before the competitive storm.','Your instructor is loading the first question\u2026','Pro tip: confidence is a leading indicator of points.','Market research says this game is about to be fun.','Sharpen your pencils. Metaphorically.','First-mover advantage starts\u2026 now-ish.','The sample size is you. Don\u2019t be an outlier.','Lobby vibes. Game energy incoming.','Stretch, hydrate, strategize.','The null hypothesis is that you\u2019ll lose. Prove it wrong.'];return _ll[Math.floor(Math.random()*_ll.length)]})()}</p>
                ${gameExplanationHTML}
                ${qrCodeHTML}
            </div>
        `;
    }
    
    // Generate QR code after DOM is updated
    setTimeout(() => {
        const qrCodeDiv = document.getElementById('qrcode');
        if (qrCodeDiv && roomCode && typeof QRCode !== 'undefined') {
            qrCodeDiv.innerHTML = ''; // Clear any existing
            const joinUrl = `${window.JOIN_URL}?room=${roomCode}`;
            const qrSize = window.isProjectorMode ? 270 : 180; // 50% larger for projector
            new QRCode(qrCodeDiv, {
                text: joinUrl,
                width: qrSize,
                height: qrSize,
                colorDark: "#1e293b",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
            
            // Add Praxis Play logo overlay for branding consistency
            setTimeout(() => {
                const logo = document.createElement('img');
                logo.src = '../../art_assets/svg_logos/praxisplay_notext_logo.svg';
                logo.alt = 'Praxis Play';
                const logoSize = window.isProjectorMode ? 57 : 38; // Scale with QR code
                logo.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${logoSize}px; height: ${logoSize}px; background: white; padding: 4px; border-radius: 0; box-shadow: 0 0 0 3px white; pointer-events: none;`;
                qrCodeDiv.style.position = 'relative';
                qrCodeDiv.appendChild(logo);
            }, 100);
        }
    }, 100);
}

// Handle countdown event from WebSocket
async function handleCountdownStart(message) {
    const overlay = document.getElementById('countdownOverlay');
    const numberDiv = document.getElementById('countdownNumber');
    const roundInfo = document.getElementById('countdownRoundInfo');
    
    // Reset round ended flag & clean up any prior timers
    window.isRoundEnded = false;
    if (typeof timerInterval !== 'undefined' && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (typeof clearSuspenseShimmer === 'function') clearSuspenseShimmer();
    if (typeof clearTimerUrgency === 'function') clearTimerUrgency();
    
    // CRITICAL: Clear gameArea to remove previous round's summary card
    // This prevents the player from being stuck on the results screen
    document.getElementById('gameArea').innerHTML = '';
    
    // Show overlay
    overlay.style.display = 'flex';
    roundInfo.textContent = `Round ${message.current_round} of ${message.total_rounds}`;
    
    // Countdown: 5, 4, 3, 2, 1 (matches backend 5 second duration)
    for (let count = 5; count >= 1; count--) {
        numberDiv.textContent = count;
        numberDiv.style.color = count <= 3 ? '#ef4444' : '#3b82f6'; // Red for final 3 seconds
        
        // Re-trigger scale-pop pulse animation on each digit
        numberDiv.style.animation = 'none';
        void numberDiv.offsetWidth; // force reflow
        numberDiv.style.animation = 'pulse 0.4s ease-out';

        // Silent haptic pulse (no audio)
        if (typeof triggerHapticAlert === 'function') {
            triggerHapticAlert(count > 1 ? 25 : 45);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Show GO! with strong visual pop and emerald color
    numberDiv.textContent = 'GO!';
    numberDiv.style.color = '#10b981';
    numberDiv.style.animation = 'none';
    void numberDiv.offsetWidth;
    numberDiv.style.animation = 'pulse 0.5s ease-out';

    if (typeof triggerHapticAlert === 'function') {
        triggerHapticAlert([50, 40, 60]);
    }
    await new Promise(resolve => setTimeout(resolve, 1150)); // Comfortable pause for players to register GO!
    
    // Hide overlay
    overlay.style.display = 'none';
    
    // Now trigger the actual game start with embedded game data
    if (message.game_data) {
        handleGameStart(message.game_data);
    }
}

// Handle server-authoritative timer updates.
// The per-game 100ms interval owns the digit; this only steps in on a real desync.
const TIMER_SNAP_THRESHOLD = 2; // seconds

function handleTimerUpdate(message) {
    const serverTimeRemaining = message.time_remaining;

    // Store server time for any game-specific sync needs
    window.lastServerTimeUpdate = {
        time_remaining: serverTimeRemaining,
        timestamp: Date.now()
    };

    const timerEl = document.getElementById('timer');
    if (!timerEl) return;

    const serverDisplay = Math.max(0, Math.ceil(serverTimeRemaining));

    // Server says the round is over: that is unambiguous, always show it.
    if (serverTimeRemaining <= 0) {
        timerEl.textContent = '0';
        timerEl.style.color = '#ef4444';
        return;
    }

    // Two writers on one element made the digit flicker (15 -> 14 -> 15). The
    // server's value is stale by one network hop, so within that window each
    // second it rounds differently from the local clock, and the two fought at
    // 100ms vs 500ms. Worse on cellular, where the hop is longer. Leave the
    // smooth local countdown alone unless it has genuinely drifted.
    if (timerInterval) {
        const shown = parseInt(timerEl.textContent, 10);
        if (!Number.isNaN(shown) && Math.abs(shown - serverDisplay) <= TIMER_SNAP_THRESHOLD) {
            return;
        }
    }

    timerEl.textContent = serverDisplay;
    timerEl.style.color = serverDisplay <= 10 ? '#ef4444' : '#1e293b';
}

// Lazy load game-specific JavaScript modules
const loadedGameScripts = new Set();

async function preloadAllGameScripts(gameTypes) {
    // Remove duplicates
    const uniqueGameTypes = [...new Set(gameTypes)];
    const totalScripts = uniqueGameTypes.length;
    let loadedCount = 0;
    
    console.log('🎯 Preloading all game scripts:', uniqueGameTypes);
    
    try {
        // Load scripts sequentially to send progress updates
        for (const gameType of uniqueGameTypes) {
            await loadGameScript(gameType);
            loadedCount++;
            
            // Send progress update after each script loads
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                    action: 'scripts_loading_progress',
                    data: { 
                        loaded_count: loadedCount,
                        total_count: totalScripts
                    }
                }));
            }
        }
        
        console.log('✅ All game scripts preloaded successfully!');
        
        // Notify backend that all scripts are loaded
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                action: 'scripts_loaded',
                data: { loaded: true }
            }));
        }
    } catch (error) {
        console.error('❌ Error preloading scripts:', error);
        // Still notify backend even if some failed - game will work with lazy loading fallback
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                action: 'scripts_loaded',
                data: { loaded: false, error: error.message }
            }));
        }
    }
}

async function loadGameScript(gameType) {
    // Map game types to their script files
    const gameScriptMap = {
        'speed_tap': 'game-speed-tap.js',
        'closest_guess': 'game-closest-guess.js',
        'push_range': 'game-push-range.js',
        'crowd_wisdom': 'game-crowd-wisdom.js',
        'word_guess': 'game-word-guess.js',
        'line_fit': 'line-fit.js',
        'budget_blitz': 'game-budget-blitz.js',
        'buy_a_clue': 'game-buy-a-clue.js',
        'minority_rule': 'game-minority-rule.js',
        'live_buzzer': 'game-buzzer.js'
    };
    
    const scriptFile = gameScriptMap[gameType];
    if (!scriptFile) {
        console.warn(`No script mapping found for game type: ${gameType}`);
        return;
    }
    
    // Check if already loaded
    if (loadedGameScripts.has(gameType)) {
        console.log(`Game script already loaded: ${scriptFile}`);
        return;
    }
    
    console.log(`Loading game script: ${scriptFile}`);
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `js/${scriptFile}`;
        script.onload = () => {
            loadedGameScripts.add(gameType);
            console.log(`✅ Successfully loaded: ${scriptFile}`);
            resolve();
        };
        script.onerror = () => {
            console.error(`❌ Failed to load: ${scriptFile}`);
            reject(new Error(`Failed to load ${scriptFile}`));
        };
        document.head.appendChild(script);
    });
}

async function handleGameStart(message) {
    gameType = message.game_type;
    gameStartTime = Date.now();
    // Adopt this round's identity before any action can be sent for it.
    currentRoundInstanceId = message.round_instance_id || null;

    // On a resync the server states eligibility outright. The local flag is only
    // cleared by the results message, which a disconnected student never saw --
    // that is how a late joiner stayed locked out of a round they could play.
    if (message.is_resync && typeof message.waiting_to_enter === 'boolean') {
        isWaitingToEnter = message.waiting_to_enter;
        sessionStorage.setItem('waitingToEnter', String(message.waiting_to_enter));
    }
    
    // Update projector current round display
    if (window.isProjectorMode) {
        const currentRoundEl = document.getElementById('currentRound');
        const playerCountEl = document.getElementById('playerCount');
        
        console.log('[PROJECTOR] Round element:', currentRoundEl);
        console.log('[PROJECTOR] current_round:', message.current_round);
        
        // Backend sends current_round (1-indexed), not round_index
        if (currentRoundEl && message.current_round !== undefined) {
            currentRoundEl.textContent = message.current_round;
            currentRoundEl.style.color = '#1e293b';
            console.log('[PROJECTOR] Set round to:', message.current_round);
        }
        
        // Also refresh player count from latestPlayers or team_assignments
        if (playerCountEl) {
            let playerCount = 0;
            if (window.latestPlayers) {
                playerCount = window.latestPlayers.length;
            } else if (message.team_assignments) {
                // Fallback: count players from team_assignments
                playerCount = Object.keys(message.team_assignments).length;
            }
            if (playerCount > 0) {
                playerCountEl.textContent = playerCount;
                playerCountEl.style.color = '#1e293b';
                console.log('[PROJECTOR] Refreshed player count to:', playerCount);
            }
        }
    }
    
    // DEBUGGING: Log the entire message to see what we're receiving
    console.log('=== handleGameStart called ===');
    console.log('Full message object:', JSON.stringify(message, null, 2));
    
    // Re-enable submit button for new round
    const submitBtn = document.querySelector('.submit-guess-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    }
    
    // If player is waiting to enter, show waiting state instead of game
    if (isWaitingToEnter) {
        showWaitingState();
        return;
    }
    
    // Use custom time limit if provided, otherwise default to 20 seconds
    let timeLimit = (message.game_time_limit !== null && message.game_time_limit !== undefined) 
        ? message.game_time_limit 
        : 20;
    
    // Backend sends start_time which is the actual game start time (after countdown)
    // Use it directly - do NOT add countdown duration as that's already accounted for
    let startTime = message.start_time ? new Date(message.start_time).getTime() : Date.now();
    
    // Rejoining mid-round: run out the time that is actually left rather than
    // handing the returning student a fresh full timer.
    if (message.is_resync && typeof message.seconds_remaining === 'number') {
        timeLimit = Math.max(0, message.seconds_remaining);
        startTime = Date.now();
    }
    
    console.log('⏱️ Game timing:', {
        timeLimit: timeLimit,
        startTime: new Date(startTime).toISOString(),
        expectedEndTime: new Date(startTime + timeLimit * 1000).toISOString(),
        gameType: message.game_type
    });
    
    // Lazy load game-specific script if needed
    try {
        await loadGameScript(gameType);
    } catch (error) {
        console.error(`Failed to load game script for ${gameType}:`, error);
        document.getElementById('gameArea').innerHTML = `
            <div class="waiting-state" style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 1rem;">⚠️</div>
                <h2>Couldn't Load This Round</h2>
                <p style="color: #ef4444;">The game module (${gameType}) didn't load. Try a quick reload.</p>
                <button onclick="location.reload()" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 1rem;">
                    🔄 Reload Page
                </button>
            </div>
        `;
        return;
    }
    
    // Now call game-specific functions (they're guaranteed to be loaded)
    console.log(`🎮 Attempting to start ${gameType} game...`);
    if (typeof clearTimerUrgency === 'function') clearTimerUrgency();
    if (typeof clearSuspenseShimmer === 'function') clearSuspenseShimmer();
    
    if (gameType === 'speed_tap') {
        console.log('Checking showSpeedTapGame:', typeof showSpeedTapGame);
        if (typeof showSpeedTapGame === 'function') {
            showSpeedTapGame(message, timeLimit);
            console.log('Checking startSpeedTapTimer:', typeof startSpeedTapTimer);
            if (typeof startSpeedTapTimer === 'function') {
                startSpeedTapTimer(timeLimit, startTime);
            } else {
                console.error('❌ startSpeedTapTimer not found!');
            }
        } else {
            console.error('❌ showSpeedTapGame not found!');
        }
    } else if (gameType === 'closest_guess') {
        console.log('Checking showClosestGuessGame:', typeof showClosestGuessGame);
        if (typeof showClosestGuessGame === 'function') {
            showClosestGuessGame(message, timeLimit);
            console.log('Checking startTimer:', typeof startTimer);
            if (typeof startTimer === 'function') {
                startTimer(timeLimit, startTime);
            } else {
                console.error('❌ startTimer not found!');
            }
        } else {
            console.error('❌ showClosestGuessGame not found!');
        }
    } else if (gameType === 'push_range') {
        console.log('Checking showPushRangeGame:', typeof showPushRangeGame);
        if (typeof showPushRangeGame === 'function') {
            showPushRangeGame(message, timeLimit);
            console.log('Checking startPushRangeTimer:', typeof startPushRangeTimer);
            if (typeof startPushRangeTimer === 'function') {
                startPushRangeTimer(timeLimit, startTime);
            } else {
                console.error('❌ startPushRangeTimer not found!');
            }
        } else {
            console.error('❌ showPushRangeGame not found!');
        }
    } else if (gameType === 'crowd_wisdom') {
        console.log('Checking showCrowdWisdomGame:', typeof showCrowdWisdomGame);
        if (typeof showCrowdWisdomGame === 'function') {
            showCrowdWisdomGame(message, timeLimit);
            console.log('Checking startCrowdWisdomTimer:', typeof startCrowdWisdomTimer);
            if (typeof startCrowdWisdomTimer === 'function') {
                startCrowdWisdomTimer(timeLimit, startTime);
            } else {
                console.error('❌ startCrowdWisdomTimer not found!');
            }
        } else {
            console.error('❌ showCrowdWisdomGame not found!');
        }
    } else if (gameType === 'word_guess') {
        console.log('Checking showWordGuessGame:', typeof showWordGuessGame);
        if (typeof showWordGuessGame === 'function') {
            showWordGuessGame(message, timeLimit);
            console.log('Checking startWordGuessTimer:', typeof startWordGuessTimer);
            if (typeof startWordGuessTimer === 'function') {
                startWordGuessTimer(timeLimit, startTime);
            } else {
                console.error('❌ startWordGuessTimer not found!');
            }
        } else {
            console.error('❌ showWordGuessGame not found!');
        }
    } else if (gameType === 'line_fit') {
        console.log('Checking showLineFitGame:', typeof showLineFitGame);
        if (typeof showLineFitGame === 'function') {
            showLineFitGame(message, timeLimit);
            console.log('Checking startLineFitTimer:', typeof startLineFitTimer);
            if (typeof startLineFitTimer === 'function') {
                startLineFitTimer(timeLimit, startTime);
            } else {
                console.error('❌ startLineFitTimer not found!');
            }
        } else {
            console.error('❌ showLineFitGame not found!');
        }
    } else if (gameType === 'budget_blitz') {
        if (typeof showBudgetBlitzGame === 'function') {
            showBudgetBlitzGame(message, timeLimit);
            if (typeof startBudgetBlitzTimer === 'function') {
                startBudgetBlitzTimer(timeLimit, startTime);
            }
        } else {
            console.error('❌ showBudgetBlitzGame not found!');
        }
    } else if (gameType === 'buy_a_clue') {
        if (typeof showBuyAClueGame === 'function') {
            showBuyAClueGame(message, timeLimit);
            if (typeof startBuyAClueTimer === 'function') {
                startBuyAClueTimer(timeLimit, startTime);
            }
        } else {
            console.error('❌ showBuyAClueGame not found!');
        }
    } else if (gameType === 'minority_rule') {
        if (typeof showMinorityRuleGame === 'function') {
            showMinorityRuleGame(message, timeLimit);
        } else {
            console.error('❌ showMinorityRuleGame not found!');
        }
    } else if (gameType === 'live_buzzer') {
        console.log('Checking showBuzzerUI:', typeof showBuzzerUI);
        if (typeof showBuzzerUI === 'function') {
            // Idempotency guard: if a `buzzer_state` message arrived before this
            // handler finished loading the buzzer script, the safety net in
            // handleBuzzerState may have already bootstrapped the UI and applied
            // the player's rank. Re-running showBuzzerUI would wipe that. Only
            // build the UI if the buzzer button isn't already in the DOM.
            if (!document.getElementById('buzzerBtn')) {
                showBuzzerUI(message);
            } else {
                console.log('[BUZZER] DOM already bootstrapped (likely by reconnect resync) — skipping rebuild');
            }
            startTimeSync();
        } else {
            console.error('❌ showBuzzerUI not found!');
        }
    } else {
        console.error('❌ Unknown game type:', gameType);
    }

    if (message.is_resync && message.accepted) {
        restoreAcceptedSubmission(gameType, message.accepted);
    }
}

/**
 * Put a reconnecting student back into the state the SERVER has them in.
 *
 * Only ever locks the interface; it never resubmits. A reopened socket must not
 * become a second answer, and accepted work must not look unsubmitted.
 */
function restoreAcceptedSubmission(type, accepted) {
    if (!accepted) return;
    const hasWorkToRestore = accepted.submitted || (type === 'buy_a_clue' && accepted.bought_clue);
    if (!hasWorkToRestore) {
        return;
    }
    console.log('[RESYNC] Restoring accepted submission for', type, accepted);

    const feedback = document.getElementById('feedback');
    if (feedback && accepted.submitted) {
        if (typeof showLockedInStamp === 'function') {
            showLockedInStamp(feedback, { message: 'Your answer was already received.' });
        } else {
            feedback.innerHTML = '🔒 Your answer was already received.';
        }
    }

    if (type === 'speed_tap') {
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.cursor = 'not-allowed';
            if (accepted.answer && btn.dataset.answer === accepted.answer) {
                btn.classList.add('selected');
            }
        });
    } else if (type === 'crowd_wisdom') {
        if (typeof crowdWisdomState === 'object' && crowdWisdomState) {
            crowdWisdomState.hasAnswered = true;
            crowdWisdomState.pending = false;
            crowdWisdomState.selectedOption = accepted.option_index;
        }
        document.querySelectorAll('.crowd-wisdom-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.cursor = 'not-allowed';
            if (parseInt(btn.dataset.optionIndex) === accepted.option_index) {
                btn.classList.add('selected');
            }
        });
    } else if (type === 'closest_guess') {
        const minInput = document.getElementById('guessMin');
        const maxInput = document.getElementById('guessMax');
        if (minInput && accepted.guess_min !== null && accepted.guess_min !== undefined) {
            minInput.value = accepted.guess_min;
            minInput.disabled = true;
        }
        if (maxInput && accepted.guess_max !== null && accepted.guess_max !== undefined) {
            maxInput.value = accepted.guess_max;
            maxInput.disabled = true;
        }
        const submitBtn = document.querySelector('.submit-guess-btn');
        if (submitBtn) submitBtn.disabled = true;
    } else if (type === 'word_guess') {
        if (typeof wordGuessState === 'object' && wordGuessState) {
            wordGuessState.hasAnswered = true;
        }
        const input = document.getElementById('wordGuessInput');
        const submitBtn = document.querySelector('.submit-word-btn');
        if (input) input.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
    } else if (type === 'line_fit') {
        if (typeof lineFitState === 'object' && lineFitState) {
            lineFitState.mode = 'confirmed';
        }
        const confirmBtn = document.getElementById('confirmBtn');
        const redrawBtn = document.getElementById('redrawBtn');
        if (confirmBtn) confirmBtn.disabled = true;
        if (redrawBtn) redrawBtn.disabled = true;
    } else if (type === 'budget_blitz') {
        if (typeof restoreBudgetBlitzSubmission === 'function') {
            restoreBudgetBlitzSubmission(accepted);
        }
    } else if (type === 'buy_a_clue') {
        // Restores the purchased clue too, not just the locked answer: the
        // student already paid for it.
        if (typeof restoreBuyAClueSubmission === 'function') {
            restoreBuyAClueSubmission(accepted);
        }
    } else if (type === 'minority_rule') {
        if (typeof markMinorityRuleLocked === 'function' && accepted.option_index != null) {
            markMinorityRuleLocked(accepted.option_index);
        }
    } else {
        return; // push_range has nothing to lock
    }

    if (feedback) {
        feedback.innerHTML = `<div style="color:#10b981;">✅ ${note}</div>`;
    }
}

async function handleUnifiedGameResults(message) {
    console.log('Game results:', message);
    
    // 1. Mark round ended and universally cancel any active running timer loops
    window.isRoundEnded = true;
    if (typeof timerInterval !== 'undefined' && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (typeof clearSuspenseShimmer === 'function') clearSuspenseShimmer();
    if (typeof clearTimerUrgency === 'function') clearTimerUrgency();
    
    // Make sure current game script is loaded (for dev mode jumping to results)
    if (message.game_type && !loadedGameScripts.has(message.game_type)) {
        console.log('📦 Loading current game script for results:', message.game_type);
        try {
            await loadGameScript(message.game_type);
        } catch (err) {
            console.error('❌ Failed to load current game script:', err);
        }
    }
    
    // Determine if this is the final round
    const isFinalRound = message.current_round >= message.total_rounds;
    const hasMoreRounds = !isFinalRound;

    // Budget Blitz and Buy a Clue render their own debrief: both compare the
    // student's own decision against what was achievable, which does not fit
    // the shared leaderboard-style layout below.
    if (message.game_type === 'budget_blitz' && typeof handleBudgetBlitzResults === 'function') {
        handleBudgetBlitzResults(message);
        return;
    }
    if (message.game_type === 'buy_a_clue' && typeof handleBuyAClueResults === 'function') {
        handleBuyAClueResults(message);
        return;
    }
    if (message.game_type === 'minority_rule' && typeof handleMinorityRuleResults === 'function') {
        handleMinorityRuleResults(message);
        return;
    }
    
    // Store next game type if provided in this message (for immediate preview)
    if (message.next_game_type) {
        nextGameType = message.next_game_type;
        console.log('📋 Next game type from results:', nextGameType);
        
        // Preload the next game's script immediately so it's ready when the round starts
        if (hasMoreRounds) {
            console.log('⚡ Preloading next game script:', nextGameType);
            loadGameScript(nextGameType).catch(err => {
                console.error('❌ Failed to preload next game script:', err);
            });
        }
    }
    
    // If we were waiting to enter, we can now enter for the next round
    if (isWaitingToEnter) {
        isWaitingToEnter = false;
        sessionStorage.setItem('waitingToEnter', 'false');
    }
    
    if (message.round_stats) {
        // Find player's position and stats
        const leaderboard = latestLeaderboard || [];
        
        const myStats = message.round_stats.player_stats?.[playerSession.id] || {
            player_round_score: 0,
            player_total_score: 0
        };
        
        console.log('My stats:', myStats);
        
        // If stats are missing or all zeros, show a different message
        const hasValidStats = message.round_stats && (myStats.player_round_score > 0 || myStats.player_total_score > 0 || message.round_stats.percent_scored > 0);
        
        // Clear suspense shimmer & timer urgency immediately upon results arrival
        if (typeof clearSuspenseShimmer === 'function') clearSuspenseShimmer();
        if (typeof clearTimerUrgency === 'function') clearTimerUrgency();

        // Update header score with smooth roll-up and floating points
        const scoreEl = document.getElementById('playerScore');
        if (scoreEl && myStats) {
            const currentDisplayed = parseInt(scoreEl.textContent) || 0;
            const targetScore = Number(myStats.player_total_score) || 0;
            if (typeof animateScoreCountUp === 'function') {
                animateScoreCountUp(scoreEl, currentDisplayed, targetScore);
            } else {
                scoreEl.textContent = targetScore;
            }

            const roundScore = Number(myStats.player_round_score) || (targetScore - currentDisplayed);
            if (roundScore > 0 && typeof spawnFloatingPoints === 'function') {
                spawnFloatingPoints(roundScore, scoreEl);
            }
        }
        
        // Build game-specific details HTML
        let gameSpecificHTML = '';
        if (message.game_specific) {
            const gs = message.game_specific;
            
            if (message.game_type === 'speed_tap') {
                // Speed Tap: Show fastest correct player and answer stats
                if (gs.fastest_correct) {
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize};">⚡ Fastest Correct: <span style="font-weight: 700;">${gs.fastest_correct.player_name}</span> (${gs.fastest_correct.response_time?.toFixed(2) || '?'}s)</div>
                        </div>
                    `;
                }
                // Show correct answer
                if (message.correct_answer) {
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.2); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize};">Correct Answer: <span style="font-weight: 700;">${message.correct_answer}</span></div>
                        </div>
                    `;
                }
                if (gs.correct_count !== undefined) {
                    const statFontSize = window.isProjectorMode ? '24px' : '14px';
                    const statPadding = window.isProjectorMode ? '12px 24px' : '8px 16px';
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; align-items: center; margin-bottom: 10px;">
                            <span style="background: rgba(16,185,129,0.3); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">✅ ${gs.correct_count} correct</span>
                            <span style="background: rgba(239,68,68,0.3); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">❌ ${gs.incorrect_count} incorrect</span>
                            ${window.isProjectorMode && hasMoreRounds ? `<span style="font-size: 28px; opacity: 0.9; margin-left: 10px;"><span style="display: inline-block; animation: rotate 2.5s ease-in-out infinite;">⏳</span> Waiting for instructor to start next round...</span>
                            <style>
                                @keyframes rotate {
                                    0% { transform: rotate(0deg); }
                                    40% { transform: rotate(180deg); }
                                    50% { transform: rotate(180deg); }
                                    90% { transform: rotate(360deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            </style>` : ''}
                        </div>
                    `;
                }
                // Show dot plot chart if available
                if (typeof showSpeedTapDotPlot === 'function' && gs.chart_data) {
                    gameSpecificHTML += showSpeedTapDotPlot(gs.chart_data);
                } else if (gs.chart_data) {
                    console.log('[SPEED TAP] Chart data available but showSpeedTapDotPlot function not loaded');
                }
            } else if (message.game_type === 'closest_guess') {
                // Closest Guess: Show top scorer with their range
                if (gs.top_scorer) {
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize};">🎯 Top Scorer: <span style="font-weight: 700;">${gs.top_scorer.name}</span> (${gs.top_scorer.points} pts, range: ${gs.top_scorer.range})</div>
                        </div>
                    `;
                }
                if (gs.correct_count !== undefined) {
                    const statFontSize = window.isProjectorMode ? '24px' : '14px';
                    const statPadding = window.isProjectorMode ? '12px 24px' : '8px 16px';
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; align-items: center; margin-bottom: 10px;">
                            <span style="background: rgba(16,185,129,0.3); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">✅ ${gs.correct_count}/${gs.total_guesses} captured answer</span>
                            ${gs.average_range_width ? `<span style="background: rgba(99,102,241,0.3); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">📊 Avg range: ${gs.average_range_width.toFixed(1)}</span>` : ''}
                            ${window.isProjectorMode && hasMoreRounds ? `<span style="font-size: 28px; opacity: 0.9; margin-left: 10px;"><span style="display: inline-block; animation: rotate 2.5s ease-in-out infinite;">⏳</span> Waiting for instructor to start next round...</span>
                            <style>
                                @keyframes rotate {
                                    0% { transform: rotate(0deg); }
                                    40% { transform: rotate(180deg); }
                                    50% { transform: rotate(180deg); }
                                    90% { transform: rotate(360deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            </style>` : ''}
                        </div>
                    `;
                }
                // Show chart if available - build from player_stats if chart_data not provided
                console.log('[CLOSEST GUESS DEBUG] Has chart_data?', !!gs.chart_data);
                console.log('[CLOSEST GUESS DEBUG] chart_data:', gs.chart_data);
                
                // Build chart data from round_stats if not provided
                let chartDataToUse = gs.chart_data;
                if (!chartDataToUse && message.round_stats && message.round_stats.player_stats) {
                    const results = [];
                    for (const [playerId, stats] of Object.entries(message.round_stats.player_stats)) {
                        if (stats.answered && stats.range) {
                            const [min, max] = stats.range.split('-').map(Number);
                            results.push({
                                player_id: playerId,
                                player_name: stats.player_name,
                                guess_min: min,
                                guess_max: max,
                                is_correct: stats.captured_answer
                            });
                        }
                    }
                    if (results.length > 0) {
                        chartDataToUse = {
                            correct_answer: parseFloat(message.correct_answer),
                            results: results
                        };
                    }
                }
                
                // HTML number line rendering for Closest Guess - matching in-game projector style
                if (chartDataToUse && chartDataToUse.results && chartDataToUse.results.length > 0) {
                    const containerId = 'closestGuessResultsContainer_' + Date.now();
                    const correctAnswer = chartDataToUse.correct_answer;
                    const results = chartDataToUse.results;
                    
                    // Calculate range from submitted guesses (for labels)
                    let dataMin = Math.min(...results.map(r => r.guess_min));
                    let dataMax = Math.max(...results.map(r => r.guess_max));
                    
                    // Calculate display range including correct answer (for chart bounds)
                    let displayMin = Math.min(dataMin, correctAnswer);
                    let displayMax = Math.max(dataMax, correctAnswer);
                    
                    // Add 10% padding to display range
                    let displayRange = displayMax - displayMin;
                    if (displayRange === 0) {
                        displayRange = 10;
                        displayMin -= displayRange / 2;
                        displayMax += displayRange / 2;
                    }
                    const padding = displayRange * 0.10;
                    const numberlineMin = Math.floor(displayMin - padding);
                    const numberlineMax = Math.ceil(displayMax + padding);
                    
                    // Calculate positions for min/max labels
                    const minPos = ((dataMin - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
                    const maxPos = ((dataMax - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
                    
                    // Calculate position for correct answer marker
                    const answerPos = ((correctAnswer - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
                    
                    // Calculate average guess (midpoint of each range, then average)
                    const rangeMidpoints = results.map(r => (r.guess_min + r.guess_max) / 2);
                    const averageGuess = rangeMidpoints.reduce((sum, val) => sum + val, 0) / rangeMidpoints.length;
                    const averagePos = ((averageGuess - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
                    
                    // Responsive sizing based on mode
                    const titleSize = window.isProjectorMode ? '36px' : '20px';
                    const barHeight = window.isProjectorMode ? '220px' : '120px';
                    const containerHeight = window.isProjectorMode ? '480px' : '280px';
                    const lineWidth = window.isProjectorMode ? '10px' : '6px';
                    const greenLineHeight = window.isProjectorMode ? '340px' : '180px';
                    const avgLabelBottom = window.isProjectorMode ? '250px' : '140px';
                    const answerLabelBottom = window.isProjectorMode ? '370px' : '200px';
                    const valueFontSize = window.isProjectorMode ? '40px' : '24px';
                    const labelFontSize = window.isProjectorMode ? '20px' : '14px';
                    const minMaxValueSize = window.isProjectorMode ? '40px' : '24px';
                    const minMaxLabelSize = window.isProjectorMode ? '24px' : '16px';
                    const minMaxBottom = window.isProjectorMode ? '130px' : '70px';
                    
                    // Build range bars HTML
                    const myPlayerId = typeof playerSession !== 'undefined' ? playerSession.id : null;
                    const myPlayerName = typeof playerSession !== 'undefined' ? playerSession.name : null;
                    let rangeBarsHTML = '';
                    let playerResultObj = null;

                    results.forEach(result => {
                        const rangeWidth = ((result.guess_max - result.guess_min) / (numberlineMax - numberlineMin)) * 100;
                        const rangeLeft = ((result.guess_min - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
                        const isMyGuess = (myPlayerId && (result.player_id == myPlayerId || result.player_session_id == myPlayerId)) ||
                                          (myPlayerName && result.player_name === myPlayerName);
                        if (isMyGuess) playerResultObj = result;

                        const captured = result.is_correct || (result.guess_min <= correctAnswer && result.guess_max >= correctAnswer);

                        let barStyle = '';
                        let extraBadge = '';

                        if (isMyGuess && !window.isProjectorMode) {
                            barStyle = 'background: rgba(245, 158, 11, 0.28); border: 2.5px solid #f59e0b; box-shadow: 0 0 16px rgba(245, 158, 11, 0.45); z-index: 6;';
                            extraBadge = `<span class="you-anchor-badge" style="position: absolute; top: -28px; left: 50%; transform: translateX(-50%); font-size: 11px; white-space: nowrap; font-weight: 800; z-index: 7;">★ YOU [${result.guess_min} – ${result.guess_max}]</span>`;
                        } else if (captured) {
                            barStyle = 'background: rgba(16, 185, 129, 0.16); border-top: 2px solid rgba(16, 185, 129, 0.6); border-bottom: 2px solid rgba(16, 185, 129, 0.6); z-index: 2;';
                        } else {
                            barStyle = 'background: rgba(148, 163, 184, 0.10); border-top: 1px dashed rgba(148, 163, 184, 0.35); border-bottom: 1px dashed rgba(148, 163, 184, 0.35); z-index: 1;';
                        }

                        rangeBarsHTML += `
                            <div style="position: absolute; left: ${Math.max(0, Math.min(100, rangeLeft))}%; width: ${Math.max(0, Math.min(100, rangeWidth))}%; height: ${barHeight}; bottom: 20px; border-radius: 6px; ${barStyle}">
                                ${extraBadge}
                            </div>
                        `;
                    });

                    // Summary row pills
                    const capturedCount = results.filter(r => r.is_correct || (r.guess_min <= correctAnswer && r.guess_max >= correctAnswer)).length;
                    const missedCount = results.length - capturedCount;
                    const summaryPillsHTML = `
                        <div style="display: flex; gap: 12px; justify-content: center; align-items: center; margin-top: 16px; flex-wrap: wrap;">
                            <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.4); padding: 4px 12px; border-radius: 999px; font-size: ${labelFontSize}; font-weight: 600; color: #065f46;">
                                <span style="width: 10px; height: 10px; background: #10b981; border-radius: 2px; display: inline-block;"></span> 🎯 Captured Target: ${capturedCount}
                            </span>
                            <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(148, 163, 184, 0.15); border: 1px solid rgba(148, 163, 184, 0.4); padding: 4px 12px; border-radius: 999px; font-size: ${labelFontSize}; font-weight: 600; color: #475569;">
                                <span style="width: 10px; height: 10px; background: #94a3b8; border-radius: 2px; display: inline-block;"></span> Missed: ${missedCount}
                            </span>
                            ${playerResultObj && !window.isProjectorMode ? `
                            <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(245, 158, 11, 0.15); border: 1.5px solid #f59e0b; padding: 4px 12px; border-radius: 999px; font-size: ${labelFontSize}; font-weight: 700; color: #92400e;">
                                ★ Your Guess: [${playerResultObj.guess_min} – ${playerResultObj.guess_max}] ${(playerResultObj.is_correct || (playerResultObj.guess_min <= correctAnswer && playerResultObj.guess_max >= correctAnswer)) ? '🎯 Target Captured!' : '❌ Missed Target'}
                            </span>
                            ` : ''}
                        </div>
                    `;
                    
                    gameSpecificHTML += `
                        <div style="margin: 40px 0;">
                            <div style="font-size: ${titleSize}; font-weight: 700; color: #1e293b; margin-bottom: 20px; text-align: center;">📊 All Player Ranges</div>
                            <div style="min-height: ${containerHeight}; background: rgba(255,255,255,0.95); border-radius: 12px; padding: 40px 20px; position: relative;">
                                ${rangeBarsHTML}
                                <div style="position: absolute; left: ${averagePos}%; bottom: 20px; width: 0; height: ${barHeight}; border-left: ${lineWidth} dotted #000000; transform: translateX(-50%); z-index: 1;"></div>
                                <div style="position: absolute; left: ${averagePos}%; bottom: ${avgLabelBottom}; transform: translateX(-50%); text-align: center; background: white; border-radius: 12px; padding: 8px 15px; z-index: 10;">
                                    <div style="font-size: ${valueFontSize}; font-weight: 700; color: #000000;">${averageGuess.toFixed(1)}</div>
                                    <div style="font-size: ${labelFontSize}; font-weight: 400; color: #000000;">Average Guess</div>
                                </div>
                                <div class="laser-answer-line" style="position: absolute; left: ${answerPos}%; bottom: 20px; width: ${lineWidth}; height: ${greenLineHeight}; background: #10b981; box-shadow: 0 0 24px rgba(16, 185, 129, 0.8), 0 0 8px #10b981; transform: translateX(-50%); z-index: 4;"></div>
                                <div style="position: absolute; left: ${answerPos}%; bottom: ${answerLabelBottom}; transform: translateX(-50%); text-align: center; background: white; border-radius: 12px; padding: 8px 15px; z-index: 10;">
                                    <div style="font-size: ${valueFontSize}; font-weight: 700; color: #10b981;">${correctAnswer}</div>
                                    <div style="font-size: ${labelFontSize}; font-weight: 400; color: #10b981;">Correct Answer</div>
                                </div>
                                <div style="position: absolute; left: ${minPos - 2.5}%; bottom: ${minMaxBottom}; transform: translate(-50%, 50%); text-align: center;">
                                    <div style="font-size: ${minMaxValueSize}; font-weight: 700; color: #1e293b;">${dataMin}</div>
                                    <div style="font-size: ${minMaxLabelSize}; font-weight: 600; color: #64748b;">(min)</div>
                                </div>
                                <div style="position: absolute; left: ${maxPos + 2.5}%; bottom: ${minMaxBottom}; transform: translate(-50%, 50%); text-align: center;">
                                    <div style="font-size: ${minMaxValueSize}; font-weight: 700; color: #1e293b;">${dataMax}</div>
                                    <div style="font-size: ${minMaxLabelSize}; font-weight: 600; color: #64748b;">(max)</div>
                                </div>
                            </div>
                            ${summaryPillsHTML}
                        </div>
                    `;
                }
            } else if (message.game_type === 'push_range') {
                // Push Range: Show final range and correct answer
                const fontSize = window.isProjectorMode ? '48px' : '20px';
                const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                const rangeColor = gs.is_correct ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
                const rangeIcon = gs.is_correct ? '✅' : '❌';
                gameSpecificHTML += `
                    <div style="background: ${rangeColor}; padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                        <div style="font-size: ${fontSize};">${rangeIcon} Final Range: <span style="font-weight: 700;">${gs.final_range}</span> (Answer: ${message.correct_answer}%)</div>
                    </div>
                `;
                if (gs.top_pressers && gs.top_pressers.length > 0) {
                    const topPresser = gs.top_pressers[0];
                    const teamEmoji = topPresser.team === 'left' ? '🔵' : '🔴';
                    const statFontSize = window.isProjectorMode ? '24px' : '14px';
                    const statPadding = window.isProjectorMode ? '12px 24px' : '8px 16px';
                    const topPresserPoints = topPresser.points || topPresser.presses;
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; align-items: center; margin-bottom: 10px;">
                            <span style="background: rgba(255,255,255,0.2); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">🏆 Top Presser: ${teamEmoji} ${topPresser.player_name} (${topPresser.presses} presses) • ${topPresserPoints} pts</span>
                        </div>
                    `;
                }
                // Show chart if available
                console.log('[PUSH RANGE DEBUG] Has chart_data?', !!gs.chart_data);
                console.log('[PUSH RANGE DEBUG] chart_data:', gs.chart_data);
                console.log('[PUSH RANGE DEBUG] showPushRangeResults function exists?', typeof showPushRangeResults === 'function');
                if (typeof showPushRangeResults === 'function' && gs.chart_data) {
                    console.log('[PUSH RANGE DEBUG] Calling showPushRangeResults...');
                    const topPad = window.__PRAXIS_IOS_NATIVE ? '12px' : '120px';
                    gameSpecificHTML += `<div style="padding-top: ${topPad};">${showPushRangeResults(gs.chart_data)}</div>`;
                } else if (gs.chart_data) {
                    console.log('[PUSH RANGE] Chart data available but showPushRangeResults function not loaded');
                }
            } else if (message.game_type === 'crowd_wisdom') {
                // Crowd Wisdom: Show tough question bonus and distribution
                if (gs.was_tough_question) {
                    gameSpecificHTML += `
                        <div style="background: rgba(245,158,11,0.4); padding: 12px 20px; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: 20px; font-weight: 700;">🏆 Tough Question Bonus!</div>
                            <div style="font-size: 14px; opacity: 0.9;">Correct answer wasn't the most popular - 2x points for those who got it right!</div>
                        </div>
                    `;
                }
                if (gs.top_scorer) {
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: 14px; opacity: 0.9;">🧠 Top Scorer</div>
                            <div style="font-size: 20px; font-weight: 700;">${gs.top_scorer.name} <span style="opacity: 0.8; font-size: 14px;">(${gs.top_scorer.points} pts${gs.top_scorer.got_bonus ? ' 🏆' : ''})</span></div>
                        </div>
                    `;
                }
                // Show correct answer
                if (message.correct_answer) {
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    // Extract answer text - correct_answer might be an object with 'text' property or a string
                    const answerText = typeof message.correct_answer === 'object' ? 
                        (message.correct_answer.text || message.correct_answer.answer || JSON.stringify(message.correct_answer)) : 
                        message.correct_answer;
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.2); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize}; font-weight: 700;">Correct Answer: ${answerText}</div>
                        </div>
                    `;
                }
                // Show player's result first (points earned/lost)
                if (myStats && myStats.points_earned !== undefined) {
                    const pointsColor = myStats.points_earned > 0 ? '#10b981' : myStats.points_earned < 0 ? '#ef4444' : '#64748b';
                    const pointsPrefix = myStats.points_earned > 0 ? '+' : '';
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: 15px 20px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
                            <div style="color: ${pointsColor}; font-size: 28px; font-weight: 700;">${pointsPrefix}${myStats.points_earned} points</div>
                            ${myStats.got_tough_bonus ? '<div style="color: #f59e0b; margin-top: 5px; font-size: 14px;">🏆 Tough Question Bonus (2x)!</div>' : ''}
                        </div>
                    `;
                }
                
                // Show distribution chart with color coding and Crowd Dynamics Drama
                if (gs.final_distribution && Array.isArray(gs.final_distribution)) {
                    const totalAnswered = gs.final_distribution.reduce((sum, opt) => sum + (opt.percent || 0), 0);
                    const percentDidntAnswer = Math.max(0, 100 - totalAnswered);
                    const correctIndex = gs.correct_option_index;
                    
                    // Determine student's selection
                    const myPick = (typeof crowdWisdomState !== 'undefined' && crowdWisdomState.selectedOption !== null)
                        ? crowdWisdomState.selectedOption
                        : (myStats && myStats.selected_option !== undefined ? myStats.selected_option : null);

                    // Calculate crowd majority
                    const maxPercentOpt = gs.final_distribution.reduce((prev, curr) => ((curr.percent || 0) > (prev.percent || 0)) ? curr : prev, gs.final_distribution[0]);
                    const majorityPercent = maxPercentOpt ? Math.round(maxPercentOpt.percent || 0) : 0;
                    const majorityIsCorrect = maxPercentOpt && maxPercentOpt.option_index === correctIndex;
                    const playerPickedCorrect = myPick === correctIndex;

                    let dramaBannerHTML = '';
                    if (majorityPercent >= 40) {
                        if (!majorityIsCorrect && playerPickedCorrect) {
                            dramaBannerHTML = `
                                <div class="herd-rebel-banner banner-rebel">
                                    <span style="font-size: 1.3rem;">🐺</span>
                                    <span><strong>LONE REBEL!</strong> You resisted the herd and nailed the right answer while ${majorityPercent}% were fooled!</span>
                                </div>
                            `;
                        } else if (majorityIsCorrect) {
                            dramaBannerHTML = `
                                <div class="herd-rebel-banner banner-consensus">
                                    <span style="font-size: 1.3rem;">🧠</span>
                                    <span><strong>WISDOM OF THE CROWD!</strong> The collective mind prevailed with ${majorityPercent}% on the correct answer.</span>
                                </div>
                            `;
                        } else {
                            dramaBannerHTML = `
                                <div class="herd-rebel-banner banner-fooled">
                                    <span style="font-size: 1.3rem;">🐑</span>
                                    <span><strong>HERD MENTALITY!</strong> ${majorityPercent}% of players gathered on a trap distractor!</span>
                                </div>
                            `;
                        }
                    }

                    gameSpecificHTML += `
                        <div class="distribution-container" style="margin-top: 20px;">
                            ${dramaBannerHTML}
                            <div class="distribution-row unanswered-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px; border-radius: 8px; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);">
                                <div class="distribution-label" style="width: 180px; font-weight: 600; color: #64748b;">❌ Didn't Answer</div>
                                <div class="distribution-bar-wrapper" style="flex: 1; height: 24px; background: #e2e8f0; border-radius: 12px; margin: 0 12px; overflow: hidden;">
                                    <div class="distribution-bar grow-bar-animated" style="height: 100%; width: ${percentDidntAnswer}%; border-radius: 12px; background: linear-gradient(90deg, #ef4444, #f87171); animation-delay: 0.1s;"></div>
                                </div>
                                <div class="distribution-percent" style="width: 50px; text-align: right; font-weight: 700; color: #1e293b;">${Math.round(percentDidntAnswer)}%</div>
                            </div>
                            ${gs.final_distribution.map((opt, optIdx) => {
                                const isCorrect = opt.option_index === correctIndex;
                                const isMyChoice = opt.option_index === myPick;
                                const barColor = isCorrect ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)';
                                const textColor = isCorrect ? '#10b981' : '#ef4444';
                                const rowStyle = isMyChoice
                                    ? 'border: 2px solid #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.25); background: #fffbeb;'
                                    : 'background: #f8fafc;';
                                const delaySec = (0.25 + (optIdx * 0.18)).toFixed(2);
                                return `
                                    <div class="distribution-row" style="display: flex; align-items: center; margin-bottom: 10px; padding: 8px; border-radius: 8px; ${rowStyle}">
                                        <div class="distribution-label" style="width: 180px; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 4px;">
                                            <span>${opt.text}</span>
                                            ${isMyChoice ? `<span class="you-anchor-badge" style="font-size: 0.65rem; padding: 1px 6px;">★ YOU</span>` : ''}
                                        </div>
                                        <div class="distribution-bar-wrapper" style="flex: 1; height: 24px; background: #e2e8f0; border-radius: 12px; margin: 0 12px; overflow: hidden;">
                                            <div class="distribution-bar grow-bar-animated" style="height: 100%; width: ${opt.percent || 0}%; border-radius: 12px; background: ${barColor}; animation-delay: ${delaySec}s;"></div>
                                        </div>
                                        <div class="distribution-percent" style="width: 50px; text-align: right; font-weight: 700; color: ${textColor};">${Math.round(opt.percent || 0)}%</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                }
                
                if (gs.correct_count !== undefined) {
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 10px;">
                            <span style="background: rgba(16,185,129,0.3); padding: 8px 16px; border-radius: 20px;">✅ ${gs.correct_count} correct</span>
                            <span style="background: rgba(239,68,68,0.3); padding: 8px 16px; border-radius: 20px;">❌ ${gs.incorrect_count} incorrect</span>
                            <span style="background: rgba(148,163,184,0.3); padding: 8px 16px; border-radius: 20px;">⏰ ${gs.no_answer_count} no answer</span>
                        </div>
                    `;
                }
                // Show distribution chart if available
                if (gs.distribution && gs.distribution.length > 0) {
                    gameSpecificHTML += `
                        <div style="margin: 20px 0; padding: 20px; background: rgba(255,255,255,0.1); border-radius: 12px;">
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 15px; text-align: center;">Answer Distribution</div>
                            ${gs.distribution.map(opt => {
                                const barColor = opt.is_correct ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.6)';
                                const textColor = opt.is_correct ? '#10b981' : '#ef4444';
                                const borderColor = opt.is_correct ? '#10b981' : '#ef4444';
                                return `
                                    <div style="margin-bottom: 12px;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                            <span style="font-weight: 600; color: ${textColor};">${opt.text}</span>
                                            <span style="font-weight: 700; color: ${textColor};">${opt.percent}%</span>
                                        </div>
                                        <div style="width: 100%; height: 32px; background: rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; border: 2px solid ${borderColor};">
                                            <div style="width: ${opt.percent}%; height: 100%; background: ${barColor}; transition: width 0.3s ease;"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `;
                }            } else if (message.game_type === 'word_guess') {
                // Word Guess: Match Speed Tap results formatting
                if (gs.fastest_correct) {
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    // Use guess_time from snapshot data
                    const timeValue = gs.fastest_correct.guess_time || gs.fastest_correct.time_remaining || gs.fastest_correct.time || 0;
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.15); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize};">⚡ Fastest Correct: <span style="font-weight: 700;">${gs.fastest_correct.player_name}</span> (${timeValue.toFixed(1)}s)</div>
                        </div>
                    `;
                }
                // Show correct answer
                if (message.correct_answer) {
                    const fontSize = window.isProjectorMode ? '48px' : '20px';
                    const padding = window.isProjectorMode ? '20px 30px' : '12px 20px';
                    gameSpecificHTML += `
                        <div style="background: rgba(255,255,255,0.2); padding: ${padding}; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-size: ${fontSize};">Correct Answer: <span style="font-weight: 700;">${message.correct_answer.toUpperCase()}</span></div>
                        </div>
                    `;
                }
                if (gs.correct_count !== undefined) {
                    const statFontSize = window.isProjectorMode ? '24px' : '14px';
                    const statPadding = window.isProjectorMode ? '12px 24px' : '8px 16px';
                    gameSpecificHTML += `
                        <div style="display: flex; gap: 15px; justify-content: center; align-items: center; margin-bottom: 10px;">
                            <span style="background: rgba(16,185,129,0.3); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">✅ ${gs.correct_count} correct</span>
                            <span style="background: rgba(239,68,68,0.3); padding: ${statPadding}; border-radius: 20px; font-size: ${statFontSize};">❌ ${gs.incorrect_count || 0} incorrect</span>
                            ${window.isProjectorMode && hasMoreRounds ? `<span style="font-size: 28px; opacity: 0.9; margin-left: 10px;"><span style="display: inline-block; animation: rotate 2.5s ease-in-out infinite;">⏳</span> Waiting for instructor to start next round...</span>
                            <style>
                                @keyframes rotate {
                                    0% { transform: rotate(0deg); }
                                    40% { transform: rotate(180deg); }
                                    50% { transform: rotate(180deg); }
                                    90% { transform: rotate(360deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            </style>` : ''}
                        </div>
                    `;
                }            } else if (message.game_type === 'line_fit') {
                // Line Fit: Show scatter plot with true line and all submissions
                console.log('[GAME CORE DEBUG] line_fit results - message.game_specific:', message.game_specific);
                console.log('[GAME CORE DEBUG] game_specific keys:', Object.keys(message.game_specific || {}));
                console.log('[GAME CORE DEBUG] all_submissions:', message.game_specific?.all_submissions);
                console.log('[GAME CORE DEBUG] Full message object:', message);
                
                // Merge player-specific data if available
                if (window.lineFitPlayerData && window.lineFitPlayerData.your_line) {
                    message.game_specific.your_line = window.lineFitPlayerData.your_line;
                    message.game_specific.your_rank = window.lineFitPlayerData.your_rank;
                    message.game_specific.your_points = window.lineFitPlayerData.your_points;
                    console.log('[GAME CORE DEBUG] Merged player line data:', message.game_specific.your_line);
                }
                
                if (typeof showLineFitResults === 'function') {
                    gameSpecificHTML += showLineFitResults(message.game_specific);
                } else {
                    // Fallback text display if function not loaded
                    if (gs.true_line) {
                        gameSpecificHTML += `
                            <div style="background: rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 8px; margin-bottom: 15px;">
                                <div style="font-size: 14px; opacity: 0.9;">📈 True Regression Line</div>
                                <div style="font-size: 18px; font-weight: 700;">y = ${gs.true_line.slope.toFixed(3)}x + ${gs.true_line.intercept.toFixed(2)}</div>
                                <div style="font-size: 14px; opacity: 0.8;">r = ${gs.correlation?.toFixed(3) || '?'}, R² = ${gs.r_squared?.toFixed(3) || '?'}</div>
                            </div>
                        `;
                    }
                    if (gs.average_sse !== undefined) {
                        gameSpecificHTML += `
                            <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 10px;">
                                <span style="background: rgba(99,102,241,0.3); padding: 8px 16px; border-radius: 20px;">📊 Average SSE: ${gs.average_sse.toFixed(2)}</span>
                                <span style="background: rgba(16,185,129,0.3); padding: 8px 16px; border-radius: 20px;">✅ ${gs.submission_count} submissions</span>
                            </div>
                        `;
                    }
                }
            }
        }
        
        const banner = document.createElement('div');
        banner.id = 'roundCompleteBanner';
        banner.style.cssText = 'margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); color: white;';
        
        lastResultsMessage = message;
        if (typeof leaderboardVisibility !== 'undefined') {
            lastLeaderboardVisibility = leaderboardVisibility;
        }

        const roundFooterHTML = hasMoreRounds 
            ? (window.isProjectorMode 
                ? `<div style="margin-top: 25px; font-size: 28px; opacity: 0.9;"><span style="display: inline-block; animation: rotate 2.5s ease-in-out infinite;">⏳</span> ${_pickBetweenRound()}<style>@keyframes rotate { 0% { transform: rotate(0deg); } 40% { transform: rotate(180deg); } 50% { transform: rotate(180deg); } 90% { transform: rotate(360deg); } 100% { transform: rotate(360deg); } }</style></div>` 
                : `<div style="margin-top: 15px; font-size: 16px; opacity: 0.9;">⏳ ${_pickBetweenRound()}</div>`)
            : `
                <div style="margin-top: ${window.isProjectorMode ? '30px' : '20px'}; text-align: center;">
                    <div style="font-size: ${window.isProjectorMode ? '32px' : '18px'}; font-weight: 700; color: #f59e0b; margin-bottom: 14px;">
                        🏁 That was the final question!
                    </div>
                    <button id="showFinaleBtn" onclick="triggerShowFinalStandings()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border: none; border-radius: 12px; padding: ${window.isProjectorMode ? '18px 42px' : '12px 24px'}; font-size: ${window.isProjectorMode ? '28px' : '16px'}; font-weight: 800; cursor: pointer; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4); transition: transform 0.1s, box-shadow 0.2s;">
                        🏆 Reveal Final Winner & Standings
                    </button>
                </div>
            `;
        
        if (hasValidStats) {
            const roundScoreNum = Number(myStats.player_round_score) || 0;
            const heroVerdictHTML = !window.isProjectorMode ? `
                <div class="round-verdict-hero ${roundScoreNum > 0 ? 'verdict-positive' : 'verdict-neutral'}">
                    <span>${roundScoreNum > 0 ? '🎯' : '💡'}</span>
                    <span>${roundScoreNum > 0 ? `+${roundScoreNum} pts earned! Great round!` : `Round ${message.current_round} Complete — Check out class stats below:`}</span>
                </div>
            ` : '';

            banner.innerHTML = `
                <div style="text-align: center;">
                    ${heroVerdictHTML}
                    <h2 style="color: white; margin: 0 0 15px 0; font-size: ${window.isProjectorMode ? '44px' : '24px'}; font-weight: 800;">
                        🎉 Round ${message.current_round} of ${message.total_rounds} Complete!
                    </h2>
                    ${gameSpecificHTML}
                    ${!window.isProjectorMode ? `
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 15px;">
                            <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; backdrop-filter: blur(10px);">
                                <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Players Scored</div>
                                <div style="font-size: 28px; font-weight: 700;">${message.round_stats.percent_scored}%</div>
                            </div>
                            <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; backdrop-filter: blur(10px);">
                                <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Your Round Score</div>
                                <div style="font-size: 28px; font-weight: 700;">${myStats.player_round_score} pts</div>
                            </div>
                            <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; backdrop-filter: blur(10px);">
                                <div style="font-size: 14px; opacity: 0.9; margin-bottom: 5px;">Total Score</div>
                                <div style="font-size: 28px; font-weight: 700;">${myStats.player_total_score} pts</div>
                            </div>
                        </div>
                    ` : ''}
                    ${roundFooterHTML}
                </div>
            `;
        } else {
            // Fallback if stats aren't available yet
            banner.innerHTML = `
                <div style="text-align: center;">
                    <h2 style="color: white; margin: 0 0 15px 0; font-size: ${window.isProjectorMode ? '44px' : '24px'}; font-weight: 800;">
                        🎉 Round ${message.current_round} of ${message.total_rounds} Complete!
                    </h2>
                    ${gameSpecificHTML}
                    ${roundFooterHTML}
                </div>
            `;
        }
        
        // Clear gameArea and insert the results banner
        const gameArea = document.getElementById('gameArea');
        gameArea.innerHTML = '';
        gameArea.appendChild(banner);
        
        // If there are more rounds, show the instruction card for the NEXT game below the results
        if (hasMoreRounds && nextGameType) {
            console.log(`🎴 Rendering next game preview card for: ${nextGameType}`);
            const instructionCard = getInstructionCardHTML(nextGameType);
            if (instructionCard) {
                // Add a "Next Up" header to make it clear this is for the upcoming round
                const nextGameSection = document.createElement('div');
                const headerColor = window.isProjectorMode ? 'white' : '#64748b';
                const headerSize = window.isProjectorMode ? '56px' : '18px';
                nextGameSection.innerHTML = `
                    <div style="margin-top: 30px; text-align: center;">
                        <h3 style="color: ${headerColor}; font-size: ${headerSize}; margin-bottom: 15px;">📋 Next Round Preview</h3>
                        ${instructionCard}
                    </div>
                `;
                gameArea.appendChild(nextGameSection);
            } else {
                console.error(`❌ Failed to get instruction card for game type: ${nextGameType}`);
            }
        } else if (hasMoreRounds && !nextGameType) {
            console.warn('⚠️ More rounds exist but nextGameType is not set!');
        }
        
        // If this is the final round, keep results banner on screen for class discussion
        if (isFinalRound) {
            console.log('🏁 Final round results displayed - review screen active until finale is triggered');
        }
    } else {
        // Single-round game: replace with traditional game over screen
        const winnerText = message.winner 
            ? `🏆 Winner: ${message.winner}` 
            : (message.message || '⏱️ Time is up! No correct answers.');
        
        const detailsHTML = message.winner ? `
            ${message.response_time_ms ? `<strong>Time:</strong> ${message.response_time_ms}ms<br>` : ''}
            ${message.multiplier ? `<span class="multiplier-badge">${message.multiplier}x</span>` : ''}
        ` : '';
        
        document.getElementById('gameArea').innerHTML = `
            <div class="results-display">
                <h2>🎉 Game Over!</h2>
                <div class="result-card">
                    ${winnerText}<br>
                    ${detailsHTML}
                    <p style="margin-top: 15px; color: #64748b;">Check the leaderboard to see where you landed →</p>
                </div>
            </div>
        `;
    }
}

let lastResultsMessage = null;
let lastLeaderboardVisibility = 'always_show';

function triggerShowFinalStandings() {
    console.log('🏆 triggerShowFinalStandings called');
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
            action: 'show_final_standings',
            data: {}
        }));
    }
    showFinalStandings(lastResultsMessage || {}, lastLeaderboardVisibility);
}
window.triggerShowFinalStandings = triggerShowFinalStandings;

function showFinalStandings(message, leaderboardVisibility) {
    const gameArea = document.getElementById('gameArea');
    const isProjector = window.isProjectorMode || false;
    
    // Use the stored leaderboard instead of message.leaderboard
    const leaderboard = latestLeaderboard || [];
    
    // Check projector settings for leaderboard visibility
    const projectorShowsLeaderboard = window.isProjectorMode ? window.projectorSettings?.showLeaderboard : true;
    const shouldShowLeaderboard = leaderboardVisibility === 'always_show' && leaderboard.length > 0 && projectorShowsLeaderboard;
    
    // Find player's position and stats (skip in projector mode)
    let myPosition = -1;
    let myStats = { player_total_score: 0 };
    
    if (!isProjector && playerSession) {
        myPosition = leaderboard.length > 0 ? leaderboard.findIndex(p => 
            p.player_id === playerSession.id || p.player_name === playerSession.display_name
        ) : -1;
        
        myStats = message.round_stats?.player_stats?.[playerSession.id] || {
            player_total_score: playerSession.score || 0
        };
    }
    
    // Responsive sizing for projector vs player mode
    const iconSize = isProjector ? '128px' : '64px';
    const titleSize = isProjector ? '72px' : '32px';
    const subtitleSize = isProjector ? '36px' : '18px';
    const scoreContainerPadding = isProjector ? '40px' : '20px';
    const scoreLabelSize = isProjector ? '32px' : '16px';
    const scoreValueSize = isProjector ? '96px' : '48px';
    const rankSize = isProjector ? '36px' : '18px';
    const leaderboardTitleSize = isProjector ? '48px' : '24px';
    const leaderboardItemSize = isProjector ? '32px' : '16px';
    const leaderboardItemPadding = isProjector ? '16px' : '8px';
    
    let leaderboardHTML = '';
    if (shouldShowLeaderboard) {
        // Apply player name masking if in projector mode
        const getDisplayName = (name, index) => {
            if (window.isProjectorMode && !window.projectorSettings?.showPlayerNames) {
                return `Player ${index + 1}`;
            }
            return name;
        };
        
        leaderboardHTML = `
            <div class="leaderboard-preview" style="margin-top: ${isProjector ? '40px' : '20px'}; background: rgba(255,255,255,0.1); padding: ${isProjector ? '30px' : '15px'}; border-radius: ${isProjector ? '16px' : '8px'};">
                <h3 style="margin-bottom: ${isProjector ? '20px' : '10px'}; color: white; font-size: ${leaderboardTitleSize};">🏆 Final Leaderboard</h3>
                ${leaderboard.slice(0, 5).map((p, i) => `
                    <div style="display: flex; justify-content: space-between; padding: ${leaderboardItemPadding}; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: ${leaderboardItemSize};">
                        <span>#${i+1} ${getDisplayName(p.player_name, i)}</span>
                        <span style="font-weight: bold;">${p.score} pts</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // For projector mode, show leaderboard only (no personal score section)
    if (isProjector) {
        gameArea.innerHTML = `
            <div class="results-display" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; padding: 40px; text-align: center;">
                <div style="font-size: ${iconSize}; margin-bottom: 30px;">🏆</div>
                <h2 style="font-size: ${titleSize}; margin-bottom: 20px; font-weight: 800;">That's a Wrap!</h2>
                <p style="color: #94a3b8; font-size: ${subtitleSize};">GG, everyone. Here's how it shook out.</p>
                
                ${leaderboardHTML}
            </div>
        `;
    } else {
        // Player mode shows personal score + leaderboard
        gameArea.innerHTML = `
            <div class="results-display" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; text-align: center;">
                <div style="font-size: ${iconSize}; margin-bottom: 20px;">🏆</div>
                <h2 style="font-size: ${titleSize}; margin-bottom: 10px;">That's a Wrap!</h2>
                <p style="color: #94a3b8; font-size: ${subtitleSize};">GG — here's how you did.</p>
                
                <div style="margin: 30px 0; padding: ${scoreContainerPadding}; background: rgba(255,255,255,0.1); border-radius: 12px;">
                    <div style="font-size: ${scoreLabelSize}; color: #94a3b8; margin-bottom: 5px;">Your Final Score</div>
                    <div style="font-size: ${scoreValueSize}; font-weight: 800; color: #3b82f6;">${myStats.player_total_score}</div>
                    ${myPosition !== -1 ? `<div style="font-size: ${rankSize}; color: #10b981; margin-top: 5px;">Rank #${myPosition + 1}</div>` : ''}
                </div>
                
                ${leaderboardHTML}
                
                <button onclick="location.reload()" style="margin-top: 30px; background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: pointer;">
                    🔄 Play Again
                </button>
            </div>
        `;
    }
}

function updateLeaderboard(leaderboard) {
    console.log('🏆 Updating leaderboard with data:', leaderboard);
    latestLeaderboard = leaderboard;
    
    // Render leaderboard list
    const leaderboardList = document.getElementById('leaderboardList');
    if (leaderboardList && leaderboard && leaderboard.length > 0) {
        // Get current player's ID from session
        const playerSessionData = JSON.parse(sessionStorage.getItem('playerSession') || '{}');
        const currentPlayerId = playerSessionData.id;
        
        // Build leaderboard HTML
        let html = '';
        leaderboard.forEach((player, index) => {
            const rank = index + 1;
            // Support both backend format (name, player_id) and dev mode format (player_name, player_id)
            const playerName = player.player_name || player.name || 'Unknown';
            const playerId = player.player_id;
            const isOwnPlayer = playerId === currentPlayerId;
            const rankClass = rank === 1 ? 'first' : rank === 2 ? 'second' : rank === 3 ? 'third' : '';
            const itemClass = isOwnPlayer ? 'leaderboard-item own' : 'leaderboard-item';
            
            html += `
                <div class="${itemClass}">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div class="rank ${rankClass}">${rank}</div>
                        <div>${playerName}</div>
                    </div>
                    <div style="font-weight: 700; font-size: 1.1rem;">${player.score}</div>
                </div>
            `;
        });
        
        leaderboardList.innerHTML = html;
    }
    
    // Update header score and rank from leaderboard
    if (playerSession && playerSession.display_name) {
        const myEntry = leaderboard.find(entry => entry.name === playerSession.display_name);
        if (myEntry) {
            const scoreEl = document.getElementById('playerScore');
            const rankEl = document.getElementById('playerRank');
            
            if (scoreEl) {
                scoreEl.textContent = myEntry.score;
            }
            
            if (rankEl && myEntry.rank) {
                rankEl.textContent = myEntry.rank;
            }
        }
    }
}

function handleGameEnd(message) {
    // 1. Mark round ended and universally cancel any active running timer loops
    window.isRoundEnded = true;
    if (typeof timerInterval !== 'undefined' && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (typeof clearSuspenseShimmer === 'function') clearSuspenseShimmer();
    if (typeof clearTimerUrgency === 'function') clearTimerUrgency();

    // If instructor ended the game session directly via 'manual_end'
    if (message.reason === 'manual_end') {
        console.log('🏁 Game ended manually by instructor - showing final standings');
        showFinalStandings(message, typeof leaderboardVisibility !== 'undefined' ? leaderboardVisibility : 'always_show');
        return;
    }

    // Check if this is an intermediate round in a multi-round game
    const totalRounds = message.total_rounds || 1;
    const currentRound = message.current_round || 1;
    
    // If we have round stats or game_specific, show the summary banner instead of skipping to game over
    if (message.round_stats || message.game_specific) {
        // Clear the game area first to remove the game interface
        document.getElementById('gameArea').innerHTML = '';
        // Show the unified results banner (which includes waiting message or finale reveal button)
        handleUnifiedGameResults(message);
        return;
    }
    
    if (totalRounds > 1 && currentRound < totalRounds) {
        // Intermediate round - show waiting state instead of game over
        document.getElementById('gameArea').innerHTML = `
            <div class="waiting-state">
                <h2>🎉 Round ${currentRound} down!</h2>
                <div class="spinner"></div>
                <p style="color: #64748b;">${_pickBetweenRound()}</p>
                <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                    <h3>Current Standings</h3>
                    <p>Peek at the leaderboard to see where you are!</p>
                </div>
            </div>
        `;
    } else {
        // Final round
        showFinalStandings(message, typeof leaderboardVisibility !== 'undefined' ? leaderboardVisibility : 'always_show');
    }
}

function handlePlayerKicked(message) {
    console.log('Player kicked:', message);
    
    // Get the current player's session ID
    const playerSession = JSON.parse(sessionStorage.getItem('playerSession'));
    
    // Check if this player was kicked (use == for loose comparison to handle type differences)
    if (playerSession && message.player_id == playerSession.id) {
        // Deliberate: never auto-rejoin a removed player.
        sessionEndedDeliberately = true;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        
        // Close the WebSocket connection
        if (window.websocket) {
            window.websocket.close();
        }
        
        // Show kicked message
        const gameArea = document.getElementById('gameArea');
        gameArea.innerHTML = `
            <div class="waiting-state" style="text-align: center;">
                <div style="font-size: 64px; margin-bottom: 1.5rem;">👋</div>
                <h2 style="color: #ef4444;">You've Been Removed</h2>
                <p style="color: #64748b; font-size: 1.1rem; margin: 1.5rem 0;">
                    The host pulled you from this session. It\u2019s not you, it\u2019s\u2026 well, it might be you.
                </p>
                <p style="color: #94a3b8; font-size: 0.95rem;">
                    ${message.reason || 'No reason given'}
                </p>
                <div style="margin-top: 2rem;">
                    <a href="game-join.html" style="display: inline-block; background: #3b82f6; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1.1rem;">
                        Join Another Game
                    </a>
                </div>
            </div>
        `;
        
        // Clear leaderboard
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) {
            leaderboard.style.display = 'none';
        }
    }
}

function handleRoundChange(message) {
    // Clear any leftover timer or shimmer from previous round
    if (typeof timerInterval !== 'undefined' && timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (typeof clearSuspenseShimmer === 'function') clearSuspenseShimmer();
    if (typeof clearTimerUrgency === 'function') clearTimerUrgency();

    // Store the next game type for showing instructions in the summary card
    nextGameType = message.next_game_type;
    console.log('📋 Round changed - next game type:', nextGameType);
    
    // Note: We don't call showWaitingState here because handleUnifiedGameResults
    // already shows the summary card with next game instructions included
}

function handleError(message) {
    console.error('Game error:', message);
    const feedback = document.getElementById('feedback');
    if (feedback) {
        feedback.innerHTML = `<div class="alert alert-danger">${message.message}</div>`;
    }
}

// Global timer sync state
let expectedEndTime = null;
const SYNC_DRIFT_THRESHOLD = 1000; // 1 second

function handleTimerSync(message) {
    // Server sends time_remaining in seconds
    const serverTimeRemaining = message.time_remaining * 1000; // Convert to ms
    const newExpectedEndTime = Date.now() + serverTimeRemaining;
    
    // Check if we need to adjust for drift
    if (expectedEndTime !== null) {
        const drift = Math.abs(newExpectedEndTime - expectedEndTime);
        const driftSeconds = (drift / 1000).toFixed(2);
        
        console.log(`⏱️ Timer sync: server=${(message.time_remaining).toFixed(2)}s, drift=${driftSeconds}s`);
        
        if (drift > SYNC_DRIFT_THRESHOLD) {
            console.warn(`⚠️ Timer drift detected: ${driftSeconds}s - correcting expectedEndTime`);
            expectedEndTime = newExpectedEndTime;
            // Timer will auto-correct on next update since it checks expectedEndTime
        }
    } else {
        expectedEndTime = newExpectedEndTime;
    }
}

// ========== SCREEN WAKE LOCK ==========
// Prevents mobile screens (iOS Safari 16.4+, Chrome Android) and projector displays
// from dimming or falling asleep during active gameplay or between-round debriefs.
let screenWakeLock = null;

async function requestScreenWakeLock() {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        try {
            screenWakeLock = await navigator.wakeLock.request('screen');
            screenWakeLock.addEventListener('release', () => {
                console.log('[WakeLock] Screen wake lock released');
                screenWakeLock = null;
            });
            console.log('[WakeLock] Screen wake lock active');
        } catch (err) {
            // Can fail if battery is critical or tab is backgrounded
            console.warn('[WakeLock] Screen wake lock request failed:', err.name, err.message);
        }
    }
}

function initScreenWakeLock() {
    // Attempt acquisition on load
    requestScreenWakeLock();

    // Re-acquire automatically when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            requestScreenWakeLock();
        }
    });

    // Also acquire on first touch or click (iOS policy sometimes requires user interaction)
    const onFirstInteraction = () => {
        if (!screenWakeLock) {
            requestScreenWakeLock();
        }
    };
    window.addEventListener('touchstart', onFirstInteraction, { passive: true, once: true });
    window.addEventListener('click', onFirstInteraction, { passive: true, once: true });
}

/**
 * Single-Page Join Handler
 * Eliminates mobile page reloads by joining game session in-place and transitioning directly to gameplay.
 */
async function handleInlineJoin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const roomInput = document.getElementById('joinRoomCode');
    const nameInput = document.getElementById('joinPlayerName');
    const btn = document.getElementById('inlineJoinBtn');
    const errorEl = document.getElementById('joinErrorMessage');
    const warnEl = document.getElementById('joinWarningMessage');
    const successEl = document.getElementById('joinSuccessMessage');

    if (errorEl) errorEl.style.display = 'none';
    if (warnEl) warnEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';

    const enteredRoom = (roomInput ? roomInput.value : '').trim().toUpperCase();
    const enteredName = (nameInput ? nameInput.value : '').trim();

    if (!enteredRoom) {
        if (errorEl) { errorEl.textContent = 'Please enter a room code'; errorEl.style.display = 'block'; }
        if (roomInput) roomInput.focus();
        return;
    }
    if (!enteredName) {
        if (errorEl) { errorEl.textContent = 'Please enter your name'; errorEl.style.display = 'block'; }
        if (nameInput) nameInput.focus();
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:0.5rem; vertical-align:middle;"></span>Joining...';
    }

    try {
        const decoratedName = typeof decorateGuestName === 'function'
            ? decorateGuestName(enteredRoom, enteredName)
            : enteredName;

        const requestData = {
            room_code: enteredRoom,
            guest_name: decoratedName
        };

        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Token ${token}`;
        }

        const MAX_JOIN_RETRIES = 4;
        let response, data;

        for (let attempt = 0; attempt <= MAX_JOIN_RETRIES; attempt++) {
            response = await fetch(`${API_BASE}/game/join/`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData)
            });

            try {
                data = await response.json();
            } catch (_) {
                data = {};
            }

            if (response.status !== 429) {
                break;
            }

            const detail = (data && (data.detail || data.error)) || '';
            const parsed = /(\d+)\s*second/.exec(detail);
            const waitSeconds = Math.min(parsed ? parseInt(parsed[1], 10) + 1 : 5, 30);

            if (attempt >= MAX_JOIN_RETRIES) {
                throw new Error('This room is receiving many join requests at once. Please wait a moment and try again.');
            }

            for (let rem = waitSeconds; rem > 0; rem--) {
                if (btn) btn.textContent = `Room is busy — retrying in ${rem}s`;
                await new Promise(r => setTimeout(r, 1000));
            }
            if (btn) btn.innerHTML = '<span class="spinner" style="display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:0.5rem; vertical-align:middle;"></span>Joining...';
        }

        if (!response.ok) {
            const message = (window.ErrorUtils && ErrorUtils.messageFrom)
                ? ErrorUtils.messageFrom(data, response.status, 'Failed to join game')
                : (data.error || data.detail || 'Failed to join game');
            throw new Error(message);
        }

        if (data.warning && warnEl) {
            warnEl.textContent = data.warning;
            warnEl.style.display = 'block';
        }

        // Store sessions in sessionStorage
        sessionStorage.setItem('gameSession', JSON.stringify(data.game_session));
        sessionStorage.setItem('playerSession', JSON.stringify(data.player_session));
        sessionStorage.setItem('isGuest', data.is_guest);
        sessionStorage.setItem('waitingToEnter', data.waiting_to_enter || false);

        // Remember name locally for convenience
        try {
            localStorage.setItem('last_praxis_player_name', enteredName);
        } catch (_) {}

        // Update in-memory session globals
        window.roomCode = enteredRoom;
        roomCode = enteredRoom;
        window.gameSession = data.game_session;
        gameSession = data.game_session;
        window.playerSession = data.player_session;
        playerSession = data.player_session;
        window.isGuest = data.is_guest;
        isGuest = data.is_guest;
        window.isWaitingToEnter = Boolean(data.waiting_to_enter);
        isWaitingToEnter = Boolean(data.waiting_to_enter);

        // Update URL cleanly without reloading page
        try {
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('room', enteredRoom);
            window.history.replaceState({}, '', newUrl.toString());
        } catch (_) {}

        // Transition views in-place (no page reload)
        const joinCard = document.getElementById('joinCard');
        if (joinCard) joinCard.style.display = 'none';

        const gameHeader = document.querySelector('.game-header');
        if (gameHeader) gameHeader.style.display = 'flex';

        const gameArea = document.getElementById('gameArea');
        if (gameArea) gameArea.style.display = 'block';

        const leaderboardEl = document.getElementById('leaderboard');
        if (leaderboardEl) leaderboardEl.style.display = 'block';

        // Populate header
        const nameEl = document.getElementById('playerName');
        if (nameEl) nameEl.textContent = data.player_session.display_name || enteredName;

        const roomEl = document.getElementById('roomCodeDisplay');
        if (roomEl) roomEl.textContent = enteredRoom;

        // Initialize Wake Lock & connect WebSocket
        initScreenWakeLock();
        connectWebSocket();

    } catch (err) {
        console.error('[JOIN] Inline join error:', err);
        if (errorEl) {
            errorEl.textContent = err.message || 'Failed to join game';
            errorEl.style.display = 'block';
        }
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Join Game';
        }
    }
}
if (typeof window !== 'undefined') {
    window.handleInlineJoin = handleInlineJoin;
}

// Initialize connection when script loads
// Note: This should be called after all scripts are loaded
document.addEventListener('DOMContentLoaded', () => {
    // Keep device screen awake during live game sessions
    initScreenWakeLock();

    const joinCard = document.getElementById('joinCard');
    const gameHeader = document.querySelector('.game-header');
    const gameArea = document.getElementById('gameArea');
    const leaderboardEl = document.getElementById('leaderboard');

    // Check if player is already joined (e.g. from previous join or page reload)
    const hasPlayerSession = playerSession && playerSession.id;

    if (!hasPlayerSession) {
        console.log('[JOIN] No active player session — showing single-page join card');
        if (joinCard) joinCard.style.display = 'block';
        if (gameHeader) gameHeader.style.display = 'none';
        if (gameArea) gameArea.style.display = 'none';
        if (leaderboardEl) leaderboardEl.style.display = 'none';

        const roomInput = document.getElementById('joinRoomCode');
        const nameInput = document.getElementById('joinPlayerName');

        // Pre-fill room code from URL if available
        if (roomInput && roomCode) {
            roomInput.value = roomCode;
        }

        // Pre-fill name from localStorage if available
        if (nameInput) {
            try {
                const savedName = localStorage.getItem('last_praxis_player_name') || localStorage.getItem('guest_name');
                if (savedName) nameInput.value = savedName;
            } catch (_) {}

            if (!roomCode && roomInput) {
                roomInput.focus();
            } else {
                nameInput.focus();
            }
        }
        return; // Wait for student to tap Join Game; do NOT connect socket with undefined session
    }

    // Player already has session: show game UI and connect
    if (joinCard) joinCard.style.display = 'none';
    if (gameHeader) gameHeader.style.display = 'flex';
    if (gameArea) gameArea.style.display = 'block';
    if (leaderboardEl) leaderboardEl.style.display = 'block';

    if (playerSession && playerSession.id) {
        const nameEl = document.getElementById('playerName');
        const name = playerSession.display_name || 'Player';
        if (nameEl) {
            nameEl.textContent = name;
            console.log('Set player name to:', name);
        }
    }

    if (roomCode) {
        const roomEl = document.getElementById('roomCodeDisplay');
        if (roomEl) {
            roomEl.textContent = roomCode;
            console.log('Set room code to:', roomCode);
        }
    }

    // Only connect if we have a room code
    if (roomCode) {
        connectWebSocket();
    } else {
        console.error('No room code found in URL');
        if (joinCard) {
            joinCard.style.display = 'block';
            if (gameHeader) gameHeader.style.display = 'none';
            if (gameArea) gameArea.style.display = 'none';
        } else {
            document.getElementById('gameArea').innerHTML = `
                <div class="waiting-state">
                    <h2>❌ Hmm, No Room Code</h2>
                    <p>We can't find a room to put you in. Head back and try the code again.</p>
                    <a href="game-join.html" style="display: inline-block; margin-top: 1rem; color: #3b82f6;">Back to Join Page</a>
                </div>
            `;
        }
    }
});

// ========== CHART RENDERING FUNCTIONS ==========
// These need to be in game-core.js so they're always available for end-of-round results
// Note: showPushRangeResults is now in game-push-range.js and returns HTML

function showClosestGuessResults(chartData) {
    console.log('[CLOSEST GUESS CHART] showClosestGuessResults called with:', chartData);
    if (!chartData) {
        console.log('[CLOSEST GUESS CHART] No chart data, returning empty string');
        return '';
    }
    
    // Create canvas for the chart
    const canvasId = 'closestGuessResultsCanvas_' + Date.now();
    console.log('[CLOSEST GUESS CHART] Created canvas ID:', canvasId);
    console.log('[CLOSEST GUESS CHART] Setting timeout to draw chart...');
    setTimeout(() => {
        console.log('[CLOSEST GUESS CHART] Timeout fired, calling draw function');
        drawClosestGuessResultsCanvas(canvasId, chartData);
    }, 100);
    
    return `
        <div style="margin: 20px 0;">
            <canvas id="${canvasId}" width="800" height="300" style="max-width: 100%; background: rgba(255,255,255,0.95); border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></canvas>
        </div>
    `;
}

function drawClosestGuessResultsCanvas(canvasId, chartData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.log('[CLOSEST GUESS CHART] Canvas not found:', canvasId);
        return;
    }
    
    console.log('[CLOSEST GUESS CHART] Drawing chart with data:', chartData);
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Determine range from data
    const playerRanges = chartData.results || chartData.player_ranges || [];
    const correctAnswer = chartData.correct_answer;
    
    if (playerRanges.length === 0) {
        console.log('[CLOSEST GUESS CHART] No player ranges to display');
        return;
    }
    
    // Support both field name formats: guess_min/guess_max or min/max.
    // `??`, not `||`: a legitimate bound of 0 is falsy and used to fall through
    // to an absent field, putting NaN into every plotted coordinate.
    let minVal = Math.min(...playerRanges.map(r => r.guess_min ?? r.min));
    let maxVal = Math.max(...playerRanges.map(r => r.guess_max ?? r.max));
    
    // Expand range to include correct answer
    if (correctAnswer !== undefined && correctAnswer !== null) {
        minVal = Math.min(minVal, correctAnswer);
        maxVal = Math.max(maxVal, correctAnswer);
    }
    
    // Add padding
    const range = maxVal - minVal;
    minVal -= range * 0.1;
    maxVal += range * 0.1;
    
    // Draw axis
    const margin = 60;
    const axisY = height - 50;
    const chartWidth = width - 2 * margin;
    
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, axisY);
    ctx.lineTo(width - margin, axisY);
    ctx.stroke();
    
    // Draw player ranges as horizontal bars
    const barHeight = Math.min(30, (height - 100) / playerRanges.length);
    playerRanges.forEach((range, idx) => {
        const rangeMin = range.guess_min ?? range.min;
        const rangeMax = range.guess_max ?? range.max;
        
        const x1 = margin + ((rangeMin - minVal) / (maxVal - minVal)) * chartWidth;
        const x2 = margin + ((rangeMax - minVal) / (maxVal - minVal)) * chartWidth;
        const y = 30 + idx * (barHeight + 5);
        
        // Draw bar
        ctx.fillStyle = range.is_correct ? 'rgba(16, 185, 129, 0.5)' : 'rgba(148, 163, 184, 0.4)';
        ctx.fillRect(x1, y, x2 - x1, barHeight);
        
        // Draw border
        ctx.strokeStyle = range.is_correct ? '#10b981' : '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y, x2 - x1, barHeight);
        
        // Draw player name
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(range.player_name.substring(0, 15), margin - 5, y + barHeight / 2 + 4);
    });
    
    // Draw correct answer line
    if (correctAnswer !== undefined && correctAnswer !== null) {
        const answerX = margin + ((correctAnswer - minVal) / (maxVal - minVal)) * chartWidth;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(answerX, 20);
        ctx.lineTo(answerX, axisY);
        ctx.stroke();
        
        // Answer label
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Answer: ${correctAnswer}`, answerX, 15);
    }
    
    // Draw scale labels
    ctx.fillStyle = '#1e293b';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
        const val = minVal + (i / labelCount) * (maxVal - minVal);
        const x = margin + (i / labelCount) * chartWidth;
        ctx.fillText(val.toFixed(1), x, axisY + 20);
    }
    
    console.log('[CLOSEST GUESS CHART] Chart drawn successfully');
}

function showSpeedTapDotPlot(chartData) {
    if (!chartData || !chartData.all_responses) return '';
    
    // Create canvas for the dot plot
    const canvasId = 'speedTapDotPlot_' + Date.now();
    setTimeout(() => drawSpeedTapDotPlot(canvasId, chartData), 100);
    
    const isProjector = typeof window !== 'undefined' && Boolean(window.isProjectorMode);
    const canvasWidth = isProjector ? 1200 : 800;
    const canvasHeight = isProjector ? 420 : 300;
    const titleSize = isProjector ? '32px' : '16px';
    const padding = isProjector ? '24px 30px' : '20px';

    // Calculate percentile chip for player
    let percentileHTML = '';
    if (!isProjector && typeof playerSession !== 'undefined' && chartData.all_responses.length > 0) {
        const myResp = chartData.all_responses.find(r => 
            (playerSession.id && (r.player_id == playerSession.id || r.player_session_id == playerSession.id)) ||
            (playerSession.name && r.player_name === playerSession.name)
        );
        if (myResp && myResp.is_correct && myResp.response_time_ms) {
            const myTime = myResp.response_time_ms;
            const total = chartData.all_responses.length + (chartData.non_responders?.length || 0);
            const slowerOrIncorrect = chartData.all_responses.filter(r => !r.is_correct || r.response_time_ms > myTime).length + (chartData.non_responders?.length || 0);
            const percentile = Math.min(99, Math.max(1, Math.round((slowerOrIncorrect / total) * 100)));
            percentileHTML = `
                <div class="speed-percentile-chip">
                    <span>⚡ Faster than <strong>${percentile}%</strong> of players</span>
                    <span style="opacity: 0.6;">•</span>
                    <span>${(myTime / 1000).toFixed(2)}s</span>
                </div>
            `;
        }
    }
    
    return `
        <div style="margin: ${isProjector ? '30px 0' : '20px 0'}; text-align: center;">
            <div style="font-size: ${titleSize}; font-weight: 700; color: #1e293b; margin-bottom: 8px; text-align: center;">⚡ Response Time Distribution</div>
            ${percentileHTML}
            <canvas id="${canvasId}" width="${canvasWidth}" height="${canvasHeight}" style="max-width: 100%; height: auto; background: rgba(255,255,255,0.98); border-radius: 16px; padding: ${padding}; box-shadow: 0 8px 24px rgba(0,0,0,0.12); display: inline-block;"></canvas>
        </div>
    `;
}

function drawSpeedTapDotPlot(canvasId, chartData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.log('[SPEED TAP DOT PLOT] Canvas not found:', canvasId);
        return;
    }
    
    console.log('[SPEED TAP DOT PLOT] Drawing chart with data:', chartData);
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    const allResponses = chartData.all_responses || [];
    const nonResponders = chartData.non_responders || [];
    const gameTimeLimit = chartData.game_time_limit || 20;
    
    const isProjector = typeof window !== 'undefined' && Boolean(window.isProjectorMode);
    
    // Chart dimensions scaled for projector mode
    const margin = isProjector ? 80 : 60;
    const extraRight = isProjector ? 160 : 100;
    const chartWidth = width - 2 * margin - extraRight; // Extra space on right for non-responder pile
    const axisY = isProjector ? height - 60 : height - 40;
    const dotRadius = isProjector ? 9 : 5;
    const dotSpacing = isProjector ? 2 : 2;
    const stackStep = dotRadius * 2 + dotSpacing;
    
    // Draw axis
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = isProjector ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(margin, axisY);
    ctx.lineTo(margin + chartWidth, axisY);
    ctx.stroke();
    
    // Draw time labels (0s, middle, max)
    ctx.fillStyle = '#1e293b';
    ctx.font = isProjector ? 'bold 22px Arial' : 'bold 14px Arial';
    ctx.textAlign = 'center';
    
    const midTime = gameTimeLimit / 2;
    const labelYOffset = isProjector ? 40 : 30;
    ctx.fillText('0s', margin, axisY + labelYOffset);
    ctx.fillText(`${midTime}s`, margin + chartWidth / 2, axisY + labelYOffset);
    ctx.fillText(`${gameTimeLimit}s`, margin + chartWidth, axisY + labelYOffset);
    
    // Organize responses into time slots (20 bins)
    const numBins = 20;
    const binWidth = gameTimeLimit / numBins;
    const bins = Array.from({ length: numBins }, () => ({ correct: [], incorrect: [] }));
    
    // Place each response into a bin
    allResponses.forEach(resp => {
        const timeSeconds = resp.response_time_ms / 1000;
        let binIndex = Math.floor(timeSeconds / binWidth);
        
        // Clamp to last bin if exactly at max time
        if (binIndex >= numBins) binIndex = numBins - 1;
        if (binIndex < 0) binIndex = 0;
        
        if (resp.is_correct) {
            bins[binIndex].correct.push(resp);
        } else {
            bins[binIndex].incorrect.push(resp);
        }
    });
    
    // Check player identity for YOU callout flag
    const myPlayerId = typeof playerSession !== 'undefined' ? playerSession.id : null;
    const myPlayerName = typeof playerSession !== 'undefined' ? playerSession.name : null;
    let myDotCoords = null;

    // Draw dots - stack vertically within each bin
    bins.forEach((bin, binIndex) => {
        const binCenterX = margin + (binIndex + 0.5) * (chartWidth / numBins);
        
        // Draw incorrect (red) dots first
        bin.incorrect.forEach((resp, stackIndex) => {
            const dotY = axisY - (stackIndex + 1) * stackStep;
            const isMyDot = (myPlayerId && (resp.player_id == myPlayerId || resp.player_session_id == myPlayerId)) ||
                            (myPlayerName && resp.player_name === myPlayerName);
            if (isMyDot && !isProjector) {
                myDotCoords = { x: binCenterX, y: dotY, timeMs: resp.response_time_ms };
            }

            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(binCenterX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fill();
            if (isProjector) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        });
        
        // Draw correct (green) dots on top
        const incorrectHeight = bin.incorrect.length;
        bin.correct.forEach((resp, stackIndex) => {
            const dotY = axisY - (incorrectHeight + stackIndex + 1) * stackStep;
            const isMyDot = (myPlayerId && (resp.player_id == myPlayerId || resp.player_session_id == myPlayerId)) ||
                            (myPlayerName && resp.player_name === myPlayerName);
            if (isMyDot && !isProjector) {
                myDotCoords = { x: binCenterX, y: dotY, timeMs: resp.response_time_ms };
            }

            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(binCenterX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fill();
            if (isProjector) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        });
    });
    
    // Draw non-responders as gray dots in a pile on the right
    if (nonResponders.length > 0) {
        const pileX = margin + chartWidth + (isProjector ? 80 : 50);
        const pileStartY = axisY;
        
        // Label for non-responders
        ctx.fillStyle = '#64748b';
        ctx.font = isProjector ? 'bold 18px Arial' : 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No Answer', pileX, axisY + labelYOffset);
        
        // Stack gray dots
        nonResponders.forEach((player, index) => {
            const dotY = pileStartY - (index + 1) * stackStep;
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(pileX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fill();
            if (isProjector) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        });
    }

    // YOU Callout Pin Flag on Player's dot
    if (myDotCoords) {
        const { x, y, timeMs } = myDotCoords;
        ctx.save();
        
        // Outer glowing pulse ring around player's dot
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = isProjector ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius + 3.5, 0, Math.PI * 2);
        ctx.stroke();
        
        // Floating Callout Pin
        const pinHeight = isProjector ? 32 : 22;
        const pinY = y - dotRadius - 5;
        const text = `★ YOU (${(timeMs / 1000).toFixed(2)}s)`;
        ctx.font = isProjector ? 'bold 15px Arial' : 'bold 11px Arial';
        const textMetrics = ctx.measureText(text);
        const pinWidth = textMetrics.width + 14;
        
        // Pin pointer stem
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - dotRadius);
        ctx.lineTo(x, pinY);
        ctx.stroke();
        
        // Pin badge bubble
        const bubbleX = Math.max(margin, Math.min(width - margin - pinWidth, x - pinWidth / 2));
        const bubbleY = pinY - pinHeight + 2;
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
        ctx.shadowBlur = 6;
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(bubbleX, bubbleY, pinWidth, pinHeight, 6);
            ctx.fill();
        } else {
            ctx.fillRect(bubbleX, bubbleY, pinWidth, pinHeight);
        }
        ctx.shadowBlur = 0;
        
        // Pin text
        ctx.fillStyle = '#1e1e2f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bubbleX + pinWidth / 2, bubbleY + pinHeight / 2);
        ctx.restore();
    }
    
    // Legend
    const legendY = isProjector ? 35 : 20;
    const legendX = margin;
    
    ctx.font = isProjector ? 'bold 18px Arial' : 'bold 12px Arial';
    ctx.textAlign = 'left';
    
    const legendOffset1 = isProjector ? 24 : 15;
    const legendOffset2 = isProjector ? 130 : 80;
    const legendOffset3 = isProjector ? 154 : 95;
    const legendOffset4 = isProjector ? 280 : 180;
    const legendOffset5 = isProjector ? 304 : 195;
    const textYOffset = isProjector ? 6 : 4;
    
    // Green dot + label
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(legendX, legendY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Correct', legendX + legendOffset1, legendY + textYOffset);
    
    // Red dot + label
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(legendX + legendOffset2, legendY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Incorrect', legendX + legendOffset3, legendY + textYOffset);
    
    // Gray dot + label
    if (nonResponders.length > 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(legendX + legendOffset4, legendY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.fillText('No Answer', legendX + legendOffset5, legendY + textYOffset);
    }
    
    console.log('[SPEED TAP DOT PLOT] Chart drawn successfully');
}

// ===== Closest Guess Results Chart =====
function showClosestGuessResults(chartData) {
    console.log('[CLOSEST GUESS CHART] showClosestGuessResults called with:', chartData);
    if (!chartData || !chartData.results || chartData.results.length === 0) {
        console.log('[CLOSEST GUESS CHART] No chart data, returning empty string');
        return '';
    }
    
    const canvasId = 'closestGuessResultsCanvas_' + Date.now();
    console.log('[CLOSEST GUESS CHART] Created canvas ID:', canvasId);
    console.log('[CLOSEST GUESS CHART] Setting timeout to draw chart...');
    
    setTimeout(() => {
        console.log('[CLOSEST GUESS CHART] Timeout fired, calling draw function');
        drawClosestGuessResultsCanvas(canvasId, chartData);
    }, 100);
    
    return `
        <div style="margin-top: 20px;">
            <canvas id="${canvasId}" width="800" height="400" style="max-width: 100%; height: auto; background: white; border-radius: 8px;"></canvas>
        </div>
    `;
}

function drawClosestGuessResultsCanvas(canvasId, chartData) {
    console.log('[CLOSEST GUESS CHART] drawClosestGuessResultsCanvas called');
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('[CLOSEST GUESS CHART] Canvas not found:', canvasId);
        return;
    }
    console.log('[CLOSEST GUESS CHART] Canvas found, drawing...');
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    const correctAnswer = chartData.correct_answer;
    const results = chartData.results;
    
    // Calculate range for visualization
    let minVal = correctAnswer;
    let maxVal = correctAnswer;
    
    results.forEach(r => {
        const min = r.guess_min !== undefined ? r.guess_min : r.min;  // Support both field names
        const max = r.guess_max !== undefined ? r.guess_max : r.max;
        if (min < minVal) minVal = min;
        if (max > maxVal) maxVal = max;
    });
    
    // Add padding
    const range = maxVal - minVal;
    const padding = range * 0.1 || 10;
    minVal -= padding;
    maxVal += padding;
    
    const margin = 60;
    const chartWidth = width - 2 * margin;
    const chartHeight = height - 2 * margin;
    const barHeight = Math.min(30, (chartHeight - 60) / results.length);
    const startY = 80;
    
    // Title
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Player Guess Ranges vs Correct Answer', width / 2, 30);
    
    // Draw each player's range
    results.forEach((result, index) => {
        const y = startY + index * (barHeight + 10);
        
        const min = result.guess_min !== undefined ? result.guess_min : result.min;
        const max = result.guess_max !== undefined ? result.guess_max : result.max;
        
        // Calculate positions
        const minX = margin + ((min - minVal) / (maxVal - minVal)) * chartWidth;
        const maxX = margin + ((max - minVal) / (maxVal - minVal)) * chartWidth;
        const rangeWidth = maxX - minX;
        
        // Color: green if correct, red if not
        const color = result.is_correct ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)';
        const borderColor = result.is_correct ? '#10b981' : '#ef4444';
        
        // Draw range bar
        ctx.fillStyle = color;
        ctx.fillRect(minX, y, rangeWidth, barHeight);
        
        // Border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(minX, y, rangeWidth, barHeight);
        
        // Player name
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(result.player_name, margin - 10, y + barHeight / 2 + 4);
        
        // Range values
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px Arial';
        const icon = result.is_correct ? '✓' : '';
        ctx.fillText(`${icon} ${min}-${max}`, minX + rangeWidth / 2, y + barHeight / 2 + 4);
    });
    
    // Draw correct answer line
    const answerX = margin + ((correctAnswer - minVal) / (maxVal - minVal)) * chartWidth;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(answerX, startY - 20);
    ctx.lineTo(answerX, startY + results.length * (barHeight + 10));
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Answer label
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Correct: ${correctAnswer}`, answerX, startY - 30);
    
    // X-axis scale
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Arial';
    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
        const val = minVal + (i / numTicks) * (maxVal - minVal);
        const x = margin + (i / numTicks) * chartWidth;
        ctx.textAlign = 'center';
        ctx.fillText(val.toFixed(1), x, height - 20);
    }
    
    console.log('[CLOSEST GUESS CHART] Chart drawn successfully');
}
