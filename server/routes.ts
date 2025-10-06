import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertEmpresaSchema, 
  insertFatorPestelSchema, 
  insertAnaliseSwotSchema,
  insertObjetivoSchema,
  insertResultadoChaveSchema,
  insertIndicadorSchema 
} from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/empresa", async (req, res) => {
    try {
      const empresa = await storage.getEmpresa();
      res.json(empresa || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/empresa", async (req, res) => {
    try {
      const data = insertEmpresaSchema.parse(req.body);
      const empresa = await storage.createEmpresa(data);
      res.json(empresa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/empresa/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertEmpresaSchema.partial().parse(req.body);
      const empresa = await storage.updateEmpresa(id, data);
      res.json(empresa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/fatores-pestel/:empresaId", async (req, res) => {
    try {
      const { empresaId } = req.params;
      const fatores = await storage.getFatoresPestel(empresaId);
      res.json(fatores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/fatores-pestel", async (req, res) => {
    try {
      const data = insertFatorPestelSchema.parse(req.body);
      const fator = await storage.createFatorPestel(data);
      res.json(fator);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/fatores-pestel/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertFatorPestelSchema.partial().parse(req.body);
      const fator = await storage.updateFatorPestel(id, data);
      res.json(fator);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/fatores-pestel/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFatorPestel(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analise-swot/:empresaId", async (req, res) => {
    try {
      const { empresaId } = req.params;
      const analises = await storage.getAnaliseSwot(empresaId);
      res.json(analises);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/analise-swot", async (req, res) => {
    try {
      const data = insertAnaliseSwotSchema.parse(req.body);
      const analise = await storage.createAnaliseSwot(data);
      res.json(analise);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/analise-swot/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertAnaliseSwotSchema.partial().parse(req.body);
      const analise = await storage.updateAnaliseSwot(id, data);
      res.json(analise);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/analise-swot/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAnaliseSwot(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/objetivos/:empresaId", async (req, res) => {
    try {
      const { empresaId } = req.params;
      const objetivos = await storage.getObjetivos(empresaId);
      res.json(objetivos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/objetivos", async (req, res) => {
    try {
      const data = insertObjetivoSchema.parse(req.body);
      const objetivo = await storage.createObjetivo(data);
      res.json(objetivo);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/objetivos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteObjetivo(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/resultados-chave/:objetivoId", async (req, res) => {
    try {
      const { objetivoId } = req.params;
      const resultados = await storage.getResultadosChave(objetivoId);
      res.json(resultados);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/resultados-chave", async (req, res) => {
    try {
      const data = insertResultadoChaveSchema.parse(req.body);
      const resultado = await storage.createResultadoChave(data);
      res.json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/resultados-chave/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertResultadoChaveSchema.partial().parse(req.body);
      const resultado = await storage.updateResultadoChave(id, data);
      res.json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/resultados-chave/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteResultadoChave(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/indicadores/:empresaId", async (req, res) => {
    try {
      const { empresaId } = req.params;
      const indicadores = await storage.getIndicadores(empresaId);
      res.json(indicadores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/indicadores", async (req, res) => {
    try {
      const data = insertIndicadorSchema.parse(req.body);
      const indicador = await storage.createIndicador(data);
      res.json(indicador);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/indicadores/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertIndicadorSchema.partial().parse(req.body);
      const indicador = await storage.updateIndicador(id, data);
      res.json(indicador);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/indicadores/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteIndicador(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/sugerir-pestel", async (req, res) => {
    try {
      const { nomeEmpresa, setor, descricao } = req.body;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em análise de cenário externo. Sua função é ajudar empresários a identificar fatores externos relevantes que impactam seus negócios. Use sempre linguagem simples e direta, sem jargões técnicos.`
          },
          {
            role: "user",
            content: `Empresa: ${nomeEmpresa}\nSetor: ${setor}\nDescrição: ${descricao}\n\nSugira 5-6 fatores externos importantes que podem afetar esta empresa, categorizados como: político, econômico, social, tecnológico, ambiental ou legal. Para cada fator, indique o tipo, descrição clara, impacto (alto/médio/baixo) e evidência do porquê é importante. Responda em JSON com formato: [{tipo, descricao, impacto, evidencia}]`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/sugerir-swot", async (req, res) => {
    try {
      const { nomeEmpresa, setor, descricao, tipo } = req.body;
      
      const tipoLabel = tipo === "forca" ? "forças" : tipo === "fraqueza" ? "fraquezas" : tipo === "oportunidade" ? "oportunidades" : "ameaças";
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em análise de negócios. Use sempre linguagem simples e direta, sem jargões técnicos.`
          },
          {
            role: "user",
            content: `Empresa: ${nomeEmpresa}\nSetor: ${setor}\nDescrição: ${descricao}\n\nSugira 4-5 ${tipoLabel} relevantes para esta empresa. Para cada item, forneça uma descrição clara e o nível de impacto (alto/médio/baixo). Responda em JSON com formato: [{descricao, impacto}]`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/sugerir-resultados", async (req, res) => {
    try {
      const { objetivo, nomeEmpresa, setor } = req.body;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em definição de objetivos e resultados mensuráveis. Use sempre linguagem simples e direta, sem jargões técnicos.`
          },
          {
            role: "user",
            content: `Empresa: ${nomeEmpresa} (${setor})\nObjetivo: ${objetivo}\n\nSugira 3-4 resultados mensuráveis que indicariam o sucesso deste objetivo. Para cada resultado, forneça: nome da métrica, valor inicial estimado, valor alvo ambicioso porém realista, e prazo. Responda em JSON com formato: [{metrica, valorInicial, valorAlvo, prazo}]`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/explicar", async (req, res) => {
    try {
      const { conceito, contexto } = req.body;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um mentor de negócios que explica conceitos estratégicos de forma simples e acessível, como se estivesse conversando com alguém que não tem experiência em planejamento estratégico. Use exemplos práticos e linguagem do dia a dia.`
          },
          {
            role: "user",
            content: `Explique em até 3 parágrafos curtos: ${conceito}${contexto ? `\n\nContexto: ${contexto}` : ""}`
          }
        ],
        temperature: 0.7,
      });

      const explicacao = completion.choices[0].message.content;
      res.json({ explicacao });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
