-- Task #296: Guardar o tipo da relação no Mapa BSC (causa-efeito vs correlação)
-- Adds a `tipo` column to bsc_relacoes so the Mapa BSC can distinguish
-- between cause-and-effect relations and mere correlations.

ALTER TABLE bsc_relacoes
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'causa_efeito';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bsc_relacoes_tipo_check'
  ) THEN
    ALTER TABLE bsc_relacoes
      ADD CONSTRAINT bsc_relacoes_tipo_check
      CHECK (tipo IN ('causa_efeito', 'correlacao'));
  END IF;
END $$;
