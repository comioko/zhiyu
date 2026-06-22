import { useEffect, useState } from "react";

/**
 * 监听媒体查询，返回当前是否匹配
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/**
 * 响应式断点预设
 */
export const breakpoints = {
  sm: "(max-width: 599px)",
  md: "(min-width: 600px) and (max-width: 899px)",
  lg: "(min-width: 900px) and (max-width: 1199px)",
  xl: "(min-width: 1200px)",
  mobile: "(max-width: 899px)",
  desktop: "(min-width: 900px)",
} as const;