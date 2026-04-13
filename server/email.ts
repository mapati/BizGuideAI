import { Resend } from "resend";

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@bizguideai.com.br";
const APP_URL = process.env.APP_URL || "https://bizguideai.com.br";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendVerificationEmail(
  toEmail: string,
  nome: string,
  token: string
): Promise<void> {
  const link = `${APP_URL}/api/auth/verify-email?token=${token}`;

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
