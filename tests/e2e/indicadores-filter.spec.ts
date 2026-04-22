// Task #249 — Unit tests for the shared helper that separates the initial
// diagnostic (perspectiva = "diagnostico") from BSC follow-up indicators.
import { test, expect } from "@playwright/test";
import {
  PERSPECTIVA_DIAGNOSTICO,
  filterAcompanhamento,
  isIndicadorAcompanhamento,
} from "../../client/src/lib/indicadores";

type Item = { id: string; perspectiva?: string | null; status?: string };

const todos: Item[] = [
  { id: "diag-vermelho-1", perspectiva: "diagnostico", status: "vermelho" },
  { id: "diag-vermelho-2", perspectiva: "diagnostico", status: "vermelho" },
  { id: "diag-amarelo",    perspectiva: "diagnostico", status: "amarelo" },
  { id: "fin-verde",       perspectiva: "Financeira",  status: "verde" },
  { id: "cli-amarelo",     perspectiva: "Clientes",    status: "amarelo" },
  { id: "proc-vermelho",   perspectiva: "Processos Internos", status: "vermelho" },
  { id: "sem-perspectiva", perspectiva: null,          status: "verde" },
  { id: "sem-campo",       /* perspectiva ausente */   status: "verde" },
];

test.describe("filterAcompanhamento", () => {
  test("constante PERSPECTIVA_DIAGNOSTICO bate com o backend", () => {
    expect(PERSPECTIVA_DIAGNOSTICO).toBe("diagnostico");
  });

  test("isIndicadorAcompanhamento exclui apenas perspectiva 'diagnostico'", () => {
    expect(isIndicadorAcompanhamento({ perspectiva: "diagnostico" })).toBe(false);
    expect(isIndicadorAcompanhamento({ perspectiva: "Financeira" })).toBe(true);
    expect(isIndicadorAcompanhamento({ perspectiva: "Clientes" })).toBe(true);
    expect(isIndicadorAcompanhamento({ perspectiva: "Processos Internos" })).toBe(true);
    expect(isIndicadorAcompanhamento({ perspectiva: "Aprendizado e Crescimento" })).toBe(true);
    expect(isIndicadorAcompanhamento({ perspectiva: null })).toBe(true);
    expect(isIndicadorAcompanhamento({})).toBe(true);
    // Comparação é estrita (case-sensitive).
    expect(isIndicadorAcompanhamento({ perspectiva: "Diagnostico" })).toBe(true);
    expect(isIndicadorAcompanhamento({ perspectiva: "DIAGNOSTICO" })).toBe(true);
  });

  test("filterAcompanhamento remove diagnóstico e mantém o resto na ordem", () => {
    const filtrados = filterAcompanhamento(todos);
    expect(filtrados.map((i) => i.id)).toEqual([
      "fin-verde",
      "cli-amarelo",
      "proc-vermelho",
      "sem-perspectiva",
      "sem-campo",
    ]);
    expect(filtrados.some((i) => i.perspectiva === "diagnostico")).toBe(false);
  });

  test("é puro: não muta o array original", () => {
    const copia = todos.map((i) => ({ ...i }));
    const filtrados = filterAcompanhamento(copia);
    expect(copia.map((i) => i.id)).toEqual(todos.map((i) => i.id));
    expect(filtrados).not.toBe(copia);
  });

  test("entrada vazia => saída vazia", () => {
    expect(filterAcompanhamento([])).toEqual([]);
  });

  test("empresa só com diagnóstico vermelho => zero KPIs de acompanhamento", () => {
    // Reproduz a derivação usada pelo useAssistantStatus: filtrar +
    // contar status === "vermelho". Não pode existir alerta.
    const apenasDiagnostico: Item[] = [
      { id: "d1", perspectiva: "diagnostico", status: "vermelho" },
      { id: "d2", perspectiva: "diagnostico", status: "vermelho" },
      { id: "d3", perspectiva: "diagnostico", status: "amarelo" },
    ];
    const acompanhamento = filterAcompanhamento(apenasDiagnostico);
    expect(acompanhamento).toHaveLength(0);
    expect(acompanhamento.filter((i) => i.status === "vermelho")).toHaveLength(0);
  });
});
