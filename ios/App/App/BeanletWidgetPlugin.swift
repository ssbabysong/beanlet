import Foundation
import Capacitor
import WidgetKit

// Hands the web journal to the Home Screen widgets and routes widget taps back to the web app.
@objc(BeanletWidgetPlugin)
class BeanletWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "BeanletWidgetPlugin"
    let jsName = "BeanletWidget"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise)
    ]

    static let appGroup = "group.com.ssbabysong.beanlet"
    private static weak var active: BeanletWidgetPlugin?
    private static var pendingURL: URL?

    override func load() {
        Self.active = self
        if let url = Self.pendingURL {
            Self.pendingURL = nil
            deliver(url)
        }
    }

    /// Returns true for beanlet:// links. A cold-start link waits until the bridge loads this plugin.
    @discardableResult
    static func open(_ url: URL) -> Bool {
        guard url.scheme == "beanlet" else { return false }
        if let plugin = active { plugin.deliver(url) } else { pendingURL = url }
        return true
    }

    private func deliver(_ url: URL) {
        // Retained until the web app attaches its listener after launch.
        notifyListeners("widgetAction", data: ["url": url.absoluteString], retainUntilConsumed: true)
    }

    @objc func update(_ call: CAPPluginCall) {
        guard let snapshot = call.getString("snapshot"),
              let json = try? JSONSerialization.jsonObject(with: Data(snapshot.utf8)) as? [String: Any] else {
            call.reject("Invalid widget snapshot")
            return
        }
        guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.appGroup) else {
            call.reject("App Group is not available")
            return
        }
        let thumbs = call.getObject("thumbs") as? [String: String] ?? [:]
        DispatchQueue.global(qos: .utility).async {
            do {
                let files = FileManager.default
                let folder = container.appendingPathComponent("thumbs", isDirectory: true)
                try files.createDirectory(at: folder, withIntermediateDirectories: true)
                for (key, dataURL) in thumbs where Self.isThumbKey(key) {
                    guard let comma = dataURL.firstIndex(of: ","),
                          let data = Data(base64Encoded: String(dataURL[dataURL.index(after: comma)...])) else { continue }
                    try data.write(to: folder.appendingPathComponent(key + ".png"), options: .atomic)
                }
                let referenced = Self.thumbKeys(in: json)
                for name in (try? files.contentsOfDirectory(atPath: folder.path)) ?? [] where !referenced.contains((name as NSString).deletingPathExtension) {
                    try? files.removeItem(at: folder.appendingPathComponent(name))
                }
                let missing = referenced.filter { !files.fileExists(atPath: folder.appendingPathComponent($0 + ".png").path) }
                try Data(snapshot.utf8).write(to: container.appendingPathComponent("widget-snapshot.json"), options: .atomic)
                WidgetCenter.shared.reloadAllTimelines()
                call.resolve(["missing": missing.sorted()])
            } catch {
                call.reject(error.localizedDescription, nil, error)
            }
        }
    }

    private static func isThumbKey(_ key: String) -> Bool {
        !key.isEmpty && key.count <= 40 && key.allSatisfy { $0.isASCII && ($0.isLetter || $0.isNumber) }
    }

    private static func thumbKeys(in snapshot: [String: Any]) -> Set<String> {
        var beans = snapshot["shelf"] as? [[String: Any]] ?? []
        if let brewBean = snapshot["brewBean"] as? [String: Any] { beans.append(brewBean) }
        return Set(beans.compactMap { $0["thumb"] as? String }.filter(isThumbKey))
    }
}
