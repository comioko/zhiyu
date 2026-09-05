package com.comioko.community.api.dto;

import java.time.Instant;

public record NotificationResponse(String id, String type, String postId, String commentId, String content,
                                   boolean read, Instant createdAt, String actorId, String actorNickname,
                                   String actorAvatar) { }
