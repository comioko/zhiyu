// 单一源 design token
// 同步输出到 :root CSS 变量 + Tailwind preset + JS 业务代码

export const palette = {
  // 奶茶 / 米色 系
  milk: "#F5EFE6", // 页面主背景
  cream: "#FBF6EE", // 面板
  creamSoft: "rgba(251, 246, 238, 0.9)", // 半透面板

  // 可可 / 棕 系（描边 + 主文字）
  cocoa: "#5D4037", // 描边专用
  cocoaDeep: "#3E2723", // 主文字
  cocoaSoft: "#8D6E63", // 副文字
  cocoaLight: "#C4B5A8", // 降饱和文字

  // 浅蓝（选中/装饰）
  sky: "#B8D8E8",
  skyDeep: "#7AB5CC",

  // 抹茶绿（成功）
  matcha: "#A8C99B",
  matchaDeep: "#7FAB6F",

  // 暗粉（警示）
  warning: "#D88C8C",
  warningDeep: "#B96A6A",

  // 蜜桃黄（点缀）
  peach: "#FFD9B8",
  peachDeep: "#FFB17A",
} as const;

export const radius = {
  input: "20px",
  button: "24px",
  panel: "32px",
  pill: "999px",
} as const;

export const stroke = {
  base: "3px solid #5D4037",
  thin: "2px solid #5D4037",
  dashed: "3px dashed #5D4037",
} as const;

export const shadow = {
  // 平面卡通硬阴影（无 blur）
  toy: "4px 4px 0 #5D4037",
  toyLg: "6px 6px 0 #5D4037",
  toySm: "2px 2px 0 #5D4037",
  toyMuted: "2px 2px 0 #C4B5A8",
  // focus 外环
  focus: "0 0 0 4px #B8D8E8",
} as const;

export const layout = {
  sidebarWidth: 104,
  sidebarWidthCollapsed: 80,
  bottomTabHeight: 64,
  maxPageWidth: 1280,
  headerHeight: 88,
} as const;

// CSS 变量输出（被 src/index.css 引用）
export const cssVars = `
  --color-milk: ${palette.milk};
  --color-cream: ${palette.cream};
  --color-cream-soft: ${palette.creamSoft};
  --color-cocoa: ${palette.cocoa};
  --color-cocoa-deep: ${palette.cocoaDeep};
  --color-cocoa-soft: ${palette.cocoaSoft};
  --color-cocoa-light: ${palette.cocoaLight};
  --color-sky: ${palette.sky};
  --color-sky-deep: ${palette.skyDeep};
  --color-matcha: ${palette.matcha};
  --color-matcha-deep: ${palette.matchaDeep};
  --color-warning: ${palette.warning};
  --color-warning-deep: ${palette.warningDeep};
  --color-peach: ${palette.peach};

  --radius-input: ${radius.input};
  --radius-button: ${radius.button};
  --radius-panel: ${radius.panel};
  --radius-pill: ${radius.pill};

  --stroke-base: ${stroke.base};
  --stroke-thin: ${stroke.thin};

  --shadow-toy: ${shadow.toy};
  --shadow-toy-lg: ${shadow.toyLg};
  --shadow-toy-sm: ${shadow.toySm};
  --shadow-toy-muted: ${shadow.toyMuted};
  --shadow-focus: ${shadow.focus};

  --sidebar-width: ${layout.sidebarWidth}px;
  --sidebar-width-collapsed: ${layout.sidebarWidthCollapsed}px;
  --bottom-tab-height: ${layout.bottomTabHeight}px;
`;

export type Palette = typeof palette;
export type Radius = typeof radius;
export type Stroke = typeof stroke;
export type Shadow = typeof shadow;