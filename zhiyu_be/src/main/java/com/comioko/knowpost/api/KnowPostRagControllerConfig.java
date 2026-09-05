package com.comioko.knowpost.api;

import com.comioko.llm.rag.RagIndexService;
import com.comioko.llm.rag.RagQueryService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * 条件化注册 {@link KnowPostRagController}。
 *
 * 使用 {@code @ConditionalOnExpression} 严格判断 spring.ai.openai.api-key 不为空字符串，
 * 与 {@link com.comioko.llm.rag.RagConfig} 对齐：
 * - key 非空：RAG services + controller 都启用
 * - key 为空：整个 RAG 模块消失，controller 不注册（接口 404）
 *
 * 用 SpEL 而非 @ConditionalOnProperty 是为了避免 "空字符串属性" 被误判为"已配置"。
 */
@Configuration
@Profile("!noai & !prod-noai & !lite")
@ConditionalOnExpression("'${spring.ai.openai.api-key:}' != ''")
public class KnowPostRagControllerConfig {

    @Bean
    public KnowPostRagController knowPostRagController(RagIndexService indexService,
                                                       RagQueryService ragQueryService) {
        return new KnowPostRagController(indexService, ragQueryService);
    }
}