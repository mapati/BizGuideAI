import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertEmpresaSchema, 
  insertFatorPestelSchema, 
  insertAnaliseSwotSchema,
  insertObjetivoSchema,
  insertResultadoChaveSchema,
  insertIndicadorSchema,
  insertCincoForcasSchema,
  insertModeloNegocioSchema,
  insertEstrategiaSchema,
  insertOportunidadeCrescimentoSchema,
  insertIniciativaSchema,
  insertRitualSchema
} from "@shared/schema";
import OpenAI from "openai";
import bcrypt from "bcryptjs";
import { z } from "zod";
import "./session.d";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || !req.session?.empresaId) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  next();
}

function stripTenantFields<T extends Record<string, unknown>>(data: T): Omit<T, "empresaId" | "objetivoId"> {
  const result = { ...data };
  delete (result as Record<string, unknown>)["empresaId"];
  delete (result as Record<string, unknown>)["objetivoId"];
  return result as Omit<T, "empresaId" | "objetivoId">;
}

export async function registerRoutes(app: Express): Promise<Server> {

  // ==================== AUTH ====================

  const registerSchema = z.object({
    nome: z.string().min(1),
    email: z.string().email(),
    senha: z.string().min(6),
    nomeEmpresa: z.string().min(1),
    setor: z.string().min(1),
    tamanho: z.string().min(1),
    descricao: z.string().optional(),
    cnpj: z.string().optional(),
    endereco: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
    cep: z.string().optional(),
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existing = await storage.getUsuarioByEmail(data.email);
      if (existing) {
        return res.status(409).json({ error: "E-mail já cadastrado" });
      }

      const empresa = await storage.createEmpresa({
        nome: data.nomeEmpresa,
        setor: data.setor,
        tamanho: data.tamanho,
        descricao: data.descricao,
        cnpj: data.cnpj,
        endereco: data.endereco,
        cidade: data.cidade,
        estado: data.estado,
        cep: data.cep,
      });

      const senhaHash = await bcrypt.hash(data.senha, 10);
      const usuario = await storage.createUsuario({
        empresaId: empresa.id,
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
      });

      req.session.userId = usuario.id;
      req.session.empresaId = empresa.id;

      res.json({
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, empresaId: usuario.empresaId },
        empresa,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, senha } = req.body;
      if (!email || !senha) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
      }

      const usuario = await storage.getUsuarioByEmail(email);
      if (!usuario) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
      if (!senhaCorreta) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      req.session.userId = usuario.id;
      req.session.empresaId = usuario.empresaId;

      const empresa = await storage.getEmpresa(usuario.empresaId);

      res.json({
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, empresaId: usuario.empresaId },
        empresa,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Erro ao encerrar sessão" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session?.userId || !req.session?.empresaId) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const usuario = await storage.getUsuarioById(req.session.userId);
      if (!usuario) {
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      const empresa = await storage.getEmpresa(req.session.empresaId);

      res.json({
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, empresaId: usuario.empresaId },
        empresa,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // All routes below require authentication
  app.use("/api/empresa", requireAuth);
  app.use("/api/fatores-pestel", requireAuth);
  app.use("/api/analise-swot", requireAuth);
  app.use("/api/objetivos", requireAuth);
  app.use("/api/resultados-chave", requireAuth);
  app.use("/api/indicadores", requireAuth);
  app.use("/api/cinco-forcas", requireAuth);
  app.use("/api/modelo-negocio", requireAuth);
  app.use("/api/estrategias", requireAuth);
  app.use("/api/oportunidades-crescimento", requireAuth);
  app.use("/api/iniciativas", requireAuth);
  app.use("/api/rituais", requireAuth);
  app.use("/api/eventos", requireAuth);
  app.use("/api/alertas", requireAuth);
  app.use("/api/ai", requireAuth);

  // ==================== EMPRESA ====================

  app.get("/api/empresa", async (req, res) => {
    try {
      const empresa = await storage.getEmpresa(req.session.empresaId!);
      res.json(empresa || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/empresa", async (req, res) => {
    try {
      const data = stripTenantFields(insertEmpresaSchema.partial().parse(req.body));
      const empresa = await storage.updateEmpresa(req.session.empresaId!, data);
      res.json(empresa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==================== FATORES PESTEL ====================

  app.get("/api/fatores-pestel", async (req, res) => {
    try {
      const fatores = await storage.getFatoresPestel(req.session.empresaId!);
      res.json(fatores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/fatores-pestel", async (req, res) => {
    try {
      const data = insertFatorPestelSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const fator = await storage.createFatorPestel(data);
      res.json(fator);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/fatores-pestel/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertFatorPestelSchema.partial().parse(req.body));
      const fator = await storage.updateFatorPestel(id, req.session.empresaId!, data);
      res.json(fator);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/fatores-pestel/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFatorPestel(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== ANALISE SWOT ====================

  app.get("/api/analise-swot", async (req, res) => {
    try {
      const analises = await storage.getAnaliseSwot(req.session.empresaId!);
      res.json(analises);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/analise-swot", async (req, res) => {
    try {
      const data = insertAnaliseSwotSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const analise = await storage.createAnaliseSwot(data);
      res.json(analise);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/analise-swot/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertAnaliseSwotSchema.partial().parse(req.body));
      const analise = await storage.updateAnaliseSwot(id, req.session.empresaId!, data);
      res.json(analise);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/analise-swot/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAnaliseSwot(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== OBJETIVOS ====================

  app.get("/api/objetivos", async (req, res) => {
    try {
      const objetivos = await storage.getObjetivos(req.session.empresaId!);
      res.json(objetivos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/objetivos", async (req, res) => {
    try {
      const data = insertObjetivoSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const objetivo = await storage.createObjetivo(data);
      res.json(objetivo);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/objetivos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertObjetivoSchema.partial().parse(req.body));
      const objetivo = await storage.updateObjetivo(id, req.session.empresaId!, data);
      res.json(objetivo);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/objetivos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteObjetivo(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== RESULTADOS CHAVE ====================

  app.get("/api/resultados-chave/:objetivoId", async (req, res) => {
    try {
      const { objetivoId } = req.params;
      const resultados = await storage.getResultadosChave(objetivoId, req.session.empresaId!);
      res.json(resultados);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/resultados-chave", async (req, res) => {
    try {
      const data = insertResultadoChaveSchema.parse(req.body);
      const resultado = await storage.createResultadoChave(data, req.session.empresaId!);
      res.json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/resultados-chave/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertResultadoChaveSchema.partial().parse(req.body));
      const resultado = await storage.updateResultadoChave(id, req.session.empresaId!, data);
      res.json(resultado);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/resultados-chave/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteResultadoChave(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== INDICADORES ====================

  app.get("/api/indicadores", async (req, res) => {
    try {
      const indicadores = await storage.getIndicadores(req.session.empresaId!);
      res.json(indicadores);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/indicadores", async (req, res) => {
    try {
      const data = insertIndicadorSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const indicador = await storage.createIndicador(data);
      res.json(indicador);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/indicadores/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertIndicadorSchema.partial().parse(req.body));
      const indicador = await storage.updateIndicador(id, req.session.empresaId!, data);
      res.json(indicador);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/indicadores/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteIndicador(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CINCO FORCAS ====================

  app.get("/api/cinco-forcas", async (req, res) => {
    try {
      const forcas = await storage.getCincoForcas(req.session.empresaId!);
      res.json(forcas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cinco-forcas", async (req, res) => {
    try {
      const data = insertCincoForcasSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const forca = await storage.createCincoForcas(data);
      res.json(forca);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/cinco-forcas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertCincoForcasSchema.partial().parse(req.body));
      const forca = await storage.updateCincoForcas(id, req.session.empresaId!, data);
      res.json(forca);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/cinco-forcas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCincoForcas(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== MODELO NEGOCIO ====================

  app.get("/api/modelo-negocio", async (req, res) => {
    try {
      const blocos = await storage.getModeloNegocio(req.session.empresaId!);
      res.json(blocos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/modelo-negocio", async (req, res) => {
    try {
      const data = insertModeloNegocioSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const bloco = await storage.createModeloNegocio(data);
      res.json(bloco);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/modelo-negocio/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertModeloNegocioSchema.partial().parse(req.body));
      const bloco = await storage.updateModeloNegocio(id, req.session.empresaId!, data);
      res.json(bloco);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/modelo-negocio/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteModeloNegocio(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== AI ROUTES ====================

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
            content: `Empresa: ${nomeEmpresa}\nSetor: ${setor}\nDescrição: ${descricao}\n\nCrie EXATAMENTE 6 fatores externos (um para cada categoria PESTEL):\n1. Um fator POLÍTICO (tipo: "politico")\n2. Um fator ECONÔMICO (tipo: "economico")\n3. Um fator SOCIAL (tipo: "social")\n4. Um fator TECNOLÓGICO (tipo: "tecnologico")\n5. Um fator AMBIENTAL (tipo: "ambiental")\n6. Um fator LEGAL (tipo: "legal")\n\nPara cada fator, forneça:\n- tipo: exatamente como indicado acima (politico, economico, social, tecnologico, ambiental, legal)\n- descricao: uma descrição clara e objetiva do fator\n- impacto: "alto", "médio" ou "baixo"\n- evidencia: explicação de por que este fator é importante para esta empresa\n\nResponda OBRIGATORIAMENTE em JSON com este formato exato:\n{\n  "fatores": [\n    {"tipo": "politico", "descricao": "...", "impacto": "alto", "evidencia": "..."},\n    {"tipo": "economico", "descricao": "...", "impacto": "médio", "evidencia": "..."},\n    {"tipo": "social", "descricao": "...", "impacto": "...", "evidencia": "..."},\n    {"tipo": "tecnologico", "descricao": "...", "impacto": "...", "evidencia": "..."},\n    {"tipo": "ambiental", "descricao": "...", "impacto": "...", "evidencia": "..."},\n    {"tipo": "legal", "descricao": "...", "impacto": "...", "evidencia": "..."}\n  ]\n}`
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

  app.post("/api/ai/sugerir-swot-individual", async (req, res) => {
    try {
      const { tipo } = req.body;
      const empresaId = req.session.empresaId!;
      
      if (!tipo) {
        return res.status(400).json({ error: "tipo é obrigatório" });
      }

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const fatoresPestelList = await storage.getFatoresPestel(empresaId);
      const cincoForcasList = await storage.getCincoForcas(empresaId);
      const modeloNegocioList = await storage.getModeloNegocio(empresaId);
      const swotExistente = await storage.getAnaliseSwot(empresaId);

      const fatoresPestelResumo = fatoresPestelList.map(f => `${f.tipo}: ${f.descricao}`).join("\n");
      const cincoForcasResumo = cincoForcasList.map(f => `${f.forca}: ${f.descricao} (intensidade ${f.intensidade})`).join("\n");
      const modeloNegocioResumo = modeloNegocioList.map(m => `${m.bloco}: ${m.descricao}`).join("\n");
      
      const swotPorTipo = swotExistente.filter(s => s.tipo === tipo).map(s => s.descricao);

      const tipoLabel = tipo === "forca" ? "FORÇA" : tipo === "fraqueza" ? "FRAQUEZA" : tipo === "oportunidade" ? "OPORTUNIDADE" : "AMEAÇA";
      const contextoBase = tipo === "forca" || tipo === "fraqueza" ? "MODELO DE NEGÓCIO" : "CENÁRIO EXTERNO (PESTEL) e MERCADO E CONCORRÊNCIA";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico sênior especializado em análise SWOT. Sua missão é identificar com precisão forças, fraquezas, oportunidades e ameaças relevantes. Use sempre linguagem simples e direta, sem jargões técnicos. IMPORTANTE: Nunca repita itens que já foram identificados anteriormente.`
          },
          {
            role: "user",
            content: `Empresa: ${empresa.nome}
Setor: ${empresa.setor}
Descrição: ${empresa.descricao || "Não informado"}

## CONTEXTO COMPLETO DA EMPRESA:

### Modelo de Negócio (Business Model Canvas):
${modeloNegocioResumo || "Ainda não definido"}

### Cenário Externo (Análise PESTEL):
${fatoresPestelResumo || "Ainda não definido"}

### Mercado e Concorrência (Cinco Forças):
${cincoForcasResumo || "Ainda não definido"}

## ${tipoLabel}S JÁ EXISTENTES (EVITE REPETIR):
${swotPorTipo.length > 0 ? swotPorTipo.map((item, i) => `${i + 1}. ${item}`).join("\n") : `Nenhuma ${tipoLabel.toLowerCase()} identificada ainda`}

## TAREFA:
Com base no ${contextoBase}, gere EXATAMENTE 1 (uma) nova ${tipoLabel} que NÃO esteja na lista acima.

Para o item, forneça:
- descricao: uma descrição clara, objetiva e específica (diferente dos itens existentes)
- impacto: "alto", "médio" ou "baixo"

Responda OBRIGATORIAMENTE em JSON com este formato exato:
{
  "descricao": "...",
  "impacto": "alto"
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestao = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestao);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/sugerir-swot-completo", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const fatoresPestelList = await storage.getFatoresPestel(empresaId);
      const cincoForcasList = await storage.getCincoForcas(empresaId);
      const modeloNegocioList = await storage.getModeloNegocio(empresaId);
      const swotExistente = await storage.getAnaliseSwot(empresaId);

      const fatoresPestelResumo = fatoresPestelList.map(f => `${f.tipo}: ${f.descricao}`).join("\n");
      const cincoForcasResumo = cincoForcasList.map(f => `${f.forca}: ${f.descricao} (intensidade ${f.intensidade})`).join("\n");
      const modeloNegocioResumo = modeloNegocioList.map(m => `${m.bloco}: ${m.descricao}`).join("\n");
      
      const swotExistenteResumo = {
        forcas: swotExistente.filter(s => s.tipo === "forca").map(s => s.descricao),
        fraquezas: swotExistente.filter(s => s.tipo === "fraqueza").map(s => s.descricao),
        oportunidades: swotExistente.filter(s => s.tipo === "oportunidade").map(s => s.descricao),
        ameacas: swotExistente.filter(s => s.tipo === "ameaca").map(s => s.descricao),
      };

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico sênior especializado em análise SWOT. Sua missão é identificar com precisão forças, fraquezas, oportunidades e ameaças relevantes. Use sempre linguagem simples e direta, sem jargões técnicos. IMPORTANTE: Nunca repita itens que já foram identificados anteriormente.`
          },
          {
            role: "user",
            content: `Empresa: ${empresa.nome}
Setor: ${empresa.setor}
Descrição: ${empresa.descricao || "Não informado"}

## CONTEXTO COMPLETO DA EMPRESA:

### Modelo de Negócio (Business Model Canvas):
${modeloNegocioResumo || "Ainda não definido"}

### Cenário Externo (Análise PESTEL):
${fatoresPestelResumo || "Ainda não definido"}

### Mercado e Concorrência (Cinco Forças):
${cincoForcasResumo || "Ainda não definido"}

## ANÁLISE SWOT JÁ EXISTENTE (EVITE REPETIR ESTES ITENS):
Forças existentes:
${swotExistenteResumo.forcas.length > 0 ? swotExistenteResumo.forcas.map((f, i) => `${i + 1}. ${f}`).join("\n") : "Nenhuma força identificada ainda"}

Fraquezas existentes:
${swotExistenteResumo.fraquezas.length > 0 ? swotExistenteResumo.fraquezas.map((f, i) => `${i + 1}. ${f}`).join("\n") : "Nenhuma fraqueza identificada ainda"}

Oportunidades existentes:
${swotExistenteResumo.oportunidades.length > 0 ? swotExistenteResumo.oportunidades.map((o, i) => `${i + 1}. ${o}`).join("\n") : "Nenhuma oportunidade identificada ainda"}

Ameaças existentes:
${swotExistenteResumo.ameacas.length > 0 ? swotExistenteResumo.ameacas.map((a, i) => `${i + 1}. ${a}`).join("\n") : "Nenhuma ameaça identificada ainda"}

## TAREFA:
Com base em TODO o contexto acima, gere EXATAMENTE 4 novos itens para a análise SWOT (um de cada tipo):

1. **UMA FORÇA** (tipo: "forca"): Com base no MODELO DE NEGÓCIO, identifique uma força interna da empresa que NÃO esteja na lista de forças existentes.

2. **UMA FRAQUEZA** (tipo: "fraqueza"): Com base no MODELO DE NEGÓCIO, identifique uma fraqueza interna da empresa que NÃO esteja na lista de fraquezas existentes.

3. **UMA OPORTUNIDADE** (tipo: "oportunidade"): Com base no CENÁRIO EXTERNO (PESTEL) e MERCADO E CONCORRÊNCIA, identifique uma oportunidade externa que NÃO esteja na lista de oportunidades existentes.

4. **UMA AMEAÇA** (tipo: "ameaca"): Com base no CENÁRIO EXTERNO (PESTEL) e MERCADO E CONCORRÊNCIA, identifique uma ameaça externa que NÃO esteja na lista de ameaças existentes.

Para cada item, forneça:
- tipo: exatamente "forca", "fraqueza", "oportunidade" ou "ameaca"
- descricao: uma descrição clara, objetiva e específica (diferente dos itens existentes)
- impacto: "alto", "médio" ou "baixo"

Responda OBRIGATORIAMENTE em JSON com este formato exato:
{
  "itens": [
    {"tipo": "forca", "descricao": "...", "impacto": "alto"},
    {"tipo": "fraqueza", "descricao": "...", "impacto": "médio"},
    {"tipo": "oportunidade", "descricao": "...", "impacto": "alto"},
    {"tipo": "ameaca", "descricao": "...", "impacto": "médio"}
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/sugerir-cinco-forcas", async (req, res) => {
    try {
      const { nomeEmpresa, setor, descricao } = req.body;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em análise de mercado e concorrência. Sua função é ajudar empresários a entender as forças competitivas do seu mercado. Use sempre linguagem simples e direta, sem jargões técnicos.`
          },
          {
            role: "user",
            content: `Empresa: ${nomeEmpresa}\nSetor: ${setor}\nDescrição: ${descricao}\n\nAnalise o mercado desta empresa usando as Cinco Forças Competitivas e crie EXATAMENTE 5 análises (uma para cada força):\n1. Rivalidade entre Concorrentes (forca: "rivalidade_concorrentes")\n2. Poder de Negociação dos Fornecedores (forca: "poder_fornecedores")\n3. Poder de Negociação dos Clientes (forca: "poder_clientes")\n4. Ameaça de Novos Entrantes (forca: "ameaca_novos_entrantes")\n5. Ameaça de Produtos Substitutos (forca: "ameaca_substitutos")\n\nPara cada força, forneça:\n- forca: exatamente como indicado acima\n- descricao: uma descrição clara da situação desta força no mercado da empresa\n- intensidade: "alta", "média" ou "baixa"\n- impacto: explicação de como esta força afeta o negócio\n\nResponda OBRIGATORIAMENTE em JSON com este formato exato:\n{\n  "forcas": [\n    {"forca": "rivalidade_concorrentes", "descricao": "...", "intensidade": "alta", "impacto": "..."},\n    {"forca": "poder_fornecedores", "descricao": "...", "intensidade": "média", "impacto": "..."},\n    {"forca": "poder_clientes", "descricao": "...", "intensidade": "...", "impacto": "..."},\n    {"forca": "ameaca_novos_entrantes", "descricao": "...", "intensidade": "...", "impacto": "..."},\n    {"forca": "ameaca_substitutos", "descricao": "...", "intensidade": "...", "impacto": "..."}\n  ]\n}`
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

  app.post("/api/ai/sugerir-modelo-negocio", async (req, res) => {
    try {
      const { nomeEmpresa, setor, descricao } = req.body;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em modelos de negócio. Sua função é ajudar empresários a estruturar seu modelo de negócio usando o Business Model Canvas. Use sempre linguagem simples e direta, sem jargões técnicos.`
          },
          {
            role: "user",
            content: `Empresa: ${nomeEmpresa}\nSetor: ${setor}\nDescrição: ${descricao}\n\nCrie um modelo de negócio completo para esta empresa usando o Business Model Canvas. Forneça EXATAMENTE 9 blocos:\n1. Segmentos de Clientes (bloco: "segmentos_clientes")\n2. Proposta de Valor (bloco: "proposta_valor")\n3. Canais (bloco: "canais")\n4. Relacionamento com Clientes (bloco: "relacionamento_clientes")\n5. Fontes de Receita (bloco: "fontes_receita")\n6. Recursos Principais (bloco: "recursos_principais")\n7. Atividades Principais (bloco: "atividades_principais")\n8. Parcerias Principais (bloco: "parcerias_principais")\n9. Estrutura de Custos (bloco: "estrutura_custos")\n\nPara cada bloco, forneça:\n- bloco: exatamente como indicado acima\n- descricao: uma descrição clara e prática do bloco para esta empresa específica\n\nResponda OBRIGATORIAMENTE em JSON com este formato exato:\n{\n  "blocos": [\n    {"bloco": "segmentos_clientes", "descricao": "..."},\n    {"bloco": "proposta_valor", "descricao": "..."},\n    {"bloco": "canais", "descricao": "..."},\n    {"bloco": "relacionamento_clientes", "descricao": "..."},\n    {"bloco": "fontes_receita", "descricao": "..."},\n    {"bloco": "recursos_principais", "descricao": "..."},\n    {"bloco": "atividades_principais", "descricao": "..."},\n    {"bloco": "parcerias_principais", "descricao": "..."},\n    {"bloco": "estrutura_custos", "descricao": "..."}\n  ]\n}`
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

  // ==================== ESTRATEGIAS ====================

  app.get("/api/estrategias", async (req, res) => {
    try {
      const estrategias = await storage.getEstrategias(req.session.empresaId!);
      res.json(estrategias);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/estrategias", async (req, res) => {
    try {
      const data = insertEstrategiaSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const estrategia = await storage.createEstrategia(data);
      res.json(estrategia);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/estrategias/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertEstrategiaSchema.partial().parse(req.body));
      const estrategia = await storage.updateEstrategia(id, req.session.empresaId!, data);
      res.json(estrategia);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/estrategias/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEstrategia(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-estrategias", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const swotExistente = await storage.getAnaliseSwot(empresaId);
      const estrategiasExistentes = await storage.getEstrategias(empresaId);

      const forcas = swotExistente.filter(s => s.tipo === "forca").map(s => s.descricao);
      const fraquezas = swotExistente.filter(s => s.tipo === "fraqueza").map(s => s.descricao);
      const oportunidades = swotExistente.filter(s => s.tipo === "oportunidade").map(s => s.descricao);
      const ameacas = swotExistente.filter(s => s.tipo === "ameaca").map(s => s.descricao);

      const estrategiasResume = estrategiasExistentes.map(e => 
        `- ${e.tipo}: ${e.titulo}\n  Descrição: ${e.descricao}`
      ).join("\n\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico sênior especializado em matriz TOWS (SWOT Cruzada). Sua missão é criar estratégias práticas e acionáveis combinando elementos internos e externos. Use sempre linguagem simples e direta, sem jargões técnicos.

REGRA CRÍTICA DE DUPLICAÇÃO:
- Você DEVE analisar cuidadosamente todas as estratégias já existentes listadas na seção "ESTRATÉGIAS JÁ EXISTENTES"
- NUNCA crie estratégias que sejam semelhantes, parecidas ou que abordem os mesmos temas das estratégias existentes
- Cada nova estratégia PRECISA ser única, inovadora e diferente de todas as anteriores
- Se você sugerir algo muito parecido com o que já existe, está violando esta regra crítica`
          },
          {
            role: "user",
            content: `Empresa: ${empresa.nome}
Setor: ${empresa.setor}

## ANÁLISE SWOT EXISTENTE:

### FORÇAS (Internas - Positivo):
${forcas.length > 0 ? forcas.map((f, i) => `${i + 1}. ${f}`).join("\n") : "Nenhuma força identificada"}

### FRAQUEZAS (Internas - Negativo):
${fraquezas.length > 0 ? fraquezas.map((f, i) => `${i + 1}. ${f}`).join("\n") : "Nenhuma fraqueza identificada"}

### OPORTUNIDADES (Externas - Positivo):
${oportunidades.length > 0 ? oportunidades.map((o, i) => `${i + 1}. ${o}`).join("\n") : "Nenhuma oportunidade identificada"}

### AMEAÇAS (Externas - Negativo):
${ameacas.length > 0 ? ameacas.map((a, i) => `${i + 1}. ${a}`).join("\n") : "Nenhuma ameaça identificada"}

## ESTRATÉGIAS JÁ EXISTENTES (NÃO REPITA NENHUMA DELAS):
${estrategiasExistentes.length > 0 ? estrategiasResume : "Nenhuma estratégia criada ainda - esta é a primeira geração"}

${estrategiasExistentes.length > 0 ? `
⚠️ ATENÇÃO: Já existem ${estrategiasExistentes.length} estratégia(s) cadastrada(s) acima.
Suas novas sugestões DEVEM ser completamente diferentes e abordar aspectos não cobertos pelas estratégias existentes.
Analise cada estratégia existente antes de sugerir algo novo.
` : ''}

## TAREFA:
Com base na matriz TOWS, crie EXATAMENTE 4 novas estratégias ÚNICAS e DIFERENTES, uma de cada tipo:

1. **FO (Ofensiva/Maxi-Maxi)**: Combine uma FORÇA com uma OPORTUNIDADE
2. **FA (Confronto/Maxi-Mini)**: Combine uma FORÇA para neutralizar uma AMEAÇA
3. **DO (Reorientação/Mini-Maxi)**: Supere uma FRAQUEZA aproveitando uma OPORTUNIDADE
4. **DA (Defensiva/Mini-Mini)**: Minimize uma FRAQUEZA e evite uma AMEAÇA

Para cada estratégia, forneça:
- tipo: "FO", "FA", "DO" ou "DA"
- titulo: Um título objetivo (máx 80 caracteres)
- descricao: Descrição detalhada da estratégia (2-3 frases)
- prioridade: "alta", "média" ou "baixa"

Responda OBRIGATORIAMENTE em JSON com este formato exato:
{
  "estrategias": [
    {"tipo": "FO", "titulo": "...", "descricao": "...", "prioridade": "alta"},
    {"tipo": "FA", "titulo": "...", "descricao": "...", "prioridade": "alta"},
    {"tipo": "DO", "titulo": "...", "descricao": "...", "prioridade": "média"},
    {"tipo": "DA", "titulo": "...", "descricao": "...", "prioridade": "baixa"}
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== OPORTUNIDADES CRESCIMENTO ====================

  app.get("/api/oportunidades-crescimento", async (req, res) => {
    try {
      const oportunidades = await storage.getOportunidadesCrescimento(req.session.empresaId!);
      res.json(oportunidades);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/oportunidades-crescimento", async (req, res) => {
    try {
      const data = insertOportunidadeCrescimentoSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const oportunidade = await storage.createOportunidadeCrescimento(data);
      res.json(oportunidade);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/oportunidades-crescimento/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertOportunidadeCrescimentoSchema.partial().parse(req.body));
      const oportunidade = await storage.updateOportunidadeCrescimento(id, req.session.empresaId!, data);
      res.json(oportunidade);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/oportunidades-crescimento/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteOportunidadeCrescimento(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-oportunidades-crescimento", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const oportunidadesExistentes = await storage.getOportunidadesCrescimento(empresaId);
      const swotExistente = await storage.getAnaliseSwot(empresaId);

      const forcas = swotExistente.filter(s => s.tipo === "forca").map(s => s.descricao);
      const oportunidades = swotExistente.filter(s => s.tipo === "oportunidade").map(s => s.descricao);

      const oportunidadesResume = oportunidadesExistentes.map(o => 
        `- ${o.tipo}: ${o.titulo}\n  Descrição: ${o.descricao}`
      ).join("\n\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico sênior especializado em Matriz de Ansoff. Sua missão é identificar oportunidades de crescimento práticas e acionáveis. Use sempre linguagem simples e direta, sem jargões técnicos.

REGRA CRÍTICA DE DUPLICAÇÃO:
- Você DEVE analisar cuidadosamente todas as oportunidades já existentes listadas na seção "OPORTUNIDADES JÁ EXISTENTES"
- NUNCA crie oportunidades que sejam semelhantes, parecidas ou que abordem os mesmos temas das oportunidades existentes
- Cada nova oportunidade PRECISA ser única, inovadora e diferente de todas as anteriores
- Se você sugerir algo muito parecido com o que já existe, está violando esta regra crítica`
          },
          {
            role: "user",
            content: `Empresa: ${empresa.nome}
Setor: ${empresa.setor}

## CONTEXTO ESTRATÉGICO (SWOT):

### FORÇAS:
${forcas.length > 0 ? forcas.map((f, i) => `${i + 1}. ${f}`).join("\n") : "Nenhuma força identificada"}

### OPORTUNIDADES DE MERCADO:
${oportunidades.length > 0 ? oportunidades.map((o, i) => `${i + 1}. ${o}`).join("\n") : "Nenhuma oportunidade identificada"}

## OPORTUNIDADES JÁ EXISTENTES (NÃO REPITA NENHUMA DELAS):
${oportunidadesExistentes.length > 0 ? oportunidadesResume : "Nenhuma oportunidade criada ainda - esta é a primeira geração"}

${oportunidadesExistentes.length > 0 ? `
⚠️ ATENÇÃO: Já existem ${oportunidadesExistentes.length} oportunidade(s) cadastrada(s) acima.
Suas novas sugestões DEVEM ser completamente diferentes e abordar aspectos não cobertos pelas oportunidades existentes.
Analise cada oportunidade existente antes de sugerir algo novo.
` : ''}

## TAREFA:
Com base na Matriz de Ansoff, crie EXATAMENTE 4 novas oportunidades de crescimento ÚNICAS e DIFERENTES, uma de cada tipo:

1. **penetracao_mercado**: Aumentar participação no mercado atual com produtos/serviços atuais (menor risco)
2. **desenvolvimento_mercado**: Levar produtos/serviços atuais para novos mercados ou segmentos
3. **desenvolvimento_produto**: Criar novos produtos/serviços para os mercados atuais
4. **diversificacao**: Novos produtos/serviços para novos mercados (maior risco)

Para cada oportunidade, forneça:
- tipo: "penetracao_mercado", "desenvolvimento_mercado", "desenvolvimento_produto" ou "diversificacao"
- titulo: Um título objetivo (máx 80 caracteres)
- descricao: Descrição detalhada da oportunidade (2-3 frases)
- potencial: Potencial de crescimento - "alto", "médio" ou "baixo"
- risco: Nível de risco associado - "alto", "médio" ou "baixo"

Responda OBRIGATORIAMENTE em JSON com este formato exato:
{
  "oportunidades": [
    {"tipo": "penetracao_mercado", "titulo": "...", "descricao": "...", "potencial": "alto", "risco": "baixo"},
    {"tipo": "desenvolvimento_mercado", "titulo": "...", "descricao": "...", "potencial": "alto", "risco": "médio"},
    {"tipo": "desenvolvimento_produto", "titulo": "...", "descricao": "...", "potencial": "médio", "risco": "médio"},
    {"tipo": "diversificacao", "titulo": "...", "descricao": "...", "potencial": "alto", "risco": "alto"}
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== INICIATIVAS ====================

  app.get("/api/iniciativas", async (req, res) => {
    try {
      const iniciativas = await storage.getIniciativas(req.session.empresaId!);
      res.json(iniciativas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/iniciativas", async (req, res) => {
    try {
      const data = insertIniciativaSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const iniciativa = await storage.createIniciativa(data);
      res.json(iniciativa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/iniciativas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertIniciativaSchema.partial().parse(req.body));
      const iniciativa = await storage.updateIniciativa(id, req.session.empresaId!, data);
      res.json(iniciativa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/iniciativas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteIniciativa(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-iniciativas", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const iniciativasExistentes = await storage.getIniciativas(empresaId);
      const estrategiasLista = await storage.getEstrategias(empresaId);
      const oportunidades = await storage.getOportunidadesCrescimento(empresaId);

      const iniciativasResume = iniciativasExistentes.map(i => 
        `- ${i.titulo}\n  Descrição: ${i.descricao}\n  Status: ${i.status} | Prioridade: ${i.prioridade}`
      ).join("\n\n");

      const estrategiasResume = estrategiasLista.map(e => `${e.tipo}: ${e.titulo}`).join("\n");
      const oportunidadesResume = oportunidades.map(o => `${o.tipo}: ${o.titulo}`).join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico sênior especializado em gestão de portfólio de projetos. Sua missão é identificar iniciativas prioritárias práticas e acionáveis para executar a estratégia. Use sempre linguagem simples e direta, sem jargões técnicos.

REGRA CRÍTICA DE DUPLICAÇÃO:
- Você DEVE analisar cuidadosamente todas as iniciativas já existentes listadas na seção "INICIATIVAS JÁ EXISTENTES"
- NUNCA crie iniciativas que sejam semelhantes, parecidas ou que abordem os mesmos temas das iniciativas existentes
- Cada nova iniciativa PRECISA ser única, inovadora e diferente de todas as anteriores
- Se você sugerir algo muito parecido com o que já existe, está violando esta regra crítica`
          },
          {
            role: "user",
            content: `Empresa: ${empresa.nome}
Setor: ${empresa.setor}

## CONTEXTO ESTRATÉGICO:

### ESTRATÉGIAS DEFINIDAS:
${estrategiasLista.length > 0 ? estrategiasResume : "Nenhuma estratégia definida"}

### OPORTUNIDADES DE CRESCIMENTO:
${oportunidades.length > 0 ? oportunidadesResume : "Nenhuma oportunidade identificada"}

## INICIATIVAS JÁ EXISTENTES (NÃO REPITA NENHUMA DELAS):
${iniciativasExistentes.length > 0 ? iniciativasResume : "Nenhuma iniciativa criada ainda - esta é a primeira geração"}

${iniciativasExistentes.length > 0 ? `
⚠️ ATENÇÃO: Já existem ${iniciativasExistentes.length} iniciativa(s) cadastrada(s) acima.
Suas novas sugestões DEVEM ser completamente diferentes e abordar aspectos não cobertos pelas iniciativas existentes.
Analise cada iniciativa existente antes de sugerir algo novo.
` : ''}

## TAREFA:
Com base nas estratégias e oportunidades identificadas, crie EXATAMENTE 5 novas iniciativas prioritárias ÚNICAS e DIFERENTES para executar a estratégia.

Para cada iniciativa, forneça:
- titulo: Um título claro e objetivo (máx 80 caracteres)
- descricao: Descrição detalhada da iniciativa e seus objetivos (2-3 frases)
- status: "planejada", "em_andamento", "concluida" ou "pausada" (todas devem começar como "planejada")
- prioridade: "alta", "média" ou "baixa" (distribua entre as 5)
- prazo: Prazo em formato "Q1 2025", "Q2 2025", etc
- responsavel: Área ou cargo responsável (ex: "Gerente Comercial", "Time de Marketing")
- impacto: Impacto esperado - "alto", "médio" ou "baixo"

Responda OBRIGATORIAMENTE em JSON com este formato exato:
{
  "iniciativas": [
    {"titulo": "...", "descricao": "...", "status": "planejada", "prioridade": "alta", "prazo": "Q1 2025", "responsavel": "...", "impacto": "alto"},
    {"titulo": "...", "descricao": "...", "status": "planejada", "prioridade": "alta", "prazo": "Q2 2025", "responsavel": "...", "impacto": "alto"},
    {"titulo": "...", "descricao": "...", "status": "planejada", "prioridade": "média", "prazo": "Q2 2025", "responsavel": "...", "impacto": "médio"},
    {"titulo": "...", "descricao": "...", "status": "planejada", "prioridade": "média", "prazo": "Q3 2025", "responsavel": "...", "impacto": "médio"},
    {"titulo": "...", "descricao": "...", "status": "planejada", "prioridade": "baixa", "prazo": "Q4 2025", "responsavel": "...", "impacto": "baixo"}
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (sugestoes.iniciativas && Array.isArray(sugestoes.iniciativas)) {
        const seenTitles = new Set(
          iniciativasExistentes.map(i => i.titulo.toLowerCase().trim())
        );
        
        sugestoes.iniciativas = sugestoes.iniciativas.filter((iniciativa: any) => {
          const titulo = iniciativa.titulo?.toLowerCase().trim();
          if (!titulo || seenTitles.has(titulo)) {
            return false;
          }
          seenTitles.add(titulo);
          return true;
        });
      }
      
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-objetivos", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const objetivosExistentes = await storage.getObjetivos(empresaId);
      const estrategiasLista = await storage.getEstrategias(empresaId);
      const oportunidades = await storage.getOportunidadesCrescimento(empresaId);
      const iniciativas = await storage.getIniciativas(empresaId);

      const objetivosResume = objetivosExistentes.map(o => 
        `- ${o.titulo}\n  Descrição: ${o.descricao || 'Sem descrição'}\n  Prazo: ${o.prazo}`
      ).join("\n\n");

      const estrategiasResume = estrategiasLista.map(e => `${e.tipo}: ${e.titulo} - ${e.descricao}`).join("\n");
      const oportunidadesResume = oportunidades.map(o => `${o.tipo}: ${o.titulo} - ${o.descricao}`).join("\n");
      const iniciativasResume = iniciativas.map(i => `${i.titulo} (Prioridade: ${i.prioridade})`).join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em OKRs (Objectives and Key Results) e Balanced Scorecard (BSC). Sua missão é criar objetivos estratégicos claros, inspiradores e mensuráveis que traduzam as apostas estratégicas da empresa em direções concretas. Use linguagem simples, sem jargões.

REGRA CRÍTICA DE DUPLICAÇÃO:
- Analise TODOS os objetivos já existentes listados
- NUNCA crie objetivos semelhantes ou que abordem os mesmos temas
- Cada objetivo DEVE ser único e trazer uma perspectiva diferente
- Se você sugerir algo muito parecido com o que já existe, está VIOLANDO esta regra

PERSPECTIVAS DO BALANCED SCORECARD:
Para cada objetivo, classifique-o em UMA das 4 perspectivas do BSC:
1. "Financeira" - Objetivos relacionados a resultados financeiros, receita, lucro, custos, rentabilidade
2. "Clientes" - Objetivos sobre satisfação, retenção, aquisição de clientes, experiência, valor percebido
3. "Processos Internos" - Objetivos sobre eficiência operacional, qualidade, inovação, processos
4. "Aprendizado e Crescimento" - Objetivos sobre capacitação de pessoas, cultura, tecnologia, conhecimento`
          },
          {
            role: "user",
            content: `Empresa: ${empresa.nome}
Setor: ${empresa.setor}
Descrição: ${empresa.descricao || 'Não informada'}

## CONTEXTO DAS APOSTAS ESTRATÉGICAS:

### ESTRATÉGIAS (TOWS):
${estrategiasLista.length > 0 ? estrategiasResume : "Nenhuma estratégia definida"}

### OPORTUNIDADES DE CRESCIMENTO (Ansoff):
${oportunidades.length > 0 ? oportunidadesResume : "Nenhuma oportunidade identificada"}

### INICIATIVAS PRIORITÁRIAS:
${iniciativas.length > 0 ? iniciativasResume : "Nenhuma iniciativa definida"}

## OBJETIVOS JÁ EXISTENTES (NÃO REPITA):
${objetivosExistentes.length > 0 ? objetivosResume : "Nenhum objetivo criado ainda"}

${objetivosExistentes.length > 0 ? `
⚠️ ATENÇÃO: Já existem ${objetivosExistentes.length} objetivo(s). 
Suas sugestões DEVEM ser diferentes e complementares aos existentes.
` : ''}

## TAREFA:
Crie EXATAMENTE 3 objetivos estratégicos ÚNICOS baseados nas apostas acima.

Cada objetivo deve:
- titulo: Objetivo claro e inspirador (máx 80 caracteres) - ex: "Aumentar participação no mercado premium"
- descricao: Contexto e justificativa estratégica (2-3 frases) explicando POR QUE este objetivo é importante
- prazo: Horizonte temporal - "Q4 2025", "Anual 2025", etc
- perspectiva: Classifique em uma das 4 perspectivas BSC: "Financeira", "Clientes", "Processos Internos" ou "Aprendizado e Crescimento"

Os objetivos devem ser:
✓ Qualitativos e aspiracionais (não números)
✓ Alinhados com as estratégias e oportunidades
✓ Mensuráveis através de resultados-chave (que serão criados depois)
✓ Diferentes entre si
✓ Distribuídos entre diferentes perspectivas BSC quando possível

Responda em JSON:
{
  "objetivos": [
    {"titulo": "...", "descricao": "...", "prazo": "Q4 2025", "perspectiva": "Financeira"},
    {"titulo": "...", "descricao": "...", "prazo": "Anual 2025", "perspectiva": "Clientes"},
    {"titulo": "...", "descricao": "...", "prazo": "Q2 2026", "perspectiva": "Processos Internos"}
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (sugestoes.objetivos && Array.isArray(sugestoes.objetivos)) {
        const seenTitles = new Set(
          objetivosExistentes.map(o => o.titulo.toLowerCase().trim())
        );
        
        sugestoes.objetivos = sugestoes.objetivos.filter((objetivo: any) => {
          const titulo = objetivo.titulo?.toLowerCase().trim();
          if (!titulo || seenTitles.has(titulo)) {
            return false;
          }
          seenTitles.add(titulo);
          return true;
        });
      }
      
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-resultados-chave", async (req, res) => {
    try {
      const { objetivoId } = req.body;
      const empresaId = req.session.empresaId!;
      
      if (!objetivoId) {
        return res.status(400).json({ error: "objetivoId é obrigatório" });
      }

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const objetivosList = await storage.getObjetivos(empresaId);
      const objetivo = objetivosList.find(o => o.id === objetivoId);
      
      if (!objetivo) {
        return res.status(404).json({ error: "Objetivo não encontrado" });
      }

      const resultadosExistentes = await storage.getResultadosChave(objetivoId, empresaId);
      const estrategiasLista = await storage.getEstrategias(empresaId);
      const oportunidades = await storage.getOportunidadesCrescimento(empresaId);
      const iniciativas = await storage.getIniciativas(empresaId);

      const resultadosResume = resultadosExistentes.map(r => 
        `- ${r.metrica}\n  Inicial: ${r.valorInicial}, Alvo: ${r.valorAlvo}, Atual: ${r.valorAtual}\n  Owner: ${r.owner}, Prazo: ${r.prazo}`
      ).join("\n\n");

      const estrategiasResume = estrategiasLista.map(e => `${e.tipo}: ${e.titulo}`).join("\n");
      const oportunidadesResume = oportunidades.map(o => `${o.tipo}: ${o.titulo}`).join("\n");
      const iniciativasResume = iniciativas.map(i => i.titulo).join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor estratégico especializado em OKRs (Objectives and Key Results). Sua missão é criar resultados-chave mensuráveis e específicos que demonstrem o sucesso do objetivo estratégico. Use linguagem simples, sem jargões.

REGRA CRÍTICA DE DUPLICAÇÃO:
- Analise TODOS os resultados-chave já existentes para este objetivo
- NUNCA crie resultados similares ou que meçam as mesmas métricas
- Cada resultado-chave DEVE ser único e medir algo diferente
- Se você sugerir algo muito parecido com o que já existe, está VIOLANDO esta regra`
          },
          {
            role: "user",
            content: `Empresa: ${empresa.nome}
Setor: ${empresa.setor}

## OBJETIVO ESTRATÉGICO:
"${objetivo.titulo}"
${objetivo.descricao ? `Descrição: ${objetivo.descricao}` : ''}
Prazo: ${objetivo.prazo}

## CONTEXTO DAS APOSTAS ESTRATÉGICAS:

### ESTRATÉGIAS (TOWS):
${estrategiasLista.length > 0 ? estrategiasResume : "Nenhuma estratégia definida"}

### OPORTUNIDADES DE CRESCIMENTO (Ansoff):
${oportunidades.length > 0 ? oportunidadesResume : "Nenhuma oportunidade identificada"}

### INICIATIVAS PRIORITÁRIAS:
${iniciativas.length > 0 ? iniciativasResume : "Nenhuma iniciativa definida"}

## RESULTADOS-CHAVE JÁ EXISTENTES (NÃO REPITA):
${resultadosExistentes.length > 0 ? resultadosResume : "Nenhum resultado-chave criado ainda"}

${resultadosExistentes.length > 0 ? `
⚠️ ATENÇÃO: Já existem ${resultadosExistentes.length} resultado(s)-chave. 
Suas sugestões DEVEM medir aspectos DIFERENTES e complementares.
` : ''}

## TAREFA:
Crie EXATAMENTE 3 resultados-chave ÚNICOS e mensuráveis para este objetivo.

Cada resultado-chave deve:
- metrica: Nome claro da métrica (ex: "Margem bruta", "Taxa de retenção de clientes", "Tempo médio de entrega")
- valorInicial: Valor atual/inicial em número decimal (ex: 38.5 para 38,5%, 12.3 para 12,3 dias)
- valorAlvo: Meta a atingir em número decimal (ex: 42.0 para 42%, 10.0 para 10 dias)
- valorAtual: Valor atual (mesmo que valorInicial no início)
- owner: Cargo/área responsável (ex: "CFO", "Gerente Comercial", "Coordenador de Logística")
- prazo: Horizonte temporal (ex: "Q4 2025", "Dez 2025", "Jun 2026")

IMPORTANTE sobre valores:
- Use números decimais simples (38.5, não "38,5%")
- Valores representam % se a métrica mencionar taxa/margem/percentual
- Valores representam dias/horas/R$ conforme a métrica indicar
- Sempre use . (ponto) como separador decimal, nunca vírgula
- Exemplo correto: valorInicial: 38.5, valorAlvo: 42.0
- Exemplo errado: valorInicial: "38,5%", valorAlvo: "42%"

Os resultados-chave devem ser:
✓ Específicos e mensuráveis com números
✓ Alinhados com o objetivo e as apostas estratégicas
✓ Diferentes entre si (medem coisas distintas)
✓ Realistas mas desafiadores

Responda em JSON:
{
  "resultados": [
    {"metrica": "...", "valorInicial": 38.5, "valorAlvo": 42.0, "valorAtual": 38.5, "owner": "...", "prazo": "Q4 2025"},
    {"metrica": "...", "valorInicial": 3.2, "valorAlvo": 2.0, "valorAtual": 3.2, "owner": "...", "prazo": "Dez 2025"},
    {"metrica": "...", "valorInicial": 45.0, "valorAlvo": 70.0, "valorAtual": 45.0, "owner": "...", "prazo": "Q2 2026"}
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (sugestoes.resultados && Array.isArray(sugestoes.resultados)) {
        const seenMetricas = new Set(
          resultadosExistentes.map(r => r.metrica.toLowerCase().trim())
        );
        
        sugestoes.resultados = sugestoes.resultados.filter((resultado: any) => {
          const metrica = resultado.metrica?.toLowerCase().trim();
          if (!metrica || seenMetricas.has(metrica)) {
            return false;
          }
          seenMetricas.add(metrica);
          return true;
        });
      }
      
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-indicadores", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;

      const empresa = await storage.getEmpresa(empresaId);
      if (!empresa) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const indicadoresExistentes = await storage.getIndicadores(empresaId);
      const estrategiasLista = await storage.getEstrategias(empresaId);
      const oportunidades = await storage.getOportunidadesCrescimento(empresaId);
      const iniciativas = await storage.getIniciativas(empresaId);
      const objetivosList = await storage.getObjetivos(empresaId);

      const indicadoresResume = indicadoresExistentes.map(i => 
        `[${i.perspectiva}] ${i.nome} - Owner: ${i.owner}`
      ).join("\n");

      const estrategiasResume = estrategiasLista.map(e => `${e.tipo}: ${e.titulo}`).join("\n");
      const oportunidadesResume = oportunidades.map(o => `${o.tipo}: ${o.titulo}`).join("\n");
      const iniciativasResume = iniciativas.map(i => i.titulo).join("\n");
      const objetivosResume = objetivosList.map(o => o.titulo).join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um consultor especializado em Balanced Scorecard (BSC) e KPIs. Sua missão é criar indicadores de desempenho equilibrados nas 4 perspectivas do BSC que ajudem a monitorar a execução da estratégia. Use linguagem simples.

REGRA CRÍTICA:
- Analise TODOS os indicadores existentes
- NUNCA crie indicadores duplicados ou muito similares
- Cada indicador DEVE ser único
- Distribua entre as 4 perspectivas: Finanças, Clientes, Processos, Pessoas`
          },
          {
            role: "user",
            content: `Empresa: ${empresa.nome}
Setor: ${empresa.setor}

## CONTEXTO ESTRATÉGICO:

### OBJETIVOS ESTRATÉGICOS:
${objetivosList.length > 0 ? objetivosResume : "Nenhum objetivo definido"}

### ESTRATÉGIAS:
${estrategiasLista.length > 0 ? estrategiasResume : "Nenhuma estratégia"}

### OPORTUNIDADES:
${oportunidades.length > 0 ? oportunidadesResume : "Nenhuma oportunidade"}

### INICIATIVAS:
${iniciativas.length > 0 ? iniciativasResume : "Nenhuma iniciativa"}

## INDICADORES JÁ EXISTENTES (NÃO REPITA):
${indicadoresExistentes.length > 0 ? indicadoresResume : "Nenhum indicador criado"}

${indicadoresExistentes.length > 0 ? `
⚠️ ${indicadoresExistentes.length} indicador(es) já existe(m). Crie indicadores DIFERENTES.
` : ''}

## TAREFA:
Crie EXATAMENTE 8 indicadores BSC ÚNICOS (2 por perspectiva).

Para cada indicador:
- perspectiva: "Finanças", "Clientes", "Processos" ou "Pessoas"
- nome: Nome claro do indicador (ex: "Margem de Lucro Líquido", "Taxa de Retenção de Clientes")
- meta: Meta em formato texto (ex: "R$ 500 mil", "85%", "< 15 dias") - SEM valores numéricos hardcoded, use placeholders realistas
- atual: Valor atual (mesmo formato da meta, pode ser "A definir" se não souber)
- status: "verde", "amarelo" ou "vermelho" (distribua de forma realista)
- owner: Cargo/área responsável (ex: "CFO", "Gerente Comercial", "RH")

Responda em JSON:
{
  "indicadores": [
    {"perspectiva": "Finanças", "nome": "...", "meta": "...", "atual": "...", "status": "verde", "owner": "..."},
    {"perspectiva": "Finanças", "nome": "...", "meta": "...", "atual": "...", "status": "amarelo", "owner": "..."},
    {"perspectiva": "Clientes", "nome": "...", "meta": "...", "atual": "...", "status": "verde", "owner": "..."},
    {"perspectiva": "Clientes", "nome": "...", "meta": "...", "atual": "...", "status": "amarelo", "owner": "..."},
    {"perspectiva": "Processos", "nome": "...", "meta": "...", "atual": "...", "status": "amarelo", "owner": "..."},
    {"perspectiva": "Processos", "nome": "...", "meta": "...", "atual": "...", "status": "vermelho", "owner": "..."},
    {"perspectiva": "Pessoas", "nome": "...", "meta": "...", "atual": "...", "status": "verde", "owner": "..."},
    {"perspectiva": "Pessoas", "nome": "...", "meta": "...", "atual": "...", "status": "amarelo", "owner": "..."}
  ]
}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const sugestoes = JSON.parse(completion.choices[0].message.content || "{}");
      
      if (sugestoes.indicadores && Array.isArray(sugestoes.indicadores)) {
        const seenNomes = new Set(
          indicadoresExistentes.map(i => i.nome.toLowerCase().trim())
        );
        
        sugestoes.indicadores = sugestoes.indicadores.filter((indicador: any) => {
          const nome = indicador.nome?.toLowerCase().trim();
          if (!nome || seenNomes.has(nome)) {
            return false;
          }
          seenNomes.add(nome);
          return true;
        });
      }
      
      res.json(sugestoes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== RITUAIS ====================
  
  function isRitualPendente(ritual: any, tipo: string): boolean {
    if (!ritual || !ritual.dataUltimo) return true;
    
    const dataUltimo = new Date(ritual.dataUltimo);
    const hoje = new Date();
    
    switch (tipo) {
      case "diario":
        return !isMesmaData(dataUltimo, hoje);
      case "semanal":
        return !isMesmaSemana(dataUltimo, hoje);
      case "mensal":
        return !isMesmoMes(dataUltimo, hoje);
      case "trimestral":
        return !isMesmoTrimestre(dataUltimo, hoje);
      default:
        return true;
    }
  }
  
  function isMesmaData(data1: Date, data2: Date): boolean {
    return data1.getFullYear() === data2.getFullYear() &&
           data1.getMonth() === data2.getMonth() &&
           data1.getDate() === data2.getDate();
  }
  
  function isMesmaSemana(data1: Date, data2: Date): boolean {
    const umDia = 24 * 60 * 60 * 1000;
    const primeiroDia = new Date(data2.getFullYear(), 0, 1);
    const dias1 = Math.floor((data1.getTime() - primeiroDia.getTime()) / umDia);
    const dias2 = Math.floor((data2.getTime() - primeiroDia.getTime()) / umDia);
    const semana1 = Math.floor(dias1 / 7);
    const semana2 = Math.floor(dias2 / 7);
    return semana1 === semana2 && data1.getFullYear() === data2.getFullYear();
  }
  
  function isMesmoMes(data1: Date, data2: Date): boolean {
    return data1.getFullYear() === data2.getFullYear() &&
           data1.getMonth() === data2.getMonth();
  }
  
  function isMesmoTrimestre(data1: Date, data2: Date): boolean {
    const trimestre1 = Math.floor(data1.getMonth() / 3);
    const trimestre2 = Math.floor(data2.getMonth() / 3);
    return data1.getFullYear() === data2.getFullYear() && trimestre1 === trimestre2;
  }
  
  app.get("/api/rituais", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;
      let rituais = await storage.getRituais(empresaId);
      
      if (rituais.length === 0) {
        const hoje = new Date();
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        amanha.setHours(9, 0, 0, 0);
        
        const proximaSegunda = new Date(hoje);
        proximaSegunda.setDate(proximaSegunda.getDate() - proximaSegunda.getDay() + 8);
        proximaSegunda.setHours(10, 0, 0, 0);
        
        const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
        proximoMes.setHours(14, 0, 0, 0);
        
        const proximoTrimestre = new Date(hoje.getFullYear(), Math.floor(hoje.getMonth() / 3) * 3 + 3, 1);
        proximoTrimestre.setHours(14, 0, 0, 0);
        
        const rituaisPadrao = [
          { empresaId, tipo: "diario", dataProximo: amanha, completado: "false" },
          { empresaId, tipo: "semanal", dataProximo: proximaSegunda, completado: "false" },
          { empresaId, tipo: "mensal", dataProximo: proximoMes, completado: "false" },
          { empresaId, tipo: "trimestral", dataProximo: proximoTrimestre, completado: "false" }
        ];
        
        for (const ritual of rituaisPadrao) {
          await storage.createRitual(ritual);
        }
        
        rituais = await storage.getRituais(empresaId);
      }
      
      const rituaisComStatus = rituais.map(ritual => ({
        ...ritual,
        pendente: isRitualPendente(ritual, ritual.tipo)
      }));
      
      res.json(rituaisComStatus);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/rituais", async (req, res) => {
    try {
      const data = insertRitualSchema.parse({ ...req.body, empresaId: req.session.empresaId });
      const ritual = await storage.createRitual(data);
      res.json(ritual);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/rituais/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = stripTenantFields(insertRitualSchema.partial().parse(req.body));
      
      if (data.completado === "true" && !data.dataUltimo) {
        data.dataUltimo = new Date();
      }
      
      const ritual = await storage.updateRitual(id, req.session.empresaId!, data);
      res.json(ritual);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/rituais/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRitual(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== EVENTOS ====================

  app.get("/api/eventos", async (req, res) => {
    try {
      const eventos = await storage.getEventos(req.session.empresaId!);
      res.json(eventos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/eventos", async (req, res) => {
    try {
      const data = req.body;
      if (data.dataEvento && typeof data.dataEvento === 'string') {
        data.dataEvento = new Date(data.dataEvento);
      }
      data.empresaId = req.session.empresaId;
      const evento = await storage.createEvento(data);
      res.json(evento);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/eventos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const evento = await storage.updateEvento(id, req.session.empresaId!, data);
      res.json(evento);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/eventos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEvento(id, req.session.empresaId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== ALERTAS ====================
  
  app.get("/api/alertas", async (req, res) => {
    try {
      const empresaId = req.session.empresaId!;
      
      const indicadores = await storage.getIndicadores(empresaId);
      const iniciativas = await storage.getIniciativas(empresaId);
      
      const alertas = [];
      
      for (const indicador of indicadores) {
        if (indicador.status === "vermelho") {
          alertas.push({
            tipo: "indicador_critico",
            severidade: "alta",
            mensagem: `Indicador "${indicador.nome}" está em status vermelho`,
            detalhes: {
              perspectiva: indicador.perspectiva,
              meta: indicador.meta,
              atual: indicador.atual,
              owner: indicador.owner
            }
          });
        } else if (indicador.status === "amarelo") {
          alertas.push({
            tipo: "indicador_atencao",
            severidade: "media",
            mensagem: `Indicador "${indicador.nome}" precisa de atenção`,
            detalhes: {
              perspectiva: indicador.perspectiva,
              meta: indicador.meta,
              atual: indicador.atual,
              owner: indicador.owner
            }
          });
        }
      }
      
      const hoje = new Date();
      for (const iniciativa of iniciativas) {
        if (iniciativa.status !== "concluida") {
          const prazo = new Date(iniciativa.prazo);
          if (prazo < hoje) {
            alertas.push({
              tipo: "iniciativa_atrasada",
              severidade: "alta",
              mensagem: `Iniciativa "${iniciativa.titulo}" está atrasada`,
              detalhes: {
                prazo: iniciativa.prazo,
                status: iniciativa.status,
                responsavel: iniciativa.responsavel,
                prioridade: iniciativa.prioridade
              }
            });
          }
        }
      }
      
      res.json(alertas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
