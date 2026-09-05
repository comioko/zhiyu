package com.comioko.knowpost.api.dto;

import java.util.List;

public record LearningAssistantResponse(String type, String content, List<LearningSourceResponse> sources) {
    public record LearningSourceResponse(String id, String label, String excerpt, String anchorId) { }
}
