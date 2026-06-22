import type { Config } from "tailwindcss";
import { tailwindPreset } from "./src/theme/tailwind-preset";

export default {
  presets: [tailwindPreset],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
} satisfies Config;