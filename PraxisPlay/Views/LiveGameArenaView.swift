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
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.36, green: 0.42, blue: 0.98),
                    Color(red: 0.49, green: 0.23, blue: 0.93)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
        )
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

    // MARK: - Native Top HUD Component (Lively Classroom Daylight Theme)
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
                .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(Color(red: 0.93, green: 0.95, blue: 1.0))
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(Color(red: 0.78, green: 0.82, blue: 0.99), lineWidth: 1)
                )
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
                        .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        .lineLimit(1)
                        .minimumScaleFactor(0.72)
                }

                Text("\(telemetry.connectionStatus.rawValue) • \(playerSubtitleText)")
                    .font(.system(size: 10.5, weight: .semibold, design: .rounded))
                    .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Live Score & Rank Pill
            HStack(spacing: 8) {
                VStack(alignment: .trailing, spacing: 0) {
                    Text("SCORE")
                        .font(.system(size: 9, weight: .heavy))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                        .lineLimit(1)
                    Text("\(telemetry.score)")
                        .font(.system(size: 15, weight: .black, design: .rounded))
                        .foregroundStyle(Color(red: 0.15, green: 0.39, blue: 0.92))
                        .lineLimit(1)
                }

                if telemetry.rank != "-" && !telemetry.rank.isEmpty {
                    Divider()
                        .frame(height: 22)
                        .overlay(Color(red: 0.80, green: 0.84, blue: 0.88))

                    VStack(alignment: .trailing, spacing: 0) {
                        Text("RANK")
                            .font(.system(size: 9, weight: .heavy))
                            .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                            .lineLimit(1)
                        Text("#\(telemetry.rank.replacingOccurrences(of: "#", with: ""))")
                            .font(.system(size: 15, weight: .black, design: .rounded))
                            .foregroundStyle(Color(red: 0.02, green: 0.59, blue: 0.41))
                            .lineLimit(1)
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color(red: 0.97, green: 0.98, blue: 0.99))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1)
            )
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
                    .foregroundStyle(Color(red: 0.28, green: 0.33, blue: 0.41))
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.white)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color(red: 0.89, green: 0.91, blue: 0.94))
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
        case .soloPractice(let m, _): return m.title.uppercased()
        }
    }

    private var playerSubtitleText: String {
        switch launchMode {
        case .liveSession(let s):
            return "\(s.playerName) • \(s.courseName)"
        case .soloPractice(let m, _):
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
        case .soloPractice(let m, _):
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
