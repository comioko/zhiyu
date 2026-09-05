package com.comioko.community.service;

public interface UserActivityService {
    void recordView(long userId, long postId);
    void setLiked(long userId, long postId, boolean active);
    void setFaved(long userId, long postId, boolean active);
}
