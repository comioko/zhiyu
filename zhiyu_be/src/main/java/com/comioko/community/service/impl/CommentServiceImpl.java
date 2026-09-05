package com.comioko.community.service.impl;

import com.comioko.common.exception.BusinessException;
import com.comioko.common.exception.ErrorCode;
import com.comioko.community.api.dto.CommentResponse;
import com.comioko.community.mapper.CommentMapper;
import com.comioko.community.model.CommentRow;
import com.comioko.community.service.CommentService;
import com.comioko.community.service.NotificationService;
import com.comioko.knowpost.id.SnowflakeIdGenerator;
import com.comioko.knowpost.mapper.KnowPostMapper;
import com.comioko.knowpost.model.KnowPost;
import com.comioko.user.domain.User;
import com.comioko.user.mapper.UserMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CommentServiceImpl implements CommentService {
    private static final Pattern MENTION = Pattern.compile("@([\\p{IsHan}\\w-]{1,64})");
    private final CommentMapper mapper;
    private final KnowPostMapper postMapper;
    private final UserMapper userMapper;
    private final NotificationService notificationService;
    private final SnowflakeIdGenerator idGenerator;
    public CommentServiceImpl(CommentMapper mapper, KnowPostMapper postMapper, UserMapper userMapper,
                              NotificationService notificationService, SnowflakeIdGenerator idGenerator) {
        this.mapper = mapper; this.postMapper = postMapper; this.userMapper = userMapper;
        this.notificationService = notificationService; this.idGenerator = idGenerator;
    }
    @Override @Transactional
    public CommentResponse create(long authorId, long postId, Long parentId, String content) {
        KnowPost post = postMapper.findById(postId);
        if (post == null || !"published".equals(post.getStatus()) || !"public".equals(post.getVisible())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "仅公开且已发布的知文支持评论");
        }
        Long replyToUserId = null;
        if (parentId != null) {
            CommentRow parent = mapper.findById(parentId);
            if (parent == null || !Long.valueOf(postId).equals(parent.getPostId())) throw new BusinessException(ErrorCode.BAD_REQUEST, "回复目标不存在");
            replyToUserId = parent.getAuthorId();
        }
        long id = idGenerator.nextId();
        mapper.insert(id, postId, authorId, parentId, replyToUserId, content.trim());
        CommentRow created = mapper.findById(id);
        notificationService.notify(post.getCreatorId(), authorId, parentId == null ? "comment" : "reply", postId, id, content.trim());
        if (replyToUserId != null) notificationService.notify(replyToUserId, authorId, "reply", postId, id, content.trim());
        Matcher mentions = MENTION.matcher(content);
        while (mentions.find()) {
            User mentioned = userMapper.findByNickname(mentions.group(1));
            if (mentioned != null) notificationService.notify(mentioned.getId(), authorId, "mention", postId, id, content.trim());
        }
        return toResponse(created);
    }
    @Override
    public List<CommentResponse> list(long postId, int page, int size) {
        KnowPost post = postMapper.findById(postId);
        if (post == null || !"published".equals(post.getStatus()) || !"public".equals(post.getVisible())) return List.of();
        int safeSize = Math.min(Math.max(size, 1), 100);
        return mapper.listByPostId(postId, safeSize, Math.max(0, page - 1) * safeSize).stream().map(this::toResponse).toList();
    }
    private CommentResponse toResponse(CommentRow row) {
        return new CommentResponse(String.valueOf(row.getId()), String.valueOf(row.getPostId()), String.valueOf(row.getAuthorId()),
                row.getParentId(), row.getReplyToUserId(), row.getContent(), row.getAuthorNickname(), row.getAuthorAvatar(), row.getCreatedAt());
    }
}
