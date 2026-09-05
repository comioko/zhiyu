package com.comioko.community.service;

import com.comioko.community.api.dto.NotificationPageResponse;

public interface NotificationService {
    void notify(long recipientId, long actorId, String type, Long postId, Long commentId, String content);
    void notifyPostOwner(long actorId, long postId, String type);
    NotificationPageResponse list(long userId, int page, int size);
    void markAllRead(long userId);
}
