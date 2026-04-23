-- Task #310 — Links explícitos entre objetivos das diferentes camadas BSC.
-- Adiciona coluna `justificativa` em `bsc_relacoes` para guardar a frase que
-- explica POR QUÊ o objetivo de origem habilita o objetivo de destino.
-- Preenchida automaticamente pelo wizard "BSC Causa e Efeito" e exibida nos
-- badges "↑ habilita" / "↓ habilitado por" da página de Metas e Resultados.
-- Aditivo e idempotente.
ALTER TABLE bsc_relacoes
  ADD COLUMN IF NOT EXISTS justificativa TEXT;
