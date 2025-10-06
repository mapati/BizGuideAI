import type { Express } from "express";
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
  insertIniciativaSchema
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

  app.get("/api/cinco-forcas/:empresaId", async (req, res) => {
    try {
      const { empresaId } = req.params;
      const forcas = await storage.getCincoForcas(empresaId);
      res.json(forcas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cinco-forcas", async (req, res) => {
    try {
      const data = insertCincoForcasSchema.parse(req.body);
      const forca = await storage.createCincoForcas(data);
      res.json(forca);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/cinco-forcas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertCincoForcasSchema.partial().parse(req.body);
      const forca = await storage.updateCincoForcas(id, data);
      res.json(forca);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/cinco-forcas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCincoForcas(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/modelo-negocio/:empresaId", async (req, res) => {
    try {
      const { empresaId } = req.params;
      const blocos = await storage.getModeloNegocio(empresaId);
      res.json(blocos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/modelo-negocio", async (req, res) => {
    try {
      const data = insertModeloNegocioSchema.parse(req.body);
      const bloco = await storage.createModeloNegocio(data);
      res.json(bloco);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/modelo-negocio/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertModeloNegocioSchema.partial().parse(req.body);
      const bloco = await storage.updateModeloNegocio(id, data);
      res.json(bloco);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/modelo-negocio/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteModeloNegocio(id);
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
      const { empresaId, tipo } = req.body;
      
      if (!empresaId || !tipo) {
        return res.status(400).json({ error: "empresaId e tipo são obrigatórios" });
      }

      const empresa = await storage.getEmpresa();
      if (!empresa || empresa.id !== empresaId) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const fatoresPestel = await storage.getFatoresPestel(empresaId);
      const cincoForcas = await storage.getCincoForcas(empresaId);
      const modeloNegocio = await storage.getModeloNegocio(empresaId);
      const swotExistente = await storage.getAnaliseSwot(empresaId);

      const fatoresPestelResumo = fatoresPestel.map(f => `${f.tipo}: ${f.descricao}`).join("\n");
      const cincoForcasResumo = cincoForcas.map(f => `${f.forca}: ${f.descricao} (intensidade ${f.intensidade})`).join("\n");
      const modeloNegocioResumo = modeloNegocio.map(m => `${m.bloco}: ${m.descricao}`).join("\n");
      
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
      const { empresaId } = req.body;
      
      if (!empresaId) {
        return res.status(400).json({ error: "empresaId é obrigatório" });
      }

      const empresa = await storage.getEmpresa();
      if (!empresa || empresa.id !== empresaId) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const fatoresPestel = await storage.getFatoresPestel(empresaId);
      const cincoForcas = await storage.getCincoForcas(empresaId);
      const modeloNegocio = await storage.getModeloNegocio(empresaId);
      const swotExistente = await storage.getAnaliseSwot(empresaId);

      const fatoresPestelResumo = fatoresPestel.map(f => `${f.tipo}: ${f.descricao}`).join("\n");
      const cincoForcasResumo = cincoForcas.map(f => `${f.forca}: ${f.descricao} (intensidade ${f.intensidade})`).join("\n");
      const modeloNegocioResumo = modeloNegocio.map(m => `${m.bloco}: ${m.descricao}`).join("\n");
      
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

  app.get("/api/estrategias/:empresaId", async (req, res) => {
    try {
      const { empresaId } = req.params;
      const estrategias = await storage.getEstrategias(empresaId);
      res.json(estrategias);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/estrategias", async (req, res) => {
    try {
      const data = insertEstrategiaSchema.parse(req.body);
      const estrategia = await storage.createEstrategia(data);
      res.json(estrategia);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/estrategias/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertEstrategiaSchema.partial().parse(req.body);
      const estrategia = await storage.updateEstrategia(id, data);
      res.json(estrategia);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/estrategias/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEstrategia(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-estrategias", async (req, res) => {
    try {
      const { empresaId } = req.body;
      
      if (!empresaId) {
        return res.status(400).json({ error: "empresaId é obrigatório" });
      }

      const empresa = await storage.getEmpresa();
      if (!empresa || empresa.id !== empresaId) {
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

  app.get("/api/oportunidades-crescimento/:empresaId", async (req, res) => {
    try {
      const { empresaId } = req.params;
      const oportunidades = await storage.getOportunidadesCrescimento(empresaId);
      res.json(oportunidades);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/oportunidades-crescimento", async (req, res) => {
    try {
      const data = insertOportunidadeCrescimentoSchema.parse(req.body);
      const oportunidade = await storage.createOportunidadeCrescimento(data);
      res.json(oportunidade);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/oportunidades-crescimento/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertOportunidadeCrescimentoSchema.partial().parse(req.body);
      const oportunidade = await storage.updateOportunidadeCrescimento(id, data);
      res.json(oportunidade);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/oportunidades-crescimento/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteOportunidadeCrescimento(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-oportunidades-crescimento", async (req, res) => {
    try {
      const { empresaId } = req.body;
      
      if (!empresaId) {
        return res.status(400).json({ error: "empresaId é obrigatório" });
      }

      const empresa = await storage.getEmpresa();
      if (!empresa || empresa.id !== empresaId) {
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

  app.get("/api/iniciativas/:empresaId", async (req, res) => {
    try {
      const { empresaId } = req.params;
      const iniciativas = await storage.getIniciativas(empresaId);
      res.json(iniciativas);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/iniciativas", async (req, res) => {
    try {
      const data = insertIniciativaSchema.parse(req.body);
      const iniciativa = await storage.createIniciativa(data);
      res.json(iniciativa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/iniciativas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertIniciativaSchema.partial().parse(req.body);
      const iniciativa = await storage.updateIniciativa(id, data);
      res.json(iniciativa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/iniciativas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteIniciativa(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/gerar-iniciativas", async (req, res) => {
    try {
      const { empresaId } = req.body;
      
      if (!empresaId) {
        return res.status(400).json({ error: "empresaId é obrigatório" });
      }

      const empresa = await storage.getEmpresa();
      if (!empresa || empresa.id !== empresaId) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const iniciativasExistentes = await storage.getIniciativas(empresaId);
      const estrategias = await storage.getEstrategias(empresaId);
      const oportunidades = await storage.getOportunidadesCrescimento(empresaId);

      const iniciativasResume = iniciativasExistentes.map(i => 
        `- ${i.titulo}\n  Descrição: ${i.descricao}\n  Status: ${i.status} | Prioridade: ${i.prioridade}`
      ).join("\n\n");

      const estrategiasResume = estrategias.map(e => `${e.tipo}: ${e.titulo}`).join("\n");
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
${estrategias.length > 0 ? estrategiasResume : "Nenhuma estratégia definida"}

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

  const httpServer = createServer(app);
  return httpServer;
}
