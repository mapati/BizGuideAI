import { Resend } from "resend";

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@bizguideai.org";
const APP_URL = process.env.APP_URL || "https://bizguideai.org";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export interface EmailDiagnostics {
  resendApiKey: boolean;
  emailFrom: string;
  emailFromConfigured: boolean;
  emailFromValido: boolean;
  fromDomain: string | null;
}

export interface EmailSendResult {
  ok: boolean;
  errorCategory?: "config_ausente" | "remetente_invalido" | "dominio_nao_verificado" | "provedor";
  errorMessage?: string;
}

export function getEmailDiagnostics(): EmailDiagnostics {
  const fromConfigured = !!process.env.EMAIL_FROM;
  const valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(FROM_EMAIL);
  const dominio = valido ? FROM_EMAIL.split("@")[1] : null;
  return {
    resendApiKey: !!process.env.RESEND_API_KEY,
    emailFrom: FROM_EMAIL,
    emailFromConfigured: fromConfigured,
    emailFromValido: valido,
    fromDomain: dominio,
  };
}

interface ResendErrorShape { name?: string; message?: string; statusCode?: number }
interface ResendSendResponse { id?: string; error?: ResendErrorShape | null }

function classifyResendError(err: ResendErrorShape | Error | null | undefined): EmailSendResult["errorCategory"] {
  const raw = err && typeof err === "object" && "message" in err ? (err as { message?: string }).message : String(err ?? "");
  const msg = (raw ?? "").toLowerCase();
  if (msg.includes("not verified") || (msg.includes("domain") && msg.includes("verif"))) return "dominio_nao_verificado";
  if (msg.includes("from") && (msg.includes("invalid") || msg.includes("required"))) return "remetente_invalido";
  return "provedor";
}

export async function sendAlertEmail(toEmail: string, subject: string, html: string): Promise<EmailSendResult> {
  const resend = getResend();
  if (!resend) {
    console.warn(`[EMAIL] Alerta para ${toEmail} pulado — RESEND_API_KEY ausente`);
    return { ok: false, errorCategory: "config_ausente", errorMessage: "RESEND_API_KEY não configurada" };
  }
  const diag = getEmailDiagnostics();
  if (!diag.emailFromValido) {
    console.warn(`[EMAIL] Alerta para ${toEmail} pulado — EMAIL_FROM inválido (${diag.emailFrom})`);
    return { ok: false, errorCategory: "remetente_invalido", errorMessage: `EMAIL_FROM inválido: ${diag.emailFrom}` };
  }
  try {
    const r = (await resend.emails.send({
      from: `BizGuideAI <${FROM_EMAIL}>`,
      to: toEmail,
      subject,
      html,
    })) as unknown as ResendSendResponse;
    if (r?.error) {
      const cat = classifyResendError(r.error);
      const msg = r.error.message || JSON.stringify(r.error);
      console.error(`[EMAIL] Resend retornou erro (${cat}) para ${toEmail}: ${msg}`);
      return { ok: false, errorCategory: cat, errorMessage: msg };
    }
    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const cat = classifyResendError(err);
    console.error(`[EMAIL] Falha (${cat}) ao enviar alerta para ${toEmail} via Resend (de ${FROM_EMAIL}):`, err.message);
    return { ok: false, errorCategory: cat, errorMessage: err.message };
  }
}

export async function sendWeeklySummaryEmail(toEmail: string, html: string): Promise<void> {
  await sendAlertEmail(toEmail, "Resumo semanal do seu plano — BizGuideAI", html);
}

export async function sendVerificationEmail(
  toEmail: string,
  nome: string,
  token: string,
  plano?: string
): Promise<void> {
  const planoParam = plano ? `&plano=${encodeURIComponent(plano)}` : "";
  const link = `${APP_URL}/api/auth/verify-email?token=${token}${planoParam}`;

  const resend = getResend();
  if (!resend) {
    console.log(`[EMAIL - DEV] Verificação para ${toEmail}: ${link}`);
    return;
  }

  await resend.emails.send({
    from: `BizGuideAI <${FROM_EMAIL}>`,
    to: toEmail,
    subject: "Confirme seu e-mail — BizGuideAI",
    html: buildVerificationEmailHtml(nome, link),
  });
}

export async function sendPasswordResetEmail(
  toEmail: string,
  nome: string,
  token: string
): Promise<void> {
  const link = `${APP_URL}/reset-password?token=${token}`;

  const resend = getResend();
  if (!resend) {
    console.log(`[EMAIL - DEV] Reset de senha para ${toEmail}: ${link}`);
    return;
  }

  await resend.emails.send({
    from: `BizGuideAI <${FROM_EMAIL}>`,
    to: toEmail,
    subject: "Redefinição de senha — BizGuideAI",
    html: buildPasswordResetEmailHtml(nome, link),
  });
}

function buildVerificationEmailHtml(nome: string, link: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#1d4ed8;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">BizGuideAI</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">Confirme seu e-mail</h2>
            <p style="margin:0 0 8px;color:#374151;font-size:15px;">Olá, ${nome}!</p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;">
              Obrigado por se cadastrar no BizGuideAI. Clique no botão abaixo para confirmar seu endereço de e-mail e começar a usar a plataforma.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1d4ed8;border-radius:6px;">
                  <a href="${link}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    Confirmar e-mail
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">
              O link expira em 24 horas. Se você não criou uma conta no BizGuideAI, ignore este e-mail.
            </p>
            <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;word-break:break-all;">
              Se o botão não funcionar, copie e cole este link: ${link}
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
              &copy; ${new Date().getFullYear()} BizGuideAI. Todos os direitos reservados.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPushFailureEmail(
  errorMessage: string,
  timestamp: Date
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("[EMAIL] ADMIN_EMAIL não configurado — notificação de falha de push ignorada.");
    return;
  }

  const resend = getResend();
  if (!resend) {
    console.log(`[EMAIL - DEV] Falha no push agendado para ${adminEmail} em ${timestamp.toISOString()}: ${errorMessage}`);
    return;
  }

  await resend.emails.send({
    from: `BizGuideAI <${FROM_EMAIL}>`,
    to: adminEmail,
    subject: "Alerta: Falha no push automático para o GitHub — BizGuideAI",
    html: buildPushFailureEmailHtml(errorMessage, timestamp),
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPushFailureEmailHtml(errorMessage: string, timestamp: Date): string {
  const timestampFormatted = timestamp.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const safeError = escapeHtml(errorMessage);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#b91c1c;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">BizGuideAI</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">Falha no backup automático para o GitHub</h2>
            <p style="margin:0 0 16px;color:#374151;font-size:15px;">
              O push agendado para o repositório GitHub falhou. Ação manual pode ser necessária para garantir a integridade do backup.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:6px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px;">
                  <p style="margin:0 0 8px;color:#991b1b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Detalhes do erro</p>
                  <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Data/hora:</strong> ${timestampFormatted}</p>
                  <p style="margin:0;color:#374151;font-size:14px;word-break:break-word;"><strong>Mensagem:</strong> ${safeError}</p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#374151;font-size:15px;font-weight:600;">Como corrigir:</p>
            <ol style="margin:0 0 24px;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
              <li>Acesse o servidor e verifique o status do repositório Git local.</li>
              <li>Execute <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">git status</code> para identificar conflitos ou problemas pendentes.</li>
              <li>Se houver conflitos, execute <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">git pull --rebase</code> para sincronizar com o remoto.</li>
              <li>Após resolver, acesse o painel de administração e realize um push manual para confirmar que está funcionando.</li>
            </ol>
            <p style="margin:0;color:#6b7280;font-size:13px;">
              Este alerta foi disparado automaticamente pelo agendador de backup do BizGuideAI. Pushes manuais não geram notificações.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
              &copy; ${new Date().getFullYear()} BizGuideAI. Todos os direitos reservados.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetEmailHtml(nome: string, link: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#1d4ed8;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">BizGuideAI</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">Redefinição de senha</h2>
            <p style="margin:0 0 8px;color:#374151;font-size:15px;">Olá, ${nome}!</p>
            <p style="margin:0 0 24px;color:#374151;font-size:15px;">
              Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1d4ed8;border-radius:6px;">
                  <a href="${link}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    Redefinir senha
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">
              O link expira em 1 hora. Se você não solicitou a redefinição de senha, ignore este e-mail — sua conta continua segura.
            </p>
            <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;word-break:break-all;">
              Se o botão não funcionar, copie e cole este link: ${link}
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
              &copy; ${new Date().getFullYear()} BizGuideAI. Todos os direitos reservados.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
