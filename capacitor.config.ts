import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App iOS native : l'export statique Next.js (`out/`) est embarqué dans
 * l'application et servi localement (fonctionne hors ligne).
 */
const config: CapacitorConfig = {
  appId: "app.workout.personal",
  appName: "WORKOUT",
  webDir: "out",
  backgroundColor: "#121315",
  ios: {
    contentInset: "never",
    backgroundColor: "#121315",
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: "#121315",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      overlaysWebView: true,
    },
  },
};

export default config;
