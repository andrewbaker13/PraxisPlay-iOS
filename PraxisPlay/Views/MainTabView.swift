import SwiftUI

struct MainTabView: View {
    @ObservedObject var sessionStore = PraxisSessionStore.shared
    @State private var selectedTab: Int
    @State private var didStartWalkthrough: Bool = false

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

            InstructorHostView()
                .tabItem {
                    Label("Host", systemImage: "slider.horizontal.below.rectangle")
                }
                .tag(2)

            ProfileSettingsView()
                .tabItem {
                    Label("Account", systemImage: "person.crop.circle.fill")
                }
                .tag(3)
        }
        .tint(Color(red: 0.31, green: 0.27, blue: 0.90))
        .fullScreenCover(item: $sessionStore.activeArenaLaunch) { launchMode in
            LiveGameArenaView(launchMode: launchMode)
        }
        .onAppear {
            let args = CommandLine.arguments
            if args.contains("--app-review-walkthrough") && !didStartWalkthrough {
                didStartWalkthrough = true
                runInAppReviewWalkthrough()
                return
            }
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

    private func runInAppReviewWalkthrough() {
        Task { @MainActor in
            // 1. Join Live Tab (2.2s) -> Launch Room DEMO (Team Edition: Brief Relay)
            selectedTab = 0
            try? await Task.sleep(nanoseconds: 2_200_000_000)
            await sessionStore.joinRoom(roomCode: "DEMO", displayName: "Alex")
            try? await Task.sleep(nanoseconds: 4_200_000_000)

            // 2. Dismiss & Switch to Solo Practice Arcade Tab
            sessionStore.activeArenaLaunch = nil
            try? await Task.sleep(nanoseconds: 700_000_000)
            selectedTab = 1
            try? await Task.sleep(nanoseconds: 2_200_000_000)

            // 3. Launch Line Fit (Interactive OLS Regression)
            if let lineFit = SoloGameMode.allModes.first(where: { $0.id == "line_fit" }) {
                sessionStore.launchSoloMode(lineFit, showResults: false)
                try? await Task.sleep(nanoseconds: 3_800_000_000)
                sessionStore.activeArenaLaunch = nil
                try? await Task.sleep(nanoseconds: 700_000_000)
                sessionStore.launchSoloMode(lineFit, showResults: true)
                try? await Task.sleep(nanoseconds: 3_200_000_000)
                sessionStore.activeArenaLaunch = nil
                try? await Task.sleep(nanoseconds: 700_000_000)
            }

            // 4. Switch to Instructor Host Console Tab & pace live round -> debrief
            selectedTab = 2
            sessionStore.activateDemoHostSandbox()
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            _ = await sessionStore.performTeamPlayHostAction(roomCode: "DEMO", action: "round/end")
            try? await Task.sleep(nanoseconds: 2_500_000_000)
            _ = await sessionStore.performTeamPlayHostAction(roomCode: "DEMO", action: "reveal", body: ["step": 2])
            try? await Task.sleep(nanoseconds: 2_500_000_000)

            // 5. Switch to Account Tab -> Sign In (apple_demo_2) -> Delete Account -> Confirm
            selectedTab = 3
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            NotificationCenter.default.post(name: .praxisAccountDemoStep, object: "show-login")
            try? await Task.sleep(nanoseconds: 2_200_000_000)
            NotificationCenter.default.post(name: .praxisAccountDemoStep, object: "do-login")
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            NotificationCenter.default.post(name: .praxisAccountDemoStep, object: "show-delete")
            try? await Task.sleep(nanoseconds: 2_200_000_000)
            NotificationCenter.default.post(name: .praxisAccountDemoStep, object: "do-delete")
            try? await Task.sleep(nanoseconds: 3_200_000_000)
        }
    }
}

extension Notification.Name {
    static let praxisSwitchTab = Notification.Name("praxisSwitchTab")
    static let praxisAccountDemoStep = Notification.Name("praxisAccountDemoStep")
}
