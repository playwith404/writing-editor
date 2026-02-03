package store.pjcloud.cowrite.core.repository;

import org.springframework.stereotype.Repository;
import store.pjcloud.cowrite.core.common.ProjectScopedRepository;
import store.pjcloud.cowrite.core.entity.Character;

@Repository
public interface CharacterRepository extends ProjectScopedRepository<Character> {
}
