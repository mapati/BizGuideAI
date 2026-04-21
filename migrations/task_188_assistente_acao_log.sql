-- Task #188 — Tool calling nativo OpenAI com confirmação humana (HITL).
-- Cria a tabela `assistente_acao_log` que registra cada proposta de ação
-- (tool call) emitida pelo assistente, com seu ciclo de vida HITL.
--
-- Estados (status):
--   proposta   — emitida pela IA, aguardando decisão humana
--   confirmada — usuário aprovou e a tool foi aplicada com sucesso
--   ajustada   — usuário escolheu editar manualmente; aplicação não ocorreu
--                automaticamente (será feita pelo formulário tradicional)
--   ignorada   — usuário descartou a proposta
--   falhou     — apply foi tentado mas levantou exceção (ver mensagem_erro)
--
-- Esta migração é idempotente para ambientes que já criaram a tabela via
-- `drizzle-kit push` durante o desenvolvimento.

CREATE TABLE IF NOT EXISTS assistente_acao_log (
  id            varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    varchar NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id    varchar REFERENCES users(id) ON DELETE SET NULL,
  ferramenta    varchar(64) NOT NULL,
  parametros    jsonb NOT NULL,
  preview       jsonb NOT NULL,
  status        varchar(16) NOT NULL DEFAULT 'proposta',
  origem        varchar(16) NOT NULL DEFAULT 'chat',
  resultado     jsonb,
  entidade_tipo varchar(32),
  entidade_id   varchar,
  mensagem_erro text,
  criado_em     timestamp NOT NULL DEFAULT now(),
  resolvido_em  timestamp
);

-- Garante que colunas adicionadas após o push inicial existam.
ALTER TABLE assistente_acao_log
  ADD COLUMN IF NOT EXISTS entidade_tipo varchar(32),
  ADD COLUMN IF NOT EXISTS entidade_id   varchar;

-- Migra dados antigos para o novo vocabulário de status, se necessário.
UPDATE assistente_acao_log SET status = 'proposta'   WHERE status = 'pendente';
UPDATE assistente_acao_log SET status = 'confirmada' WHERE status IN ('aplicado', 'aplicando');
UPDATE assistente_acao_log SET status = 'ignorada'   WHERE status = 'ignorado';
UPDATE assistente_acao_log SET status = 'falhou'     WHERE status = 'erro';

-- Índices: listagem por empresa+status (filtros do histórico) e por usuário.
CREATE INDEX IF NOT EXISTS idx_assistente_acao_empresa_status
  ON assistente_acao_log (empresa_id, status, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_assistente_acao_usuario
  ON assistente_acao_log (usuario_id, criado_em DESC);
