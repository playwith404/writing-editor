package store.pjcloud.cowrite.core.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.entity.BetaFeedback;
import store.pjcloud.cowrite.core.repository.BetaFeedbackRepository;

@Service
public class BetaFeedbackService {
    private final BetaFeedbackRepository feedbackRepo;
    private final BetaAccessService betaAccessService;
    private final PointsService pointsService;

    public BetaFeedbackService(BetaFeedbackRepository feedbackRepo,
                               BetaAccessService betaAccessService,
                               PointsService pointsService) {
        this.feedbackRepo = feedbackRepo;
        this.betaAccessService = betaAccessService;
        this.pointsService = pointsService;
    }

    private Map<String, Object> maskAnonymous(BetaFeedback feedback, UUID viewerUserId, boolean isProjectMember) {
        Map<String, Object> base = new java.util.HashMap<>();
        base.put("id", feedback.getId());
        base.put("sessionId", feedback.getSessionId());
        base.put("userId", feedback.getUserId());
        base.put("rating", feedback.getRating());
        base.put("immersionRating", feedback.getImmersionRating());
        base.put("pacingRating", feedback.getPacingRating());
        base.put("characterRating", feedback.getCharacterRating());
        base.put("isAnonymous", feedback.getIsAnonymous());
        base.put("comment", feedback.getComment());
        base.put("createdAt", feedback.getCreatedAt());
        base.put("anonymous", Boolean.TRUE.equals(feedback.getIsAnonymous()));
        if (isProjectMember && Boolean.TRUE.equals(feedback.getIsAnonymous()) && feedback.getUserId() != null && !feedback.getUserId().equals(viewerUserId)) {
            base.put("userId", null);
        }
        return base;
    }

    public List<Map<String, Object>> findAllForUser(UUID userId, UUID sessionId) {
        if (sessionId == null || userId == null) return List.of();
        BetaAccessService.AccessResult access = betaAccessService.getAccess(userId, sessionId);
        boolean isProjectMember = access.isProjectMember();

        List<BetaFeedback> rows = isProjectMember
            ? feedbackRepo.findBySessionIdOrderByCreatedAtDesc(sessionId)
            : feedbackRepo.findBySessionIdAndUserIdOrderByCreatedAtDesc(sessionId, userId);

        return rows.stream().map(f -> maskAnonymous(f, userId, isProjectMember)).toList();
    }

    public Map<String, Object> findOneForUser(UUID userId, UUID id) {
        if (userId == null) return null;
        BetaFeedback feedback = feedbackRepo.findById(id).orElse(null);
        if (feedback == null) return null;
        BetaAccessService.AccessResult access = betaAccessService.getAccess(userId, feedback.getSessionId());
        if (!access.isProjectMember() && !userId.equals(feedback.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한이 없습니다.");
        }
        return maskAnonymous(feedback, userId, access.isProjectMember());
    }

    @Transactional
    public Map<String, Object> createForUser(UUID userId, Map<String, Object> body) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인이 필요합니다.");
        Object sessionObj = body.get("sessionId");
        if (!(sessionObj instanceof String) || ((String) sessionObj).isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sessionId가 필요합니다.");
        }
        UUID sessionId = UUID.fromString((String) sessionObj);
        BetaAccessService.AccessResult access = betaAccessService.getAccess(userId, sessionId);

        BetaFeedback feedback = new BetaFeedback();
        feedback.setSessionId(sessionId);
        feedback.setUserId(userId);
        if (body.get("rating") instanceof Number n) feedback.setRating(n.intValue());
        if (body.get("immersionRating") instanceof Number n) feedback.setImmersionRating(n.intValue());
        if (body.get("pacingRating") instanceof Number n) feedback.setPacingRating(n.intValue());
        if (body.get("characterRating") instanceof Number n) feedback.setCharacterRating(n.intValue());
        feedback.setIsAnonymous(Boolean.TRUE.equals(body.get("isAnonymous")));
        if (body.get("comment") instanceof String s) feedback.setComment(s);
        BetaFeedback saved = feedbackRepo.save(feedback);

        if (!access.isProjectMember()) {
            pointsService.addPoints(userId, 10, "beta_feedback", "beta_session", sessionId, null);
        }
        return maskAnonymous(saved, userId, access.isProjectMember());
    }

    @Transactional
    public void removeForUser(UUID userId, UUID id) {
        if (userId == null) return;
        BetaFeedback feedback = feedbackRepo.findById(id).orElse(null);
        if (feedback == null) return;
        BetaAccessService.AccessResult access = betaAccessService.getAccess(userId, feedback.getSessionId());
        if (!access.isProjectMember() && !userId.equals(feedback.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "권한이 없습니다.");
        }
        feedbackRepo.deleteById(id);
    }
}
