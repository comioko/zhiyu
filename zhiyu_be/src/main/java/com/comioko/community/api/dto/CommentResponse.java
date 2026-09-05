package com.comioko.community.api.dto;

import java.time.Instant;

public record CommentResponse(String id, String postId, String authorId, Long parentId, Long replyToUserId,
                              String content, String authorNickname, String authorAvatar, Instant createdAt) { }
