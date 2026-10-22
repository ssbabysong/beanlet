import Foundation
import Capacitor

// Reads and writes the journal in the app's private iCloud container, so every device signed into the same
// Apple Account shares it. The web side merges; this side only moves the file and hands over conflict copies.
@objc(BeanletCloudPlugin)
class BeanletCloudPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "BeanletCloudPlugin"
    let jsName = "BeanletCloud"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise)
    ]

    static let container = "iCloud.com.ssbabysong.beanlet"
    private let queue = DispatchQueue(label: "com.ssbabysong.beanlet.cloud")

    /// nil when no Apple Account is signed into iCloud (or iCloud Drive is off for this app).
    private func journalURL() -> URL? {
        guard FileManager.default.ubiquityIdentityToken != nil,
              let root = FileManager.default.url(forUbiquityContainerIdentifier: Self.container) else { return nil }
        return root.appendingPathComponent("journal.json")
    }

    @objc func read(_ call: CAPPluginCall) {
        queue.async {
            guard let url = self.journalURL() else { call.resolve(["available": false]); return }
            try? FileManager.default.startDownloadingUbiquitousItem(at: url)
            var contents: [String] = []
            var error: NSError?
            // A coordinated read waits for iCloud to finish downloading the file.
            NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &error) { file in
                if let data = try? Data(contentsOf: file), let text = String(data: data, encoding: .utf8) { contents.append(text) }
            }
            for version in NSFileVersion.unresolvedConflictVersionsOfItem(at: url) ?? [] {
                if let data = try? Data(contentsOf: version.url), let text = String(data: data, encoding: .utf8) { contents.append(text) }
            }
            call.resolve(["available": true, "contents": contents])
        }
    }

    @objc func write(_ call: CAPPluginCall) {
        guard let contents = call.getString("contents") else { call.reject("Missing contents"); return }
        queue.async {
            guard let url = self.journalURL() else { call.resolve(["available": false]); return }
            var error: NSError?
            var failure: Error?
            NSFileCoordinator().coordinate(writingItemAt: url, options: .forReplacing, error: &error) { file in
                do { try Data(contents.utf8).write(to: file, options: .atomic) } catch { failure = error }
            }
            if let failure = error ?? failure { call.reject(failure.localizedDescription); return }
            // The contents just written already include every conflict copy that read() handed over.
            if let conflicts = NSFileVersion.unresolvedConflictVersionsOfItem(at: url), !conflicts.isEmpty {
                conflicts.forEach { $0.isResolved = true }
                try? NSFileVersion.removeOtherVersionsOfItem(at: url)
            }
            call.resolve(["available": true])
        }
    }
}
