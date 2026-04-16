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
          await client.query(
            `INSERT INTO usuarios (nome, email, senha, empresa_id, is_admin, role, email_verificado, created_at)
             VALUES ($1, $2, $3, $4, true, 'admin', true, NOW())`,
            [adminNome, adminEmail, senhaHash, empresaId]
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
