package com.comioko.llm;

import com.comioko.llm.service.KnowPostDescriptionService;
import com.comioko.llm.service.impl.KnowPostDescriptionServiceImpl;
import com.comioko.llm.service.LearningAssistantService;
import com.comioko.llm.service.impl.LearningAssistantServiceImpl;
import com.comioko.knowpost.mapper.KnowPostMapper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * LLM 配置。
 *
 * 使用 {@code @ConditionalOnExpression} 严格判断 spring.ai.openai.api-key 不为空字符串，
 * 避免 {@code @ConditionalOnProperty} 将 "空字符串属性" 视为"已配置"的语义陷阱。
 *
 * 当 key 不为空时：
 * - ChatClient bean 创建（依赖 deepSeekChatModel bean，由 Spring AI 暴露）
 * - KnowPostDescriptionService bean 创建（依赖 ChatClient）
 *
 * 当 key 为空时：本配置类整体不生效，AI 模块彻底消失，调用相关接口返回 404。
 */
@Configuration
@Profile("!noai & !prod-noai & !lite")
@ConditionalOnExpression("'${spring.ai.openai.api-key:}' != ''")
public class LlmConfig {

    @Bean
    public ChatClient chatClient(@Qualifier("deepSeekChatModel") ChatModel chatModel) {
        return ChatClient.builder(chatModel).build();
    }

    @Bean
    public KnowPostDescriptionService knowPostDescriptionService(ChatClient chatClient) {
        return new KnowPostDescriptionServiceImpl(chatClient);
    }

    @Bean
    public LearningAssistantService learningAssistantService(ChatClient chatClient, KnowPostMapper knowPostMapper) {
        return new LearningAssistantServiceImpl(chatClient, knowPostMapper);
    }
}
