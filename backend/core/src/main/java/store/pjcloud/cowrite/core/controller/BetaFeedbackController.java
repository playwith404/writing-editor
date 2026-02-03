package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.BetaFeedbackService;

@RestController
@RequestMapping("/beta-feedback")
public class BetaFeedbackController {
    private final BetaFeedbackService betaFeedbackService;

    public BetaFeedbackController(BetaFeedbackService betaFeedbackService) {
        this.betaFeedbackService = betaFeedbackService;
    }

    @GetMapping
    public List<Map<String, Object>> findAll(@RequestParam(value = "sessionId", required = false) UUID sessionId) {
        UUID userId = SecurityUtils.requireUserId();
        if (sessionId == null) return List.of();
        return betaFeedbackService.findAllForUser(userId, sessionId);
    }

    @GetMapping("/{id}")
    public Map<String, Object> findOne(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return betaFeedbackService.findOneForUser(userId, id);
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        return betaFeedbackService.createForUser(userId, body);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> remove(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        betaFeedbackService.removeForUser(userId, id);
        return Map.of("success", true);
    }
}
