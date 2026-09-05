package com.comioko.community.api;

import com.comioko.auth.token.JwtService;
import com.comioko.community.api.dto.CommentCreateRequest;
import com.comioko.community.api.dto.CommentResponse;
import com.comioko.community.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/knowposts/{postId}/comments")
public class CommentController {
    private final CommentService service; private final JwtService jwtService;
    public CommentController(CommentService service, JwtService jwtService) { this.service = service; this.jwtService = jwtService; }
    @GetMapping
    public List<CommentResponse> list(@PathVariable long postId, @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "50") int size) {
        return service.list(postId, page, size);
    }
    @PostMapping
    public CommentResponse create(@PathVariable long postId, @Valid @RequestBody CommentCreateRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.create(jwtService.extractUserId(jwt), postId, request.parentId(), request.content());
    }
}
