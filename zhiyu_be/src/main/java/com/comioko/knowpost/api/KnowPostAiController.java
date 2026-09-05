package com.comioko.knowpost.api;

import com.comioko.knowpost.api.dto.DescriptionSuggestRequest;
import com.comioko.knowpost.api.dto.DescriptionSuggestResponse;
import com.comioko.llm.service.KnowPostDescriptionService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * AI 相关知文 controller（AI 描述生成）。
 *
 * 注意：本类不再使用 {@code @RestController}，而是由 {@link KnowPostAiControllerConfig}
 * 通过 {@code @Bean} + {@code @ConditionalOnBean(KnowPostDescriptionService.class)}
 * 条件化注册。避免在 {@code @Component}/{@code @RestController} 上使用
 * {@code @ConditionalOnBean} 时条件评估不可靠导致 bean 缺失的问题。
 *
 * 当 ChatClient 不存在时（AI 关闭），本 controller 整体不注册，调用相关 API 返回 404。
 */
@RequestMapping(path = "/api/v1/knowposts", produces = MediaType.APPLICATION_JSON_VALUE)
public class KnowPostAiController {

    private final KnowPostDescriptionService descriptionService;

    public KnowPostAiController(KnowPostDescriptionService descriptionService) {
        this.descriptionService = descriptionService;
    }

    /**
     * 生成不超过 50 字的知文描述。
     * 需要鉴权（默认策略），防止匿名滥用。
     */
    @PostMapping(path = "/description/suggest", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public DescriptionSuggestResponse suggest(@Valid @RequestBody DescriptionSuggestRequest req) {
        String desc = descriptionService.generateDescription(req.content());
        return new DescriptionSuggestResponse(desc);
    }
}
