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
      // Proxy API requests and static files to backend - this makes everything same-origin so cookies work
      proxy: {
        "/api": {
          // Use VITE_BACKEND_URL if set, otherwise default to 127.0.0.1 (IPv4) instead of localhost
          // This avoids IPv6 resolution issues
          target: process.env.VITE_BACKEND_URL || "http://127.0.0.1:3000",
          changeOrigin: true,
          secure: false,
        },
        "/public": {
          // Proxy static file requests (uploads) to backend
          target: process.env.VITE_BACKEND_URL || "http://127.0.0.1:3000",
          changeOrigin: true,
          secure: false,
        },
      },
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
