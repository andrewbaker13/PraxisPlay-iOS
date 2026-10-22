import UIKit

@MainActor
final class HapticsManager {
    static let shared = HapticsManager()

    private let lightGenerator = UIImpactFeedbackGenerator(style: .light)
    private let mediumGenerator = UIImpactFeedbackGenerator(style: .medium)
    private let heavyGenerator = UIImpactFeedbackGenerator(style: .heavy)
    private let rigidGenerator = UIImpactFeedbackGenerator(style: .rigid)
    private let selectionGenerator = UISelectionFeedbackGenerator()
    private let notificationGenerator = UINotificationFeedbackGenerator()

    var isEnabled: Bool {
        get {
            if UserDefaults.standard.object(forKey: "praxis_haptics_enabled") == nil {
                return true
            }
            return UserDefaults.standard.bool(forKey: "praxis_haptics_enabled")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "praxis_haptics_enabled")
        }
    }

    private init() {
        prepareGenerators()
    }

    func prepareGenerators() {
        guard isEnabled else { return }
        lightGenerator.prepare()
        mediumGenerator.prepare()
        heavyGenerator.prepare()
        selectionGenerator.prepare()
        notificationGenerator.prepare()
    }

    func playTap() {
        guard isEnabled else { return }
        lightGenerator.impactOccurred()
    }

    func playSelection() {
        guard isEnabled else { return }
        selectionGenerator.selectionChanged()
    }

    func playImpact(style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        guard isEnabled else { return }
        switch style {
        case .light: lightGenerator.impactOccurred()
        case .medium: mediumGenerator.impactOccurred()
        case .heavy: heavyGenerator.impactOccurred()
        case .rigid: rigidGenerator.impactOccurred()
        default: mediumGenerator.impactOccurred()
        }
    }

    func playNotification(_ type: UINotificationFeedbackGenerator.FeedbackType) {
        guard isEnabled else { return }
        notificationGenerator.notificationOccurred(type)
    }

    /// Translates web `navigator.vibrate(pattern)` arrays into native Taptic Engine pulses
    func playWebPattern(_ pattern: [Int]) {
        guard isEnabled, !pattern.isEmpty else { return }

        if pattern.count == 1 {
            let duration = pattern[0]
            if duration <= 20 {
                lightGenerator.impactOccurred()
            } else if duration <= 35 {
                mediumGenerator.impactOccurred()
            } else {
                rigidGenerator.impactOccurred()
            }
            return
        }

        // Multi-pulse pattern (e.g., GO! [50, 40, 60] or critical countdown [40, 40, 40])
        var cumulativeDelay: Double = 0
        for (index, stepMs) in pattern.enumerated() {
            if index % 2 == 0 {
                let delaySec = cumulativeDelay / 1000.0
                DispatchQueue.main.asyncAfter(deadline: .now() + delaySec) { [weak self] in
                    guard let self = self, self.isEnabled else { return }
                    if stepMs >= 45 {
                        self.heavyGenerator.impactOccurred()
                    } else {
                        self.rigidGenerator.impactOccurred()
                    }
                }
            }
            cumulativeDelay += Double(max(stepMs, 30))
        }
    }
}
