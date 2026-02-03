package store.pjcloud.cowrite.core.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import store.pjcloud.cowrite.core.entity.PlotPoint;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.PlotPointsService;

@RestController
@RequestMapping("/plot-points")
public class PlotPointsController {
    private final PlotPointsService service;

    public PlotPointsController(PlotPointsService service) {
        this.service = service;
    }

    @GetMapping
    public List<PlotPoint> list(@RequestParam("plotId") UUID plotId) {
        UUID userId = SecurityUtils.requireUserId();
        return service.findAllForUser(userId, plotId);
    }

    @GetMapping("/{id}")
    public PlotPoint get(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        return service.findOneForUser(userId, id);
    }

    @PostMapping
    public PlotPoint create(@RequestBody PlotPoint body) {
        UUID userId = SecurityUtils.requireUserId();
        return service.createForUser(userId, body);
    }

    @PatchMapping("/{id}")
    public PlotPoint update(@PathVariable("id") UUID id, @RequestBody PlotPoint body) {
        UUID userId = SecurityUtils.requireUserId();
        return service.updateForUser(userId, id, body);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable("id") UUID id) {
        UUID userId = SecurityUtils.requireUserId();
        service.removeForUser(userId, id);
        return Map.of("success", true);
    }
}
