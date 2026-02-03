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
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;
import store.pjcloud.cowrite.core.common.ProjectScoped;

@Getter
@Setter
@Entity
@Table(name = "documents")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Document implements ProjectScoped {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "parent_id")
    private UUID parentId;

    @Column(name = "type", length = 20)
    private String type;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "content", columnDefinition = "text")
    private String content;

    @Column(name = "order_index")
    private Integer orderIndex = 0;

    @Column(name = "word_count")
    private Integer wordCount = 0;

    @Column(name = "status")
    private String status = "draft";

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
