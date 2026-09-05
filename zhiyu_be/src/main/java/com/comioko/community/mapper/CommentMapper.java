package com.comioko.community.mapper;

import com.comioko.community.model.CommentRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface CommentMapper {
    int insert(@Param("id") long id, @Param("postId") long postId, @Param("authorId") long authorId,
               @Param("parentId") Long parentId, @Param("replyToUserId") Long replyToUserId, @Param("content") String content);
    CommentRow findById(@Param("id") long id);
    List<CommentRow> listByPostId(@Param("postId") long postId, @Param("limit") int limit, @Param("offset") int offset);
}
