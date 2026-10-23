import Foundation
import Capacitor
import CloudKit
import CryptoKit

// Syncs the journal through the user's private CloudKit database. Each bag, brew, memory or favorite is one
// JournalItem record carrying its key, change time, a deleted flag and its JSON as an asset. The web side decides
// which version of a record wins; this side moves records and keeps outgoing and incoming ones on disk until done.
@objc(BeanletCloudPlugin)
class BeanletCloudPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "BeanletCloudPlugin"
    let jsName = "BeanletCloud"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "push", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "takeInbox", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ack", returnType: CAPPluginReturnPromise)
    ]

    private var journal: AnyObject?

    @available(iOS 17.0, *) @MainActor
    private func started() async -> CloudJournal? {
        if let journal = journal as? CloudJournal { return journal }
        guard (try? await CloudJournal.container.accountStatus()) == .available else { return nil }
        // Another call may have started it while this one waited.
        if let journal = journal as? CloudJournal { return journal }
        let journal = CloudJournal { [weak self] event in self?.notifyListeners(event, data: [:]) }
        self.journal = journal
        return journal
    }

    private func run(_ call: CAPPluginCall, _ body: @escaping (AnyObject) async throws -> [String: Any]) {
        guard #available(iOS 17.0, *) else { call.resolve(["available": false]); return }
        Task { @MainActor in
            guard let journal = await started() else { call.resolve(["available": false]); return }
            do {
                var result = try await body(journal)
                result["available"] = true
                call.resolve(result)
            } catch {
                #if DEBUG
                print("BeanletCloud error:", error)
                #endif
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func start(_ call: CAPPluginCall) { run(call) { _ in [:] } }

    @objc func push(_ call: CAPPluginCall) {
        let items = call.getArray("items", JSObject.self) ?? []
        run(call) { journal in
            guard #available(iOS 17.0, *), let journal = journal as? CloudJournal else { return [:] }
            journal.queue(items.compactMap(CloudItem.init))
            return [:]
        }
    }

    @objc func sync(_ call: CAPPluginCall) {
        run(call) { journal in
            guard #available(iOS 17.0, *), let journal = journal as? CloudJournal else { return [:] }
            try await journal.sync()
            return [:]
        }
    }

    @objc func takeInbox(_ call: CAPPluginCall) {
        run(call) { journal in
            guard #available(iOS 17.0, *), let journal = journal as? CloudJournal else { return ["items": []] }
            return ["items": journal.inbox().map { $0.object }]
        }
    }

    @objc func ack(_ call: CAPPluginCall) {
        let items = call.getArray("items", JSObject.self) ?? []
        run(call) { journal in
            guard #available(iOS 17.0, *), let journal = journal as? CloudJournal else { return [:] }
            journal.acknowledge(items.compactMap { item in
                guard let key = item["key"] as? String, let stamp = item["stamp"] as? Double else { return nil }
                return (key, stamp)
            })
            return [:]
        }
    }
}

/// One journal record as the web side sees it: `payload` is the record's JSON, absent when deleted.
struct CloudItem {
    let key: String
    let stamp: Double
    let deleted: Bool
    var payload: String?

    init?(_ object: JSObject) {
        guard let key = object["key"] as? String, let stamp = object["stamp"] as? Double else { return nil }
        self.key = key
        self.stamp = stamp
        deleted = object["deleted"] as? Bool ?? false
        payload = object["payload"] as? String
    }

    init(key: String, stamp: Double, deleted: Bool, payload: String?) {
        self.key = key
        self.stamp = stamp
        self.deleted = deleted
        self.payload = payload
    }

    var object: JSObject {
        var out: JSObject = ["key": key, "stamp": stamp, "deleted": deleted]
        if let payload { out["payload"] = payload }
        return out
    }

    /// Record names must be short and plain, so they are a hash of the key.
    static func name(_ key: String) -> String {
        SHA256.hash(data: Data(key.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

@available(iOS 17.0, *)
final class CloudJournal: CKSyncEngineDelegate {
    static let container = CKContainer(identifier: "iCloud.com.ssbabysong.beanlet")
    static let zone = CKRecordZone.ID(zoneName: "Journal")
    static let recordType = "JournalItem"

    private let notify: (String) -> Void
    private let folder: URL
    private var engine: CKSyncEngine!

    init(notify: @escaping (String) -> Void) {
        self.notify = notify
        folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("BeanletCloud", isDirectory: true)
        for sub in ["outbox", "inbox", "system"] {
            try? FileManager.default.createDirectory(at: folder.appendingPathComponent(sub), withIntermediateDirectories: true)
        }
        let saved = (try? Data(contentsOf: stateURL)).flatMap { try? JSONDecoder().decode(CKSyncEngine.State.Serialization.self, from: $0) }
        engine = CKSyncEngine(CKSyncEngine.Configuration(database: Self.container.privateCloudDatabase, stateSerialization: saved, delegate: self))
        if saved == nil { engine.state.add(pendingDatabaseChanges: [.saveZone(CKRecordZone(zoneID: Self.zone))]) }
        // Anything queued before the app last quit goes out again.
        engine.state.add(pendingRecordZoneChanges: outboxNames().map { .saveRecord(recordID($0)) })
    }

    // MARK: Files

    private var stateURL: URL { folder.appendingPathComponent("engine-state.json") }
    private func url(_ box: String, _ name: String, _ ext: String) -> URL {
        folder.appendingPathComponent(box).appendingPathComponent(name + "." + ext)
    }
    private func recordID(_ name: String) -> CKRecord.ID { CKRecord.ID(recordName: name, zoneID: Self.zone) }

    private func store(_ item: CloudItem, in box: String) {
        let name = CloudItem.name(item.key)
        let meta: [String: Any] = ["key": item.key, "stamp": item.stamp, "deleted": item.deleted]
        try? JSONSerialization.data(withJSONObject: meta).write(to: url(box, name, "json"), options: .atomic)
        if let payload = item.payload {
            try? Data(payload.utf8).write(to: url(box, name, "payload"), options: .atomic)
        } else {
            try? FileManager.default.removeItem(at: url(box, name, "payload"))
        }
    }

    private func load(_ name: String, from box: String) -> CloudItem? {
        guard let data = try? Data(contentsOf: url(box, name, "json")),
              let meta = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let key = meta["key"] as? String, let stamp = meta["stamp"] as? Double else { return nil }
        let payload = (try? Data(contentsOf: url(box, name, "payload"))).flatMap { String(data: $0, encoding: .utf8) }
        return CloudItem(key: key, stamp: stamp, deleted: meta["deleted"] as? Bool ?? false, payload: payload)
    }

    private func remove(_ name: String, from box: String) {
        try? FileManager.default.removeItem(at: url(box, name, "json"))
        try? FileManager.default.removeItem(at: url(box, name, "payload"))
    }

    private func names(in box: String) -> [String] {
        let files = (try? FileManager.default.contentsOfDirectory(atPath: folder.appendingPathComponent(box).path)) ?? []
        return files.filter { $0.hasSuffix(".json") }.map { String($0.dropLast(5)) }
    }
    private func outboxNames() -> [String] { names(in: "outbox") }

    /// The server's change tag for a record, so the next save updates it instead of colliding.
    private func remember(_ record: CKRecord) {
        let coder = NSKeyedArchiver(requiringSecureCoding: true)
        record.encodeSystemFields(with: coder)
        try? coder.encodedData.write(to: url("system", record.recordID.recordName, "data"), options: .atomic)
    }

    private func knownRecord(_ name: String) -> CKRecord? {
        guard let data = try? Data(contentsOf: url("system", name, "data")),
              let coder = try? NSKeyedUnarchiver(forReadingFrom: data) else { return nil }
        coder.requiresSecureCoding = true
        return CKRecord(coder: coder)
    }

    // MARK: Web side

    func queue(_ items: [CloudItem]) {
        for item in items { store(item, in: "outbox") }
        engine.state.add(pendingRecordZoneChanges: items.map { .saveRecord(recordID(CloudItem.name($0.key))) })
    }

    /// Sends what's waiting, then pulls other devices' changes. A manual call cancels the engine's own scheduled
    /// work without retrying it, so both run here, one after the other.
    func sync() async throws {
        if !engine.state.pendingRecordZoneChanges.isEmpty || !engine.state.pendingDatabaseChanges.isEmpty {
            // Records that fail are sorted out in handleEvent and stay queued, so one of them failing isn't fatal here.
            do { try await engine.sendChanges() } catch let error as CKError where error.code == .partialFailure {}
        }
        try await engine.fetchChanges()
    }

    func inbox() -> [CloudItem] { names(in: "inbox").compactMap { load($0, from: "inbox") } }

    func acknowledge(_ items: [(String, Double)]) {
        for (key, stamp) in items {
            let name = CloudItem.name(key)
            if let held = load(name, from: "inbox"), held.stamp == stamp { remove(name, from: "inbox") }
        }
    }

    // MARK: Incoming

    private func receive(_ record: CKRecord) {
        guard let key = record["key"] as? String, let stamp = (record["stamp"] as? NSNumber)?.doubleValue else { return }
        remember(record)
        let name = record.recordID.recordName
        // A newer server copy replaces an older local change that hasn't gone out yet.
        if let pending = load(name, from: "outbox"), pending.stamp <= stamp {
            remove(name, from: "outbox")
            engine.state.remove(pendingRecordZoneChanges: [.saveRecord(record.recordID)])
            if pending.stamp == stamp { return } // Our own change, already on the server.
        }
        if let held = load(name, from: "inbox"), held.stamp >= stamp { return }
        let deleted = (record["deleted"] as? NSNumber)?.boolValue ?? false
        let payload = deleted ? nil : (record["payload"] as? CKAsset)?.fileURL.flatMap { try? Data(contentsOf: $0) }.flatMap { String(data: $0, encoding: .utf8) }
        if !deleted && payload == nil { return }
        store(CloudItem(key: key, stamp: stamp, deleted: deleted, payload: payload), in: "inbox")
    }

    // MARK: CKSyncEngineDelegate

    func handleEvent(_ event: CKSyncEngine.Event, syncEngine: CKSyncEngine) async {
        #if DEBUG
        print("BeanletCloud event:", String(describing: event).prefix(300))
        #endif
        switch event {
        case .stateUpdate(let update):
            if let data = try? JSONEncoder().encode(update.stateSerialization) { try? data.write(to: stateURL, options: .atomic) }
        case .accountChange(let change):
            if case .signIn = change.changeType { break }
            // Signed out or switched account: forget the old account's server state; the web side re-sends everything.
            for box in ["outbox", "inbox", "system"] { names(in: box).forEach { remove($0, from: box) } }
            try? FileManager.default.removeItem(at: folder.appendingPathComponent("system"))
            try? FileManager.default.createDirectory(at: folder.appendingPathComponent("system"), withIntermediateDirectories: true)
            notify("reset")
        case .fetchedDatabaseChanges(let changes):
            // The zone was deleted (for example from iCloud settings): recreate it and send everything again.
            if changes.deletions.contains(where: { $0.zoneID == Self.zone }) {
                try? FileManager.default.removeItem(at: folder.appendingPathComponent("system"))
                try? FileManager.default.createDirectory(at: folder.appendingPathComponent("system"), withIntermediateDirectories: true)
                syncEngine.state.add(pendingDatabaseChanges: [.saveZone(CKRecordZone(zoneID: Self.zone))])
                notify("reset")
            }
        case .fetchedRecordZoneChanges(let changes):
            changes.modifications.forEach { receive($0.record) }
        case .didFetchChanges:
            if !names(in: "inbox").isEmpty { notify("changes") }
        case .sentRecordZoneChanges(let sent):
            for record in sent.savedRecords {
                remember(record)
                let name = record.recordID.recordName
                if let pending = load(name, from: "outbox"),
                   pending.stamp == (record["stamp"] as? NSNumber)?.doubleValue { remove(name, from: "outbox") }
            }
            var retry: [CKSyncEngine.PendingRecordZoneChange] = []
            for failed in sent.failedRecordSaves {
                let id = failed.record.recordID
                switch failed.error.code {
                case .serverRecordChanged:
                    // Someone saved first. Keep whichever change is newer.
                    if let server = failed.error.serverRecord {
                        let serverStamp = (server["stamp"] as? NSNumber)?.doubleValue ?? 0
                        if let pending = load(id.recordName, from: "outbox"), pending.stamp > serverStamp {
                            remember(server)
                            retry.append(.saveRecord(id))
                        } else {
                            receive(server)
                            notify("changes")
                        }
                    }
                case .zoneNotFound:
                    syncEngine.state.add(pendingDatabaseChanges: [.saveZone(CKRecordZone(zoneID: Self.zone))])
                    try? FileManager.default.removeItem(at: url("system", id.recordName, "data"))
                    retry.append(.saveRecord(id))
                case .unknownItem:
                    try? FileManager.default.removeItem(at: url("system", id.recordName, "data"))
                    retry.append(.saveRecord(id))
                case .assetFileModified, .batchRequestFailed, .operationCancelled:
                    // A newer copy replaced the file mid-upload, or a neighbour in the same batch failed: send again.
                    if load(id.recordName, from: "outbox") != nil { retry.append(.saveRecord(id)) }
                default:
                    break // Network, quota and account errors are retried by the sync engine.
                }
            }
            if !retry.isEmpty { syncEngine.state.add(pendingRecordZoneChanges: retry) }
        default:
            break
        }
    }

    func nextRecordZoneChangeBatch(_ context: CKSyncEngine.SendChangesContext, syncEngine: CKSyncEngine) async -> CKSyncEngine.RecordZoneChangeBatch? {
        // Photos ride along in the payloads, so send about a megabyte at a time, smallest records first, so text
        // reaches other devices quickly and each finished batch is kept even if a later one is interrupted.
        func bytes(_ change: CKSyncEngine.PendingRecordZoneChange) -> Int {
            guard case .saveRecord(let id) = change else { return 0 }
            return (try? FileManager.default.attributesOfItem(atPath: url("outbox", id.recordName, "payload").path)[.size] as? Int) ?? 0
        }
        var pending: [CKSyncEngine.PendingRecordZoneChange] = []
        var size = 0
        let changes = syncEngine.state.pendingRecordZoneChanges.filter { context.options.scope.contains($0) }
        for (change, count) in changes.map({ ($0, bytes($0)) }).sorted(by: { $0.1 < $1.1 }) {
            if !pending.isEmpty && (size + count > 1_000_000 || pending.count >= 100) { break }
            size += count
            pending.append(change)
        }
        #if DEBUG
        print("BeanletCloud batch:", pending.count, "records,", size, "bytes")
        #endif
        if pending.isEmpty { return nil }
        return await CKSyncEngine.RecordZoneChangeBatch(pendingChanges: pending) { id in
            guard let item = self.load(id.recordName, from: "outbox") else {
                syncEngine.state.remove(pendingRecordZoneChanges: [.saveRecord(id)])
                return nil
            }
            let record = self.knownRecord(id.recordName) ?? CKRecord(recordType: Self.recordType, recordID: id)
            record["key"] = item.key as NSString
            record["stamp"] = NSNumber(value: item.stamp)
            record["deleted"] = NSNumber(value: item.deleted)
            record["payload"] = item.deleted ? nil : CKAsset(fileURL: self.url("outbox", id.recordName, "payload"))
            return record
        }
    }
}
