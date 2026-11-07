import UIKit
import Capacitor
import CoreText

/// System tab bar and navigation bar wrapped around the single web view.
/// The system places them: tab bar at the bottom and buttons top-right on a regular iPhone;
/// on iPhone Duo both move into the column on the right under the status bar, and folding is handled for us.
/// The web page tells this side which tab is active, the tab titles and icons, and which buttons belong in the bar.
final class TabsController: UITabBarController, UITabBarControllerDelegate {
    static weak var shared: TabsController?

    let bridgeVC = BeanletBridgeViewController()
    private let keys = ["beans", "brews", "catalog"]
    private var slots: [String: TabSlot] = [:]
    private var wantsBar = false
    private var overlay = false

    override func viewDidLoad() {
        super.viewDidLoad()
        TabsController.shared = self
        delegate = self
        // Only floating buttons in the navigation bar: no title, no background, the web keeps its own headings.
        let clear = UINavigationBarAppearance()
        clear.configureWithTransparentBackground()
        let list = keys.map { key -> UINavigationController in
            let slot = TabSlot(bridge: bridgeVC)
            slots[key] = slot
            let nav = UINavigationController(rootViewController: slot)
            nav.navigationBar.standardAppearance = clear
            nav.navigationBar.scrollEdgeAppearance = clear
            nav.navigationBar.compactAppearance = clear
            nav.navigationBar.tintColor = TabsController.ink
            return nav
        }
        setViewControllers(list, animated: false)
        tabBar.tintColor = TabsController.ink
        setTabFont(language: "zh")
        // Hidden until the web page sends titles and icons, so an empty bar never flashes.
        hideBar(true, animated: false)
    }

    private var tabFontLanguage = ""
    private func setTabFont(language: String) {
        guard language != tabFontLanguage, let font = TabsController.font(language == "en" ? "AnnieUseYourTelescope" : "BeanletXiaolai", size: language == "en" ? 13 : 11) else { return }
        tabFontLanguage = language
        // Set on the bar appearance (iOS 26 ignores per-item fonts) so the system glass stays.
        let ap = tabBar.standardAppearance.copy()
        for layout in [ap.stackedLayoutAppearance, ap.inlineLayoutAppearance, ap.compactInlineLayoutAppearance] {
            for state in [layout.normal, layout.selected] { state.titleTextAttributes[.font] = font }
        }
        tabBar.standardAppearance = ap
        tabBar.scrollEdgeAppearance = ap
    }

    func apply(titles: [String: String], icons: [String: (off: UIImage, on: UIImage)], active: String?, language: String?, overlay: Bool?) {
        if let language { setTabFont(language: language) }
        for (key, slot) in slots {
            guard let item = slot.navigationController?.tabBarItem else { continue }
            if let title = titles[key] { item.title = title }
            if let icon = icons[key] {
                item.image = icon.off.withRenderingMode(.alwaysOriginal)
                item.selectedImage = icon.on.withRenderingMode(.alwaysOriginal)
            }
        }
        if let active, let i = keys.firstIndex(of: active), i != selectedIndex { selectedIndex = i }
        if !titles.isEmpty { wantsBar = true }
        if let overlay { self.overlay = overlay }
        // A sheet or editor open in the web page covers the whole screen, like a pushed page: step the tab bar aside.
        let hidden = !wantsBar || self.overlay
        if barHidden != hidden { hideBar(hidden, animated: true) }
    }

    var currentSlot: TabSlot? { (selectedViewController as? UINavigationController)?.viewControllers.first as? TabSlot }

    func tabBarController(_ tabBarController: UITabBarController, didSelect viewController: UIViewController) {
        guard let i = viewControllers?.firstIndex(of: viewController) else { return }
        NativeTabsPlugin.shared?.notifyListeners("select", data: ["key": keys[i]])
    }

    // setTabBarHidden / isTabBarHidden are iOS 18+.
    private var barHidden: Bool {
        if #available(iOS 18.0, *) { return isTabBarHidden }
        return tabBar.isHidden
    }
    private func hideBar(_ hidden: Bool, animated: Bool) {
        if #available(iOS 18.0, *) { setTabBarHidden(hidden, animated: animated) } else { tabBar.isHidden = hidden }
    }

    /// Same as the web's active tab colour (#646e9d).
    static let ink = UIColor(red: 0x64 / 255, green: 0x6e / 255, blue: 0x9d / 255, alpha: 1)

    private static var registered: [String: UIFontDescriptor] = [:]
    static func font(_ name: String, size: CGFloat) -> UIFont? {
        if registered[name] == nil {
            guard let url = Bundle.main.url(forResource: name, withExtension: "ttf") else { return nil }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
            guard let first = (CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as? [CTFontDescriptor])?.first else { return nil }
            registered[name] = first as UIFontDescriptor
        }
        return registered[name].map { UIFont(descriptor: $0, size: size) }
    }
}

/// One button in the navigation bar (a web button marked for the native bar).
struct BarItem {
    let id: String
    let symbol: String
    let title: String
    let icon: UIImage?
    /// The editors' confirm button (收好 / 保存): a ✓ in the app's tint.
    let prominent: Bool
    let enabled: Bool
}

/// One tab's page: empty itself, it takes over the single web view when selected.
final class TabSlot: UIViewController {
    static var items: [BarItem] = []
    /// Set while a web editor page is on top: the bar then shows a back button and the page sits below the bar like any pushed page.
    static var back: (title: String, enabled: Bool)?
    private let bridge: UIViewController
    init(bridge: UIViewController) {
        self.bridge = bridge
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0xf5 / 255, green: 0xf6 / 255, blue: 0xfb / 255, alpha: 1)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        applyBar()
        guard bridge.parent !== self else { return }
        bridge.willMove(toParent: nil)
        bridge.view.removeFromSuperview()
        bridge.removeFromParent()
        addChild(bridge)
        bridge.view.frame = view.bounds
        bridge.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(bridge.view)
        bridge.didMove(toParent: self)
    }

    // The bar is transparent and only floats buttons, so the web page doesn't give up a whole strip for it:
    // the Beanlet logo row and these buttons share the same line, like before.
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // Main views: the transparent bar only floats buttons, so the logo row shares its line.
        // Editor pages: back and save sit in the bar, and the page's title starts below it.
        let barH = navigationController?.navigationBar.frame.height ?? 0
        let top = TabSlot.back == nil ? -barH : 0
        if additionalSafeAreaInsets.top != top { additionalSafeAreaInsets.top = top }
        if #available(iOS 26.0, *), let web = (bridge as? CAPBridgeViewController)?.webView {
            web.scrollView.topEdgeEffect.isHidden = true
        }
    }

    func applyBar() {
        if let back = TabSlot.back {
            let image = UIImage(systemName: "chevron.backward", withConfiguration: UIImage.SymbolConfiguration(weight: .semibold))?.withTintColor(TabsController.ink, renderingMode: .alwaysOriginal)
            let item = UIBarButtonItem(image: image, primaryAction: UIAction { _ in NativeTabsPlugin.shared?.notifyListeners("tap", data: ["id": "back"]) })
            item.accessibilityLabel = back.title
            item.isEnabled = back.enabled
            navigationItem.leftBarButtonItem = item
        } else {
            navigationItem.leftBarButtonItem = nil
        }
        view.setNeedsLayout()
        navigationItem.rightBarButtonItems = TabSlot.items.reversed().map { b in
            let tap = UIAction { _ in NativeTabsPlugin.shared?.notifyListeners("tap", data: ["id": b.id]) }
            if b.prominent {
                // iOS convention for confirming an editor: a ✓ in the app's tint (the title stays as the accessibility label);
                // a prominent action that names its own symbol (Edit's pencil) shows that instead.
                let check = UIImage(systemName: b.symbol.isEmpty ? "checkmark" : b.symbol, withConfiguration: UIImage.SymbolConfiguration(weight: .semibold))
                let item = UIBarButtonItem(image: check, primaryAction: tap)
                if #available(iOS 26.0, *) { item.style = .prominent } else { item.style = .done }
                item.tintColor = TabsController.ink // the app's blue-purple instead of system blue
                item.accessibilityLabel = b.title
                item.isEnabled = b.enabled
                return item
            }
            let symbol = UIImage(systemName: b.symbol, withConfiguration: UIImage.SymbolConfiguration(weight: .medium))?.withTintColor(TabsController.ink, renderingMode: .alwaysOriginal)
            let item = UIBarButtonItem(title: b.title, image: b.icon ?? symbol, primaryAction: UIAction { _ in
                NativeTabsPlugin.shared?.notifyListeners("tap", data: ["id": b.id])
            })
            item.accessibilityLabel = b.title
            return item
        }
    }
}

/// Web ⇄ native tab bar and navigation bar.
/// - set({ active?, language?, overlay?, titles?: {beans: '豆仓', …}, icons?: {beans: {off: base64PNG, on: base64PNG}, …} })
/// - bar({ items: [{ id, symbol, title, icon?, prominent?, disabled? }], back?: { title, disabled? } })  back: an editor page is on top (tap id "back")  icon: a PNG drawn by the web page, shown in its own colours; prominent: the tinted ✓ confirm button
/// - events: "select" { key } when a tab is tapped; "tap" { id } when a bar button is tapped
@objc(NativeTabsPlugin)
public class NativeTabsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeTabsPlugin"
    public let jsName = "NativeTabs"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "bar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "devSeed", returnType: CAPPluginReturnPromise)
    ]
    static weak var shared: NativeTabsPlugin?

    override public func load() {
        NativeTabsPlugin.shared = self
    }

    @objc func set(_ call: CAPPluginCall) {
        let titles = (call.getObject("titles") ?? [:]).compactMapValues { $0 as? String }
        var icons: [String: (off: UIImage, on: UIImage)] = [:]
        for (key, value) in call.getObject("icons") ?? [:] {
            guard let pair = value as? JSObject,
                  let off = NativeTabsPlugin.image(pair["off"]), let on = NativeTabsPlugin.image(pair["on"]) else { continue }
            icons[key] = (off, on)
        }
        let active = call.getString("active"), language = call.getString("language"), overlay = call.getBool("overlay")
        DispatchQueue.main.async {
            TabsController.shared?.apply(titles: titles, icons: icons, active: active, language: language, overlay: overlay)
            call.resolve()
        }
    }

    @objc func bar(_ call: CAPPluginCall) {
        let items = (call.getArray("items", JSObject.self) ?? []).compactMap { o -> BarItem? in
            guard let id = o["id"] as? String else { return nil }
            return BarItem(id: id, symbol: o["symbol"] as? String ?? "circle", title: o["title"] as? String ?? "",
                           icon: NativeTabsPlugin.image(o["icon"])?.withRenderingMode(.alwaysOriginal),
                           prominent: o["prominent"] as? Bool ?? false, enabled: !(o["disabled"] as? Bool ?? false))
        }
        let back = call.getObject("back").map { (title: $0["title"] as? String ?? "", enabled: !($0["disabled"] as? Bool ?? false)) }
        DispatchQueue.main.async {
            TabSlot.back = back
            TabSlot.items = items
            TabsController.shared?.currentSlot?.applyBar()
            call.resolve()
        }
    }

    /// Test data switch (lib/dev-seed.ts): debug builds launched with -seed 10 or -unseed only; release always answers 0.
    /// Answered once per launch so reloading the page doesn't seed again.
    private static var devSeedTaken = false
    @objc func devSeed(_ call: CAPPluginCall) {
        var n = 0, clear = false
        #if DEBUG
        let args = CommandLine.arguments
        if !NativeTabsPlugin.devSeedTaken {
            if let i = args.firstIndex(of: "-seed"), i + 1 < args.count { n = Int(args[i + 1]) ?? 0 }
            clear = args.contains("-unseed")
        }
        NativeTabsPlugin.devSeedTaken = true
        #endif
        call.resolve(["n": n, "clear": clear])
    }

    /// PNGs come from the web page at @3x.
    private static func image(_ value: JSValue?) -> UIImage? {
        guard let b64 = value as? String, let data = Data(base64Encoded: b64) else { return nil }
        return UIImage(data: data, scale: 3)
    }
}
