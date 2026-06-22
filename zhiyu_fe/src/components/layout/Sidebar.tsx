import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";

const navItems = [
  { to: "/", label: "首页", icon: "/mascot/home.svg", end: true },
  { to: "/search", label: "搜索", icon: "/mascot/search.svg" },
  { to: "/create", label: "创作", icon: "/mascot/create.svg" },
  { to: "/learn", label: "学习", icon: "/mascot/learn.svg" },
  { to: "/profile", label: "我的", icon: "/mascot/profile.svg" },
] as const;

const Sidebar = () => {
  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo} aria-label="知域 logo">
        <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
          <path d="M16 4 L19 12 L27 13 L21 18 L23 26 L16 22 L9 26 L11 18 L5 13 L13 12 Z" fill="#FBF6EE" stroke="#5D4037" strokeWidth="2.5" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {(navItems as ReadonlyArray<{ to: string; label: string; icon: string; end?: boolean }>).map(
  ({ to, label, icon, end = false }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.linkActive}` : styles.link
            }
          >
            <img src={icon} alt="" className={styles.linkIcon} />
            <span className={styles.linkLabel}>{label}</span>
          </NavLink>
        ),
      )}
      </nav>

      {/* 云朵装饰 */}
      <div className={styles.cloudDecor} aria-hidden>
        <img src="/illustrations/cloud.svg" alt="" />
      </div>

      {/* 底部 slogan */}
      <div className={styles.footer}>
        <span className={styles.footerBrand}>知域</span>
        <span className={styles.footerSlogan}>让知识发光</span>
      </div>
    </aside>
  );
};

export default Sidebar;