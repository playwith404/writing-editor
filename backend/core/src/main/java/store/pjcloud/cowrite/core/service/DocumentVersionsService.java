package store.pjcloud.cowrite.core.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
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
public class DocumentVersionsService {
    private final DocumentVersionRepository versionsRepo;
    private final DocumentRepository documentsRepo;
    private final ProjectRepository projectsRepo;
    private final WritingGoalRepository goalsRepo;
    private final SearchService searchService;
    private final ProjectAccessService projectAccessService;

    public DocumentVersionsService(DocumentVersionRepository versionsRepo,
                                   DocumentRepository documentsRepo,
                                   ProjectRepository projectsRepo,
                                   WritingGoalRepository goalsRepo,
                                   SearchService searchService,
                                   ProjectAccessService projectAccessService) {
        this.versionsRepo = versionsRepo;
        this.documentsRepo = documentsRepo;
        this.projectsRepo = projectsRepo;
        this.goalsRepo = goalsRepo;
        this.searchService = searchService;
        this.projectAccessService = projectAccessService;
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
        Long sum = documentsRepo.sumWordCount(projectId);
        int wordCount = sum == null ? 0 : sum.intValue();
        projectsRepo.updateWordCount(projectId, wordCount);
        goalsRepo.updateCurrentWords(projectId, wordCount);
    }

    private Document assertDocumentAccess(UUID userId, UUID documentId) {
        Document doc = documentsRepo.findById(documentId).orElse(null);
        if (doc == null) {
            throw new IllegalArgumentException("문서를 찾을 수 없습니다.");
        }
        projectAccessService.assertProjectAccess(userId, doc.getProjectId());
        return doc;
    }

    public List<DocumentVersion> findAllForUser(UUID userId, UUID documentId) {
        assertDocumentAccess(userId, documentId);
        return versionsRepo.findByDocumentIdOrderByCreatedAtDesc(documentId);
    }

    public DocumentVersion findOneForUser(UUID userId, UUID id) {
        DocumentVersion version = versionsRepo.findById(id).orElse(null);
        if (version == null) return null;
        assertDocumentAccess(userId, version.getDocumentId());
        return version;
    }

    @Transactional
    public DocumentVersion createForUser(UUID userId, DocumentVersion dto) {
        if (dto.getDocumentId() == null) {
            throw new IllegalArgumentException("documentId가 필요합니다.");
        }
        assertDocumentAccess(userId, dto.getDocumentId());
        if (dto.getCreatedBy() == null) dto.setCreatedBy(userId);
        return versionsRepo.save(dto);
    }

    @Transactional
    public void removeForUser(UUID userId, UUID id) {
        DocumentVersion version = versionsRepo.findById(id).orElse(null);
        if (version == null) return;
        assertDocumentAccess(userId, version.getDocumentId());
        versionsRepo.deleteById(id);
    }

    @Transactional
    public Document restoreForUser(UUID userId, UUID versionId) {
        DocumentVersion version = versionsRepo.findById(versionId).orElse(null);
        if (version == null) {
            throw new IllegalArgumentException("버전을 찾을 수 없습니다.");
        }

        Document doc = assertDocumentAccess(userId, version.getDocumentId());

        DocumentVersion backup = new DocumentVersion();
        backup.setDocumentId(doc.getId());
        backup.setContent(doc.getContent() == null ? "" : doc.getContent());
        backup.setWordCount(doc.getWordCount());
        backup.setVersionName("복원 전 백업");
        backup.setCreatedBy(userId);
        versionsRepo.save(backup);

        int wordCount = version.getWordCount() != null ? version.getWordCount() : computeWordCount(version.getContent());
        doc.setContent(version.getContent());
        doc.setWordCount(wordCount);
        Document updated = documentsRepo.save(doc);

        refreshProjectWordCount(updated.getProjectId());
        java.util.Map<String, Object> indexed = new java.util.HashMap<>();
        indexed.put("id", updated.getId() == null ? null : updated.getId().toString());
        indexed.put("projectId", updated.getProjectId() == null ? null : updated.getProjectId().toString());
        indexed.put("title", updated.getTitle());
        indexed.put("content", updated.getContent());
        indexed.put("type", updated.getType());
        searchService.indexDocument("documents", updated.getId().toString(), indexed);

        return updated;
    }
}
