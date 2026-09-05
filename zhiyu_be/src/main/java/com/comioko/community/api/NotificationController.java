package com.comioko.community.api;

import com.comioko.auth.token.JwtService;
import com.comioko.community.api.dto.NotificationPageResponse;
import com.comioko.community.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service; private final JwtService jwtService;
    public NotificationController(NotificationService service, JwtService jwtService) { this.service = service; this.jwtService = jwtService; }
    @GetMapping public NotificationPageResponse list(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "30") int size, @AuthenticationPrincipal Jwt jwt) {
        return service.list(jwtService.extractUserId(jwt), page, size);
    }
    @PostMapping("/read-all") public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal Jwt jwt) {
        service.markAllRead(jwtService.extractUserId(jwt)); return ResponseEntity.noContent().build();
    }
}
