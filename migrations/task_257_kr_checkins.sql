-- Task #257 — Reposicionar OKRs como camada tática do BSC.
-- 1) Cache leve no próprio KR para o último check-in.
-- 2) Tabela de histórico de check-ins (valor + confiança + comentário + autor).

ALTER TABLE resultados_chave
  ADD COLUMN IF NOT EXISTS confianca_atual TEXT,
  ADD COLUMN IF NOT EXISTS ultimo_checkin_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ultimo_checkin_comentario TEXT;

CREATE TABLE IF NOT EXISTS kr_checkins (
  id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  kr_id        VARCHAR NOT NULL REFERENCES resultados_chave(id) ON DELETE CASCADE,
  empresa_id   VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  valor        NUMERIC(10,2) NOT NULL,
  confianca    TEXT NOT NULL,
  comentario   TEXT,
  autor_id     VARCHAR REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kr_checkins_kr_idx ON kr_checkins (kr_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kr_checkins_empresa_idx ON kr_checkins (empresa_id, created_at DESC);
