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
import store.pjcloud.cowrite.core.common.UserScoped;

@Getter
@Setter
@Entity
@Table(name = "ai_usage")
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiUsage implements UserScoped {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "feature", length = 50)
    private String feature;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(name = "model", length = 80)
    private String model;

    @Column(name = "provider", length = 30)
    private String provider;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
