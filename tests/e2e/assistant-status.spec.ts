// Task #249 — Testes do useAssistantStatus via sua derivação pura
// (deriveAssistantStatus). Garante que o sinal "X indicadores no
// vermelho" do Assistente nunca é gerado a partir de indicadores de
// diagnóstico inicial.
import { test, expect } from "@playwright/test";
import { deriveAssistantStatus } from "../../client/src/hooks/useAssistantStatus";

const futuro = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
};

test.describe("deriveAssistantStatus (hook useAssistantStatus)", () => {
  test("empresa só com diagnósticos vermelhos => sem alerta de indicador, sem 'vermelho' no preview", () => {
    const status = deriveAssistantStatus(
      [
        { perspectiva: "diagnostico", status: "vermelho" },
        { perspectiva: "diagnostico", status: "vermelho" },
        { perspectiva: "diagnostico", status: "amarelo" },
      ],
      [],
      "/indicadores",
    );

    expect(status.alertas.find((a) => a.tipo === "indicador")).toBeUndefined();
    expect(status.alertas).toHaveLength(0);
    expect(status.nivel).toBe("neutro");
    expect(status.preview).toBe("Assistente Estratégico");
    expect(status.preview.toLowerCase()).not.toContain("vermelho");
  });

  test("indicador BSC vermelho => gera alerta 'X indicadores no vermelho'", () => {
    const status = deriveAssistantStatus(
      [
        { perspectiva: "Financeira", status: "vermelho" },
        { perspectiva: "Clientes", status: "verde" },
      ],
      [],
      "/indicadores",
    );

    const alertaInd = status.alertas.find((a) => a.tipo === "indicador");
    expect(alertaInd).toBeDefined();
    expect(alertaInd!.mensagem).toBe("1 indicador no vermelho");
    expect(status.preview).toContain("vermelho");
  });

  test("mix diagnóstico + BSC só conta os BSC vermelhos", () => {
    const status = deriveAssistantStatus(
      [
        { perspectiva: "diagnostico", status: "vermelho" },
        { perspectiva: "diagnostico", status: "vermelho" },
        { perspectiva: "Financeira", status: "vermelho" },
        { perspectiva: "Processos Internos", status: "vermelho" },
      ],
      [],
      "/indicadores",
    );

    const alertaInd = status.alertas.find((a) => a.tipo === "indicador");
    expect(alertaInd).toBeDefined();
    expect(alertaInd!.mensagem).toBe("2 indicadores no vermelho");
  });

  test("fora de páginas de análise, hook não emite alertas mesmo com BSC vermelho", () => {
    const status = deriveAssistantStatus(
      [{ perspectiva: "Financeira", status: "vermelho" }],
      [{ status: "em_andamento", prazo: "2020-01-01" }],
      "/dashboard",
    );

    expect(status.alertas).toEqual([]);
    expect(status.nivel).toBe("neutro");
    expect(status.pagina).toBeNull();
  });

  test("iniciativas vencidas geram alerta independente dos indicadores", () => {
    const status = deriveAssistantStatus(
      [{ perspectiva: "diagnostico", status: "vermelho" }],
      [
        { status: "em_andamento", prazo: "2020-01-01" },
        { status: "concluida", prazo: "2020-01-01" },
        { status: "em_andamento", prazo: futuro() },
      ],
      "/iniciativas",
    );

    expect(status.alertas.find((a) => a.tipo === "indicador")).toBeUndefined();
    const ini = status.alertas.find((a) => a.tipo === "iniciativa");
    expect(ini).toBeDefined();
    expect(ini!.mensagem).toBe("1 iniciativa com prazo vencido");
  });
});
