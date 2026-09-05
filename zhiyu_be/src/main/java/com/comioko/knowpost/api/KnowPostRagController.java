package com.comioko.knowpost.api;

import com.comioko.llm.rag.RagIndexService;
import com.comioko.llm.rag.RagQueryService;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import reactor.core.publisher.Flux;

/**
 * RAG 问答 + 索引管理 controller。
 *
 * 本类不再使用 {@code @RestController} + {@code @ConditionalOnBean}，而是由
 * {@link KnowPostRagControllerConfig} 通过 {@code @Bean} 条件化注册，
 * 避免 {@code @ConditionalOnBean} 在组件扫描阶段条件评估不可靠的问题。
 *
 * 当 RagIndexService / RagQueryService 不存在时（AI 关闭），本 controller 整体不注册。
 */
@RequestMapping("/api/v1/knowposts")
@Validated
public class KnowPostRagController {

    private final RagIndexService indexService;
    private final RagQueryService ragQueryService;

    public KnowPostRagController(RagIndexService indexService, RagQueryService ragQueryService) {
        this.indexService = indexService;
        this.ragQueryService = ragQueryService;
    }

    /**
     * 单篇知文 RAG 问答（WebFlux + Flux 流式输出）。
     * 示例：GET /api/v1/knowposts/{id}/qa/stream?question=...&topK=5&maxTokens=1024
     */
    @GetMapping(value = "/{id}/qa/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> qaStream(@PathVariable("id") long id,
                                 @RequestParam("question") String question,
                                 @RequestParam(value = "topK", defaultValue = "5") int topK,
                                 @RequestParam(value = "maxTokens", defaultValue = "1024") int maxTokens) {
        return ragQueryService.streamAnswerFlux(id, question, topK, maxTokens);
    }

    /**
     * 手动触发单篇索引重建（返回重建的切片数）。
     */
    @PostMapping("/{id}/rag/reindex")
    @ResponseBody
    public int reindex(@PathVariable("id") long id) {
        return indexService.reindexSinglePost(id);
    }
}