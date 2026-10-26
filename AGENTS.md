# AGENTS.md — Praxis Play for iOS & iPadOS (`PraxisPlay-iOS`)

> **Bundle ID**: `com.drbaker.praxisplay`
> **Read First**: [`PRAXIS_PLAY_HANDOFF_STATE.md`](PRAXIS_PLAY_HANDOFF_STATE.md) and [`../mktg_bivariate_tools/.github/instructions/mobile-apps.instructions.md`](../mktg_bivariate_tools/.github/instructions/mobile-apps.instructions.md)

## Non-Negotiables
1. **Cross-Platform WebEngine Sync**: Whenever any file in `PraxisPlay/Resources/WebEngine/admin_pages/games/` (especially `js/praxis-ios-bridge.js`) is modified, copy the exact change to `../PraxisPlay-Android/app/src/main/assets/WebEngine/admin_pages/games/`.
2. **Lively Classroom Daylight Theme**: Maintain `.preferredColorScheme(.light)` and high-contrast daylight surfaces (`#F8FAFC` / `#FFFFFF` / `#1E293B`) across all SwiftUI views and WebEngine games.
3. **Safe-Area Top Inset**: Keep `#praxis-floating-back` positioned at `top: calc(env(safe-area-inset-top, 0px) + 14px)` so it never collides with the iOS status bar / Dynamic Island.
4. **Apple TestFlight CI/CD**: Pushing to `main` triggers `.github/workflows/ios-testflight.yml` on GitHub Actions (`macos-14`), which automatically builds, signs, increments the build number, and uploads to Apple TestFlight (`gh run list --repo andrewbaker13/PraxisPlay-iOS`).
