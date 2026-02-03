package store.pjcloud.cowrite.core.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.Subscription;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {
    Optional<Subscription> findTopByUserIdOrderByCreatedAtDesc(UUID userId);
}
