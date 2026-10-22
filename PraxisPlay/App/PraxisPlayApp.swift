import SwiftUI

@main
struct PraxisPlayApp: App {
    @StateObject private var sessionStore = PraxisSessionStore.shared

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .preferredColorScheme(.dark)
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

        if host == "solo",
           let modeId = queryItems.first(where: { $0.name == "mode" })?.value,
           let mode = SoloGameMode.allModes.first(where: { $0.id == modeId }) {
            sessionStore.launchSoloMode(mode)
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
