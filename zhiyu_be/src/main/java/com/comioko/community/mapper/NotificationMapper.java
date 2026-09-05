package com.comioko.community.mapper;

import com.comioko.community.model.NotificationRow;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface NotificationMapper {
    int insert(@Param("id") long id, @Param("recipientId") long recipientId, @Param("actorId") long actorId,
               @Param("type") String type, @Param("postId") Long postId, @Param("commentId") Long commentId,
               @Param("content") String content);
    List<NotificationRow> list(@Param("recipientId") long recipientId, @Param("limit") int limit, @Param("offset") int offset);
    int unreadCount(@Param("recipientId") long recipientId);
    int markAllRead(@Param("recipientId") long recipientId);
}
