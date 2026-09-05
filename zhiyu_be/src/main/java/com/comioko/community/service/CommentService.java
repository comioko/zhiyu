package com.comioko.community.service;

import com.comioko.community.api.dto.CommentResponse;
import java.util.List;

public interface CommentService {
    CommentResponse create(long authorId, long postId, Long parentId, String content);
    List<CommentResponse> list(long postId, int page, int size);
}
