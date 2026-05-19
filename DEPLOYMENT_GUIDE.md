# Mobile Deployment Guide

This guide explains how to build and deploy **Matrix AC Service** to the Google Play Store and Apple App Store using Capacitor.

## Prerequisites

1.  **Node.js**: Installed on your machine.
2.  **Android Studio**: For Android deployment.
3.  **Xcode**: For iOS deployment (requires a macOS computer).
4.  **Developer Accounts**:
    *   [Google Play Console](https://play.google.com/console/signup) ($25 one-time fee).
    *   [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).

---

## Step 1: Initial Setup

I have already installed the core Capacitor dependencies and created the `capacitor.config.json` file. 

## Step 2: Build the Web Project

Before creating native projects, you must generate the web build:

```bash
npm run build
```

## Step 3: Add Native Platforms

Run the following commands to create the native project folders:

```bash
# Add Android
npx cap add android

# Add iOS (macOS required)
npx cap add ios
```

## Step 4: Sync Changes

Whenever you update your code and run `npm run build`, you must sync those changes to the native projects:

```bash
npx cap sync
```

---

## Step 5: Android Deployment (Google Play Store)

1.  **Open Android Studio**:
    ```bash
    npx cap open android
    ```
2.  **Generate a Key Store**:
    *   Go to `Build` > `Generate Signed Bundle / APK...`
    *   Choose `Android App Bundle` (preferred for Play Store).
    *   Follow the wizard to create a new Key Store file (`.jks`). **Keep this file and password safe!** You cannot update your app without them.
3.  **Build Signed Bundle**:
    *   Complete the wizard to build your `.aab` file.
4.  **Upload to Play Console**:
    *   Create a new App in your Google Play Console.
    *   Upload the `.aab` file to "Internal Testing" or "Production".

---

## Step 6: iOS Deployment (Apple App Store)

1.  **Open Xcode**:
    ```bash
    npx cap open ios
    ```
2.  **Configure App Identity**:
    *   Select the `App` target.
    *   In `Signing & Capabilities`, select your development team.
    *   Ensure the `Bundle Identifier` is unique (e.g., `com.yourcompany.matrixac`).
3.  **Archive the App**:
    *   Select `Product` > `Destination` > `Any iOS Device (arm64)`.
    *   Select `Product` > `Archive`.
4.  **Distribute**:
    *   Once archiving is done, click `Distribute App` in the Organizer window.
    *   Choose `App Store Connect` and follow the steps to upload.

---

## Important Branding Assets

You will need the following for both stores:
*   **App Icon**: 1024x1024px PNG (no transparency for iOS).
*   **Splash Screen**: 2732x2732px (Capacitor can generate this).
*   **Screenshots**: 
    *   Android: At least 2-8 images, 16:9 or 9:16 aspect ratio.
    *   iOS: 6.5" and 5.5" iPhone display sizes.

See `STORE_LISTINGS.md` for description templates.
