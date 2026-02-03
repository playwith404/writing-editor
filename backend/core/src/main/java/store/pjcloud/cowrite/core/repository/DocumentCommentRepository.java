package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.DocumentComment;

public interface DocumentCommentRepository extends JpaRepository<DocumentComment, UUID> {
    List<DocumentComment> findByDocumentIdOrderByCreatedAtAsc(UUID documentId);
    List<DocumentComment> findByDocumentIdInOrderByCreatedAtAsc(List<UUID> documentIds);
}
