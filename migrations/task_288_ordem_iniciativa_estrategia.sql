-- Task #288 — Ciclo de Aprendizado: ordenação manual de iniciativas e estratégias
-- Adiciona coluna opcional `ordem` (INTEGER) às tabelas iniciativas e estrategias.
-- Quando preenchida, tem precedência sobre a `prioridade` textual em listagens.
-- Aditivo: dados antigos continuam válidos com `ordem = NULL`.
ALTER TABLE iniciativas
  ADD COLUMN IF NOT EXISTS ordem integer;

ALTER TABLE estrategias
  ADD COLUMN IF NOT EXISTS ordem integer;
