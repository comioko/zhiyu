package com.comioko.community.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentCreateRequest(Long parentId, @NotBlank @Size(max = 1000) String content) { }
