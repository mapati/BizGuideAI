-- Task #309 — Persistir a justificativa de causa-e-efeito gerada pelo
-- wizard "BSC Causa e Efeito" para que ela apareça no card e no detalhe
-- do Objetivo (não só dentro do wizard antes de salvar).
-- Aditivo, idempotente, NULL para objetivos pré-existentes.
ALTER TABLE objetivos
  ADD COLUMN IF NOT EXISTS justificativa_causa_efeito text;
