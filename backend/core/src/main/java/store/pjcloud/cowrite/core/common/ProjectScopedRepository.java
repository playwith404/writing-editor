package store.pjcloud.cowrite.core.common;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.NoRepositoryBean;

@NoRepositoryBean
public interface ProjectScopedRepository<T extends ProjectScoped> extends JpaRepository<T, UUID>, JpaSpecificationExecutor<T> {
}
