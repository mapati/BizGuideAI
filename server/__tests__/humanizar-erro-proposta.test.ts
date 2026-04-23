// Task #342 — Cobre o humanizador de mensagens de erro técnicas que
// devolvido por `registrarProposta` (FK inválida, duplicidade, parâmetros,
// no-op, ferramenta desconhecida). Garante que UUIDs, `indicadorId=`,
// `Use sempre o id REAL`, JSON e nomes de tools snake_case nunca vazem.

import { describe, it, expect, vi } from "vitest";

vi.mock("../storage", () => ({ storage: {} }));
vi.mock("../ai-helpers", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
  AI_MODELS: { default: "gpt-test" },
}));
vi.mock("../bizzy-resumos", () => ({
  buildHistoricoContextoIA: vi.fn(),
  gerarResumoCiclo: vi.fn(),
  lerConteudoResumo: vi.fn(),
}));

import { humanizarErroProposta } from "../assistant-tools";

const TECH_PATTERNS = [
  /indicadorId=/i,
  /iniciativaId=/i,
  /objetivoId=/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  /Use sempre o id REAL/i,
  /Parâmetros inválidos/i,
  /Reemita a tool/i,
  /\{[\s\S]*\}/, // JSON
];

function expectNenhumaPistaTecnica(out: string) {
  for (const re of TECH_PATTERNS) {
    expect(out, `vazou padrão técnico ${re}`).not.toMatch(re);
  }
}

describe("humanizarErroProposta", () => {
  it("FK inválida: substitui mensagem técnica por pergunta amigável + sugere candidatos por nome", () => {
    const tecnico = `O indicador (KPI) com indicadorId="kpi_uso_sistemas_digitais_integrados" não existe nesta empresa. Use sempre o id REAL do CATÁLOGO (formato UUID, ex.: "12345678-..."), nunca um slug ou nome. Candidatos parecidos:
• "Uso de Sistemas Digitais Integrados por Clientes" (id=9f68b8e3-66e4-46b5-8c94-23925bb564e6, perspectiva=Clientes)
• "Adoção de canais digitais" (id=11111111-2222-3333-4444-555555555555, perspectiva=Processos)
Reemita a tool com o id correto ou pergunte ao usuário qual ele quis dizer.`;
    const out = humanizarErroProposta(tecnico);
    expect(out).toMatch(/Não consegui identificar/i);
    expect(out).toMatch(/indicador \(KPI\)/i);
    expect(out).toMatch(/Uso de Sistemas Digitais Integrados/i);
    expectNenhumaPistaTecnica(out);
  });

  it("FK inválida sem candidatos: ainda devolve pergunta amigável", () => {
    const tecnico = `O OKR (objetivo) com objetivoId="okr_inventado" não existe nesta empresa. Use sempre o id REAL do CATÁLOGO (formato UUID, ex.: "12345678-..."), nunca um slug ou nome. Candidatos parecidos:
(nenhum candidato parecido encontrado nesta empresa)
Reemita a tool com o id correto ou pergunte ao usuário qual ele quis dizer.`;
    const out = humanizarErroProposta(tecnico);
    expect(out).toMatch(/Não consegui identificar/i);
    expect(out).toMatch(/OKR/i);
    expectNenhumaPistaTecnica(out);
  });

  it("duplicidade: convida a atualizar/arquivar em vez de criar nova", () => {
    const tecnico = `Já existe iniciativa parecido(a) nesta empresa — não criei "Reduzir churn em 20% no próximo trimestre" para evitar duplicidade. Candidatos:
• "Reduzir churn de clientes Pro" (id=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee, status=em_andamento)
Proponha atualizar/arquivar um deles ou pergunte ao usuário qual ele quis dizer.`;
    const out = humanizarErroProposta(tecnico);
    expect(out).toMatch(/já existe iniciativa parecida/i);
    expect(out).toMatch(/Reduzir churn de clientes Pro/);
    expect(out).toMatch(/atualize ou arquive/i);
    expectNenhumaPistaTecnica(out);
  });

  it("parâmetros inválidos (Zod): pede mais detalhes sem citar o nome da tool", () => {
    const tecnico = `Parâmetros inválidos para atualizar_valor_indicador: [\n  {\n    "code": "invalid_type",\n    "expected": "string",\n    "received": "undefined",\n    "path": ["indicadorId"],\n    "message": "Required"\n  }\n]`;
    const out = humanizarErroProposta(tecnico);
    expect(out).toMatch(/Faltam algumas informações/i);
    expectNenhumaPistaTecnica(out);
  });

  it("no-op: pede o que mudou sem jargão técnico", () => {
    const tecnico = `Nada a alterar nesta iniciativa: todos os campos enviados já batem com o estado atual de "Reduzir churn".`;
    const out = humanizarErroProposta(tecnico);
    expect(out).toMatch(/iguais ao que já está cadastrado/i);
    expectNenhumaPistaTecnica(out);
  });

  it("ferramenta desconhecida: devolve fallback genérico amigável", () => {
    const out = humanizarErroProposta("Ferramenta desconhecida: foo_bar_baz");
    expect(out).toMatch(/Não tenho uma ação direta/i);
    expectNenhumaPistaTecnica(out);
  });

  it("mensagem vazia: devolve fallback amigável", () => {
    const out = humanizarErroProposta("");
    expect(out.length).toBeGreaterThan(10);
    expectNenhumaPistaTecnica(out);
  });
});
