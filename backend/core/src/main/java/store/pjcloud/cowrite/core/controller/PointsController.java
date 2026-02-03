package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.entity.PointTransaction;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.PointsService;

@RestController
@RequestMapping("/points")
public class PointsController {
    private final PointsService pointsService;

    public PointsController(PointsService pointsService) {
        this.pointsService = pointsService;
    }

    @GetMapping("/balance")
    public Map<String, Object> balance() {
        UUID userId = SecurityUtils.requireUserId();
        return pointsService.balance(userId);
    }

    @GetMapping("/transactions")
    public List<PointTransaction> transactions() {
        UUID userId = SecurityUtils.requireUserId();
        return pointsService.transactions(userId);
    }
}
