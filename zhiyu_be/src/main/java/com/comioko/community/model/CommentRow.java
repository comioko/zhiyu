package com.comioko.community.model;

import lombok.Data;
import java.time.Instant;

@Data
public class CommentRow {
    private Long id;
    private Long postId;
    private Long authorId;
    private Long parentId;
    private Long replyToUserId;
    private String content;
    private String authorNickname;
    private String authorAvatar;
    private Instant createdAt;
}
