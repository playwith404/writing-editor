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
@Table(name = "audio_assets")
@JsonIgnoreProperties(ignoreUnknown = true)
public class AudioAsset {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "voice", length = 100)
    private String voice;

    @Column(name = "provider", length = 30)
    private String provider;

    @Column(name = "script", columnDefinition = "text")
    private String script;

    @Column(name = "audio_url", columnDefinition = "text")
    private String audioUrl;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
