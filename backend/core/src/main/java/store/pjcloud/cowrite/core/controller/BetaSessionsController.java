package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.entity.BetaSession;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.BetaSessionsService;

@RestController
@RequestMapping("/beta-sessions")
public class BetaSessionsController {
    private final BetaSessionsService betaSessionsService;

    public BetaSessionsController(BetaSessionsService betaSessionsService) {
        this.betaSessionsService = betaSessionsService;
    }

    @GetMapping
    public List<BetaSession> list(@RequestParam(value = "projectId", required = false) UUID projectId) {
        UUID userId = SecurityUtils.requireUserId();
        return betaSessionsService.listForUser(userId, projectId);
    }

    @GetMapping("/invite")
    public Map<String, Object> inviteInfo(@RequestParam("token") String token) {
        UUID userId = SecurityUtils.requireUserId();
        return betaSessionsService.getInviteInfo(userId, token);
    }

    @PostMapping("/join")
    public Map<String, Object> join(@RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        String token = body.get("token") instanceof String s ? s : null;
        return betaSessionsService.joinByInvite(userId, token);
    }

    @GetMapping("/{id}")
    public BetaSession findOne(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return betaSessionsService.findOneForUser(userId, id);
    }

    @PostMapping
    public BetaSession create(@RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        return betaSessionsService.createForUser(userId, body);
    }

    @PatchMapping("/{id}")
    public BetaSession update(@PathVariable("id") UUID id, @RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        return betaSessionsService.updateForUser(userId, id, body);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> remove(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        betaSessionsService.removeForUser(userId, id);
        return Map.of("success", true);
    }

    @PostMapping("/{id}/invites")
    public Map<String, Object> createInvite(@PathVariable("id") UUID id, @RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        return betaSessionsService.createInviteForSession(userId, id, body);
    }

    @GetMapping("/{id}/participants")
    public List<Map<String, Object>> participants(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return betaSessionsService.listParticipantsForSession(userId, id);
    }

    @GetMapping("/{id}/document")
    public Document document(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return betaSessionsService.getSessionDocumentForUser(userId, id);
    }
}
