# Android TWA Packaging

KnowYourCalories stays web-first. The production app still deploys to Vercel as a normal PWA, and the Android APK/AAB is a thin Trusted Web Activity wrapper around the same live site.

## PWA Requirements

Before generating an Android wrapper, confirm these web assets are already live:

- `https://your-domain/manifest.webmanifest`
- `https://your-domain/sw.js`
- `https://your-domain/icons/icon-192.png`
- `https://your-domain/icons/icon-512.png`
- `https://your-domain/icons/icon-maskable-512.png`

Current KnowYourCalories manifest expectations:

- `name`: `KnowYourCalories`
- `short_name`: `KYC`
- `display`: `standalone`
- `theme_color`: `#4eb8a3`
- `background_color`: `#f4faf7`

Replace the icon placeholder PNGs in `public/icons/` with final production artwork before Play Store release.

## Bubblewrap Setup

Install Bubblewrap globally:

```bash
npm i -g @bubblewrap/cli
```

Initialize the Android wrapper from the deployed manifest:

```bash
bubblewrap init --manifest=https://your-domain/manifest.webmanifest
```

Recommended values during setup:

- Application name: `KnowYourCalories`
- Launcher name: `KYC`
- Start URL: `https://your-domain/`
- Package id: `com.yourcompany.knowyourcalories`
- Display mode: `standalone`
- Theme color: `#4eb8a3`
- Background color: `#f4faf7`

Build an APK or App Bundle:

```bash
bubblewrap build
```

Install on a connected Android device for local testing:

```bash
bubblewrap install
```

If you need to refresh the Android wrapper after manifest updates:

```bash
bubblewrap merge
bubblewrap update
bubblewrap build
```

## assetlinks.json Setup

Trusted Web Activity verification depends on a valid Digital Asset Links file served from:

```text
https://your-domain/.well-known/assetlinks.json
```

The file must be served over HTTPS, without redirects, and with `application/json`.

Template:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.yourcompany.knowyourcalories",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:AA:BB"
      ]
    }
  }
]
```

How to fill it in:

1. Use the same package name you chose in Bubblewrap.
2. Use the SHA-256 fingerprint for the certificate that signs the Android app users will actually install.
3. If you publish through Play App Signing, use the Play signing certificate fingerprint for production verification.
4. Deploy the file to `public/.well-known/assetlinks.json` once the final package name and fingerprint are known.

Example deployment path in this repo:

```text
public/.well-known/assetlinks.json
```

## Samsung Phone Test Checklist

Use a real Samsung Android phone before release.

- Confirm the live site opens correctly in Chrome on the phone.
- Confirm the live site opens correctly in Samsung Internet.
- In Chrome, install the PWA from the browser menu and verify the app branding shows `KnowYourCalories`, with `KYC` used only where Android prefers the manifest short name.
- Open the installed PWA and confirm splash screen, icon, theme color, and standalone full-screen behavior.
- Verify sign-in works with Google.
- Verify protected routes redirect correctly when signed out.
- Verify camera capture works for a meal photo.
- Verify gallery upload works for a meal photo.
- Verify the meal stays saved if AI analysis fails or the app is backgrounded.
- Verify bottom navigation is reachable with one hand.
- Verify dashboard chart, history, verification, and settings all render cleanly on the Samsung screen size.
- Install the Bubblewrap-generated APK and confirm the app launches without browser chrome.
- Confirm App Links / TWA verification succeeds and does not fall back to a Custom Tab.
- Confirm `https://your-domain/.well-known/assetlinks.json` is reachable directly on the phone.

Useful Android verification commands from a development machine:

```bash
adb shell pm get-app-links com.yourcompany.knowyourcalories
adb install app-release-signed.apk
```

## Release Notes

- Keep Vercel as the source of truth for the live app.
- Do not fork the UI or data logic for Android.
- Treat the Android wrapper as packaging only.
- Any PWA manifest, icon, or navigation updates should be made in the web app first, then merged into the Bubblewrap wrapper.

## References

- Chrome for Developers TWA quick start: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
- Chrome for Developers digital asset links overview for TWA: https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs
- Android assetlinks.json setup: https://developer.android.com/training/app-links/configure-assetlinks
- Android app link verification: https://developer.android.com/training/app-links/verify-applinks
