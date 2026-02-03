package store.pjcloud.cowrite.core.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;
import store.pjcloud.cowrite.core.common.ProjectScoped;

@Getter
@Setter
@Entity
@Table(name = "characters")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Character implements ProjectScoped {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "role", length = 50)
    private String role;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "profile", columnDefinition = "jsonb")
    private Map<String, Object> profile;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "appearance", columnDefinition = "jsonb")
    private Map<String, Object> appearance;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "personality", columnDefinition = "jsonb")
    private Map<String, Object> personality;

    @Column(name = "backstory", columnDefinition = "text")
    private String backstory;

    @Column(name = "speech_sample", columnDefinition = "text")
    private String speechSample;

    @Column(name = "image_url")
    private String imageUrl;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
