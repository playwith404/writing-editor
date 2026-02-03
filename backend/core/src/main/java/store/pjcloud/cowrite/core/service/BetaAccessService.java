package store.pjcloud.cowrite.core.service;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.entity.BetaSession;
import store.pjcloud.cowrite.core.repository.BetaSessionParticipantRepository;
import store.pjcloud.cowrite.core.repository.BetaSessionRepository;

@Service
public class BetaAccessService {
    private final BetaSessionRepository sessionsRepo;
    private final BetaSessionParticipantRepository participantsRepo;
    private final ProjectAccessService projectAccessService;

    public BetaAccessService(BetaSessionRepository sessionsRepo,
                             BetaSessionParticipantRepository participantsRepo,
                             ProjectAccessService projectAccessService) {
        this.sessionsRepo = sessionsRepo;
        this.participantsRepo = participantsRepo;
        this.projectAccessService = projectAccessService;
    }

    public BetaSession getSessionOrThrow(UUID sessionId) {
        return sessionsRepo.findById(sessionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "베타 세션을 찾을 수 없습니다."));
    }

    public boolean isParticipant(UUID userId, UUID sessionId) {
        return participantsRepo.existsByUserIdAndSessionIdAndStatus(userId, sessionId, "joined");
    }

    public AccessResult getAccess(UUID userId, UUID sessionId) {
        BetaSession session = getSessionOrThrow(sessionId);
        boolean isProjectMember = projectAccessService.hasProjectAccess(userId, session.getProjectId());
        if (isProjectMember) return new AccessResult(session, true);

        boolean ok = isParticipant(userId, sessionId);
        if (!ok) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "베타 세션 접근 권한이 없습니다.");
        }
        return new AccessResult(session, false);
    }

    public BetaSession assertManageAccess(UUID userId, UUID sessionId) {
        BetaSession session = getSessionOrThrow(sessionId);
        projectAccessService.assertProjectAccess(userId, session.getProjectId());
        return session;
    }

    public record AccessResult(BetaSession session, boolean isProjectMember) {}
}
