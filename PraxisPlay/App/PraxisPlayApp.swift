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

    /// Supports `mktpraxis://join?room=AB12` and Universal Links `https://www.mktpraxis.com/game?room=AB12`
    private func handleIncomingDeepLink(_ url: URL) {
        guard let code = QRScannerSheetView.extractRoomCode(from: url.absoluteString) else {
            return
        }
        let defaultName = sessionStore.studentDisplayName.isEmpty ? "Student" : sessionStore.studentDisplayName
        Task {
            await sessionStore.joinRoom(roomCode: code, displayName: defaultName)
        }
    }
}
