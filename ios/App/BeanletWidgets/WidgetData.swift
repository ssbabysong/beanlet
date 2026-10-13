import SwiftUI
import WidgetKit

// Mirrors lib/widget-snapshot.ts. The app writes it to the shared App Group whenever the journal changes.
struct WidgetCoffee: Codable, Hashable {
    var id: String
    var name: String
    var roaster: String
    var icon: String
    var fill: String
    var line: String
    var side: String
    var remaining: Double?
    var total: Double?
    var ratio: Double?
    var thumb: String
}

struct WidgetDay: Codable, Hashable {
    var c: Int
    var k: [String]
}

struct WidgetSnapshot: Codable {
    var language: String
    var shelfCount: Int
    var shelf: [WidgetCoffee]
    var brewBean: WidgetCoffee?
    var brewKind: String
    var days: [String: WidgetDay]
}

enum WidgetStore {
    static let appGroup = "group.com.ssbabysong.beanlet"
    static var container: URL? { FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) }

    static func load() -> WidgetSnapshot? {
        guard let url = container?.appendingPathComponent("widget-snapshot.json"),
              let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    static func thumbnail(_ key: String) -> UIImage? {
        guard !key.isEmpty, let url = container?.appendingPathComponent("thumbs/\(key).png") else { return nil }
        return UIImage(contentsOfFile: url.path)
    }
}

struct BeanletEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
    var isSample = false
}

struct BeanletProvider: TimelineProvider {
    func placeholder(in context: Context) -> BeanletEntry {
        BeanletEntry(date: .now, snapshot: .sample, isSample: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (BeanletEntry) -> Void) {
        if let saved = WidgetStore.load() {
            completion(BeanletEntry(date: .now, snapshot: saved))
        } else {
            completion(BeanletEntry(date: .now, snapshot: context.isPreview ? .sample : nil, isSample: context.isPreview))
        }
    }

    // The app reloads timelines after every change; the only scheduled refresh is midnight, when "today" moves.
    func getTimeline(in context: Context, completion: @escaping (Timeline<BeanletEntry>) -> Void) {
        let calendar = Calendar.current
        let midnight = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: .now) ?? .now)
        let entry = BeanletEntry(date: .now, snapshot: WidgetStore.load())
        completion(Timeline(entries: [entry], policy: .after(midnight)))
    }
}

// MARK: - Dates

enum DayKey {
    static func string(_ date: Date) -> String {
        let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }
}

extension WidgetSnapshot {
    func cups(on date: Date) -> Int { days[DayKey.string(date)]?.c ?? 0 }
    func colors(on date: Date) -> [String] { days[DayKey.string(date)]?.k ?? [] }

    func totals(year: Int, month: Int? = nil) -> (cups: Int, activeDays: Int) {
        let prefix = month.map { String(format: "%04d-%02d-", year, $0) } ?? String(format: "%04d-", year)
        let matching = days.filter { $0.key.hasPrefix(prefix) && $0.value.c > 0 }
        return (matching.values.reduce(0) { $0 + $1.c }, matching.count)
    }

    /// Longest run of consecutive coffee days inside the year.
    func longestStreak(year: Int) -> Int {
        let calendar = Calendar.current
        guard var day = calendar.date(from: DateComponents(year: year, month: 1, day: 1)) else { return 0 }
        var best = 0, run = 0
        while calendar.component(.year, from: day) == year {
            run = cups(on: day) > 0 ? run + 1 : 0
            best = max(best, run)
            day = calendar.date(byAdding: .day, value: 1, to: day) ?? day.addingTimeInterval(86400)
        }
        return best
    }
}

// MARK: - Language

struct Copy {
    let english: Bool

    init(_ snapshot: WidgetSnapshot?) {
        if let language = snapshot?.language {
            english = language == "en"
        } else {
            english = !(Locale.preferredLanguages.first ?? "").hasPrefix("zh")
        }
    }

    var shelf: String { english ? "My shelf" : "我的豆仓" }
    func bags(_ n: Int) -> String { english ? (n == 1 ? "1 bag" : "\(n) bags") : "\(n) 包" }
    var emptyShelf: String { english ? "No beans yet" : "还没有豆豆" }
    var addBag: String { english ? "Add a bag in Beanlet" : "去 Beanlet 加一包" }
    var cups: String { english ? "cups" : "杯" }
    func coffeeDays(_ n: Int) -> String { english ? (n == 1 ? "1 coffee day" : "\(n) coffee days") : "\(n) 天有咖啡" }
    func streak(_ n: Int) -> String { english ? "Longest streak \(n)d" : "最长连续 \(n) 天" }
    var brew: String { english ? "Brew a cup" : "冲一杯" }
    func today(_ n: Int) -> String { english ? (n == 0 ? "None yet today" : "Today · \(n)") : (n == 0 ? "今天还没喝" : "今天 \(n) 杯") }
    var pickBean: String { english ? "Pick a bag" : "选一包豆子" }
    var openApp: String { english ? "Open Beanlet once to sync" : "打开一次 Beanlet 即可同步" }
    var locale: Locale { Locale(identifier: english ? "en_US" : "zh_CN") }

    var weekdays: [String] { english ? ["M", "T", "W", "T", "F", "S", "S"] : ["一", "二", "三", "四", "五", "六", "日"] }
    func monthTitle(_ date: Date) -> String {
        let format = DateFormatter()
        format.locale = locale
        format.setLocalizedDateFormatFromTemplate(english ? "MMMM" : "MMMM")
        return format.string(from: date)
    }
    func shortMonth(_ month: Int) -> String {
        english ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1] : "\(month)月"
    }
}

// MARK: - Look

enum Ink {
    static let title = Color(hex: "#3f4965")
    static let body = Color(hex: "#5d6684")
    static let muted = Color(hex: "#9aa1b8")
    static let accent = Color(hex: "#727db7")
    static let cream = Color(hex: "#fffaf0")
    static let empty = Color(hex: "#eef0f7")
    static let future = Color(hex: "#f6f7fb")
    static let heat = [Color(hex: "#cdd3ea"), Color(hex: "#a8b2d1"), Color(hex: "#7f8bbf")]
}

struct PaperBackground: View {
    var body: some View {
        LinearGradient(colors: [Color(hex: "#ffffff"), Color(hex: "#f3f4fb")], startPoint: .top, endPoint: .bottom)
    }
}

extension Font {
    /// The app's handwriting: Xiaolai for Chinese, Annie Use Your Telescope for English.
    static func hand(_ size: CGFloat, _ copy: Copy) -> Font {
        copy.english ? .custom("AnnieUseYourTelescope-Regular", size: size * 1.12) : .custom("Xiaolai", size: size)
    }
    static func number(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }
}

extension Color {
    init(hex: String) {
        let value = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16) ?? 0xdce7f1
        self.init(red: Double((value >> 16) & 0xff) / 255, green: Double((value >> 8) & 0xff) / 255, blue: Double(value & 0xff) / 255)
    }
}

extension URL {
    static let brew = URL(string: "beanlet://brew")!
    static let shelf = URL(string: "beanlet://shelf")!
    static let calendar = URL(string: "beanlet://calendar")!
    static let year = URL(string: "beanlet://year")!
    static func bean(_ id: String) -> URL {
        URL(string: "beanlet://bean/" + (id.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? id))!
    }
}

// MARK: - Gallery sample

extension WidgetSnapshot {
    static var sample: WidgetSnapshot {
        let calendar = Calendar.current
        var days: [String: WidgetDay] = [:]
        let colors = ["#e9dff0", "#dce7f1", "#f2e0db", "#e3e9d7"]
        for offset in 0..<300 where offset % 3 != 1 && offset % 7 != 5 {
            guard let date = calendar.date(byAdding: .day, value: -offset, to: .now) else { continue }
            days[DayKey.string(date)] = WidgetDay(c: 1 + offset % 3, k: [colors[offset % colors.count]])
        }
        let english = !(Locale.preferredLanguages.first ?? "").hasPrefix("zh")
        let shelf = [
            WidgetCoffee(id: "a", name: english ? "Letty" : "蕾蒂", roaster: "", icon: "peach", fill: "#f2e0db", line: "#bc9f95", side: "#e6ccc4", remaining: 140, total: 250, ratio: 0.56, thumb: ""),
            WidgetCoffee(id: "b", name: english ? "Jasmine" : "茉莉花香", roaster: "", icon: "jasmine", fill: "#e9dff0", line: "#a297af", side: "#d7cce1", remaining: 200, total: 200, ratio: 1, thumb: ""),
            WidgetCoffee(id: "c", name: english ? "Berry" : "莓果", roaster: "", icon: "berry", fill: "#f1dce0", line: "#b89b9f", side: "#e4c5cd", remaining: 45, total: 200, ratio: 0.22, thumb: ""),
            WidgetCoffee(id: "d", name: english ? "Cocoa" : "可可", roaster: "", icon: "chocolate", fill: "#f0e6d6", line: "#afa38c", side: "#e1d3bd", remaining: nil, total: nil, ratio: nil, thumb: ""),
        ]
        return WidgetSnapshot(language: english ? "en" : "zh", shelfCount: 5, shelf: shelf, brewBean: shelf[0], brewKind: "pourOver", days: days)
    }
}
