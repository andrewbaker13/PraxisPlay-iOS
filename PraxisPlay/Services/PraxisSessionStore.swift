import Foundation
import SwiftUI

@MainActor
final class PraxisSessionStore: ObservableObject {
    static let shared = PraxisSessionStore()

    // MARK: - Persistent Student Preferences
    @Published var studentDisplayName: String {
        didSet { UserDefaults.standard.set(studentDisplayName, forKey: "praxis_student_name") }
    }
    @Published var authToken: String {
        didSet { UserDefaults.standard.set(authToken, forKey: "praxis_auth_token") }
    }
    @Published var loggedInUsername: String {
        didSet { UserDefaults.standard.set(loggedInUsername, forKey: "praxis_logged_in_user") }
    }
    @Published var loggedInEmail: String {
        didSet { UserDefaults.standard.set(loggedInEmail, forKey: "praxis_logged_in_email") }
    }
    @Published var loggedInFirstName: String {
        didSet { UserDefaults.standard.set(loggedInFirstName, forKey: "praxis_logged_in_first_name") }
    }
    @Published var isStaffUser: Bool {
        didSet { UserDefaults.standard.set(isStaffUser, forKey: "praxis_is_staff_user") }
    }
    @Published var enrolledCourses: [String] {
        didSet { UserDefaults.standard.set(enrolledCourses, forKey: "praxis_enrolled_courses") }
    }
    @Published var useGuestMode: Bool {
        didSet { UserDefaults.standard.set(useGuestMode, forKey: "praxis_use_guest_mode") }
    }
    @Published var keepScreenAwake: Bool {
        didSet {
            UserDefaults.standard.set(keepScreenAwake, forKey: "praxis_keep_awake")
            UIApplication.shared.isIdleTimerDisabled = keepScreenAwake
        }
    }
    @Published var apiBaseURL: String {
        didSet { UserDefaults.standard.set(apiBaseURL, forKey: "praxis_api_base") }
    }
    @Published var wsBaseURL: String {
        didSet { UserDefaults.standard.set(wsBaseURL, forKey: "praxis_ws_base") }
    }

    // MARK: - Published State
    @Published var recentSessions: [RecentRoomSession] = []
    @Published var activeServerSessions: [ActiveServerGameSession] = []
    @Published var soloHighScores: [String: Int] = [:]
    @Published var isJoining: Bool = false
    @Published var joinStatusText: String = ""
    @Published var joinErrorMessage: String? = nil
    @Published var joinWarningMessage: String? = nil
    @Published var activeArenaLaunch: ArenaLaunchMode? = nil
    @Published var backendLatencyMs: Int? = nil

    // MARK: - MktPraxis Account Authentication State
    @Published var isAuthenticating: Bool = false
    @Published var authErrorMessage: String? = nil
    @Published var mfaPendingUserId: Int? = nil
    @Published var mfaPendingToken: String? = nil
    @Published var mfaEmailHint: String = ""
    @Published var isPendingDeletionAccount: Bool = false
    @Published var isDemoHostSandboxActive: Bool = false

    // MARK: - Instructor Host Management State (Team Edition + Classic Edition)
    @Published var instructorCourses: [InstructorCourseItem] = []
    @Published var instructorTemplates: [InstructorGameTemplateItem] = []
    @Published var activeClassicHostRooms: [ActiveClassicHostRoom] = []
    @Published var currentClassicHostRoom: ActiveClassicHostRoom? = nil
    @Published var teamPlayCases: [TeamPlayCaseItem] = [
        TeamPlayCaseItem(
            caseId: "kf-r2-001",
            client: "Kestrel & Fern",
            title: "The Loyal Doubters",
            rung: 2,
            trap: "The quote qualifies the number"
        )
    ]
    @Published var hostedTeamRoomCodes: [String] = []
    @Published var currentTeamHostState: TeamPlayHostState? = nil
    @Published var isHostingBusy: Bool = false
    @Published var hostStatusMessage: String? = nil
    @Published var hostErrorMessage: String? = nil

    var isAuthenticated: Bool {
        !authToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var accountDisplayLabel: String {
        if !loggedInFirstName.isEmpty {
            return "\(loggedInFirstName) (@\(loggedInUsername))"
        }
        if !loggedInUsername.isEmpty {
            return "@\(loggedInUsername)"
        }
        return "MktPraxis Account"
    }

    private let recentSessionsKey = "praxis_recent_sessions_v1"
    private let soloScoresKey = "praxis_solo_high_scores_v1"
    private let hostedTeamRoomsKey = "praxis_hosted_team_rooms_v1"
    private let guestTagChars = Array("ABCDEFGHJKMNPQRSTUVWXYZ23456789")

    private init() {
        self.studentDisplayName = UserDefaults.standard.string(forKey: "praxis_student_name") ?? ""
        self.authToken = UserDefaults.standard.string(forKey: "praxis_auth_token") ?? ""
        self.loggedInUsername = UserDefaults.standard.string(forKey: "praxis_logged_in_user") ?? ""
        self.loggedInEmail = UserDefaults.standard.string(forKey: "praxis_logged_in_email") ?? ""
        self.loggedInFirstName = UserDefaults.standard.string(forKey: "praxis_logged_in_first_name") ?? ""
        self.isStaffUser = UserDefaults.standard.bool(forKey: "praxis_is_staff_user")
        self.enrolledCourses = (UserDefaults.standard.array(forKey: "praxis_enrolled_courses") as? [String]) ?? []
        if UserDefaults.standard.object(forKey: "praxis_use_guest_mode") == nil {
            self.useGuestMode = true
        } else {
            self.useGuestMode = UserDefaults.standard.bool(forKey: "praxis_use_guest_mode")
        }
        if UserDefaults.standard.object(forKey: "praxis_keep_awake") == nil {
            self.keepScreenAwake = true
        } else {
            self.keepScreenAwake = UserDefaults.standard.bool(forKey: "praxis_keep_awake")
        }
        self.apiBaseURL = UserDefaults.standard.string(forKey: "praxis_api_base") ?? "https://drbaker-backend.onrender.com/api"
        self.wsBaseURL = UserDefaults.standard.string(forKey: "praxis_ws_base") ?? "https://drbaker-backend.onrender.com".replacingOccurrences(of: "https://", with: "wss://")

        loadPersistedCollections()
        UIApplication.shared.isIdleTimerDisabled = self.keepScreenAwake

        if !self.authToken.isEmpty {
            Task {
                await fetchUserProfile()
                await fetchMyActiveSessions()
                if self.isStaffUser {
                    await fetchInstructorSetupData()
                }
            }
        }
    }

    // MARK: - MktPraxis Account Sign-In & 2FA Verification
    func login(usernameOrEmail: String, password: String) async -> Bool {
        let trimmedUser = usernameOrEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedUser.isEmpty, !password.isEmpty else {
            authErrorMessage = "Please enter your MktPraxis username/email and password."
            HapticsManager.shared.playNotification(.warning)
            return false
        }

        guard let url = URL(string: "\(apiBaseURL)/auth/login/") else {
            authErrorMessage = "Invalid server URL."
            return false
        }

        isAuthenticating = true
        authErrorMessage = nil
        isPendingDeletionAccount = false
        defer { isAuthenticating = false }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 30
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "username": trimmedUser,
            "password": password,
            "remember_me": true
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, response) = try await URLSession.shared.data(for: req)
            let http = response as? HTTPURLResponse
            let json = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]) ?? [:]

            guard let statusCode = http?.statusCode, (200...299).contains(statusCode) else {
                if (json["pending_deletion"] as? Bool) == true {
                    self.isPendingDeletionAccount = true
                }
                let err = (json["error"] as? String)
                    ?? (json["detail"] as? String)
                    ?? "Invalid username/email or password."
                authErrorMessage = err
                HapticsManager.shared.playNotification(.error)
                return false
            }

            if let mfaReq = json["mfa_required"] as? Bool, mfaReq,
               let mfaUid = json["mfa_user_id"] as? Int {
                self.mfaPendingUserId = mfaUid
                self.mfaPendingToken = json["mfa_token"] as? String
                self.mfaEmailHint = (json["email_hint"] as? String) ?? "your email"
                HapticsManager.shared.playNotification(.warning)
                return false
            }

            return await completeSignIn(with: json)
        } catch {
            authErrorMessage = "Could not connect to MktPraxis (\(error.localizedDescription))."
            HapticsManager.shared.playNotification(.error)
            return false
        }
    }

    func verifyMFA(code: String) async -> Bool {
        let trimmedCode = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let userId = mfaPendingUserId, !trimmedCode.isEmpty else {
            authErrorMessage = "Please enter the 6-digit verification code from your email."
            return false
        }

        guard let url = URL(string: "\(apiBaseURL)/auth/mfa/verify/") else {
            authErrorMessage = "Invalid server URL."
            return false
        }

        isAuthenticating = true
        authErrorMessage = nil
        defer { isAuthenticating = false }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 30
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var body: [String: Any] = [
            "user_id": userId,
            "mfa_code": trimmedCode,
            "remember_me": true,
            "device_label": "Praxis Play iOS/iPadOS"
        ]
        if let mfaTok = mfaPendingToken, !mfaTok.isEmpty {
            body["mfa_token"] = mfaTok
        }
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, response) = try await URLSession.shared.data(for: req)
            let http = response as? HTTPURLResponse
            let json = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]) ?? [:]

            guard let statusCode = http?.statusCode, (200...299).contains(statusCode) else {
                let err = (json["error"] as? String)
                    ?? (json["detail"] as? String)
                    ?? "Invalid or expired verification code."
                authErrorMessage = err
                HapticsManager.shared.playNotification(.error)
                return false
            }

            mfaPendingUserId = nil
            mfaPendingToken = nil
            mfaEmailHint = ""
            return await completeSignIn(with: json)
        } catch {
            authErrorMessage = "Verification failed (\(error.localizedDescription))."
            HapticsManager.shared.playNotification(.error)
            return false
        }
    }

    func resendMFACode() async {
        guard let userId = mfaPendingUserId,
              let url = URL(string: "\(apiBaseURL)/auth/mfa/resend/") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var payload: [String: Any] = ["user_id": userId]
        if let mfaTok = mfaPendingToken, !mfaTok.isEmpty {
            payload["mfa_token"] = mfaTok
        }
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        _ = try? await URLSession.shared.data(for: req)
        HapticsManager.shared.playNotification(.success)
    }

    func cancelMFAPrompt() {
        mfaPendingUserId = nil
        mfaPendingToken = nil
        mfaEmailHint = ""
        isPendingDeletionAccount = false
        authErrorMessage = nil
    }

    func requestAccountDeletion(password: String) async -> (Bool, String?) {
        let trimmedPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedPassword.isEmpty else {
            return (false, "Please enter your password to confirm account deletion.")
        }
        guard !authToken.isEmpty,
              let url = URL(string: "\(apiBaseURL)/auth/delete-account/") else {
            return (false, "You must be signed in to request account deletion.")
        }

        isAuthenticating = true
        defer { isAuthenticating = false }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 25
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
        req.httpBody = try? JSONSerialization.data(withJSONObject: ["password": trimmedPassword])

        do {
            let (data, response) = try await URLSession.shared.data(for: req)
            let http = response as? HTTPURLResponse
            let json = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]) ?? [:]
            guard let statusCode = http?.statusCode, (200...299).contains(statusCode) else {
                let err = (json["error"] as? String)
                    ?? (json["detail"] as? String)
                    ?? "Could not delete account."
                HapticsManager.shared.playNotification(.error)
                return (false, err)
            }
            clearAuthState()
            HapticsManager.shared.playNotification(.success)
            return (true, nil)
        } catch {
            HapticsManager.shared.playNotification(.error)
            return (false, "Network error (\(error.localizedDescription)).")
        }
    }

    func cancelAccountDeletion(usernameOrEmail: String, password: String) async -> Bool {
        let trimmedUser = usernameOrEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedUser.isEmpty, !password.isEmpty,
              let url = URL(string: "\(apiBaseURL)/auth/cancel-deletion/") else {
            authErrorMessage = "Please enter your username/email and password to restore your account."
            return false
        }

        isAuthenticating = true
        authErrorMessage = nil
        defer { isAuthenticating = false }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 25
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: [
            "username": trimmedUser,
            "password": password
        ])

        do {
            let (data, response) = try await URLSession.shared.data(for: req)
            let http = response as? HTTPURLResponse
            let json = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]) ?? [:]
            guard let statusCode = http?.statusCode, (200...299).contains(statusCode) else {
                authErrorMessage = (json["error"] as? String) ?? "Could not restore account."
                HapticsManager.shared.playNotification(.error)
                return false
            }
            isPendingDeletionAccount = false
            return await login(usernameOrEmail: trimmedUser, password: password)
        } catch {
            authErrorMessage = "Network error (\(error.localizedDescription))."
            return false
        }
    }

    private func completeSignIn(with json: [String: Any]) async -> Bool {
        guard let token = json["token"] as? String, !token.isEmpty else {
            authErrorMessage = "Login succeeded but no auth token was returned."
            return false
        }

        self.authToken = token
        self.loggedInUsername = (json["username"] as? String) ?? ""
        self.loggedInFirstName = (json["first_name"] as? String) ?? ""
        self.loggedInEmail = (json["email"] as? String) ?? ""
        let isStaff = (json["is_staff"] as? Bool) ?? false
        let isSuper = (json["is_superuser"] as? Bool) ?? false
        self.isStaffUser = isStaff || isSuper
        self.useGuestMode = false

        if studentDisplayName.isEmpty {
            studentDisplayName = !loggedInFirstName.isEmpty ? loggedInFirstName : loggedInUsername
        }

        await fetchUserProfile()
        await fetchMyActiveSessions()
        if self.isStaffUser {
            await fetchInstructorSetupData()
        }
        HapticsManager.shared.playNotification(.success)
        return true
    }

    func fetchUserProfile() async {
        guard !authToken.isEmpty,
              let url = URL(string: "\(apiBaseURL)/auth/profile/") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.timeoutInterval = 20
        req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse else { return }
            if http.statusCode == 401 {
                clearAuthState()
                return
            }
            guard (200...299).contains(http.statusCode),
                  let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return }

            if let uname = json["username"] as? String, !uname.isEmpty {
                self.loggedInUsername = uname
            }
            if let fname = json["first_name"] as? String {
                self.loggedInFirstName = fname
            }
            if let email = json["email"] as? String {
                self.loggedInEmail = email
            }
            let staff = (json["is_staff"] as? Bool) ?? false
            let superuser = (json["is_superuser"] as? Bool) ?? false
            self.isStaffUser = staff || superuser

            if let coursesArr = json["courses"] as? [[String: Any]] {
                let names = coursesArr.compactMap { $0["name"] as? String }
                self.enrolledCourses = names
            } else if let singleCourse = json["course"] as? String, !singleCourse.isEmpty {
                self.enrolledCourses = [singleCourse]
            }
        } catch {}
    }

    func fetchMyActiveSessions() async {
        guard !authToken.isEmpty,
              let url = URL(string: "\(apiBaseURL)/game/my-active-sessions/") else {
            activeServerSessions = []
            return
        }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.timeoutInterval = 15
        req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode),
                  let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
                  let list = json["sessions"] as? [[String: Any]] else { return }

            self.activeServerSessions = list.compactMap { item in
                guard let code = item["room_code"] as? String else { return nil }
                return ActiveServerGameSession(
                    roomCode: code,
                    status: (item["status"] as? String) ?? "in_progress",
                    currentRound: (item["current_round"] as? Int) ?? 1,
                    totalRounds: (item["total_rounds"] as? Int) ?? 1,
                    courseName: (item["course_name"] as? String) ?? "Live Classroom Session",
                    instructorName: (item["instructor_name"] as? String) ?? "Instructor",
                    playerSessionId: (item["player_session_id"] as? Int) ?? 0,
                    score: (item["score"] as? Int) ?? 0
                )
            }
        } catch {}
    }

    func logout() async {
        if !authToken.isEmpty, let url = URL(string: "\(apiBaseURL)/auth/logout/") {
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
            _ = try? await URLSession.shared.data(for: req)
        }
        clearAuthState()
        HapticsManager.shared.playImpact(style: .medium)
    }

    private func clearAuthState() {
        authToken = ""
        loggedInUsername = ""
        loggedInEmail = ""
        loggedInFirstName = ""
        isStaffUser = false
        enrolledCourses = []
        activeServerSessions = []
        currentTeamHostState = nil
        currentClassicHostRoom = nil
        mfaPendingUserId = nil
        mfaEmailHint = ""
        useGuestMode = true
    }

    // MARK: - Stable Guest Tag (Matches game-join.html lines 301-342)
    func guestTag(for roomCode: String) -> String {
        let normalized = roomCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let key = "praxisPlayGuestTag:\(normalized)"
        if let saved = UserDefaults.standard.string(forKey: key), saved.count == 4 {
            return saved
        }
        let generated = String((0..<4).map { _ in guestTagChars.randomElement()! })
        UserDefaults.standard.set(generated, forKey: key)
        return generated
    }

    func decorateGuestName(roomCode: String, typedName: String) -> String {
        let suffix = " \(guestTag(for: roomCode))"
        let maxLen = 100 - suffix.count
        let trimmed = String(typedName.trimmingCharacters(in: .whitespacesAndNewlines).prefix(maxLen))
        return trimmed + suffix
    }

    // MARK: - Universal Join Classroom Session (Classic Edition + Team Edition Auto-Detection)
    func joinRoom(
        roomCode rawCode: String,
        displayName rawName: String,
        guestPin: String = "",
        preferTeamPlay: Bool = false
    ) async {
        let code = rawCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        let name = rawName.trimmingCharacters(in: .whitespacesAndNewlines)

        joinErrorMessage = nil
        joinWarningMessage = nil

        guard !code.isEmpty else {
            joinErrorMessage = "Please enter the room code from your instructor's screen."
            HapticsManager.shared.playNotification(.warning)
            return
        }

        let effectiveGuestMode = useGuestMode || authToken.isEmpty
        if effectiveGuestMode && name.isEmpty {
            joinErrorMessage = "Please enter your display name to join."
            HapticsManager.shared.playNotification(.warning)
            return
        }

        if !name.isEmpty {
            studentDisplayName = name
        }

        if code == "DEMO" {
            if let demoMode = SoloGameMode.allModes.first(where: { $0.id == "brief_relay" }) ?? SoloGameMode.allModes.first {
                HapticsManager.shared.playNotification(.success)
                activeArenaLaunch = .soloPractice(demoMode)
                return
            }
        }

        isJoining = true
        joinStatusText = "Connecting to room \(code)…"

        defer {
            isJoining = false
            joinStatusText = ""
        }

        if preferTeamPlay {
            let teamResult = await attemptTeamPlayJoin(code: code, name: name, guestPin: guestPin, effectiveGuestMode: effectiveGuestMode)
            if teamResult == .joined || teamResult == .failedDefinitively {
                return
            }
        }

        let decoratedName = decorateGuestName(roomCode: code, typedName: name.isEmpty ? "Player" : name)
        var payload: [String: Any] = ["room_code": code]

        if effectiveGuestMode {
            payload["guest_name"] = decoratedName
            if let existing = recentSessions.first(where: { !$0.isTeamPlay && $0.roomCode.uppercased() == code && $0.decoratedGuestName == decoratedName }) {
                payload["player_session_id"] = existing.playerSessionId
            }
            if !guestPin.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                payload["guest_password"] = guestPin.trimmingCharacters(in: .whitespacesAndNewlines)
            }
        } else if !guestPin.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            payload["guest_password"] = guestPin.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        guard let joinURL = URL(string: "\(apiBaseURL)/game/join/") else {
            joinErrorMessage = "Invalid backend API URL."
            return
        }

        let maxRetries = 4
        var lastData: Data = Data()
        var lastResponse: HTTPURLResponse? = nil

        for attempt in 0...maxRetries {
            var request = URLRequest(url: joinURL)
            request.httpMethod = "POST"
            request.timeoutInterval = 45
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if !effectiveGuestMode && !authToken.isEmpty {
                request.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
            }
            request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

            do {
                let start = Date()
                let (data, response) = try await URLSession.shared.data(for: request)
                self.backendLatencyMs = Int(Date().timeIntervalSince(start) * 1000)
                lastData = data
                lastResponse = response as? HTTPURLResponse

                guard let http = lastResponse else {
                    throw URLError(.badServerResponse)
                }

                if http.statusCode != 429 {
                    break
                }

                let jsonObj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                let detail = (jsonObj?["detail"] as? String) ?? (jsonObj?["error"] as? String) ?? ""
                let waitSeconds = parseThrottleSeconds(from: detail)

                if attempt >= maxRetries {
                    joinErrorMessage = "This room is receiving a lot of join requests at once. Wait about \(waitSeconds)s and tap Join Game again."
                    HapticsManager.shared.playNotification(.error)
                    return
                }

                for remaining in stride(from: waitSeconds, through: 1, by: -1) {
                    joinStatusText = "Room is busy — retrying in \(remaining)s…"
                    try? await Task.sleep(nanoseconds: 1_000_000_000)
                }
                joinStatusText = "Joining room \(code)…"
            } catch {
                joinErrorMessage = "Could not reach MktPraxis server (\(error.localizedDescription)). Check your connection and try again."
                HapticsManager.shared.playNotification(.error)
                return
            }
        }

        guard let http = lastResponse else {
            joinErrorMessage = "No response from game server."
            return
        }

        // If Classic /api/game/join/ returns 404, automatically check if this is a Team Edition room!
        if http.statusCode == 404 && !preferTeamPlay {
            joinStatusText = "Checking Team Edition room \(code)…"
            let teamResult = await attemptTeamPlayJoin(code: code, name: name, guestPin: guestPin, effectiveGuestMode: effectiveGuestMode)
            if teamResult == .joined || teamResult == .failedDefinitively {
                return
            }
        }

        let rootJSON = ((try? JSONSerialization.jsonObject(with: lastData)) as? [String: Any]) ?? [:]

        guard (200...299).contains(http.statusCode) else {
            let errMsg = (rootJSON["error"] as? String)
                ?? (rootJSON["detail"] as? String)
                ?? "Could not join room \(code) (HTTP \(http.statusCode))."
            joinErrorMessage = errMsg
            HapticsManager.shared.playNotification(.error)
            return
        }

        if let warning = rootJSON["warning"] as? String, !warning.isEmpty {
            joinWarningMessage = warning
        }

        let gameSessionDict = (rootJSON["game_session"] as? [String: Any]) ?? [:]
        let playerSessionDict = (rootJSON["player_session"] as? [String: Any]) ?? [:]

        let playerSessionId = (playerSessionDict["id"] as? Int)
            ?? (rootJSON["resume_player_session_id"] as? Int)
            ?? Int.random(in: 1000...9999)
        let serverDisplayName = (playerSessionDict["display_name"] as? String)
            ?? (playerSessionDict["guest_name"] as? String)
            ?? (name.isEmpty ? "Player" : name)
        let courseName = (gameSessionDict["course_name"] as? String) ?? "Praxis Play Live"
        let instructorName = (gameSessionDict["instructor_name"] as? String) ?? "Instructor"
        let gameType = (gameSessionDict["game_type"] as? String) ?? "speed_tap"
        let isGuestResp = (rootJSON["is_guest"] as? Bool) ?? effectiveGuestMode
        let waitingToEnter = (rootJSON["waiting_to_enter"] as? Bool) ?? false
        let initialScore = (playerSessionDict["score"] as? Int) ?? 0

        let rawGameJSON = stringifyJSONObject(gameSessionDict)
        let rawPlayerJSON = stringifyJSONObject(playerSessionDict)

        let session = RecentRoomSession(
            roomCode: code,
            playerName: serverDisplayName,
            decoratedGuestName: decoratedName,
            playerSessionId: playerSessionId,
            courseName: courseName,
            instructorName: instructorName,
            gameType: gameType,
            lastScore: initialScore,
            lastRank: "-",
            isGuest: isGuestResp,
            waitingToEnter: waitingToEnter,
            rawGameSessionJSON: rawGameJSON,
            rawPlayerSessionJSON: rawPlayerJSON,
            joinedAt: Date(),
            isTeamPlay: false
        )

        saveRecentSession(session)
        HapticsManager.shared.playNotification(.success)
        activeArenaLaunch = .liveSession(session)
    }

    private enum TeamJoinOutcome {
        case joined
        case notFound
        case failedDefinitively
    }

    private func attemptTeamPlayJoin(
        code: String,
        name: String,
        guestPin: String,
        effectiveGuestMode: Bool
    ) async -> TeamJoinOutcome {
        guard let url = URL(string: "\(apiBaseURL)/team-play/sessions/join/") else {
            return .notFound
        }

        let trimmedPin = guestPin.trimmingCharacters(in: .whitespacesAndNewlines)
        let rawDisplay = name.isEmpty ? (loggedInFirstName.isEmpty ? loggedInUsername : loggedInFirstName) : name
        let guestNameCapped = String((rawDisplay.isEmpty ? "Player" : rawDisplay).prefix(40))

        let body: [String: Any] = [
            "room_code": code,
            "guest_name": guestNameCapped,
            "guest_password": trimmedPin
        ]

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 30
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if !effectiveGuestMode && !authToken.isEmpty {
            req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let start = Date()
            let (data, response) = try await URLSession.shared.data(for: req)
            self.backendLatencyMs = Int(Date().timeIntervalSince(start) * 1000)
            guard let http = response as? HTTPURLResponse else { return .notFound }

            if http.statusCode == 404 {
                return .notFound
            }

            let rootJSON = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]) ?? [:]
            guard (200...299).contains(http.statusCode) else {
                let errMsg = (rootJSON["error"] as? String)
                    ?? (rootJSON["detail"] as? String)
                    ?? "Could not join Team Edition room \(code)."
                joinErrorMessage = errMsg
                HapticsManager.shared.playNotification(.error)
                return .failedDefinitively
            }

            let playerId = (rootJSON["player_id"] as? Int) ?? Int.random(in: 1000...9999)
            let playerToken = (rootJSON["player_token"] as? String) ?? ""
            let displayName = (rootJSON["display_name"] as? String) ?? guestNameCapped
            let teamDict = rootJSON["team"] as? [String: Any]
            let teamKey = (teamDict?["key"] as? String) ?? ""
            let teamName = (teamDict?["name"] as? String) ?? "Team Edition"
            let sessionDict = (rootJSON["session"] as? [String: Any]) ?? [:]
            let caseDict = sessionDict["case"] as? [String: Any]
            let caseClient = (caseDict?["client"] as? String) ?? "Team Edition"
            let caseTitle = (caseDict?["title"] as? String) ?? "Brief Relay"

            var teamScore = 0
            if let teamsArr = sessionDict["teams"] as? [[String: Any]],
               let myTeamObj = teamsArr.first(where: { ($0["key"] as? String) == teamKey }) {
                teamScore = (myTeamObj["score"] as? Int) ?? 0
            }

            var identityDict: [String: Any] = [
                "player_id": playerId,
                "player_token": playerToken,
                "display_name": displayName
            ]
            if let teamDict = teamDict {
                identityDict["team"] = teamDict
            }

            let session = RecentRoomSession(
                roomCode: code,
                playerName: displayName,
                decoratedGuestName: displayName,
                playerSessionId: playerId,
                courseName: "\(caseClient) · \(caseTitle)",
                instructorName: teamName,
                gameType: "brief_relay",
                lastScore: teamScore,
                lastRank: teamKey.isEmpty ? "TEAM" : teamKey.uppercased(),
                isGuest: effectiveGuestMode,
                waitingToEnter: false,
                rawGameSessionJSON: stringifyJSONObject(sessionDict),
                rawPlayerSessionJSON: stringifyJSONObject(identityDict),
                joinedAt: Date(),
                isTeamPlay: true,
                playerToken: playerToken,
                teamKey: teamKey,
                teamName: teamName
            )

            saveRecentSession(session)
            HapticsManager.shared.playNotification(.success)
            activeArenaLaunch = .liveSession(session)
            return .joined
        } catch {
            return .notFound
        }
    }

    // MARK: - Quick Rejoin Saved Session & Web Tools
    func resumeSession(_ session: RecentRoomSession) {
        HapticsManager.shared.playImpact(style: .medium)
        activeArenaLaunch = .liveSession(session)
    }

    func launchSoloMode(_ mode: SoloGameMode, showResults: Bool = false) {
        HapticsManager.shared.playImpact(style: .medium)
        activeArenaLaunch = .soloPractice(mode, showResults: showResults)
    }

    func launchWebTool(title: String, relativePath: String) {
        HapticsManager.shared.playImpact(style: .medium)
        activeArenaLaunch = .webTool(title: title, relativePath: relativePath)
    }

    // MARK: - Instructor Host Management API (Team Edition + Classic Edition)
    func fetchInstructorSetupData() async {
        guard !authToken.isEmpty else { return }

        // 1. Courses (GET /api/courses/)
        if let url = URL(string: "\(apiBaseURL)/courses/") {
            var req = URLRequest(url: url)
            req.timeoutInterval = 15
            req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
            if let (data, resp) = try? await URLSession.shared.data(for: req),
               let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode),
               let json = try? JSONSerialization.jsonObject(with: data) {
                let rawList: [[String: Any]]
                if let arr = json as? [[String: Any]] {
                    rawList = arr
                } else if let dict = json as? [String: Any], let res = dict["results"] as? [[String: Any]] {
                    rawList = res
                } else {
                    rawList = []
                }
                self.instructorCourses = rawList.compactMap { item in
                    guard let id = item["id"] as? Int,
                          let name = (item["name"] as? String) ?? (item["title"] as? String) else { return nil }
                    return InstructorCourseItem(id: id, name: name)
                }
            }
        }

        // 2. Classic Game Templates (GET /api/game/templates/)
        if let url = URL(string: "\(apiBaseURL)/game/templates/") {
            var req = URLRequest(url: url)
            req.timeoutInterval = 15
            req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
            if let (data, resp) = try? await URLSession.shared.data(for: req),
               let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode),
               let json = try? JSONSerialization.jsonObject(with: data) {
                let rawList: [[String: Any]]
                if let arr = json as? [[String: Any]] {
                    rawList = arr
                } else if let dict = json as? [String: Any], let res = dict["results"] as? [[String: Any]] {
                    rawList = res
                } else if let dict = json as? [String: Any], let res = dict["templates"] as? [[String: Any]] {
                    rawList = res
                } else {
                    rawList = []
                }
                self.instructorTemplates = rawList.compactMap { item in
                    guard let id = item["id"] as? Int,
                          let name = item["name"] as? String else { return nil }
                    let gType = (item["game_type"] as? String) ?? "multi_round"
                    let rounds = (item["rounds_count"] as? Int)
                        ?? (item["question_count"] as? Int)
                        ?? ((item["questions"] as? [Any])?.count ?? 1)
                    let desc = (item["description"] as? String) ?? ""
                    return InstructorGameTemplateItem(
                        id: id,
                        name: name,
                        gameType: gType,
                        roundsCount: max(1, rounds),
                        description: desc
                    )
                }
            }
        }

        // 3. Active Classic Host Sessions (GET /api/instructor/game-history/?status=waiting,in_progress)
        if let url = URL(string: "\(apiBaseURL)/instructor/game-history/?status=waiting,in_progress") {
            var req = URLRequest(url: url)
            req.timeoutInterval = 15
            req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
            if let (data, resp) = try? await URLSession.shared.data(for: req),
               let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode),
               let dict = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
               let results = dict["results"] as? [[String: Any]] {
                self.activeClassicHostRooms = results.compactMap { item in
                    guard let code = item["room_code"] as? String else { return nil }
                    return ActiveClassicHostRoom(
                        roomCode: code,
                        templateName: (item["template_name"] as? String) ?? "Classic Game",
                        status: (item["status"] as? String) ?? "waiting",
                        createdAt: (item["created_at"] as? String) ?? "",
                        currentRound: (item["current_round"] as? Int) ?? 1,
                        totalRounds: (item["total_rounds"] as? Int) ?? 1,
                        playerCount: (item["player_count"] as? Int) ?? (item["players_count"] as? Int) ?? 0,
                        gameType: (item["game_type"] as? String) ?? ""
                    )
                }
            }
        }

        // 4. Team Edition Cases (GET /api/team-play/cases/)
        if let url = URL(string: "\(apiBaseURL)/team-play/cases/") {
            var req = URLRequest(url: url)
            req.timeoutInterval = 15
            req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
            if let (data, resp) = try? await URLSession.shared.data(for: req),
               let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode),
               let dict = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
               let casesArr = dict["cases"] as? [[String: Any]], !casesArr.isEmpty {
                self.teamPlayCases = casesArr.compactMap { c in
                    guard let cid = c["case_id"] as? String else { return nil }
                    return TeamPlayCaseItem(
                        caseId: cid,
                        client: (c["client"] as? String) ?? "Client",
                        title: (c["title"] as? String) ?? cid,
                        rung: (c["rung"] as? Int) ?? 1,
                        trap: (c["trap"] as? String) ?? ""
                    )
                }
            }
        }
    }

    // MARK: - Team Edition Host Actions (/api/team-play/sessions/...)
    func createTeamPlaySession(
        accessMode: String,
        guestPassword: String,
        courseId: Int?,
        clockSeconds: Int
    ) async -> String? {
        guard !authToken.isEmpty,
              let url = URL(string: "\(apiBaseURL)/team-play/sessions/") else {
            hostErrorMessage = "Please sign in with an instructor account first."
            return nil
        }

        isHostingBusy = true
        hostErrorMessage = nil
        hostStatusMessage = "Creating Team Edition room…"
        defer {
            isHostingBusy = false
            hostStatusMessage = nil
        }

        var body: [String: Any] = [
            "access_mode": accessMode,
            "guest_password": guestPassword,
            "clock_s": clockSeconds
        ]
        if let courseId = courseId {
            body["course_id"] = courseId
        }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 25
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            let http = resp as? HTTPURLResponse
            let json = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]) ?? [:]
            guard let status = http?.statusCode, (200...299).contains(status),
                  let code = (json["room_code"] as? String)?.uppercased(), !code.isEmpty else {
                hostErrorMessage = (json["error"] as? String) ?? (json["detail"] as? String) ?? "Could not create Team Edition room."
                HapticsManager.shared.playNotification(.error)
                return nil
            }
            addHostedTeamRoom(code)
            _ = await fetchTeamPlayHostState(roomCode: code)
            HapticsManager.shared.playNotification(.success)
            return code
        } catch {
            hostErrorMessage = "Network error creating room (\(error.localizedDescription))."
            HapticsManager.shared.playNotification(.error)
            return nil
        }
    }

    func activateDemoHostSandbox() {
        isDemoHostSandboxActive = true
        hostErrorMessage = nil
        let redDesks: [TeamPlayDeskStatus] = [
            TeamPlayDeskStatus(desk: "analytics", label: "Analytics", decides: "hook", holders: ["Alex M.", "Jordan K."], locked: 2, votes: ["A": 2], choice: "A", agreed: true),
            TeamPlayDeskStatus(desk: "research", label: "Research", decides: "channel", holders: ["Sam R."], locked: 1, votes: ["B": 1], choice: "B", agreed: true),
            TeamPlayDeskStatus(desk: "environment", label: "Environ.", decides: "creative", holders: ["Taylor P."], locked: 1, votes: ["C": 1], choice: "C", agreed: true),
            TeamPlayDeskStatus(desk: "brand", label: "Brand", decides: "offer", holders: ["Morgan L."], locked: 1, votes: ["A": 1], choice: "A", agreed: true)
        ]
        let blueDesks: [TeamPlayDeskStatus] = [
            TeamPlayDeskStatus(desk: "analytics", label: "Analytics", decides: "hook", holders: ["Casey W."], locked: 1, votes: ["B": 1], choice: "B", agreed: false),
            TeamPlayDeskStatus(desk: "research", label: "Research", decides: "channel", holders: ["Riley D."], locked: 1, votes: ["B": 1], choice: "B", agreed: true),
            TeamPlayDeskStatus(desk: "environment", label: "Environ.", decides: "creative", holders: ["Jamie S."], locked: 0, votes: [:], choice: nil, agreed: nil),
            TeamPlayDeskStatus(desk: "brand", label: "Brand", decides: "offer", holders: ["Drew T."], locked: 1, votes: ["A": 1], choice: "A", agreed: true)
        ]
        currentTeamHostState = TeamPlayHostState(
            roomCode: "DEMO",
            status: "in_progress",
            accessMode: "open_access",
            playerCount: 9,
            caseId: "kf-r2-001",
            caseClient: "Kestrel & Fern",
            caseTitle: "The Loyal Doubters",
            matchState: "round",
            currentRound: 1,
            roundsTotal: 5,
            roundEndsAt: nil,
            roundTimeLimit: 90,
            multiplier: 1.0,
            revealStep: 0,
            teams: [
                TeamPlayHostTeamSummary(key: "red", name: "Red Agency", colour: "#C8402F", score: 320, players: 5),
                TeamPlayHostTeamSummary(key: "blue", name: "Blue Agency", colour: "#2B62C2", score: 260, players: 4)
            ],
            desksByTeam: ["red": redDesks, "blue": blueDesks],
            clientKey: ["hook": "A", "channel": "B", "creative": "C", "offer": "A"],
            lesson: "Notice how Research Desk's verbatim customer quote qualifies the raw survey percentage on the Analytics Desk.",
            projectorPin: "4821"
        )
        currentClassicHostRoom = ActiveClassicHostRoom(
            roomCode: "DEMO",
            templateName: "Line Fit · OLS Regression Challenge",
            status: "in_progress",
            createdAt: "Live Sandbox",
            currentRound: 2,
            totalRounds: 5,
            playerCount: 14,
            gameType: "line_fit",
            projectorPin: "4821"
        )
        HapticsManager.shared.playNotification(.success)
    }

    func deactivateDemoHostSandbox() {
        isDemoHostSandboxActive = false
        if currentTeamHostState?.roomCode == "DEMO" {
            currentTeamHostState = nil
        }
        if currentClassicHostRoom?.roomCode == "DEMO" {
            currentClassicHostRoom = nil
        }
    }

    func fetchTeamPlayHostState(roomCode rawCode: String) async -> Bool {
        let code = rawCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if code == "DEMO" {
            if currentTeamHostState == nil {
                activateDemoHostSandbox()
            }
            return true
        }
        guard !code.isEmpty, !authToken.isEmpty,
              let url = URL(string: "\(apiBaseURL)/team-play/sessions/\(code)/host/") else {
            return false
        }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.timeoutInterval = 15
        req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse else { return false }
            let json = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]) ?? [:]
            guard (200...299).contains(http.statusCode) else {
                hostErrorMessage = (json["error"] as? String) ?? "Could not load host state for \(code) (HTTP \(http.statusCode))."
                return false
            }
            if let parsed = parseTeamPlayHostPayload(json) {
                self.currentTeamHostState = parsed
                addHostedTeamRoom(parsed.roomCode)
                return true
            }
            return false
        } catch {
            return false
        }
    }

    func performTeamPlayHostAction(
        roomCode rawCode: String,
        action: String,
        body: [String: Any] = [:]
    ) async -> Bool {
        let code = rawCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if code == "DEMO", var demo = currentTeamHostState {
            switch action {
            case "start":
                demo.matchState = "briefing"
                demo.currentRound = 1
            case "round/start":
                demo.matchState = "round"
            case "round/extend":
                demo.roundTimeLimit += (body["seconds"] as? Int) ?? 30
            case "round/end":
                demo.matchState = "assessment"
                demo.revealStep = 1
            case "reveal":
                demo.revealStep = min(9, (body["step"] as? Int) ?? (demo.revealStep + 1))
            case "advance":
                if demo.currentRound >= demo.roundsTotal {
                    demo.matchState = "complete"
                } else {
                    demo.currentRound += 1
                    demo.matchState = "rotation"
                    demo.revealStep = 0
                }
            default:
                break
            }
            currentTeamHostState = demo
            HapticsManager.shared.playImpact(style: .medium)
            return true
        }
        guard !code.isEmpty, !authToken.isEmpty,
              let url = URL(string: "\(apiBaseURL)/team-play/sessions/\(code)/\(action)/") else {
            return false
        }

        isHostingBusy = true
        hostErrorMessage = nil
        defer { isHostingBusy = false }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 20
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse else { return false }
            let json = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]) ?? [:]
            guard (200...299).contains(http.statusCode) else {
                hostErrorMessage = (json["error"] as? String) ?? (json["detail"] as? String) ?? "Action \(action) failed."
                HapticsManager.shared.playNotification(.error)
                return false
            }
            if let parsed = parseTeamPlayHostPayload(json) {
                self.currentTeamHostState = parsed
            } else {
                _ = await fetchTeamPlayHostState(roomCode: code)
            }
            HapticsManager.shared.playImpact(style: .medium)
            return true
        } catch {
            hostErrorMessage = "Network error (\(error.localizedDescription))."
            return false
        }
    }

    private func parseTeamPlayHostPayload(_ json: [String: Any]) -> TeamPlayHostState? {
        guard let roomCode = json["room_code"] as? String else { return nil }
        let status = (json["status"] as? String) ?? "waiting"
        let accessMode = (json["access_mode"] as? String) ?? "open_access"
        let playerCount = (json["player_count"] as? Int) ?? 0
        let caseDict = json["case"] as? [String: Any]
        let caseId = (caseDict?["case_id"] as? String) ?? "kf-r2-001"
        let caseClient = (caseDict?["client"] as? String) ?? "Kestrel & Fern"
        let caseTitle = (caseDict?["title"] as? String) ?? "The Loyal Doubters"

        let matchDict = json["match"] as? [String: Any]
        let matchState = (matchDict?["state"] as? String) ?? "waiting"
        let currentRound = (matchDict?["current_round"] as? Int) ?? 0
        let roundsTotal = (matchDict?["rounds_total"] as? Int) ?? 5
        let roundEndsAt = matchDict?["round_ends_at"] as? String
        let roundTimeLimit = (matchDict?["round_time_limit"] as? Int) ?? 90
        let multiplier = (matchDict?["multiplier"] as? Double) ?? Double((matchDict?["multiplier"] as? Int) ?? 1)
        let revealStep = (matchDict?["reveal_step"] as? Int) ?? 0

        let teamsArr = (json["teams"] as? [[String: Any]]) ?? []
        let teams: [TeamPlayHostTeamSummary] = teamsArr.compactMap { t in
            guard let key = t["key"] as? String else { return nil }
            return TeamPlayHostTeamSummary(
                key: key,
                name: (t["name"] as? String) ?? key.capitalized,
                colour: (t["colour"] as? String) ?? "#2563eb",
                score: (t["score"] as? Int) ?? 0,
                players: (t["players"] as? Int) ?? 0
            )
        }

        let hostDict = (json["host"] as? [String: Any]) ?? [:]
        let resultsDict = (hostDict["results"] as? [String: Any]) ?? [:]
        var desksByTeam: [String: [TeamPlayDeskStatus]] = [:]
        if let rawDesks = hostDict["desks"] as? [String: [String: Any]] {
            let order = ["analytics", "research", "environment", "brand"]
            for (tKey, teamDesks) in rawDesks {
                let tRes = resultsDict[tKey] as? [String: Any]
                let choices = tRes?["choices"] as? [String: String]
                let agreedMap = tRes?["agreed"] as? [String: Bool]
                var list: [TeamPlayDeskStatus] = []
                for dk in order {
                    guard let dObj = teamDesks[dk] as? [String: Any] else { continue }
                    let decides = (dObj["decides"] as? String) ?? ""
                    let holders: [String]
                    if let strArr = dObj["holders"] as? [String] {
                        holders = strArr
                    } else if let objArr = dObj["holders"] as? [[String: Any]] {
                        holders = objArr.compactMap { $0["name"] as? String }
                    } else {
                        holders = []
                    }
                    let locked = (dObj["locked"] as? Int) ?? 0
                    var votes: [String: Int] = [:]
                    if let rawVotes = dObj["votes"] as? [String: Any] {
                        for (vk, vv) in rawVotes {
                            if let count = vv as? Int { votes[vk] = count }
                        }
                    }
                    list.append(
                        TeamPlayDeskStatus(
                            desk: dk,
                            label: (dObj["label"] as? String) ?? dk.capitalized,
                            decides: decides,
                            holders: holders,
                            locked: locked,
                            votes: votes,
                            choice: choices?[decides],
                            agreed: agreedMap?[decides]
                        )
                    )
                }
                desksByTeam[tKey] = list
            }
        }

        var clientKey: [String: String] = [:]
        if let rawKey = hostDict["key"] as? [String: String] {
            clientKey = rawKey
        }
        let lesson = (hostDict["lesson"] as? String) ?? ""
        let projectorPin = (json["projector_pin"] as? String) ?? ""

        return TeamPlayHostState(
            roomCode: roomCode,
            status: status,
            accessMode: accessMode,
            playerCount: playerCount,
            caseId: caseId,
            caseClient: caseClient,
            caseTitle: caseTitle,
            matchState: matchState,
            currentRound: currentRound,
            roundsTotal: roundsTotal,
            roundEndsAt: roundEndsAt,
            roundTimeLimit: roundTimeLimit,
            multiplier: multiplier,
            revealStep: revealStep,
            teams: teams,
            desksByTeam: desksByTeam,
            clientKey: clientKey,
            lesson: lesson,
            projectorPin: projectorPin
        )
    }

    private func addHostedTeamRoom(_ code: String) {
        let clean = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !clean.isEmpty else { return }
        hostedTeamRoomCodes.removeAll { $0 == clean }
        hostedTeamRoomCodes.insert(clean, at: 0)
        if hostedTeamRoomCodes.count > 10 {
            hostedTeamRoomCodes = Array(hostedTeamRoomCodes.prefix(10))
        }
        UserDefaults.standard.set(hostedTeamRoomCodes, forKey: hostedTeamRoomsKey)
    }

    // MARK: - Classic Edition Host Actions (/api/game/create/, /api/game/<CODE>/...)
    func createClassicGameSession(
        templateId: Int,
        courseId: Int?,
        accessMode: String,
        guestPassword: String,
        timeOverride: Int?,
        scoringMultiplier: Double
    ) async -> String? {
        guard !authToken.isEmpty,
              let url = URL(string: "\(apiBaseURL)/game/create/") else {
            hostErrorMessage = "Please sign in with an instructor account first."
            return nil
        }

        isHostingBusy = true
        hostErrorMessage = nil
        hostStatusMessage = "Creating Classic Game room…"
        defer {
            isHostingBusy = false
            hostStatusMessage = nil
        }

        var settings: [String: Any] = ["scoring_multiplier": scoringMultiplier]
        if let t = timeOverride, t >= 5 {
            settings["time_override"] = t
        }

        var payload: [String: Any] = [
            "game_template_id": templateId,
            "guest_password": guestPassword,
            "access_mode": accessMode,
            "game_settings": settings
        ]
        if let courseId = courseId {
            payload["course_id"] = courseId
        }

        for forceAttempt in [false, true] {
            if forceAttempt {
                payload["force"] = true
            }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.timeoutInterval = 25
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
            req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

            do {
                let (data, resp) = try await URLSession.shared.data(for: req)
                let http = resp as? HTTPURLResponse
                let json = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]) ?? [:]
                if http?.statusCode == 409 && !forceAttempt {
                    continue
                }
                guard let status = http?.statusCode, (200...299).contains(status) else {
                    hostErrorMessage = (json["error"] as? String) ?? (json["detail"] as? String) ?? "Could not create Classic game session."
                    HapticsManager.shared.playNotification(.error)
                    return nil
                }
                let gs = (json["game_session"] as? [String: Any]) ?? json
                if let code = (gs["room_code"] as? String)?.uppercased(), !code.isEmpty {
                    await fetchClassicHostSession(roomCode: code)
                    await fetchInstructorSetupData()
                    HapticsManager.shared.playNotification(.success)
                    return code
                }
            } catch {
                hostErrorMessage = "Network error creating Classic session (\(error.localizedDescription))."
                HapticsManager.shared.playNotification(.error)
                return nil
            }
        }
        return nil
    }

    func fetchClassicHostSession(roomCode rawCode: String) async {
        let code = rawCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if code == "DEMO" { return }
        guard !code.isEmpty,
              let url = URL(string: "\(apiBaseURL)/game/\(code)/") else { return }

        var req = URLRequest(url: url)
        req.timeoutInterval = 15
        if !authToken.isEmpty {
            req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
        }

        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200...299).contains(http.statusCode),
                  let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return }

            let gs = (json["game_session"] as? [String: Any]) ?? json
            let playersArr = (gs["players"] as? [Any]) ?? (json["players"] as? [Any]) ?? []
            let playerCount = (gs["player_count"] as? Int) ?? playersArr.count
            let roomObj = ActiveClassicHostRoom(
                roomCode: code,
                templateName: (gs["template_name"] as? String) ?? (gs["course_name"] as? String) ?? "Classic Game",
                status: (gs["status"] as? String) ?? "waiting",
                createdAt: (gs["created_at"] as? String) ?? "",
                currentRound: (gs["current_round"] as? Int) ?? 1,
                totalRounds: (gs["total_rounds"] as? Int) ?? 1,
                playerCount: playerCount,
                gameType: (gs["game_type"] as? String) ?? "",
                projectorPin: (json["projector_pin"] as? String) ?? (gs["projector_pin"] as? String) ?? ""
            )
            self.currentClassicHostRoom = roomObj
            if let idx = activeClassicHostRooms.firstIndex(where: { $0.roomCode == code }) {
                activeClassicHostRooms[idx] = roomObj
            } else {
                activeClassicHostRooms.insert(roomObj, at: 0)
            }
        } catch {}
    }

    func performClassicHostAction(roomCode rawCode: String, action: String) async -> Bool {
        let code = rawCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if code == "DEMO", var demo = currentClassicHostRoom {
            switch action {
            case "start":
                demo.status = "in_progress"
            case "end_round":
                demo.status = "round_ended"
            case "advance-round":
                demo.currentRound = min(demo.totalRounds, demo.currentRound + 1)
                demo.status = "in_progress"
            case "end":
                demo.status = "completed"
            default:
                break
            }
            currentClassicHostRoom = demo
            HapticsManager.shared.playImpact(style: .medium)
            return true
        }
        guard !code.isEmpty, !authToken.isEmpty,
              let url = URL(string: "\(apiBaseURL)/game/\(code)/\(action)/") else { return false }

        isHostingBusy = true
        hostErrorMessage = nil
        defer { isHostingBusy = false }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 20
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Token \(authToken)", forHTTPHeaderField: "Authorization")
        req.httpBody = Data("{}".utf8)

        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            let http = resp as? HTTPURLResponse
            let json = ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]) ?? [:]
            guard let status = http?.statusCode, (200...299).contains(status) else {
                hostErrorMessage = (json["error"] as? String) ?? (json["detail"] as? String) ?? "Classic host action '\(action)' failed."
                HapticsManager.shared.playNotification(.error)
                return false
            }
            await fetchClassicHostSession(roomCode: code)
            HapticsManager.shared.playImpact(style: .medium)
            return true
        } catch {
            hostErrorMessage = "Network error (\(error.localizedDescription))."
            return false
        }
    }

    // MARK: - Solo Scores & Telemetry
    func recordSoloScore(gameType: String, points: Int) {
        let currentBest = soloHighScores[gameType] ?? 0
        if points > currentBest {
            soloHighScores[gameType] = points
            UserDefaults.standard.set(soloHighScores, forKey: soloScoresKey)
        }
    }

    func updateRecentSessionTelemetry(roomCode: String, score: Int, rank: String) {
        guard let idx = recentSessions.firstIndex(where: { $0.roomCode.uppercased() == roomCode.uppercased() }) else {
            return
        }
        if score != recentSessions[idx].lastScore || rank != recentSessions[idx].lastRank {
            recentSessions[idx].lastScore = score
            recentSessions[idx].lastRank = rank
            persistRecentSessions()
        }
    }

    func clearRecentSessions() {
        recentSessions.removeAll()
        UserDefaults.standard.removeObject(forKey: recentSessionsKey)
    }

    // MARK: - Backend Ping Diagnostics
    func pingBackend() async {
        guard let url = URL(string: apiBaseURL) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "HEAD"
        req.timeoutInterval = 15
        let start = Date()
        do {
            let (_, _) = try await URLSession.shared.data(for: req)
            self.backendLatencyMs = Int(Date().timeIntervalSince(start) * 1000)
        } catch {
            self.backendLatencyMs = nil
        }
    }

    // MARK: - Helpers
    private func parseThrottleSeconds(from detail: String) -> Int {
        let pattern = #"(\d+)\s*second"#
        if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
           let match = regex.firstMatch(in: detail, range: NSRange(detail.startIndex..., in: detail)),
           let range = Range(match.range(at: 1), in: detail),
           let val = Int(detail[range]) {
            return min(val + 1, 30)
        }
        return 5
    }

    private func stringifyJSONObject(_ dict: [String: Any]) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let str = String(data: data, encoding: .utf8) else {
            return "{}"
        }
        return str
    }

    private func saveRecentSession(_ session: RecentRoomSession) {
        recentSessions.removeAll { $0.roomCode.uppercased() == session.roomCode.uppercased() }
        recentSessions.insert(session, at: 0)
        if recentSessions.count > 8 {
            recentSessions = Array(recentSessions.prefix(8))
        }
        persistRecentSessions()
    }

    private func persistRecentSessions() {
        if let encoded = try? JSONEncoder().encode(recentSessions) {
            UserDefaults.standard.set(encoded, forKey: recentSessionsKey)
        }
    }

    private func loadPersistedCollections() {
        if let data = UserDefaults.standard.data(forKey: recentSessionsKey),
           let decoded = try? JSONDecoder().decode([RecentRoomSession].self, from: data) {
            self.recentSessions = decoded
        }
        if let scores = UserDefaults.standard.dictionary(forKey: soloScoresKey) as? [String: Int] {
            self.soloHighScores = scores
        }
        if let rooms = UserDefaults.standard.stringArray(forKey: hostedTeamRoomsKey) {
            self.hostedTeamRoomCodes = rooms
        }
    }
}
