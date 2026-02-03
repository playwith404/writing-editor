package store.pjcloud.cowrite.core.controller;

import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import store.pjcloud.cowrite.core.security.SecurityUtils;
import store.pjcloud.cowrite.core.service.AiService;

@RestController
@RequestMapping("/ai")
public class AiController {
    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    private AiService.UserContext userContext() {
        UUID userId = SecurityUtils.requireUserId();
        String role = SecurityUtils.getRole();
        return new AiService.UserContext(userId, role);
    }

    @GetMapping("/quota")
    public Map<String, Object> quota() {
        AiService.UserContext ctx = userContext();
        return aiService.getQuota(ctx.userId(), ctx.role());
    }

    @PostMapping("/complete")
    public Object complete(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "complete", "/ai/complete", body);
    }

    @PostMapping("/search")
    public Object search(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "search", "/ai/search", body);
    }

    @PostMapping("/style/convert")
    public Object styleConvert(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "style_convert", "/ai/style/convert", body);
    }

    @PostMapping("/character/simulate")
    public Object characterSimulate(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "character_simulate", "/ai/character/simulate", body);
    }

    @PostMapping("/predict")
    public Object predict(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "predict", "/ai/predict", body);
    }

    @PostMapping("/translate")
    public Object translate(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "translate", "/ai/translate", body);
    }

    @PostMapping("/research")
    public Object research(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "research", "/ai/research", body);
    }

    @PostMapping("/storyboard")
    public Object storyboard(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "storyboard", "/ai/storyboard", body);
    }

    @PostMapping("/tts")
    public Object tts(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "tts", "/ai/tts", body);
    }

    @PostMapping("/transcribe")
    public Object transcribe(@RequestBody Map<String, Object> body) {
        return aiService.proxy(userContext(), "transcribe", "/ai/transcribe", body);
    }
}
