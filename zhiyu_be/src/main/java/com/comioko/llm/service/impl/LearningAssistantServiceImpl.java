package com.comioko.llm.service.impl;

import com.comioko.common.exception.BusinessException;
import com.comioko.common.exception.ErrorCode;
import com.comioko.knowpost.mapper.KnowPostMapper;
import com.comioko.knowpost.model.KnowPostDetailRow;
import com.comioko.llm.service.LearningAssistantService;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.deepseek.DeepSeekChatOptions;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import java.util.ArrayList;
import java.util.List;

public class LearningAssistantServiceImpl implements LearningAssistantService {
    private final ChatClient chatClient;
    private final KnowPostMapper postMapper;
    private final RestTemplate http = new RestTemplate();
    public LearningAssistantServiceImpl(ChatClient chatClient, KnowPostMapper postMapper) { this.chatClient = chatClient; this.postMapper = postMapper; }

    @Override
    public LearningAssistantResult generate(long postId, String type) {
        if (!List.of("outline", "cards", "quiz", "plan").contains(type)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "不支持的学习助手类型");
        }
        KnowPostDetailRow post = postMapper.findDetailById(postId);
        if (post == null || !"published".equalsIgnoreCase(post.getStatus()) || !"public".equalsIgnoreCase(post.getVisible()) || !StringUtils.hasText(post.getContentUrl())) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "仅已发布的公开知文可生成学习资料");
        }
        String markdown;
        try { markdown = http.getForObject(post.getContentUrl(), String.class); }
        catch (Exception e) { throw new BusinessException(ErrorCode.INTERNAL_ERROR, "无法读取知文正文"); }
        if (!StringUtils.hasText(markdown)) throw new BusinessException(ErrorCode.BAD_REQUEST, "知文正文为空");
        String bounded = markdown.length() > 16000 ? markdown.substring(0, 16000) : markdown;
        List<LearningSource> sources = extractSources(bounded);
        String task = switch (type) {
            case "outline" -> "生成层次清晰的学习大纲，包含核心概念、关系和建议阅读顺序。";
            case "cards" -> "生成 6 到 10 张 Markdown 格式知识卡片，每张含‘问题’、‘答案’和一句记忆提示。";
            case "quiz" -> "生成 6 道由浅入深的复习题；先给题目，再用折叠式‘参考答案’列出答案与解析。";
            case "plan" -> "根据内容生成一个可执行的 3 天学习计划，每天包含目标、阅读重点、练习和验收问题。";
            default -> throw new IllegalStateException();
        };
        String prompt = "你是严谨的中文学习教练。" + task + "只能依据给定正文，避免补充未经支持的事实。"
                + "请在关键结论末尾附上来源标记 [S1]、[S2] 等；来源编号对应正文分段。\n\n正文：\n" + bounded;
        try {
            String result = chatClient.prompt().system("所有回答使用简洁的中文 Markdown。保留来源标记，不输出客套话。")
                    .user(prompt).options(DeepSeekChatOptions.builder().model("deepseek-chat").temperature(0.35).maxTokens(1800).build())
                    .call().content();
            return new LearningAssistantResult(type, result == null ? "" : result.trim(), sources);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "学习助手生成失败: " + e.getMessage());
        }
    }

    private List<LearningSource> extractSources(String markdown) {
        List<LearningSource> sources = new ArrayList<>();
        String[] chunks = markdown.split("(?m)(?=^#{1,3}\\s+)");
        for (String chunk : chunks) {
            String trimmed = chunk.trim();
            if (trimmed.isEmpty()) continue;
            String firstLine = trimmed.lines().findFirst().orElse("正文片段").replaceFirst("^#{1,3}\\s+", "");
            String excerpt = trimmed.replaceAll("\\s+", " ");
            sources.add(new LearningSource("S" + (sources.size() + 1), firstLine, excerpt.substring(0, Math.min(180, excerpt.length())), "content-top"));
            if (sources.size() == 5) break;
        }
        if (sources.isEmpty()) sources.add(new LearningSource("S1", "正文", markdown.replaceAll("\\s+", " ").substring(0, Math.min(180, markdown.length())), "content-top"));
        return sources;
    }
}
