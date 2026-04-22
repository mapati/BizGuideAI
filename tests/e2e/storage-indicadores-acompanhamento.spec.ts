// Task #249 — Backend: trava contratual de
// storage.getIndicadoresAcompanhamento. Garante que a regra de exclusão
// (perspectiva === "diagnostico") é aplicada na camada de storage,
// independentemente das rotas que a consomem.
import { test, expect } from "@playwright/test";
import { DbStorage } from "../../server/storage";
import { db } from "../../server/db";
import { empresas, usuarios, indicadores } from "../../shared/schema";
import { eq } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run this test");
}

const random = () => Math.random().toString(36).slice(2, 10);

test.describe("storage.getIndicadoresAcompanhamento", () => {
  const storage = new DbStorage();
  let empresaId = "";
  let usuarioEmail = "";

  test.beforeAll(async () => {
    const empresa = await storage.createEmpresa({
      nome: `Storage Test ${random()}`,
      setor: "Tecnologia",
      tamanho: "pequena",
    });
    empresaId = empresa.id;

    usuarioEmail = `storage-test-${random()}@example.com`;
    await storage.createUsuario({
      empresaId,
      nome: "Storage Test",
      email: usuarioEmail,
      senha: "x",
      isAdmin: false,
    });
  });

  test.afterAll(async () => {
    await db.delete(empresas).where(eq(empresas.id, empresaId));
    await db.delete(usuarios).where(eq(usuarios.email, usuarioEmail));
  });

  test("exclui apenas perspectiva 'diagnostico' e mantém o resto", async () => {
    const ind = async (perspectiva: string, nome: string, status = "verde") =>
      storage.createIndicador({
        empresaId,
        perspectiva,
        nome,
        meta: "100",
        atual: "50",
        status,
        owner: "Time",
      });

    const diag1 = await ind("diagnostico", "Diag A", "vermelho");
    const diag2 = await ind("diagnostico", "Diag B", "amarelo");
    const fin = await ind("Financeira", "Receita");
    const cli = await ind("Clientes", "NPS", "amarelo");
    const proc = await ind("Processos Internos", "SLA", "vermelho");
    const legacy = await ind("", "Legado sem perspectiva");

    try {
      // Lista bruta — todos os 6 cabem.
      const todos = await storage.getIndicadores(empresaId);
      expect(todos).toHaveLength(6);

      // Acompanhamento — só os 4 não-diagnóstico, na ordem de criação.
      const acomp = await storage.getIndicadoresAcompanhamento(empresaId);
      const ids = acomp.map((i) => i.id);
      expect(ids).toEqual([fin.id, cli.id, proc.id, legacy.id]);
      expect(ids).not.toContain(diag1.id);
      expect(ids).not.toContain(diag2.id);
      expect(acomp.every((i) => i.perspectiva !== "diagnostico")).toBe(true);

      // Cenário "só diagnóstico" — outra empresa nova.
      const empresaSoDiag = await storage.createEmpresa({
        nome: `So Diag ${random()}`,
        setor: "Tecnologia",
        tamanho: "pequena",
      });
      try {
        await storage.createIndicador({
          empresaId: empresaSoDiag.id,
          perspectiva: "diagnostico",
          nome: "Diag X",
          meta: "100",
          atual: "10",
          status: "vermelho",
          owner: "Time",
        });
        const acompSoDiag = await storage.getIndicadoresAcompanhamento(
          empresaSoDiag.id,
        );
        expect(acompSoDiag).toEqual([]);
      } finally {
        await db.delete(empresas).where(eq(empresas.id, empresaSoDiag.id));
      }
    } finally {
      await db.delete(indicadores).where(eq(indicadores.empresaId, empresaId));
    }
  });
});
