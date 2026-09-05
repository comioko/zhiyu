package com.comioko.llm.service;

import java.util.List;

public interface LearningAssistantService {
    LearningAssistantResult generate(long postId, String type);

    record LearningAssistantResult(String type, String content, List<LearningSource> sources) { }
    record LearningSource(String id, String label, String excerpt, String anchorId) { }
}
