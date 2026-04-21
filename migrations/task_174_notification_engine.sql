-- Task #174 — motor de notificações por e-mail
-- Idempotente: pode ser reexecutado sem erros.

ALTER TABLE resultados_chave
  ADD COLUMN IF NOT EXISTS atualizado_em timestamp NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS notificacao_envios (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id varchar NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_alerta varchar NOT NULL,
  alvo_id varchar NOT NULL DEFAULT '',
  enviado_em timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_envios_lookup
  ON notificacao_envios (usuario_id, tipo_alerta, alvo_id, enviado_em DESC);
