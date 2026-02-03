package store.pjcloud.cowrite.core.service;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.entity.DocumentComment;
import store.pjcloud.cowrite.core.repository.DocumentCommentRepository;
import store.pjcloud.cowrite.core.repository.DocumentRepository;

@Service
public class DocumentCommentsService {
    private final DocumentCommentRepository commentsRepo;
    private final DocumentRepository documentsRepo;
    private final ProjectAccessService projectAccessService;

    public DocumentCommentsService(DocumentCommentRepository commentsRepo,
                                   DocumentRepository documentsRepo,
                                   ProjectAccessService projectAccessService) {
        this.commentsRepo = commentsRepo;
        this.documentsRepo = documentsRepo;
        this.projectAccessService = projectAccessService;
    }

    private Document assertDocumentAccess(UUID userId, UUID documentId) {
        Document doc = documentsRepo.findById(documentId).orElse(null);
        if (doc == null) {
            throw new IllegalArgumentException("문서를 찾을 수 없습니다.");
        }
        projectAccessService.assertProjectAccess(userId, doc.getProjectId());
        return doc;
    }

    public List<DocumentComment> findAllForUser(UUID userId, UUID documentId) {
        assertDocumentAccess(userId, documentId);
        return commentsRepo.findByDocumentIdOrderByCreatedAtAsc(documentId);
    }

    public DocumentComment findOneForUser(UUID userId, UUID id) {
        DocumentComment comment = commentsRepo.findById(id).orElse(null);
        if (comment == null) return null;
        assertDocumentAccess(userId, comment.getDocumentId());
        return comment;
    }

    @Transactional
    public DocumentComment createForUser(UUID userId, DocumentComment dto) {
        if (dto.getDocumentId() == null) {
            throw new IllegalArgumentException("documentId가 필요합니다.");
        }
        assertDocumentAccess(userId, dto.getDocumentId());
        if (dto.getUserId() == null) dto.setUserId(userId);
        return commentsRepo.save(dto);
    }

    @Transactional
    public DocumentComment updateForUser(UUID userId, UUID id, DocumentComment dto) {
        DocumentComment existing = commentsRepo.findById(id).orElse(null);
        if (existing == null) return null;
        assertDocumentAccess(userId, existing.getDocumentId());
        if (dto.getContent() != null) existing.setContent(dto.getContent());
        if (dto.getPosition() != null) existing.setPosition(dto.getPosition());
        return commentsRepo.save(existing);
    }

    @Transactional
    public void removeForUser(UUID userId, UUID id) {
        DocumentComment existing = commentsRepo.findById(id).orElse(null);
        if (existing == null) return;
        assertDocumentAccess(userId, existing.getDocumentId());
        commentsRepo.deleteById(id);
    }
}
