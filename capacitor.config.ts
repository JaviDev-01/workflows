import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "bookmol.beta",
  appName: "Bookmol",
  webDir: "dist",
  plugins: {
    CapacitorUpdater: {
      autoUpdate: true
    } 
  }
};

export default config;
