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
@Table(name = "translations")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Translation {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "target_language", length = 10)
    private String targetLanguage;

    @Column(name = "provider", length = 30)
    private String provider;

    @Column(name = "content", columnDefinition = "text")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}
