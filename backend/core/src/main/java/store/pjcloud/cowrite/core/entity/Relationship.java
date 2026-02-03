package store.pjcloud.cowrite.core.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;
import store.pjcloud.cowrite.core.common.ProjectScoped;

@Getter
@Setter
@Entity
@Table(name = "relationships")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Relationship implements ProjectScoped {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id")
    private UUID id;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "character_a_id")
    private UUID characterAId;

    @Column(name = "character_b_id")
    private UUID characterBId;

    @Column(name = "relation_type", length = 50)
    private String relationType;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "is_bidirectional")
    private Boolean isBidirectional = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;
}
