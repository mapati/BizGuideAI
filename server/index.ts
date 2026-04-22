import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";

async function runStartupMigrations() {
  const client = await pool.connect();
  try {
    // Migration: planoStatus/trialStartedAt/planoAtivadoEm were moved from usuarios to empresas.
    // The data backfill from owner-user plan fields to empresas was performed before those
    // columns were dropped from usuarios. This idempotent migration provides a safety net for any
    // edge cases (e.g., empresas created in-flight or direct DB imports without plan data).

    // Ensure every empresa has a valid plano_status
    await client.query(`
      UPDATE empresas
      SET plano_status = 'trial'
      WHERE plano_status IS NULL OR plano_status = ''
    `);

    // Ensure every empresa has a trial_started_at (fall back to created_at if missing)
    await client.query(`
      UPDATE empresas
      SET trial_started_at = created_at
      WHERE trial_started_at IS NULL
    `);

    // For empresas already marked as 'ativo' without a plano_ativado_em, set a reasonable default
    await client.query(`
      UPDATE empresas
      SET plano_ativado_em = created_at
      WHERE plano_status = 'ativo' AND plano_ativado_em IS NULL
    `);

    // Migration: add plano_tipo column if missing (added in monetization task #47)
    await client.query(`
      ALTER TABLE empresas ADD COLUMN IF NOT EXISTS plano_tipo TEXT
    `);

    // Migration: add Mercado Pago subscription tracking columns (added in task #48)
    await client.query(`
      ALTER TABLE empresas ADD COLUMN IF NOT EXISTS mp_subscription_id TEXT
    `);
    await client.query(`
      ALTER TABLE empresas ADD COLUMN IF NOT EXISTS mp_subscription_status TEXT
    `);

    // Migration: proprietário da empresa (registrante original) — task #53
    await client.query(`
      ALTER TABLE empresas ADD COLUMN IF NOT EXISTS proprietario_usuario_id VARCHAR
    `);
    // Backfill: para empresas sem proprietário, usar o usuário admin mais antigo
    await client.query(`
      UPDATE empresas e
      SET proprietario_usuario_id = sub.usuario_id
      FROM (
        SELECT DISTINCT ON (u.empresa_id) u.empresa_id, u.id AS usuario_id
        FROM usuarios u
        WHERE u.role = 'admin'
        ORDER BY u.empresa_id, u.created_at ASC
      ) sub
      WHERE e.id = sub.empresa_id AND e.proprietario_usuario_id IS NULL
    `);
    // Caso raro: empresa sem nenhum admin — usar usuário mais antigo qualquer
    await client.query(`
      UPDATE empresas e
      SET proprietario_usuario_id = sub.usuario_id
      FROM (
        SELECT DISTINCT ON (u.empresa_id) u.empresa_id, u.id AS usuario_id
        FROM usuarios u
        ORDER BY u.empresa_id, u.created_at ASC
      ) sub
      WHERE e.id = sub.empresa_id AND e.proprietario_usuario_id IS NULL
    `);
    // FK proprietario_usuario_id -> usuarios.id (idempotente)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'empresas_proprietario_usuario_id_fkey'
            AND table_name = 'empresas'
        ) THEN
          ALTER TABLE empresas
            ADD CONSTRAINT empresas_proprietario_usuario_id_fkey
            FOREIGN KEY (proprietario_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    // Migration: auditoria de eventos Mercado Pago (task #52)
    await client.query(`
      CREATE TABLE IF NOT EXISTS pagamento_eventos (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id VARCHAR REFERENCES empresas(id) ON DELETE SET NULL,
        tipo TEXT NOT NULL,
        acao TEXT,
        mp_resource_id TEXT,
        status TEXT,
        status_detail TEXT,
        payload TEXT NOT NULL DEFAULT '',
        criado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS pagamento_eventos_empresa_idx ON pagamento_eventos (empresa_id, criado_em DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS pagamento_eventos_resource_idx ON pagamento_eventos (mp_resource_id)`);

    // Persistência dos IDs dos PreApprovalPlans do Mercado Pago (task #52)
    await client.query(`
      CREATE TABLE IF NOT EXISTS mp_planos (
        tipo VARCHAR PRIMARY KEY,
        mp_plan_id TEXT NOT NULL,
        atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Migration: intro_boas_vindas_dismissed column on usuarios (task #55)
    await client.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intro_boas_vindas_dismissed BOOLEAN NOT NULL DEFAULT false
    `);

    // Task #61 — Motor de Contexto Macro para IA
    await client.query(`
      CREATE TABLE IF NOT EXISTS contexto_macro (
        categoria VARCHAR PRIMARY KEY,
        titulo TEXT NOT NULL,
        texto_ativo TEXT,
        rascunho TEXT,
        ativo BOOLEAN NOT NULL DEFAULT false,
        ultima_atualizacao TIMESTAMP,
        agendador_ativo BOOLEAN NOT NULL DEFAULT false,
        agendador_frequencia TEXT,
        proximo_agendamento TIMESTAMP,
        alerta_dias INTEGER NOT NULL DEFAULT 7,
        query_busca TEXT
      )
    `);
    // Evolving-compatibility: add any columns that may be missing in existing tables
    await client.query(`ALTER TABLE contexto_macro ADD COLUMN IF NOT EXISTS titulo TEXT`);
    await client.query(`ALTER TABLE contexto_macro ADD COLUMN IF NOT EXISTS texto_ativo TEXT`);
    await client.query(`ALTER TABLE contexto_macro ADD COLUMN IF NOT EXISTS rascunho TEXT`);
    await client.query(`ALTER TABLE contexto_macro ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT false`);
    await client.query(`ALTER TABLE contexto_macro ADD COLUMN IF NOT EXISTS ultima_atualizacao TIMESTAMP`);
    await client.query(`ALTER TABLE contexto_macro ADD COLUMN IF NOT EXISTS agendador_ativo BOOLEAN NOT NULL DEFAULT false`);
    await client.query(`ALTER TABLE contexto_macro ADD COLUMN IF NOT EXISTS agendador_frequencia TEXT`);
    await client.query(`ALTER TABLE contexto_macro ADD COLUMN IF NOT EXISTS proximo_agendamento TIMESTAMP`);
    await client.query(`ALTER TABLE contexto_macro ADD COLUMN IF NOT EXISTS alerta_dias INTEGER NOT NULL DEFAULT 7`);
    await client.query(`ALTER TABLE contexto_macro ADD COLUMN IF NOT EXISTS query_busca TEXT`);
    await client.query(`
      INSERT INTO contexto_macro (categoria, titulo) VALUES
        ('cambio_politica_monetaria', 'Câmbio & Política Monetária'),
        ('inflacao_custos', 'Inflação & Custos'),
        ('cenario_politico_regulatorio', 'Cenário Político & Regulatório'),
        ('geopolitica_comercio_exterior', 'Geopolítica & Comércio Exterior'),
        ('crises_setoriais', 'Crises Setoriais'),
        ('tendencias_mercado', 'Tendências de Mercado'),
        ('contexto_geral', 'Contexto Geral'),
        ('pulse_manchetes', 'Manchetes & Mercado')
      ON CONFLICT (categoria) DO NOTHING
    `);

    // Task #75 — Persist contexto_macro scheduler execution logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS contexto_macro_logs (
        id SERIAL PRIMARY KEY,
        categoria VARCHAR NOT NULL,
        executado_em TIMESTAMP NOT NULL DEFAULT NOW(),
        modo TEXT NOT NULL,
        resultado TEXT NOT NULL,
        mensagem TEXT NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contexto_macro_logs_categoria_executado
      ON contexto_macro_logs (categoria, executado_em DESC)
    `);

    // Task #77 — Per-plan AI model configuration (Start / Pro)
    // ADD COLUMN first so all busca columns exist before the deprecation UPDATE below
    await client.query(`ALTER TABLE configuracoes_ia ADD COLUMN IF NOT EXISTS modelo_padrao_start TEXT NOT NULL DEFAULT 'gpt-4.1-mini'`);
    await client.query(`ALTER TABLE configuracoes_ia ADD COLUMN IF NOT EXISTS modelo_relatorios_start TEXT NOT NULL DEFAULT 'gpt-4.1-mini'`);
    await client.query(`ALTER TABLE configuracoes_ia ADD COLUMN IF NOT EXISTS modelo_busca_start TEXT NOT NULL DEFAULT 'gpt-4o-mini'`);
    await client.query(`ALTER TABLE configuracoes_ia ADD COLUMN IF NOT EXISTS modelo_padrao_pro_ent TEXT NOT NULL DEFAULT 'gpt-4.1-mini'`);
    await client.query(`ALTER TABLE configuracoes_ia ADD COLUMN IF NOT EXISTS modelo_relatorios_pro_ent TEXT NOT NULL DEFAULT 'gpt-4.1'`);
    await client.query(`ALTER TABLE configuracoes_ia ADD COLUMN IF NOT EXISTS modelo_busca_pro_ent TEXT NOT NULL DEFAULT 'gpt-4o'`);
    // Ensure the singleton config row always exists so DB is the only source of model defaults
    await client.query(`INSERT INTO configuracoes_ia (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);

    // Migration: the *-search-preview models (gpt-4o-search-preview, gpt-4o-mini-search-preview)
    // are Chat-Completions-only and are NOT compatible with the Responses API +
    // web_search_preview tool, which is what we actually call. Any of those values produce
    // a 404 "Model not found" at runtime. Replace them with regular Responses-API-compatible
    // models in ALL busca fields.
    await client.query(`
      UPDATE configuracoes_ia
      SET
        modelo_busca         = CASE WHEN modelo_busca         IN ('gpt-4o-search-preview', 'gpt-4o-mini-search-preview') THEN 'gpt-4o'      ELSE modelo_busca         END,
        modelo_busca_start   = CASE WHEN modelo_busca_start   IN ('gpt-4o-search-preview', 'gpt-4o-mini-search-preview') THEN 'gpt-4o-mini' ELSE modelo_busca_start   END,
        modelo_busca_pro_ent = CASE WHEN modelo_busca_pro_ent IN ('gpt-4o-search-preview', 'gpt-4o-mini-search-preview') THEN 'gpt-4o'      ELSE modelo_busca_pro_ent END
      WHERE
        modelo_busca         IN ('gpt-4o-search-preview', 'gpt-4o-mini-search-preview')
        OR modelo_busca_start   IN ('gpt-4o-search-preview', 'gpt-4o-mini-search-preview')
        OR modelo_busca_pro_ent IN ('gpt-4o-search-preview', 'gpt-4o-mini-search-preview')
    `);
    // Backfill: for existing installs that have customised the legacy 3-field config, inherit those
    // values into the new per-plan columns — but only when the new columns still hold their initial
    // defaults (i.e. have not yet been independently customised via the new admin UI).
    await client.query(`
      UPDATE configuracoes_ia
      SET
        modelo_padrao_start      = modelo_padrao,
        modelo_relatorios_start  = modelo_padrao,
        modelo_busca_start       = modelo_busca,
        modelo_padrao_pro_ent    = modelo_padrao,
        modelo_relatorios_pro_ent = modelo_relatorios,
        modelo_busca_pro_ent     = modelo_busca
      WHERE
        modelo_padrao_start      = 'gpt-4.1-mini'
        AND modelo_relatorios_start  = 'gpt-4.1-mini'
        AND modelo_busca_start       = 'gpt-4o-mini'
        AND modelo_padrao_pro_ent    = 'gpt-4.1-mini'
        AND modelo_relatorios_pro_ent = 'gpt-4.1'
        AND modelo_busca_pro_ent     = 'gpt-4o'
    `);

    // Task #80/#86 — Web search usage counter (Serper.dev, persisted, restart-safe)
    await client.query(`
      CREATE TABLE IF NOT EXISTS google_search_usage (
        date VARCHAR PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Task #119 — GitHub auto-push scheduler config
    await client.query(`ALTER TABLE config_sistema ADD COLUMN IF NOT EXISTS github_auto_push_enabled BOOLEAN NOT NULL DEFAULT false`);
    await client.query(`ALTER TABLE config_sistema ADD COLUMN IF NOT EXISTS github_auto_push_frequencia TEXT NOT NULL DEFAULT 'diario'`);

    // Task #158 — Meu Painel Pessoal: responsavel_id em iniciativas + indicadores (FK opcional para usuarios)
    // Mantém colunas legadas (responsavel/owner em texto) intactas para histórico.
    await client.query(`
      ALTER TABLE iniciativas
      ADD COLUMN IF NOT EXISTS responsavel_id VARCHAR REFERENCES usuarios(id) ON DELETE SET NULL
    `);
    await client.query(`
      ALTER TABLE indicadores
      ADD COLUMN IF NOT EXISTS responsavel_id VARCHAR REFERENCES usuarios(id) ON DELETE SET NULL
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_iniciativas_responsavel_id ON iniciativas(responsavel_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_indicadores_responsavel_id ON indicadores(responsavel_id)`);

    // Backfill best-effort (idempotente): casa texto legado de responsável com nome exato de
    // usuário da mesma empresa. Só preenche quando responsavel_id ainda é NULL.
    await client.query(`
      UPDATE iniciativas i
      SET responsavel_id = u.id
      FROM usuarios u
      WHERE i.responsavel_id IS NULL
        AND i.responsavel IS NOT NULL
        AND TRIM(i.responsavel) <> ''
        AND u.empresa_id = i.empresa_id
        AND LOWER(TRIM(u.nome)) = LOWER(TRIM(i.responsavel))
    `);
    await client.query(`
      UPDATE indicadores k
      SET responsavel_id = u.id
      FROM usuarios u
      WHERE k.responsavel_id IS NULL
        AND k.owner IS NOT NULL
        AND TRIM(k.owner) <> ''
        AND u.empresa_id = k.empresa_id
        AND LOWER(TRIM(u.nome)) = LOWER(TRIM(k.owner))
    `);

    // Task #162 — Cascata estratégica conectada: novos FKs entre Estratégia → Oportunidade → Iniciativa → Objetivo
    await client.query(`
      ALTER TABLE oportunidades_crescimento
      ADD COLUMN IF NOT EXISTS estrategia_id VARCHAR REFERENCES estrategias(id) ON DELETE SET NULL
    `);
    await client.query(`
      ALTER TABLE iniciativas
      ADD COLUMN IF NOT EXISTS oportunidade_id VARCHAR REFERENCES oportunidades_crescimento(id) ON DELETE SET NULL
    `);
    await client.query(`
      ALTER TABLE objetivos
      ADD COLUMN IF NOT EXISTS iniciativa_id VARCHAR REFERENCES iniciativas(id) ON DELETE SET NULL
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_oportunidades_estrategia_id ON oportunidades_crescimento(estrategia_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_iniciativas_oportunidade_id ON iniciativas(oportunidade_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_objetivos_iniciativa_id ON objetivos(iniciativa_id)`);

    // Task #164 — Preços dos planos exibidos na landing page (editáveis pelo admin)
    await client.query(`
      CREATE TABLE IF NOT EXISTS precos_landing_planos (
        plano VARCHAR PRIMARY KEY,
        preco_centavos INTEGER NOT NULL,
        promocao_ativa BOOLEAN NOT NULL DEFAULT false,
        preco_promocional_centavos INTEGER,
        promocao_fim_em TIMESTAMP,
        atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      INSERT INTO precos_landing_planos (plano, preco_centavos)
      VALUES ('start', 18700), ('pro', 49000)
      ON CONFLICT (plano) DO NOTHING
    `);

    // Task #182 — Briefing diário gerado por IA (cache + log de execução)
    await client.query(`
      CREATE TABLE IF NOT EXISTS briefing_diario (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        data DATE NOT NULL,
        conteudo JSONB NOT NULL,
        fonte TEXT NOT NULL DEFAULT 'ia',
        gerado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Caso a tabela exista com tipos antigos (VARCHAR/TEXT), faz upgrade não-destrutivo.
    // Verifica primeiro se já está no tipo correto para não rodar ALTER à toa.
    const colCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'briefing_diario' AND column_name IN ('data', 'conteudo')
    `);
    const tipos = Object.fromEntries(colCheck.rows.map((r) => [r.column_name, r.data_type]));
    if (tipos.data && tipos.data !== "date") {
      await client.query(`ALTER TABLE briefing_diario ALTER COLUMN data TYPE DATE USING (data::date)`);
    }
    if (tipos.conteudo && tipos.conteudo !== "jsonb") {
      // Apaga linhas com conteúdo inválido para não quebrar a conversão.
      await client.query(`
        DELETE FROM briefing_diario
        WHERE conteudo IS NULL OR btrim(conteudo) = '' OR left(btrim(conteudo), 1) NOT IN ('{', '[')
      `);
      await client.query(`ALTER TABLE briefing_diario ALTER COLUMN conteudo TYPE JSONB USING (conteudo::jsonb)`);
    }
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS briefing_diario_empresa_data_uq
      ON briefing_diario (empresa_id, data)
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS briefing_diario_logs (
        id SERIAL PRIMARY KEY,
        empresa_id VARCHAR NOT NULL,
        data DATE NOT NULL,
        executado_em TIMESTAMP NOT NULL DEFAULT NOW(),
        fonte TEXT NOT NULL,
        duracao_ms INTEGER NOT NULL DEFAULT 0,
        resultado TEXT NOT NULL,
        mensagem TEXT NOT NULL DEFAULT ''
      )
    `);
    const colLogsCheck = await client.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'briefing_diario_logs' AND column_name = 'data'
    `);
    if (colLogsCheck.rows[0] && colLogsCheck.rows[0].data_type !== "date") {
      await client.query(`ALTER TABLE briefing_diario_logs ALTER COLUMN data TYPE DATE USING (data::date)`);
    }
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_briefing_diario_logs_empresa_executado
      ON briefing_diario_logs (empresa_id, executado_em DESC)
    `);

    // Task #207 — Encerramento de iniciativa (status final + nota)
    await client.query(`
      ALTER TABLE iniciativas ADD COLUMN IF NOT EXISTS nota_encerramento TEXT
    `);
    await client.query(`
      ALTER TABLE iniciativas ADD COLUMN IF NOT EXISTS encerrada_em TIMESTAMP
    `);

    // Task #208 — Vincular iniciativa e meta ao indicador (KPI fonte)
    await client.query(`
      ALTER TABLE iniciativas
      ADD COLUMN IF NOT EXISTS indicador_fonte_id VARCHAR
      REFERENCES indicadores(id) ON DELETE SET NULL
    `);
    await client.query(`
      ALTER TABLE resultados_chave
      ADD COLUMN IF NOT EXISTS indicador_fonte_id VARCHAR
      REFERENCES indicadores(id) ON DELETE SET NULL
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_iniciativas_indicador_fonte_id ON iniciativas(indicador_fonte_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_resultados_chave_indicador_fonte_id ON resultados_chave(indicador_fonte_id)`);

    // Task #263/#264 — coluna opcional `prazo_data` (DATE) para iniciativas,
    // objetivos e resultados-chave. Aditivo, NULL para registros legados.
    await client.query(`ALTER TABLE iniciativas ADD COLUMN IF NOT EXISTS prazo_data DATE`);
    await client.query(`ALTER TABLE objetivos ADD COLUMN IF NOT EXISTS prazo_data DATE`);
    await client.query(`ALTER TABLE resultados_chave ADD COLUMN IF NOT EXISTS prazo_data DATE`);

    // Task #221 — Memória persistente do Assistente (conversas + mensagens + fatos)
    await client.query(`
      CREATE TABLE IF NOT EXISTS assistente_conversas (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        usuario_id VARCHAR REFERENCES usuarios(id) ON DELETE SET NULL,
        titulo TEXT NOT NULL DEFAULT '',
        criada_em TIMESTAMP NOT NULL DEFAULT NOW(),
        ultima_interacao_em TIMESTAMP NOT NULL DEFAULT NOW(),
        encerrada_em TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assistente_conversas_empresa_ultima ON assistente_conversas (empresa_id, ultima_interacao_em DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assistente_conversas_empresa_usuario ON assistente_conversas (empresa_id, usuario_id, ultima_interacao_em DESC)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assistente_mensagens (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        conversa_id VARCHAR NOT NULL REFERENCES assistente_conversas(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        propostas JSONB,
        criada_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assistente_mensagens_conversa ON assistente_mensagens (conversa_id, criada_em ASC)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assistente_memoria (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        fato TEXT NOT NULL,
        categoria TEXT NOT NULL DEFAULT 'contexto',
        fonte_mensagem_id VARCHAR REFERENCES assistente_mensagens(id) ON DELETE SET NULL,
        ativo BOOLEAN NOT NULL DEFAULT true,
        criado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assistente_memoria_empresa_ativo ON assistente_memoria (empresa_id, ativo, criado_em DESC)`);

    // Task #233 — Rituais de gestão (pautas, atas, decisões, revisões)
    await client.query(`
      CREATE TABLE IF NOT EXISTS reuniao_pautas (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        gerada_em TIMESTAMP NOT NULL DEFAULT NOW(),
        data_alvo TEXT NOT NULL,
        conteudo JSONB NOT NULL,
        ata_id VARCHAR
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reuniao_pautas_empresa_data ON reuniao_pautas (empresa_id, gerada_em DESC)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reuniao_atas (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        pauta_id VARCHAR REFERENCES reuniao_pautas(id) ON DELETE SET NULL,
        registrada_em TIMESTAMP NOT NULL DEFAULT NOW(),
        decisoes JSONB NOT NULL DEFAULT '[]'::jsonb,
        encaminhamentos JSONB NOT NULL DEFAULT '[]'::jsonb
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reuniao_atas_empresa_data ON reuniao_atas (empresa_id, registrada_em DESC)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS decisoes_estrategicas (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        titulo TEXT NOT NULL,
        contexto TEXT NOT NULL DEFAULT '',
        alternativas JSONB NOT NULL DEFAULT '[]'::jsonb,
        escolha TEXT NOT NULL,
        justificativa TEXT NOT NULL DEFAULT '',
        registrada_em TIMESTAMP NOT NULL DEFAULT NOW(),
        registrada_por_usuario_id VARCHAR REFERENCES usuarios(id) ON DELETE SET NULL,
        ata_id VARCHAR REFERENCES reuniao_atas(id) ON DELETE SET NULL
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_decisoes_estrategicas_empresa_data ON decisoes_estrategicas (empresa_id, registrada_em DESC)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS revisoes_agendadas (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id VARCHAR NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        escopo TEXT NOT NULL,
        escopo_id VARCHAR,
        data_alvo TEXT NOT NULL,
        foco TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pendente',
        criada_em TIMESTAMP NOT NULL DEFAULT NOW(),
        concluida_em TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_revisoes_agendadas_empresa_status ON revisoes_agendadas (empresa_id, status, data_alvo)`);

    // Seed: ensure the platform admin from env vars exists and has the correct password
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminSenha = process.env.ADMIN_SENHA;
    if (adminEmail && adminSenha) {
      const { rows: existingUser } = await client.query(
        `SELECT id, empresa_id FROM usuarios WHERE email = $1 LIMIT 1`,
        [adminEmail]
      );
      const senhaHash = await bcrypt.hash(adminSenha, 10);
      if (existingUser.length > 0) {
        // User with ADMIN_EMAIL already exists — ensure they are admin and update password
        await client.query(
          `UPDATE usuarios SET senha = $1, is_admin = true, role = 'admin', email_verificado = true WHERE email = $2`,
          [senhaHash, adminEmail]
        );
        log(`[SEED] Admin atualizado: ${adminEmail}`);
      } else {
        // No user with ADMIN_EMAIL — create fresh admin with its own empresa
        const adminNome = process.env.ADMIN_NOME || "Administrador";
        const adminEmpresaNome = process.env.ADMIN_EMPRESA_NOME || "BizGuideAI";
        await client.query("BEGIN");
        try {
          const { rows: empresaRows } = await client.query(
            `INSERT INTO empresas (nome, setor, tamanho, plano_status, trial_started_at, created_at)
             VALUES ($1, 'Tecnologia', 'pequena', 'ativo', NOW(), NOW())
             RETURNING id`,
            [adminEmpresaNome]
          );
          const empresaId = empresaRows[0].id;
          const { rows: userRows } = await client.query(
            `INSERT INTO usuarios (nome, email, senha, empresa_id, is_admin, role, email_verificado, created_at)
             VALUES ($1, $2, $3, $4, true, 'admin', true, NOW())
             RETURNING id`,
            [adminNome, adminEmail, senhaHash, empresaId]
          );
          await client.query(
            `UPDATE empresas SET proprietario_usuario_id = $1 WHERE id = $2`,
            [userRows[0].id, empresaId]
          );
          await client.query("COMMIT");
          log(`[SEED] Admin criado com sucesso: ${adminEmail}`);
        } catch (seedErr) {
          await client.query("ROLLBACK");
          log(`[SEED] Falha ao criar admin: ${seedErr}`);
        }
      }
    }
  } finally {
    client.release();
  }
}

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

const PgSession = connectPgSimple(session);

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await runStartupMigrations();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
