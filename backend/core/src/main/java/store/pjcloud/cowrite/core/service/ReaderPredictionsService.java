package store.pjcloud.cowrite.core.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.entity.ReaderPrediction;
import store.pjcloud.cowrite.core.repository.DocumentRepository;
import store.pjcloud.cowrite.core.repository.ReaderPredictionRepository;

@Service
public class ReaderPredictionsService {
    private final ReaderPredictionRepository predictionsRepo;
    private final DocumentRepository documentsRepo;
    private final ProjectAccessService projectAccessService;
    private final AiService aiService;

    public ReaderPredictionsService(ReaderPredictionRepository predictionsRepo,
                                    DocumentRepository documentsRepo,
                                    ProjectAccessService projectAccessService,
                                    AiService aiService) {
        this.predictionsRepo = predictionsRepo;
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

    public List<ReaderPrediction> findAllForUser(UUID userId, UUID documentId) {
        assertDocumentAccess(userId, documentId);
        return predictionsRepo.findByDocumentIdOrderByCreatedAtDesc(documentId);
    }

    public ReaderPrediction findOneForUser(UUID userId, UUID id) {
        ReaderPrediction entity = predictionsRepo.findById(id).orElse(null);
        if (entity == null) return null;
        assertDocumentAccess(userId, entity.getDocumentId());
        return entity;
    }

    @Transactional
    public ReaderPrediction createForUser(UUID userId, ReaderPrediction dto) {
        if (dto.getDocumentId() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "documentId가 필요합니다.");
        assertDocumentAccess(userId, dto.getDocumentId());
        return predictionsRepo.save(dto);
    }

    @Transactional
    public ReaderPrediction generateForUser(AiService.UserContext user, Map<String, Object> body) {
        Object documentIdObj = body.get("documentId");
        if (!(documentIdObj instanceof String) || ((String) documentIdObj).isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "documentId가 필요합니다.");
        }
        UUID documentId = UUID.fromString((String) documentIdObj);
        Document doc = assertDocumentAccess(user.userId(), documentId);
        String text = String.join("\n\n", java.util.List.of(doc.getTitle(), doc.getContent()).stream().filter(v -> v != null && !v.isBlank()).toList());
        if (text.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 내용이 없습니다.");

        Map<String, Object> payload = Map.of(
            "text", text,
            "provider", body.get("provider"),
            "model", body.get("model"),
            "projectId", doc.getProjectId().toString()
        );

        Object ai = aiService.proxy(user, "predict", "/ai/predict", new java.util.HashMap<>(payload));
        ReaderPrediction entity = new ReaderPrediction();
        entity.setDocumentId(doc.getId());
        entity.setProvider(body.get("provider") instanceof String s ? s : null);
        if (ai instanceof Map<?, ?> map) {
            entity.setResult(new com.fasterxml.jackson.databind.ObjectMapper().convertValue(map, Map.class));
        }
        return predictionsRepo.save(entity);
    }

    @Transactional
    public void removeForUser(UUID userId, UUID id) {
        ReaderPrediction entity = predictionsRepo.findById(id).orElse(null);
        if (entity == null) return;
        assertDocumentAccess(userId, entity.getDocumentId());
        predictionsRepo.deleteById(id);
    }
}
