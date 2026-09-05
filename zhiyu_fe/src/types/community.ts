export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  parentId?: number | null;
  replyToUserId?: number | null;
  content: string;
  authorNickname: string;
  authorAvatar?: string;
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  type: "like" | "fav" | "follow" | "comment" | "reply" | "mention";
  postId?: string;
  commentId?: string;
  content?: string;
  read: boolean;
  createdAt: string;
  actorId: string;
  actorNickname: string;
  actorAvatar?: string;
};

export type NotificationPage = { items: NotificationItem[]; unreadCount: number };

export type LearningAssistantType = "outline" | "cards" | "quiz" | "plan";
export type LearningSource = { id: string; label: string; excerpt: string; anchorId: string };
export type LearningAssistantResult = { type: LearningAssistantType; content: string; sources: LearningSource[] };
