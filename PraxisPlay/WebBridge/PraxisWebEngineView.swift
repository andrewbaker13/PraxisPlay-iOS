import SwiftUI
import WebKit

// MARK: - Local Asset Bundle URL Scheme Handler (praxis-app://app.mktpraxis.com/...)
final class PraxisBundleSchemeHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }

        let relativePath = requestURL.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let fileURL = resolveBundledFile(relativePath: relativePath),
              let data = try? Data(contentsOf: fileURL) else {
            let notFound = HTTPURLResponse(
                url: requestURL,
                statusCode: 404,
                httpVersion: "HTTP/1.1",
                headerFields: ["Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*"]
            )!
            urlSchemeTask.didReceive(notFound)
            urlSchemeTask.didReceive(Data("Not Found: \(relativePath)".utf8))
            urlSchemeTask.didFinish()
            return
        }

        let mime = mimeType(for: fileURL.pathExtension)
        let headers: [String: String] = [
            "Content-Type": mime,
            "Content-Length": "\(data.count)",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
        ]

        if let response = HTTPURLResponse(url: requestURL, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers) {
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } else {
            urlSchemeTask.didFailWithError(URLError(.cannotParseResponse))
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private func resolveBundledFile(relativePath: String) -> URL? {
        guard let resourceRoot = Bundle.main.resourceURL else { return nil }

        // 1. Primary path inside WebEngine folder reference
        let candidate1 = resourceRoot.appendingPathComponent("WebEngine").appendingPathComponent(relativePath)
        if FileManager.default.fileExists(atPath: candidate1.path) {
            return candidate1
        }

        // 2. Fallback directly under resourceRoot
        let candidate2 = resourceRoot.appendingPathComponent(relativePath)
        if FileManager.default.fileExists(atPath: candidate2.path) {
            return candidate2
        }

        // 3. Fallback by filename if flattened
        let fileName = (relativePath as NSString).lastPathComponent
        let ext = (fileName as NSString).pathExtension
        let base = (fileName as NSString).deletingPathExtension
        return Bundle.main.url(forResource: base, withExtension: ext.isEmpty ? nil : ext)
    }

    private func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs": return "application/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json; charset=utf-8"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        default: return "application/octet-stream"
        }
    }
}

// MARK: - Controller Reference for Native -> Web Actions
@MainActor
final class PraxisWebController: ObservableObject {
    weak var webView: WKWebView?

    func triggerSocketReconnect() {
        HapticsManager.shared.playTap()
        webView?.evaluateJavaScript("window.PraxisIOSBridge && window.PraxisIOSBridge.triggerReconnect();", completionHandler: nil)
    }

    func reloadRound() {
        HapticsManager.shared.playImpact(style: .medium)
        webView?.reload()
    }
}

// MARK: - SwiftUI WKWebView Representable
struct PraxisWebEngineView: UIViewRepresentable {
    let launchMode: ArenaLaunchMode
    @Binding var telemetry: HUDTelemetryState
    @ObservedObject var webController: PraxisWebController

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(PraxisBundleSchemeHandler(), forURLScheme: "praxis-app")
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "praxisNative")

        // 1. Pre-Bootstrap Session & Environment Script at Document Start
        let bootstrapJS = buildBootstrapScript(for: launchMode)
        let startScript = WKUserScript(source: bootstrapJS, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        contentController.addUserScript(startScript)

        // 2. Native iOS Bridge Script at Document End
        if let bridgeJS = loadBundledBridgeScript() {
            let endScript = WKUserScript(source: bridgeJS, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
            contentController.addUserScript(endScript)
        }

        config.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.bounces = false
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.isOpaque = false
        webView.backgroundColor = .clear
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }

        DispatchQueue.main.async {
            self.webController.webView = webView
        }

        // Load bundled game-play.html via custom scheme
        let targetURLString: String
        switch launchMode {
        case .liveSession(let session):
            let encodedRoom = session.roomCode.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? session.roomCode
            targetURLString = "praxis-app://app.mktpraxis.com/admin_pages/games/game-play.html?room=\(encodedRoom)"
        case .soloPractice(let mode, let showResults):
            let resFlag = showResults ? "&results=1" : ""
            targetURLString = "praxis-app://app.mktpraxis.com/admin_pages/games/game-play.html?room=SOLO&dev=1&state=\(mode.snapshotState)\(resFlag)"
        }

        if let url = URL(string: targetURLString) {
            webView.load(URLRequest(url: url))
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    private func buildBootstrapScript(for mode: ArenaLaunchMode) -> String {
        let store = PraxisSessionStore.shared
        let apiBase = jsEscaped(store.apiBaseURL)
        let wsBase = jsEscaped(store.wsBaseURL)
        let token = jsEscaped(store.authToken)

        switch mode {
        case .liveSession(let session):
            let gameJSON = jsEscaped(session.rawGameSessionJSON)
            let playerJSON = jsEscaped(session.rawPlayerSessionJSON)
            let room = jsEscaped(session.roomCode)
            let name = jsEscaped(session.playerName)
            let isGuestStr = session.isGuest ? "true" : "false"
            let waitingStr = session.waitingToEnter ? "true" : "false"

            return """
            (function() {
                window.__PRAXIS_IOS_NATIVE = true;
                window.__PRAXIS_IOS_SOLO = false;
                window.__PRAXIS_IOS_API_BASE = "\(apiBase)";
                window.__PRAXIS_IOS_WS_BASE = "\(wsBase)";
                try {
                    sessionStorage.setItem('gameSession', "\(gameJSON)");
                    sessionStorage.setItem('playerSession', "\(playerJSON)");
                    sessionStorage.setItem('isGuest', "\(isGuestStr)");
                    sessionStorage.setItem('waitingToEnter', "\(waitingStr)");
                    localStorage.setItem('last_praxis_player_name', "\(name)");
                    if ("\(token)".length > 0 && "\(isGuestStr)" === "false") {
                        localStorage.setItem('token', "\(token)");
                        sessionStorage.setItem('authToken', "\(token)");
                    } else {
                        sessionStorage.removeItem('authToken');
                    }
                } catch (e) {
                    console.warn('[Praxis-iOS] Storage bootstrap warning:', e);
                }
                window.roomCode = "\(room)";
            })();
            """

        case .soloPractice(let soloMode, let showResults):
            let snapshot = jsEscaped(soloMode.snapshotState)
            let gameId = jsEscaped(soloMode.id)
            let playerName = jsEscaped(store.studentDisplayName.isEmpty ? "You (Solo Practice)" : store.studentDisplayName)
            let resBool = showResults ? "true" : "false"

            return """
            (function() {
                window.__PRAXIS_IOS_NATIVE = true;
                window.__PRAXIS_IOS_SOLO = true;
                window.__PRAXIS_IOS_SOLO_RESULTS = \(resBool);
                window.__PRAXIS_IOS_SOLO_STATE = "\(snapshot)";
                window.DEV_MODE = true;
                window.DEV_STATE = "\(snapshot)";
                window.DEV_SNAPSHOT_PATH = "dev_data/snapshots/\(snapshot).json";
                try {
                    sessionStorage.setItem('authToken', 'SOLO_PRACTICE_TOKEN');
                    sessionStorage.setItem('isGuest', 'true');
                    sessionStorage.setItem('waitingToEnter', 'false');
                    sessionStorage.setItem('gameSession', JSON.stringify({
                        room_code: 'SOLO',
                        game_type: "\(gameId)",
                        status: 'in_progress',
                        instructor_name: 'Praxis Solo Arcade',
                        course_name: 'Analytics Practice'
                    }));
                    sessionStorage.setItem('playerSession', JSON.stringify({
                        id: 999,
                        display_name: "\(playerName)",
                        guest_name: "\(playerName)",
                        score: 380,
                        rank: 2
                    }));
                } catch (e) {}
            })();
            """
        }
    }

    private func loadBundledBridgeScript() -> String? {
        guard let resourceRoot = Bundle.main.resourceURL else { return nil }
        let candidate = resourceRoot
            .appendingPathComponent("WebEngine/admin_pages/games/js/praxis-ios-bridge.js")
        if let str = try? String(contentsOf: candidate, encoding: .utf8) {
            return str
        }
        if let fallbackURL = Bundle.main.url(forResource: "praxis-ios-bridge", withExtension: "js"),
           let str = try? String(contentsOf: fallbackURL, encoding: .utf8) {
            return str
        }
        return nil
    }

    private func jsEscaped(_ raw: String) -> String {
        raw
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "")
    }

    // MARK: - Coordinator (WKScriptMessageHandler & WKNavigationDelegate)
    final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        var parent: PraxisWebEngineView

        init(parent: PraxisWebEngineView) {
            self.parent = parent
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "praxisNative",
                  let body = message.body as? [String: Any],
                  let type = body["type"] as? String else {
                return
            }

            Task { @MainActor in
                switch type {
                case "haptic":
                    if let pattern = body["pattern"] as? [Int] {
                        HapticsManager.shared.playWebPattern(pattern)
                    } else if let single = body["pattern"] as? Int {
                        HapticsManager.shared.playWebPattern([single])
                    } else {
                        HapticsManager.shared.playTap()
                    }

                case "hudUpdate":
                    let score = (body["score"] as? Int) ?? parent.telemetry.score
                    let rank = (body["rank"] as? String) ?? parent.telemetry.rank
                    let gType = (body["gameType"] as? String) ?? parent.telemetry.gameType
                    let rCode = (body["roomCode"] as? String) ?? parent.telemetry.roomCode
                    let connStr = (body["connectionState"] as? String) ?? "connecting"

                    let status: HUDTelemetryState.ConnectionStatus
                    switch connStr {
                    case "connected": status = .connected
                    case "reconnecting": status = .reconnecting
                    case "solo": status = .solo
                    default: status = .connecting
                    }

                    parent.telemetry = HUDTelemetryState(
                        score: score,
                        rank: rank,
                        gameType: gType,
                        roomCode: rCode,
                        connectionStatus: status
                    )

                    if case .liveSession(let session) = parent.launchMode {
                        PraxisSessionStore.shared.updateRecentSessionTelemetry(
                            roomCode: session.roomCode,
                            score: score,
                            rank: rank
                        )
                    }

                case "soloCompleted":
                    let gType = (body["gameType"] as? String) ?? ""
                    let pts = (body["points"] as? Int) ?? 100
                    HapticsManager.shared.playNotification(.success)
                    if !gType.isEmpty {
                        PraxisSessionStore.shared.recordSoloScore(gameType: gType, points: pts)
                    }

                default:
                    break
                }
            }
        }
    }
}
