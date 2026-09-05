package com.comioko.knowpost.api;

import com.comioko.llm.service.KnowPostDescriptionService;
import com.comioko.llm.service.LearningAssistantService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * 条件化注册 {@link KnowPostAiController}。
 *
 * 使用 {@code @ConditionalOnExpression} 严格判断 spring.ai.openai.api-key 不为空字符串，
 * 与 {@link com.comioko.llm.LlmConfig} 对齐：
 * - key 非空：ChatClient + DescriptionService + Controller 全部启用
 * - key 为空：AI 模块消失，controller 不注册（接口 404）
 *
 * 用 SpEL 而非 @ConditionalOnProperty 是为了避免 "空字符串属性" 被误判为"已配置"。
 */
@Configuration
@Profile("!noai & !prod-noai & !lite")
@ConditionalOnExpression("'${spring.ai.openai.api-key:}' != ''")
public class KnowPostAiControllerConfig {

    @Bean
    public KnowPostAiController knowPostAiController(KnowPostDescriptionService service) {
        return new KnowPostAiController(service);
    }

    @Bean
    public KnowPostLearningAssistantController knowPostLearningAssistantController(LearningAssistantService service) {
        return new KnowPostLearningAssistantController(service);
    }
}
