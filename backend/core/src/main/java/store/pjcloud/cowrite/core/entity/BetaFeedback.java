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
@Table(name = "beta_feedback")
@JsonIgnoreProperties(ignoreUnknown = true)
public class BetaFeedback {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "rating")
    private Integer rating;

    @Column(name = "immersion_rating")
    private Integer immersionRating;

    @Column(name = "pacing_rating")
    private Integer pacingRating;

    @Column(name = "character_rating")
    private Integer characterRating;

    @Column(name = "is_anonymous")
    private Boolean isAnonymous = false;

    @Column(name = "comment", columnDefinition = "text")
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
