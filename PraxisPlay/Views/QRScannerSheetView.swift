import SwiftUI
import AVFoundation

struct QRScannerSheetView: View {
    @Environment(\.dismiss) private var dismiss
    let onCodeScanned: (String) -> Void

    @State private var torchOn: Bool = false
    @State private var cameraAuthorized: Bool = true
    @State private var manualRoomInput: String = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                if cameraAuthorized {
                    QRCameraPreviewRepresentable(
                        torchOn: $torchOn,
                        onQRPayloadDetected: { rawString in
                            if let code = Self.extractRoomCode(from: rawString) {
                                HapticsManager.shared.playNotification(.success)
                                onCodeScanned(code)
                                dismiss()
                            }
                        },
                        onPermissionDenied: {
                            cameraAuthorized = false
                        }
                    )
                    .ignoresSafeArea()
                } else {
                    VStack(spacing: 18) {
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 56))
                            .foregroundStyle(.blue)
                        Text("Camera Access Needed")
                            .font(.title3.bold())
                            .foregroundStyle(.white)
                        Text("Enable camera access in Settings to scan your instructor's projector QR code, or type the 4-character room code below.")
                            .font(.subheadline)
                            .foregroundStyle(.gray)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)

                        HStack {
                            TextField("Room Code (e.g. AB12)", text: $manualRoomInput)
                                .textInputAutocapitalization(.characters)
                                .disableAutocorrection(true)
                                .padding(12)
                                .background(Color.white.opacity(0.12))
                                .foregroundStyle(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 10))

                            Button("Use Code") {
                                if let extracted = Self.extractRoomCode(from: manualRoomInput) {
                                    onCodeScanned(extracted)
                                    dismiss()
                                }
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding(.horizontal, 32)
                    }
                }

                // Viewfinder Reticle Overlay
                VStack {
                    Spacer()

                    ZStack {
                        RoundedRectangle(cornerRadius: 24)
                            .strokeBorder(
                                LinearGradient(
                                    colors: [.blue, .cyan, .mint],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 4
                            )
                            .frame(width: 250, height: 250)
                            .background(Color.white.opacity(0.03))
                            .clipShape(RoundedRectangle(cornerRadius: 24))
                    }

                    Text("Point at the Praxis Play QR code on the classroom projector")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                        .background(.ultraThinMaterial)
                        .clipShape(Capsule())
                        .padding(.top, 24)

                    Spacer()

                    HStack(spacing: 16) {
                        Button {
                            torchOn.toggle()
                            HapticsManager.shared.playTap()
                        } label: {
                            Label(torchOn ? "Torch On" : "Torch", systemImage: torchOn ? "flashlight.on.fill" : "flashlight.off.fill")
                                .font(.subheadline.weight(.semibold))
                                .padding(.horizontal, 18)
                                .padding(.vertical, 12)
                                .background(.ultraThinMaterial)
                                .foregroundStyle(.white)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Scan Projector QR")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundStyle(.white)
                }
            }
        }
    }

    /// Parses `room=` or `code=` query params from MktPraxis URLs or returns a clean 4-8 char alphanumeric code
    static func extractRoomCode(from raw: String) -> String? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        if let components = URLComponents(string: trimmed),
           let items = components.queryItems {
            if let roomParam = items.first(where: { $0.name.lowercased() == "room" || $0.name.lowercased() == "code" })?.value,
               !roomParam.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return roomParam.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
            }
        }

        // Fallback regex for ?room=XXXX
        if let range = trimmed.range(of: #"(?:room|code)=([A-Za-z0-9]{3,8})"#, options: .regularExpression) {
            let match = String(trimmed[range])
            if let eqIdx = match.firstIndex(of: "=") {
                return String(match[match.index(after: eqIdx)...]).uppercased()
            }
        }

        // Direct room code string (3 to 8 alphanumeric characters)
        let alnum = trimmed.uppercased().filter { $0.isLetter || $0.isNumber }
        if (3...8).contains(alnum.count) && alnum.count == trimmed.count {
            return alnum
        }

        return nil
    }
}

// MARK: - UIKit AVCaptureSession Wrapper
struct QRCameraPreviewRepresentable: UIViewControllerRepresentable {
    @Binding var torchOn: Bool
    let onQRPayloadDetected: (String) -> Void
    let onPermissionDenied: () -> Void

    func makeUIViewController(context: Context) -> QRCameraViewController {
        let vc = QRCameraViewController()
        vc.onQRPayloadDetected = onQRPayloadDetected
        vc.onPermissionDenied = onPermissionDenied
        return vc
    }

    func updateUIViewController(_ uiViewController: QRCameraViewController, context: Context) {
        uiViewController.setTorch(enabled: torchOn)
    }
}

final class QRCameraViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onQRPayloadDetected: ((String) -> Void)?
    var onPermissionDenied: (() -> Void)?

    private let captureSession = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var hasLockedCode = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        checkPermissionAndConfigure()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.layer.bounds
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if captureSession.isRunning {
            captureSession.stopRunning()
        }
    }

    private func checkPermissionAndConfigure() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            configureSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.configureSession()
                    } else {
                        self?.onPermissionDenied?()
                    }
                }
            }
        default:
            onPermissionDenied?()
        }
    }

    private func configureSession() {
        guard let videoCaptureDevice = AVCaptureDevice.default(for: .video),
              let videoInput = try? AVCaptureDeviceInput(device: videoCaptureDevice),
              captureSession.canAddInput(videoInput) else {
            onPermissionDenied?()
            return
        }

        captureSession.addInput(videoInput)

        let metadataOutput = AVCaptureMetadataOutput()
        guard captureSession.canAddOutput(metadataOutput) else {
            onPermissionDenied?()
            return
        }

        captureSession.addOutput(metadataOutput)
        metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
        if metadataOutput.availableMetadataObjectTypes.contains(.qr) {
            metadataOutput.metadataObjectTypes = [.qr]
        }

        let preview = AVCaptureVideoPreviewLayer(session: captureSession)
        preview.frame = view.layer.bounds
        preview.videoGravity = .resizeAspectFill
        view.layer.addSublayer(preview)
        self.previewLayer = preview

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.captureSession.startRunning()
        }
    }

    func setTorch(enabled: Bool) {
        guard let device = AVCaptureDevice.default(for: .video), device.hasTorch else { return }
        try? device.lockForConfiguration()
        device.torchMode = enabled ? .on : .off
        device.unlockForConfiguration()
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard !hasLockedCode,
              let first = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let stringValue = first.stringValue else {
            return
        }
        hasLockedCode = true
        captureSession.stopRunning()
        onQRPayloadDetected?(stringValue)
    }
}
