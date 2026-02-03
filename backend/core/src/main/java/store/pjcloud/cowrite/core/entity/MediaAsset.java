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
@Table(name = "media_assets")
@JsonIgnoreProperties(ignoreUnknown = true)
public class MediaAsset {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "original_name", columnDefinition = "text")
    private String originalName;

    @Column(name = "mime_type", columnDefinition = "text")
    private String mimeType;

    @Column(name = "size")
    private Integer size;

    @Column(name = "storage_path", columnDefinition = "text")
    private String storagePath;

    @Column(name = "url", columnDefinition = "text")
    private String url;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
