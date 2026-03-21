import { defineConfig } from "vite";
import motionCanvas from "@motion-canvas/vite-plugin";

export default defineConfig({
  plugins: [
    motionCanvas.default({
      project: ["./src/project.ts"],
    }),
  ],
});
