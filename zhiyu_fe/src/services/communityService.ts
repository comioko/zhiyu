import { apiFetch } from "./apiClient";
import type { Comment, NotificationPage } from "@/types/community";

export const communityService = {
  comments: (postId: string, page = 1, size = 50) =>
    apiFetch<Comment[]>(`/api/v1/knowposts/${postId}/comments?page=${page}&size=${size}`, { accessToken: null }),
  createComment: (postId: string, content: string, parentId?: string, accessToken?: string) =>
    apiFetch<Comment>(`/api/v1/knowposts/${postId}/comments`, {
      method: "POST", body: { content, parentId: parentId ? Number(parentId) : undefined }, accessToken
    }),
  notifications: (page = 1, size = 30, accessToken?: string) =>
    apiFetch<NotificationPage>(`/api/v1/notifications?page=${page}&size=${size}`, { accessToken }),
  markAllNotificationsRead: (accessToken?: string) =>
    apiFetch<void>("/api/v1/notifications/read-all", { method: "POST", accessToken })
};
