import SwiftUI

@main
struct PraxisPlayApp: App {
    @StateObject private var sessionStore = PraxisSessionStore.shared

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .preferredColorScheme(.light)
                .onOpenURL { incomingURL in
                    handleIncomingDeepLink(incomingURL)
                }
        }
    }

    /// Supports:
    /// - `mktpraxis://join?room=AB12`
    /// - `mktpraxis://tab?index=1`
    /// - `mktpraxis://solo?mode=line_fit`
    /// - Universal Links `https://www.mktpraxis.com/game?room=AB12`
    private func handleIncomingDeepLink(_ url: URL) {
        let host = (url.host ?? "").lowercased()
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let queryItems = components?.queryItems ?? []

        if host == "tab",
           let idxStr = queryItems.first(where: { $0.name == "index" })?.value,
           let idx = Int(idxStr) {
            sessionStore.activeArenaLaunch = nil
            NotificationCenter.default.post(name: .praxisSwitchTab, object: idx)
            return
        }

        if host == "host-demo" {
            sessionStore.activeArenaLaunch = nil
            NotificationCenter.default.post(name: .praxisSwitchTab, object: 2)
            let action = queryItems.first(where: { $0.name == "action" })?.value ?? "activate"
            if action == "activate" {
                sessionStore.activateDemoHostSandbox()
            } else {
                Task {
                    _ = await sessionStore.performTeamPlayHostAction(roomCode: "DEMO", action: action)
                }
            }
            return
        }

        if host == "account-demo" {
            sessionStore.activeArenaLaunch = nil
            NotificationCenter.default.post(name: .praxisSwitchTab, object: 3)
            let step = queryItems.first(where: { $0.name == "step" })?.value ?? "show-login"
            NotificationCenter.default.post(name: .praxisAccountDemoStep, object: step)
            return
        }

        if host == "solo",
           let modeId = queryItems.first(where: { $0.name == "mode" })?.value,
           let mode = SoloGameMode.allModes.first(where: { $0.id == modeId }) {
            let showResults = queryItems.first(where: { $0.name == "results" })?.value == "1"
            sessionStore.launchSoloMode(mode, showResults: showResults)
            return
        }

        guard let code = QRScannerSheetView.extractRoomCode(from: url.absoluteString) else {
            return
        }
        let defaultName = sessionStore.studentDisplayName.isEmpty ? "Student" : sessionStore.studentDisplayName
        Task {
            await sessionStore.joinRoom(roomCode: code, displayName: defaultName)
        }
    }
}
