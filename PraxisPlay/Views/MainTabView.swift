import SwiftUI

struct MainTabView: View {
    @ObservedObject var sessionStore = PraxisSessionStore.shared
    @State private var selectedTab: Int = 0

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
                    Label("Setup", systemImage: "slider.horizontal.3")
                }
                .tag(2)
        }
        .tint(.blue)
        .fullScreenCover(item: $sessionStore.activeArenaLaunch) { launchMode in
            LiveGameArenaView(launchMode: launchMode)
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
