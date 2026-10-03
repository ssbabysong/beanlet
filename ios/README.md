# Beanlet for iPhone

This Capacitor app bundles the Beanlet UI, fonts, illustrations and catalog for offline use. It uses its own on-device IndexedDB database. Safari and the app do not share storage: export a JSON backup in the website settings, then import that file in the app's personal management screen.

## Build and run

1. Install dependencies: `npm ci` (Node 22.13+).
2. Sync the iOS bundle: `npm run ios:sync`.
3. Open Xcode: `npm run ios:open`.
4. Select the App target, choose your own Apple account team under Signing & Capabilities, and select the connected iPhone.
5. Enable Developer Mode on the iPhone, trust this Mac, then Run.

The bundle identifier is `com.ssbabysong.beanlet`. Xcode handles development provisioning. Personal Team provisioning is temporary and may need rebuilding after it expires. App Store/TestFlight distribution needs an active developer membership and separate distribution setup.

The existing coffee-bag image is the iOS app icon. Native backup export opens the system share sheet (Save to Files or AirDrop); backup import uses the system file picker. Photos remain local to the app.

`npm run ios:sync` builds to ignored `dist-ios/`, separately from GitHub Pages' `docs/`. Do not set a remote `server.url` for the installed app. Generated native web assets are ignored and recreated during sync. Keep the Xcode project and `Package.resolved` in version control; exclude signing secrets and local build outputs.
