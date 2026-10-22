/**
 * Crowd Wisdom Game Module
 * Handles the Crowd Wisdom game mode logic
 */

let crowdWisdomState = {
    hasAnswered: false,
    selectedOption: null,
    basePoints: 100,
    distribution: null
};

function showCrowdWisdomGame(message, timeLimit) {
    console.log('=== showCrowdWisdomGame DEBUG ===');
    console.log('message:', message);
    
    // Reset state for new round
    crowdWisdomState = {
        hasAnswered: false,
        selectedOption: null,
        basePoints: 100,
        distribution: null
    };
    
    let options = message.options || [];
    
    // If options not at top level, try game_config
    if (!options.length && message.game_config && message.game_config.options) {
        options = message.game_config.options;
    }
    
    if (!options.length) {
        console.warn('No options found for crowd_wisdom, using fallback');
        options = [
            {text: 'Option A'},
            {text: 'Option B'},
            {text: 'Option C'},
            {text: 'Option D'}
        ];
    }
    
    const imageHTML = typeof renderQuestionImageHTML === 'function' 
        ? renderQuestionImageHTML(message.image_url) 
        : (message.image_url ? `<img src="${message.image_url}" alt="Question image" style="max-width: ${window.isProjectorMode ? '90%' : '100%'}; max-height: ${window.isProjectorMode ? '48vh' : '28vh'}; margin: 12px auto; border-radius: 12px; display: block; object-fit: contain; background: white; padding: 10px;">` : '');
    
    document.getElementById('gameArea').innerHTML = `
        <div class="crowd-wisdom-area">
            <div class="question-display">
                <div class="question-text">${message.question_text}</div>
                ${imageHTML}
            </div>
            
            <div class="timer-points-row" style="display: flex; justify-content: space-between; align-items: center; margin: 20px 0;">
                <div class="timer" id="timer">${timeLimit}</div>
                <div class="available-points" id="availablePoints">${crowdWisdomState.basePoints} pts</div>
            </div>
            
            <!-- Distribution bars container -->
            <div id="distributionBars" class="distribution-container">
                <div class="distribution-row unanswered-row">
                    <div class="distribution-label">⏳ Not Yet Answered</div>
                    <div class="distribution-bar-wrapper">
                        <div class="distribution-bar unanswered-bar" id="unansweredBar" style="width: 100%;"></div>
                    </div>
                    <div class="distribution-percent" id="unansweredPercent">100%</div>
                </div>
                ${options.map((opt, idx) => `
                    <div class="distribution-row option-row" data-option-index="${idx}">
                        <button class="crowd-wisdom-btn" data-option-index="${idx}" data-answer="${opt.text}" onclick="submitCrowdWisdom(${idx}, '${opt.text.replace(/'/g, "\\'")}')">
                            ${opt.text}
                        </button>
                        <div class="distribution-bar-wrapper">
                            <div class="distribution-bar option-bar" id="optionBar${idx}" style="width: 0%;"></div>
                        </div>
                        <div class="distribution-percent" id="optionPercent${idx}">0%</div>
                    </div>
                `).join('')}
            </div>
            
            <div id="feedback" style="margin-top: 20px; font-size: 18px; color: #64748b; font-weight: 500; min-height: 30px;"></div>
        </div>
        
        <style>
            .crowd-wisdom-area {
                padding: 20px;
            }
            .available-points {
                font-size: 24px;
                font-weight: 700;
                color: #10b981;
            }
            .distribution-container {
                margin-top: 20px;
            }
            .distribution-row {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
                padding: 8px;
                border-radius: 8px;
                background: #f8fafc;
            }
            .distribution-row.unanswered-row {
                background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            }
            .distribution-label {
                width: 180px;
                font-weight: 600;
                color: #64748b;
            }
            .crowd-wisdom-btn {
                width: 180px;
                padding: 12px 16px;
                font-size: 16px;
                font-weight: 600;
                border: 3px solid #3b82f6;
                border-radius: 8px;
                background: white;
                color: #1e293b;
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: left;
            }
            .projector-mode .question-text {
                font-size: 48px !important;
                text-align: center;
                margin-bottom: 20px;
            }
            .projector-mode .timer-points-row {
                margin: 30px 0 !important;
            }
            .projector-mode .timer {
                font-size: 80px !important;
                font-weight: 700;
                color: #1e293b;
            }
            .projector-mode .available-points {
                font-size: 48px !important;
                font-weight: 700;
                color: #10b981;
            }
            .projector-mode .crowd-wisdom-btn {
                width: 300px;
                padding: 20px 24px;
                font-size: 32px;
                pointer-events: none;
                display: block !important;
            }
            .projector-mode .distribution-row {
                padding: 15px;
                margin-bottom: 20px;
            }
            .projector-mode .distribution-bar-wrapper {
                height: 35px;
                margin: 0 20px;
            }
            .projector-mode .distribution-percent {
                font-size: 36px;
                font-weight: 700;
                min-width: 100px;
            }
            .crowd-wisdom-btn:hover:not(:disabled) {
                background: #eff6ff;
                border-color: #2563eb;
            }
            .crowd-wisdom-btn:disabled {
                cursor: not-allowed;
                opacity: 0.7;
            }
            .crowd-wisdom-btn.selected {
                background: #3b82f6;
                color: white;
                border-color: #1d4ed8;
            }
            .crowd-wisdom-btn.unselected {
                opacity: 0.5;
                border-color: #94a3b8;
            }
            .crowd-wisdom-btn.correct {
                background: #10b981;
                color: white;
                border-color: #059669;
            }
            .crowd-wisdom-btn.incorrect {
                background: #ef4444;
                color: white;
                border-color: #dc2626;
            }
            .distribution-bar-wrapper {
                flex: 1;
                height: 24px;
                background: #e2e8f0;
                border-radius: 12px;
                margin: 0 12px;
                overflow: hidden;
            }
            .distribution-bar {
                height: 100%;
                border-radius: 12px;
                transition: width 0.5s ease;
            }
            .unanswered-bar {
                background: linear-gradient(90deg, #ef4444, #f87171);
            }
            .option-bar {
                background: linear-gradient(90deg, #3b82f6, #60a5fa);
            }
            .distribution-percent {
                width: 50px;
                text-align: right;
                font-weight: 700;
                color: #1e293b;
            }
        </style>
    `;
}

function submitCrowdWisdom(optionIndex, answer) {
    if (crowdWisdomState.hasAnswered) {
        console.log('Already answered crowd wisdom');
        return;
    }
    
    if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
    
    // Pending, not accepted. Setting hasAnswered here and never clearing it left
    // a student whose write failed staring at a locked grid with no way back.
    crowdWisdomState.hasAnswered = true;
    crowdWisdomState.pending = true;
    crowdWisdomState.selectedOption = optionIndex;
    
    websocket.send(JSON.stringify({
        action: 'crowd_wisdom',
        data: {
            round_instance_id: currentRoundInstanceId,
            player_session_id: playerSession.id,
            answer: answer,
            option_index: optionIndex,
            timestamp: Date.now() / 1000
        }
    }));
    
    // Lock in answer visually
    document.querySelectorAll('.crowd-wisdom-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
        const btnIndex = parseInt(btn.dataset.optionIndex);
        if (btnIndex === optionIndex) {
            btn.classList.add('selected');
        } else {
            btn.classList.add('unselected');
        }
    });
    
    const feedback = document.getElementById('feedback');
    if (feedback) {
        feedback.innerHTML = '\u23f3 Sending your answer\u2026';
    }
}

/** The server accepted it; the choice is now genuinely final. */
function handleCrowdWisdomAccepted() {
    crowdWisdomState.pending = false;
    const feedback = document.getElementById('feedback');
    if (feedback) {
        if (typeof showLockedInStamp === 'function') {
            showLockedInStamp(feedback, { message: 'Choice locked in! Let’s see how the herd moves…' });
        } else {
            feedback.innerHTML = '🔒 Locked in! Let’s see how the herd moves…';
        }
    }
}

/**
 * The server refused the answer. Reopen the choices only while the round is
 * still live and nothing was recorded, so a retry cannot become a second answer.
 */
function handleCrowdWisdomRejected(message) {
    if (!crowdWisdomState.pending) {
        return; // Already accepted; a late error must not unlock a real answer.
    }
    crowdWisdomState.pending = false;

    const code = message && message.code;
    const retryable = code !== 'deadline_passed' && code !== 'waiting_to_enter';
    if (!retryable) {
        crowdWisdomState.hasAnswered = true;
        return;
    }

    crowdWisdomState.hasAnswered = false;
    crowdWisdomState.selectedOption = null;
    document.querySelectorAll('.crowd-wisdom-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.cursor = 'pointer';
        btn.classList.remove('selected', 'unselected');
    });

    const feedback = document.getElementById('feedback');
    if (feedback) {
        feedback.innerHTML = '\u26a0\ufe0f That did not reach us \u2014 tap your answer again.';
    }
}

function handleCrowdWisdomDistribution(message) {
    // Update distribution bars in real-time
    // The server sends: distribution (array of options), percent_answered, percent_unanswered
    const options = message.distribution;
    const percentUnanswered = message.percent_unanswered || 0;
    const percentAnswered = message.percent_answered || 0;
    
    crowdWisdomState.distribution = {
        options: options,
        percent_answered: percentAnswered,
        percent_unanswered: percentUnanswered
    };
    
    // Update unanswered bar
    const unansweredBar = document.getElementById('unansweredBar');
    const unansweredPercent = document.getElementById('unansweredPercent');
    if (unansweredBar && unansweredPercent) {
        unansweredBar.style.width = `${percentUnanswered}%`;
        unansweredPercent.textContent = `${Math.round(percentUnanswered)}%`;
    }
    
    // Update option bars
    if (options && Array.isArray(options)) {
        options.forEach((opt, idx) => {
            const bar = document.getElementById(`optionBar${idx}`);
            const pct = document.getElementById(`optionPercent${idx}`);
            if (bar && pct) {
                bar.style.width = `${opt.percent || 0}%`;
                pct.textContent = `${Math.round(opt.percent || 0)}%`;
            }
        });
    }
    
    // Update available points based on % answered
    const pointsEl = document.getElementById('availablePoints');
    if (pointsEl && !crowdWisdomState.hasAnswered) {
        const availablePoints = Math.max(1, Math.round(crowdWisdomState.basePoints * (1 - percentAnswered / 100)));
        pointsEl.textContent = `${availablePoints} pts`;
        
        // Color coding
        if (availablePoints >= 80) {
            pointsEl.style.color = '#10b981';
        } else if (availablePoints >= 50) {
            pointsEl.style.color = '#f59e0b';
        } else {
            pointsEl.style.color = '#ef4444';
        }
    }
}

function handleCrowdWisdomResults(message) {
    console.log('Crowd Wisdom results:', message);
    
    // Reveal correct answer
    const correctIndex = message.correct_option_index;
    const wasToughQuestion = message.was_tough_question;
    
    // Check if distribution container exists - if not, create it (for dev mode jumping to results)
    let distributionContainer = document.getElementById('distributionBars');
    if (!distributionContainer && message.final_distribution) {
        const gameArea = document.getElementById('gameArea');
        const questionText = message.question_text || message.round_stats?.question_text || 'Question';
        
        gameArea.innerHTML = `
            <div class="crowd-wisdom-area">
                <div class="question-display">
                    <div class="question-text">${questionText}</div>
                </div>
                
                <div id="distributionBars" class="distribution-container">
                    <!-- Didn't Answer row -->
                    <div class="distribution-row unanswered-row">
                        <div class="distribution-label">❌ Didn't Answer</div>
                        <div class="distribution-bar-wrapper">
                            <div class="distribution-bar unanswered-bar" id="unansweredBar" style="width: 0%;"></div>
                        </div>
                        <div class="distribution-percent" id="unansweredPercent">0%</div>
                    </div>
                    
                    ${message.final_distribution.map((opt) => `
                        <div class="distribution-row option-row" data-option-index="${opt.option_index}">
                            <button class="crowd-wisdom-btn" data-option-index="${opt.option_index}" data-answer="${opt.text}" disabled>
                                ${opt.text}
                            </button>
                            <div class="distribution-bar-wrapper">
                                <div class="distribution-bar option-bar" id="optionBar${opt.option_index}" style="width: 0%;"></div>
                            </div>
                            <div class="distribution-percent" id="optionPercent${opt.option_index}">0%</div>
                        </div>
                    `).join('')}
                </div>
                
                <div id="feedback" style="margin-top: 20px; font-size: 18px; color: #64748b; font-weight: 500; min-height: 30px;"></div>
            </div>
            
            <style>
                .crowd-wisdom-area {
                    padding: 20px;
                }
                .distribution-container {
                    margin-top: 20px;
                }
                .distribution-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                    padding: 8px;
                    border-radius: 8px;
                    background: #f8fafc;
                }
                .distribution-row.unanswered-row {
                    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
                }
                .distribution-label {
                    width: 180px;
                    font-weight: 600;
                    color: #64748b;
                }
                .crowd-wisdom-btn {
                    width: 180px;
                    padding: 12px 16px;
                    font-size: 16px;
                    font-weight: 600;
                    border: 3px solid #3b82f6;
                    border-radius: 8px;
                    background: white;
                    color: #1e293b;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                }
                .crowd-wisdom-btn:disabled {
                    cursor: not-allowed;
                    opacity: 0.7;
                }
                .crowd-wisdom-btn.correct {
                    background: #10b981;
                    color: white;
                    border-color: #059669;
                }
                .crowd-wisdom-btn.incorrect {
                    background: #ef4444;
                    color: white;
                    border-color: #dc2626;
                }
                .distribution-bar-wrapper {
                    flex: 1;
                    height: 24px;
                    background: #e2e8f0;
                    border-radius: 12px;
                    margin: 0 12px;
                    overflow: hidden;
                }
                .distribution-bar {
                    height: 100%;
                    border-radius: 12px;
                    transition: width 0.5s ease;
                }
                .unanswered-bar {
                    background: linear-gradient(90deg, #ef4444, #f87171);
                }
                .option-bar {
                    background: linear-gradient(90deg, #3b82f6, #60a5fa);
                }
                .distribution-percent {
                    width: 50px;
                    text-align: right;
                    font-weight: 700;
                    color: #1e293b;
                }
            </style>
        `;
        distributionContainer = document.getElementById('distributionBars');
    }
    
    // Update button styling to show correct/incorrect
    document.querySelectorAll('.crowd-wisdom-btn').forEach(btn => {
        const btnIndex = parseInt(btn.dataset.optionIndex);
        btn.classList.remove('selected', 'unselected');
        btn.disabled = true;
        
        if (btnIndex === correctIndex) {
            btn.classList.add('correct');
            const _cwCorrect = ['\u2705 You called it!', '\u2705 Nailed the consensus.', '\u2705 Wisdom of the crowd, confirmed.', '\u2705 You read the room.', '\u2705 Modal response: correct.', '\u2705 The majority was right — and so were you.', '\u2705 Market sentiment: accurate.', '\u2705 Survey says: you win.', '\u2705 Consensus builder.', '\u2705 Right on the median.'];
            let label = _cwCorrect[Math.floor(Math.random() * _cwCorrect.length)];
            if (wasToughQuestion) {
                label += ' \ud83c\udfc6 TOUGH QUESTION!';
            }
            btn.innerHTML = `<span style='font-size: 1rem;'>${label}</span><br>${btn.dataset.answer}`;
        } else if (crowdWisdomState.selectedOption === btnIndex) {
            btn.classList.add('incorrect');
            const _cwIncorrect = ['\u274c Not this one', '\u274c Off the mark', '\u274c The crowd disagreed', '\u274c Outlier detected', '\u274c Against the consensus', '\u274c Not the modal answer', '\u274c Misread the market', '\u274c That was a Type I error', '\u274c Wrong signal', '\u274c The data said otherwise'];
            btn.innerHTML = `<span style='font-size: 1rem;'>${_cwIncorrect[Math.floor(Math.random() * _cwIncorrect.length)]}</span><br>${btn.dataset.answer}`;
        }
    });
    
    // Update distribution bars with final results and color coding
    if (message.final_distribution && Array.isArray(message.final_distribution)) {
        // Calculate percent who didn't answer (100% - sum of all answers)
        const totalAnswered = message.final_distribution.reduce((sum, opt) => sum + (opt.percent || 0), 0);
        const percentDidntAnswer = Math.max(0, 100 - totalAnswered);
        
        // Update "Didn't Answer" row
        const unansweredRow = document.querySelector('.unanswered-row');
        const unansweredBar = document.getElementById('unansweredBar');
        const unansweredPercent = document.getElementById('unansweredPercent');
        const didntAnswerLabel = unansweredRow?.querySelector('.distribution-label');
        
        if (didntAnswerLabel) {
            didntAnswerLabel.textContent = '❌ Didn\'t Answer';
        }
        if (unansweredBar) {
            unansweredBar.style.width = `${percentDidntAnswer}%`;
        }
        if (unansweredPercent) {
            unansweredPercent.textContent = `${Math.round(percentDidntAnswer)}%`;
        }
        
        // Update each option bar with final percentage and color coding
        message.final_distribution.forEach((opt) => {
            const bar = document.getElementById(`optionBar${opt.option_index}`);
            const pct = document.getElementById(`optionPercent${opt.option_index}`);
            
            if (bar && pct) {
                const isCorrect = opt.option_index === correctIndex;
                
                // Update bar width and percentage
                bar.style.width = `${opt.percent || 0}%`;
                pct.textContent = `${Math.round(opt.percent || 0)}%`;
                
                // Color code: green for correct, red for incorrect
                if (isCorrect) {
                    bar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
                    pct.style.color = '#10b981';
                } else {
                    bar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
                    pct.style.color = '#ef4444';
                }
            }
        });
    }
    
    // Show result feedback
    const feedback = document.getElementById('feedback');
    if (feedback) {
        const playerResult = message.player_results?.find(p => p.player_id === playerSession.id);
        if (playerResult) {
            let resultHTML = '';
            if (playerResult.final_points > 0) {
                resultHTML = `<div style="color: #10b981; font-size: 24px; font-weight: 700;">+${playerResult.final_points} points!</div>`;
                if (playerResult.got_tough_bonus) {
                    resultHTML += `<div style="color: #f59e0b; margin-top: 8px;">🏆 You got the Tough Question Bonus (2x)!</div>`;
                }
            } else if (playerResult.final_points < 0) {
                resultHTML = `<div style="color: #ef4444; font-size: 24px; font-weight: 700;">${playerResult.final_points} points</div>`;
            } else if (playerResult.no_answer) {
                resultHTML = `<div style="color: #64748b; font-size: 18px;">You didn't answer in time</div>`;
            }
            feedback.innerHTML = resultHTML;
        }
    }
}

function startCrowdWisdomTimer(seconds, startTime) {
    // Clear any existing timer first
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
            
            if (remaining <= 5) {
                timerEl.style.color = '#ef4444';
                timerEl.style.animation = 'pulse 0.5s infinite';
            }
        }
        
        if (remaining <= 0) {
            clearInterval(timerInterval);
            
            // Disable all inputs
            disableAllInputs();
            document.querySelectorAll('.crowd-wisdom-btn').forEach(btn => {
                btn.disabled = true;
            });
            
            // Server authoritative timer is primary.
            // Client sends a watchdog timeout only after a 2.5s grace period if round hasn't ended.
            const timeoutRoundInstance = typeof currentRoundInstanceId !== 'undefined' ? currentRoundInstanceId : null;
            setTimeout(() => {
                const stillSameRound = typeof currentRoundInstanceId !== 'undefined' ? currentRoundInstanceId === timeoutRoundInstance : true;
                if (stillSameRound && websocket && websocket.readyState === WebSocket.OPEN) {
                    sendGameAction('crowd_wisdom_timeout', {
                        player_session_id: playerSession.id
                    });
                }
            }, 2500);
        }
    }
    
    // Initial update
    updateTimer();
    
    // Update every 100ms for smooth countdown
    timerInterval = setInterval(updateTimer, 100);
}
