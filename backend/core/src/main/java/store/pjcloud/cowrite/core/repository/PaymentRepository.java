package store.pjcloud.cowrite.core.repository;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import store.pjcloud.cowrite.core.entity.Payment;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
}
