import { NavLink } from "react-router-dom";
import { useMediaQuery, breakpoints } from "@/hooks/useMediaQuery";
import styles from "./BottomTabBar.module.css";

const items = [
  { to: "/", label: "首页", icon: "/mascot/home.svg", end: true },
  { to: "/search", label: "搜索", icon: "/mascot/search.svg" },
  { to: "/create", label: "创作", icon: "/mascot/create.svg" },
  { to: "/learn", label: "学习", icon: "/mascot/learn.svg" },
  { to: "/profile", label: "我的", icon: "/mascot/profile.svg" },
];

const BottomTabBar = () => {
  const visible = useMediaQuery(breakpoints.mobile);
  if (!visible) return null;

  return (
    <nav className={styles.bar} aria-label="底部导航">
      {items.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.linkActive}` : styles.link
          }
        >
          <img src={icon} alt="" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomTabBar;