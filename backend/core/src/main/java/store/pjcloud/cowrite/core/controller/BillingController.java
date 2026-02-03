package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.AiService;
import store.pjcloud.cowrite.core.service.BillingService;

@RestController
@RequestMapping("/billing")
public class BillingController {
    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @GetMapping("/plans")
    public List<Map<String, Object>> plans() {
        return billingService.getPlans();
    }

    @GetMapping("/subscription")
    public Map<String, Object> subscription() {
        UUID userId = SecurityUtils.requireUserId();
        return billingService.getSubscriptionForUser(userId);
    }

    @PostMapping("/subscribe")
    public Map<String, Object> subscribe(@RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        String plan = body.get("plan") instanceof String s ? s : null;
        return billingService.requestSubscription(userId, plan);
    }

    @PostMapping("/admin/activate")
    public Map<String, Object> adminActivate(@RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        String role = SecurityUtils.getRole();
        AiService.UserContext actor = new AiService.UserContext(userId, role);

        UUID targetUserId = body.get("userId") instanceof String s && !s.isBlank() ? UUID.fromString(s) : null;
        String plan = body.get("plan") instanceof String s ? s : null;
        int months = body.get("months") instanceof Number n ? n.intValue() : 1;
        return billingService.adminActivateSubscription(actor, targetUserId, plan, months);
    }

    @PostMapping("/admin/cancel")
    public Map<String, Object> adminCancel(@RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        String role = SecurityUtils.getRole();
        AiService.UserContext actor = new AiService.UserContext(userId, role);

        UUID targetUserId = body.get("userId") instanceof String s && !s.isBlank() ? UUID.fromString(s) : null;
        return billingService.adminCancelSubscription(actor, targetUserId);
    }
}
