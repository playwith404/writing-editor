package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.ReaderPrediction;

public interface ReaderPredictionRepository extends JpaRepository<ReaderPrediction, UUID> {
    List<ReaderPrediction> findByDocumentIdOrderByCreatedAtDesc(UUID documentId);
    List<ReaderPrediction> findByDocumentIdInOrderByCreatedAtDesc(List<UUID> documentIds);
}
