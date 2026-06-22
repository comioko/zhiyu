// 字体系统：MiSans 中文 + Quicksand 英文（圆润 + 现代）

export const fontFamilies = {
  sans: [
    '"Quicksand"',
    '"MiSans"',
    '"PingFang SC"',
    '"HarmonyOS"',
    '"SF Pro Display"',
    '"Helvetica Neue"',
    "Inter",
    "system-ui",
    "sans-serif",
  ].join(", "),
  mono: [
    '"JetBrains Mono"',
    '"SF Mono"',
    "Menlo",
    "monospace",
  ].join(", "),
} as const;

export const fontSizes = {
  xs: "12px",
  sm: "14px",
  base: "16px",
  lg: "18px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "30px",
  "4xl": "36px",
  "5xl": "48px",
} as const;

export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const lineHeights = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// @font-face 输出（被 src/index.css 引用）
export const fontFaceCss = `
  @font-face {
    font-family: 'MiSans';
    src: local('MiSans-Regular'), local('MiSans');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'MiSans';
    src: local('MiSans-Bold'), local('MiSans-Semibold');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Quicksand';
    src: local('Quicksand Regular'), local('Quicksand-Regular');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Quicksand';
    src: local('Quicksand Bold'), local('Quicksand-Bold');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }
`;