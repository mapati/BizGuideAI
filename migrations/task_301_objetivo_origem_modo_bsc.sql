-- Task #301 — Modo "BSC Causa e Efeito" para geração de Objetivos.
-- Adiciona coluna `origem_modo_bsc` à tabela `objetivos` para rastrear quais
-- objetivos foram criados pelo wizard sequencial de causa-e-efeito (4 etapas:
-- Financeira → Clientes → Processos Internos → Aprendizado e Crescimento).
-- Default false e idempotente para permitir reaplicação segura.
ALTER TABLE objetivos
  ADD COLUMN IF NOT EXISTS origem_modo_bsc boolean NOT NULL DEFAULT false;
