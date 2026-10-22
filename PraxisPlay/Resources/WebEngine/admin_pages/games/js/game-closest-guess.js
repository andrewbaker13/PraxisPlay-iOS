/**
 * Closest Guess Game Module
 * Handles the Closest Guess game mode logic
 */

function showClosestGuessGame(message, timeLimit) {
    // Reset guess tracking for new game
    submittedGuesses = [];
    
    // Parse game_config if it's a string
    let gameConfig = message.game_config;
    if (typeof gameConfig === 'string') {
        try {
            gameConfig = JSON.parse(gameConfig);
        } catch (e) {
            console.error('Failed to parse game_config:', e);
            gameConfig = {};
        }
    }
    
    // Determine number line range from game config
    if (gameConfig && gameConfig.numberline_min !== undefined) {
        numberlineMin = gameConfig.numberline_min;
        numberlineMax = gameConfig.numberline_max;
        initialNumberlineMin = numberlineMin;
        initialNumberlineMax = numberlineMax;
    } else {
        // Default range if not specified
        numberlineMin = 0;
        numberlineMax = 100;
        initialNumberlineMin = 0;
        initialNumberlineMax = 100;
    }
    
    console.log('Initial number line range:', numberlineMin, '-', numberlineMax);
    
    const maxWidth = gameConfig?.max_range_width;
    const rangeRequirementText = maxWidth ? `<div style="color: #64748b; font-size: 14px; margin-top: 8px;">📏 Guesses must be within ${maxWidth} units</div>` : '<div style="color: #64748b; font-size: 14px; margin-top: 8px;">📏 Any range allowed (max 8 digits per number)</div>';
    const imageHTML = typeof renderQuestionImageHTML === 'function' 
        ? renderQuestionImageHTML(message.image_url) 
        : (message.image_url ? `<img src="${message.image_url}" alt="Question image" style="max-width: ${window.isProjectorMode ? '90%' : '100%'}; max-height: ${window.isProjectorMode ? '48vh' : '28vh'}; margin: 12px auto; border-radius: 12px; display: block; object-fit: contain; background: white; padding: 10px;">` : '');
    
    // Projector mode: show timer, question, and points in white boxes with number line visualization
    if (window.isProjectorMode) {
        document.getElementById('gameArea').innerHTML = `
            <div class="closest-guess-area">
                <div class="question-display" style="display: flex; justify-content: center; align-items: center; gap: 20px; flex-wrap: nowrap; margin: 20px 0;">
                    <div class="timer" id="timer" style="font-size: 80px; font-weight: 800; color: #ef4444; text-align: center; background: white; border-radius: 16px; padding: 20px 40px; flex-shrink: 0; min-width: 120px;">${timeLimit}</div>
                    <div class="question-text" style="font-size: 48px; font-weight: 700; text-align: center; background: white; border-radius: 16px; padding: 30px 50px; color: #1e293b; flex: 1; max-width: 70%;">${message.question_text}</div>
                    <div style="font-size: 48px; font-weight: 800; color: #10b981; text-align: center; background: white; border-radius: 16px; padding: 20px 40px; flex-shrink: 0; min-width: 160px;" id="availablePoints">100 pts</div>
                </div>
                ${imageHTML}
                ${maxWidth ? `<div style="color: white; font-size: 32px; margin: 20px 0; text-align: center; font-weight: 600;">📏 Guesses must be within ${maxWidth} units</div>` : ''}
                
                <div class="numberline-container" style="margin-top: 40px;">
                    <div class="numberline-title" style="font-size: 36px; font-weight: 700; color: #1e293b; margin-bottom: 20px; text-align: center;">📊 All Player Ranges</div>
                    <div class="numberline" id="numberline" style="min-height: 300px; background: rgba(255,255,255,0.95); border-radius: 12px; padding: 40px 20px; position: relative;">
                        <div class="numberline-axis"></div>
                    </div>
                    <div class="numberline-labels" style="display: flex; justify-content: space-between; font-size: 28px; font-weight: 700; color: white; margin-top: 15px;">
                        <span>${numberlineMin}</span>
                        <span>${numberlineMax}</span>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    document.getElementById('gameArea').innerHTML = `
        <div class="closest-guess-area">
            <div class="question-display">
                <div class="question-text">${message.question_text}</div>
                ${rangeRequirementText}
                ${imageHTML}
                <div class="timer" id="timer">${timeLimit}</div>
            </div>
            
            <div class="range-inputs">
                <div class="range-input-group">
                    <label>Minimum</label>
                    <input type="number" id="guessMin" step="0.1" oninput="updateBracketPreview()">
                </div>
                <div class="range-separator">to</div>
                <div class="range-input-group">
                    <label>Maximum</label>
                    <input type="number" id="guessMax" step="0.1" oninput="updateBracketPreview()">
                </div>
            </div>
            
            <div id="closestGuessPreview" class="closest-guess-preview-card" style="display: none;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 6px;">
                    <span id="previewSpanLabel">Net Width: —</span>
                    <span id="previewTierBadge" class="preview-tier-badge tier-balanced">⚖️ Balanced</span>
                </div>
                <div style="height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
                    <div id="previewBar" style="height: 100%; width: 50%; background: linear-gradient(90deg, #3b82f6, #6366f1); border-radius: 999px; transition: all 0.2s ease;"></div>
                </div>
            </div>
            
            <button class="submit-guess-btn" onclick="submitGuess()">
                Submit Range
            </button>
            
            <div id="feedback"></div>
            
            <div class="numberline-container">
                <div class="numberline-title">📊 All Player Ranges</div>
                <div class="numberline" id="numberline">
                    <div class="numberline-axis"></div>
                </div>
                <div class="numberline-labels">
                    <span>${numberlineMin}</span>
                    <span>${numberlineMax}</span>
                </div>
            </div>
        </div>
    `;
}

function updateBracketPreview() {
    const minInput = document.getElementById('guessMin');
    const maxInput = document.getElementById('guessMax');
    const previewCard = document.getElementById('closestGuessPreview');
    const previewSpan = document.getElementById('previewSpanLabel');
    const previewTier = document.getElementById('previewTierBadge');
    const previewBar = document.getElementById('previewBar');
    if (!minInput || !maxInput || !previewCard) return;

    const min = parseFloat(minInput.value);
    const max = parseFloat(maxInput.value);

    if (isNaN(min) || isNaN(max) || min >= max) {
        previewCard.style.display = 'none';
        return;
    }

    const width = max - min;
    previewCard.style.display = 'block';
    if (previewSpan) previewSpan.textContent = `Net Width: ${width % 1 === 0 ? width : width.toFixed(1)} units`;

    if (previewTier && previewBar) {
        if (width <= 5) {
            previewTier.className = 'preview-tier-badge tier-jackpot';
            previewTier.textContent = '🎯 High Precision (Max Points)';
            previewBar.style.width = '25%';
            previewBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        } else if (width <= 20) {
            previewTier.className = 'preview-tier-badge tier-balanced';
            previewTier.textContent = '⚖️ Balanced Confidence';
            previewBar.style.width = '55%';
            previewBar.style.background = 'linear-gradient(90deg, #3b82f6, #6366f1)';
        } else {
            previewTier.className = 'preview-tier-badge tier-wide';
            previewTier.textContent = '🛡️ Wide Net (Safe Play)';
            previewBar.style.width = '85%';
            previewBar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        }
    }
}

function submitGuess() {
    console.log('submitGuess() called');
    
    if (!playerSession || !playerSession.id) {
        alert('Session error: Player ID missing. Please refresh the page.');
        return;
    }

    const guessMin = parseFloat(document.getElementById('guessMin').value);
    const guessMax = parseFloat(document.getElementById('guessMax').value);
    
    console.log('Parsed values:', guessMin, guessMax);
    
    if (isNaN(guessMin) || isNaN(guessMax)) {
        alert('Please enter valid numbers');
        return;
    }
    
    if (guessMin >= guessMax) {
        alert('Minimum must be less than maximum');
        return;
    }
    
    console.log('WebSocket state:', websocket ? websocket.readyState : 'null');
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        console.error('WebSocket not open!');
        return;
    }
    
    const message = {
        action: 'submit_guess',
        data: {
            player_session_id: playerSession.id,
            guess_min: guessMin,
            guess_max: guessMax,
            timestamp: Date.now() / 1000
        }
    };
    
    console.log('Sending WebSocket message:', message);
    sendGameAction(message.action, message.data);
}

function handleRangeSubmitted(message) {
    const feedback = document.getElementById('feedback');
    const numberline = document.getElementById('numberline');
    
    console.log('[CLOSEST GUESS] handleRangeSubmitted called:', message);
    console.log('[CLOSEST GUESS] numberline element:', numberline);
    
    if (!numberline) {
        console.error('[CLOSEST GUESS] Numberline not found in handleRangeSubmitted');
        return;
    }
    
    // Track this guess
    submittedGuesses.push({
        min: message.guess_min,
        max: message.guess_max,
        player_id: message.player_id
    });
    
    // Calculate dynamic range with 25% padding
    updateDynamicRange();
    
    console.log('Updated number line range:', numberlineMin, '-', numberlineMax);
    
    if (message.player_id === playerSession.id) {
        if (typeof showLockedInStamp === 'function') {
            showLockedInStamp(feedback, {
                message: message.submission_order ? `Range locked in! You were #${message.submission_order} to submit in the room.` : 'Range locked in! Waiting for round timer…'
            });
        } else {
            feedback.innerHTML = `
                <div class="alert alert-success">
                    ✅ Locked in! You were #${message.submission_order} to submit
                </div>
            `;
        }
        
        // Disable inputs after successful submission
        document.getElementById('guessMin').disabled = true;
        document.getElementById('guessMax').disabled = true;
        document.querySelector('.submit-guess-btn').disabled = true;
    }
    
    // Redraw all range boxes with new scale
    redrawNumberline();
}

function updateDynamicRange() {
    if (submittedGuesses.length === 0) return;
    
    // Find min and max across all guesses
    let dataMin = Math.min(...submittedGuesses.map(g => g.min));
    let dataMax = Math.max(...submittedGuesses.map(g => g.max));
    
    // Add 10% padding
    let range = dataMax - dataMin;
    if (range === 0) {
        range = 10; // Default range if single point or identical guesses
        // Center the range around the data point
        dataMin -= range / 2;
        dataMax += range / 2;
    }
    const padding = range * 0.10;
    
    numberlineMin = Math.floor(dataMin - padding);
    numberlineMax = Math.ceil(dataMax + padding);
    
    // Update labels - position them dynamically based on actual data min/max
    const labels = document.querySelector('.numberline-labels');
    if (labels) {
        // Calculate positions as percentages
        const minPos = ((dataMin - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
        const maxPos = ((dataMax - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
        
        // Different font sizes for projector vs player mode
        const valueFontSize = window.isProjectorMode ? '40px' : '20px';
        const labelFontSize = window.isProjectorMode ? '24px' : '14px';
        const containerHeight = window.isProjectorMode ? '70px' : '40px';
        
        labels.innerHTML = `
            <div style="position: relative; width: 100%; height: ${containerHeight};">
                <div style="position: absolute; left: ${minPos}%; transform: translateX(-50%); text-align: center;">
                    <div style="font-size: ${valueFontSize}; font-weight: 700; color: #1e293b;">${dataMin}</div>
                    <div style="font-size: ${labelFontSize}; font-weight: 600; color: #64748b;">(min)</div>
                </div>
                <div style="position: absolute; left: ${maxPos}%; transform: translateX(-50%); text-align: center;">
                    <div style="font-size: ${valueFontSize}; font-weight: 700; color: #1e293b;">${dataMax}</div>
                    <div style="font-size: ${labelFontSize}; font-weight: 600; color: #64748b;">(max)</div>
                </div>
            </div>
        `;
    }
}

function redrawNumberline() {
    const numberline = document.getElementById('numberline');
    if (!numberline) return;
    
    // Clear existing range boxes (keep axis)
    const rangeBoxes = numberline.querySelectorAll('.range-box');
    rangeBoxes.forEach(box => box.remove());
    
    // Redraw all submitted guesses with new scale
    submittedGuesses.forEach(guess => {
        const rangeWidth = ((guess.max - guess.min) / (numberlineMax - numberlineMin)) * 100;
        const rangeLeft = ((guess.min - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
        
        const rangeBox = document.createElement('div');
        rangeBox.className = 'range-box' + (guess.player_id === playerSession.id ? ' own' : '');
        rangeBox.style.left = Math.max(0, Math.min(100, rangeLeft)) + '%';
        rangeBox.style.width = Math.max(0, Math.min(100, rangeWidth)) + '%';
        
        // Projector mode: make bars much taller
        if (window.isProjectorMode) {
            rangeBox.style.height = '220px';
            rangeBox.style.bottom = '20px';
        }
        
        numberline.appendChild(rangeBox);
    });
}

function showClosestGuessResults(chartData) {
    if (!chartData) return '';
    
    // Create canvas for the chart
    const canvasId = 'closestGuessResultsCanvas';
    setTimeout(() => drawClosestGuessResultsCanvas(canvasId, chartData), 100);
    
    return `
        <div style="margin: 20px 0;">
            <canvas id="${canvasId}" width="800" height="300" style="max-width: 100%; background: rgba(255,255,255,0.95); border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></canvas>
        </div>
    `;
}

function drawClosestGuessResultsCanvas(canvasId, chartData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Determine range from data
    const playerRanges = chartData.player_ranges || [];
    const correctAnswer = chartData.correct_answer;
    
    if (playerRanges.length === 0) return;
    
    let minVal = Math.min(...playerRanges.map(r => r.min));
    let maxVal = Math.max(...playerRanges.map(r => r.max));
    
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
        const rangeMin = range.min;
        const rangeMax = range.max;
        
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
}

function handleGuessResults(message) {
    const feedback = document.getElementById('feedback');
    const numberline = document.getElementById('numberline');
    
    console.log('[CLOSEST GUESS] handleGuessResults called');
    console.log('[CLOSEST GUESS] numberline element:', numberline);
    
    if (!numberline) {
        console.error('[CLOSEST GUESS] Numberline element not found!');
        return;
    }
    
    // Hide inputs and submit button to clean up the UI
    const rangeInputs = document.querySelector('.range-inputs');
    const submitBtn = document.querySelector('.submit-guess-btn');
    if (rangeInputs) rangeInputs.style.display = 'none';
    if (submitBtn) submitBtn.style.display = 'none';
    
    // Check if correct answer is outside current range and expand if needed
    if (message.correct_answer < numberlineMin || message.correct_answer > numberlineMax) {
        console.log('Correct answer outside range, expanding...');
        
        if (message.correct_answer < numberlineMin) {
            const diff = numberlineMin - message.correct_answer;
            numberlineMin = Math.floor(message.correct_answer - (diff * 0.1));
        }
        if (message.correct_answer > numberlineMax) {
            const diff = message.correct_answer - numberlineMax;
            numberlineMax = Math.ceil(message.correct_answer + (diff * 0.1));
        }
        
        // Update labels
        const labels = document.querySelector('.numberline-labels');
        if (labels) {
            labels.innerHTML = `
                <span>${numberlineMin}</span>
                <span style="font-size: 12px; color: #64748b;">(Range: ${numberlineMin} to ${numberlineMax})</span>
                <span>${numberlineMax}</span>
            `;
        }
        
        // Redraw with new scale
        redrawNumberline();
    }
    
    // Add correct answer marker - bold vertical line in dark green
    const correctPos = ((message.correct_answer - numberlineMin) / (numberlineMax - numberlineMin)) * 100;
    const marker = document.createElement('div');
    marker.className = 'correct-answer-marker';
    marker.style.position = 'absolute';
    marker.style.left = correctPos + '%';
    marker.style.top = '-10px';
    marker.style.bottom = '-10px';
    marker.style.width = '4px';
    marker.style.backgroundColor = '#15803d';
    marker.style.zIndex = '20';
    marker.title = `Correct Answer: ${message.correct_answer}`;
    numberline.appendChild(marker);
    
    // Find this player's result
    const myResult = message.results.find(r => r.player_id === playerSession.id);
    
    if (myResult) {
        const resultIcon = myResult.is_correct ? '✅' : '❌';
        const _cgCorrect = ['Nailed it!', 'Bullseye!', 'Right on the money.', 'Point estimate: perfect.', 'Dead center.', 'That forecast was spot on.', 'Within the confidence interval — barely.', 'Precision pricing.', 'You read that market perfectly.', 'Analyst of the round.'];
        const _cgIncorrect = ['Missed it.', 'Off target.', 'Not in range.', 'Outside the confidence interval.', 'The market moved on you.', 'Forecast error detected.', 'Close but no coefficient.', 'The residual was too large.', 'That estimate needs recalibrating.', 'Back to the drawing board.'];
        const resultText = myResult.is_correct ? _cgCorrect[Math.floor(Math.random() * _cgCorrect.length)] : _cgIncorrect[Math.floor(Math.random() * _cgIncorrect.length)];
        // The server sends the formula that produced the total. Listing the
        // bonuses separately left the multiplicative interaction unexplained,
        // so a 400-point award read as Base 100, Time 100, Width 100.
        const pointsText = myResult.is_correct 
            ? `+${myResult.total_points} points (${myResult.points_formula || `${myResult.base_points} base`})`
            : '0 points \u2014 the answer slipped outside your range';
        
        feedback.innerHTML = `
            <div class="alert alert-${myResult.is_correct ? 'success' : 'danger'}">
                <h3>${resultIcon} ${resultText}</h3>
                <p><strong>Correct Answer:</strong> ${message.correct_answer}</p>
                <p><strong>Your Range:</strong> ${myResult.guess_min} - ${myResult.guess_max}</p>
                <p><strong>Score:</strong> ${pointsText}</p>
            </div>
        `;
    }
    
    // Display aggregate statistics if available
    if (message.statistics && Object.keys(message.statistics).length > 0) {
        const stats = message.statistics;
        
        // Remove existing stats if any
        const existingStats = document.getElementById('game-stats-container');
        if (existingStats) existingStats.remove();

        const statsDiv = document.createElement('div');
        statsDiv.id = 'game-stats-container';
        statsDiv.innerHTML = `
            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h4 style="margin: 0 0 10px 0; color: #1e293b;">📊 Overall Predictions</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                    <div><strong>Total Range:</strong> ${stats.overall_min?.toFixed(1)} - ${stats.overall_max?.toFixed(1)}</div>
                    <div><strong>Average Guess:</strong> ${stats.average_midpoint?.toFixed(1)}</div>
                    <div><strong>Median Guess:</strong> ${stats.median_midpoint?.toFixed(1)}</div>
                    ${stats.iqr !== undefined ? `
                        <div><strong>IQR:</strong> ${stats.q1?.toFixed(1)} - ${stats.q3?.toFixed(1)}</div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Append to the main container, so it appears at the bottom
        const gameArea = document.querySelector('.closest-guess-area');
        if (gameArea) {
            gameArea.appendChild(statsDiv);
        }
    }
}
