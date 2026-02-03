package store.pjcloud.cowrite.core.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.entity.Translation;
import store.pjcloud.cowrite.core.repository.DocumentRepository;
import store.pjcloud.cowrite.core.repository.TranslationRepository;

@Service
public class TranslationsService {
    private final TranslationRepository translationsRepo;
    private final DocumentRepository documentsRepo;
    private final ProjectAccessService projectAccessService;
    private final AiService aiService;

    public TranslationsService(TranslationRepository translationsRepo,
                               DocumentRepository documentsRepo,
                               ProjectAccessService projectAccessService,
                               AiService aiService) {
        this.translationsRepo = translationsRepo;
        this.documentsRepo = documentsRepo;
        this.projectAccessService = projectAccessService;
        this.aiService = aiService;
    }

    private Document assertDocumentAccess(UUID userId, UUID documentId) {
        Document doc = documentsRepo.findById(documentId).orElse(null);
        if (doc == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서를 찾을 수 없습니다.");
        projectAccessService.assertProjectAccess(userId, doc.getProjectId());
        return doc;
    }

    public List<Translation> findAllForUser(UUID userId, UUID documentId) {
        assertDocumentAccess(userId, documentId);
        return translationsRepo.findByDocumentIdOrderByCreatedAtDesc(documentId);
    }

    public Translation findOneForUser(UUID userId, UUID id) {
        Translation entity = translationsRepo.findById(id).orElse(null);
        if (entity == null) return null;
        assertDocumentAccess(userId, entity.getDocumentId());
        return entity;
    }

    @Transactional
    public Translation createForUser(UUID userId, Translation dto) {
        if (dto.getDocumentId() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "documentId가 필요합니다.");
        assertDocumentAccess(userId, dto.getDocumentId());
        return translationsRepo.save(dto);
    }

    @Transactional
    public Translation generateForUser(AiService.UserContext user, Map<String, Object> body) {
        Object documentIdObj = body.get("documentId");
        Object targetLangObj = body.get("targetLanguage");
        if (!(documentIdObj instanceof String) || ((String) documentIdObj).isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "documentId가 필요합니다.");
        }
        if (!(targetLangObj instanceof String) || ((String) targetLangObj).isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "targetLanguage가 필요합니다.");
        }

        UUID documentId = UUID.fromString((String) documentIdObj);
        Document doc = assertDocumentAccess(user.userId(), documentId);
        String text = String.join("\n\n", java.util.List.of(doc.getTitle(), doc.getContent()).stream().filter(v -> v != null && !v.isBlank()).toList());
        if (text.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 내용이 없습니다.");

        Map<String, Object> payload = Map.of(
            "text", text,
            "target_language", targetLangObj,
            "provider", body.get("provider"),
            "model", body.get("model"),
            "projectId", doc.getProjectId().toString()
        );

        Object ai = aiService.proxy(user, "translate", "/ai/translate", new java.util.HashMap<>(payload));
        String content = null;
        if (ai instanceof Map<?, ?> map && map.get("content") instanceof String s) content = s;

        Translation entity = new Translation();
        entity.setDocumentId(doc.getId());
        entity.setTargetLanguage((String) targetLangObj);
        entity.setProvider(body.get("provider") instanceof String s ? s : null);
        entity.setContent(content);
        return translationsRepo.save(entity);
    }

    @Transactional
    public void removeForUser(UUID userId, UUID id) {
        Translation entity = translationsRepo.findById(id).orElse(null);
        if (entity == null) return;
        assertDocumentAccess(userId, entity.getDocumentId());
        translationsRepo.deleteById(id);
    }
}
