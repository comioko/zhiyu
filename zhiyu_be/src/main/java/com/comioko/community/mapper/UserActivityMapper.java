package com.comioko.community.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserActivityMapper {
    int recordView(@Param("userId") long userId, @Param("postId") long postId);
    int setLiked(@Param("userId") long userId, @Param("postId") long postId, @Param("active") boolean active);
    int setFaved(@Param("userId") long userId, @Param("postId") long postId, @Param("active") boolean active);
}
