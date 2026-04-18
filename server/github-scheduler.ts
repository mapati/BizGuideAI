import { spawn } from "child_process";
import path from "path";
import cron from "node-cron";
import { sendPushFailureEmail } from "./email";

export type PushFrequencia = "1h" | "6h" | "diario";

export interface PushLog {
  executadoEm: Date;
  resultado: "sucesso" | "erro" | "sem_alteracoes";
  mensagem: string;
}

const MAX_LOGS = 50;
const pushLogs: PushLog[] = [];

let activeTask: cron.ScheduledTask | null = null;

function cronExpressionFor(freq: PushFrequencia): string {
  switch (freq) {
    case "1h":
      return "0 * * * *";
    case "6h":
      return "0 */6 * * *";
    case "diario":
    default:
      return "0 2 * * *";
  }
}

export async function runGithubPush(trigger: "manual" | "agendado" = "agendado"): Promise<PushLog> {
  const now = new Date();
  const scriptPath = path.resolve("scripts/push-github.sh");
  const msg = `chore: backup automático ${trigger} — ${now.toISOString()}`;

  const projectRoot = path.resolve(".");

  return new Promise((resolve) => {
    const proc = spawn("bash", [scriptPath, msg], {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: projectRoot,
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";
    let alertSent = false;

    function notifyFailure(mensagem: string): void {
      if (trigger !== "agendado" || alertSent) return;
      alertSent = true;
      sendPushFailureEmail(mensagem, now).catch((e) =>
        console.error("[GITHUB_SCHEDULER] Falha ao enviar e-mail de alerta:", e)
      );
    }

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      let resultado: PushLog["resultado"];
      let mensagem: string;

      if (code === 0) {
        if (stdout.includes("Nenhuma alteração")) {
          resultado = "sem_alteracoes";
          mensagem = "Nenhuma alteração detectada — repositório já está atualizado.";
        } else {
          resultado = "sucesso";
          mensagem = `Push realizado com sucesso (${trigger}).`;
        }
      } else {
        resultado = "erro";
        mensagem = (stderr || stdout || `Processo encerrou com código ${code}`).trim().slice(0, 500);
      }

      const log: PushLog = { executadoEm: now, resultado, mensagem };
      pushLogs.unshift(log);
      if (pushLogs.length > MAX_LOGS) pushLogs.length = MAX_LOGS;

      if (resultado === "erro") {
        console.error(`[GITHUB_SCHEDULER] Erro no push (${trigger}): ${mensagem}`);
        notifyFailure(mensagem);
      } else {
        console.log(`[GITHUB_SCHEDULER] Push ${resultado} (${trigger}): ${mensagem}`);
      }

      resolve(log);
    });

    proc.on("error", (err) => {
      const mensagem = `Falha ao iniciar o script: ${err.message}`;
      const log: PushLog = { executadoEm: now, resultado: "erro", mensagem };
      pushLogs.unshift(log);
      if (pushLogs.length > MAX_LOGS) pushLogs.length = MAX_LOGS;
      console.error(`[GITHUB_SCHEDULER] ${mensagem}`);
      notifyFailure(mensagem);
      resolve(log);
    });
  });
}

export function getPushLogs(): PushLog[] {
  return [...pushLogs];
}

export function startGithubScheduler(freq: PushFrequencia): void {
  if (activeTask) {
    activeTask.stop();
    activeTask = null;
  }
  const expr = cronExpressionFor(freq);
  console.log(`[GITHUB_SCHEDULER] Agendador iniciado — frequência: ${freq} (${expr})`);
  activeTask = cron.schedule(expr, async () => {
    console.log("[GITHUB_SCHEDULER] Executando push agendado...");
    await runGithubPush("agendado");
  });
}

export function stopGithubScheduler(): void {
  if (activeTask) {
    activeTask.stop();
    activeTask = null;
    console.log("[GITHUB_SCHEDULER] Agendador parado.");
  }
}
