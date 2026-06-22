import { useEffect, useMemo, useState } from "react";
import { relationService } from "@/services/relationService";
import { useAuth } from "@/context/AuthContext";
import type { ProfileResponse } from "@/types/profile";
import Button from "@/components/ui/Button";
import styles from "./RelationListModal.module.css";

type Mode = "following" | "followers";

type RelationListModalProps = {
  open: boolean;
  onClose: () => void;
  userId: number;
  mode: Mode;
};

const initialLimit = 20;

const initialChar = (name?: string, id?: number) =>
  name?.trim().charAt(0).toUpperCase() ||
  String(id ?? "").trim().charAt(0).toUpperCase() ||
  "?";

const RelationListModal = ({ open, onClose, userId, mode }: RelationListModalProps) => {
  const title = useMemo(() => (mode === "following" ? "关注列表" : "粉丝列表"), [mode]);
  const { tokens } = useAuth();
  const [profiles, setProfiles] = useState<ProfileResponse[]>([]);
  const [offset, setOffset] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      if (!tokens?.accessToken) {
        setError("请登录后查看列表");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const resp =
          mode === "following"
            ? await relationService.following(userId, initialLimit, 0, undefined, tokens.accessToken)
            : await relationService.followers(userId, initialLimit, 0, undefined, tokens.accessToken);
        if (cancelled) return;
        const list = Array.isArray(resp) ? resp : [];
        setProfiles(list);
        setOffset(list.length);
        setHasMore(list.length >= initialLimit);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "加载失败";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [open, userId, mode, tokens?.accessToken]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    if (!tokens?.accessToken) {
      setError("请登录后查看列表");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp =
        mode === "following"
          ? await relationService.following(userId, initialLimit, offset, undefined, tokens.accessToken)
          : await relationService.followers(userId, initialLimit, offset, undefined, tokens.accessToken);
      const list = Array.isArray(resp) ? resp : [];
      setProfiles(prev => [...prev, ...list]);
      setOffset(prev => prev + list.length);
      setHasMore(list.length >= initialLimit);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "加载失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.close} onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className={styles.body}>
          {error ? <div className={styles.error}>{error}</div> : null}
          {profiles.length === 0 && !loading ? (
            <div className={styles.empty}>暂无数据</div>
          ) : (
            <div className={styles.list}>
              {profiles.map(p => (
                <div key={p.id} className={styles.item}>
                  <div className={styles.avatar}>
                    {p.avatar ? (
                      <img className={styles.avatarImg} src={p.avatar} alt={p.nickname} />
                    ) : (
                      initialChar(p.nickname, p.id)
                    )}
                  </div>
                  <div className={styles.name}>{p.nickname || "知域用户"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.footer}>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMore}
            disabled={!hasMore || loading}
            loading={loading}
          >
            {!hasMore ? "没有更多" : "加载更多"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RelationListModal;