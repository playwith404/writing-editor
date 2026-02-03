package store.pjcloud.cowrite.core.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.entity.Payment;
import store.pjcloud.cowrite.core.entity.Subscription;
import store.pjcloud.cowrite.core.entity.User;
import store.pjcloud.cowrite.core.repository.PaymentRepository;
import store.pjcloud.cowrite.core.repository.SubscriptionRepository;

@Service
public class BillingService {
    private final UsersService usersService;
    private final SubscriptionRepository subscriptionsRepo;
    private final PaymentRepository paymentsRepo;

    private static final Map<String, String> PLAN_ROLE = Map.of(
        "free", "user",
        "pro", "pro",
        "master", "master"
    );

    public BillingService(UsersService usersService,
                          SubscriptionRepository subscriptionsRepo,
                          PaymentRepository paymentsRepo) {
        this.usersService = usersService;
        this.subscriptionsRepo = subscriptionsRepo;
        this.paymentsRepo = paymentsRepo;
    }

    public List<Map<String, Object>> getPlans() {
        return List.of(
            Map.of("id", "free", "name", "Free", "priceMonthly", 0, "currency", "KRW", "features", List.of("기본 에디터", "프로젝트 1개", "AI 50회/월")),
            Map.of("id", "pro", "name", "Pro", "priceMonthly", 9900, "currency", "KRW", "features", List.of("무제한 프로젝트", "AI 500회/월", "클라우드")),
            Map.of("id", "master", "name", "Master", "priceMonthly", 19900, "currency", "KRW", "features", List.of("무제한 AI", "팀 협업", "우선 지원"))
        );
    }

    private boolean isPlanId(String value) {
        return PLAN_ROLE.containsKey(value);
    }

    private OffsetDateTime addMonths(OffsetDateTime date, int months) {
        return date.plusMonths(months);
    }

    @Transactional
    public Map<String, Object> getSubscriptionForUser(UUID userId) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "로그인이 필요합니다.");

        Subscription subscription = subscriptionsRepo.findTopByUserIdOrderByCreatedAtDesc(userId).orElse(null);
        if (subscription == null || !"active".equals(subscription.getStatus())) {
            return Map.of("plan", "free", "status", "none");
        }

        Subscription normalized = downgradeIfExpired(userId, subscription);
        return Map.of(
            "id", normalized.getId(),
            "plan", normalized.getPlan(),
            "status", normalized.getStatus(),
            "provider", normalized.getProvider(),
            "currentPeriodStart", normalized.getCurrentPeriodStart(),
            "currentPeriodEnd", normalized.getCurrentPeriodEnd(),
            "cancelAtPeriodEnd", normalized.getCancelAtPeriodEnd()
        );
    }

    private Subscription downgradeIfExpired(UUID userId, Subscription subscription) {
        if (!"active".equals(subscription.getStatus())) return subscription;
        if (subscription.getCurrentPeriodEnd() == null) return subscription;
        if (subscription.getCurrentPeriodEnd().isAfter(OffsetDateTime.now())) return subscription;

        subscription.setStatus("expired");
        subscriptionsRepo.save(subscription);
        User patch = new User();
        patch.setRole(PLAN_ROLE.get("free"));
        usersService.updateAllowNulls(userId, patch);
        return subscription;
    }

    @Transactional
    public Map<String, Object> requestSubscription(UUID userId, String plan) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "로그인이 필요합니다.");
        if (!isPlanId(plan)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 요금제입니다.");

        if ("free".equals(plan)) {
            return Map.of("success", true, "message", "Free 플랜은 결제가 필요하지 않습니다.");
        }

        Subscription created = new Subscription();
        created.setUserId(userId);
        created.setPlan(plan);
        created.setStatus("pending");
        created.setProvider("manual");
        subscriptionsRepo.save(created);

        return Map.of(
            "success", true,
            "message", "요금제 변경 요청이 접수되었습니다. 결제 연동 전까지는 관리자 승인 후 활성화됩니다.",
            "subscriptionId", created.getId()
        );
    }

    @Transactional
    public Map<String, Object> adminActivateSubscription(AiService.UserContext actor, UUID userId, String plan, int months) {
        if (actor == null || actor.userId() == null || !"admin".equals(actor.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 수행할 수 있습니다.");
        }
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId가 필요합니다.");
        if (!isPlanId(plan)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 요금제입니다.");
        if (months < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "months는 1 이상이어야 합니다.");

        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime periodEnd = addMonths(now, months);

        subscriptionsRepo.findTopByUserIdOrderByCreatedAtDesc(userId).ifPresent(existing -> {
            if ("active".equals(existing.getStatus())) {
                existing.setStatus("canceled");
                existing.setCanceledAt(now);
                subscriptionsRepo.save(existing);
            }
        });

        Subscription subscription = new Subscription();
        subscription.setUserId(userId);
        subscription.setPlan(plan);
        subscription.setStatus("active");
        subscription.setProvider("manual");
        subscription.setCurrentPeriodStart(now);
        subscription.setCurrentPeriodEnd(periodEnd);
        subscription.setCancelAtPeriodEnd(false);
        subscriptionsRepo.save(subscription);

        int amount = "pro".equals(plan) ? 9900 * months : "master".equals(plan) ? 19900 * months : 0;
        if (amount > 0) {
            Payment payment = new Payment();
            payment.setUserId(userId);
            payment.setSubscriptionId(subscription.getId());
            payment.setProvider("manual");
            payment.setAmount(amount);
            payment.setCurrency("KRW");
            payment.setStatus("completed");
            payment.setCompletedAt(now);
            payment.setMetadata(Map.of("plan", plan, "months", months));
            paymentsRepo.save(payment);
        }

        User patch = new User();
        patch.setRole(PLAN_ROLE.get(plan));
        usersService.updateAllowNulls(userId, patch);
        return Map.of("success", true, "subscriptionId", subscription.getId(), "plan", plan, "currentPeriodEnd", periodEnd);
    }

    @Transactional
    public Map<String, Object> adminCancelSubscription(AiService.UserContext actor, UUID userId) {
        if (actor == null || actor.userId() == null || !"admin".equals(actor.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 수행할 수 있습니다.");
        }
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId가 필요합니다.");
        OffsetDateTime now = OffsetDateTime.now();

        subscriptionsRepo.findTopByUserIdOrderByCreatedAtDesc(userId).ifPresent(existing -> {
            if ("active".equals(existing.getStatus())) {
                existing.setStatus("canceled");
                existing.setCanceledAt(now);
                subscriptionsRepo.save(existing);
            }
        });

        User patch = new User();
        patch.setRole(PLAN_ROLE.get("free"));
        usersService.updateAllowNulls(userId, patch);
        return Map.of("success", true);
    }
}
