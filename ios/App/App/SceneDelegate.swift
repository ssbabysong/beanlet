import UIKit
import Capacitor
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

@objc(BeanletStickerPlugin)
class BeanletStickerPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "BeanletStickerPlugin"
    let jsName = "BeanletSticker"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "cutout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "compress", returnType: CAPPluginReturnPromise)
    ]

    /// Re-encodes a photo as HEIC, which keeps a sticker's transparency at a tenth of the PNG's size.
    @objc func compress(_ call: CAPPluginCall) {
        guard let dataURL = call.getString("dataUrl"),
              let comma = dataURL.firstIndex(of: ","),
              let data = Data(base64Encoded: String(dataURL[dataURL.index(after: comma)...])),
              let source = CGImageSourceCreateWithData(data as CFData, nil) else {
            call.reject("无法读取这张照片")
            return
        }
        let maxSide = call.getInt("maxSide") ?? 1024
        DispatchQueue.global(qos: .userInitiated).async {
            let options: [CFString: Any] = [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: maxSide
            ]
            let output = NSMutableData()
            guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary),
                  let destination = CGImageDestinationCreateWithData(output, UTType.heic.identifier as CFString, 1, nil) else {
                call.reject("照片压缩失败")
                return
            }
            CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.75] as CFDictionary)
            guard CGImageDestinationFinalize(destination) else {
                call.reject("照片压缩失败")
                return
            }
            let result = "data:image/heic;base64," + (output as Data).base64EncodedString()
            DispatchQueue.main.async { call.resolve(["dataUrl": result]) }
        }
    }

    @objc func cutout(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.reject("自动抠图需要 iOS 17 或更高版本")
            return
        }
        guard let dataURL = call.getString("dataUrl"),
              let comma = dataURL.firstIndex(of: ","),
              let data = Data(base64Encoded: String(dataURL[dataURL.index(after: comma)...])),
              let source = UIImage(data: data),
              let cgImage = source.cgImage else {
            call.reject("无法读取这张照片")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let request = VNGenerateForegroundInstanceMaskRequest()
                let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up)
                try handler.perform([request])
                guard let observation = request.results?.first else {
                    throw NSError(domain: "BeanletSticker", code: 1, userInfo: [NSLocalizedDescriptionKey: "没有识别到咖啡主体，请换个角度再拍"])
                }
                let buffer = try observation.generateMaskedImage(ofInstances: observation.allInstances, from: handler, croppedToInstancesExtent: true)
                let ciImage = CIImage(cvPixelBuffer: buffer)
                let context = CIContext(options: [.useSoftwareRenderer: false])
                guard let resultCG = context.createCGImage(ciImage, from: ciImage.extent) else {
                    throw NSError(domain: "BeanletSticker", code: 2, userInfo: [NSLocalizedDescriptionKey: "照片处理失败"])
                }
                let sticker = self.outlinedSticker(UIImage(cgImage: resultCG))
                guard let png = sticker.pngData() else {
                    throw NSError(domain: "BeanletSticker", code: 3, userInfo: [NSLocalizedDescriptionKey: "贴纸生成失败"])
                }
                let output = "data:image/png;base64," + png.base64EncodedString()
                DispatchQueue.main.async { call.resolve(["dataUrl": output]) }
            } catch {
                DispatchQueue.main.async { call.reject(error.localizedDescription, nil, error) }
            }
        }
    }

    private func outlinedSticker(_ image: UIImage) -> UIImage {
        let maxSide: CGFloat = 900
        let resize = min(1, maxSide / max(image.size.width, image.size.height))
        let size = CGSize(width: image.size.width * resize, height: image.size.height * resize)
        let border = max(10, min(size.width, size.height) * 0.035)
        let padding = border * 2.3
        let canvas = CGSize(width: size.width + padding * 2, height: size.height + padding * 2)
        let renderer = UIGraphicsImageRenderer(size: canvas)
        return renderer.image { _ in
            let rect = CGRect(origin: CGPoint(x: padding, y: padding), size: size)
            let white = image.withTintColor(.white, renderingMode: .alwaysOriginal)
            for step in 0..<32 {
                let angle = CGFloat(step) / 32 * .pi * 2
                white.draw(in: rect.offsetBy(dx: cos(angle) * border, dy: sin(angle) * border))
            }
            image.draw(in: rect)
        }
    }
}

class BeanletBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(BeanletStickerPlugin())
        bridge?.registerPluginInstance(BeanletWidgetPlugin())
        bridge?.registerPluginInstance(BeanletCloudPlugin())
        bridge?.registerPluginInstance(NativeTabsPlugin())
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // The web view sits inside the system tab bar (see NativeTabs.swift).
        window?.rootViewController = TabsController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
        connectionOptions.urlContexts.forEach { BeanletWidgetPlugin.open($0.url) }
        #if DEBUG
        // Debug only: xcrun simctl launch <device> com.ssbabysong.beanlet -link brew  → opens a page the way a widget tap does, without the system prompt.
        let args = CommandLine.arguments
        if let i = args.firstIndex(of: "-link"), i + 1 < args.count, let url = URL(string: "beanlet://" + args[i + 1]) { BeanletWidgetPlugin.open(url) }
        #endif
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        URLContexts.forEach { BeanletWidgetPlugin.open($0.url) }
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
