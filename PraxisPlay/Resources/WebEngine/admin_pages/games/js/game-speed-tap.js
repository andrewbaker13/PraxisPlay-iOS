/**
 * Speed Tap Game Module
 * Handles the Speed Tap game mode logic
 */

function showSpeedTapGame(message, timeLimit) {
    // Use actual options from server if provided, otherwise fallback to A/B/C/D
    console.log('=== showSpeedTapGame DEBUG ===');
    console.log('message object:', message);
    console.log('message.options:', message.options);
    console.log('message.game_config:', message.game_config);
    
    let options = message.options || [];
    
    // If options not at top level, try game_config
    if (!options.length && message.game_config && message.game_config.options) {
        console.log('Options found in game_config');
        options = message.game_config.options;
    }
    
    if (!options.length) {
        console.warn('WARNING: No options found in message, using fallback A/B/C/D');
        // Fallback for legacy/demo questions
        options = [
            {id: 'A', text: 'A'},
            {id: 'B', text: 'B'},
            {id: 'C', text: 'C'},
            {id: 'D', text: 'D'}
        ];
    }
    
    console.log('Final options array:', options);
    
    const imageHTML = typeof renderQuestionImageHTML === 'function' 
        ? renderQuestionImageHTML(message.image_url) 
        : (message.image_url ? `<img src="${message.image_url}" alt="Question image" style="max-width: ${window.isProjectorMode ? '90%' : '100%'}; max-height: ${window.isProjectorMode ? '48vh' : '28vh'}; margin: 12px auto; border-radius: 12px; display: block; object-fit: contain; background: white; padding: 10px;">` : '');
    
    // Projector mode: show participation instead of interactive buttons
    if (window.isProjectorMode) {
        // Reset participation tracking for new question
        if (window.speedTapParticipation) {
            window.speedTapParticipation.respondedPlayers = new Set();
        }
        
        document.getElementById('gameArea').innerHTML = `
            <div class="speed-tap-area">
                <div class="question-display" style="display: flex; justify-content: center; align-items: center; gap: 20px; flex-wrap: nowrap; margin: 20px 0;">
                    <div class="timer" id="timer" style="font-size: 80px; font-weight: 800; color: #ef4444; text-align: center; background: white; border-radius: 16px; padding: 20px 40px; flex-shrink: 0; min-width: 120px;">${timeLimit}</div>
                    <div class="question-text" style="font-size: 48px; font-weight: 700; text-align: center; background: white; border-radius: 16px; padding: 30px 50px; color: #1e293b; flex: 1; max-width: 70%;">${message.question_text}</div>
                </div>
                ${imageHTML}
                
                <div style="display: grid; grid-template-columns: repeat(${options.length}, 1fr); gap: 20px; max-width: 1400px; margin: 0 auto;">
                    ${options.map((opt, index) => `
                        <div style="background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95)); padding: 40px 30px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); border: 3px solid rgba(102,126,234,0.3); text-align: center;">
                            <div style="font-size: 28px; font-weight: 700; color: #667eea; margin-bottom: 12px;">${String.fromCharCode(65 + index)}</div>
                            <div style="font-size: 36px; font-weight: 600; color: #1e293b; line-height: 1.3;">${opt.text}</div>
                        </div>
                    `).join('')}
                </div>
                <div id="speedTapParticipation" style="margin-top: 40px; text-align: center; background: #f8fafc; padding: 30px; border-radius: 16px;">
                    <div style="font-size: 48px; font-weight: 700; color: #64748b; margin: 20px 0;">
                        0 / ${window.speedTapParticipation?.totalPlayers || '?'} Players Responded
                    </div>
                    <div style="font-size: 64px; font-weight: 800; color: #1e293b;">
                        0%
                    </div>
                </div>
            </div>
        `;
        
        // Initialize participation display
        if (window.updateSpeedTapParticipation) {
            setTimeout(() => window.updateSpeedTapParticipation(), 100);
        }
        return;
    }
    
    document.getElementById('gameArea').innerHTML = `
        <div class="speed-tap-area">
            <div class="question-display">
                <div class="question-text">${message.question_text}</div>
                ${imageHTML}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                    <div class="timer" id="timer">${timeLimit}</div>
                    <div style="font-size: 24px; font-weight: 700; color: #10b981;" id="availablePoints">100 pts</div>
                </div>
            </div>
            <div class="answer-options" id="answerOptions">
                ${options.map(opt => `
                    <button class="answer-btn" data-answer="${opt.text}" onclick="submitSpeedTap('${opt.text.replace(/'/g, "\\'")}')">
                        ${opt.text}
                    </button>
                `).join('')}
            </div>
            <div id="feedback" style="margin-top: 20px; font-size: 18px; color: #64748b; font-weight: 500; min-height: 30px;"></div>
        </div>
    `;
}

function submitSpeedTap(answer) {
    // 1. Highlight selected answer and grey out others immediately (optimistic UI)
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
        if (btn.dataset.answer === answer) {
            btn.classList.add('selected');
        } else {
            btn.classList.add('unselected');
        }
    });

    // 2. Dispatch action (or buffer if socket is momentarily reconnecting)
    sendGameAction('speed_tap', {
        player_session_id: playerSession.id,
        answer: answer,
        timestamp: Date.now() / 1000
    });

    // 3. Immediate reassuring feedback
    const isBuffered = typeof websocket === 'undefined' || !websocket || websocket.readyState !== WebSocket.OPEN;
    const feedback = document.getElementById('feedback');
    if (feedback) {
        if (typeof showLockedInStamp === 'function') {
            showLockedInStamp(feedback, {
                message: isBuffered ? 'Syncing submission with room…' : undefined
            });
        } else {
            const _tapWaitLines = ['Locked in. Let\'s see how it goes\u2026', 'Answer\'s in \u2014 fingers crossed!', 'Submitted! Now we wait\u2026', 'Done! Hoping that was the one\u2026', 'The judges are deliberating\u2026', 'Schr\u00f6dinger\'s answer: right until proven wrong.', 'Your fate is in the server\'s hands now.', 'Confidence interval: cautiously optimistic.', 'Hypothesis submitted. Awaiting results.', 'Regression to the mean? Not you.', 'Margin of error: unknown. Vibes: high.', 'Submitted. No take-backs.'];
            feedback.innerHTML = '\u23f3 ' + _tapWaitLines[Math.floor(Math.random() * _tapWaitLines.length)];
        }
    }
}

function handleSpeedTapAnswer(message) {
    // At round end, reveal correctness for all
    const correctAnswer = message.correct_answer;
    const playerAnswer = message.player_answer;
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.classList.remove('selected', 'unselected', 'correct', 'incorrect');
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
        if (btn.dataset.answer === correctAnswer) {
            btn.classList.add('correct');
            btn.style.borderWidth = '6px';
            btn.innerHTML = `<span style='font-size:2rem; color:#10b981;'>✔️</span> ` + btn.textContent;
        }
        if (btn.dataset.answer === playerAnswer && playerAnswer !== correctAnswer) {
            btn.classList.add('incorrect');
            btn.innerHTML = `<span style='font-size:2rem; color:#ef4444;'>❌</span> ` + btn.textContent;
        }
    });
    // Show feedback
    const feedback = document.getElementById('feedback');
    if (feedback) {
        if (playerAnswer === correctAnswer) {
            const _correctLines = ['Nailed it!', 'Big brain energy!', 'Textbook.', 'Chef\'s kiss.', 'Smooth operator.', 'Statistically significant talent.', 'That\'s going on the r\u00e9sum\u00e9.', 'Like you wrote the answer key.', 'Top of the distribution.', 'Maximum likelihood? More like maximum skill.', 'You just moved the needle.', 'First-mover advantage: claimed.'];
            const _correctPick = _correctLines[Math.floor(Math.random() * _correctLines.length)];
            feedback.innerHTML = `<div class='alert alert-success'>\u2705 ${_correctPick} +${message.points} points <span class='multiplier-badge'>${message.multiplier}x</span></div>`;
        } else {
            feedback.innerHTML = `<div class='alert alert-error'>\u274c Not this time \u2014 the answer was <strong>${correctAnswer}</strong>.</div>`;
        }
    }
}

let lastSpeedTapHapticTick = null;
function startSpeedTapTimer(seconds, startTime) {
    // Clear any existing timer first to prevent double-counting
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (typeof clearTimerUrgency === 'function') clearTimerUrgency();
    if (typeof clearSuspenseShimmer === 'function') clearSuspenseShimmer();
    lastSpeedTapHapticTick = null;
    
    const timerEl = document.getElementById('timer');
    const pointsEl = document.getElementById('availablePoints');
    const endTime = startTime + (seconds * 1000);
    
    // Mirrors the server: correct is worth 100, plus up to 25 for answering
    // early. Keep in sync with `speed_tap_points` in core/games/speed/speed_tap.py.
    const basePoints = 100;
    const maxSpeedBonus = 25;
    
    function updatePoints(remaining) {
        const fractionLeft = seconds > 0 ? Math.max(0, Math.min(1, remaining / seconds)) : 0;
        const speedBonus = Math.round(maxSpeedBonus * fractionLeft);
        
        if (pointsEl) {
            pointsEl.textContent = `${basePoints} + ${speedBonus} pts`;
            pointsEl.title = 'Correct answers score 100. Answering early adds up to 25.';
            
            // Colour tracks the fading bonus, not the value of being right.
            if (speedBonus >= 17) {
                pointsEl.style.color = '#10b981'; // Green
            } else if (speedBonus >= 8) {
                pointsEl.style.color = '#f59e0b'; // Orange
            } else {
                pointsEl.style.color = '#ef4444'; // Red
            }
        }
    }
    
    // Update function that calculates remaining time from backend timestamp
    function updateTimer() {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
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
                // Haptic pulse on critical ticks
                if (lastSpeedTapHapticTick !== remaining && typeof navigator !== 'undefined' && navigator.vibrate) {
                    lastSpeedTapHapticTick = remaining;
                    try { navigator.vibrate(20); } catch (_) {}
                }
            } else if (remaining > 5 && typeof clearTimerUrgency === 'function') {
                clearTimerUrgency();
            }
        }
        
        updatePoints(remaining);
        
        if (remaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            if (typeof clearTimerUrgency === 'function') clearTimerUrgency();
            
            // Disable all inputs universally
            disableAllInputs();
            
            // Show smooth suspense shimmer card while results are aggregated
            if (typeof showSuspenseShimmer === 'function') showSuspenseShimmer('feedback');
            
            // The server authoritative timer is primary.
            // Client sends a watchdog timeout only after a 2.5s grace period
            // if the server hasn't already transitioned the round.
            const timeoutRoundInstance = typeof currentRoundInstanceId !== 'undefined' ? currentRoundInstanceId : null;
            setTimeout(() => {
                const stillSameRound = typeof currentRoundInstanceId !== 'undefined' ? currentRoundInstanceId === timeoutRoundInstance : true;
                if (stillSameRound && websocket && websocket.readyState === WebSocket.OPEN) {
                    sendGameAction('speed_tap_timeout', {
                        player_session_id: playerSession.id
                    });
                }
            }, 2500);
        }
    }
    
    // Initial update
    updateTimer();
    
    // Update every 100ms for smooth countdown (not affected by tab throttling)
    timerInterval = setInterval(updateTimer, 100);
}
