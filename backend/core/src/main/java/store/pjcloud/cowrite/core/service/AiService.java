package store.pjcloud.cowrite.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.config.AiProperties;
import store.pjcloud.cowrite.core.entity.AiRequest;
import store.pjcloud.cowrite.core.entity.AiUsage;
import store.pjcloud.cowrite.core.repository.AiRequestRepository;
import store.pjcloud.cowrite.core.repository.AiUsageRepository;

@Service
public class AiService {
    private final AiProperties aiProperties;
    private final AiRequestRepository requestsRepo;
    private final AiUsageRepository usageRepo;
    private final ProjectAccessService projectAccessService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    public AiService(AiProperties aiProperties,
                     AiRequestRepository requestsRepo,
                     AiUsageRepository usageRepo,
                     ProjectAccessService projectAccessService,
                     ObjectMapper objectMapper) {
        this.aiProperties = aiProperties;
        this.requestsRepo = requestsRepo;
        this.usageRepo = usageRepo;
        this.projectAccessService = projectAccessService;
        this.objectMapper = objectMapper;
    }

    private Integer getMonthlyLimit(String role) {
        if (role == null) return 50;
        return switch (role) {
            case "admin", "master" -> null;
            case "pro" -> 500;
            default -> 50;
        };
    }

    private OffsetDateTime startOfCurrentMonthUtc() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        return OffsetDateTime.of(now.getYear(), now.getMonthValue(), 1, 0, 0, 0, 0, ZoneOffset.UTC);
    }

    public Map<String, Object> getQuota(UUID userId, String role) {
        Integer limit = getMonthlyLimit(role);
        long used = requestsRepo.countByUserIdAndCreatedAtAfter(userId, startOfCurrentMonthUtc());
        Integer remaining = limit == null ? null : Math.max(limit - (int) used, 0);
        Map<String, Object> quota = new java.util.HashMap<>();
        quota.put("limit", limit);
        quota.put("used", used);
        quota.put("remaining", remaining);
        return quota;
    }

    private void assertQuota(UUID userId, String role) {
        Map<String, Object> quota = getQuota(userId, role);
        Integer limit = (Integer) quota.get("limit");
        long used = (long) quota.get("used");
        if (limit != null && used >= limit) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "AI 사용 한도를 초과했습니다.");
        }
    }

    private String extractPrompt(Object payload) {
        if (!(payload instanceof Map<?, ?> map)) return null;
        Object candidate = map.get("prompt");
        if (candidate == null) candidate = map.get("query");
        if (candidate == null) candidate = map.get("text");
        if (candidate == null) candidate = map.get("scenario");
        if (candidate == null) candidate = map.get("character");
        if (!(candidate instanceof String)) return null;
        String trimmed = ((String) candidate).trim();
        if (trimmed.isBlank()) return null;
        return trimmed.length() > 20_000 ? trimmed.substring(0, 20_000) + "…" : trimmed;
    }

    public Object proxy(UserContext user, String feature, String path, Map<String, Object> payload) {
        assertQuota(user.userId(), user.role());

        Object projectIdObj = payload.get("projectId");
        if (projectIdObj instanceof String projectIdStr && !projectIdStr.isBlank()) {
            projectAccessService.assertProjectAccess(user.userId(), UUID.fromString(projectIdStr));
        }

        String provider = payload.get("provider") instanceof String s ? s : null;
        String model = payload.get("model") instanceof String s ? s : null;

        AiRequest request = new AiRequest();
        request.setUserId(user.userId());
        if (projectIdObj instanceof String pid && !pid.isBlank()) {
            request.setProjectId(UUID.fromString(pid));
        }
        request.setFeature(feature);
        request.setProvider(provider);
        request.setModel(model);
        request.setPrompt(extractPrompt(payload));
        request.setStatus("pending");
        request = requestsRepo.save(request);

        String base = aiProperties.getServiceUrl() == null ? "http://ai-service:8000" : aiProperties.getServiceUrl();
        String url = base.replaceAll("/$", "") + path;

        payload.remove("projectId");

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<String> resp = restTemplate.postForEntity(url, entity, String.class);

            if (!resp.getStatusCode().is2xxSuccessful()) {
                requestsRepo.save(updateRequestFailed(request, resp.getBody()));
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 서비스 요청에 실패했습니다.");
            }

            Object parsed = resp.getBody() == null ? Map.of() : objectMapper.readValue(resp.getBody(), Object.class);
            request.setStatus("completed");
            request.setResult(objectMapper.convertValue(parsed, Map.class));
            request.setCompletedAt(OffsetDateTime.now());
            requestsRepo.save(request);

            AiUsage usage = new AiUsage();
            usage.setUserId(user.userId());
            usage.setFeature(feature);
            usage.setTokensUsed(1);
            usage.setModel(model);
            usage.setProvider(provider);
            usageRepo.save(usage);

            return parsed;
        } catch (Exception ex) {
            requestsRepo.save(updateRequestFailed(request, "요청 처리 중 오류가 발생했습니다."));
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 서비스 요청에 실패했습니다.");
        }
    }

    private AiRequest updateRequestFailed(AiRequest request, String error) {
        request.setStatus("failed");
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("error", error == null ? "AI 서비스 요청에 실패했습니다." : error);
        request.setResult(result);
        request.setCompletedAt(OffsetDateTime.now());
        return request;
    }

    public record UserContext(UUID userId, String role) {}
}
