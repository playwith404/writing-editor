package store.pjcloud.cowrite.core.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.AiService;
import store.pjcloud.cowrite.core.service.ProjectAccessService;
import store.pjcloud.cowrite.core.service.SearchFallbackService;
import store.pjcloud.cowrite.core.service.SearchService;

@RestController
@RequestMapping("/ai")
public class AiController {
    private final AiService aiService;
    private final SearchService searchService;
    private final SearchFallbackService searchFallbackService;
    private final ProjectAccessService projectAccessService;

    public AiController(AiService aiService,
                        SearchService searchService,
                        SearchFallbackService searchFallbackService,
                        ProjectAccessService projectAccessService) {
        this.aiService = aiService;
        this.searchService = searchService;
        this.searchFallbackService = searchFallbackService;
        this.projectAccessService = projectAccessService;
    }

    private AiService.UserContext userContext() {
        UUID userId = SecurityUtils.requireUserId();
        String role = SecurityUtils.getRole();
        return new AiService.UserContext(userId, role);
    }

    @GetMapping("/quota")
    public Map<String, Object> quota() {
        AiService.UserContext ctx = userContext();
        return aiService.getQuota(ctx.userId(), ctx.role());
    }

    @PostMapping("/complete")
    public Object complete(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "complete", "/ai/complete", body);
    }

    @PostMapping("/search")
    public Object search(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "search", "/ai/search", body);
    }

    @PostMapping("/settings-search")
    public Map<String, Object> settingsSearch(@RequestBody Map<String, Object> body) {
        AiService.UserContext ctx = userContext();

        String query = body.get("query") instanceof String s ? s.trim() : null;
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("query가 필요합니다.");
        }

        String projectIdStr = body.get("projectId") instanceof String s ? s.trim() : null;
        if (projectIdStr == null || projectIdStr.isBlank()) {
            throw new IllegalArgumentException("projectId가 필요합니다.");
        }
        UUID projectId = UUID.fromString(projectIdStr);
        projectAccessService.assertProjectAccess(ctx.userId(), projectId);

        List<SearchService.SearchHit> hits = searchService.isElasticEnabled()
            ? searchService.search(query, List.of(projectId.toString()), null)
            : searchFallbackService.search(query, List.of(projectId), null);

        String context = buildContext(hits);

        HashMap<String, Object> payload = new HashMap<>();
        payload.put("projectId", projectId.toString());
        payload.put("query", query);
        payload.put("context", context);

        if (body.get("provider") instanceof String s && !s.isBlank()) payload.put("provider", s);
        if (body.get("model") instanceof String s && !s.isBlank()) payload.put("model", s);

        Object result = aiService.proxy(ctx, "settings_search", "/ai/search", payload);
        return Map.of("result", result, "hits", hits);
    }

    @PostMapping("/style/convert")
    public Object styleConvert(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "style_convert", "/ai/style/convert", body);
    }

    @PostMapping("/character/simulate")
    public Object characterSimulate(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "character_simulate", "/ai/character/simulate", body);
    }

    @PostMapping("/predict")
    public Object predict(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "predict", "/ai/predict", body);
    }

    @PostMapping("/translate")
    public Object translate(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "translate", "/ai/translate", body);
    }

    @PostMapping("/research")
    public Object research(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "research", "/ai/research", body);
    }

    @PostMapping("/storyboard")
    public Object storyboard(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "storyboard", "/ai/storyboard", body);
    }

    @PostMapping("/tts")
    public Object tts(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "tts", "/ai/tts", body);
    }

    @PostMapping("/transcribe")
    public Object transcribe(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "transcribe", "/ai/transcribe", body);
    }

    private String buildContext(List<SearchService.SearchHit> hits) {
        if (hits == null || hits.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        int count = 0;
        for (SearchService.SearchHit hit : hits) {
            if (hit == null || hit.source() == null) continue;
            if (count >= 8) break;
            String title = null;
            Object srcTitle = hit.source().get("title");
            if (srcTitle instanceof String s && !s.isBlank()) title = s;
            Object srcName = hit.source().get("name");
            if (title == null && srcName instanceof String s && !s.isBlank()) title = s;
            Object srcExcerpt = hit.source().get("excerpt");
            String excerpt = srcExcerpt instanceof String s ? s : null;
            if (excerpt != null && excerpt.length() > 600) excerpt = excerpt.substring(0, 600) + "…";

            sb.append("[")
                .append(hit.index())
                .append("] ");
            if (title != null) sb.append(title);
            if (excerpt != null && !excerpt.isBlank()) sb.append("\n").append(excerpt);
            sb.append("\n\n");
            count++;
        }
        String context = sb.toString().trim();
        if (context.length() > 8_000) context = context.substring(0, 8_000) + "…";
        return context;
    }
}
