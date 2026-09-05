package com.comioko.knowpost.api;

import com.comioko.knowpost.api.dto.LearningAssistantRequest;
import com.comioko.knowpost.api.dto.LearningAssistantResponse;
import com.comioko.llm.service.LearningAssistantService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RequestMapping(path = "/api/v1/knowposts", produces = MediaType.APPLICATION_JSON_VALUE)
public class KnowPostLearningAssistantController {
    private final LearningAssistantService service;
    public KnowPostLearningAssistantController(LearningAssistantService service) { this.service = service; }
    @PostMapping(path = "/{id}/learning-assistant", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public LearningAssistantResponse generate(@PathVariable long id, @Valid @RequestBody LearningAssistantRequest request) {
        LearningAssistantService.LearningAssistantResult result = service.generate(id, request.type());
        return new LearningAssistantResponse(result.type(), result.content(), result.sources().stream()
                .map(s -> new LearningAssistantResponse.LearningSourceResponse(s.id(), s.label(), s.excerpt(), s.anchorId())).toList());
    }
}
