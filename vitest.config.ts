import { defineConfig } from "vitest/config"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"

// The app config loads the TanStack Start and Nitro plugins, which resolve
// React through server conditions and break component rendering under jsdom.
// Tests only need path aliases and JSX.
export default defineConfig({
  plugins: [viteTsConfigPaths({ projects: ["./tsconfig.json"] }), viteReact()],
})
