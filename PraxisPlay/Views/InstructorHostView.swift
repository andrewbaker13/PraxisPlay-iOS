import SwiftUI
import CoreImage.CIFilterBuiltins

struct InstructorHostView: View {
    @ObservedObject var sessionStore = PraxisSessionStore.shared
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    enum HostEdition: String, CaseIterable, Identifiable {
        case teamEdition = "Team Edition (Agency Pitch)"
        case classicEdition = "Classic Edition (Mini-Games)"
        var id: String { rawValue }
    }

    @State private var selectedEdition: HostEdition = .teamEdition
    @State private var showLoginSheet: Bool = false
    @State private var showTeamRoomSetupDrawer: Bool = false
    @State private var showClassicRoomSetupDrawer: Bool = false
    @State private var nowTick: Date = Date()

    // Team Edition Creation & Control State
    @State private var teamAccessMode: String = "open_access"
    @State private var teamGuestPassword: String = ""
    @State private var teamSelectedCourseId: Int = 0
    @State private var teamClockSeconds: Int = 90
    @State private var teamSelectedCaseId: String = "kf-r2-001"
    @State private var teamRoundsTotal: Int = 5
    @State private var manualTeamRoomCode: String = ""
    @State private var showTeamQR: Bool = false

    // Classic Edition Creation & Control State
    @State private var classicSelectedTemplateId: Int = 0
    @State private var classicSelectedCourseId: Int = 0
    @State private var classicAccessMode: String = "open_access"
    @State private var classicGuestPassword: String = ""
    @State private var classicTimeOverride: Int = 0
    @State private var classicMultiplier: Double = 1.0
    @State private var manualClassicRoomCode: String = ""
    @State private var showClassicQR: Bool = false

    private let revealStepLabels: [String] = [
        "1. Team Choices",
        "2. Client Key",
        "3. Why: Hook",
        "4. Why: Channel",
        "5. Why: Creative",
        "6. Why: Offer",
        "7. Score Breakdown",
        "8. Core Lesson",
        "9. Cross-Desk Trap"
    ]

    private let revealStepDescriptions: [String] = [
        "Reveals Red vs. Blue Agency locked choices for all 4 desks on the projector.",
        "Unveils the client's ideal 4-part target strategy alongside team picks.",
        "Explains why the Analytics Desk's Hook choice succeeded or fell into the trap.",
        "Explains why the Research Desk's Channel choice matched or missed the audience.",
        "Explains the Environment Desk's Creative framing and competitive context.",
        "Explains the Brand Desk's Offer structure and margin/loyalty impact.",
        "Animates round points, harmony bonuses, and updated Red vs. Blue scoreboard.",
        "Highlights the executive takeaway from this round's cross-desk evidence.",
        "Shows how a quote on one desk qualified a metric on another desk."
    ]

    private let pollTimer = Timer.publish(every: 2.5, on: .main, in: .common).autoconnect()
    private let clockTimer = Timer.publish(every: 1.0, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    editionSwitcher

                    if !sessionStore.isAuthenticated && !sessionStore.isDemoHostSandboxActive {
                        instructorSignInPromptCard
                    } else {
                        if sessionStore.isDemoHostSandboxActive {
                            sandboxActiveBanner
                        } else if !sessionStore.isStaffUser && sessionStore.currentTeamHostState == nil {
                            launchSandboxButton
                        }

                        if let busyMsg = sessionStore.hostStatusMessage, !busyMsg.isEmpty {
                            busyStatusBanner(busyMsg)
                        } else if let feedback = sessionStore.lastHostActionFeedback, !feedback.isEmpty {
                            feedbackBanner(feedback)
                        }

                        if let err = sessionStore.hostErrorMessage, !err.isEmpty {
                            errorBanner(err)
                        }

                        if selectedEdition == .teamEdition {
                            teamEditionHostContent
                        } else {
                            classicEditionHostContent
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 10)
                .padding(.bottom, 40)
                .frame(maxWidth: 920)
                .frame(maxWidth: .infinity)
            }
            .background(
                LinearGradient(
                    colors: [
                        Color(red: 0.93, green: 0.95, blue: 1.0),
                        Color(red: 0.97, green: 0.98, blue: 0.99)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
            )
            .navigationTitle("Instructor Host Console")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if sessionStore.isAuthenticated || sessionStore.isDemoHostSandboxActive {
                        Button {
                            HapticsManager.shared.playTap()
                            Task {
                                await sessionStore.fetchInstructorSetupData()
                                if let tCode = sessionStore.currentTeamHostState?.roomCode {
                                    _ = await sessionStore.fetchTeamPlayHostState(roomCode: tCode)
                                }
                                if let cCode = sessionStore.currentClassicHostRoom?.roomCode {
                                    await sessionStore.fetchClassicHostSession(roomCode: cCode)
                                }
                            }
                        } label: {
                            Label("Sync", systemImage: "arrow.clockwise")
                                .font(.subheadline.weight(.bold))
                        }
                    }
                }
            }
            .onAppear {
                if sessionStore.isAuthenticated {
                    Task {
                        await sessionStore.fetchInstructorSetupData()
                        if classicSelectedTemplateId == 0, let first = sessionStore.instructorTemplates.first {
                            classicSelectedTemplateId = first.id
                        }
                        if sessionStore.currentTeamHostState == nil, let firstTeam = sessionStore.hostedTeamRoomCodes.first {
                            _ = await sessionStore.fetchTeamPlayHostState(roomCode: firstTeam)
                        }
                        if sessionStore.currentClassicHostRoom == nil, let firstClassic = sessionStore.activeClassicHostRooms.first {
                            await sessionStore.fetchClassicHostSession(roomCode: firstClassic.roomCode)
                        }
                    }
                }
            }
            .onReceive(pollTimer) { _ in
                guard sessionStore.isAuthenticated, !sessionStore.isHostingBusy else { return }
                Task {
                    if selectedEdition == .teamEdition, let code = sessionStore.currentTeamHostState?.roomCode, code != "DEMO" {
                        _ = await sessionStore.fetchTeamPlayHostState(roomCode: code)
                    } else if selectedEdition == .classicEdition, let code = sessionStore.currentClassicHostRoom?.roomCode, code != "DEMO" {
                        await sessionStore.fetchClassicHostSession(roomCode: code)
                    }
                }
            }
            .onReceive(clockTimer) { tick in
                nowTick = tick
            }
            .sheet(isPresented: $showLoginSheet) {
                MktPraxisLoginSheetView()
            }
        }
    }

    // MARK: - Top Edition Switcher & Banners
    private var editionSwitcher: some View {
        HStack(spacing: 8) {
            ForEach(HostEdition.allCases) { edition in
                let isSelected = (selectedEdition == edition)
                Button {
                    HapticsManager.shared.playSelection()
                    withAnimation(.spring(response: 0.25)) {
                        selectedEdition = edition
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: edition == .teamEdition ? "flag.2.crossed.fill" : "gamecontroller.fill")
                            .font(.system(size: 13, weight: .bold))
                        Text(edition.rawValue)
                            .font(.system(size: 13, weight: .heavy))
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .foregroundStyle(isSelected ? .white : Color(red: 0.28, green: 0.33, blue: 0.41))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 11)
                    .padding(.horizontal, 10)
                    .background(
                        isSelected
                            ? (edition == .teamEdition
                                ? Color(red: 0.78, green: 0.25, blue: 0.18)
                                : Color(red: 0.31, green: 0.27, blue: 0.90))
                            : Color.white
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .strokeBorder(
                                isSelected ? Color.clear : Color(red: 0.80, green: 0.84, blue: 0.88),
                                lineWidth: 1
                            )
                    )
                }
            }
        }
    }

    private var sandboxActiveBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "sparkles.tv.fill")
                .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
            Text("Interactive Host Sandbox (Room DEMO · PIN 4821)")
                .font(.system(size: 12.5, weight: .bold))
                .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
            Spacer()
            Button("Exit Demo") {
                sessionStore.deactivateDemoHostSandbox()
            }
            .font(.system(size: 12, weight: .heavy))
            .foregroundStyle(Color(red: 0.78, green: 0.25, blue: 0.18))
        }
        .padding(11)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color(red: 0.80, green: 0.84, blue: 0.88), lineWidth: 1)
        )
    }

    private var launchSandboxButton: some View {
        Button {
            sessionStore.activateDemoHostSandbox()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "play.tv.fill")
                Text("Launch Interactive Host Console Sandbox (Room DEMO)")
                    .font(.system(size: 13.5, weight: .heavy))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color(red: 0.18, green: 0.44, blue: 0.37))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func busyStatusBanner(_ message: String) -> some View {
        HStack(spacing: 10) {
            ProgressView()
                .tint(Color(red: 0.17, green: 0.38, blue: 0.76))
            Text(message)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
            Spacer()
        }
        .padding(12)
        .background(Color(red: 0.93, green: 0.95, blue: 1.0))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color(red: 0.17, green: 0.38, blue: 0.76).opacity(0.35), lineWidth: 1)
        )
    }

    private func feedbackBanner(_ message: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Color(red: 0.02, green: 0.59, blue: 0.41))
            Text(message)
                .font(.system(size: 12.5, weight: .bold))
                .foregroundStyle(Color(red: 0.04, green: 0.38, blue: 0.27))
            Spacer()
            Button {
                sessionStore.lastHostActionFeedback = nil
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Color(red: 0.04, green: 0.38, blue: 0.27))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color(red: 0.90, green: 0.98, blue: 0.94))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color(red: 0.02, green: 0.59, blue: 0.41).opacity(0.35), lineWidth: 1)
        )
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Color(red: 0.88, green: 0.11, blue: 0.28))
            Text(message)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color(red: 0.53, green: 0.07, blue: 0.22))
            Spacer()
            Button {
                sessionStore.hostErrorMessage = nil
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(Color(red: 0.53, green: 0.07, blue: 0.22))
            }
        }
        .padding(12)
        .background(Color(red: 1.0, green: 0.95, blue: 0.96))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .strokeBorder(Color(red: 0.99, green: 0.64, blue: 0.69), lineWidth: 1)
        )
    }

    private var instructorSignInPromptCard: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.badge.key.fill")
                .font(.system(size: 42))
                .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))

            Text("Sign In to Host Live Classroom Games")
                .font(.system(size: 19, weight: .heavy, design: .rounded))
                .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))

            Text("Log in with your MktPraxis instructor account to launch Team Edition agency pitches or Classic mini-game rooms, pair with the classroom projector, and pace every round from your phone.")
                .font(.system(size: 13.5, weight: .medium))
                .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 8)

            Button {
                HapticsManager.shared.playTap()
                showLoginSheet = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "lock.open.fill")
                    Text("Sign In with Instructor Account")
                }
                .font(.system(size: 15, weight: .heavy))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    LinearGradient(
                        colors: [Color(red: 0.31, green: 0.27, blue: 0.90), Color(red: 0.15, green: 0.39, blue: 0.92)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }

            Button {
                sessionStore.activateDemoHostSandbox()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "play.tv.fill")
                    Text("Try Interactive Host Console Demo (No Login)")
                }
                .font(.system(size: 14, weight: .heavy))
                .foregroundStyle(Color(red: 0.18, green: 0.44, blue: 0.37))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(Color(red: 0.90, green: 0.97, blue: 0.94))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(Color(red: 0.18, green: 0.44, blue: 0.37).opacity(0.35), lineWidth: 1)
                )
            }
        }
        .padding(24)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1)
        )
    }

    // MARK: - 1. TEAM EDITION HOST CONSOLE
    private var teamEditionHostContent: some View {
        VStack(spacing: 16) {
            if let hostState = sessionStore.currentTeamHostState {
                // Active Live Stage Controller is primary at the top!
                teamLiveControlDeck(hostState)

                if showTeamRoomSetupDrawer {
                    teamRoomCreationCard
                }
            } else {
                teamRoomCreationCard
            }
        }
    }

    private var teamRoomCreationCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("Create or Switch Team Edition Room", systemImage: "plus.rectangle.on.folder.fill")
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                Spacer()
                if sessionStore.currentTeamHostState != nil {
                    Button("Close") {
                        withAnimation { showTeamRoomSetupDrawer = false }
                    }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                } else {
                    Text("Red vs. Blue Agency")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(red: 0.78, green: 0.25, blue: 0.18))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(red: 0.99, green: 0.93, blue: 0.92))
                        .clipShape(Capsule())
                }
            }

            if !sessionStore.hostedTeamRoomCodes.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("YOUR RECENT TEAM ROOMS (TAP TO OPEN)")
                        .font(.system(size: 10.5, weight: .heavy))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(sessionStore.hostedTeamRoomCodes, id: \.self) { code in
                                let isCurrent = sessionStore.currentTeamHostState?.roomCode == code
                                Button {
                                    HapticsManager.shared.playSelection()
                                    Task {
                                        _ = await sessionStore.fetchTeamPlayHostState(roomCode: code)
                                        withAnimation { showTeamRoomSetupDrawer = false }
                                    }
                                } label: {
                                    HStack(spacing: 4) {
                                        Image(systemName: isCurrent ? "checkmark.circle.fill" : "play.circle.fill")
                                            .font(.system(size: 11))
                                        Text("Room \(code)")
                                            .font(.system(size: 12.5, weight: .heavy, design: .monospaced))
                                    }
                                    .foregroundStyle(isCurrent ? .white : Color(red: 0.06, green: 0.09, blue: 0.16))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 7)
                                    .background(isCurrent ? Color(red: 0.78, green: 0.25, blue: 0.18) : Color(red: 0.93, green: 0.95, blue: 0.98))
                                    .clipShape(Capsule())
                                }
                            }
                        }
                    }
                }
            }

            HStack(spacing: 8) {
                TextField("Jump to Room Code (e.g. KF01)", text: $manualTeamRoomCode)
                    .textInputAutocapitalization(.characters)
                    .disableAutocorrection(true)
                    .font(.system(size: 13.5, weight: .bold, design: .monospaced))
                    .padding(10)
                    .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                Button("Open Room") {
                    let code = manualTeamRoomCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                    guard !code.isEmpty else { return }
                    Task {
                        let ok = await sessionStore.fetchTeamPlayHostState(roomCode: code)
                        if ok {
                            withAnimation { showTeamRoomSetupDrawer = false }
                        }
                    }
                }
                .font(.system(size: 13, weight: .heavy))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(red: 0.17, green: 0.38, blue: 0.76))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            Divider()

            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Access Mode")
                        .font(.system(size: 11.5, weight: .bold))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                    Picker("Access Mode", selection: $teamAccessMode) {
                        Text("Open Access").tag("open_access")
                        Text("Room Password").tag("password")
                        Text("Enrolled Only").tag("enrollment_required")
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Round Clock")
                        .font(.system(size: 11.5, weight: .bold))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                    Picker("Round Clock", selection: $teamClockSeconds) {
                        Text("60 sec").tag(60)
                        Text("90 sec").tag(90)
                        Text("120 sec").tag(120)
                        Text("150 sec").tag(150)
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }

            if teamAccessMode == "password" {
                TextField("Room Password (required for guests)", text: $teamGuestPassword)
                    .textInputAutocapitalization(.never)
                    .disableAutocorrection(true)
                    .padding(12)
                    .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            if !sessionStore.instructorCourses.isEmpty {
                HStack {
                    Text("Course:")
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                    Picker("Course", selection: $teamSelectedCourseId) {
                        Text("No Specific Course").tag(0)
                        ForEach(sessionStore.instructorCourses) { c in
                            Text(c.name).tag(c.id)
                        }
                    }
                    .pickerStyle(.menu)
                }
            }

            Button {
                Task {
                    if let created = await sessionStore.createTeamPlaySession(
                        accessMode: teamAccessMode,
                        guestPassword: teamGuestPassword,
                        courseId: teamSelectedCourseId == 0 ? nil : teamSelectedCourseId,
                        clockSeconds: teamClockSeconds
                    ), !created.isEmpty {
                        withAnimation { showTeamRoomSetupDrawer = false }
                    }
                }
            } label: {
                HStack {
                    if sessionStore.isHostingBusy {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: "plus.circle.fill")
                    }
                    Text("Create New Team Edition Room")
                }
                .font(.system(size: 14.5, weight: .heavy))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(Color(red: 0.18, green: 0.44, blue: 0.37))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(sessionStore.isHostingBusy)
        }
        .padding(16)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1)
        )
    }

    // MARK: - Active Team Edition Live Stage Controller
    private func teamLiveControlDeck(_ state: TeamPlayHostState) -> some View {
        let stageIdx = teamStageIndex(for: state.matchState)
        let deskStats = computeDeskLockStats(state)
        let remainingSec = computeRemainingSeconds(roundEndsAt: state.roundEndsAt, limit: state.roundTimeLimit, now: nowTick)

        return VStack(alignment: .leading, spacing: 16) {
            // 1. Top Room Identity Bar + Quick Switcher
            HStack(alignment: .center, spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 8) {
                        HStack(spacing: 5) {
                            Circle()
                                .fill(state.matchState == "complete" ? Color.gray : Color(red: 0.16, green: 0.84, blue: 0.48))
                                .frame(width: 8, height: 8)
                            Text("ROOM \(state.roomCode)")
                                .font(.system(size: 20, weight: .black, design: .monospaced))
                                .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        }

                        if !state.projectorPin.isEmpty {
                            Text("PIN \(state.projectorPin)")
                                .font(.system(size: 11.5, weight: .black, design: .monospaced))
                                .foregroundStyle(Color(red: 0.56, green: 0.33, blue: 0.04))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color(red: 1.0, green: 0.94, blue: 0.78))
                                .clipShape(Capsule())
                        }
                    }

                    Text("\(state.caseClient) · Round \(max(1, state.currentRound)) of \(state.roundsTotal) • \(state.playerCount) Players")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                }

                Spacer()

                Button {
                    HapticsManager.shared.playTap()
                    withAnimation { showTeamQR.toggle() }
                } label: {
                    Image(systemName: "qrcode")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(showTeamQR ? .white : Color(red: 0.17, green: 0.38, blue: 0.76))
                        .padding(9)
                        .background(showTeamQR ? Color(red: 0.17, green: 0.38, blue: 0.76) : Color(red: 0.93, green: 0.95, blue: 1.0))
                        .clipShape(Circle())
                }

                Button {
                    HapticsManager.shared.playTap()
                    withAnimation { showTeamRoomSetupDrawer.toggle() }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.left.arrow.right")
                            .font(.system(size: 11, weight: .bold))
                        Text(showTeamRoomSetupDrawer ? "Hide Setup" : "Switch Room")
                            .font(.system(size: 11.5, weight: .heavy))
                    }
                    .foregroundStyle(Color(red: 0.28, green: 0.33, blue: 0.41))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(Color(red: 0.93, green: 0.95, blue: 0.98))
                    .clipShape(Capsule())
                }
            }

            // 2. Visual 5-Stage Match Progress Stepper
            teamStageStepper(activeStage: stageIdx, revealStep: state.revealStep)

            // 3. Plain-English "WHAT'S HAPPENING NOW" Live Classroom Monitor Card
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(teamStageHeadline(for: state).uppercased())
                        .font(.system(size: 11.5, weight: .black))
                        .tracking(0.6)
                        .foregroundStyle(Color(red: 0.45, green: 0.89, blue: 0.68))
                    Spacer()
                    if state.matchState == "round" {
                        Text("LIVE CLOCK")
                            .font(.system(size: 10, weight: .black))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(remainingSec <= 15 ? Color.red : Color(red: 0.02, green: 0.59, blue: 0.41))
                            .clipShape(Capsule())
                    }
                }

                // If in active round, show large digital countdown clock + desk lock meter!
                if state.matchState == "round" {
                    HStack(alignment: .center, spacing: 16) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(formatMMSS(remainingSec))
                                .font(.system(size: 34, weight: .black, design: .monospaced))
                                .foregroundStyle(remainingSec <= 15 ? Color(red: 1.0, green: 0.45, blue: 0.45) : .white)
                            Text("Remaining in Round \(state.currentRound)")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(Color(red: 0.67, green: 0.75, blue: 0.86))
                        }

                        Divider()
                            .frame(height: 44)
                            .background(Color.white.opacity(0.2))

                        VStack(alignment: .leading, spacing: 5) {
                            HStack {
                                Text("Desks Locked In")
                                    .font(.system(size: 11.5, weight: .bold))
                                    .foregroundStyle(Color(red: 0.82, green: 0.87, blue: 0.95))
                                Spacer()
                                Text("\(deskStats.lockedDesks) / \(deskStats.totalDesks)")
                                    .font(.system(size: 13, weight: .black, design: .monospaced))
                                    .foregroundStyle(Color(red: 0.45, green: 0.89, blue: 0.68))
                            }
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule()
                                        .fill(Color.white.opacity(0.15))
                                        .frame(height: 8)
                                    Capsule()
                                        .fill(Color(red: 0.16, green: 0.84, blue: 0.48))
                                        .frame(width: max(6, geo.size.width * deskStats.fraction), height: 8)
                                }
                            }
                            .frame(height: 8)
                            Text(deskStats.lockedDesks == deskStats.totalDesks && deskStats.totalDesks > 0
                                 ? "All desks locked! Ready to score pitch."
                                 : "Waiting for remaining desks to lock A/B/C/D…")
                                .font(.system(size: 10.5, weight: .medium))
                                .foregroundStyle(Color(red: 0.67, green: 0.75, blue: 0.86))
                        }
                    }
                    .padding(.vertical, 4)
                }

                // Plain-English Projector & Student Phone status rows
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "tv.fill")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color(red: 1.0, green: 0.82, blue: 0.40))
                            .frame(width: 18)
                        Text("**Projector:** \(teamProjectorDescription(for: state))")
                            .font(.system(size: 12.5, weight: .medium))
                            .foregroundStyle(.white)
                    }
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "iphone")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color(red: 0.45, green: 0.89, blue: 0.68))
                            .frame(width: 18)
                        Text("**Students:** \(teamStudentPhoneDescription(for: state))")
                            .font(.system(size: 12.5, weight: .medium))
                            .foregroundStyle(Color(red: 0.85, green: 0.90, blue: 0.97))
                    }
                }
            }
            .padding(14)
            .background(Color(red: 0.07, green: 0.11, blue: 0.20))
            .clipShape(RoundedRectangle(cornerRadius: 16))

            // 4. Stage-Specific Primary Host Action Controls
            VStack(alignment: .leading, spacing: 10) {
                Text("YOUR NEXT HOST ACTION")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(0.6)
                    .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))

                if state.matchState == "waiting" {
                    HStack(spacing: 12) {
                        Picker("Case", selection: $teamSelectedCaseId) {
                            ForEach(sessionStore.teamPlayCases) { c in
                                Text("\(c.client) · \(c.title) (Rung \(c.rung))").tag(c.caseId)
                            }
                        }
                        .pickerStyle(.menu)
                        .padding(6)
                        .background(Color(red: 0.95, green: 0.96, blue: 0.98))
                        .clipShape(RoundedRectangle(cornerRadius: 8))

                        Stepper("Rounds: \(teamRoundsTotal)", value: $teamRoundsTotal, in: 1...5)
                            .font(.system(size: 13, weight: .bold))
                    }

                    Button {
                        Task {
                            _ = await sessionStore.performTeamPlayHostAction(
                                roomCode: state.roomCode,
                                action: "start",
                                body: ["case_id": teamSelectedCaseId, "rounds_total": teamRoundsTotal]
                            )
                        }
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "play.fill")
                            VStack(alignment: .leading, spacing: 2) {
                                Text(state.playerCount >= 2
                                     ? "Step 1 → Deal 4 Desks & Start Briefing (\(state.playerCount) Players)"
                                     : "Waiting for at least 2 Players (\(state.playerCount)/2 Joined)")
                                    .font(.system(size: 15, weight: .heavy))
                                Text("Assigns Red & Blue agencies to Analytics, Research, Environment & Brand desks")
                                    .font(.system(size: 11, weight: .medium))
                                    .opacity(0.9)
                            }
                            Spacer()
                            Image(systemName: "arrow.right.circle.fill")
                                .font(.system(size: 20))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(state.playerCount >= 2 ? Color(red: 0.18, green: 0.44, blue: 0.37) : Color.gray)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(state.playerCount < 2 || sessionStore.isHostingBusy)

                } else if state.matchState == "briefing" || state.matchState == "rotation" {
                    Button {
                        Task {
                            _ = await sessionStore.performTeamPlayHostAction(
                                roomCode: state.roomCode,
                                action: "round/start",
                                body: ["seconds": state.roundTimeLimit]
                            )
                        }
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "timer")
                                .font(.system(size: 20, weight: .bold))
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Start Round \(max(1, state.currentRound)) Pitch Clock (\(state.roundTimeLimit)s)")
                                    .font(.system(size: 15.5, weight: .heavy))
                                Text("Unlocks A/B/C/D voting buttons on student phones & starts countdown")
                                    .font(.system(size: 11, weight: .medium))
                                    .opacity(0.9)
                            }
                            Spacer()
                            Image(systemName: "play.circle.fill")
                                .font(.system(size: 22))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(Color(red: 0.02, green: 0.59, blue: 0.41))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(sessionStore.isHostingBusy)

                } else if state.matchState == "round" {
                    HStack(spacing: 10) {
                        Button {
                            Task {
                                _ = await sessionStore.performTeamPlayHostAction(
                                    roomCode: state.roomCode,
                                    action: "round/extend",
                                    body: ["seconds": 30]
                                )
                            }
                        } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "plus.circle.fill")
                                Text("+30s Clock")
                            }
                            .font(.system(size: 14, weight: .heavy))
                            .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 15)
                            .background(Color(red: 0.93, green: 0.95, blue: 0.98))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .disabled(sessionStore.isHostingBusy)

                        Button {
                            Task {
                                _ = await sessionStore.performTeamPlayHostAction(
                                    roomCode: state.roomCode,
                                    action: "round/end"
                                )
                            }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "flag.checkered")
                                VStack(alignment: .leading, spacing: 1) {
                                    Text("Lock Desks & Score Pitch")
                                        .font(.system(size: 14.5, weight: .heavy))
                                    Text("Moves to 9-step projector debrief")
                                        .font(.system(size: 10.5, weight: .medium))
                                        .opacity(0.9)
                                }
                                Spacer()
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(Color(red: 0.78, green: 0.25, blue: 0.18))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .disabled(sessionStore.isHostingBusy)
                    }

                } else if state.matchState == "assessment" {
                    // 9-Step Client Assessment Reveal Pacer
                    let currentStep = max(1, min(9, state.revealStep))
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("DEBRIEF STEP \(currentStep) OF 9: \(revealStepLabels[currentStep - 1].uppercased())")
                                .font(.system(size: 11, weight: .black))
                                .foregroundStyle(Color(red: 0.18, green: 0.44, blue: 0.37))
                            Spacer()
                            Text("\(Int((Double(currentStep) / 9.0) * 100))% Revealed")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                        }

                        if state.revealStep < 9 {
                            let nextStep = state.revealStep + 1
                            Button {
                                Task {
                                    _ = await sessionStore.performTeamPlayHostAction(
                                        roomCode: state.roomCode,
                                        action: "reveal",
                                        body: ["step": nextStep]
                                    )
                                }
                            } label: {
                                HStack(spacing: 10) {
                                    Image(systemName: "eye.fill")
                                        .font(.system(size: 18, weight: .bold))
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Next Reveal → \(revealStepLabels[nextStep - 1])")
                                            .font(.system(size: 15, weight: .heavy))
                                        Text(revealStepDescriptions[nextStep - 1])
                                            .font(.system(size: 11, weight: .medium))
                                            .lineLimit(1)
                                            .opacity(0.92)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right.circle.fill")
                                        .font(.system(size: 20))
                                }
                                .foregroundStyle(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 13)
                                .background(Color(red: 0.18, green: 0.44, blue: 0.37))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                            }
                            .disabled(sessionStore.isHostingBusy)
                        }

                        Button {
                            Task {
                                _ = await sessionStore.performTeamPlayHostAction(
                                    roomCode: state.roomCode,
                                    action: "advance"
                                )
                            }
                        } label: {
                            HStack {
                                Image(systemName: state.currentRound >= state.roundsTotal ? "trophy.fill" : "forward.fill")
                                Text(state.currentRound >= state.roundsTotal
                                     ? "Finish Match & Show Final Trophy →"
                                     : "Rotate Desks & Start Round \(state.currentRound + 1) →")
                            }
                            .font(.system(size: 14, weight: .heavy))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                            .background(Color(red: 0.17, green: 0.38, blue: 0.76))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .disabled(sessionStore.isHostingBusy)

                        // Direct step jumper pills
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(1...9, id: \.self) { step in
                                    let isCurrent = state.revealStep == step
                                    let isDone = state.revealStep > step
                                    Button {
                                        Task {
                                            _ = await sessionStore.performTeamPlayHostAction(
                                                roomCode: state.roomCode,
                                                action: "reveal",
                                                body: ["step": step]
                                            )
                                        }
                                    } label: {
                                        Text(revealStepLabels[step - 1])
                                            .font(.system(size: 11.5, weight: .bold))
                                            .foregroundStyle(isCurrent || isDone ? .white : Color(red: 0.28, green: 0.33, blue: 0.41))
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 6)
                                            .background(
                                                isCurrent
                                                    ? Color(red: 0.17, green: 0.38, blue: 0.76)
                                                    : (isDone ? Color(red: 0.18, green: 0.44, blue: 0.37) : Color(red: 0.93, green: 0.95, blue: 0.98))
                                            )
                                            .clipShape(Capsule())
                                    }
                                }
                            }
                        }
                    }
                } else if state.matchState == "complete" {
                    Button {
                        withAnimation { showTeamRoomSetupDrawer = true }
                    } label: {
                        Label("Match Complete — Create or Switch Room", systemImage: "plus.circle.fill")
                            .font(.system(size: 14.5, weight: .heavy))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color(red: 0.17, green: 0.38, blue: 0.76))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }

            // 5. QR Join Drawer (when toggled)
            if showTeamQR {
                let joinLink = "https://www.mktpraxis.com/play?room=\(state.roomCode)"
                HStack(spacing: 16) {
                    if let qrImg = generateQRCode(from: joinLink) {
                        Image(uiImage: qrImg)
                            .interpolation(.none)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 105, height: 105)
                            .padding(8)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    VStack(alignment: .leading, spacing: 6) {
                        Text("STUDENT JOIN LINK")
                            .font(.system(size: 11, weight: .heavy))
                            .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                        Text("mktpraxis.com/play?room=\(state.roomCode)")
                            .font(.system(size: 13.5, weight: .bold, design: .monospaced))
                            .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        Button {
                            UIPasteboard.general.string = joinLink
                            HapticsManager.shared.playNotification(.success)
                        } label: {
                            Label("Copy Join URL", systemImage: "doc.on.doc")
                                .font(.system(size: 12, weight: .bold))
                        }
                        .buttonStyle(.bordered)
                    }
                    Spacer()
                }
                .padding(12)
                .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }

            // 6. Agency Standings & 4-Desk Live Readiness Grid
            VStack(alignment: .leading, spacing: 10) {
                Text("LIVE AGENCY DESK STATUS")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(0.6)
                    .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))

                ForEach(state.teams) { team in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Circle()
                                .fill(team.key == "red" ? Color(red: 0.78, green: 0.25, blue: 0.18) : Color(red: 0.17, green: 0.38, blue: 0.76))
                                .frame(width: 10, height: 10)
                            Text(team.name.uppercased())
                                .font(.system(size: 13, weight: .black))
                                .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                            Text("(\(team.players) players)")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                            Spacer()
                            Text("\(team.score) pts")
                                .font(.system(size: 15, weight: .black, design: .monospaced))
                                .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        }

                        if let desks = state.desksByTeam[team.key], !desks.isEmpty {
                            LazyVGrid(
                                columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)],
                                spacing: 8
                            ) {
                                ForEach(desks) { desk in
                                    deskStatusCell(desk, matchState: state.matchState)
                                }
                            }
                        }
                    }
                    .padding(12)
                    .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
            }

            // 7. Confidential Instructor Answer Key & Teaching Note
            if !state.clientKey.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Image(systemName: "key.fill")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color(red: 0.56, green: 0.33, blue: 0.04))
                        Text("CONFIDENTIAL CLIENT ANSWER KEY (HOST ONLY)")
                            .font(.system(size: 10.5, weight: .heavy))
                            .foregroundStyle(Color(red: 0.56, green: 0.33, blue: 0.04))
                    }
                    let keyStr = ["hook", "channel", "creative", "offer"].compactMap { k -> String? in
                        guard let v = state.clientKey[k] else { return nil }
                        return "\(k.capitalized): \(v)"
                    }.joined(separator: "  •  ")
                    Text(keyStr)
                        .font(.system(size: 13, weight: .black, design: .monospaced))
                        .foregroundStyle(Color(red: 0.35, green: 0.26, blue: 0.0))
                    if !state.lesson.isEmpty {
                        Text(state.lesson)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Color(red: 0.35, green: 0.26, blue: 0.0))
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(red: 1.0, green: 0.97, blue: 0.90))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(Color(red: 0.95, green: 0.86, blue: 0.69), lineWidth: 1)
                )
            }

            // 8. Classroom Podium PC Projector Pairing Banner
            classroomProjectorPairingBanner(roomCode: state.roomCode, projectorPin: state.projectorPin)

            // 9. Secondary Web Console & End Session Footer
            HStack(spacing: 10) {
                Button {
                    let path = state.roomCode == "DEMO"
                        ? "admin_pages/team_play/host.html?state=round"
                        : "admin_pages/team_play/host.html?room=\(state.roomCode)"
                    sessionStore.launchWebTool(
                        title: "Host · \(state.roomCode)",
                        relativePath: path
                    )
                } label: {
                    Label("Full Web Host", systemImage: "macwindow")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color(red: 0.17, green: 0.38, blue: 0.76))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(red: 0.93, green: 0.95, blue: 1.0))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                Button {
                    let path = state.roomCode == "DEMO"
                        ? "admin_pages/team_play/projector.html?state=round"
                        : "admin_pages/team_play/projector.html?room=\(state.roomCode)"
                    sessionStore.launchWebTool(
                        title: "Projector · \(state.roomCode)",
                        relativePath: path
                    )
                } label: {
                    Label("Preview Projector", systemImage: "tv.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(red: 0.95, green: 0.94, blue: 1.0))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                if state.status != "completed" {
                    Button(role: .destructive) {
                        Task {
                            _ = await sessionStore.performTeamPlayHostAction(
                                roomCode: state.roomCode,
                                action: "end"
                            )
                        }
                    } label: {
                        Text("End Room")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color(red: 0.88, green: 0.11, blue: 0.28))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color(red: 1.0, green: 0.95, blue: 0.96))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1)
        )
    }

    private func deskStatusCell(_ desk: TeamPlayDeskStatus, matchState: String) -> some View {
        let isAllLocked = !desk.holders.isEmpty && desk.locked >= desk.holders.count
        let hasSomeVotes = desk.locked > 0 || !desk.votes.isEmpty

        return VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Text("\(desk.label)")
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                    .lineLimit(1)
                if !desk.decides.isEmpty {
                    Text("· \(desk.decides.capitalized)")
                        .font(.system(size: 10.5, weight: .semibold))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                        .lineLimit(1)
                }
                Spacer()
                if let choice = desk.choice {
                    let isMatch = (desk.agreed == true)
                    Text("\(choice) \(isMatch ? "✓" : "✗")")
                        .font(.system(size: 11, weight: .black, design: .monospaced))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isMatch ? Color(red: 0.02, green: 0.59, blue: 0.41) : Color(red: 0.88, green: 0.11, blue: 0.28))
                        .clipShape(Capsule())
                } else if isAllLocked {
                    Text("LOCKED")
                        .font(.system(size: 9.5, weight: .black))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(red: 0.02, green: 0.59, blue: 0.41))
                        .clipShape(Capsule())
                } else if hasSomeVotes {
                    Text("\(desk.locked)/\(max(1, desk.holders.count))")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .foregroundStyle(Color(red: 0.56, green: 0.33, blue: 0.04))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(red: 1.0, green: 0.94, blue: 0.78))
                        .clipShape(Capsule())
                } else {
                    Text("WAIT")
                        .font(.system(size: 9.5, weight: .bold))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(red: 0.93, green: 0.95, blue: 0.98))
                        .clipShape(Capsule())
                }
            }

            Text(desk.holders.isEmpty ? "No students assigned" : desk.holders.joined(separator: ", "))
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                .lineLimit(1)

            if !desk.votes.isEmpty {
                let tally = desk.votes.sorted(by: { $0.key < $1.key }).map { "\($0.key):\($0.value)" }.joined(separator: " ")
                Text("Live Votes: \(tally)")
                    .font(.system(size: 10.5, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color(red: 0.18, green: 0.44, blue: 0.37))
            }
        }
        .padding(9)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .strokeBorder(
                    isAllLocked
                        ? Color(red: 0.02, green: 0.59, blue: 0.41).opacity(0.5)
                        : Color(red: 0.89, green: 0.91, blue: 0.94),
                    lineWidth: isAllLocked ? 1.5 : 1
                )
        )
    }

    // MARK: - 2. CLASSIC EDITION HOST CONSOLE
    private var classicEditionHostContent: some View {
        VStack(spacing: 16) {
            if let room = sessionStore.currentClassicHostRoom {
                classicLiveControlDeck(room)

                if showClassicRoomSetupDrawer {
                    classicRoomCreationCard
                }
            } else {
                classicRoomCreationCard
            }
        }
    }

    private var classicRoomCreationCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("Create or Switch Classic Mini-Game", systemImage: "gamecontroller.fill")
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                Spacer()
                if sessionStore.currentClassicHostRoom != nil {
                    Button("Close") {
                        withAnimation { showClassicRoomSetupDrawer = false }
                    }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                } else {
                    Text("9 Analytics Games")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(red: 0.93, green: 0.95, blue: 1.0))
                        .clipShape(Capsule())
                }
            }

            if !sessionStore.activeClassicHostRooms.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("ACTIVE CLASSIC ROOMS (TAP TO OPEN)")
                        .font(.system(size: 10.5, weight: .heavy))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(sessionStore.activeClassicHostRooms) { r in
                                let isCurrent = sessionStore.currentClassicHostRoom?.roomCode == r.roomCode
                                Button {
                                    HapticsManager.shared.playSelection()
                                    Task {
                                        await sessionStore.fetchClassicHostSession(roomCode: r.roomCode)
                                        withAnimation { showClassicRoomSetupDrawer = false }
                                    }
                                } label: {
                                    Text("\(r.roomCode) · \(r.templateName)")
                                        .font(.system(size: 12, weight: .heavy))
                                        .foregroundStyle(isCurrent ? .white : Color(red: 0.06, green: 0.09, blue: 0.16))
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 7)
                                        .background(isCurrent ? Color(red: 0.31, green: 0.27, blue: 0.90) : Color(red: 0.93, green: 0.95, blue: 0.98))
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                }
            }

            HStack(spacing: 8) {
                TextField("Jump to Classic Room Code", text: $manualClassicRoomCode)
                    .textInputAutocapitalization(.characters)
                    .disableAutocorrection(true)
                    .font(.system(size: 13.5, weight: .bold, design: .monospaced))
                    .padding(10)
                    .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                Button("Open Room") {
                    let code = manualClassicRoomCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                    guard !code.isEmpty else { return }
                    Task {
                        await sessionStore.fetchClassicHostSession(roomCode: code)
                        withAnimation { showClassicRoomSetupDrawer = false }
                    }
                }
                .font(.system(size: 13, weight: .heavy))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(red: 0.15, green: 0.39, blue: 0.92))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            Divider()

            if sessionStore.instructorTemplates.isEmpty {
                Text("No game templates loaded yet — sign in with an instructor account or tap Sync.")
                    .font(.system(size: 12.5, weight: .medium))
                    .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Game Template")
                        .font(.system(size: 11.5, weight: .bold))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                    Picker("Game Template", selection: $classicSelectedTemplateId) {
                        ForEach(sessionStore.instructorTemplates) { t in
                            Text("\(t.name) (\(t.roundsCount) rds)").tag(t.id)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }

            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Access Mode")
                        .font(.system(size: 11.5, weight: .bold))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                    Picker("Access Mode", selection: $classicAccessMode) {
                        Text("Open + Guests").tag("open_access")
                        Text("Enrolled Only").tag("enrollment_required")
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Time Override")
                        .font(.system(size: 11.5, weight: .bold))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                    Picker("Time Override", selection: $classicTimeOverride) {
                        Text("Template Default").tag(0)
                        Text("15 sec").tag(15)
                        Text("20 sec").tag(20)
                        Text("30 sec").tag(30)
                        Text("45 sec").tag(45)
                        Text("60 sec").tag(60)
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }

            TextField("Optional Guest PIN / Password", text: $classicGuestPassword)
                .textInputAutocapitalization(.never)
                .disableAutocorrection(true)
                .padding(10)
                .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                .clipShape(RoundedRectangle(cornerRadius: 10))

            Button {
                let tid = classicSelectedTemplateId != 0
                    ? classicSelectedTemplateId
                    : (sessionStore.instructorTemplates.first?.id ?? 0)
                guard tid != 0 else { return }
                Task {
                    if let created = await sessionStore.createClassicGameSession(
                        templateId: tid,
                        courseId: classicSelectedCourseId == 0 ? nil : classicSelectedCourseId,
                        accessMode: classicAccessMode,
                        guestPassword: classicGuestPassword,
                        timeOverride: classicTimeOverride == 0 ? nil : classicTimeOverride,
                        scoringMultiplier: classicMultiplier
                    ), !created.isEmpty {
                        withAnimation { showClassicRoomSetupDrawer = false }
                    }
                }
            } label: {
                HStack {
                    if sessionStore.isHostingBusy {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: "plus.circle.fill")
                    }
                    Text("Create Classic Game Room")
                }
                .font(.system(size: 14.5, weight: .heavy))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(Color(red: 0.31, green: 0.27, blue: 0.90))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(sessionStore.isHostingBusy || sessionStore.instructorTemplates.isEmpty)
        }
        .padding(16)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1)
        )
    }

    private func classicLiveControlDeck(_ room: ActiveClassicHostRoom) -> some View {
        let stageIdx = classicStageIndex(for: room.status)

        return VStack(alignment: .leading, spacing: 16) {
            // 1. Top Room Identity Bar
            HStack(alignment: .center, spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 8) {
                        HStack(spacing: 5) {
                            Circle()
                                .fill(room.status == "completed" ? Color.gray : Color(red: 0.16, green: 0.84, blue: 0.48))
                                .frame(width: 8, height: 8)
                            Text("ROOM \(room.roomCode)")
                                .font(.system(size: 20, weight: .black, design: .monospaced))
                                .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        }
                        if !room.projectorPin.isEmpty {
                            Text("PIN \(room.projectorPin)")
                                .font(.system(size: 11.5, weight: .black, design: .monospaced))
                                .foregroundStyle(Color(red: 0.56, green: 0.33, blue: 0.04))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color(red: 1.0, green: 0.94, blue: 0.78))
                                .clipShape(Capsule())
                        }
                    }
                    Text("\(room.templateName) • Round \(room.currentRound) of \(room.totalRounds) • \(room.playerCount) Players")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                }

                Spacer()

                Button {
                    HapticsManager.shared.playTap()
                    withAnimation { showClassicQR.toggle() }
                } label: {
                    Image(systemName: "qrcode")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(showClassicQR ? .white : Color(red: 0.31, green: 0.27, blue: 0.90))
                        .padding(9)
                        .background(showClassicQR ? Color(red: 0.31, green: 0.27, blue: 0.90) : Color(red: 0.93, green: 0.95, blue: 1.0))
                        .clipShape(Circle())
                }

                Button {
                    HapticsManager.shared.playTap()
                    withAnimation { showClassicRoomSetupDrawer.toggle() }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.left.arrow.right")
                            .font(.system(size: 11, weight: .bold))
                        Text(showClassicRoomSetupDrawer ? "Hide Setup" : "Switch Room")
                            .font(.system(size: 11.5, weight: .heavy))
                    }
                    .foregroundStyle(Color(red: 0.28, green: 0.33, blue: 0.41))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 7)
                    .background(Color(red: 0.93, green: 0.95, blue: 0.98))
                    .clipShape(Capsule())
                }
            }

            // 2. Classic 4-Stage Stepper
            classicStageStepper(activeStage: stageIdx)

            // 3. Plain-English "WHAT'S HAPPENING NOW" Card
            VStack(alignment: .leading, spacing: 8) {
                Text(classicStageHeadline(for: room).uppercased())
                    .font(.system(size: 11.5, weight: .black))
                    .tracking(0.6)
                    .foregroundStyle(Color(red: 0.45, green: 0.89, blue: 0.68))

                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "tv.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color(red: 1.0, green: 0.82, blue: 0.40))
                        .frame(width: 18)
                    Text("**Projector:** \(classicProjectorDescription(for: room))")
                        .font(.system(size: 12.5, weight: .medium))
                        .foregroundStyle(.white)
                }
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "iphone")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color(red: 0.45, green: 0.89, blue: 0.68))
                        .frame(width: 18)
                    Text("**Students:** \(classicStudentDescription(for: room))")
                        .font(.system(size: 12.5, weight: .medium))
                        .foregroundStyle(Color(red: 0.85, green: 0.90, blue: 0.97))
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(red: 0.07, green: 0.11, blue: 0.20))
            .clipShape(RoundedRectangle(cornerRadius: 16))

            // 4. Primary Stage-Aware Action Button + Secondary Controls
            VStack(alignment: .leading, spacing: 10) {
                Text("YOUR NEXT HOST ACTION")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(0.6)
                    .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))

                if room.status == "waiting" {
                    Button {
                        Task {
                            _ = await sessionStore.performClassicHostAction(roomCode: room.roomCode, action: "start")
                        }
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "play.fill")
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Start Round 1 (\(room.playerCount) Players Connected)")
                                    .font(.system(size: 15, weight: .heavy))
                                Text("Launches Round 1 interactive challenge on all student phones")
                                    .font(.system(size: 11, weight: .medium))
                                    .opacity(0.9)
                            }
                            Spacer()
                            Image(systemName: "arrow.right.circle.fill")
                                .font(.system(size: 20))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(Color(red: 0.02, green: 0.59, blue: 0.41))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(sessionStore.isHostingBusy)

                } else if room.status == "in_progress" {
                    Button {
                        Task {
                            _ = await sessionStore.performClassicHostAction(roomCode: room.roomCode, action: "end_round")
                        }
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "flag.checkered")
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Lock Answers & Reveal Round \(room.currentRound) Results")
                                    .font(.system(size: 15, weight: .heavy))
                                Text("Stops round clock and displays class distribution & leaderboard on projector")
                                    .font(.system(size: 11, weight: .medium))
                                    .opacity(0.9)
                            }
                            Spacer()
                            Image(systemName: "chart.bar.fill")
                                .font(.system(size: 18))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(Color(red: 0.85, green: 0.47, blue: 0.02))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(sessionStore.isHostingBusy)

                } else if room.status == "round_ended" {
                    if room.currentRound < room.totalRounds {
                        Button {
                            Task {
                                _ = await sessionStore.performClassicHostAction(roomCode: room.roomCode, action: "advance-round")
                            }
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "forward.end.fill")
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Start Round \(room.currentRound + 1) of \(room.totalRounds) →")
                                        .font(.system(size: 15, weight: .heavy))
                                    Text("Pushes next round prompt to student phones and starts timer")
                                        .font(.system(size: 11, weight: .medium))
                                        .opacity(0.9)
                                }
                                Spacer()
                                Image(systemName: "play.circle.fill")
                                    .font(.system(size: 20))
                            }
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            .background(Color(red: 0.15, green: 0.39, blue: 0.92))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .disabled(sessionStore.isHostingBusy)
                    } else {
                        Button {
                            Task {
                                _ = await sessionStore.performClassicHostAction(roomCode: room.roomCode, action: "end")
                            }
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "trophy.fill")
                                Text("Finish Game & Show Final Podium →")
                                    .font(.system(size: 15, weight: .heavy))
                                Spacer()
                            }
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            .background(Color(red: 0.31, green: 0.27, blue: 0.90))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .disabled(sessionStore.isHostingBusy)
                    }
                }

                // Secondary manual override controls
                HStack(spacing: 8) {
                    Button {
                        Task {
                            _ = await sessionStore.performClassicHostAction(roomCode: room.roomCode, action: "end_round")
                        }
                    } label: {
                        Text("End Round")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color(red: 0.28, green: 0.33, blue: 0.41))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 9)
                            .background(Color(red: 0.93, green: 0.95, blue: 0.98))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    Button {
                        Task {
                            _ = await sessionStore.performClassicHostAction(roomCode: room.roomCode, action: "advance-round")
                        }
                    } label: {
                        Text("Next Round")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color(red: 0.28, green: 0.33, blue: 0.41))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 9)
                            .background(Color(red: 0.93, green: 0.95, blue: 0.98))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    Button {
                        Task {
                            _ = await sessionStore.performClassicHostAction(roomCode: room.roomCode, action: "end")
                        }
                    } label: {
                        Text("End Session")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color(red: 0.88, green: 0.11, blue: 0.28))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 9)
                            .background(Color(red: 1.0, green: 0.95, blue: 0.96))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                }
            }

            if showClassicQR {
                let joinLink = "https://www.mktpraxis.com/game?room=\(room.roomCode)"
                HStack(spacing: 16) {
                    if let qrImg = generateQRCode(from: joinLink) {
                        Image(uiImage: qrImg)
                            .interpolation(.none)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 105, height: 105)
                            .padding(8)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    VStack(alignment: .leading, spacing: 6) {
                        Text("CLASSIC JOIN LINK")
                            .font(.system(size: 11, weight: .heavy))
                            .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                        Text("mktpraxis.com/game?room=\(room.roomCode)")
                            .font(.system(size: 13.5, weight: .bold, design: .monospaced))
                            .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        Button {
                            UIPasteboard.general.string = joinLink
                            HapticsManager.shared.playNotification(.success)
                        } label: {
                            Label("Copy Join URL", systemImage: "doc.on.doc")
                                .font(.system(size: 12, weight: .bold))
                        }
                        .buttonStyle(.bordered)
                    }
                    Spacer()
                }
                .padding(12)
                .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }

            classroomProjectorPairingBanner(roomCode: room.roomCode, projectorPin: room.projectorPin)

            HStack(spacing: 10) {
                Button {
                    sessionStore.launchWebTool(
                        title: "Host · \(room.roomCode)",
                        relativePath: "admin_pages/games/game-host.html?room_code=\(room.roomCode)"
                    )
                } label: {
                    Label("Full Web Host", systemImage: "macwindow")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color(red: 0.15, green: 0.39, blue: 0.92))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(red: 0.93, green: 0.95, blue: 1.0))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                Button {
                    sessionStore.launchWebTool(
                        title: "Projector · \(room.roomCode)",
                        relativePath: "admin_pages/games/game-projector.html?room=\(room.roomCode)"
                    )
                } label: {
                    Label("Preview Projector", systemImage: "tv.fill")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color(red: 0.95, green: 0.94, blue: 1.0))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1)
        )
    }

    // MARK: - Stage Steppers & Plain-English Helpers
    private func teamStageIndex(for matchState: String) -> Int {
        switch matchState {
        case "waiting": return 1
        case "briefing", "rotation": return 2
        case "round": return 3
        case "assessment": return 4
        case "complete": return 5
        default: return 1
        }
    }

    private func teamStageStepper(activeStage: Int, revealStep: Int) -> some View {
        let stages: [(Int, String)] = [
            (1, "1. Lobby"),
            (2, "2. Brief"),
            (3, "3. Pitch"),
            (4, activeStage == 4 ? "4. Debrief (\(max(1, revealStep))/9)" : "4. Debrief"),
            (5, "5. Done")
        ]
        return HStack(spacing: 4) {
            ForEach(stages, id: \.0) { item in
                let isCurrent = item.0 == activeStage
                let isDone = item.0 < activeStage
                Text(item.1)
                    .font(.system(size: 10.5, weight: isCurrent ? .black : .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                    .foregroundStyle(
                        isCurrent ? .white : (isDone ? Color(red: 0.02, green: 0.59, blue: 0.41) : Color(red: 0.45, green: 0.51, blue: 0.60))
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .background(
                        isCurrent
                            ? Color(red: 0.78, green: 0.25, blue: 0.18)
                            : (isDone ? Color(red: 0.90, green: 0.98, blue: 0.94) : Color(red: 0.94, green: 0.96, blue: 0.98))
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    private func teamStageHeadline(for state: TeamPlayHostState) -> String {
        switch state.matchState {
        case "waiting":
            return "Stage 1 of 5 · Lobby Open (\(state.playerCount) Joined)"
        case "briefing":
            return "Stage 2 of 5 · Round \(max(1, state.currentRound)) Client Briefing"
        case "rotation":
            return "Stage 2 of 5 · Desk Rotation for Round \(state.currentRound)"
        case "round":
            return "Stage 3 of 5 · Round \(state.currentRound) Pitch Clock Running"
        case "assessment":
            let step = max(1, min(9, state.revealStep))
            return "Stage 4 of 5 · Client Debrief (\(revealStepLabels[step - 1]))"
        case "complete":
            return "Stage 5 of 5 · Match Complete"
        default:
            return "Live Classroom Session"
        }
    }

    private func teamProjectorDescription(for state: TeamPlayHostState) -> String {
        switch state.matchState {
        case "waiting":
            return "Showing room code \(state.roomCode), QR code, and Red vs. Blue Agency rosters as students join."
        case "briefing", "rotation":
            return "Showing \(state.caseClient) case background and the 4 desk assignments for Round \(max(1, state.currentRound))."
        case "round":
            return "Showing live countdown timer and which of the 4 desks have locked in their choice."
        case "assessment":
            let step = max(1, min(9, state.revealStep))
            return "Showing Step \(step) of 9 (\(revealStepLabels[step - 1])) — \(revealStepDescriptions[step - 1])"
        case "complete":
            return "Showing final Red vs. Blue Agency trophy and cumulative match standings."
        default:
            return "Synchronized with room \(state.roomCode)."
        }
    }

    private func teamStudentPhoneDescription(for state: TeamPlayHostState) -> String {
        switch state.matchState {
        case "waiting":
            return "Seeing their assigned agency (Red or Blue) and waiting for you to deal the 4 desks."
        case "briefing", "rotation":
            return "Reading their private desk intel packet (Analytics, Research, Environment, or Brand). Voting buttons are locked until you start the clock."
        case "round":
            return "Comparing private desk clues with teammates and locking in Option A, B, C, or D before the timer expires."
        case "assessment":
            return "Viewing round results on their phones while following your 9-step debrief on the projector."
        case "complete":
            return "Viewing final agency score and match summary."
        default:
            return "Connected to room \(state.roomCode)."
        }
    }

    private func computeDeskLockStats(_ state: TeamPlayHostState) -> (lockedDesks: Int, totalDesks: Int, fraction: CGFloat) {
        var locked = 0
        var total = 0
        for (_, desks) in state.desksByTeam {
            for d in desks {
                if !d.holders.isEmpty {
                    total += 1
                    if d.locked >= d.holders.count || d.choice != nil {
                        locked += 1
                    }
                }
            }
        }
        if total == 0 { total = 8 }
        let frac = CGFloat(locked) / CGFloat(max(1, total))
        return (locked, total, min(1.0, max(0.0, frac)))
    }

    private func computeRemainingSeconds(roundEndsAt: String?, limit: Int, now: Date) -> Int {
        guard let endsStr = roundEndsAt, !endsStr.isEmpty else {
            return limit
        }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: endsStr) ?? ISO8601DateFormatter().date(from: endsStr) {
            return max(0, Int(ceil(date.timeIntervalSince(now))))
        }
        return limit
    }

    private func formatMMSS(_ totalSeconds: Int) -> String {
        let clamped = max(0, totalSeconds)
        let mins = clamped / 60
        let secs = clamped % 60
        return String(format: "%02d:%02d", mins, secs)
    }

    private func classicStageIndex(for status: String) -> Int {
        switch status {
        case "waiting": return 1
        case "in_progress": return 2
        case "round_ended": return 3
        case "completed": return 4
        default: return 1
        }
    }

    private func classicStageStepper(activeStage: Int) -> some View {
        let stages: [(Int, String)] = [
            (1, "1. Lobby"),
            (2, "2. Live Round"),
            (3, "3. Results"),
            (4, "4. Podium")
        ]
        return HStack(spacing: 4) {
            ForEach(stages, id: \.0) { item in
                let isCurrent = item.0 == activeStage
                let isDone = item.0 < activeStage
                Text(item.1)
                    .font(.system(size: 11, weight: isCurrent ? .black : .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                    .foregroundStyle(
                        isCurrent ? .white : (isDone ? Color(red: 0.02, green: 0.59, blue: 0.41) : Color(red: 0.45, green: 0.51, blue: 0.60))
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .background(
                        isCurrent
                            ? Color(red: 0.31, green: 0.27, blue: 0.90)
                            : (isDone ? Color(red: 0.90, green: 0.98, blue: 0.94) : Color(red: 0.94, green: 0.96, blue: 0.98))
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    private func classicStageHeadline(for room: ActiveClassicHostRoom) -> String {
        switch room.status {
        case "waiting":
            return "Stage 1 of 4 · Lobby Open (\(room.playerCount) Joined)"
        case "in_progress":
            return "Stage 2 of 4 · Round \(room.currentRound) of \(room.totalRounds) Live"
        case "round_ended":
            return "Stage 3 of 4 · Round \(room.currentRound) Results & Debrief"
        case "completed":
            return "Stage 4 of 4 · Final Leaderboard Podium"
        default:
            return "Classic Mini-Game Session"
        }
    }

    private func classicProjectorDescription(for room: ActiveClassicHostRoom) -> String {
        switch room.status {
        case "waiting":
            return "Displaying room code \(room.roomCode), QR code, and live player counter."
        case "in_progress":
            return "Displaying Round \(room.currentRound) prompt, live countdown, and submission counter."
        case "round_ended":
            return "Displaying Round \(room.currentRound) answer distribution chart and updated top leaderboard."
        case "completed":
            return "Displaying final podium winners and overall session statistics."
        default:
            return "Synchronized with room \(room.roomCode)."
        }
    }

    private func classicStudentDescription(for room: ActiveClassicHostRoom) -> String {
        switch room.status {
        case "waiting":
            return "Joined room \(room.roomCode) and waiting for you to start Round 1."
        case "in_progress":
            return "Actively submitting their Round \(room.currentRound) response on their phones."
        case "round_ended":
            return "Seeing their personal Round \(room.currentRound) score, accuracy feedback, and rank."
        case "completed":
            return "Viewing their final score and class rank."
        default:
            return "Connected to room \(room.roomCode)."
        }
    }

    // MARK: - Classroom Podium PC Projector Pairing Banner
    private func classroomProjectorPairingBanner(roomCode: String, projectorPin: String) -> some View {
        let pinDisplay = projectorPin.isEmpty ? "—" : projectorPin
        let magicLink = projectorPin.isEmpty
            ? "https://www.mktpraxis.com/projector?room=\(roomCode)"
            : "https://www.mktpraxis.com/projector?room=\(roomCode)#pin=\(projectorPin)"

        return VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "tv.and.mediabox.fill")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Color(red: 1.0, green: 0.82, blue: 0.40))
                Text("CLASSROOM PODIUM PROJECTOR (NO LOGIN NEEDED)")
                    .font(.system(size: 10.5, weight: .black))
                    .foregroundStyle(Color(red: 1.0, green: 0.82, blue: 0.40))
                Spacer()
                Button {
                    UIPasteboard.general.string = magicLink
                    HapticsManager.shared.playNotification(.success)
                } label: {
                    Label("Copy Link", systemImage: "doc.on.doc.fill")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        .padding(.horizontal, 9)
                        .padding(.vertical, 4)
                        .background(Color(red: 1.0, green: 0.82, blue: 0.40))
                        .clipShape(Capsule())
                }
            }

            Text("On the classroom podium PC, open **mktpraxis.com/projector** and enter:")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color(red: 0.89, green: 0.91, blue: 0.96))

            HStack(spacing: 12) {
                HStack(spacing: 6) {
                    Text("ROOM:")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(red: 0.67, green: 0.71, blue: 0.80))
                    Text(roomCode)
                        .font(.system(size: 15, weight: .black, design: .monospaced))
                        .foregroundStyle(.white)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color(red: 0.02, green: 0.04, blue: 0.09))
                .clipShape(RoundedRectangle(cornerRadius: 8))

                HStack(spacing: 6) {
                    Text("PIN:")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(red: 0.67, green: 0.71, blue: 0.80))
                    Text(pinDisplay)
                        .font(.system(size: 15, weight: .black, design: .monospaced))
                        .foregroundStyle(Color(red: 1.0, green: 0.82, blue: 0.40))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color(red: 0.02, green: 0.04, blue: 0.09))
                .clipShape(RoundedRectangle(cornerRadius: 8))

                Spacer()
            }
        }
        .padding(13)
        .background(Color(red: 0.06, green: 0.10, blue: 0.18))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    // MARK: - Native CoreImage QR Generator
    private func generateQRCode(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"
        guard let outputImage = filter.outputImage else { return nil }
        let scaled = outputImage.transformed(by: CGAffineTransform(scaleX: 8, y: 8))
        guard let cgimg = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cgimg)
    }
}
