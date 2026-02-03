package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.DocumentVersion;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID> {
    List<DocumentVersion> findByDocumentIdOrderByCreatedAtDesc(UUID documentId);
    List<DocumentVersion> findByDocumentIdInOrderByCreatedAtDesc(List<UUID> documentIds);
    Optional<DocumentVersion> findTopByDocumentIdOrderByCreatedAtDesc(UUID documentId);
}
