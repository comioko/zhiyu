import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import MainHeader from "@/components/layout/MainHeader";
import AuthStatus from "@/features/auth/AuthStatus";
import { useAuth } from "@/context/AuthContext";
import { communityService } from "@/services/communityService";
import type { NotificationItem } from "@/types/community";
import styles from "./NotificationsPage.module.css";

const notificationText: Record<NotificationItem["type"], string> = {
  like: "赞了你的知文", fav: "收藏了你的知文", follow: "关注了你", comment: "评论了你的知文", reply: "回复了你", mention: "在评论中提到了你"
};

const NotificationsPage = () => {
  const { user, tokens } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    try {
      const response = await communityService.notifications(1, 50, tokens.accessToken);
      setItems(response.items); setUnread(response.unreadCount);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [tokens?.accessToken]);
  return <AppLayout header={<MainHeader headline="通知中心" subtitle="互动不会错过" rightSlot={<AuthStatus />} />}>
    {!user ? <div className={styles.empty}>登录后查看与你有关的点赞、评论和关注。</div> : <>
      <div className={styles.actions}>
        <span>未读 {unread} 条</span>
        <button type="button" className="ghost-button" disabled={!unread} onClick={async () => {
          if (!tokens?.accessToken) return;
          await communityService.markAllNotificationsRead(tokens.accessToken); await load();
        }}>全部标为已读</button>
      </div>
      <div className={styles.list}>
        {items.map(item => <Link key={item.id} to={item.postId ? `/post/${item.postId}` : "/profile"} className={`${styles.item} ${item.read ? "" : styles.unread}`}>
          <div className={styles.avatar}>{item.actorAvatar ? <img src={item.actorAvatar} alt="" /> : item.actorNickname.charAt(0)}</div>
          <div className={styles.message}><b>{item.actorNickname}</b>{notificationText[item.type]}{item.content ? <p>“{item.content}”</p> : null}<time>{new Date(item.createdAt).toLocaleString("zh-CN")}</time></div>
        </Link>)}
        {!loading && !items.length ? <div className={styles.empty}>暂时没有新通知，去发现更多知识吧。</div> : null}
      </div>
    </>}
  </AppLayout>;
};
export default NotificationsPage;
