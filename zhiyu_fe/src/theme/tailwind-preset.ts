// Tailwind preset —— 把奶茶+可可 token 注入 tailwind.config
import type { Config } from "tailwindcss";
import { palette, radius, shadow } from "./tokens";
import { fontFamilies, fontSizes, fontWeights } from "./typography";

export const tailwindPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        // 保留 keys（避免破坏 Login/Register 已用的 className）值改奶茶+可可
        primary: {
          DEFAULT: palette.cocoa,
          soft: palette.cream,
          strong: palette.cocoaDeep,
        },
        secondary: {
          DEFAULT: palette.matcha,
          soft: "#D4E5C8",
        },
        accent: {
          DEFAULT: palette.sky,
          strong: palette.skyDeep,
        },
        // 米色系（替代旧的 cream-*）
        milk: {
          DEFAULT: palette.milk,
          50: "#FFFCF8",
          100: palette.milk,
          200: palette.cream,
          300: "#E8DCC9",
        },
        cream: {
          DEFAULT: palette.cream,
          50: "#FFFCF8",
          100: palette.milk,
          200: palette.cream,
          300: "#E8DCC9",
        },
        // 棕系文字
        ink: {
          DEFAULT: palette.cocoaDeep,
          900: palette.cocoaDeep,
          700: palette.cocoa,
          500: palette.cocoaSoft,
          300: palette.cocoaLight,
        },
        cocoa: {
          DEFAULT: palette.cocoa,
          deep: palette.cocoaDeep,
          soft: palette.cocoaSoft,
          light: palette.cocoaLight,
        },
        sky: {
          DEFAULT: palette.sky,
          deep: palette.skyDeep,
        },
        matcha: {
          DEFAULT: palette.matcha,
          deep: palette.matchaDeep,
        },
        warning: {
          DEFAULT: palette.warning,
          deep: palette.warningDeep,
        },
        peach: {
          DEFAULT: palette.peach,
          deep: palette.peachDeep,
        },
      },
      fontFamily: {
        sans: fontFamilies.sans.split(", "),
        mono: fontFamilies.mono.split(", "),
      },
      fontSize: fontSizes,
      fontWeight: fontWeights,
      borderRadius: {
        input: radius.input,
        button: radius.button,
        panel: radius.panel,
        pill: radius.pill,
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "1.75rem",
      },
      boxShadow: {
        toy: shadow.toy,
        "toy-lg": shadow.toyLg,
        "toy-sm": shadow.toySm,
        "toy-muted": shadow.toyMuted,
        focus: shadow.focus,
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        bounceTiny: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        fadeUp: "fadeUp 0.4s ease-out",
        "bounce-tiny": "bounceTiny 0.4s ease-in-out",
      },
    },
  },
};