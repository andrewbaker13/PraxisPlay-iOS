import SwiftUI

struct JoinSessionView: View {
    @ObservedObject var sessionStore = PraxisSessionStore.shared
    let onSwitchToArcadeTab: () -> Void

    @State private var roomCodeInput: String = ""
    @State private var playerNameInput: String = ""
    @State private var guestPinInput: String = ""
    @State private var showGuestPinField: Bool = false
    @State private var showQRScanner: Bool = false
    @State private var showLoginSheet: Bool = false
    @FocusState private var focusedField: Field?

    enum Field {
        case roomCode
        case playerName
        case guestPin
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    // MARK: - Hero Banner
                    heroHeader

                    // MARK: - Main Join Card (with MktPraxis Account Sign-In Bar)
                    joinFormCard

                    // MARK: - Live Active Sessions on Your MktPraxis Account
                    if sessionStore.isAuthenticated && !sessionStore.activeServerSessions.isEmpty {
                        activeAccountSessionsSection
                    }

                    // MARK: - Recent Classroom Sessions (1-Tap Rejoin)
                    if !sessionStore.recentSessions.isEmpty {
                        recentSessionsSection
                    }

                    // MARK: - Quick Solo Practice Callout
                    soloArcadeCalloutCard
                }
                .padding(.horizontal, 18)
                .padding(.top, 12)
                .padding(.bottom, 36)
                .frame(maxWidth: 640)
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
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    HStack(spacing: 6) {
                        Image(systemName: "gamecontroller.fill")
                            .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                        Text("Praxis Play")
                            .font(.headline.weight(.heavy))
                            .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: 8) {
                        Button {
                            HapticsManager.shared.playTap()
                            showLoginSheet = true
                        } label: {
                            HStack(spacing: 5) {
                                Image(systemName: sessionStore.isAuthenticated ? "person.crop.circle.badge.checkmark" : "person.crop.circle")
                                Text(sessionStore.isAuthenticated ? "@\(sessionStore.loggedInUsername)" : "Sign In")
                            }
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(sessionStore.isAuthenticated ? Color(red: 0.02, green: 0.47, blue: 0.34) : Color(red: 0.26, green: 0.22, blue: 0.79))
                            .padding(.horizontal, 11)
                            .padding(.vertical, 6)
                            .background(sessionStore.isAuthenticated ? Color(red: 0.82, green: 0.98, blue: 0.90) : Color(red: 0.88, green: 0.91, blue: 1.0))
                            .clipShape(Capsule())
                        }

                        Button {
                            HapticsManager.shared.playTap()
                            showQRScanner = true
                        } label: {
                            Label("Scan QR", systemImage: "qrcode.viewfinder")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color(red: 0.31, green: 0.27, blue: 0.90))
                                .clipShape(Capsule())
                        }
                    }
                }
            }
            .onAppear {
                if playerNameInput.isEmpty && !sessionStore.studentDisplayName.isEmpty {
                    playerNameInput = sessionStore.studentDisplayName
                }
                if sessionStore.isAuthenticated {
                    Task {
                        await sessionStore.fetchMyActiveSessions()
                    }
                }
            }
            .sheet(isPresented: $showLoginSheet) {
                MktPraxisLoginSheetView()
            }
            .sheet(isPresented: $showQRScanner) {
                QRScannerSheetView { scannedCode in
                    roomCodeInput = scannedCode
                    if (sessionStore.isAuthenticated && !sessionStore.useGuestMode)
                        || !playerNameInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        Task {
                            await sessionStore.joinRoom(
                                roomCode: scannedCode,
                                displayName: playerNameInput,
                                guestPin: guestPinInput
                            )
                        }
                    } else {
                        focusedField = .playerName
                    }
                }
            }
        }
    }

    // MARK: - Hero Header
    private var heroHeader: some View {
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "bolt.horizontal.fill")
                    .font(.caption.bold())
                    .foregroundStyle(Color(red: 0.26, green: 0.22, blue: 0.79))
                Text("MKTPRAXIS LIVE CLASSROOM CONTROLLER")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(1.1)
                    .foregroundStyle(Color(red: 0.26, green: 0.22, blue: 0.79))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 5)
            .background(Color(red: 0.88, green: 0.91, blue: 1.0))
            .clipShape(Capsule())

            Text("Make Analytics Competitive")
                .font(.system(size: 26, weight: .black, design: .rounded))
                .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                .multilineTextAlignment(.center)

            Text("Scan your instructor's projector QR code or enter the 4-character room code to jump in.")
                .font(.subheadline)
                .foregroundStyle(Color(red: 0.28, green: 0.33, blue: 0.41))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)
        }
        .padding(.top, 6)
    }

    // MARK: - Join Form Card
    private var joinFormCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            // MktPraxis Account vs Guest Identity Banner
            accountIdentityBanner

            // Room Code Input + QR Camera Button
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("ROOM CODE")
                        .font(.system(size: 12, weight: .heavy))
                        .tracking(0.8)
                        .foregroundStyle(Color(red: 0.28, green: 0.33, blue: 0.41))
                    Spacer()
                    Button {
                        HapticsManager.shared.playTap()
                        showQRScanner = true
                    } label: {
                        HStack(spacing: 5) {
                            Image(systemName: "camera.viewfinder")
                            Text("Scan Projector QR")
                        }
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                    }
                }

                HStack(spacing: 10) {
                    TextField("AB12", text: $roomCodeInput)
                        .focused($focusedField, equals: .roomCode)
                        .textInputAutocapitalization(.characters)
                        .disableAutocorrection(true)
                        .font(.system(size: 28, weight: .black, design: .monospaced))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        .padding(.vertical, 14)
                        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .strokeBorder(
                                    focusedField == .roomCode ? Color(red: 0.31, green: 0.27, blue: 0.90) : Color(red: 0.80, green: 0.84, blue: 0.88),
                                    lineWidth: 2
                                )
                        )
                        .onChange(of: roomCodeInput) { newVal in
                            let filtered = String(newVal.uppercased().filter { $0.isLetter || $0.isNumber }.prefix(8))
                            if filtered != newVal {
                                roomCodeInput = filtered
                            }
                            HapticsManager.shared.playSelection()
                        }

                    Button {
                        HapticsManager.shared.playTap()
                        showQRScanner = true
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: "qrcode.viewfinder")
                                .font(.system(size: 24, weight: .bold))
                            Text("QR")
                                .font(.system(size: 11, weight: .heavy))
                        }
                        .foregroundStyle(.white)
                        .frame(width: 64, height: 64)
                        .background(
                            LinearGradient(
                                colors: [Color(red: 0.31, green: 0.27, blue: 0.90), Color(red: 0.15, green: 0.39, blue: 0.92)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }
            }

            // Player Display Name (Required in Guest Mode; hidden when joining as MktPraxis Account)
            if !sessionStore.isAuthenticated || sessionStore.useGuestMode {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("YOUR DISPLAY NAME (GUEST)")
                            .font(.system(size: 12, weight: .heavy))
                            .tracking(0.8)
                            .foregroundStyle(Color(red: 0.28, green: 0.33, blue: 0.41))
                        Spacer()
                        if !roomCodeInput.isEmpty {
                            Text("ID Tag: #\(sessionStore.guestTag(for: roomCodeInput))")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundStyle(Color(red: 0.02, green: 0.59, blue: 0.41))
                        }
                    }

                    HStack(spacing: 10) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                        TextField("e.g. Alex, Jordan", text: $playerNameInput)
                            .focused($focusedField, equals: .playerName)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                            .submitLabel(.go)
                            .onSubmit {
                                submitJoin()
                            }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 14)
                    .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .strokeBorder(
                                focusedField == .playerName ? Color(red: 0.31, green: 0.27, blue: 0.90) : Color(red: 0.80, green: 0.84, blue: 0.88),
                                lineWidth: 1.5
                            )
                    )
                }
            }

            // Optional Room Guest PIN Disclosure
            DisclosureGroup(isExpanded: $showGuestPinField) {
                TextField("Optional Guest Room PIN", text: $guestPinInput)
                    .focused($focusedField, equals: .guestPin)
                    .textInputAutocapitalization(.never)
                    .disableAutocorrection(true)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                    .padding(12)
                    .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .strokeBorder(Color(red: 0.80, green: 0.84, blue: 0.88), lineWidth: 1)
                    )
                    .padding(.top, 8)
            } label: {
                Text("Have an instructor Guest Room PIN? (Optional)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
            }
            .tint(Color(red: 0.31, green: 0.27, blue: 0.90))

            // Error / Warning Banner
            if let errorMsg = sessionStore.joinErrorMessage {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                    Text(errorMsg)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color(red: 0.60, green: 0.11, blue: 0.11))
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(red: 1.0, green: 0.95, blue: 0.95))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(Color.red.opacity(0.45), lineWidth: 1)
                )
            }

            // Primary Join Action Button
            Button {
                submitJoin()
            } label: {
                HStack(spacing: 10) {
                    if sessionStore.isJoining {
                        ProgressView()
                            .tint(.white)
                        Text(sessionStore.joinStatusText.isEmpty ? "Joining Room…" : sessionStore.joinStatusText)
                            .font(.system(size: 16, weight: .bold))
                    } else {
                        Image(systemName: "play.fill")
                            .font(.system(size: 16, weight: .black))
                        Text("Join Live Game")
                            .font(.system(size: 18, weight: .black))
                    }
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    LinearGradient(
                        colors: [Color(red: 0.31, green: 0.27, blue: 0.90), Color(red: 0.15, green: 0.39, blue: 0.92)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: Color(red: 0.31, green: 0.27, blue: 0.90).opacity(0.32), radius: 10, x: 0, y: 5)
            }
            .disabled(sessionStore.isJoining)
        }
        .padding(20)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1.5)
        )
        .shadow(color: Color.black.opacity(0.05), radius: 12, x: 0, y: 6)
    }

    // MARK: - MktPraxis Account vs Guest Identity Banner
    private var accountIdentityBanner: some View {
        Group {
            if sessionStore.isAuthenticated {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 10) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(Color(red: 0.02, green: 0.59, blue: 0.41))

                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text("Signed in as \(sessionStore.accountDisplayLabel)")
                                    .font(.system(size: 13.5, weight: .heavy))
                                    .foregroundStyle(Color(red: 0.02, green: 0.37, blue: 0.27))
                                if sessionStore.isStaffUser {
                                    Text("INSTRUCTOR")
                                        .font(.system(size: 9, weight: .heavy))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color(red: 0.88, green: 0.91, blue: 1.0))
                                        .foregroundStyle(Color(red: 0.26, green: 0.22, blue: 0.79))
                                        .clipShape(Capsule())
                                }
                            }
                            if let firstCourse = sessionStore.enrolledCourses.first {
                                Text(firstCourse)
                                    .font(.system(size: 11.5, weight: .medium))
                                    .foregroundStyle(Color(red: 0.02, green: 0.47, blue: 0.34))
                                    .lineLimit(1)
                            } else {
                                Text("Scores sync directly to your MktPraxis account")
                                    .font(.system(size: 11.5, weight: .medium))
                                    .foregroundStyle(Color(red: 0.02, green: 0.47, blue: 0.34))
                            }
                        }

                        Spacer()

                        Button {
                            HapticsManager.shared.playSelection()
                            sessionStore.useGuestMode.toggle()
                        } label: {
                            Text(sessionStore.useGuestMode ? "Use Account" : "Guest Mode")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(Color(red: 0.02, green: 0.47, blue: 0.34))
                                .padding(.horizontal, 9)
                                .padding(.vertical, 5)
                                .background(Color.white)
                                .clipShape(Capsule())
                                .overlay(
                                    Capsule()
                                        .strokeBorder(Color(red: 0.43, green: 0.91, blue: 0.72), lineWidth: 1)
                                )
                        }
                    }
                }
                .padding(12)
                .background(Color(red: 0.93, green: 0.99, blue: 0.96))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(Color(red: 0.43, green: 0.91, blue: 0.72), lineWidth: 1)
                )
            } else {
                HStack(spacing: 10) {
                    Image(systemName: "person.badge.key.fill")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Have a MktPraxis Account?")
                            .font(.system(size: 13, weight: .heavy))
                            .foregroundStyle(Color(red: 0.12, green: 0.11, blue: 0.29))
                        Text("Sign in for course credit, or enter a guest name below")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color(red: 0.26, green: 0.22, blue: 0.79))
                    }

                    Spacer()

                    Button {
                        HapticsManager.shared.playTap()
                        showLoginSheet = true
                    } label: {
                        Text("Sign In →")
                            .font(.system(size: 12, weight: .heavy))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(
                                LinearGradient(
                                    colors: [Color(red: 0.31, green: 0.27, blue: 0.90), Color(red: 0.15, green: 0.39, blue: 0.92)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .clipShape(Capsule())
                    }
                }
                .padding(12)
                .background(Color(red: 0.93, green: 0.95, blue: 1.0))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(Color(red: 0.78, green: 0.82, blue: 0.99), lineWidth: 1)
                )
            }
        }
    }

    // MARK: - Live Active Sessions on Your Account
    private var activeAccountSessionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Active Live Games on Your Account", systemImage: "dot.radiowaves.left.and.right")
                    .font(.system(size: 14, weight: .heavy))
                    .foregroundStyle(Color(red: 0.02, green: 0.47, blue: 0.34))
                Spacer()
                Text("Live Now")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Color(red: 0.02, green: 0.59, blue: 0.41))
            }

            ForEach(sessionStore.activeServerSessions) { active in
                Button {
                    Task {
                        await sessionStore.joinRoom(
                            roomCode: active.roomCode,
                            displayName: playerNameInput,
                            guestPin: guestPinInput
                        )
                    }
                } label: {
                    HStack(spacing: 14) {
                        Text(active.roomCode)
                            .font(.system(size: 16, weight: .black, design: .monospaced))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color(red: 0.02, green: 0.59, blue: 0.41))
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        VStack(alignment: .leading, spacing: 3) {
                            Text(active.courseName)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(Color(red: 0.02, green: 0.37, blue: 0.27))
                                .lineLimit(1)
                            Text("Round \(active.currentRound)/\(active.totalRounds) • \(active.score) pts • \(active.instructorName)")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color(red: 0.02, green: 0.47, blue: 0.34))
                                .lineLimit(1)
                        }

                        Spacer()

                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(Color(red: 0.02, green: 0.59, blue: 0.41))
                    }
                    .padding(14)
                    .background(Color(red: 0.93, green: 0.99, blue: 0.96))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(Color(red: 0.43, green: 0.91, blue: 0.72), lineWidth: 1)
                    )
                }
            }
        }
    }

    // MARK: - Recent Classroom Sessions (1-Tap Rejoin)
    private var recentSessionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Recent Classroom Rooms", systemImage: "clock.arrow.circlepath")
                    .font(.system(size: 14, weight: .heavy))
                    .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                Spacer()
                Text("1-Tap Rejoin")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
            }

            ForEach(sessionStore.recentSessions.prefix(4)) { session in
                Button {
                    sessionStore.resumeSession(session)
                } label: {
                    HStack(spacing: 14) {
                        Text(session.roomCode)
                            .font(.system(size: 16, weight: .black, design: .monospaced))
                            .foregroundStyle(Color(red: 0.26, green: 0.22, blue: 0.79))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color(red: 0.88, green: 0.91, blue: 1.0))
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        VStack(alignment: .leading, spacing: 3) {
                            HStack(spacing: 6) {
                                Text(session.courseName)
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                                    .lineLimit(1)
                                if session.isTeamPlay {
                                    Text("TEAM")
                                        .font(.system(size: 9.5, weight: .heavy))
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color(red: 0.78, green: 0.25, blue: 0.18))
                                        .clipShape(Capsule())
                                }
                            }
                            Text(session.isTeamPlay
                                 ? "Joined as \(session.playerName) • \(session.teamName.isEmpty ? "Agency" : session.teamName) • \(session.lastScore) pts"
                                 : "Joined as \(session.playerName) • \(session.lastScore) pts")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))
                                .lineLimit(1)
                        }

                        Spacer()

                        Image(systemName: "arrow.right.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                    }
                    .padding(14)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1)
                    )
                }
            }
        }
    }

    // MARK: - Solo Practice Callout
    private var soloArcadeCalloutCard: some View {
        Button {
            HapticsManager.shared.playTap()
            onSwitchToArcadeTab()
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14)
                        .fill(
                            LinearGradient(
                                colors: [.purple, .indigo],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 52, height: 52)
                    Image(systemName: "sparkles")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(.white)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Not in a live class right now?")
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(Color(red: 0.30, green: 0.11, blue: 0.58))
                    Text("Try Team Edition: Brief Relay & all 9 analytics mini-games in the Solo Practice Arcade →")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color(red: 0.43, green: 0.16, blue: 0.85))
                        .multilineTextAlignment(.leading)
                }

                Spacer()
            }
            .padding(16)
            .background(Color(red: 0.96, green: 0.95, blue: 1.0))
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .strokeBorder(Color(red: 0.87, green: 0.84, blue: 1.0), lineWidth: 1.5)
            )
        }
    }

    private func submitJoin() {
        focusedField = nil
        Task {
            await sessionStore.joinRoom(
                roomCode: roomCodeInput,
                displayName: playerNameInput,
                guestPin: guestPinInput
            )
        }
    }
}
