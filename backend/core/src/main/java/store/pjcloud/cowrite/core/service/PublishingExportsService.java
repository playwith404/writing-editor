package store.pjcloud.cowrite.core.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.CRC32;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import store.pjcloud.cowrite.core.common.ProjectScopedCrudService;
import store.pjcloud.cowrite.core.entity.Document;
import store.pjcloud.cowrite.core.entity.Project;
import store.pjcloud.cowrite.core.entity.PublishingExport;
import store.pjcloud.cowrite.core.repository.DocumentRepository;
import store.pjcloud.cowrite.core.repository.ProjectRepository;
import store.pjcloud.cowrite.core.repository.PublishingExportRepository;

@Service
public class PublishingExportsService extends ProjectScopedCrudService<PublishingExport> {
    private final DocumentRepository documentsRepo;
    private final ProjectRepository projectsRepo;
    private final ObjectMapper objectMapper;

    public PublishingExportsService(PublishingExportRepository repository,
                                    ProjectAccessService projectAccessService,
                                    ObjectMapper objectMapper,
                                    DocumentRepository documentsRepo,
                                    ProjectRepository projectsRepo) {
        super(repository, projectAccessService, objectMapper, PublishingExport.class);
        this.documentsRepo = documentsRepo;
        this.projectsRepo = projectsRepo;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public PublishingExport createForUser(UUID userId, Map<String, Object> body) {
        PublishingExport created = super.createForUser(userId, body);
        created.setStatus("processing");
        repository().save(created);

        try {
            ExportResult built = buildExport(created);
            String fileUrl = "/publishing-exports/" + created.getId() + "/download";
            Map<String, Object> metadata = objectMapper.convertValue(created.getMetadata(), Map.class);
            if (metadata == null) metadata = new java.util.HashMap<>();
            metadata.putAll(built.metadata());

            created.setStatus("completed");
            created.setCompletedAt(OffsetDateTime.now());
            created.setFileUrl(fileUrl);
            created.setMetadata(metadata);
            repository().save(created);
            return created;
        } catch (Exception ex) {
            Map<String, Object> metadata = objectMapper.convertValue(created.getMetadata(), Map.class);
            if (metadata == null) metadata = new java.util.HashMap<>();
            metadata.put("error", ex.getMessage() == null ? "내보내기에 실패했습니다." : ex.getMessage());
            created.setStatus("failed");
            created.setMetadata(metadata);
            repository().save(created);
            throw ex instanceof RuntimeException ? (RuntimeException) ex : new RuntimeException(ex);
        }
    }

    public DownloadResult getDownloadForUser(UUID userId, UUID id) {
        PublishingExport exportJob = findOneForUser(userId, id);
        if (exportJob == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "내보내기 항목을 찾을 수 없습니다.");
        if (!"completed".equals(exportJob.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "내보내기가 완료되지 않았습니다.");
        }
        Map<String, Object> metadata = exportJob.getMetadata();
        boolean isBinary = metadata != null && Boolean.TRUE.equals(metadata.get("isBinary"));
        byte[] content;
        if (isBinary) {
            String b64 = metadata != null && metadata.get("contentBase64") instanceof String s ? s : "";
            if (b64.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "내보내기 파일이 없습니다.");
            content = Base64.getDecoder().decode(b64);
        } else {
            String text = metadata != null && metadata.get("content") instanceof String s ? s : "";
            if (text.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "내보내기 파일이 없습니다.");
            content = text.getBytes(StandardCharsets.UTF_8);
        }

        String filename = metadata != null && metadata.get("filename") instanceof String s ? s : ("cowrite-export." + exportJob.getExportFormat());
        String mimeType = metadata != null && metadata.get("mimeType") instanceof String s ? s : "application/octet-stream";
        return new DownloadResult(filename, mimeType, content);
    }

    private ExportResult buildExport(PublishingExport exportJob) {
        Project project = projectsRepo.findById(exportJob.getProjectId()).orElse(null);
        String projectTitle = project != null ? project.getTitle() : "cowrite";

        List<Document> docs = exportJob.getDocumentId() != null
            ? documentsRepo.findAllById(List.of(exportJob.getDocumentId()))
            : documentsRepo.findByProjectIdOrderByOrderIndexAscCreatedAtAsc(exportJob.getProjectId());

        if (docs.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "내보낼 문서가 없습니다.");
        }

        List<Section> sections = docs.stream().map(d -> new Section(d.getTitle(), stripHtml(d.getContent() == null ? "" : d.getContent()))).toList();
        String timestamp = java.time.OffsetDateTime.now().toString().replaceAll("[-:T]", "").substring(0, 14);
        String base = safeFilename(projectTitle) + "_" + timestamp;

        return switch (exportJob.getExportFormat()) {
            case "txt" -> new ExportResult(Map.of(
                "content", sectionsToText(sections, "\n\n---\n\n"),
                "filename", base + ".txt",
                "mimeType", "text/plain; charset=utf-8"
            ));
            case "markdown", "novelpia" -> new ExportResult(Map.of(
                "content", sectionsToMarkdown(sections),
                "filename", base + ".md",
                "mimeType", "text/markdown; charset=utf-8"
            ));
            case "kakaopage" -> new ExportResult(Map.of(
                "content", sectionsToKakao(sections),
                "filename", base + ".txt",
                "mimeType", "text/plain; charset=utf-8"
            ));
            case "munpia" -> new ExportResult(Map.of(
                "content", sectionsToMunpia(sections),
                "filename", base + ".txt",
                "mimeType", "text/plain; charset=utf-8"
            ));
            case "epub" -> {
                byte[] buffer = buildEpub(projectTitle, sections);
                yield new ExportResult(Map.of(
                    "isBinary", true,
                    "contentBase64", Base64.getEncoder().encodeToString(buffer),
                    "filename", base + ".epub",
                    "mimeType", "application/epub+zip"
                ));
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 exportFormat입니다. (txt, markdown, novelpia, kakaopage, munpia, epub)");
        };
    }

    private String stripHtml(String content) {
        return content
            .replaceAll("<br\\s*/?>", "\n")
            .replaceAll("</(p|div|h1|h2|h3|h4|h5|h6|li)>", "\n")
            .replaceAll("</(tr)>", "\n")
            .replaceAll("</(td|th)>", " ")
            .replaceAll("<[^>]*>", " ")
            .replace("&nbsp;", " ")
            .replaceAll("\\r\\n", "\n")
            .replaceAll("[ \t]+\n", "\n")
            .replaceAll("\n{3,}", "\n\n")
            .replaceAll("[ \t]{2,}", " ")
            .trim();
    }

    private String safeFilename(String name) {
        String cleaned = name == null ? "" : name.trim().replaceAll("[\\\\/:*?\"<>|]", "_").replaceAll("\\s+", "_");
        if (cleaned.isBlank()) return "cowrite";
        return cleaned.length() > 80 ? cleaned.substring(0, 80) : cleaned;
    }

    private String sectionsToText(List<Section> sections, String separator) {
        return sections.stream().map(s -> s.title() + "\n\n" + s.body()).collect(java.util.stream.Collectors.joining(separator));
    }

    private String sectionsToMarkdown(List<Section> sections) {
        return sections.stream().map(s -> "# " + s.title() + "\n\n" + s.body()).collect(java.util.stream.Collectors.joining("\n\n---\n\n"));
    }

    private String sectionsToKakao(List<Section> sections) {
        String content = sections.stream().map(s -> "제목: " + s.title() + "\n\n" + s.body()).collect(java.util.stream.Collectors.joining("\n\n\n"));
        return content.replace("\n", "\r\n");
    }

    private String sectionsToMunpia(List<Section> sections) {
        String content = sections.stream().map(s -> "【" + s.title() + "】\n\n" + s.body()).collect(java.util.stream.Collectors.joining("\n\n\n"));
        return content.replace("\n", "\r\n");
    }

    private byte[] buildEpub(String title, List<Section> sections) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ZipOutputStream zos = new ZipOutputStream(baos);

            writeStoredEntry(zos, "mimetype", "application/epub+zip");
            writeEntry(zos, "META-INF/container.xml", (
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\">\n" +
                "  <rootfiles>\n" +
                "    <rootfile full-path=\"OEBPS/content.opf\" media-type=\"application/oebps-package+xml\"/>\n" +
                "  </rootfiles>\n" +
                "</container>\n"
            ));

            StringBuilder manifestItems = new StringBuilder();
            StringBuilder spineItems = new StringBuilder();
            StringBuilder navItems = new StringBuilder();

            int idx = 1;
            for (Section section : sections) {
                String id = "sec" + idx;
                String href = "sections/" + id + ".xhtml";
                String xhtml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                    "<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"ko\" lang=\"ko\">\n" +
                    "<head><meta charset=\"utf-8\"/><title>" + escapeXml(section.title()) + "</title></head>\n" +
                    "<body>\n  <h1>" + escapeXml(section.title()) + "</h1>\n  " + paragraphsToXhtml(section.body()) + "\n</body>\n</html>\n";
                writeEntry(zos, "OEBPS/" + href, xhtml);
                manifestItems.append("<item id=\"").append(id).append("\" href=\"").append(href).append("\" media-type=\"application/xhtml+xml\"/>\n    ");
                spineItems.append("<itemref idref=\"").append(id).append("\"/>\n    ");
                navItems.append("<li><a href=\"").append(href).append("\">").append(escapeXml(section.title())).append("</a></li>\n");
                idx++;
            }

            String navXhtml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"ko\" lang=\"ko\">\n" +
                "<head><meta charset=\"utf-8\" /><title>목차</title></head>\n" +
                "<body>\n  <nav epub:type=\"toc\" xmlns:epub=\"http://www.idpf.org/2007/ops\">\n    <h1>목차</h1>\n    <ol>\n" +
                navItems + "    </ol>\n  </nav>\n</body>\n</html>\n";
            writeEntry(zos, "OEBPS/nav.xhtml", navXhtml);

            String uuid = "urn:uuid:" + java.util.UUID.randomUUID();
            String opf = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<package xmlns=\"http://www.idpf.org/2007/opf\" unique-identifier=\"bookid\" version=\"3.0\">\n" +
                "  <metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\">\n" +
                "    <dc:identifier id=\"bookid\">" + uuid + "</dc:identifier>\n" +
                "    <dc:title>" + escapeXml(title) + "</dc:title>\n" +
                "    <dc:language>ko</dc:language>\n" +
                "    <meta property=\"dcterms:modified\">" + java.time.OffsetDateTime.now().toString() + "</meta>\n" +
                "  </metadata>\n" +
                "  <manifest>\n    <item id=\"nav\" href=\"nav.xhtml\" media-type=\"application/xhtml+xml\" properties=\"nav\"/>\n    " + manifestItems + "  </manifest>\n" +
                "  <spine>\n    " + spineItems + "  </spine>\n" +
                "</package>\n";
            writeEntry(zos, "OEBPS/content.opf", opf);

            zos.close();
            return baos.toByteArray();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "EPUB 생성에 실패했습니다.");
        }
    }

    private void writeEntry(ZipOutputStream zos, String path, String content) throws IOException {
        ZipEntry entry = new ZipEntry(path);
        zos.putNextEntry(entry);
        zos.write(content.getBytes(StandardCharsets.UTF_8));
        zos.closeEntry();
    }

    private void writeStoredEntry(ZipOutputStream zos, String path, String content) throws IOException {
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        CRC32 crc = new CRC32();
        crc.update(bytes);
        ZipEntry entry = new ZipEntry(path);
        entry.setMethod(ZipEntry.STORED);
        entry.setSize(bytes.length);
        entry.setCompressedSize(bytes.length);
        entry.setCrc(crc.getValue());
        zos.putNextEntry(entry);
        zos.write(bytes);
        zos.closeEntry();
    }

    private String escapeXml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;");
    }

    private String paragraphsToXhtml(String body) {
        if (body == null || body.isBlank()) return "<p></p>";
        String[] parts = body.split("\\n{2,}");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            String p = part.trim();
            if (p.isEmpty()) continue;
            sb.append("<p>").append(escapeXml(p).replace("\n", "<br />")).append("</p>\n");
        }
        return sb.length() == 0 ? "<p></p>" : sb.toString();
    }

    private record Section(String title, String body) {}
    private record ExportResult(Map<String, Object> metadata) {}
    public record DownloadResult(String filename, String mimeType, byte[] content) {}
}
