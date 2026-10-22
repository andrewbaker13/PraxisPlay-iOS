import SwiftUI

struct LiveGameArenaView: View {
    let launchMode: ArenaLaunchMode
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @ObservedObject private var sessionStore = PraxisSessionStore.shared

    @State private var telemetry = HUDTelemetryState()
    @StateObject private var webController = PraxisWebController()
    @State private var showLeaveConfirmation = false

    var body: some View {
        VStack(spacing: 0) {
            // MARK: - Native iOS Top HUD Bar
            nativeTopHUDBar

            // MARK: - Embedded Praxis Play Engine (WKWebView + CoreHaptics Bridge)
            PraxisWebEngineView(
                launchMode: launchMode,
                telemetry: $telemetry,
                webController: webController
            )
            .ignoresSafeArea(edges: .bottom)
        }
        .background(Color(red: 0.07, green: 0.10, blue: 0.17).ignoresSafeArea())
        .onAppear {
            UIApplication.shared.isIdleTimerDisabled = true
            bootstrapInitialHUD()
        }
        .onChange(of: scenePhase) { newPhase in
            if newPhase == .active {
                UIApplication.shared.isIdleTimerDisabled = true
                webController.triggerSocketReconnect()
            }
        }
        .confirmationDialog(
            isSoloMode ? "Exit Solo Practice?" : "Leave Live Room?",
            isPresented: $showLeaveConfirmation,
            titleVisibility: .visible
        ) {
            Button(isSoloMode ? "Exit to Arcade" : "Leave Room", role: .destructive) {
                HapticsManager.shared.playTap()
                dismiss()
            }
            Button("Stay in Game", role: .cancel) {}
        } message: {
            Text(isSoloMode
                 ? "You can jump back into any Solo Practice mode anytime."
                 : "Your points in Room \(roomBadgeText) are saved on the server. You can rejoin with 1 tap from Recent Sessions.")
        }
    }

    // MARK: - Native Top HUD Component
    private var nativeTopHUDBar: some View {
        HStack(spacing: 10) {
            // Back / Leave Button
            Button {
                HapticsManager.shared.playTap()
                if isSoloMode {
                    dismiss()
                } else {
                    showLeaveConfirmation = true
                }
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 13, weight: .bold))
                    Text(isSoloMode ? "Arcade" : "Lobby")
                        .font(.system(size: 13, weight: .bold))
                        .lineLimit(1)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 11)
                .padding(.vertical, 7)
                .background(Color.white.opacity(0.14))
                .clipShape(Capsule())
            }
            .fixedSize(horizontal: true, vertical: false)

            // Room / Mode Identity & Connection Status
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Circle()
                        .fill(statusDotColor)
                        .frame(width: 7, height: 7)
                    Text(roomBadgeText)
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.72)
                }

                Text("\(telemetry.connectionStatus.rawValue) • \(playerSubtitleText)")
                    .font(.system(size: 10.5, weight: .medium, design: .rounded))
                    .foregroundStyle(.white.opacity(0.68))
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Live Score & Rank Pill
            HStack(spacing: 8) {
                VStack(alignment: .trailing, spacing: 0) {
                    Text("SCORE")
                        .font(.system(size: 9, weight: .heavy))
                        .foregroundStyle(.white.opacity(0.6))
                        .lineLimit(1)
                    Text("\(telemetry.score)")
                        .font(.system(size: 15, weight: .black, design: .rounded))
                        .foregroundStyle(Color(red: 0.38, green: 0.65, blue: 0.98))
                        .lineLimit(1)
                }

                if telemetry.rank != "-" && !telemetry.rank.isEmpty {
                    Divider()
                        .frame(height: 22)
                        .overlay(Color.white.opacity(0.2))

                    VStack(alignment: .trailing, spacing: 0) {
                        Text("RANK")
                            .font(.system(size: 9, weight: .heavy))
                            .foregroundStyle(.white.opacity(0.6))
                            .lineLimit(1)
                        Text("#\(telemetry.rank.replacingOccurrences(of: "#", with: ""))")
                            .font(.system(size: 15, weight: .black, design: .rounded))
                            .foregroundStyle(Color(red: 0.20, green: 0.83, blue: 0.60))
                            .lineLimit(1)
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.white.opacity(0.10))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .fixedSize(horizontal: true, vertical: false)

            // Quick Actions Menu
            Menu {
                if isSoloMode {
                    Button {
                        webController.reloadRound()
                    } label: {
                        Label("Restart Practice Round", systemImage: "arrow.counterclockwise")
                    }
                } else {
                    Button {
                        webController.triggerSocketReconnect()
                    } label: {
                        Label("Resync Live Connection", systemImage: "bolt.horizontal.circle")
                    }
                }

                Button {
                    sessionStore.keepScreenAwake.toggle()
                } label: {
                    Label(
                        sessionStore.keepScreenAwake ? "Screen Wake-Lock: ON" : "Screen Wake-Lock: OFF",
                        systemImage: sessionStore.keepScreenAwake ? "sun.max.fill" : "moon.fill"
                    )
                }

                Divider()

                Button(role: .destructive) {
                    dismiss()
                } label: {
                    Label(isSoloMode ? "Exit Solo Practice" : "Leave Game Room", systemImage: "rectangle.portrait.and.arrow.right")
                }
            } label: {
                Image(systemName: "ellipsis.circle.fill")
                    .font(.system(size: 22))
                    .foregroundStyle(.white.opacity(0.85))
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.08, green: 0.12, blue: 0.22),
                    Color(red: 0.11, green: 0.16, blue: 0.29)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.12))
                .frame(height: 1)
        }
    }

    // MARK: - Computed Properties
    private var isSoloMode: Bool {
        if case .soloPractice = launchMode { return true }
        return false
    }

    private var roomBadgeText: String {
        switch launchMode {
        case .liveSession(let s): return s.roomCode
        case .soloPractice(let m): return m.title.uppercased()
        }
    }

    private var playerSubtitleText: String {
        switch launchMode {
        case .liveSession(let s):
            return "\(s.playerName) • \(s.courseName)"
        case .soloPractice(let m):
            return m.marketingConcept
        }
    }

    private var statusDotColor: Color {
        switch telemetry.connectionStatus {
        case .connected: return Color(red: 0.06, green: 0.73, blue: 0.51)
        case .connecting, .reconnecting: return Color(red: 0.96, green: 0.62, blue: 0.04)
        case .solo: return Color(red: 0.55, green: 0.36, blue: 0.96)
        }
    }

    private func bootstrapInitialHUD() {
        switch launchMode {
        case .liveSession(let s):
            telemetry = HUDTelemetryState(
                score: s.lastScore,
                rank: s.lastRank,
                gameType: s.gameType,
                roomCode: s.roomCode,
                connectionStatus: .connecting
            )
        case .soloPractice(let m):
            telemetry = HUDTelemetryState(
                score: 380,
                rank: "2",
                gameType: m.id,
                roomCode: "SOLO",
                connectionStatus: .solo
            )
        }
    }
}
