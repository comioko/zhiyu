package com.comioko.llm.rag;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import com.comioko.config.EsProperties;
import com.comioko.knowpost.mapper.KnowPostMapper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * RAG 相关服务的条件化注册。
 *
 * 使用 {@link ConditionalOnExpression} SpEL 严格判断 spring.ai.openai.api-key 不为空字符串，
 * 避免 {@code @ConditionalOnProperty} 将 "空字符串属性" 视为 "已配置" 的语义陷阱。
 *
 * 当 key 为空或缺失时，整个配置类不生效——与 Spring AI autoconfigure 行为对齐
 * （key 为空时 OpenAiEmbeddingAutoConfiguration 会抛 IllegalArgumentException）。
 *
 * 对应 prod 模式必须注入 DEEPSEEK_API_KEY + QWEN_API_KEY；noai profile 启动
 * （application-prod-noai.yml 排除 spring ai autoconfigure）时也安全。
 */
@Configuration
@Profile("!noai & !prod-noai & !lite")
@ConditionalOnExpression("'${spring.ai.openai.api-key:}' != ''")
public class RagConfig {

    /**
     * 注册索引服务。依赖 VectorStore / KnowPostMapper / ElasticsearchClient / EsProperties。
     */
    @Bean
    public RagIndexService ragIndexService(VectorStore vectorStore,
                                          KnowPostMapper knowPostMapper,
                                          ElasticsearchClient es,
                                          EsProperties esProps) {
        return new RagIndexService(vectorStore, knowPostMapper, es, esProps);
    }

    /**
     * 注册查询服务。依赖 VectorStore + ChatClient + RagIndexService。
     */
    @Bean
    public RagQueryService ragQueryService(VectorStore vectorStore,
                                          ChatClient chatClient,
                                          RagIndexService ragIndexService) {
        return new RagQueryService(vectorStore, chatClient, ragIndexService);
    }
}