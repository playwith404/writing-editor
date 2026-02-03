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
@Table(name = "beta_session_invites")
@JsonIgnoreProperties(ignoreUnknown = true)
public class BetaSessionInvite {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(name = "token_hash")
    private String tokenHash;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "max_uses")
    private Integer maxUses;

    @Column(name = "uses")
    private Integer uses = 0;

    @Column(name = "created_by")
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
