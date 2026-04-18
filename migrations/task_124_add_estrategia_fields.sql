-- Task #124: Turbinar Estratégias - add new columns
-- Safe: all columns added with IF NOT EXISTS, no destructive changes

-- Add status to estrategias (default 'planejada' matches schema.ts and STATUS_CONFIG)
ALTER TABLE estrategias ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'planejada';

-- Add swot_origem_ids array to estrategias
ALTER TABLE estrategias ADD COLUMN IF NOT EXISTS swot_origem_ids TEXT[];

-- Add estrategia_id FK to iniciativas
ALTER TABLE iniciativas ADD COLUMN IF NOT EXISTS estrategia_id VARCHAR REFERENCES estrategias(id) ON DELETE SET NULL;

-- Add estrategia_id FK to objetivos
ALTER TABLE objetivos ADD COLUMN IF NOT EXISTS estrategia_id VARCHAR REFERENCES estrategias(id) ON DELETE SET NULL;

-- Backfill: normalize any rows with invalid status values to 'planejada'
UPDATE estrategias SET status = 'planejada' WHERE status NOT IN ('planejada', 'em_andamento', 'concluida');
