import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const basePath = process.env.GITHUB_ACTIONS === "true" ? "/hush-and-heart/" : "/";

export default defineConfig({
  base: basePath,
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      router: { basepath: basePath === "/" ? "/" : basePath.slice(0, -1) },
      spa: { enabled: true },
    }),
    viteReact(),
    tailwindcss(),
  ],
});
