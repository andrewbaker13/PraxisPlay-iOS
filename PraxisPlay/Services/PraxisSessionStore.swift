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
    @Published var soloHighScores: [String: Int] = [:]
    @Published var isJoining: Bool = false
    @Published var joinStatusText: String = ""
    @Published var joinErrorMessage: String? = nil
    @Published var joinWarningMessage: String? = nil
    @Published var activeArenaLaunch: ArenaLaunchMode? = nil
    @Published var backendLatencyMs: Int? = nil

    private let recentSessionsKey = "praxis_recent_sessions_v1"
    private let soloScoresKey = "praxis_solo_high_scores_v1"
    private let guestTagChars = Array("ABCDEFGHJKMNPQRSTUVWXYZ23456789")

    private init() {
        self.studentDisplayName = UserDefaults.standard.string(forKey: "praxis_student_name") ?? ""
        self.authToken = UserDefaults.standard.string(forKey: "praxis_auth_token") ?? ""
        self.loggedInUsername = UserDefaults.standard.string(forKey: "praxis_logged_in_user") ?? ""
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

    // MARK: - Join Classroom Session (with 429 Campus Rate-Limit Auto-Queue)
    func joinRoom(roomCode rawCode: String, displayName rawName: String, guestPin: String = "") async {
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

        isJoining = true
        joinStatusText = "Connecting to room \(code)…"

        defer {
            isJoining = false
            joinStatusText = ""
        }

        let decoratedName = decorateGuestName(roomCode: code, typedName: name.isEmpty ? "Player" : name)
        var payload: [String: Any] = ["room_code": code]

        if effectiveGuestMode {
            payload["guest_name"] = decoratedName
            // Check if we have a previous player_session_id for this exact room + name
            if let existing = recentSessions.first(where: { $0.roomCode.uppercased() == code && $0.decoratedGuestName == decoratedName }) {
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

                // Campus Wi-Fi 429 rate-limit handling (matches game-join.html lines 509-527)
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
            joinedAt: Date()
        )

        saveRecentSession(session)
        HapticsManager.shared.playNotification(.success)
        activeArenaLaunch = .liveSession(session)
    }

    // MARK: - Quick Rejoin Saved Session
    func resumeSession(_ session: RecentRoomSession) {
        HapticsManager.shared.playImpact(style: .medium)
        activeArenaLaunch = .liveSession(session)
    }

    // MARK: - Launch Solo Practice Arcade Mode
    func launchSoloMode(_ mode: SoloGameMode, showResults: Bool = false) {
        HapticsManager.shared.playImpact(style: .medium)
        activeArenaLaunch = .soloPractice(mode, showResults: showResults)
    }

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
    }
}
