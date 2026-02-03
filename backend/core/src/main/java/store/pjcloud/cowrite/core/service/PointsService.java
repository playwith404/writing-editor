package store.pjcloud.cowrite.core.service;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.entity.PointTransaction;
import store.pjcloud.cowrite.core.repository.PointTransactionRepository;

@Service
public class PointsService {
    private final PointTransactionRepository pointsRepo;

    public PointsService(PointTransactionRepository pointsRepo) {
        this.pointsRepo = pointsRepo;
    }

    @Transactional
    public void addPoints(UUID userId, int amount, String reason, String refType, UUID refId, java.util.Map<String, Object> metadata) {
        if (userId == null) return;
        if (amount == 0) return;
        PointTransaction tx = new PointTransaction();
        tx.setUserId(userId);
        tx.setAmount(amount);
        tx.setReason(reason);
        tx.setRefType(refType);
        tx.setRefId(refId);
        tx.setMetadata(metadata);
        pointsRepo.save(tx);
    }

    public java.util.Map<String, Object> balance(UUID userId) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "로그인이 필요합니다.");
        List<PointTransaction> all = pointsRepo.findByUserIdOrderByCreatedAtDesc(userId);
        int sum = all.stream().mapToInt(PointTransaction::getAmount).sum();
        return java.util.Map.of("balance", sum);
    }

    public List<PointTransaction> transactions(UUID userId) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "로그인이 필요합니다.");
        List<PointTransaction> list = pointsRepo.findByUserIdOrderByCreatedAtDesc(userId);
        if (list.size() > 100) return list.subList(0, 100);
        return list;
    }
}
