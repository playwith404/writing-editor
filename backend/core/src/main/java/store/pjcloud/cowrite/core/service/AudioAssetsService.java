package store.pjcloud.cowrite.core.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.entity.AudioAsset;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.repository.AudioAssetRepository;
import store.pjcloud.cowrite.core.repository.DocumentRepository;

@Service
public class AudioAssetsService {
    private final AudioAssetRepository audioRepo;
    private final DocumentRepository documentsRepo;
    private final ProjectAccessService projectAccessService;
    private final AiService aiService;

    public AudioAssetsService(AudioAssetRepository audioRepo,
                              DocumentRepository documentsRepo,
                              ProjectAccessService projectAccessService,
                              AiService aiService) {
        this.audioRepo = audioRepo;
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

    public List<AudioAsset> findAllForUser(UUID userId, UUID documentId) {
        assertDocumentAccess(userId, documentId);
        return audioRepo.findByDocumentIdOrderByCreatedAtDesc(documentId);
    }

    public AudioAsset findOneForUser(UUID userId, UUID id) {
        AudioAsset asset = audioRepo.findById(id).orElse(null);
        if (asset == null) return null;
        assertDocumentAccess(userId, asset.getDocumentId());
        return asset;
    }

    @Transactional
    public AudioAsset createForUser(UUID userId, AudioAsset dto) {
        if (dto.getDocumentId() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "documentId가 필요합니다.");
        assertDocumentAccess(userId, dto.getDocumentId());
        return audioRepo.save(dto);
    }

    @Transactional
    public AudioAsset generateForUser(AiService.UserContext user, Map<String, Object> body) {
        Object documentIdObj = body.get("documentId");
        if (!(documentIdObj instanceof String) || ((String) documentIdObj).isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "documentId가 필요합니다.");
        }
        UUID documentId = UUID.fromString((String) documentIdObj);
        Document doc = assertDocumentAccess(user.userId(), documentId);
        String text = String.join("\n\n", java.util.List.of(doc.getTitle(), doc.getContent()).stream().filter(v -> v != null && !v.isBlank()).toList());
        if (text.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 내용이 없습니다.");

        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("text", text);
        payload.put("projectId", doc.getProjectId().toString());
        if (body.get("voice") instanceof String s && !s.isBlank()) payload.put("voice", s);
        if (body.get("provider") instanceof String s && !s.isBlank()) payload.put("provider", s);
        if (body.get("model") instanceof String s && !s.isBlank()) payload.put("model", s);

        Object ai = aiService.proxy(user, "tts", "/ai/tts", payload);
        AudioAsset asset = new AudioAsset();
        asset.setDocumentId(doc.getId());
        asset.setVoice(body.get("voice") instanceof String s ? s : null);
        asset.setProvider(body.get("provider") instanceof String s ? s : null);
        if (ai instanceof Map<?, ?> map && map.get("content") instanceof String s) {
            asset.setScript(s);
        }
        return audioRepo.save(asset);
    }

    @Transactional
    public void removeForUser(UUID userId, UUID id) {
        AudioAsset asset = audioRepo.findById(id).orElse(null);
        if (asset == null) return;
        assertDocumentAccess(userId, asset.getDocumentId());
        audioRepo.deleteById(id);
    }
}
