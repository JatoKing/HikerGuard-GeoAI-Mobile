# HikerGuard GeoAI 🥾

A GeoAI-powered hiking safety companion built with [Expo](https://expo.dev) and [Expo Router](https://docs.expo.dev/router/introduction).

## Tech stack

- **Framework:** Expo SDK 54 (`expo ~54.0.35`), React Native 0.81.5, React 19.1
- **Routing:** Expo Router (file-based routing, typed routes enabled)
- **UI:** Custom-built components — `expo-linear-gradient`, `expo-blur` (glassmorphism), `lottie-react-native` (animated illustrations), `react-native-reanimated` + `react-native-worklets` (gesture/animation), `@expo/vector-icons`
- **Navigation:** `@react-navigation/native`, `@react-navigation/bottom-tabs`
- **Other:** `expo-haptics`, `expo-image`, `expo-splash-screen`, `expo-system-ui`, `react-native-svg`, `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`
- **New Architecture:** enabled (`newArchEnabled: true`), React Compiler experiment enabled
- **Language:** TypeScript

> Note: [HeroUI Native](./.heroui-docs/native) docs are indexed in this repo for future adoption, but the component library is not yet installed — current screens (e.g. [app/index.tsx](app/index.tsx)) use hand-rolled components on top of the packages above.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Project structure

```
app/
  index.tsx          # Landing / login screen (Lottie background, animated login buttons)
  (tabs)/            # Tab navigator
    index.tsx
    explore.tsx
  modal.tsx
components/          # Shared UI building blocks (themed text/view, parallax scroll, icons, etc.)
constants/           # Theme constants
hooks/               # Shared hooks
```

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
