package com.comioko.community.service.impl;

import com.comioko.community.api.dto.NotificationPageResponse;
import com.comioko.community.api.dto.NotificationResponse;
import com.comioko.community.mapper.NotificationMapper;
import com.comioko.community.model.NotificationRow;
import com.comioko.community.service.NotificationService;
import com.comioko.knowpost.id.SnowflakeIdGenerator;
import com.comioko.knowpost.mapper.KnowPostMapper;
import com.comioko.knowpost.model.KnowPost;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class NotificationServiceImpl implements NotificationService {
    private final NotificationMapper mapper;
    private final KnowPostMapper postMapper;
    private final SnowflakeIdGenerator idGenerator;
    public NotificationServiceImpl(NotificationMapper mapper, KnowPostMapper postMapper, SnowflakeIdGenerator idGenerator) {
        this.mapper = mapper; this.postMapper = postMapper; this.idGenerator = idGenerator;
    }
    @Override
    public void notify(long recipientId, long actorId, String type, Long postId, Long commentId, String content) {
        if (recipientId == actorId) return;
        mapper.insert(idGenerator.nextId(), recipientId, actorId, type, postId, commentId, content);
    }
    @Override
    public void notifyPostOwner(long actorId, long postId, String type) {
        KnowPost post = postMapper.findById(postId);
        if (post != null) notify(post.getCreatorId(), actorId, type, postId, null, null);
    }
    @Override
    public NotificationPageResponse list(long userId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        List<NotificationResponse> items = mapper.list(userId, safeSize, Math.max(0, page - 1) * safeSize).stream()
                .map(this::toResponse).toList();
        return new NotificationPageResponse(items, mapper.unreadCount(userId));
    }
    @Override public void markAllRead(long userId) { mapper.markAllRead(userId); }
    private NotificationResponse toResponse(NotificationRow row) {
        return new NotificationResponse(String.valueOf(row.getId()), row.getType(), stringId(row.getPostId()),
                stringId(row.getCommentId()), row.getContent(), Boolean.TRUE.equals(row.getRead()), row.getCreatedAt(),
                stringId(row.getActorId()), row.getActorNickname(), row.getActorAvatar());
    }
    private String stringId(Long value) { return value == null ? null : String.valueOf(value); }
}
