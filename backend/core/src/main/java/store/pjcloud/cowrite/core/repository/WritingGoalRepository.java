package store.pjcloud.cowrite.core.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import store.pjcloud.cowrite.core.common.ProjectScopedRepository;
import store.pjcloud.cowrite.core.entity.WritingGoal;

@Repository
public interface WritingGoalRepository extends ProjectScopedRepository<WritingGoal> {
    @Modifying
    @Transactional
    @Query("update WritingGoal w set w.currentWords = :count where w.projectId = :projectId")
    void updateCurrentWords(@Param("projectId") UUID projectId, @Param("count") Integer count);
}
