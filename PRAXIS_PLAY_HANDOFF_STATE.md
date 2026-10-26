# Praxis Play (iOS & Android) — Complete Engineering & Release State Handoff

> **Parent Conversation Reference**: `65ea1b7b-c469-47d6-932a-e027e7e2e4f8`
> - **Parent Artifacts & Screenshots Directory**: `C:\Users\Andrew\.gemini\antigravity\brain\65ea1b7b-c469-47d6-932a-e027e7e2e4f8\`
> - **Parent Transcript**: `C:\Users\Andrew\.gemini\antigravity\brain\65ea1b7b-c469-47d6-932a-e027e7e2e4f8\.system_generated\logs\transcript.jsonl`

---

## 1. Repositories & Architecture Overview

Praxis Play (`com.drbaker.praxisplay`) is a cross-platform interactive marketing & classroom decision-sciences simulation app for **iOS/iPadOS** and **Android**, powered by a native shell + a bundled offline-capable `WebEngine` containing all 13+ interactive classroom games and solo AI bot simulations.

| Platform | Local Repository Path | GitHub Remote | Package / Bundle ID |
| :--- | :--- | :--- | :--- |
| **iOS / iPadOS** | `C:\Users\Andrew\Documents\GitHub\PraxisPlay-iOS` | `https://github.com/andrewbaker13/PraxisPlay-iOS.git` | `com.drbaker.praxisplay` |
| **Android** | `C:\Users\Andrew\Documents\GitHub\PraxisPlay-Android` | `https://github.com/andrewbaker13/PraxisPlay-Android.git` | `com.mktpraxis.praxisplay` |
| **Web Source (`praxisplay.online`)** | `C:\Users\Andrew\Documents\GitHub\mktg_b2b_simulation` | `https://github.com/andrewbaker13/mktg_b2b_simulation.git` | Web Backend & Game HTML/JS |

### Critical Cross-Platform Sync Rule (`WebEngine`)
Whenever any file inside the bundled `WebEngine` is modified (especially `admin_pages/games/js/praxis-ios-bridge.js` or any game HTML/JS file):
- **iOS Path**: `C:\Users\Andrew\Documents\GitHub\PraxisPlay-iOS\PraxisPlay\Resources\WebEngine\admin_pages\games\js\praxis-ios-bridge.js`
- **Android Path**: `C:\Users\Andrew\Documents\GitHub\PraxisPlay-Android\app\src\main\assets\WebEngine\admin_pages\games\js\praxis-ios-bridge.js`
- **Always copy/sync changes between both locations** so iOS and Android stay 100% identical in game behavior, safe-area inset handling, and theme styling.

---

## 2. Current Live Release Status (As of Fork)

### A. iOS / iPadOS (`PraxisPlay-iOS`)
- **Latest Commit on `main`**: `9174a8a` (`Switch all SwiftUI views to Lively Classroom Daylight Theme to match Android and Solo Arcade`)
- **Apple TestFlight Status**: **Build 31** built, signed, and uploaded via GitHub Actions (`Run #31` on `.github/workflows/ios-testflight.yml`).
- **How to Ship a New iOS Build to TestFlight**:
  - Simply commit and `git push origin main` in `C:\Users\Andrew\Documents\GitHub\PraxisPlay-iOS`.
  - GitHub Actions workflow `.github/workflows/ios-testflight.yml` automatically sets up Xcode, increments the build number (`GITHUB_RUN_NUMBER`), signs with the App Store Connect API Key & distribution certificate stored in GitHub Secrets, and uploads the `.ipa` to Apple TestFlight.
  - Monitor progress with: `gh run list --repo andrewbaker13/PraxisPlay-iOS --limit 3`
- **App Store Screenshots (iPhone 6.7" & iPad 13")**:
  - Located in `C:\Users\Andrew\.gemini\antigravity\brain\65ea1b7b-c469-47d6-932a-e027e7e2e4f8\appstore_screenshots\iphone_67\` and `ipad_13\`.

### B. Android (`PraxisPlay-Android`)
- **Latest Version**: `v1.0.2` (`versionCode = 3` in `app/build.gradle.kts`)
- **Built Artifacts in Repo Root**:
  - `C:\Users\Andrew\Documents\GitHub\PraxisPlay-Android\PraxisPlay-v1.0.2-release.aab` (signed App Bundle)
  - `C:\Users\Andrew\Documents\GitHub\PraxisPlay-Android\PraxisPlay-v1.0.2-release.apk` (signed direct-install APK)
- **Google Play Console Status (`com.drbaker.praxisplay`)**:
  - **`internal` (Internal Testing)**: `3 (1.0.2)` — **Completed / Live** (`Edit ID: 07448442945944874648`)
  - **`alpha` (Closed Testing)**: Draft release created; once testers are added/opted-in on Play Console, `--track alpha --status completed` can be used.
- **How to Build & Publish a New Android Release (One Command)**:
  ```powershell
  $env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
  $env:PATH="$env:JAVA_HOME\bin;$env:PATH"
  $env:PYTHONUTF8="1"
  cd C:\Users\Andrew\Documents\GitHub\PraxisPlay-Android
  python -X utf8 publish_to_play.py --bump --track internal --notes "Release notes here"
  ```
- **Google Play Store Listing Graphic Assets**:
  - Icon (`512x512`), Feature Graphic (`1024x500`), Phone Screenshots, and 7"/10" Tablet Screenshots are saved in `C:\Users\Andrew\Documents\GitHub\PraxisPlay-Android\play_store_assets\`.

---

## 3. Recent UI & Gameplay Polish Completed Before Fork

1. **Lively Classroom Daylight Theme (iOS & Android Parity)**:
   - Replaced dark backgrounds across both Android (`MainActivity.kt` + `praxis-ios-bridge.js`) and iOS (`PraxisPlayApp.swift`, `MainTabView.swift`, `JoinSessionView.swift`, `SoloArcadeView.swift`, `LiveGameArenaView.swift`, `ProfileSettingsView.swift`) with a bright, high-contrast classroom daylight palette (`#F8FAFC` warm slate background, `#FFFFFF` cards, `#1E293B` slate text, `#4F46E5` indigo & `#10B981` emerald accents) and forced `.preferredColorScheme(.light)` on iOS.
2. **Safe-Area Top Inset Fix for Floating `Arcade` Return Button**:
   - In `MainActivity.kt` (Android), disabled `setDecorFitsSystemWindows(window, false)` so the Android WebView never slides under the top notification/status bar, and set light status/navigation bars (`#F8FAFC`) with dark system icons.
   - In `praxis-ios-bridge.js` (both iOS & Android), moved `#praxis-floating-back` down with `top: calc(env(safe-area-inset-top, 0px) + 14px)` and added top padding to `body.praxis-solo-mode` so the `Arcade` return pill is never jammed against the top status bar and is always easy to tap.

---

## 4. Team Edition (`brief_relay`) & Native Instructor Host Console (iOS & Android)

Both Classic Praxis Play (`admin_pages/games/`, `/api/game/`) and **Praxis Play Team Edition** (`admin_pages/team_play/`, `/api/team-play/`) now coexist side-by-side across iOS/iPadOS and Android:

1. **Bundled `WebEngine` Assets (`team_play/` + Host/Projector Tools)**:
   - Synced `admin_pages/team_play/` (`play.html`, `host.html`, `projector.html`, `js/team-play-client.js`, `js/team-play-views.js`, `dev_data/snapshots/*.json`), `admin_pages/team_play/dev_data/kf-r2-001.json`, `art_assets/pixel/*`, `admin_pages/games/game-host.html`, `admin_pages/games/game-projector.html`, and required `shared/css/*` & `shared/js/*` assets into both iOS and Android `WebEngine` directories.
   - Guarded Classic CSS overrides and HUD polling inside `admin_pages/games/js/praxis-ios-bridge.js` (`isClassicPlayPage()`) so Team Edition and Host/Projector screens keep their native pixel-agency and console styles intact.
2. **Universal Student Live Join & QR Scanner**:
   - `joinRoom` in `PraxisSessionStore.swift` (iOS) and `PraxisSessionManager.kt` (Android) automatically supports both Classic rooms (`POST /api/game/join/`) and Team Edition rooms (`POST /api/team-play/sessions/join/`), detecting `/play?room=XXXX` QR codes or falling back seamlessly on HTTP 404.
   - `PraxisWebEngineView.swift` (iOS) and `GameArenaActivity.kt` (Android) inject `teamplay:<ROOM>:identity` into `localStorage` and route Team Edition sessions to `admin_pages/team_play/play.html`, updating the top native HUD pills to `TEAM PTS` and `AGENCY`.
3. **Solo Practice Arcade — Brief Relay · Team Edition (`brief_relay`)**:
   - Added **Brief Relay · Team Edition** (`brief_relay`, category `Team Edition`) to `SoloGameMode.allModes` alongside all 9 Classic mini-games.
   - Built an interactive offline Solo Agency Pitch Simulator inside `admin_pages/team_play/play.html` (`bootSoloSimulator()`) powered by `dev_data/kf-r2-001.json` (*Kestrel & Fern: Quiet Hours*), featuring a 4-stage & 4-desk switcher (`Analytics`, `Research`, `Environ.`, `Brand`) and live 4-desk pitch scoring.
4. **App-Native Instructor Management Dashboard (`Host` Tab)**:
   - Added a dedicated **Host** tab (`InstructorHostView.swift` on iOS/iPadOS, `buildInstructorHostTab()` in `MainActivity.kt` on Android) with a segmented switcher between **Team Edition (Agency Arena)** and **Classic Edition (9 Mini-Games)**:
     - **Team Edition Host**: Create rooms from case manifests (`/api/team-play/cases/`, `/api/team-play/sessions/`), inspect live round/phase/timer and agency 4-desk submission pills (`/api/team-play/sessions/<CODE>/host-state/`), trigger stage transitions (`Open Lobby`, `Start Round`, `Force Reveal`, `Next Round`, `End Match`, `+30s`), or launch the full Web Host (`admin_pages/team_play/host.html`) and Projector (`admin_pages/team_play/projector.html`) views.
     - **Classic Edition Host**: Browse instructor courses & game templates (`/api/courses/`, `/api/game/templates/`), create Classic rooms (`/api/game/create/`), control active rooms (`Start Game`, `Next Round / Step`, `End Room`), or open the full Classic Host Console (`admin_pages/games/game-host.html`) and Projector View (`admin_pages/games/game-projector.html`) with automatic `auth_token` injection.
5. **Classroom Projector Receiver (`mktpraxis.com/projector` + 4-Digit Projector PIN)**:
   - Instructors hosting from a phone/iPad can project the live big-screen arena on the classroom podium PC **without logging into MktPraxis on the podium PC**.
   - Every hosted room (both Team Edition `TeamPlaySession` and Classic Edition `GameSession`) generates a deterministic 4-digit numeric **Projector PIN** (`projector_pin`) via HMAC-SHA256 in `drbaker_backend/core/team_play/authz.py` (zero DB migrations required).
   - Both the native `Host` tab (`InstructorHostView.swift` on iOS, `MainActivity.kt` on Android) and web `admin_pages/team_play/host.html` display a **Classroom Projector** banner showing `mktpraxis.com/projector`, `ROOM: <CODE>`, `PIN: <4-digit PIN>`, and a `Copy Link` button (`https://www.mktpraxis.com/projector?room=<CODE>#pin=<PIN>`).
   - On the podium PC, opening `mktpraxis.com/projector` (or `/tv` -> `admin_pages/projector.html`) or `admin_pages/team_play/projector.html` lets the instructor enter the Room Code + 4-digit PIN (`POST /api/team-play/projector-pair/`), which issues a session-scoped read-only `projector_token` (`X-Projector-Token`) accepted by both REST (`GET /api/team-play/sessions/<ROOM>/host/`, withholding `host.key` during active rounds) and WebSocket (`/ws/team-play/<ROOM>/` with `role: "projector"`), or redirects Classic rooms to `/admin_pages/games/game-projector.html?room=<CODE>`.
