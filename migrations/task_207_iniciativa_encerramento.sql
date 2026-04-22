-- Task #207 — Agente edita OKRs e iniciativas existentes
-- Adiciona campos aditivos para registrar o encerramento (concluida/pausada/
-- cancelada) de uma iniciativa pelo Assistente Estratégico, junto da nota
-- curta de fechamento e do timestamp em que ela foi encerrada.
ALTER TABLE iniciativas ADD COLUMN IF NOT EXISTS nota_encerramento text;
ALTER TABLE iniciativas ADD COLUMN IF NOT EXISTS encerrada_em timestamp;
