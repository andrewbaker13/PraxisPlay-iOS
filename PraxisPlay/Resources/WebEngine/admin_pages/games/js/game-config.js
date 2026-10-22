// API_BASE and WS_BASE are defined in api-config.js

// Get session data
const urlParams = new URLSearchParams(window.location.search);
let roomCode = (urlParams.get('room') || urlParams.get('code') || '').trim().toUpperCase();

// 🚧 DEV MODE: Use mock room code if in dev mode
if (window.DEV_MODE && !roomCode) {
    console.log('🚧 DEV MODE: Using mock room code');
    roomCode = 'DEV1';
}

// Session state variables (mutable so inline join card can populate them without reloading)
let gameSession = JSON.parse(sessionStorage.getItem('gameSession') || '{}');
let playerSession = JSON.parse(sessionStorage.getItem('playerSession') || '{}');
let isGuest = sessionStorage.getItem('isGuest') === 'true';
let isWaitingToEnter = sessionStorage.getItem('waitingToEnter') === 'true';

// Expose on window for easy coordination
if (typeof window !== 'undefined') {
    window.roomCode = roomCode;
    window.gameSession = gameSession;
    window.playerSession = playerSession;
    window.isGuest = isGuest;
    window.isWaitingToEnter = isWaitingToEnter;
}

// Store the latest leaderboard globally so we can use it in final standings
let latestLeaderboard = [];
let leaderboardVisibility = 'always_show'; // Default

// WebSocket connection
let websocket = null;
let gameType = null;
let gameStartTime = null;
// Identity of the round currently in play, echoed back on every action so the
// server can tell a live message from one left over by a finished round.
let currentRoundInstanceId = null;

// Reconnection. `sessionEndedDeliberately` separates "the game is over" and
// "you were removed" from an ordinary dropped socket, so a kicked player is
// never auto-rejoined and a finished session stops retrying.
let sessionEndedDeliberately = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
const MAX_RECONNECT_ATTEMPTS = 8;
let nextGameType = null; // Store the upcoming game type for showing instructions
let timerInterval = null;
let numberlineMin = 0;
let numberlineMax = 100;
let submittedGuesses = []; // Track all submitted guesses for dynamic range
let initialNumberlineMin = 0; // Store initial config values
let initialNumberlineMax = 100;

let connectionAttemptStart = Date.now();
let progressMessageInterval = null;
