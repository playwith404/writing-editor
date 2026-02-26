-- Core API ORM-compatible schema
-- Source of truth: backend/core/app/models/*
-- Target DB: PostgreSQL + pgvector

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- 1) projects
-- ==========================================
CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    title       VARCHAR(200) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- ==========================================
-- 2) characters
-- ==========================================
CREATE TABLE IF NOT EXISTS characters (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    image_url   VARCHAR(500),
    job         VARCHAR(100),
    personality JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    is_synced   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_synced ON characters(project_id, is_synced) WHERE deleted_at IS NULL;

-- ==========================================
-- 3) worldviews + child tables
-- ==========================================
CREATE TABLE IF NOT EXISTS worldviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    type        VARCHAR(50) NOT NULL,
    is_synced   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worldviews_project_id ON worldviews(project_id);
CREATE INDEX IF NOT EXISTS idx_worldviews_synced ON worldviews(project_id, is_synced);

CREATE TABLE IF NOT EXISTS worldview_terms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worldview_id UUID NOT NULL REFERENCES worldviews(id) ON DELETE CASCADE,
    term        VARCHAR(200) NOT NULL,
    meaning     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worldview_terms_worldview_id ON worldview_terms(worldview_id);

CREATE TABLE IF NOT EXISTS worldview_relationships (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worldview_id        UUID NOT NULL REFERENCES worldviews(id) ON DELETE CASCADE,
    base_character_id   UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    target_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    relation_type       VARCHAR(50),
    color               VARCHAR(20),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worldview_rel_worldview ON worldview_relationships(worldview_id);
CREATE INDEX IF NOT EXISTS idx_worldview_rel_base ON worldview_relationships(base_character_id);
CREATE INDEX IF NOT EXISTS idx_worldview_rel_target ON worldview_relationships(target_character_id);

CREATE TABLE IF NOT EXISTS worldview_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worldview_id UUID NOT NULL REFERENCES worldviews(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    content     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worldview_entries_worldview_id ON worldview_entries(worldview_id);

-- ==========================================
-- 4) plots + link tables
-- ==========================================
CREATE TABLE IF NOT EXISTS plots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    plot_number INTEGER NOT NULL,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    is_synced   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plots_project_id ON plots(project_id);
CREATE INDEX IF NOT EXISTS idx_plots_project_number ON plots(project_id, plot_number);

CREATE TABLE IF NOT EXISTS plot_characters (
    plot_id      UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    PRIMARY KEY (plot_id, character_id)
);

CREATE TABLE IF NOT EXISTS episodes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    content             JSONB,
    char_count          INTEGER NOT NULL DEFAULT 0,
    char_count_no_space INTEGER NOT NULL DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'TODO',
    order_index         INTEGER NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_episodes_project_id ON episodes(project_id);
CREATE INDEX IF NOT EXISTS idx_episodes_project_order ON episodes(project_id, order_index);

CREATE TABLE IF NOT EXISTS plot_episodes (
    plot_id      UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    episode_id   UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    PRIMARY KEY (plot_id, episode_id)
);

-- ==========================================
-- 5) AI embeddings
-- ==========================================
CREATE TABLE IF NOT EXISTS episode_embeddings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id  UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    block_id    VARCHAR(100) NOT NULL,
    chunk_text  TEXT NOT NULL,
    embedding   VECTOR(1536),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_episode_embeddings_episode ON episode_embeddings(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_embeddings_hnsw
    ON episode_embeddings USING hnsw (embedding vector_cosine_ops);
