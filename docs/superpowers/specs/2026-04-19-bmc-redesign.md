# Spec: Redesign do Modelo de Negócio (BMC)

**Data:** 2026-04-19  
**Status:** Aprovado

---

## Objetivo

Transformar a página de Modelo de Negócio de um formulário isolado em uma ferramenta estratégica integrada ao sistema. O BMC passa a ser a fundação que alimenta silenciosamente a geração de IA em Estratégias, OKRs, Iniciativas e Diagnóstico. A UX de edição evolui de modal para uma vista dividida fixa (canvas + editor), tornando o fluxo mais fluido e contextual.

---

## Decisões de design

| Decisão | Escolha |
|---|---|
| Integração com o sistema | BMC alimenta os módulos (opção A) |
| UX de edição | Vista dividida fixa: canvas + editor (opção C) |
| Visibilidade da integração | Silenciosa — sem indicadores de "usando BMC" |

---

## 1. Layout da página (desktop)

A página ModeloNegocio.tsx é reestruturada em dois painéis fixos lado a lado, ocupando a altura disponível.

### Painel esquerdo — Canvas BMC (60% da largura)

- Grid CSS 5×3 idêntico ao atual, com os 9 blocos em suas posições canônicas
- Blocos são **read-only visualmente** mas **clicáveis**
- Bloco selecionado recebe: borda `border-primary`, sombra elevada, background levemente tintado
- Bloco preenchido: texto truncado com fade-out (evitar overflow)
- Bloco vazio: texto em itálico muted ("Clique para editar")
- Sem botão de edição (ícone de lápis) em cada bloco — o clique no bloco inteiro é suficiente

### Painel direito — Editor (40% da largura)

**Estado: nenhum bloco selecionado (inicial)**
- Progresso "X de 9 blocos preenchidos" + barra
- Instrução "Clique em um bloco para começar"
- Botão primário "Gerar todos com IA" (move da PageHeader para cá)

**Estado: bloco selecionado**
- Nome do bloco como título (`text-base font-semibold`)
- Pergunta-guia (`hint`) como subtítulo muted
- Linha de impacto: texto estático `"Alimenta: Estratégias · OKRs"` — valores fixos por bloco (ver tabela abaixo), exibido apenas se o bloco alimenta pelo menos um módulo
- `<Textarea>` com `min-h-[160px]`, sem resize
- Auto-save ao perder foco (onBlur) — sem botão Salvar explícito; toast discreto confirma
- Botão secundário "Sugestão da IA" — chama `/api/ai/sugerir-bloco-bmc`, preenche a textarea com o resultado; usuário pode editar antes de sair do campo
- Estado de loading da sugestão: botão desabilitado + spinner

### Tabela de impacto por bloco (valores estáticos na UI)

| Bloco | Alimenta |
|---|---|
| Proposta de Valor | Estratégias · OKRs · Diagnóstico |
| Segmentos de Clientes | Estratégias · OKRs · Diagnóstico |
| Fontes de Receita | Estratégias · Diagnóstico |
| Atividades Principais | OKRs · Iniciativas |
| Recursos Principais | Iniciativas |
| Parcerias Principais | Estratégias · Iniciativas |
| Relacionamento com Clientes | Estratégias |
| Canais | Estratégias |
| Estrutura de Custos | Diagnóstico |

### Mobile

Em telas menores que `lg` (< 1024px): o painel esquerdo (canvas) some. A lista vertical de blocos é mantida como hoje. Clicar em um bloco abre um **dialog simples** com o editor (textarea + botão IA + auto-save). Sem nova implementação de mobile — reutiliza o modal atual simplificado.

---

## 2. Backend — Integração silenciosa do BMC nos módulos de IA

### Rotas que recebem contexto do BMC (novas adições)

As rotas abaixo **não usam BMC hoje**. Cada uma passará a chamar `storage.getModeloNegocio(empresaId)` junto com os outros dados existentes e incluirá os blocos relevantes no prompt como seção `## MODELO DE NEGÓCIO`.

Blocos vazios são ignorados sem erro — a ausência do BMC não quebra a geração.

| Rota | Arquivo | Blocos incluídos no prompt |
|---|---|---|
| `POST /api/ai/gerar-estrategias` | `server/routes.ts:3343` | proposta_valor, segmentos_clientes, fontes_receita, parcerias_principais, relacionamento_clientes, canais |
| `POST /api/ai/gerar-objetivos` | `server/routes.ts:3863` | proposta_valor, segmentos_clientes, atividades_principais |
| `POST /api/ai/gerar-iniciativas` | `server/routes.ts:3755` | atividades_principais, recursos_principais, parcerias_principais |
| `POST /api/ai/diagnostico-estrategico` | `server/routes.ts:5043` | proposta_valor, segmentos_clientes, fontes_receita, estrutura_custos |

**Rotas que já usam BMC** (não alterar): `sugerir-swot`, `assistente`, `sugerir-swot-completo`.

### Padrão de inclusão no prompt

```typescript
const modeloNegocio = await storage.getModeloNegocio(empresaId);
const blocosRelevantes = ["proposta_valor", "segmentos_clientes", ...]; // por rota
const bmcCtx = modeloNegocio
  .filter(b => blocosRelevantes.includes(b.bloco) && b.descricao?.trim())
  .map(b => `- ${b.bloco}: ${b.descricao}`)
  .join("\n");
if (bmcCtx) {
  prompt += `\n\n## MODELO DE NEGÓCIO (Business Model Canvas)\n${bmcCtx}`;
}
```

### Nova rota — Sugestão por bloco

```
POST /api/ai/sugerir-bloco-bmc
Body: { bloco: string }
Auth: requireAuth (empresaId via session)
```

**Lógica:**
1. Busca `empresa` e todos os `getModeloNegocio(empresaId)` existentes
2. Monta prompt com: perfil da empresa + outros blocos já preenchidos como contexto
3. Instrui a IA a gerar **apenas** o conteúdo do bloco solicitado (2–4 frases)
4. Retorna `{ descricao: string }`

**Não persiste automaticamente** — o frontend exibe o resultado na textarea e o auto-save cuida da persistência quando o usuário sai do campo.

---

## 3. Frontend — Componentes e estrutura de arquivos

### ModeloNegocio.tsx — refatoração principal

A página atual (450 linhas) é reestruturada. Responsabilidades:

- Busca de dados: `empresa` + `blocosData` (sem mudança)
- Estado: `blocoSelecionado: string | null`, `isSuggestingBloco: boolean`
- Auto-save: `useCallback` no `handleBlur` — chama PATCH/POST e invalida cache
- Sem `editingBloco`, `editValue`, `isSavingBlock` — substituídos pelo modelo de auto-save
- Layout: `div` com `flex flex-col lg:flex-row h-full gap-0` envolvendo os dois painéis

### Componentes internos (inline na página, sem arquivos separados)

- `BmcCanvas` — grid 5×3, recebe `blocos`, `selecionado`, `onSelect`
- `BmcEditor` — painel direito, recebe `bloco selecionado`, callbacks de save e IA
- `BmcBlocoCard` — card individual no canvas (substitui `renderBlocoCard`)

### Remoção

- `Dialog` de edição (modal) → removido em desktop, mantido como fallback mobile
- Botão "Gerar com IA" da `PageHeader` → move para o painel direito (estado vazio)
- `editingBloco`, `editValue`, `isSavingBlock` states → removidos

---

## 4. Fora do escopo

- Alterações no schema do banco (`modelo_negocio` permanece como está)
- Mudanças nas rotas que já usam BMC (`sugerir-swot`, `assistente`)
- Alterações nas páginas de Estratégias, OKRs ou Iniciativas (só o backend muda)
- Histórico de versões por bloco
- Exportação/PDF do BMC
- Drag-and-drop de blocos

---

## 5. Arquivos afetados

| Arquivo | Tipo de mudança |
|---|---|
| `client/src/pages/ModeloNegocio.tsx` | Refatoração completa da estrutura de layout e estado |
| `server/routes.ts` | Adição de BMC context em 4 rotas + 1 nova rota `sugerir-bloco-bmc` |

Nenhuma alteração em `shared/schema.ts`, `server/storage.ts` ou outros componentes.
