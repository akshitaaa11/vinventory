import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { assertNoDevAuthInBuild } from "./src/dev/build-guard.ts";

export default defineConfig(({ command }) => {
  assertNoDevAuthInBuild(command, process.env);
  return {
    plugins: [react()],
    server: {
      host: "localhost",
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": "http://127.0.0.1:3000",
        "/auth": "http://127.0.0.1:3000",
      },
    },
  };
});
