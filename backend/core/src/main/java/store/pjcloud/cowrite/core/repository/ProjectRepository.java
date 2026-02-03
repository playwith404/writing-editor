package store.pjcloud.cowrite.core.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import store.pjcloud.cowrite.core.entity.Project;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByOwnerId(UUID ownerId);
    long countByOwnerIdAndDeletedAtIsNull(UUID ownerId);
    boolean existsByIdAndOwnerId(UUID id, UUID ownerId);

    @Modifying
    @Query("update Project p set p.wordCount = :count where p.id = :projectId")
    void updateWordCount(@Param("projectId") UUID projectId, @Param("count") Integer count);
}
