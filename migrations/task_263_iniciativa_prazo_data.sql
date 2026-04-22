-- Task #263 — Permitir definir o prazo da iniciativa como data real
-- Adiciona coluna opcional `prazo_data` (DATE) à tabela iniciativas. Quando
-- preenchida, tem precedência sobre o campo de texto livre `prazo` em
-- ordenações, no Gantt e em filtros temporais. Aditivo: dados antigos
-- continuam válidos com `prazo_data = NULL`.
ALTER TABLE iniciativas
  ADD COLUMN IF NOT EXISTS prazo_data date;
