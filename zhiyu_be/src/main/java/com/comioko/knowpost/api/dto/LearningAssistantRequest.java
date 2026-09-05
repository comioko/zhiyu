package com.comioko.knowpost.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LearningAssistantRequest(@NotBlank @Pattern(regexp = "outline|cards|quiz|plan") String type) { }
