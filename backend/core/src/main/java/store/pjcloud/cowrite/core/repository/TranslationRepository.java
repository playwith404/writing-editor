package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.Translation;

public interface TranslationRepository extends JpaRepository<Translation, UUID> {
    List<Translation> findByDocumentIdOrderByCreatedAtDesc(UUID documentId);
    List<Translation> findByDocumentIdInOrderByCreatedAtDesc(List<UUID> documentIds);
}
