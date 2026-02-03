package store.pjcloud.cowrite.core.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Getter
@Setter
@Entity
@Table(name = "beta_session_participants")
@JsonIgnoreProperties(ignoreUnknown = true)
public class BetaSessionParticipant {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "status", length = 20)
    private String status = "joined";

    @Column(name = "display_name", columnDefinition = "text")
    private String displayName;

    @CreationTimestamp
    @Column(name = "joined_at")
    private OffsetDateTime joinedAt;
}
