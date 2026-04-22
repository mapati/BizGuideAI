// Task #221 — Extrator de fatos persistentes do Assistente.
// Lê as últimas mensagens de uma conversa, pede ao LLM para extrair até 5
// fatos curtos (decisão / hipótese / restrição / prioridade / contexto) e
// persiste em assistente_memoria. Sempre wrapped em try/catch — nunca
// pode bloquear ou estourar a resposta principal.

import { z } from "zod";
import { openai, getModelForPlan } from "./ai-helpers";
import { storage } from "./storage";

const fatoSchema = z.object({
  fato: z.string().trim().min(8).max(220),
  categoria: z.enum(["decisao", "hipotese", "restricao", "prioridade", "contexto"]),
});
const respostaSchema = z.object({
  fatos: z.array(fatoSchema).max(5).default([]),
});

function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function jaccard(a: string, b: string): number {
  const ta = new Set(normalizar(a).split(/\W+/).filter((w) => w.length > 2));
  const tb = new Set(normalizar(b).split(/\W+/).filter((w) => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((w) => { if (tb.has(w)) inter++; });
  return inter / (ta.size + tb.size - inter);
}

const PROMPT = `Você está ajudando a manter a memória de longo prazo de um assistente de estratégia empresarial.

Sua tarefa: a partir das últimas mensagens da conversa abaixo, extrair até 5 FATOS PERSISTENTES sobre a empresa do usuário — coisas que continuam verdadeiras depois desta conversa e que ajudariam o assistente em conversas FUTURAS.

REGRAS:
- Extraia APENAS fatos sobre a empresa, suas decisões, hipóteses, restrições, prioridades ou contexto. Ignore perguntas, saudações e dúvidas técnicas.
- Cada fato deve ser uma frase curta (≤180 caracteres), em 3ª pessoa, com nomes/números concretos.
- Categorias permitidas:
  • decisao — algo que o usuário decidiu fazer ou parou de fazer.
  • hipotese — algo que o usuário acredita / quer testar.
  • restricao — limite real (orçamento, prazo, equipe, regulação).
  • prioridade — foco atual / o que importa mais agora.
  • contexto — informação estável sobre a empresa (mercado, modelo, cliente).
- Se nada relevante apareceu, devolva fatos: [].
- Não repita fatos já presentes na "MEMÓRIA EXISTENTE" — só adicione novidades ou refinamentos claros.
- Devolva APENAS JSON válido no formato: {"fatos":[{"fato":"...","categoria":"decisao"}]}`;

interface ExtrairOpts {
  empresaId: string;
  conversaId: string;
  planoTipo?: string | null;
  /** Se true, força extração mesmo sem o gatilho do contador. */
  forcar?: boolean;
}

/**
 * Extrai e persiste fatos. Idempotente em relação a duplicatas (Jaccard ≥ 0.7
 * com fato ativo existente é considerado duplicata e descartado). Limita a 5
 * novas inserções por chamada. Retorna a quantidade de fatos persistidos.
 */
export async function extrairEPersistirMemoria(opts: ExtrairOpts): Promise<number> {
  try {
    const mensagens = await storage.getMensagens(opts.conversaId, 12);
    if (mensagens.length < 2) return 0;

    const memoriaExistente = await storage.getMemoriaAtiva(opts.empresaId, 30);

    const transcript = mensagens
      .map((m) => `${m.role === "user" ? "USUÁRIO" : "ASSISTENTE"}: ${m.content.slice(0, 1200)}`)
      .join("\n\n");

    const memoriaTxt = memoriaExistente.length
      ? memoriaExistente.map((m) => `- [${m.categoria}] ${m.fato}`).join("\n")
      : "(vazia)";

    const userMsg = `MEMÓRIA EXISTENTE:\n${memoriaTxt}\n\nÚLTIMAS MENSAGENS DA CONVERSA:\n${transcript}\n\nDevolva o JSON com até 5 fatos novos.`;

    const completion = await openai.chat.completions.create({
      model: getModelForPlan(opts.planoTipo ?? null, "relatorios"),
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: userMsg },
      ],
      temperature: 0.2,
      max_tokens: 250,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!raw) return 0;

    let parsed: z.infer<typeof respostaSchema>;
    try {
      parsed = respostaSchema.parse(JSON.parse(raw));
    } catch (err) {
      console.warn("[memoria-extractor] JSON inválido, descartado.", err);
      return 0;
    }

    if (parsed.fatos.length === 0) return 0;

    const ultimaMsgUserId =
      [...mensagens].reverse().find((m) => m.role === "user")?.id ?? null;

    let inseridos = 0;
    for (const fato of parsed.fatos) {
      const dup = memoriaExistente.some((m) => jaccard(m.fato, fato.fato) >= 0.7);
      if (dup) continue;
      try {
        await storage.upsertMemoria(opts.empresaId, fato.fato, fato.categoria, ultimaMsgUserId);
        inseridos++;
      } catch (err) {
        console.warn("[memoria-extractor] Falha ao persistir fato:", err);
      }
    }
    return inseridos;
  } catch (err) {
    console.warn("[memoria-extractor] Falhou silenciosamente:", err);
    return 0;
  }
}

/**
 * Dispara extração em background — fire-and-forget. Nunca propaga erros.
 */
export function dispararExtracaoBackground(opts: ExtrairOpts): void {
  setImmediate(() => {
    extrairEPersistirMemoria(opts).catch((err) =>
      console.warn("[memoria-extractor] background fail:", err),
    );
  });
}
