package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.AudioAsset;

public interface AudioAssetRepository extends JpaRepository<AudioAsset, UUID> {
    List<AudioAsset> findByDocumentIdOrderByCreatedAtDesc(UUID documentId);
    List<AudioAsset> findByDocumentIdInOrderByCreatedAtDesc(List<UUID> documentIds);
}
