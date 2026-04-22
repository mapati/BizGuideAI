// Step 11 / Task #284 — Testes puros do parser de citações `[tipo:id]` do
// AssistantMarkdown. Valida o regex, o mapa tipo→rota e a tolerância a
// IDs parciais (que aparecem durante streaming SSE token-a-token).
//
// Não roda browser/auth/LLM — testa só a lógica determinística que
// converte o texto bruto do Bizzy em links clicáveis. Mesmo padrão de
// `assistant-status.spec.ts`.
import { test, expect } from "@playwright/test";
import {
  parseCitacoes,
  citacaoToHref,
  type CitacaoTipo,
} from "../../client/src/components/AssistantMarkdown";

test.describe("AssistantMarkdown — parseCitacoes", () => {
  test("extrai citação simples no meio de uma frase", () => {
    const txt =
      "O indicador Receita Bruta [indicador:f8b621b4-6ee7-4900-9243-c344242f45e0] está estável.";
    const cits = parseCitacoes(txt);
    expect(cits).toHaveLength(1);
    expect(cits[0].tipo).toBe("indicador");
    expect(cits[0].id).toBe("f8b621b4-6ee7-4900-9243-c344242f45e0");
    expect(cits[0].href).toBe(
      "/indicadores?editar=f8b621b4-6ee7-4900-9243-c344242f45e0",
    );
  });

  test("extrai múltiplas citações de tipos diferentes preservando ordem", () => {
    const txt =
      "Vincular [iniciativa:94ebabdd-54c1-480b-bbdc-2beeaf5892e9] ao [objetivo:1f79a35c-570d-4939-a250-998a61aeb97a].";
    const cits = parseCitacoes(txt);
    expect(cits.map((c) => c.tipo)).toEqual(["iniciativa", "objetivo"]);
    expect(cits[0].href).toBe(
      "/iniciativas?editar=94ebabdd-54c1-480b-bbdc-2beeaf5892e9",
    );
    expect(cits[1].href).toBe(
      "/okrs?editar=1f79a35c-570d-4939-a250-998a61aeb97a",
    );
    expect(cits[0].index).toBeLessThan(cits[1].index);
  });

  test("não confunde texto sem marcador (sintaxe quebrada não vira badge)", () => {
    expect(parseCitacoes("indicador receita bruta está alta")).toHaveLength(0);
    // Tipo inválido
    expect(parseCitacoes("[lorem:abc-123]")).toHaveLength(0);
    // ID curto demais (<4 chars)
    expect(parseCitacoes("[indicador:ab]")).toHaveLength(0);
    // ID que não começa com hex
    expect(parseCitacoes("[indicador:zzzz1234]")).toHaveLength(0);
  });

  test("aceita ID parcial (≥4 chars) — sobrevive a streaming SSE token-a-token", () => {
    const cits = parseCitacoes("status do [kr:7c8e]");
    expect(cits).toHaveLength(1);
    expect(cits[0].tipo).toBe("kr");
    expect(cits[0].id).toBe("7c8e");
  });

  test("é case-insensitive no nome do tipo", () => {
    const cits = parseCitacoes("[INDICADOR:abc-123] e [Risco:def-456]");
    expect(cits.map((c) => c.tipo)).toEqual(["indicador", "risco"]);
  });

  test("execuções consecutivas no mesmo input são estáveis (lastIndex resetado)", () => {
    const txt = "[indicador:f8b6-2222]";
    const a = parseCitacoes(txt);
    const b = parseCitacoes(txt);
    const c = parseCitacoes(txt);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(c).toHaveLength(1);
    expect(a[0].id).toBe(b[0].id);
  });
});

test.describe("AssistantMarkdown — citacaoToHref (mapa tipo→rota)", () => {
  // Cada par espelha TIPO_ROTA_ABRIR em server/assistant-tools.ts. Se uma
  // rota mudar lá, este teste falha — protege a paridade entre o que o
  // assistente faz no botão "abrir" e o que a citação clicável faz.
  const casos: Array<[CitacaoTipo, string]> = [
    ["indicador", "/indicadores?editar=ID"],
    ["iniciativa", "/iniciativas?editar=ID"],
    ["objetivo", "/okrs?editar=ID"],
    ["kr", "/okrs?editar=ID&tipo=kr"],
    ["risco", "/riscos?editar=ID"],
    ["oportunidade", "/oportunidades-crescimento?editar=ID"],
    ["estrategia", "/estrategias?editar=ID"],
  ];

  for (const [tipo, esperado] of casos) {
    test(`${tipo} → ${esperado}`, () => {
      expect(citacaoToHref(tipo, "ID")).toBe(esperado);
    });
  }
});
