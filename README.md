# Praxis Play for iOS (`com.mktpraxis.praxisplay`)

Native SwiftUI iOS student controller and Solo Practice Arcade for **MktPraxis.com (`Praxis Play`)**, built for Apple Developer Team **`S36NQ79D63`**.

---

## Architecture Highlights

1. **100% Native SwiftUI Shell (`PraxisPlay/Views/`)**
   - **Join Live Tab (`JoinSessionView.swift`)**:
     - Instant 4–8 character room code entry with tactile selection haptics.
     - **1-Tap Native Camera QR Scanner (`QRScannerSheetView.swift`)** powered by `AVCaptureSession` — scans the classroom projector QR code (`https://www.mktpraxis.com/game?room=AB12`) and joins immediately.
     - **Campus Wi-Fi HTTP 429 Rate-Limit Queue**: Sits out shared campus IP rate-limit bursts automatically with a live countdown.
     - **Stable Per-Room Guest Identity**: Uses the exact 4-character `GUEST_TAG_CHARS` tag per room code so rejoining never mints a duplicate 0-score identity.
     - **Recent Classroom Rooms Deck**: 1-tap instant rejoin into any recent room.
   - **Solo Practice Arcade Tab (`SoloArcadeView.swift`)**:
     - Lets students (and Apple App Store Reviewers!) play interactive solo practice rounds of **all 9 MktPraxis Minigame Modes** offline anytime (`Speed Tap`, `Line Fit`, `Budget Blitz`, `Buy a Clue`, `Minority Rule`, `Closest Guess`, `Crowd Wisdom`, `Push Range`, `Word Guess`).
   - **Native Top In-Game HUD (`LiveGameArenaView.swift`)**:
     - Real-time connection status pill, Room Code badge, animated Score & Rank pill, and 1-tap socket resync.

2. **Native iPhone Hardware Superpowers (`PraxisPlay/Services/` & `WebBridge/`)**
   - **Permanent Classroom Screen Wake-Lock** (`UIApplication.shared.isIdleTimerDisabled = true`): Student iPhones never dim or auto-lock while waiting for the next slide.
   - **Native Taptic Engine Bridge (`HapticsManager.swift` + `praxis-ios-bridge.js`)**: Automatically translates `navigator.vibrate(...)` and `triggerHapticAlert(...)` (which Apple blocks in mobile Safari) into physical iPhone `UIImpactFeedbackGenerator` & `UINotificationFeedbackGenerator` haptics!
   - **Zero-Wait Local Asset Bundle (`PraxisBundleSchemeHandler`)**: Serves all HTML/CSS/JS/SVG assets locally from `PraxisPlay/Resources/WebEngine` over `praxis-app://app.mktpraxis.com/...` in `< 15ms` while connecting live to `wss://drbaker-backend.onrender.com`.

---

## Syncing Game Engine Updates from `mktg_bivariate_tools`

Whenever you update a minigame in `mktg_bivariate_tools/admin_pages/games/`, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-web-engine.ps1
```

---

## Building in the Cloud (From Windows via GitHub Actions)

1. Push this repo to GitHub (`PraxisPlay-iOS`).
2. Every push to `main` automatically runs [`.github/workflows/ios-cloud-build.yml`](.github/workflows/ios-cloud-build.yml) on a macOS 14 / Xcode 16 runner:
   - Generates `PraxisPlay.xcodeproj` from [`project.yml`](project.yml) via `xcodegen`.
   - Compiles the full SwiftUI app (`PraxisPlay.app`) and uploads the artifact.
   - When triggered with `deploy_to_testflight = true`, archives, signs (Team `S36NQ79D63`), and uploads `PraxisPlay.ipa` directly to **App Store Connect / TestFlight**.
