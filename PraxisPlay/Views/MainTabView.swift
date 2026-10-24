import SwiftUI

struct MainTabView: View {
    @ObservedObject var sessionStore = PraxisSessionStore.shared
    @State private var selectedTab: Int

    init() {
        let args = CommandLine.arguments
        if let idx = args.firstIndex(of: "--tab"), idx + 1 < args.count, let tabNum = Int(args[idx + 1]) {
            _selectedTab = State(initialValue: tabNum)
        } else {
            _selectedTab = State(initialValue: 0)
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            JoinSessionView(onSwitchToArcadeTab: {
                selectedTab = 1
            })
            .tabItem {
                Label("Join Live", systemImage: "antenna.radiowaves.left.and.right")
            }
            .tag(0)

            SoloArcadeView()
                .tabItem {
                    Label("Solo Arcade", systemImage: "gamecontroller.fill")
                }
                .tag(1)

            ProfileSettingsView()
                .tabItem {
                    Label("Account", systemImage: "person.crop.circle.fill")
                }
                .tag(2)
        }
        .tint(Color(red: 0.31, green: 0.27, blue: 0.90))
        .fullScreenCover(item: $sessionStore.activeArenaLaunch) { launchMode in
            LiveGameArenaView(launchMode: launchMode)
        }
        .onAppear {
            let args = CommandLine.arguments
            if let idx = args.firstIndex(of: "--solo"), idx + 1 < args.count {
                let modeId = args[idx + 1]
                let showResults = args.contains("--results")
                if let mode = SoloGameMode.allModes.first(where: { $0.id == modeId }) {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        sessionStore.launchSoloMode(mode, showResults: showResults)
                    }
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .praxisSwitchTab)) { note in
            if let tab = note.object as? Int {
                selectedTab = tab
            }
        }
    }
}

extension Notification.Name {
    static let praxisSwitchTab = Notification.Name("praxisSwitchTab")
}
