import { useCallback, useEffect, useRef, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import MainHeader from "@/components/layout/MainHeader";
import CourseCard from "@/components/cards/CourseCard";
import LikeFavBar from "@/components/common/LikeFavBar";
import { knowpostService } from "@/services/knowpostService";
import AuthStatus from "@/features/auth/AuthStatus";
import styles from "./HomePage.module.css";

const HomePage = () => {
  const [items, setItems] = useState<Array<{
    id: string;
    title: string;
    description: string;
    coverImage?: string;
    tags: string[];
    tagJson?: string;
    authorAvatar?: string;
    authorAvator?: string;
    authorNickname: string;
    likeCount?: number;
    favoriteCount?: number;
    liked?: boolean;
    faved?: boolean;
  }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef<boolean>(false);

  const loadFeed = useCallback(async (targetPage: number, append: boolean) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    if (!append) {
      setError(null);
    }
    try {
      const resp = await knowpostService.feed(targetPage, 20);
      const nextItems = resp.items ?? [];
      setItems(prev => {
        if (!append) return nextItems;
        const existed = new Set(prev.map(x => x.id));
        const merged = [...prev];
        nextItems.forEach(item => {
          if (!existed.has(item.id)) {
            merged.push(item);
          }
        });
        return merged;
      });
      setHasMore(!!resp.hasMore);
      setPage(resp.page ?? targetPage);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "加载失败";
      setError(msg);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed(1, false);
  }, [loadFeed]);

  const loadMore = useCallback(() => {
    if (!hasMore || fetchingRef.current) return;
    void loadFeed(page + 1, true);
  }, [hasMore, loadFeed, page]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { root: null, rootMargin: "240px 0px", threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <AppLayout
      header={
        <MainHeader
          headline="知域 · 让思想有温度，让知识会发光"
          rightSlot={<AuthStatus />}
        />
      }
    >
      {error ? <div>{error}</div> : null}
      <div className={styles.masonry}>
        {items.map(item => (
          <div key={item.id} className={styles.masonryItem}>
            <CourseCard
              id={item.id}
              title={item.title}
              summary={item.description ?? ""}
              tags={item.tags ?? []}
              authorTags={(() => {
                try {
                  return item.tagJson ? (JSON.parse(item.tagJson) as unknown[]).filter((t) => typeof t === "string") as string[] : [];
                } catch {
                  return [];
                }
              })()}
              teacher={{ name: item.authorNickname, avatarUrl: item.authorAvatar ?? item.authorAvator }}
              coverImage={item.coverImage}
                to={`/post/${item.id}`}
              footerExtra={<LikeFavBar entityId={item.id} compact initialCounts={{ like: item.likeCount ?? 0, fav: item.favoriteCount ?? 0 }} initialState={{ liked: item.liked, faved: item.faved }} />}
            />
          </div>
        ))}
        {loading ? <div className={styles.masonryItem}><div>加载中…</div></div> : null}
        {!loading && items.length === 0 ? (
          <div className={styles.masonryItem}><div>暂无内容</div></div>
        ) : null}
      </div>
      {hasMore ? <div ref={sentinelRef} style={{ height: 1 }} /> : null}
      {!hasMore && items.length > 0 ? <div style={{ textAlign: "center", color: "var(--color-text-muted)" }}>没有更多了</div> : null}
    </AppLayout>
  );
};

export default HomePage;
