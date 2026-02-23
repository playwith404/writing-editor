package store.pjcloud.cowrite.core.controller;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.AiService;
import store.pjcloud.cowrite.core.service.DocumentsService;
import store.pjcloud.cowrite.core.service.ProjectAccessService;
import store.pjcloud.cowrite.core.service.SearchFallbackService;
import store.pjcloud.cowrite.core.service.SearchService;

@RestController
@RequestMapping("/ai")
public class AiController {
    private static final int COMPLETE_CONTEXT_TAIL = 8_000;

    private final AiService aiService;
    private final DocumentsService documentsService;
    private final SearchService searchService;
    private final SearchFallbackService searchFallbackService;
    private final ProjectAccessService projectAccessService;

    public AiController(
        AiService aiService,
        DocumentsService documentsService,
        SearchService searchService,
        SearchFallbackService searchFallbackService,
        ProjectAccessService projectAccessService
    ) {
        this.aiService = aiService;
        this.documentsService = documentsService;
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
        AiService.UserContext ctx = userContext();

        String prompt = body.get("prompt") instanceof String s ? s.trim() : null;
        if (prompt == null || prompt.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "prompt is required");
        }

        HashMap<String, Object> payload = new HashMap<>();
        payload.put("prompt", prompt);
        if (body.get("provider") instanceof String s && !s.isBlank()) payload.put("provider", s);
        if (body.get("model") instanceof String s && !s.isBlank()) payload.put("model", s);

        String documentIdStr = body.get("documentId") instanceof String s ? s.trim() : null;
        if (documentIdStr != null && !documentIdStr.isBlank()) {
            UUID documentId = UUID.fromString(documentIdStr);
            Document doc = documentsService.findOneForUser(ctx.userId(), documentId);
            if (doc == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "document not found");
            }
            payload.put("projectId", doc.getProjectId().toString());
            payload.put("prompt", buildCompletePrompt(prompt, doc));
        } else if (body.get("projectId") instanceof String s && !s.isBlank()) {
            payload.put("projectId", s);
        }

        return aiService.proxy(ctx, "complete", "/ai/complete", payload);
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "query is required");
        }

        String projectIdStr = body.get("projectId") instanceof String s ? s.trim() : null;
        if (projectIdStr == null || projectIdStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "projectId is required");
        }

        UUID projectId = UUID.fromString(projectIdStr);
        projectAccessService.assertProjectAccess(ctx.userId(), projectId);

        List<SearchService.SearchHit> hits = searchSettingSources(projectId, query);
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

    private List<SearchService.SearchHit> searchSettingSources(UUID projectId, String query) {
        List<String> candidates = buildSearchCandidates(query);
        String projectIdStr = projectId.toString();

        if (searchService.isElasticEnabled()) {
            for (String candidate : candidates) {
                List<SearchService.SearchHit> hits = searchService.search(candidate, List.of(projectIdStr), null);
                if (hits != null && !hits.isEmpty()) return hits;
            }
        }

        for (String candidate : candidates) {
            List<SearchService.SearchHit> hits = searchFallbackService.search(candidate, List.of(projectId), null);
            if (hits != null && !hits.isEmpty()) return hits;
        }
        return List.of();
    }

    private List<String> buildSearchCandidates(String query) {
        if (query == null || query.isBlank()) return List.of();

        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        addCandidate(candidates, query);
        addCandidate(candidates, normalizeToken(query));

        for (String part : query.split("\\s+")) {
            String normalized = normalizeToken(part);
            addCandidate(candidates, normalized);
            if (normalized.length() >= 3) addCandidate(candidates, normalized.substring(0, normalized.length() - 1));
            if (normalized.length() >= 4) addCandidate(candidates, normalized.substring(0, normalized.length() - 2));
        }
        return List.copyOf(candidates);
    }

    private void addCandidate(Set<String> candidates, String candidate) {
        if (candidate == null) return;
        String value = candidate.trim();
        if (value.length() < 2) return;
        candidates.add(value);
    }

    private String normalizeToken(String token) {
        if (token == null || token.isBlank()) return "";
        return token.replaceAll("[^\\p{L}\\p{N}]", "").trim();
    }

    private String buildCompletePrompt(String userInstruction, Document doc) {
        String title = doc.getTitle() == null ? "" : doc.getTitle().trim();
        String plainContent = stripHtml(doc.getContent());
        String recent = clipTail(plainContent, COMPLETE_CONTEXT_TAIL);

        StringBuilder sb = new StringBuilder();
        sb.append("You are a fiction writing assistant. Continue the story from the provided context.\n")
            .append("Prioritize the user's instruction, keep continuity, and do not ask follow-up questions.\n")
            .append("Output only the continuation text, with no meta explanation.\n")
            .append("Keep the same language, tone, and point of view as the source text.");

        if (!title.isBlank()) {
            sb.append("\n\n[Document title]\n").append(title);
        }
        if (!recent.isBlank()) {
            sb.append("\n\n[Current document content - recent excerpt]\n").append(recent);
        }
        sb.append("\n\n[User instruction]\n").append(userInstruction);
        return sb.toString();
    }

    private String clipTail(String value, int maxLen) {
        if (value == null) return "";
        String text = value.trim();
        if (text.length() <= maxLen) return text;
        return text.substring(text.length() - maxLen);
    }

    private String buildContext(List<SearchService.SearchHit> hits) {
        if (hits == null || hits.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        int count = 0;

        for (SearchService.SearchHit hit : hits) {
            if (hit == null || hit.source() == null) continue;
            if (count >= 8) break;

            String title = firstNonBlank(hit.source().get("title"), hit.source().get("name"));
            String excerpt = extractExcerpt(hit.source());
            if (excerpt.length() > 600) excerpt = excerpt.substring(0, 600) + "...";

            sb.append("[")
                .append(hit.index())
                .append("] ");
            if (!title.isBlank()) sb.append(title);
            if (!excerpt.isBlank()) sb.append("\n").append(excerpt);
            sb.append("\n\n");
            count++;
        }

        String context = sb.toString().trim();
        if (context.length() > 8_000) context = context.substring(0, 8_000) + "...";
        return context;
    }

    private String extractExcerpt(Map source) {
        String excerpt = firstNonBlank(source.get("excerpt"), source.get("content"));
        if (excerpt.isBlank()) {
            excerpt = firstNonBlank(source.get("description"), source.get("backstory"));
        }
        if (excerpt.isBlank()) return "";
        return stripHtml(excerpt);
    }

    private String firstNonBlank(Object... values) {
        if (values == null) return "";
        for (Object value : values) {
            if (value instanceof String s && !s.isBlank()) return s;
        }
        return "";
    }

    private String stripHtml(String value) {
        if (value == null || value.isBlank()) return "";
        return value
            .replaceAll("<[^>]*>", " ")
            .replace("&nbsp;", " ")
            .replaceAll("\\s+", " ")
            .trim();
    }
}
