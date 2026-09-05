import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import MainHeader from "@/components/layout/MainHeader";
import Tag from "@/components/common/Tag";
import SectionHeader from "@/components/common/SectionHeader";
import { ArrowRightIcon } from "@/components/icons/Icon";
import AuthStatus from "@/features/auth/AuthStatus";
import styles from "./CourseDetailPage.module.css";
import { knowpostService } from "@/services/knowpostService";
import { useAuth } from "@/context/AuthContext";
import type { KnowpostDetailResponse } from "@/types/knowpost";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import LikeFavBar from "@/components/common/LikeFavBar";
import FollowButton from "@/components/common/FollowButton";
import { communityService } from "@/services/communityService";
import type { Comment, LearningAssistantResult, LearningAssistantType } from "@/types/community";

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tokens, user } = useAuth();
  const [detail, setDetail] = useState<KnowpostDetailResponse | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [contentText, setContentText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(0);
  const [contentError, setContentError] = useState<string | null>(null);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);
  const [showNavLeft, setShowNavLeft] = useState(false);
  const [showNavRight, setShowNavRight] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  // RAG 问答状态
  const [ragQuestion, setRagQuestion] = useState<string>("");
  const [ragAnswer, setRagAnswer] = useState<string>("");
  const [ragLoading, setRagLoading] = useState<boolean>(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const ragESRef = useRef<EventSource | null>(null);
  const [ragTopK, setRagTopK] = useState<number>(5);
  const [ragMaxTokens, setRagMaxTokens] = useState<number>(1024);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [assistantType, setAssistantType] = useState<LearningAssistantType>("outline");
  const [assistantResult, setAssistantResult] = useState<LearningAssistantResult | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  // 从头像 URL 推断作者 ID（示例：.../avatars/3-xxxx.jpg → 3）
  const parseAvatarUserId = (url?: string): number | undefined => {
    if (!url) return undefined;
    const m = url.match(/\/avatars\/(\d+)-/);
    return m ? Number(m[1]) : undefined;
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) return;
      setError(null);
      try {
        const resp = await knowpostService.detail(id, tokens?.accessToken ?? undefined);
        if (cancelled) return;
        setDetail(resp);
        setActiveImage(0);
        // 异步加载正文内容
        if (resp.contentUrl) {
          const allowAnonymous = resp.visible === "public";
          if (allowAnonymous || !!tokens?.accessToken) {
            try {
              const text = await fetch(resp.contentUrl, { credentials: "omit" }).then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.text();
              });
              if (!cancelled) {
                setContentText(text);
                setContentError(null);
              }
            } catch (e) {
              if (!cancelled) setContentError("正文暂不可读，可能为非公开或跨域受限");
            }
          } else {
            setContentError("该知文非公开，请登录后查看正文");
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "加载失败";
        if (!cancelled) setError(msg);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [id, tokens?.accessToken]);

  useEffect(() => {
    if (!id) return;
    communityService.comments(id).then(setComments).catch(() => setComments([]));
  }, [id]);

  // 计算一行可展示的图片数量
  useEffect(() => {
    const calc = () => {
      const el = rowRef.current;
      if (!el) return;
      const width = el.clientWidth;
      const itemW = 180;
      const gap = 12;
      const count = Math.max(1, Math.floor((width + gap) / (itemW + gap)));
      setVisibleCount(count);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [detail?.images]);

  useEffect(() => {
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouch(touch);
    if (touch) {
      setShowNavLeft(true);
      setShowNavRight(true);
    }
  }, []);

  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouch) return;
    const el = previewBoxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const threshold = Math.max(60, Math.min(120, rect.width * 0.08));
    setShowNavLeft(x < threshold);
    setShowNavRight(x > rect.width - threshold);
  };

  const handlePreviewMouseLeave = () => {
    if (isTouch) return;
    setShowNavLeft(false);
    setShowNavRight(false);
  };

  const openPreview = (index: number) => {
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  const prevImage = () => {
    if (!detail?.images?.length) return;
    setPreviewIndex((i) => (i - 1 + detail.images.length) % detail.images.length);
  };

  const nextImage = () => {
    if (!detail?.images?.length) return;
    setPreviewIndex((i) => (i + 1) % detail.images.length);
  };

  // 启动 RAG 流式问答
  const startRag = () => {
    if (!id) return;
    const q = ragQuestion.trim();
    if (!q) return;
    if (detail && detail.visible !== "public") {
      setRagError("仅公开知文支持问答");
      return;
    }
    setRagError(null);
    setRagAnswer("");
    // 关闭之前的连接
    if (ragESRef.current) {
      try { ragESRef.current.close(); } catch {}
      ragESRef.current = null;
    }
    const url = `/api/v1/knowposts/${id}/qa/stream?question=${encodeURIComponent(q)}&topK=${ragTopK}&maxTokens=${ragMaxTokens}`;
    const es = new EventSource(url);
    ragESRef.current = es;
    setRagLoading(true);
    es.onmessage = (e) => {
      setRagAnswer((prev) => prev + (e.data ?? ""));
    };
    es.onerror = () => {
      setRagLoading(false);
      // 不展示“连接中断或后端异常”，静默关闭连接
      try { es.close(); } catch {}
      ragESRef.current = null;
    };
  };

  const stopRag = () => {
    if (ragESRef.current) {
      try { ragESRef.current.close(); } catch {}
      ragESRef.current = null;
    }
    setRagLoading(false);
  };

  const createComment = async () => {
    if (!id || !commentText.trim()) return;
    if (!tokens?.accessToken) { navigate("/login", { state: { from: `/post/${id}` } }); return; }
    setCommentSubmitting(true);
    try {
      const created = await communityService.createComment(id, commentText.trim(), replyTo?.id, tokens.accessToken);
      setComments(prev => [...prev, created]); setCommentText(""); setReplyTo(null);
    } finally { setCommentSubmitting(false); }
  };

  const generateLearningAsset = async () => {
    if (!id) return;
    if (!tokens?.accessToken) { navigate("/login", { state: { from: `/post/${id}` } }); return; }
    setAssistantLoading(true); setAssistantError(null);
    try { setAssistantResult(await knowpostService.learningAssistant(id, assistantType, tokens.accessToken)); }
    catch (err) { setAssistantError(err instanceof Error ? err.message : "生成失败，请稍后再试"); }
    finally { setAssistantLoading(false); }
  };

  useEffect(() => {
    return () => {
      // 页面卸载时关闭 SSE
      if (ragESRef.current) {
        try { ragESRef.current.close(); } catch {}
        ragESRef.current = null;
      }
    };
  }, []);

  return (
    <AppLayout
      header={
        <MainHeader
          headline={detail?.title ?? ""}
          subtitle=""
          rightSlot={<AuthStatus />}
        />
      }
      variant="cardless"
    >
      <article className={styles.detailCard}>
        {error ? <div style={{ color: "var(--color-danger)" }}>{error}</div> : null}
        {detail?.images?.length ? (
          <div ref={rowRef} className={styles.imageRow}>
            {(detail.images.slice(0, visibleCount)).map((src, idx) => {
              const isLastVisible = idx === visibleCount - 1 && detail.images.length > visibleCount;
              return (
                <div key={src + idx} className={styles.imageItem} onClick={() => openPreview(idx)}>
                  <img className={styles.image} src={src} alt={detail.title} />
                  {isLastVisible ? (
                    <div className={styles.moreBadge}>+{detail.images.length - visibleCount}</div>
                  ) : null}
                </div>
              );
            })}
            {detail.images.length <= visibleCount
              ? null
              : null}
          </div>
        ) : null}
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}></div>
          <div className={styles.meta}>
            {detail?.authorAvatar ? (
              <img className={styles.authorAvatar} src={detail.authorAvatar} alt={detail.authorNickname} />
            ) : null}
            <span className={styles.authorName}>{detail?.authorNickname ?? ""}</span>
            {(() => {
              const derivedId = detail?.authorId ?? parseAvatarUserId(detail?.authorAvatar);
              const isSelf = (derivedId && user?.id === derivedId) || (!!detail?.authorNickname && !!user?.nickname && detail.authorNickname === user.nickname);
              return derivedId && !isSelf ? <FollowButton targetUserId={derivedId} /> : null;
            })()}
          </div>
          <div className={styles.tagList}>
            {(detail?.tags ?? []).map(tag => (
              <Tag key={tag}>#{tag}</Tag>
            ))}
          </div>
          <div className={styles.meta}>
            {detail?.publishTime ? (
              <span>{new Date(detail.publishTime).toLocaleDateString("zh-CN")}</span>
            ) : null}
          </div>
          <div className={styles.bottomBar}>
            {detail ? (
              <LikeFavBar
                entityId={detail.id}
                initialCounts={{ like: detail.likeCount ?? 0, fav: detail.favoriteCount ?? 0 }}
                initialState={{ liked: detail.liked, faved: detail.faved }}
              />
            ) : null}
          </div>
        </div>

        <SectionHeader title="内容正文" subtitle="" />

        <div className={styles.contentRow}>
          <div className={styles.contentMain}>
            <div id="content-top" className={`${styles.body} ${styles.markdown}`}>
              {contentText ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => (
                      <a {...props} target="_blank" rel="noreferrer" />
                    ),
                    img: ({ node, ...props }) => (
                      <img {...props} style={{ maxWidth: "100%", borderRadius: 12 }} />
                    ),
                  }}
                >
                  {contentText}
                </ReactMarkdown>
              ) : (
                "暂无内容"
              )}
            </div>
            {contentError ? (
              <div style={{ color: "var(--color-danger)" }}>{contentError} {detail?.contentUrl ? (<a href={detail.contentUrl} target="_blank" rel="noreferrer">查看原文</a>) : null}</div>
            ) : null}
          </div>

          <aside className={styles.ragPanel}>
            <div className={styles.ragBody}>
              <div className={styles.assistantBox}>
                <div className={styles.assistantTitle}>AI 学习助手</div>
                <div className={styles.assistantControls}>
                  {(["outline", "cards", "quiz", "plan"] as LearningAssistantType[]).map(type => (
                    <button key={type} type="button" className={`${styles.assistantChip} ${assistantType === type ? styles.assistantChipActive : ""}`} onClick={() => setAssistantType(type)}>
                      {{ outline: "大纲", cards: "知识卡", quiz: "复习题", plan: "学习计划" }[type]}
                    </button>
                  ))}
                  <button type="button" className={`${styles.ragBtn} ${styles.ragBtnPrimary}`} onClick={generateLearningAsset} disabled={assistantLoading}>
                    {assistantLoading ? "生成中…" : "生成"}
                  </button>
                </div>
                {assistantError ? <div className={styles.assistantError}>{assistantError}</div> : null}
                {assistantResult ? <div className={styles.assistantResult}>
                  <div className={styles.markdown}><ReactMarkdown remarkPlugins={[remarkGfm]}>{assistantResult.content}</ReactMarkdown></div>
                  <div className={styles.sourceList}>{assistantResult.sources.map(source => <button type="button" key={source.id} className={styles.source} title={source.excerpt} onClick={() => document.getElementById(source.anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{source.id} · {source.label}</button>)}</div>
                </div> : null}
              </div>
              <textarea
                className={styles.ragTextarea}
                placeholder="围绕本知文提问，例如：这篇知文的核心观点是什么？"
                value={ragQuestion}
                onChange={(e) => setRagQuestion(e.target.value)}
              />
              <div className={styles.ragControls}>
                <button
                  type="button"
                  className={`${styles.ragBtn} ${styles.ragBtnPrimary}`}
                  onClick={startRag}
                  disabled={ragLoading || !ragQuestion.trim()}
                >
                  {ragLoading ? "生成中…" : "发送"}
                </button>
                <button type="button" className={`${styles.ragBtn} ${styles.ragBtnGhost}`} onClick={stopRag} disabled={!ragLoading}>
                  停止
                </button>
              </div>
              <div className={styles.ragHint}>
                说明：仅“公开”知文支持问答，答案基于当前知文的索引片段实时生成。
              </div>
              {ragError ? (
                <div style={{ color: "var(--color-danger)" }}>{ragError}</div>
              ) : null}
              <div className={styles.ragAnswer}>
                {ragAnswer ? (
                  <div className={styles.markdown}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ node, ...props }) => (
                          <a {...props} target="_blank" rel="noreferrer" />
                        ),
                        img: ({ node, ...props }) => (
                          <img {...props} style={{ maxWidth: "100%", borderRadius: 12 }} />
                        ),
                      }}
                    >
                      {ragAnswer}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className={styles.ragPlaceholder}>
                    {ragLoading ? "等待生成…" : "这里将展示答案（支持流式）"}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        <section className={styles.comments}>
          <SectionHeader title={`评论讨论 · ${comments.length}`} subtitle="和同学一起把知识讲透" />
          <div className={styles.commentComposer}>
            {replyTo ? <div className={styles.replying}>正在回复 @{replyTo.authorNickname}<button type="button" onClick={() => setReplyTo(null)}>取消</button></div> : null}
            <textarea value={commentText} onChange={e => setCommentText(e.target.value)} maxLength={1000} placeholder="写下你的想法；用 @昵称 提及同学" />
            <button type="button" className="ghost-button" disabled={commentSubmitting || !commentText.trim()} onClick={createComment}>{commentSubmitting ? "发送中…" : "发布评论"}</button>
          </div>
          <div className={styles.commentList}>
            {comments.map(comment => <article key={comment.id} className={`${styles.comment} ${comment.parentId ? styles.commentReply : ""}`}>
              <div className={styles.commentAvatar}>{comment.authorAvatar ? <img src={comment.authorAvatar} alt="" /> : comment.authorNickname.charAt(0)}</div>
              <div className={styles.commentContent}><div><b>{comment.authorNickname}</b>{comment.parentId ? <span className={styles.replyLabel}> 回复</span> : null}<time>{new Date(comment.createdAt).toLocaleString("zh-CN")}</time></div><p>{comment.content}</p><button type="button" onClick={() => { setReplyTo(comment); setCommentText(""); }}>回复</button></div>
            </article>)}
            {!comments.length ? <div className={styles.ragPlaceholder}>成为第一个参与讨论的人吧。</div> : null}
          </div>
        </section>

        {previewOpen && detail?.images?.length ? (
          <div className={styles.previewOverlay} onClick={() => setPreviewOpen(false)}>
            <div
              className={styles.previewBox}
              ref={previewBoxRef}
              onMouseMove={handlePreviewMouseMove}
              onMouseLeave={handlePreviewMouseLeave}
              onClick={(e) => e.stopPropagation()}
            >
              <img className={styles.previewImage} src={detail.images[previewIndex]} alt={detail.title} />
              <button
                type="button"
                className={`${styles.navButton} ${styles.navButtonLeft} ${showNavLeft ? styles.navButtonVisible : ""}`}
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                aria-label="上一张"
              >
                <ArrowRightIcon width={24} height={24} style={{ transform: "rotate(180deg)" }} />
              </button>
              <button
                type="button"
                className={`${styles.navButton} ${styles.navButtonRight} ${showNavRight ? styles.navButtonVisible : ""}`}
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                aria-label="下一张"
              >
                <ArrowRightIcon width={24} height={24} />
              </button>
              <button type="button" className={styles.closeButton} onClick={(e) => { e.stopPropagation(); setPreviewOpen(false); }} aria-label="关闭">✕</button>
            </div>
          </div>
        ) : null}
      </article>
    </AppLayout>
  );
};

export default CourseDetailPage;
