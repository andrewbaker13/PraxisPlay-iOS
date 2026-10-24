import SwiftUI

struct ProfileSettingsView: View {
    @ObservedObject var sessionStore = PraxisSessionStore.shared
    @State private var hapticsEnabled: Bool = HapticsManager.shared.isEnabled
    @State private var isPinging: Bool = false
    @State private var showLoginSheet: Bool = false

    var body: some View {
        NavigationStack {
            Form {
                // MARK: - MktPraxis Account Section
                Section {
                    if sessionStore.isAuthenticated {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 12) {
                                ZStack {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                colors: [.blue, .cyan],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 44, height: 44)
                                    Image(systemName: sessionStore.isStaffUser ? "person.badge.shield.checkmark.fill" : "person.crop.circle.badge.checkmark")
                                        .font(.system(size: 20, weight: .bold))
                                        .foregroundStyle(.white)
                                }

                                VStack(alignment: .leading, spacing: 3) {
                                    HStack(spacing: 6) {
                                        Text(sessionStore.accountDisplayLabel)
                                            .font(.headline.weight(.heavy))
                                        if sessionStore.isStaffUser {
                                            Text("INSTRUCTOR")
                                                .font(.system(size: 9, weight: .heavy))
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background(Color.blue.opacity(0.2))
                                                .foregroundStyle(.blue)
                                                .clipShape(Capsule())
                                        }
                                    }
                                    if !sessionStore.loggedInEmail.isEmpty {
                                        Text(sessionStore.loggedInEmail)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }

                            if !sessionStore.enrolledCourses.isEmpty {
                                Divider()
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("ENROLLED COURSES")
                                        .font(.system(size: 10, weight: .heavy))
                                        .foregroundStyle(.secondary)
                                    ForEach(sessionStore.enrolledCourses, id: \.self) { course in
                                        Label(course, systemImage: "graduationcap.fill")
                                            .font(.caption.weight(.semibold))
                                            .foregroundStyle(.primary)
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 4)

                        Toggle(isOn: Binding(
                            get: { !sessionStore.useGuestMode },
                            set: { sessionStore.useGuestMode = !$0 }
                        )) {
                            Label("Join Games as MktPraxis Account", systemImage: "checkmark.seal.fill")
                        }

                        Button(role: .destructive) {
                            Task {
                                await sessionStore.logout()
                            }
                        } label: {
                            Label("Sign Out of MktPraxis", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    } else {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Sign in with your MktPraxis username or email to record classroom game scores to your course account and join enrollment-protected rooms.")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            Button {
                                HapticsManager.shared.playTap()
                                showLoginSheet = true
                            } label: {
                                HStack {
                                    Image(systemName: "person.crop.circle.fill.badge.checkmark")
                                    Text("Sign In to MktPraxis Account")
                                        .fontWeight(.bold)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption.bold())
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                } header: {
                    Text("MktPraxis Account")
                }

                // MARK: - Guest Display Name Fallback
                Section("Guest Mode Fallback") {
                    HStack {
                        Label("Guest Display Name", systemImage: "person.fill")
                        Spacer()
                        TextField("e.g. Alex", text: $sessionStore.studentDisplayName)
                            .multilineTextAlignment(.trailing)
                    }
                }

                // MARK: - Device Hardware Preferences
                Section("Classroom Hardware") {
                    Toggle(isOn: $hapticsEnabled) {
                        Label("Taptic / Haptic Feedback", systemImage: "iphone.radiowaves.left.and.right")
                    }
                    .onChange(of: hapticsEnabled) { enabled in
                        HapticsManager.shared.isEnabled = enabled
                        if enabled {
                            HapticsManager.shared.playImpact(style: .medium)
                        }
                    }

                    Toggle(isOn: $sessionStore.keepScreenAwake) {
                        Label("Keep Screen Awake in Class", systemImage: "sun.max.fill")
                    }
                }

                // MARK: - Server Diagnostics
                Section("MktPraxis Server Diagnostics") {
                    HStack {
                        Label("Server Endpoint", systemImage: "network")
                        Spacer()
                        Text("drbaker-backend.onrender.com")
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Label("Round-Trip Latency", systemImage: "speedometer")
                        Spacer()
                        if isPinging {
                            ProgressView()
                        } else if let ms = sessionStore.backendLatencyMs {
                            Text("\(ms) ms")
                                .font(.subheadline.bold().monospaced())
                                .foregroundStyle(ms < 400 ? .green : .orange)
                        } else {
                            Text("Not tested")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Button {
                        HapticsManager.shared.playTap()
                        isPinging = true
                        Task {
                            await sessionStore.pingBackend()
                            isPinging = false
                        }
                    } label: {
                        Label("Test Live Server Connection", systemImage: "bolt.horizontal.circle.fill")
                    }
                }

                // MARK: - Session History
                Section("Session History & Data") {
                    Button(role: .destructive) {
                        HapticsManager.shared.playNotification(.warning)
                        sessionStore.clearRecentSessions()
                    } label: {
                        Label("Clear Recent Classroom Rooms (\(sessionStore.recentSessions.count))", systemImage: "trash")
                    }
                    .disabled(sessionStore.recentSessions.isEmpty)
                }

                Section("About Praxis Play") {
                    HStack {
                        Text("Platform")
                        Spacer()
                        Text("MktPraxis.com • Competitive Analytics")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    HStack {
                        Text("Bundled Game Modules")
                        Spacer()
                        Text("10 Live + 9 Solo Arcade Modes")
                            .font(.caption.bold())
                            .foregroundStyle(.blue)
                    }
                    HStack {
                        Text("Version")
                        Spacer()
                        let shortVer = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
                        let buildNum = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
                        Text("\(shortVer) (Build \(buildNum))")
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Account & Setup")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showLoginSheet) {
                MktPraxisLoginSheetView()
            }
        }
    }
}

// MARK: - Native Dark-Glass MktPraxis Sign-In & 2FA Verification Sheet
struct MktPraxisLoginSheetView: View {
    @ObservedObject var sessionStore = PraxisSessionStore.shared
    @Environment(\.dismiss) private var dismiss

    @State private var usernameInput: String = ""
    @State private var passwordInput: String = ""
    @State private var mfaCodeInput: String = ""
    @FocusState private var focusedField: LoginField?

    enum LoginField {
        case username
        case password
        case mfaCode
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    // Header Icon & Title
                    VStack(spacing: 10) {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [.blue, .cyan],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 68, height: 68)
                            Image(systemName: sessionStore.mfaPendingUserId != nil ? "envelope.badge.shield.half.filled.fill" : "person.badge.key.fill")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundStyle(.white)
                        }

                        Text(sessionStore.mfaPendingUserId != nil ? "Enter Verification Code" : "Sign In to MktPraxis")
                            .font(.system(size: 24, weight: .black, design: .rounded))
                            .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))

                        Text(sessionStore.mfaPendingUserId != nil
                             ? "We sent a 6-digit verification code to \(sessionStore.mfaEmailHint)."
                             : "Use your MktPraxis.com username or email to link classroom scores to your course account.")
                            .font(.subheadline)
                            .foregroundStyle(Color(red: 0.28, green: 0.33, blue: 0.41))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 16)
                    }
                    .padding(.top, 12)

                    if sessionStore.mfaPendingUserId != nil {
                        mfaVerificationCard
                    } else {
                        credentialsCard
                    }
                }
                .padding(20)
                .frame(maxWidth: 520)
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
                    Button("Cancel") {
                        sessionStore.cancelMFAPrompt()
                        dismiss()
                    }
                    .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                }
            }
        }
    }

    private var credentialsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("USERNAME OR EMAIL")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(0.8)
                    .foregroundStyle(Color(red: 0.28, green: 0.33, blue: 0.41))

                HStack(spacing: 10) {
                    Image(systemName: "person.fill")
                        .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                    TextField("username or you@university.edu", text: $usernameInput)
                        .focused($focusedField, equals: .username)
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)
                        .keyboardType(.emailAddress)
                        .textContentType(.username)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        .submitLabel(.next)
                        .onSubmit {
                            focusedField = .password
                        }
                }
                .padding(14)
                .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(focusedField == .username ? Color(red: 0.31, green: 0.27, blue: 0.90) : Color(red: 0.80, green: 0.84, blue: 0.88), lineWidth: 1.5)
                )
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("PASSWORD")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(0.8)
                    .foregroundStyle(Color(red: 0.28, green: 0.33, blue: 0.41))

                HStack(spacing: 10) {
                    Image(systemName: "lock.fill")
                        .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
                    SecureField("Your MktPraxis password", text: $passwordInput)
                        .focused($focusedField, equals: .password)
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)
                        .textContentType(.password)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                        .submitLabel(.go)
                        .onSubmit {
                            submitCredentials()
                        }
                }
                .padding(14)
                .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(focusedField == .password ? Color(red: 0.31, green: 0.27, blue: 0.90) : Color(red: 0.80, green: 0.84, blue: 0.88), lineWidth: 1.5)
                )
            }

            if let err = sessionStore.authErrorMessage {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                    Text(err)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color(red: 0.60, green: 0.11, blue: 0.11))
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(red: 1.0, green: 0.95, blue: 0.95))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            Button {
                submitCredentials()
            } label: {
                HStack(spacing: 10) {
                    if sessionStore.isAuthenticating {
                        ProgressView()
                            .tint(.white)
                        Text("Signing In…")
                            .font(.system(size: 17, weight: .bold))
                    } else {
                        Image(systemName: "arrow.right.circle.fill")
                            .font(.system(size: 18, weight: .bold))
                        Text("Sign In")
                            .font(.system(size: 17, weight: .black))
                    }
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(
                    LinearGradient(
                        colors: [Color(red: 0.31, green: 0.27, blue: 0.90), Color(red: 0.15, green: 0.39, blue: 0.92)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .disabled(sessionStore.isAuthenticating)
        }
        .padding(20)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1.5)
        )
    }

    private var mfaVerificationCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("6-DIGIT EMAIL VERIFICATION CODE")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(0.8)
                    .foregroundStyle(Color(red: 0.28, green: 0.33, blue: 0.41))

                TextField("123456", text: $mfaCodeInput)
                    .focused($focusedField, equals: .mfaCode)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .font(.system(size: 28, weight: .black, design: .monospaced))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Color(red: 0.06, green: 0.09, blue: 0.16))
                    .padding(14)
                    .background(Color(red: 0.97, green: 0.98, blue: 0.99))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .strokeBorder(Color(red: 0.31, green: 0.27, blue: 0.90), lineWidth: 1.5)
                    )
            }

            if let err = sessionStore.authErrorMessage {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                    Text(err)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color(red: 0.60, green: 0.11, blue: 0.11))
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(red: 1.0, green: 0.95, blue: 0.95))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            Button {
                submitMFACode()
            } label: {
                HStack(spacing: 10) {
                    if sessionStore.isAuthenticating {
                        ProgressView()
                            .tint(.white)
                        Text("Verifying…")
                            .font(.system(size: 17, weight: .bold))
                    } else {
                        Image(systemName: "checkmark.shield.fill")
                            .font(.system(size: 18, weight: .bold))
                        Text("Verify & Sign In")
                            .font(.system(size: 17, weight: .black))
                    }
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(
                    LinearGradient(
                        colors: [.green, .mint],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .disabled(sessionStore.isAuthenticating)

            HStack {
                Button("← Back to Login") {
                    sessionStore.cancelMFAPrompt()
                    mfaCodeInput = ""
                }
                .font(.caption.bold())
                .foregroundStyle(Color(red: 0.39, green: 0.45, blue: 0.55))

                Spacer()

                Button("Resend Code") {
                    Task {
                        await sessionStore.resendMFACode()
                    }
                }
                .font(.caption.bold())
                .foregroundStyle(Color(red: 0.31, green: 0.27, blue: 0.90))
            }
            .padding(.top, 4)
        }
        .padding(20)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .strokeBorder(Color(red: 0.89, green: 0.91, blue: 0.94), lineWidth: 1.5)
        )
        .onAppear {
            focusedField = .mfaCode
        }
    }

    private func submitCredentials() {
        focusedField = nil
        Task {
            let ok = await sessionStore.login(usernameOrEmail: usernameInput, password: passwordInput)
            if ok {
                dismiss()
            }
        }
    }

    private func submitMFACode() {
        focusedField = nil
        Task {
            let ok = await sessionStore.verifyMFA(code: mfaCodeInput)
            if ok {
                dismiss()
            }
        }
    }
}
