package store.pjcloud.cowrite.core.repository;

import org.springframework.stereotype.Repository;
import store.pjcloud.cowrite.core.common.ProjectScopedRepository;
import store.pjcloud.cowrite.core.entity.WorldSetting;

@Repository
public interface WorldSettingRepository extends ProjectScopedRepository<WorldSetting> {
}
