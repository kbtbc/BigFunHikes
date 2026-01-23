import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { vibecodePlugin } from "@vibecodeapp/webapp/plugin";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isVibecodeModeDisabled = process.env.VITE_DISABLE_VIBECODE === "true";

  return {
    server: {
      host: "::",
      port: 8000,
      allowedHosts: true, // Allow all hosts
    },
    plugins: [
      react(),
      // Only load Vibecode plugin if not disabled and in development mode
      mode === "development" && !isVibecodeModeDisabled && vibecodePlugin(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
