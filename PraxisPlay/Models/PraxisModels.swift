import Foundation
import SwiftUI

// MARK: - Active Launch Configuration
enum ArenaLaunchMode: Identifiable, Equatable {
    case liveSession(RecentRoomSession)
    case soloPractice(SoloGameMode, showResults: Bool = false)

    var id: String {
        switch self {
        case .liveSession(let session):
            return "live-\(session.roomCode)-\(session.playerSessionId)"
        case .soloPractice(let mode, let showResults):
            return "solo-\(mode.id)-\(showResults ? "res" : "act")"
        }
    }
}

// MARK: - Saved & Active Room Session
struct RecentRoomSession: Identifiable, Codable, Equatable {
    var id: String { "\(roomCode.uppercased())-\(playerSessionId)" }
    let roomCode: String
    let playerName: String
    let decoratedGuestName: String
    let playerSessionId: Int
    let courseName: String
    let instructorName: String
    let gameType: String
    var lastScore: Int
    var lastRank: String
    let isGuest: Bool
    let waitingToEnter: Bool
    let rawGameSessionJSON: String
    let rawPlayerSessionJSON: String
    var joinedAt: Date
}

// MARK: - Live HUD Telemetry State (Synced from WebEngine)
struct HUDTelemetryState: Equatable {
    enum ConnectionStatus: String, Equatable {
        case connecting = "Connecting…"
        case connected = "Live"
        case reconnecting = "Reconnecting…"
        case solo = "Solo Arcade"
    }

    var score: Int = 0
    var rank: String = "-"
    var gameType: String = ""
    var roomCode: String = ""
    var connectionStatus: ConnectionStatus = .connecting
}

// MARK: - Solo Practice Arcade Catalog (All 9 Minigames)
struct SoloGameMode: Identifiable, Equatable {
    let id: String
    let title: String
    let badge: String
    let marketingConcept: String
    let description: String
    let snapshotState: String
    let sfSymbol: String
    let gradientColors: [Color]

    static let allModes: [SoloGameMode] = [
        SoloGameMode(
            id: "speed_tap",
            title: "Speed Tap",
            badge: "RAPID RECALL",
            marketingConcept: "Core Marketing Metrics & KPIs",
            description: "Fast and right wins big. Identify core retention, CAC, and CLV metrics before the clock drains.",
            snapshotState: "speed_tap_active",
            sfSymbol: "bolt.fill",
            gradientColors: [Color(red: 0.23, green: 0.51, blue: 0.96), Color(red: 0.15, green: 0.39, blue: 0.92)]
        ),
        SoloGameMode(
            id: "line_fit",
            title: "Line Fit",
            badge: "BIVARIATE OLS",
            marketingConcept: "Visual Regression & Slope Estimation",
            description: "Eyeball the scatter plot and drag two anchor points to fit the Ordinary Least Squares regression line.",
            snapshotState: "line_fit_active",
            sfSymbol: "chart.xyaxis.line",
            gradientColors: [Color(red: 0.55, green: 0.36, blue: 0.96), Color(red: 0.39, green: 0.20, blue: 0.85)]
        ),
        SoloGameMode(
            id: "budget_blitz",
            title: "Budget Blitz",
            badge: "OPTIMIZATION",
            marketingConcept: "Diminishing Marginal Returns",
            description: "Spend every budget token across acquisition channels. Watch what the NEXT marginal token buys!",
            snapshotState: "budget_blitz_active",
            sfSymbol: "dollarsign.circle.fill",
            gradientColors: [Color(red: 0.06, green: 0.73, blue: 0.51), Color(red: 0.02, green: 0.59, blue: 0.41)]
        ),
        SoloGameMode(
            id: "buy_a_clue",
            title: "Buy a Clue",
            badge: "DECISION THEORY",
            marketingConcept: "Expected Value of Information (EVSI)",
            description: "Answer unassisted for maximum points, or pay 25 points for research intel first. Is the clue worth its cost?",
            snapshotState: "buy_a_clue_active",
            sfSymbol: "lightbulb.fill",
            gradientColors: [Color(red: 0.96, green: 0.62, blue: 0.04), Color(red: 0.85, green: 0.47, blue: 0.02)]
        ),
        SoloGameMode(
            id: "minority_rule",
            title: "Minority Rule",
            badge: "BLUE OCEAN",
            marketingConcept: "Niche Positioning & Competitive Crowding",
            description: "Escape the crowded Red Ocean! Choose the market niche with the fewest competitors to capture maximum margin.",
            snapshotState: "minority_rule_active",
            sfSymbol: "water.waves",
            gradientColors: [Color(red: 0.05, green: 0.65, blue: 0.91), Color(red: 0.01, green: 0.41, blue: 0.63)]
        ),
        SoloGameMode(
            id: "closest_guess",
            title: "Closest Guess",
            badge: "INTERVALS",
            marketingConcept: "Confidence Range Calibration",
            description: "Bracket the true market value with a min-max interval. Tighter intervals score higher — if you capture the truth!",
            snapshotState: "closest_guess_active",
            sfSymbol: "scope",
            gradientColors: [Color(red: 0.93, green: 0.28, blue: 0.60), Color(red: 0.78, green: 0.15, blue: 0.47)]
        ),
        SoloGameMode(
            id: "crowd_wisdom",
            title: "Crowd Wisdom",
            badge: "BEHAVIORAL",
            marketingConcept: "Information Cascades & Herd Instinct",
            description: "Watch real-time class polling shift as you decide. Lock in early or resist the herd for a 2x contrarian bonus!",
            snapshotState: "crowd_wisdom_active",
            sfSymbol: "person.3.sequence.fill",
            gradientColors: [Color(red: 0.39, green: 0.40, blue: 0.95), Color(red: 0.31, green: 0.27, blue: 0.90)]
        ),
        SoloGameMode(
            id: "push_range",
            title: "Push Range",
            badge: "TEAM TUG-OF-WAR",
            marketingConcept: "Collaborative Bracket Convergence",
            description: "Mash your team button with physical Taptic Engine feedback to push the market boundary toward the target!",
            snapshotState: "push_range_active",
            sfSymbol: "arrow.left.and.right.circle.fill",
            gradientColors: [Color(red: 0.94, green: 0.27, blue: 0.27), Color(red: 0.75, green: 0.15, blue: 0.15)]
        ),
        SoloGameMode(
            id: "word_guess",
            title: "Word Guess",
            badge: "TERMINOLOGY",
            marketingConcept: "Analytics Vocabulary Recall",
            description: "Letters reveal progressively over time. Deduce the marketing analytics concept early for maximum speed points.",
            snapshotState: "word_guess_active",
            sfSymbol: "character.textbox",
            gradientColors: [Color(red: 0.08, green: 0.72, blue: 0.65), Color(red: 0.05, green: 0.58, blue: 0.53)]
        )
    ]
}
