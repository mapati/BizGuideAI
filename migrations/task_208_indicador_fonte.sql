-- Task #208 — Vincular iniciativa e meta ao indicador
-- Adiciona vínculo opcional entre iniciativas/resultados-chave e o indicador
-- (KPI) que eles buscam melhorar. Aditivo: ON DELETE SET NULL preserva os
-- itens caso o indicador seja removido.
ALTER TABLE iniciativas
  ADD COLUMN IF NOT EXISTS indicador_fonte_id varchar
  REFERENCES indicadores(id) ON DELETE SET NULL;

ALTER TABLE resultados_chave
  ADD COLUMN IF NOT EXISTS indicador_fonte_id varchar
  REFERENCES indicadores(id) ON DELETE SET NULL;

-- Saneamento: garante que as colunas de encerramento da Task #207 existem
-- (em ambientes onde o respectivo migration ainda não foi aplicado, o
-- INSERT em iniciativas falhava porque o schema Drizzle já as referenciava).
ALTER TABLE iniciativas
  ADD COLUMN IF NOT EXISTS nota_encerramento text;
ALTER TABLE iniciativas
  ADD COLUMN IF NOT EXISTS encerrada_em timestamp;
