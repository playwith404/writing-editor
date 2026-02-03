package store.pjcloud.cowrite.core.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.entity.DocumentVersion;
import store.pjcloud.cowrite.core.repository.DocumentRepository;
import store.pjcloud.cowrite.core.repository.DocumentVersionRepository;
import store.pjcloud.cowrite.core.repository.ProjectRepository;
import store.pjcloud.cowrite.core.repository.WritingGoalRepository;

@Service
public class DocumentsService {
    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final ProjectRepository projectRepository;
    private final WritingGoalRepository goalRepository;
    private final SearchService searchService;
    private final ProjectAccessService projectAccessService;
    private final ObjectMapper objectMapper;

    private static final long AUTO_VERSION_MIN_INTERVAL_MS = 30_000L;

    public DocumentsService(
        DocumentRepository documentRepository,
        DocumentVersionRepository versionRepository,
        ProjectRepository projectRepository,
        WritingGoalRepository goalRepository,
        SearchService searchService,
        ProjectAccessService projectAccessService,
        ObjectMapper objectMapper
    ) {
        this.documentRepository = documentRepository;
        this.versionRepository = versionRepository;
        this.projectRepository = projectRepository;
        this.goalRepository = goalRepository;
        this.searchService = searchService;
        this.projectAccessService = projectAccessService;
        this.objectMapper = objectMapper;
    }

    public List<Document> findAllForUser(UUID userId, UUID projectId) {
        if (userId == null) return List.of();
        List<UUID> projectIds = projectAccessService.filterAccessibleProjectIds(userId, projectId);
        if (projectIds.isEmpty()) return List.of();
        return documentRepository.findAll().stream()
            .filter(d -> d.getProjectId() != null && projectIds.contains(d.getProjectId()))
            .toList();
    }

    public Document findOneForUser(UUID userId, UUID id) {
        if (userId == null) return null;
        Document doc = documentRepository.findById(id).orElse(null);
        if (doc == null) return null;
        projectAccessService.assertProjectAccess(userId, doc.getProjectId());
        return doc;
    }

    @Transactional
    public Document createForUser(UUID userId, Map<String, Object> body) {
        if (userId == null) throw new IllegalArgumentException("유저 정보가 필요합니다.");
        Document doc = objectMapper.convertValue(body, Document.class);
        if (doc.getProjectId() == null) throw new IllegalArgumentException("projectId가 필요합니다.");
        projectAccessService.assertProjectAccess(userId, doc.getProjectId());
        doc.setWordCount(computeWordCount(doc.getContent()));
        Document saved = documentRepository.save(doc);

        if (saved.getContent() != null && !saved.getContent().isBlank()) {
            DocumentVersion version = new DocumentVersion();
            version.setDocumentId(saved.getId());
            version.setContent(saved.getContent());
            version.setWordCount(saved.getWordCount());
            version.setVersionName("초기 버전");
            version.setCreatedBy(userId);
            versionRepository.save(version);
        }

        refreshProjectWordCount(saved.getProjectId());
        Map<String, Object> indexed = new java.util.HashMap<>();
        indexed.put("id", saved.getId() == null ? null : saved.getId().toString());
        indexed.put("projectId", saved.getProjectId() == null ? null : saved.getProjectId().toString());
        indexed.put("title", saved.getTitle());
        indexed.put("content", saved.getContent());
        indexed.put("type", saved.getType());
        searchService.indexDocument("documents", saved.getId().toString(), indexed);

        return saved;
    }

    @Transactional
    public Document updateForUser(UUID userId, UUID id, Map<String, Object> body) {
        if (userId == null) return null;
        Document existing = documentRepository.findById(id).orElse(null);
        if (existing == null) return null;
        projectAccessService.assertProjectAccess(userId, existing.getProjectId());

        boolean hasContent = body.containsKey("content");
        String nextContent = hasContent ? (String) body.get("content") : null;
        boolean contentChanged = hasContent && (nextContent == null || !nextContent.equals(existing.getContent()));

        try {
            objectMapper.updateValue(existing, body);
        } catch (com.fasterxml.jackson.databind.JsonMappingException ex) {
            throw new IllegalArgumentException("문서 업데이트 형식이 올바르지 않습니다.");
        }
        if (contentChanged) {
            existing.setWordCount(computeWordCount(nextContent));
        }

        Document saved = documentRepository.save(existing);

        if (contentChanged) {
            if (shouldCreateAutoVersion(saved.getId())) {
                DocumentVersion version = new DocumentVersion();
                version.setDocumentId(saved.getId());
                version.setContent(saved.getContent() == null ? "" : saved.getContent());
                version.setWordCount(saved.getWordCount());
                version.setVersionName("자동 저장");
                version.setCreatedBy(userId);
                versionRepository.save(version);
            }
            refreshProjectWordCount(saved.getProjectId());
        }

        Map<String, Object> indexed = new java.util.HashMap<>();
        indexed.put("id", saved.getId() == null ? null : saved.getId().toString());
        indexed.put("projectId", saved.getProjectId() == null ? null : saved.getProjectId().toString());
        indexed.put("title", saved.getTitle());
        indexed.put("content", saved.getContent());
        indexed.put("type", saved.getType());
        searchService.indexDocument("documents", saved.getId().toString(), indexed);

        return saved;
    }

    @Transactional
    public void removeForUser(UUID userId, UUID id) {
        if (userId == null) return;
        Document doc = documentRepository.findById(id).orElse(null);
        if (doc == null) return;
        projectAccessService.assertProjectAccess(userId, doc.getProjectId());
        documentRepository.deleteById(id);
        refreshProjectWordCount(doc.getProjectId());
    }

    private int computeWordCount(String content) {
        if (content == null || content.isBlank()) return 0;
        String plain = content
            .replaceAll("<[^>]*>", " ")
            .replace("&nbsp;", " ")
            .replaceAll("\\s+", " ")
            .trim();
        if (plain.isBlank()) return 0;
        Pattern pattern = Pattern.compile("[\\p{L}\\p{N}]+", Pattern.UNICODE_CHARACTER_CLASS);
        Matcher matcher = pattern.matcher(plain);
        int count = 0;
        while (matcher.find()) count++;
        return count;
    }

    private void refreshProjectWordCount(UUID projectId) {
        Long sum = documentRepository.sumWordCount(projectId);
        int wordCount = sum == null ? 0 : sum.intValue();
        projectRepository.updateWordCount(projectId, wordCount);
        goalRepository.updateCurrentWords(projectId, wordCount);
    }

    private boolean shouldCreateAutoVersion(UUID documentId) {
        var last = versionRepository.findTopByDocumentIdOrderByCreatedAtDesc(documentId).orElse(null);
        if (last == null || last.getCreatedAt() == null) return true;
        long diff = java.time.Duration.between(last.getCreatedAt(), OffsetDateTime.now()).toMillis();
        return diff >= AUTO_VERSION_MIN_INTERVAL_MS;
    }
}
