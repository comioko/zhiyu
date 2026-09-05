package com.comioko.community.service.impl;

import com.comioko.community.mapper.UserActivityMapper;
import com.comioko.community.service.UserActivityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserActivityServiceImpl implements UserActivityService {
    private final UserActivityMapper mapper;
    public UserActivityServiceImpl(UserActivityMapper mapper) { this.mapper = mapper; }
    @Override @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordView(long userId, long postId) { mapper.recordView(userId, postId); }
    @Override @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void setLiked(long userId, long postId, boolean active) { mapper.setLiked(userId, postId, active); }
    @Override @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void setFaved(long userId, long postId, boolean active) { mapper.setFaved(userId, postId, active); }
}
