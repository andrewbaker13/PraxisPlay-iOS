// Environment Configuration (PraxisPlay-iOS Enhanced)
// Automatically detects if running on localhost, production, or PraxisPlay-iOS native container

(function() {
    const hostname = window.location.hostname;
    const isPrivateIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname) || hostname.endsWith('.local');
    const isLocal = (hostname === 'localhost' || hostname === '127.0.0.1' || isPrivateIP) && !window.__PRAXIS_IOS_NATIVE;

    // 🚧 DEV / SOLO PRACTICE MODE
    // Activates when ?dev=1 on localhost OR when launched in PraxisPlay-iOS Solo Arcade mode
    const DEV_MODE = (window.location.search.includes('dev=1') && isLocal) || Boolean(window.__PRAXIS_IOS_SOLO);
    
    if (DEV_MODE) {
        const urlParams = new URLSearchParams(window.location.search);
        const state = window.__PRAXIS_IOS_SOLO_STATE || urlParams.get('state') || 'speed_tap_active';
        
        window.DEV_MODE = true;
        window.DEV_STATE = state;
        window.DEV_SNAPSHOT_PATH = `dev_data/snapshots/${state}.json`;
        
        console.log(`📸 [PraxisPlay] Loading Solo/Snapshot state: ${state}.json`);
    }

    const backendHost = (hostname === 'localhost' || hostname === '127.0.0.1') ? 'localhost' : hostname;

    // Export to global scope (allow native iOS override for custom server testing)
    window.API_BASE = window.__PRAXIS_IOS_API_BASE || (isLocal 
        ? `http://${backendHost}:8000/api` 
        : 'https://drbaker-backend.onrender.com/api');

    window.WS_BASE = window.__PRAXIS_IOS_WS_BASE || (isLocal 
        ? `ws://${backendHost}:8000` 
        : 'wss://drbaker-backend.onrender.com');
        
    window.JOIN_URL = isLocal
        ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/admin_pages/games/game-join.html`
        : 'https://www.mktpraxis.com/game';

    console.log(`%c[Config] ${window.__PRAXIS_IOS_NATIVE ? 'PraxisPlay iOS Native 📱' : (isLocal ? 'Local Development 🏠' : 'Production ☁️')}`, 'font-weight: bold; color: #3b82f6');
})();
