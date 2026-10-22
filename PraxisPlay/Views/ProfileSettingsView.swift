import SwiftUI

struct ProfileSettingsView: View {
    @ObservedObject var sessionStore = PraxisSessionStore.shared
    @State private var hapticsEnabled: Bool = HapticsManager.shared.isEnabled
    @State private var isPinging: Bool = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Student Profile") {
                    HStack {
                        Label("Default Name", systemImage: "person.fill")
                        Spacer()
                        TextField("Display Name", text: $sessionStore.studentDisplayName)
                            .multilineTextAlignment(.trailing)
                    }

                    Toggle(isOn: $sessionStore.useGuestMode) {
                        Label("Quick Guest Mode", systemImage: "person.badge.key.fill")
                    }

                    if !sessionStore.useGuestMode {
                        SecureField("MktPraxis Auth Token (Optional)", text: $sessionStore.authToken)
                            .textInputAutocapitalization(.never)
                            .disableAutocorrection(true)
                    }
                }

                Section("iPhone Classroom Hardware") {
                    Toggle(isOn: $hapticsEnabled) {
                        Label("Taptic Engine Feedback", systemImage: "iphone.radiowaves.left.and.right")
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

                Section("Session History & Data") {
                    Button(role: .destructive) {
                        HapticsManager.shared.playNotification(.warning)
                        sessionStore.clearRecentSessions()
                    } label: {
                        Label("Clear Recent Classroom Rooms (\(sessionStore.recentSessions.count))", systemImage: "trash")
                    }
                    .disabled(sessionStore.recentSessions.isEmpty)
                }

                Section("About Praxis Play iOS") {
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
                        Text("1.0.0 (Build 1)")
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Profile & Setup")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
