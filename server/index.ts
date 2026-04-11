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

    // Seed: create initial admin user if none exists and env vars are provided
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminSenha = process.env.ADMIN_SENHA;
    if (adminEmail && adminSenha) {
      const { rows: existingAdmins } = await client.query(
        `SELECT id FROM usuarios WHERE is_admin = true LIMIT 1`
      );
      if (existingAdmins.length === 0) {
        const adminNome = process.env.ADMIN_NOME || "Administrador";
        const adminEmpresaNome = process.env.ADMIN_EMPRESA_NOME || "BizGuideAI";
        const { rows: empresaRows } = await client.query(
          `INSERT INTO empresas (nome, setor, tamanho, plano_status, trial_started_at, created_at)
           VALUES ($1, 'Tecnologia', 'pequena', 'ativo', NOW(), NOW())
           RETURNING id`,
          [adminEmpresaNome]
        );
        const empresaId = empresaRows[0].id;
        const senhaHash = await bcrypt.hash(adminSenha, 10);
        await client.query(
          `INSERT INTO usuarios (nome, email, senha, empresa_id, is_admin, role, created_at)
           VALUES ($1, $2, $3, $4, true, 'admin', NOW())`,
          [adminNome, adminEmail, senhaHash, empresaId]
        );
        log(`[SEED] Admin criado com sucesso: ${adminEmail}`);
      }
    }
  } finally {
    client.release();
  }
}

const app = express();
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
