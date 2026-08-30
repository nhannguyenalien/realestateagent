# Propertio mobile release setup

## Backend and database

Run `migrations/001_auth.sql` and then `migrations/002_mobile_agent.sql` against Neon. Configure Cloudflare Pages with `DATABASE_URL`, `GOOGLE_CLIENT_ID`, and either the `MEDIA_BUCKET` R2 binding plus `R2_PUBLIC_URL`, or the documented S3 variables. Never commit these secrets.

Run the app against Pages with:

```sh
flutter run --dart-define=API_BASE_URL=https://YOUR-PAGES-DOMAIN --dart-define=GOOGLE_SERVER_CLIENT_ID=YOUR-WEB-OAUTH-CLIENT.apps.googleusercontent.com
```

Google login also requires an Android OAuth client with the app SHA-1/SHA-256 and an iOS OAuth client/URL scheme in `Info.plist`. The server and Dart define use the Web OAuth client ID.

## Android

Create the upload key, copy `android/key.properties.example` to `android/key.properties`, fill its values, then run `flutter build appbundle --release`. `key.properties` and the keystore must remain private. The Gradle configuration no longer signs release builds with the debug key.

## iOS

In Xcode select the production bundle ID, Apple Developer team, distribution certificate and provisioning profile. Add the reversed Google iOS client URL scheme, then run `flutter build ipa --release` or archive from Xcode.

## Pre-store checks

- Run `flutter analyze` and `flutter test`.
- Test denied location/photo permissions, airplane mode, slow network, token expiry and offline draft sync on physical Android and iOS devices.
- Verify privacy disclosures for location, photos, camera and uploaded media.
- Replace the generated launcher artwork/splash if the final brand asset changes, increment `version` in `pubspec.yaml`, and validate screenshots/store metadata.
