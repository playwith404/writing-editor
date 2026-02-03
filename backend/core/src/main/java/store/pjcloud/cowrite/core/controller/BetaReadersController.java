package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.entity.BetaReaderProfile;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.BetaReadersService;

@RestController
@RequestMapping("/beta-readers")
public class BetaReadersController {
    private final BetaReadersService betaReadersService;

    public BetaReadersController(BetaReadersService betaReadersService) {
        this.betaReadersService = betaReadersService;
    }

    @GetMapping("/me")
    public BetaReaderProfile me() {
        UUID userId = SecurityUtils.requireUserId();
        return betaReadersService.getMyProfile(userId);
    }

    @PostMapping("/me")
    public BetaReaderProfile upsertMe(@RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtils.requireUserId();
        return betaReadersService.upsertMyProfile(userId, body);
    }

    @GetMapping("/recommendations")
    public List<Map<String, Object>> recommendations(@RequestParam("projectId") UUID projectId) {
        UUID userId = SecurityUtils.requireUserId();
        return betaReadersService.recommendForProject(userId, projectId);
    }
}
