import SwiftUI

struct JoinSessionView: View {
    @ObservedObject var sessionStore = PraxisSessionStore.shared
    let onSwitchToArcadeTab: () -> Void

    @State private var roomCodeInput: String = ""
    @State private var playerNameInput: String = ""
    @State private var guestPinInput: String = ""
    @State private var showGuestPinField: Bool = false
    @State private var showQRScanner: Bool = false
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

                    // MARK: - Main Join Card
                    joinFormCard

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
                        Color(red: 0.06, green: 0.09, blue: 0.16),
                        Color(red: 0.10, green: 0.15, blue: 0.26)
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
                            .foregroundStyle(.blue)
                        Text("Praxis Play")
                            .font(.headline.weight(.heavy))
                            .foregroundStyle(.white)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        HapticsManager.shared.playTap()
                        showQRScanner = true
                    } label: {
                        Label("Scan QR", systemImage: "qrcode.viewfinder")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.blue.opacity(0.85))
                            .clipShape(Capsule())
                    }
                }
            }
            .onAppear {
                if playerNameInput.isEmpty && !sessionStore.studentDisplayName.isEmpty {
                    playerNameInput = sessionStore.studentDisplayName
                }
            }
            .sheet(isPresented: $showQRScanner) {
                QRScannerSheetView { scannedCode in
                    roomCodeInput = scannedCode
                    if !playerNameInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
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
                    .foregroundStyle(.cyan)
                Text("MKTPRAXIS LIVE CLASSROOM CONTROLLER")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(1.1)
                    .foregroundStyle(.cyan)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 5)
            .background(Color.cyan.opacity(0.14))
            .clipShape(Capsule())

            Text("Make Analytics Competitive")
                .font(.system(size: 26, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text("Scan your instructor's projector QR code or enter the 4-character room code to jump in.")
                .font(.subheadline)
                .foregroundStyle(Color.white.opacity(0.70))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)
        }
        .padding(.top, 6)
    }

    // MARK: - Join Form Card
    private var joinFormCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            // Room Code Input + QR Camera Button
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("ROOM CODE")
                        .font(.system(size: 12, weight: .heavy))
                        .tracking(0.8)
                        .foregroundStyle(Color.white.opacity(0.7))
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
                        .foregroundStyle(.cyan)
                    }
                }

                HStack(spacing: 10) {
                    TextField("AB12", text: $roomCodeInput)
                        .focused($focusedField, equals: .roomCode)
                        .textInputAutocapitalization(.characters)
                        .disableAutocorrection(true)
                        .font(.system(size: 28, weight: .black, design: .monospaced))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.white)
                        .padding(.vertical, 14)
                        .background(Color.white.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .strokeBorder(
                                    focusedField == .roomCode ? Color.blue : Color.white.opacity(0.18),
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
                                colors: [Color.blue, Color(red: 0.15, green: 0.39, blue: 0.92)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }
            }

            // Player Display Name
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("YOUR DISPLAY NAME")
                        .font(.system(size: 12, weight: .heavy))
                        .tracking(0.8)
                        .foregroundStyle(Color.white.opacity(0.7))
                    Spacer()
                    if !roomCodeInput.isEmpty {
                        Text("ID Tag: #\(sessionStore.guestTag(for: roomCodeInput))")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundStyle(.mint)
                    }
                }

                HStack(spacing: 10) {
                    Image(systemName: "person.crop.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(.blue)
                    TextField("e.g. Alex, Jordan", text: $playerNameInput)
                        .focused($focusedField, equals: .playerName)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(.white)
                        .submitLabel(.go)
                        .onSubmit {
                            submitJoin()
                        }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 14)
                .background(Color.white.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(
                            focusedField == .playerName ? Color.blue : Color.white.opacity(0.16),
                            lineWidth: 1.5
                        )
                )
            }

            // Optional Room Guest PIN Disclosure
            DisclosureGroup(isExpanded: $showGuestPinField) {
                TextField("Optional Guest Room PIN", text: $guestPinInput)
                    .focused($focusedField, equals: .guestPin)
                    .textInputAutocapitalization(.never)
                    .disableAutocorrection(true)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.white)
                    .padding(12)
                    .background(Color.white.opacity(0.07))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .padding(.top, 8)
            } label: {
                Text("Have an instructor Guest Room PIN? (Optional)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.white.opacity(0.65))
            }
            .tint(.cyan)

            // Error / Warning Banner
            if let errorMsg = sessionStore.joinErrorMessage {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                    Text(errorMsg)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.red.opacity(0.22))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(Color.red.opacity(0.5), lineWidth: 1)
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
                        colors: [Color(red: 0.23, green: 0.51, blue: 0.96), Color(red: 0.15, green: 0.39, blue: 0.92)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: Color.blue.opacity(0.40), radius: 12, x: 0, y: 6)
            }
            .disabled(sessionStore.isJoining)
        }
        .padding(20)
        .background(Color.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .strokeBorder(Color.white.opacity(0.12), lineWidth: 1)
        )
    }

    // MARK: - Recent Classroom Sessions (1-Tap Rejoin)
    private var recentSessionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Recent Classroom Rooms", systemImage: "clock.arrow.circlepath")
                    .font(.system(size: 14, weight: .heavy))
                    .foregroundStyle(.white.opacity(0.85))
                Spacer()
                Text("1-Tap Rejoin")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.cyan)
            }

            ForEach(sessionStore.recentSessions.prefix(4)) { session in
                Button {
                    sessionStore.resumeSession(session)
                } label: {
                    HStack(spacing: 14) {
                        Text(session.roomCode)
                            .font(.system(size: 16, weight: .black, design: .monospaced))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color.blue.opacity(0.28))
                            .clipShape(RoundedRectangle(cornerRadius: 10))

                        VStack(alignment: .leading, spacing: 3) {
                            Text(session.courseName)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(.white)
                                .lineLimit(1)
                            Text("Joined as \(session.playerName) • \(session.lastScore) pts")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(.white.opacity(0.65))
                                .lineLimit(1)
                        }

                        Spacer()

                        Image(systemName: "arrow.right.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(.cyan)
                    }
                    .padding(14)
                    .background(Color.white.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(Color.white.opacity(0.10), lineWidth: 1)
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
                        .foregroundStyle(.white)
                    Text("Try all 9 interactive analytics games in the Solo Practice Arcade →")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.white.opacity(0.75))
                        .multilineTextAlignment(.leading)
                }

                Spacer()
            }
            .padding(16)
            .background(Color.purple.opacity(0.16))
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .strokeBorder(Color.purple.opacity(0.40), lineWidth: 1)
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
