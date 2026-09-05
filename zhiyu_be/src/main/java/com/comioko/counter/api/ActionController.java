package com.comioko.counter.api;

import com.comioko.counter.api.dto.ActionRequest;
import com.comioko.counter.service.CounterService;
import com.comioko.auth.token.JwtService;
import com.comioko.community.service.NotificationService;
import com.comioko.community.service.UserActivityService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 行为接口：点赞/取消点赞、收藏/取消收藏。
 *
 * <p>所有接口基于登录用户，返回操作是否改变状态以及当前状态值。</p>
 */
@RestController
@RequestMapping("/api/v1/action")
public class ActionController {

    private final CounterService counterService;
    private final JwtService jwtService;
    private final UserActivityService activityService;
    private final NotificationService notificationService;

    public ActionController(CounterService counterService, JwtService jwtService, UserActivityService activityService,
                            NotificationService notificationService) {
        this.counterService = counterService;
        this.jwtService = jwtService;
        this.activityService = activityService;
        this.notificationService = notificationService;
    }

    /**
     * 点赞操作。
     */
    @PostMapping("/like")
    public ResponseEntity<Map<String, Object>> like(@Valid @RequestBody ActionRequest req,
                                                    @AuthenticationPrincipal Jwt jwt) {
        long uid = jwtService.extractUserId(jwt);
        boolean changed = counterService.like(req.getEntityType(), req.getEntityId(), uid);
        track(req, uid, true, false);
        if (changed) notifyOwner(req, uid, "like");
        return ResponseEntity.ok(Map.of(
                "changed", changed, // 标识这次操作是否改变状态（避免重复点击）
                "liked", counterService.isLiked(req.getEntityType(), req.getEntityId(), uid)
        ));
    }

    /**
     * 取消点赞操作。
     */
    @PostMapping("/unlike")
    public ResponseEntity<Map<String, Object>> unlike(@Valid @RequestBody ActionRequest req,
                                                      @AuthenticationPrincipal Jwt jwt) {
        long uid = jwtService.extractUserId(jwt);
        boolean changed = counterService.unlike(req.getEntityType(), req.getEntityId(), uid);
        track(req, uid, false, false);
        return ResponseEntity.ok(Map.of(
                "changed", changed, // 状态是否发生变化
                "liked", counterService.isLiked(req.getEntityType(), req.getEntityId(), uid)
        ));
    }

    /**
     * 收藏操作。
     */
    @PostMapping("/fav")
    public ResponseEntity<Map<String, Object>> fav(@Valid @RequestBody ActionRequest req,
                                                   @AuthenticationPrincipal Jwt jwt) {
        long uid = jwtService.extractUserId(jwt);
        boolean changed = counterService.fav(req.getEntityType(), req.getEntityId(), uid);
        track(req, uid, true, true);
        if (changed) notifyOwner(req, uid, "fav");
        return ResponseEntity.ok(Map.of(
                "changed", changed, // 状态是否发生变化
                "faved", counterService.isFaved(req.getEntityType(), req.getEntityId(), uid)
        ));
    }

    /**
     * 取消收藏操作。
     */
    @PostMapping("/unfav")
    public ResponseEntity<Map<String, Object>> unfav(@Valid @RequestBody ActionRequest req,
                                                     @AuthenticationPrincipal Jwt jwt) {
        long uid = jwtService.extractUserId(jwt);
        boolean changed = counterService.unfav(req.getEntityType(), req.getEntityId(), uid);
        track(req, uid, false, true);
        return ResponseEntity.ok(Map.of(
                "changed", changed, // 状态是否发生变化
                "faved", counterService.isFaved(req.getEntityType(), req.getEntityId(), uid)
        ));
    }

    private void track(ActionRequest req, long userId, boolean active, boolean fav) {
        if (!"knowpost".equals(req.getEntityType())) return;
        try {
            long postId = Long.parseLong(req.getEntityId());
            if (fav) activityService.setFaved(userId, postId, active); else activityService.setLiked(userId, postId, active);
        } catch (Exception ignored) { }
    }

    private void notifyOwner(ActionRequest req, long userId, String type) {
        if (!"knowpost".equals(req.getEntityType())) return;
        try { notificationService.notifyPostOwner(userId, Long.parseLong(req.getEntityId()), type); } catch (Exception ignored) { }
    }
}
