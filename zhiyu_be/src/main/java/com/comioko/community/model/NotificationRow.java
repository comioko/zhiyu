package com.comioko.community.model;

import lombok.Data;
import java.time.Instant;

@Data
public class NotificationRow {
    private Long id;
    private String type;
    private Long postId;
    private Long commentId;
    private String content;
    private Boolean read;
    private Instant createdAt;
    private Long actorId;
    private String actorNickname;
    private String actorAvatar;
}
