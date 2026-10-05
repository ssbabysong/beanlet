import UIKit
import Capacitor
import Vision
import CoreImage

@objc(BeanletStickerPlugin)
class BeanletStickerPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "BeanletStickerPlugin"
    let jsName = "BeanletSticker"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "cutout", returnType: CAPPluginReturnPromise)
    ]

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
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = BeanletBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
