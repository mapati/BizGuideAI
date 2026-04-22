// Task #220 — Score de qualidade do plano.
//
// Cálculo determinístico (sem IA) de uma nota 0-100 baseado em dimensões
// objetivas extraídas do storage. Devolve também uma lista priorizada de
// lacunas, cada uma com deep-link para corrigir a entidade na rota certa.

import { storage } from "./storage";

const DAY_MS = 24 * 60 * 60 * 1000;
const DIAS_KPI_VIVO = 30;

// Pesos das dimensões (somam 90 — o score é normalizado por pesoTotal).
//
// NOTA: a dimensão `krs_indicador_fonte` foi removida intencionalmente.
// KR (Resultado-Chave) e KPI (Indicador BSC) são camadas independentes por
// design metodológico: KR mede ALCANCE de um objetivo no ciclo; KPI mede
// PERFORMANCE contínua do negócio. Ligar um KR a um KPI continua sendo
// possível (campo `indicadorFonteId` opcional, badge "Atacando: KPI X"),
// mas é apenas rastreabilidade voluntária — não é defeito de plano.
const PESOS = {
  cobertura_bsc: 12,
  okrs_mensuraveis: 16,
  iniciativas_executaveis: 14,
  iniciativas_estrategia: 10,
  kpis_dono: 10,
  kpis_vivos: 18,
  riscos_mitigacao: 10,
} as const;

const PERSPECTIVAS_BSC = ["Financeira", "Clientes", "Processos", "Aprendizado"] as const;

export type SeveridadeLacuna = "alta" | "media" | "baixa";

export interface PlanQualityLacuna {
  titulo: string;
  severidade: SeveridadeLacuna;
  entidade: "objetivo" | "kr" | "iniciativa" | "indicador" | "risco" | "bsc";
  entidadeId: string | null;
  rota: string;
}

export interface PlanQualityDimensao {
  id: keyof typeof PESOS;
  titulo: string;
  peso: number;
  score: number;
  detalhes: string;
}

export interface PlanQualityResult {
  score: number;
  dimensoes: PlanQualityDimensao[];
  lacunas: PlanQualityLacuna[];
  geradoEm: string;
}

function pct(num: number, den: number): number {
  if (den <= 0) return 0;
  return Math.round((num / den) * 100);
}

function isPerspKey(p: string): string | null {
  const norm = p.toLowerCase();
  if (norm.startsWith("financ")) return "Financeira";
  if (norm.startsWith("client")) return "Clientes";
  if (norm.startsWith("process")) return "Processos";
  if (norm.startsWith("aprendi") || norm.startsWith("pessoas") || norm.startsWith("crescim")) return "Aprendizado";
  return null;
}

export async function computePlanQuality(empresaId: string): Promise<PlanQualityResult> {
  const [objetivos, indicadoresAll, iniciativasAll, riscos] = await Promise.all([
    storage.getObjetivos(empresaId),
    storage.getIndicadores(empresaId),
    storage.getIniciativas(empresaId),
    storage.getRiscos(empresaId),
  ]);

  // Indicadores BSC (ignoramos a "perspectiva" especial 'diagnostico').
  const indicadores = indicadoresAll.filter((i) => (i.perspectiva ?? "").toLowerCase() !== "diagnostico");

  // KRs por objetivo
  const krsPorObjetivo = await Promise.all(
    objetivos.map((o) => storage.getResultadosChave(o.id, empresaId).then((krs) => ({ obj: o, krs })))
  );
  const todosKrs = krsPorObjetivo.flatMap((x) => x.krs);

  // Leituras por indicador (paralelo). Pegamos só a mais recente.
  const ultimasLeituras = await Promise.all(
    indicadores.map(async (ind) => {
      try {
        const ls = await storage.getLeituras(ind.id);
        return { ind, ultima: ls[0]?.registradoEm ? new Date(ls[0].registradoEm) : null };
      } catch {
        return { ind, ultima: null };
      }
    })
  );

  const agora = Date.now();
  const limiteVivo = agora - DIAS_KPI_VIVO * DAY_MS;

  const lacunas: PlanQualityLacuna[] = [];
  const dimensoes: PlanQualityDimensao[] = [];

  // 1) Cobertura BSC ---------------------------------------------------------
  {
    const cobertas = new Set<string>();
    for (const o of objetivos) {
      const k = isPerspKey(o.perspectiva ?? "");
      if (k) cobertas.add(k);
    }
    const score = Math.round((cobertas.size / PERSPECTIVAS_BSC.length) * 100);
    const faltantes = PERSPECTIVAS_BSC.filter((p) => !cobertas.has(p));
    dimensoes.push({
      id: "cobertura_bsc",
      titulo: "Cobertura BSC",
      peso: PESOS.cobertura_bsc,
      score,
      detalhes: faltantes.length === 0
        ? "As 4 perspectivas têm pelo menos 1 objetivo."
        : `Faltam objetivos nas perspectivas: ${faltantes.join(", ")}.`,
    });
    for (const p of faltantes) {
      lacunas.push({
        titulo: `Sem objetivo na perspectiva ${p}`,
        severidade: "media",
        entidade: "bsc",
        entidadeId: null,
        rota: "/okrs?novo=1",
      });
    }
  }

  // 2) OKRs mensuráveis ------------------------------------------------------
  {
    const objCom = krsPorObjetivo.filter(({ krs }) =>
      krs.some(
        (k) => !!k.metrica && k.valorAlvo != null && String(k.valorAlvo) !== "" && k.valorInicial != null && String(k.valorInicial) !== ""
      )
    );
    const score = pct(objCom.length, objetivos.length);
    dimensoes.push({
      id: "okrs_mensuraveis",
      titulo: "OKRs mensuráveis",
      peso: PESOS.okrs_mensuraveis,
      score,
      detalhes: objetivos.length === 0
        ? "Nenhum objetivo cadastrado."
        : `${objCom.length} de ${objetivos.length} objetivo(s) têm pelo menos 1 KR mensurável.`,
    });
    const faltantes = krsPorObjetivo.filter(({ krs, obj }) =>
      !krs.some(
        (k) => !!k.metrica && k.valorAlvo != null && String(k.valorAlvo) !== "" && k.valorInicial != null && String(k.valorInicial) !== ""
      ) && !obj.encerrado
    );
    for (const { obj } of faltantes.slice(0, 5)) {
      lacunas.push({
        titulo: `Objetivo "${obj.titulo}" sem KR mensurável`,
        severidade: "alta",
        entidade: "objetivo",
        entidadeId: obj.id,
        rota: `/okrs?editar=${obj.id}`,
      });
    }
  }

  // 3) [REMOVIDO] "KRs com indicador-fonte" ----------------------------------
  // KR e KPI são camadas independentes (alcance do ciclo vs. performance
  // contínua). Não cobramos mais essa "ponte" como dimensão de qualidade —
  // o vínculo segue disponível como rastreabilidade voluntária via
  // resultados_chave.indicadorFonteId.

  // 4) Iniciativas executáveis ----------------------------------------------
  {
    const ativas = iniciativasAll.filter((i) => {
      const s = (i.status ?? "").toLowerCase();
      return s !== "concluida" && s !== "concluída" && s !== "cancelada" && s !== "encerrada";
    });
    const completas = ativas.filter((i) => {
      const temResp = !!i.responsavelId || (!!i.responsavel && i.responsavel.trim() !== "");
      const temPrazo = !!i.prazo && i.prazo.trim() !== "";
      const temPrio = !!i.prioridade && i.prioridade.trim() !== "";
      return temResp && temPrazo && temPrio;
    });
    const score = pct(completas.length, ativas.length);
    dimensoes.push({
      id: "iniciativas_executaveis",
      titulo: "Iniciativas executáveis",
      peso: PESOS.iniciativas_executaveis,
      score,
      detalhes: ativas.length === 0
        ? "Nenhuma iniciativa ativa."
        : `${completas.length} de ${ativas.length} iniciativa(s) têm responsável, prazo e prioridade.`,
    });
    const incompletas = ativas.filter((i) => !completas.includes(i));
    for (const i of incompletas.slice(0, 5)) {
      const faltam: string[] = [];
      if (!i.responsavelId && !(i.responsavel && i.responsavel.trim())) faltam.push("responsável");
      if (!i.prazo) faltam.push("prazo");
      if (!i.prioridade) faltam.push("prioridade");
      lacunas.push({
        titulo: `Iniciativa "${i.titulo}" sem ${faltam.join(", ")}`,
        severidade: "alta",
        entidade: "iniciativa",
        entidadeId: i.id,
        rota: `/iniciativas?editar=${i.id}`,
      });
    }
  }

  // 5) Iniciativas conectadas à estratégia ----------------------------------
  {
    const ativas = iniciativasAll.filter((i) => {
      const s = (i.status ?? "").toLowerCase();
      return s !== "concluida" && s !== "concluída" && s !== "cancelada" && s !== "encerrada";
    });
    const conectadas = ativas.filter((i) => !!i.estrategiaId || !!i.indicadorFonteId);
    const score = pct(conectadas.length, ativas.length);
    dimensoes.push({
      id: "iniciativas_estrategia",
      titulo: "Iniciativas ligadas à estratégia",
      peso: PESOS.iniciativas_estrategia,
      score,
      detalhes: ativas.length === 0
        ? "Nenhuma iniciativa ativa."
        : `${conectadas.length} de ${ativas.length} têm vínculo com estratégia ou indicador.`,
    });
    const orfas = ativas.filter((i) => !conectadas.includes(i));
    for (const i of orfas.slice(0, 3)) {
      lacunas.push({
        titulo: `Iniciativa "${i.titulo}" sem estratégia ou KPI vinculado`,
        severidade: "media",
        entidade: "iniciativa",
        entidadeId: i.id,
        rota: `/iniciativas?editar=${i.id}`,
      });
    }
  }

  // 6) KPIs com dono --------------------------------------------------------
  {
    const comDono = indicadores.filter((i) => !!i.responsavelId || (!!i.owner && i.owner.trim() !== ""));
    const score = pct(comDono.length, indicadores.length);
    dimensoes.push({
      id: "kpis_dono",
      titulo: "KPIs com dono",
      peso: PESOS.kpis_dono,
      score,
      detalhes: indicadores.length === 0
        ? "Nenhum KPI cadastrado."
        : `${comDono.length} de ${indicadores.length} KPI(s) têm responsável definido.`,
    });
    const semDono = indicadores.filter((i) => !i.responsavelId && !(i.owner && i.owner.trim()));
    for (const i of semDono.slice(0, 3)) {
      lacunas.push({
        titulo: `KPI "${i.nome}" sem dono`,
        severidade: "media",
        entidade: "indicador",
        entidadeId: i.id,
        rota: `/indicadores?editar=${i.id}`,
      });
    }
  }

  // 7) KPIs vivos -----------------------------------------------------------
  {
    const vivos = ultimasLeituras.filter((x) => x.ultima && x.ultima.getTime() >= limiteVivo);
    const score = pct(vivos.length, indicadores.length);
    dimensoes.push({
      id: "kpis_vivos",
      titulo: "KPIs com leitura recente",
      peso: PESOS.kpis_vivos,
      score,
      detalhes: indicadores.length === 0
        ? "Nenhum KPI cadastrado."
        : `${vivos.length} de ${indicadores.length} KPI(s) com leitura nos últimos ${DIAS_KPI_VIVO} dias.`,
    });
    const mortos = ultimasLeituras.filter((x) => !x.ultima || x.ultima.getTime() < limiteVivo);
    for (const { ind, ultima } of mortos.slice(0, 5)) {
      const dias = ultima ? Math.floor((agora - ultima.getTime()) / DAY_MS) : null;
      lacunas.push({
        titulo: ultima
          ? `KPI "${ind.nome}" sem leitura há ${dias} dia(s)`
          : `KPI "${ind.nome}" nunca recebeu leitura`,
        severidade: "alta",
        entidade: "indicador",
        entidadeId: ind.id,
        rota: `/indicadores?editar=${ind.id}`,
      });
    }
  }

  // 8) Riscos com mitigação --------------------------------------------------
  {
    const ativos = riscos.filter((r) => {
      const s = (r.status ?? "").toLowerCase();
      return s !== "mitigado" && s !== "encerrado" && s !== "aceito";
    });
    const completos = ativos.filter(
      (r) => !!r.planoMitigacao && r.planoMitigacao.trim() !== "" && !!r.responsavelId
    );
    const score = pct(completos.length, ativos.length);
    dimensoes.push({
      id: "riscos_mitigacao",
      titulo: "Riscos com mitigação",
      peso: PESOS.riscos_mitigacao,
      score,
      detalhes: ativos.length === 0
        ? "Nenhum risco ativo."
        : `${completos.length} de ${ativos.length} risco(s) ativos têm plano de mitigação e responsável.`,
    });
    const faltantes = ativos.filter((r) => !completos.includes(r));
    for (const r of faltantes.slice(0, 3)) {
      const faltam: string[] = [];
      if (!r.planoMitigacao || !r.planoMitigacao.trim()) faltam.push("plano de mitigação");
      if (!r.responsavelId) faltam.push("responsável");
      lacunas.push({
        titulo: `Risco "${(r.descricao ?? "").slice(0, 60)}" sem ${faltam.join(" e ")}`,
        severidade: "alta",
        entidade: "risco",
        entidadeId: r.id,
        rota: `/riscos?editar=${r.id}`,
      });
    }
  }

  // Score global ponderado
  const pesoTotal = Object.values(PESOS).reduce((a, b) => a + b, 0);
  const ponderado = dimensoes.reduce((acc, d) => acc + d.score * d.peso, 0) / pesoTotal;
  const scoreGlobal = Math.round(ponderado);

  // Ordena lacunas por severidade e mantém top 10
  const sevRank: Record<SeveridadeLacuna, number> = { alta: 0, media: 1, baixa: 2 };
  lacunas.sort((a, b) => sevRank[a.severidade] - sevRank[b.severidade]);

  return {
    score: scoreGlobal,
    dimensoes,
    lacunas: lacunas.slice(0, 10),
    geradoEm: new Date().toISOString(),
  };
}

/**
 * Reduz o resultado a um bloco textual compacto (≤ 30 linhas) para uso no
 * prompt do assistente / briefing. Mostra score, dimensões abaixo de 70%
 * (quando há lacunas reais) e top 3 lacunas com IDs.
 */
export function formatPlanQualityForPrompt(q: PlanQualityResult): string {
  const linhas: string[] = [];
  linhas.push(`## QUALIDADE DO PLANO (determinístico, 0-100)`);
  linhas.push(`Score global: ${q.score}/100`);

  const fracas = q.dimensoes.filter((d) => d.score < 70);
  if (fracas.length > 0) {
    linhas.push(`Dimensões abaixo de 70%:`);
    for (const d of fracas) {
      linhas.push(`- ${d.titulo}: ${d.score}/100 — ${d.detalhes}`);
    }
  } else {
    linhas.push(`Todas as dimensões estão ≥ 70%.`);
  }

  const top = q.lacunas.slice(0, 3);
  if (top.length > 0) {
    linhas.push(`Top lacunas para atacar (use IDs reais ao propor correções):`);
    for (const l of top) {
      const id = l.entidadeId ? ` id=${l.entidadeId}` : "";
      linhas.push(`- [${l.severidade}] ${l.titulo} (entidade=${l.entidade}${id}, rota=${l.rota})`);
    }
  }
  linhas.push(
    `OBS: quando o usuário perguntar "como está meu plano?" ou pedir avaliação, cite o score e ataque PRIMEIRO as lacunas de severidade "alta" listadas acima — usando os IDs reais via tools (atualizar_iniciativa, atualizar_valor_indicador, etc.).`
  );
  return linhas.join("\n");
}
