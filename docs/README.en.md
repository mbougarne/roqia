# Roqia App Technical Documentation

This document provides a technical overview of the Roqia mobile app, including architecture, app flow, persistence, notifications, deep linking, and development operations.

## 1. Project Overview

Roqia is an Arabic-first mobile app focused on curated Islamic content:
- Ruqya text collections
- Daily Adhkar (Morning, Night, Before Sleep)
- Duaa and Tasbihat content
- Optional audio playback for supported items

The app is maintained as a React Native project with TypeScript source files.

## 2. Platform Scope

Current practical target:
- Android (actively used and validated)

Repository also contains:
- iOS project scaffolding under ios/

## 3. Stack and Core Dependencies

Framework and language:
- React Native 0.84.x
- React 19.x
- TypeScript

Navigation:
- @react-navigation/native
- Bottom tabs + drawer + nested stack navigation

State and persistence:
- React Context providers for theme and scoped repeat counters
- AsyncStorage for app state and first-run flags

Media and UI:
- react-native-video for audio playback
- react-native-vector-icons
- react-native-safe-area-context

Notifications:
- @notifee/react-native for daily reminder scheduling and notification events

## 4. High-Level Structure

Top-level relevant paths:
- src/App.tsx: App bootstrap, providers, hydration, splash, onboarding modals
- src/navigation/: Navigation container and linking configuration
- src/services/notifications.ts: Reminder scheduling + notification deep-link integration
- src/services/persistence.ts: AsyncStorage helpers and flags
- src/data/index.ts: Main content datasets and noteData metadata
- src/components/: UI building blocks and modal components

## 5. Startup and Runtime Flow

At startup, the app performs these steps:
1. Initializes daily reminders.
2. Hydrates persisted app state (theme + repeat counters).
3. Loads first-run flags from storage.
4. Shows splash screen.
5. Presents onboarding sequence when needed:
   - Walkthrough modal (one-time)
   - Intro note modal (one-time, shown after walkthrough)
6. Renders main navigation once splash is finished.

## 6. One-Time Modal Sequencing

Two first-run modals are persisted independently:
- Walkthrough seen flag
- Intro note seen flag

Behavior:
- If walkthrough is not seen, it appears first.
- After walkthrough completion, intro note appears (if not seen).
- Intro note content is sourced from noteData.title and noteData.content.
- Both are saved as one-time flags in AsyncStorage.

## 7. Data Model

Main content lives in src/data/index.ts and includes:
- data: core ruqya entries
- adkarData: categorized daily adhkar
- duaaData
- tasbihatData
- noteData: metadata and static informational text

The noteData object also contains contact links and policy URLs used across the app.

## 8. Repeat Counter Design

Repeat counters are initialized from datasets and scoped by section:
- data
- adkar
- duaa
- tasbihat

State strategy:
- Each section has its own context for better rendering isolation.
- App-level reset resets all scopes.
- Per-screen reset is handled through scoped keys.

Persistence strategy:
- Counters are merged and saved as one payload.
- Hydration restores counters and merges with current defaults.

## 9. Notifications and Deep Linking

Notifications are powered by Notifee and include route context in payload data.

Deep-link handling strategy:
- Notification press events are translated to app URLs.
- Cold-start routing is handled inside Navigation linking lifecycle for reliability.
- Linking prefixes include the custom scheme roqia://.

Android manifest includes intent filter support for the app scheme.

## 10. App Styling Approach

The app uses a theme context with light/dark modes:
- Consistent text color and background tokens from a central theme map
- Reusable StyledText component for typography consistency
- Arabic-first layout direction and readability considerations

## 11. Build, Run, and Scripts

Common scripts from package.json:
- yarn start
- yarn android
- yarn test
- yarn lint

Release helper:
- yarn build:release

Keystore helper:
- yarn gen:keystore

## 12. Development Notes

Useful operational notes:
- If Metro gets stuck, clear port 8081 and restart Metro.
- Android deep-link and notification behavior should be validated on real installs after manifest or linking changes.
- When changing local type overrides (for example notifee-react-native.d.ts), verify APIs are not accidentally hidden.

## 13. QA Checklist for Feature Work

For changes touching navigation, reminders, or onboarding:
- Verify warm-start notification tap routing.
- Verify cold-start notification tap routing.
- Verify walkthrough appears only once on fresh install.
- Verify intro note appears once and only after walkthrough.
- Verify repeat counters persist after app restart.
- Verify Arabic text readability in both light and dark themes.

## 14. Legal and Product References

Reference docs in this repository:
- docs/privacy-policy.md
- docs/terms-of-use.md

Public URLs:
- Privacy: https://roqia.name/privacy
- Terms: https://roqia.name/terms
