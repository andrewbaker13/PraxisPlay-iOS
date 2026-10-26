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
        "1. Choices",
        "2. Client Key",
        "3. Why: Hook",
        "4. Why: Channel",
        "5. Why: Creative",
        "6. Why: Offer",
        "7. Scores",
        "8. Lesson",
        "9. Integration"
    ]

    private let pollTimer = Timer.publish(every: 3.0, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerBanner

                    editionSwitcher

                    if !sessionStore.isAuthenticated {
                        instructorSignInPromptCard
                    } else {
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
                .padding(.horizontal, 18)
                .padding(.top, 12)
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
                    if sessionStore.isAuthenticated {
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
                            Label("Refresh", systemImage: "arrow.clockwise")
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
                    if selectedEdition == .teamEdition, let code = sessionStore.currentTeamHostState?.roomCode {
                        _ = await sessionStore.fetchTeamPlayHostState(roomCode: code)
                    } else if selectedEdition == .classicEdition, let code = sessionStore.currentClassicHostRoom?.roomCode {
                        await sessionStore.fetchClassicHostSession(roomCode: code)
                    }
                }
            }
            .sheet(isPresented: $showLoginSheet) {
                MktPraxisLoginSheetView()
            }
        }
    }

    // MARK: - Top Banner & Edition Switcher
    private var headerBanner: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(
                        LinearGradient(
                            colors: selectedEdition == .teamEdition
                                ? [Color(red: 0.78, green: 0.25, blue: 0.18), Color(red: 0.17, green: 0.38, blue: 0.76)]
                                : [Color(red: 0.31, green: 0.27, blue: 0.90), Color(red: 0.15, green: 0.39, blue: 0.92)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 54, height: 54)
                Image(systemName: selectedEdition == .teamEdition ? "person.3.sequence.fill" : "slider.horizontal.below.rectangle")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.white)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Instructor Mobile Command Deck")
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                Text("Create & pace Team Edition agency matches or Classic mini-games from your iPhone or iPad.")
                    .font(.system(size: 12.5, weight: .medium))
                    .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
            }
            Spacer()
        }
        .padding(16)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1)
        )
    }

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
                    .padding(.vertical, 12)
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

    private var instructorSignInPromptCard: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.badge.key.fill")
                .font(.system(size: 42))
                .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))

            Text("Sign In to Host Live Classroom Games")
                .font(.system(size: 19, weight: .heavy, design: .rounded))
                .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))

            Text("Instructors can log in with their MktPraxis account on an iPad or iPhone to launch new Team Edition agency pitches or Classic mini-game rooms, display projector QR codes, and pace every round while walking the classroom.")
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
        }
        .padding(24)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1)
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

    // MARK: - 1. TEAM EDITION HOST CONSOLE
    private var teamEditionHostContent: some View {
        VStack(spacing: 18) {
            // Create / Switch Team Edition Room Card
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Label("Create or Open Team Edition Match", systemImage: "plus.rectangle.on.folder.fill")
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                    Spacer()
                    Text("Red vs. Blue Agency")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(red: 0.78, green: 0.25, blue: 0.18))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(red: 0.99, green: 0.93, blue: 0.92))
                        .clipShape(Capsule())
                }

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
                        _ = await sessionStore.createTeamPlaySession(
                            accessMode: teamAccessMode,
                            guestPassword: teamGuestPassword,
                            courseId: teamSelectedCourseId == 0 ? nil : teamSelectedCourseId,
                            clockSeconds: teamClockSeconds
                        )
                    }
                } label: {
                    HStack {
                        if sessionStore.isHostingBusy {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "sparkles")
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

                // Existing / Recent Team Rooms Row
                HStack(spacing: 8) {
                    TextField("Load Room Code (e.g. KF01)", text: $manualTeamRoomCode)
                        .textInputAutocapitalization(.characters)
                        .disableAutocorrection(true)
                        .font(.system(size: 13.5, weight: .bold, design: .monospaced))
                        .padding(10)
                        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    Button("Load Room") {
                        let code = manualTeamRoomCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                        guard !code.isEmpty else { return }
                        Task {
                            _ = await sessionStore.fetchTeamPlayHostState(roomCode: code)
                        }
                    }
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color(red: 0.17, green: 0.38, blue: 0.76))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                if !sessionStore.hostedTeamRoomCodes.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(sessionStore.hostedTeamRoomCodes, id: \.self) { code in
                                let isCurrent = sessionStore.currentTeamHostState?.roomCode == code
                                Button {
                                    HapticsManager.shared.playSelection()
                                    Task {
                                        _ = await sessionStore.fetchTeamPlayHostState(roomCode: code)
                                    }
                                } label: {
                                    Text("Room \(code)")
                                        .font(.system(size: 12, weight: .heavy, design: .monospaced))
                                        .foregroundStyle(isCurrent ? .white : Color(red: 0.06, green: 0.09, blue: 0.16))
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(isCurrent ? Color(red: 0.78, green: 0.25, blue: 0.18) : Color(red: 0.93, green: 0.95, blue: 0.98))
                                        .clipShape(Capsule())
                                }
                            }
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

            // Active Team Edition Live Control Deck
            if let hostState = sessionStore.currentTeamHostState {
                teamLiveControlDeck(hostState)
            }
        }
    }

    private func teamLiveControlDeck(_ state: TeamPlayHostState) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            // Room Identity + Stage Badge + QR Toggle
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text("ROOM \(state.roomCode)")
                            .font(.system(size: 22, weight: .black, design: .monospaced))
                            .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        Text(state.matchState.uppercased())
                            .font(.system(size: 11, weight: .black))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 4)
                            .background(Color(red: 0.18, green: 0.44, blue: 0.37))
                            .clipShape(Capsule())
                    }
                    Text("\(state.caseClient) · \(state.caseTitle) • \(state.playerCount) players • Round \(state.currentRound)/\(state.roundsTotal)")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                }

                Spacer()

                Button {
                    HapticsManager.shared.playTap()
                    withAnimation { showTeamQR.toggle() }
                } label: {
                    Label(showTeamQR ? "Hide QR" : "Show QR", systemImage: "qrcode")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color(red: 0.17, green: 0.38, blue: 0.76))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(Color(red: 0.93, green: 0.95, blue: 1.0))
                        .clipShape(Capsule())
                }
            }

            if showTeamQR {
                let joinLink = "https://www.mktpraxis.com/play?room=\(state.roomCode)"
                HStack(spacing: 16) {
                    if let qrImg = generateQRCode(from: joinLink) {
                        Image(uiImage: qrImg)
                            .interpolation(.none)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 110, height: 110)
                            .padding(8)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Student Join Link")
                            .font(.system(size: 12, weight: .heavy))
                            .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                        Text("mktpraxis.com/play?room=\(state.roomCode)")
                            .font(.system(size: 14, weight: .bold, design: .monospaced))
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

            classroomProjectorPairingBanner(roomCode: state.roomCode, projectorPin: state.projectorPin)

            // Stage-Specific Primary Action Controls
            VStack(alignment: .leading, spacing: 10) {
                Text("WALK-AROUND REMOTE CONTROLS")
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))

                if state.matchState == "waiting" {
                    HStack(spacing: 12) {
                        Picker("Case", selection: $teamSelectedCaseId) {
                            ForEach(sessionStore.teamPlayCases) { c in
                                Text("\(c.client) · \(c.title) (Rung \(c.rung))").tag(c.caseId)
                            }
                        }
                        .pickerStyle(.menu)

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
                        Label(
                            state.playerCount >= 2
                                ? "Deal 4 Desks & Start Match (\(state.playerCount) Players)"
                                : "Waiting for at least 2 Players (\(state.playerCount)/2 Joined)",
                            systemImage: "play.fill"
                        )
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(state.playerCount >= 2 ? Color(red: 0.18, green: 0.44, blue: 0.37) : Color.gray)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
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
                        Label("Start Round \(state.currentRound) Clock (\(state.roundTimeLimit)s)", systemImage: "timer")
                            .font(.system(size: 15, weight: .heavy))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color(red: 0.18, green: 0.44, blue: 0.37))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

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
                            Label("+30s Clock", systemImage: "plus.circle.fill")
                                .font(.system(size: 14, weight: .heavy))
                                .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 13)
                                .background(Color(red: 0.93, green: 0.95, blue: 0.98))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        Button {
                            Task {
                                _ = await sessionStore.performTeamPlayHostAction(
                                    roomCode: state.roomCode,
                                    action: "round/end"
                                )
                            }
                        } label: {
                            Label("End Round & Score Pitch", systemImage: "flag.checkered")
                                .font(.system(size: 14, weight: .heavy))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 13)
                                .background(Color(red: 0.78, green: 0.25, blue: 0.18))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }

                } else if state.matchState == "assessment" {
                    // 9-Step Client Assessment Reveal Pacer
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 10) {
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
                                    Label("Reveal Next: \(revealStepLabels[nextStep - 1])", systemImage: "eye.fill")
                                        .font(.system(size: 14, weight: .heavy))
                                        .foregroundStyle(.white)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 13)
                                        .background(Color(red: 0.18, green: 0.44, blue: 0.37))
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                }
                            }

                            Button {
                                Task {
                                    _ = await sessionStore.performTeamPlayHostAction(
                                        roomCode: state.roomCode,
                                        action: "advance"
                                    )
                                }
                            } label: {
                                Label(
                                    state.currentRound >= state.roundsTotal ? "Finish Match →" : "Next Round →",
                                    systemImage: "forward.fill"
                                )
                                .font(.system(size: 14, weight: .heavy))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 13)
                                .background(Color(red: 0.17, green: 0.38, blue: 0.76))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(1...9, id: \.self) { step in
                                    let isDone = state.revealStep >= step
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
                                            .foregroundStyle(isDone ? .white : Color(red: 0.28, green: 0.33, blue: 0.41))
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 6)
                                            .background(isDone ? Color(red: 0.18, green: 0.44, blue: 0.37) : Color(red: 0.93, green: 0.95, blue: 0.98))
                                            .clipShape(Capsule())
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Agency Standings & 4-Desk Status Cards
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
                                VStack(alignment: .leading, spacing: 3) {
                                    HStack {
                                        Text(desk.label)
                                            .font(.system(size: 12, weight: .bold))
                                            .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                                            .lineLimit(1)
                                        Spacer()
                                        if let choice = desk.choice {
                                            Text("\(choice) \(desk.agreed == true ? "✓" : "✗")")
                                                .font(.system(size: 11.5, weight: .black, design: .monospaced))
                                                .foregroundStyle(desk.agreed == true ? Color(red: 0.02, green: 0.59, blue: 0.41) : Color(red: 0.88, green: 0.11, blue: 0.28))
                                        } else {
                                            Text("\(desk.locked)/\(desk.holders.count)")
                                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                                .foregroundStyle(desk.locked >= desk.holders.count && !desk.holders.isEmpty ? Color(red: 0.02, green: 0.59, blue: 0.41) : Color(red: 0.39, green: 0.45, blue: 0.55))
                                        }
                                    }
                                    Text(desk.holders.isEmpty ? "Unassigned" : desk.holders.joined(separator: ", "))
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                                        .lineLimit(1)
                                    if !desk.votes.isEmpty {
                                        let tally = desk.votes.sorted(by: { $0.key < $1.key }).map { "\($0.key):\($0.value)" }.joined(separator: " ")
                                        Text("Votes: \(tally)")
                                            .font(.system(size: 10.5, weight: .bold, design: .monospaced))
                                            .foregroundStyle(Color(red: 0.18, green: 0.44, blue: 0.37))
                                    }
                                }
                                .padding(9)
                                .background(Color.white)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1)
                                )
                            }
                        }
                    }
                }
                .padding(12)
                .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }

            // Confidential Instructor Key
            if !state.clientKey.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("CONFIDENTIAL CLIENT KEY (HOST ONLY)")
                        .font(.system(size: 10.5, weight: .heavy))
                        .foregroundStyle(Color(red: 0.56, green: 0.33, blue: 0.04))
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

            // Full Web Console & Projector Launch Buttons
            HStack(spacing: 10) {
                Button {
                    sessionStore.launchWebTool(
                        title: "Host · \(state.roomCode)",
                        relativePath: "admin_pages/team_play/host.html?room=\(state.roomCode)"
                    )
                } label: {
                    Label("Full Web Host Console", systemImage: "macwindow")
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundStyle(Color(red: 0.17, green: 0.38, blue: 0.76))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                        .background(Color(red: 0.93, green: 0.95, blue: 1.0))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                Button {
                    sessionStore.launchWebTool(
                        title: "Projector · \(state.roomCode)",
                        relativePath: "admin_pages/team_play/projector.html?room=\(state.roomCode)"
                    )
                } label: {
                    Label("Projector View", systemImage: "tv.fill")
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
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
                            .font(.system(size: 12.5, weight: .bold))
                            .foregroundStyle(Color(red: 0.88, green: 0.11, blue: 0.28))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 11)
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

    // MARK: - 2. CLASSIC EDITION HOST CONSOLE
    private var classicEditionHostContent: some View {
        VStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Label("Create Classic Mini-Game Session", systemImage: "gamecontroller.fill")
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                    Spacer()
                    Text("9 Analytics Games")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(red: 0.93, green: 0.95, blue: 1.0))
                        .clipShape(Capsule())
                }

                if sessionStore.instructorTemplates.isEmpty {
                    Text("No game templates found on your instructor account yet, or still loading templates…")
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
                        _ = await sessionStore.createClassicGameSession(
                            templateId: tid,
                            courseId: classicSelectedCourseId == 0 ? nil : classicSelectedCourseId,
                            accessMode: classicAccessMode,
                            guestPassword: classicGuestPassword,
                            timeOverride: classicTimeOverride == 0 ? nil : classicTimeOverride,
                            scoringMultiplier: classicMultiplier
                        )
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

                // Load or switch active Classic Rooms
                HStack(spacing: 8) {
                    TextField("Load Classic Room Code", text: $manualClassicRoomCode)
                        .textInputAutocapitalization(.characters)
                        .disableAutocorrection(true)
                        .font(.system(size: 13.5, weight: .bold, design: .monospaced))
                        .padding(10)
                        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    Button("Load Room") {
                        let code = manualClassicRoomCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                        guard !code.isEmpty else { return }
                        Task {
                            await sessionStore.fetchClassicHostSession(roomCode: code)
                        }
                    }
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color(red: 0.15, green: 0.39, blue: 0.92))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                if !sessionStore.activeClassicHostRooms.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(sessionStore.activeClassicHostRooms) { r in
                                let isCurrent = sessionStore.currentClassicHostRoom?.roomCode == r.roomCode
                                Button {
                                    HapticsManager.shared.playSelection()
                                    Task {
                                        await sessionStore.fetchClassicHostSession(roomCode: r.roomCode)
                                    }
                                } label: {
                                    Text("\(r.roomCode) · \(r.templateName)")
                                        .font(.system(size: 12, weight: .heavy))
                                        .foregroundStyle(isCurrent ? .white : Color(red: 0.06, green: 0.09, blue: 0.16))
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(isCurrent ? Color(red: 0.31, green: 0.27, blue: 0.90) : Color(red: 0.93, green: 0.95, blue: 0.98))
                                        .clipShape(Capsule())
                                }
                            }
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

            if let room = sessionStore.currentClassicHostRoom {
                classicLiveControlDeck(room)
            }
        }
    }

    private func classicLiveControlDeck(_ room: ActiveClassicHostRoom) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text("ROOM \(room.roomCode)")
                            .font(.system(size: 22, weight: .black, design: .monospaced))
                            .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        Text(room.status.uppercased())
                            .font(.system(size: 11, weight: .black))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 4)
                            .background(Color(red: 0.31, green: 0.27, blue: 0.90))
                            .clipShape(Capsule())
                    }
                    Text("\(room.templateName) • Round \(room.currentRound)/\(room.totalRounds) • \(room.playerCount) players")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                }

                Spacer()

                Button {
                    HapticsManager.shared.playTap()
                    withAnimation { showClassicQR.toggle() }
                } label: {
                    Label(showClassicQR ? "Hide QR" : "Show QR", systemImage: "qrcode")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(Color(red: 0.93, green: 0.95, blue: 1.0))
                        .clipShape(Capsule())
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
                            .frame(width: 110, height: 110)
                            .padding(8)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Classic Join Link")
                            .font(.system(size: 12, weight: .heavy))
                            .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                        Text("mktpraxis.com/game?room=\(room.roomCode)")
                            .font(.system(size: 14, weight: .bold, design: .monospaced))
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

            // Walk-Around Remote Buttons for Classic Edition
            LazyVGrid(
                columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
                spacing: 10
            ) {
                Button {
                    Task {
                        _ = await sessionStore.performClassicHostAction(roomCode: room.roomCode, action: "start")
                    }
                } label: {
                    Label("Start Game", systemImage: "play.fill")
                        .font(.system(size: 13.5, weight: .heavy))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(Color(red: 0.02, green: 0.59, blue: 0.41))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Button {
                    Task {
                        _ = await sessionStore.performClassicHostAction(roomCode: room.roomCode, action: "end_round")
                    }
                } label: {
                    Label("End Round", systemImage: "stop.circle.fill")
                        .font(.system(size: 13.5, weight: .heavy))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(Color(red: 0.85, green: 0.47, blue: 0.02))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Button {
                    Task {
                        _ = await sessionStore.performClassicHostAction(roomCode: room.roomCode, action: "advance-round")
                    }
                } label: {
                    Label("Next Round", systemImage: "forward.end.fill")
                        .font(.system(size: 13.5, weight: .heavy))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(Color(red: 0.15, green: 0.39, blue: 0.92))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Button {
                    Task {
                        _ = await sessionStore.performClassicHostAction(roomCode: room.roomCode, action: "end")
                    }
                } label: {
                    Label("End Session", systemImage: "xmark.octagon.fill")
                        .font(.system(size: 13.5, weight: .heavy))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(Color(red: 0.88, green: 0.11, blue: 0.28))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }

            HStack(spacing: 10) {
                Button {
                    sessionStore.launchWebTool(
                        title: "Host · \(room.roomCode)",
                        relativePath: "admin_pages/games/game-host.html?room_code=\(room.roomCode)"
                    )
                } label: {
                    Label("Full Web Host Console", systemImage: "macwindow")
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundStyle(Color(red: 0.15, green: 0.39, blue: 0.92))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                        .background(Color(red: 0.93, green: 0.95, blue: 1.0))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                Button {
                    sessionStore.launchWebTool(
                        title: "Projector · \(room.roomCode)",
                        relativePath: "admin_pages/games/game-projector.html?room=\(room.roomCode)"
                    )
                } label: {
                    Label("Projector View", systemImage: "tv.fill")
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
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
                    .font(.system(size: 11, weight: .black))
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
                .font(.system(size: 12.5, weight: .medium))
                .foregroundStyle(Color(red: 0.89, green: 0.91, blue: 0.96))

            HStack(spacing: 12) {
                HStack(spacing: 6) {
                    Text("ROOM:")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(red: 0.67, green: 0.71, blue: 0.80))
                    Text(roomCode)
                        .font(.system(size: 16, weight: .black, design: .monospaced))
                        .foregroundStyle(.white)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(Color(red: 0.02, green: 0.04, blue: 0.09))
                .clipShape(RoundedRectangle(cornerRadius: 8))

                HStack(spacing: 6) {
                    Text("PIN:")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(red: 0.67, green: 0.71, blue: 0.80))
                    Text(pinDisplay)
                        .font(.system(size: 16, weight: .black, design: .monospaced))
                        .foregroundStyle(Color(red: 1.0, green: 0.82, blue: 0.40))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(Color(red: 0.02, green: 0.04, blue: 0.09))
                .clipShape(RoundedRectangle(cornerRadius: 8))

                Spacer()
            }
        }
        .padding(14)
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
