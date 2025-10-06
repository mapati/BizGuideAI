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
  insertModeloNegocioSchema 
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

  const httpServer = createServer(app);
  return httpServer;
}
