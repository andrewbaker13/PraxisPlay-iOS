import SwiftUI

struct SoloArcadeView: View {
    @ObservedObject var sessionStore = PraxisSessionStore.shared
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var selectedCategory: String = "All"

    private let categories = ["All", "Quantitative", "Strategy", "Speed & Recall"]

    private var gridColumns: [GridItem] {
        if horizontalSizeClass == .regular {
            return [
                GridItem(.flexible(minimum: 300), spacing: 16, alignment: .top),
                GridItem(.flexible(minimum: 300), spacing: 16, alignment: .top)
            ]
        } else {
            return [GridItem(.flexible(), spacing: 16)]
        }
    }

    var filteredModes: [SoloGameMode] {
        switch selectedCategory {
        case "Quantitative":
            return SoloGameMode.allModes.filter { ["line_fit", "budget_blitz", "closest_guess"].contains($0.id) }
        case "Strategy":
            return SoloGameMode.allModes.filter { ["buy_a_clue", "minority_rule", "crowd_wisdom"].contains($0.id) }
        case "Speed & Recall":
            return SoloGameMode.allModes.filter { ["speed_tap", "push_range", "word_guess"].contains($0.id) }
        default:
            return SoloGameMode.allModes
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // MARK: - Mastery Progress Header
                    masteryOverviewCard

                    // MARK: - Category Filter Pills
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(categories, id: \.self) { category in
                                Button {
                                    HapticsManager.shared.playSelection()
                                    withAnimation(.spring(response: 0.25)) {
                                        selectedCategory = category
                                    }
                                } label: {
                                    Text(category)
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundStyle(selectedCategory == category ? .white : .white.opacity(0.7))
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 9)
                                        .background(
                                            selectedCategory == category
                                                ? Color.blue
                                                : Color.white.opacity(0.08)
                                        )
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }

                    // MARK: - 9 Minigame Cards
                    LazyVGrid(columns: gridColumns, spacing: 16) {
                        ForEach(filteredModes) { mode in
                            SoloGameCardView(
                                mode: mode,
                                bestScore: sessionStore.soloHighScores[mode.id]
                            ) {
                                sessionStore.launchSoloMode(mode)
                            }
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 12)
                .padding(.bottom, 36)
                .frame(maxWidth: 960)
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
            .navigationTitle("Solo Practice Arcade")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var masteryOverviewCard: some View {
        let completedCount = sessionStore.soloHighScores.keys.count
        let totalModes = SoloGameMode.allModes.count
        let totalPoints = sessionStore.soloHighScores.values.reduce(0, +)

        return HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("ANALYTICS DRILL DECK")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(1.0)
                    .foregroundStyle(.cyan)

                Text("\(completedCount) of \(totalModes) Game Modes Practiced")
                    .font(.system(size: 18, weight: .black))
                    .foregroundStyle(.white)

                Text("Practice every MktPraxis game mode anytime — no live classroom room code needed.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white.opacity(0.70))
            }

            Spacer()

            VStack(spacing: 2) {
                Text("\(totalPoints)")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(.mint)
                Text("BEST PTS")
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundStyle(.white.opacity(0.6))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color.white.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .padding(18)
        .background(Color.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color.white.opacity(0.12), lineWidth: 1)
        )
    }
}

struct SoloGameCardView: View {
    let mode: SoloGameMode
    let bestScore: Int?
    let onLaunch: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                colors: mode.gradientColors,
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 54, height: 54)

                    Image(systemName: mode.sfSymbol)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.white)
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(mode.badge)
                            .font(.system(size: 10, weight: .heavy))
                            .tracking(0.8)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(mode.gradientColors.first?.opacity(0.25) ?? Color.blue.opacity(0.25))
                            .foregroundStyle(.cyan)
                            .clipShape(Capsule())

                        if let score = bestScore {
                            Label("Best: \(score) pts", systemImage: "checkmark.seal.fill")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(.mint)
                        }
                    }

                    Text(mode.title)
                        .font(.system(size: 20, weight: .black))
                        .foregroundStyle(.white)

                    Text(mode.marketingConcept)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.75))
                }

                Spacer()
            }

            Text(mode.description)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white.opacity(0.72))
                .fixedSize(horizontal: false, vertical: true)

            Button(action: onLaunch) {
                HStack {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 16, weight: .bold))
                    Text("Launch Interactive Drill")
                        .font(.system(size: 14, weight: .heavy))
                    Spacer()
                    Image(systemName: "arrow.right")
                        .font(.system(size: 13, weight: .bold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    LinearGradient(
                        colors: mode.gradientColors,
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding(18)
        .background(Color.white.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color.white.opacity(0.12), lineWidth: 1)
        )
    }
}
