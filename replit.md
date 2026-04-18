# Strategic Planning Application

## Overview

This web-based strategic planning application guides entrepreneurs, partners, and CEOs through a strategic planning and management journey. It uses AI to convert simple user input into professional strategic frameworks like PESTEL, SWOT, OKRs, and Balanced Scorecard. The core purpose is to enable business owners without formal training to create a "One-Page Strategy" and execute it with structured rituals and alerts. The application targets Brazilian Portuguese speakers and adopts a "Senior consultant + patient teacher" communication style.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Frameworks & Libraries:** React with TypeScript, Vite, Wouter for routing, TanStack Query for server state management, shadcn/ui with Radix UI primitives, Tailwind CSS for styling.

**Design System:** A hybrid approach inspired by Linear, Notion, and Stripe, emphasizing clarity, progressive disclosure, contextual education, and action orientation. Features include light/dark mode, custom HSL-based theming, and specific typography (Inter, JetBrains Mono).

**Key Components:** Consistent page layouts, reusable UI elements (metric cards, progress bars), an AI Assistant for contextual help, form components with `react-hook-form` and `zod` validation, and guiding empty states.

### Backend Architecture

**Technology:** Node.js with Express and TypeScript (ESM modules).

**API Style:** RESTful JSON API under `/api/*` routes.

**Core API Routes:**
- Company/organization profile (`/api/empresa`)
- Strategic analysis frameworks (PESTEL, Five Forces, SWOT, Business Model Canvas, Ansoff Matrix)
- Strategic planning and execution (Strategies, Priority Initiatives, OKRs, BSC Indicators)
- Management rituals and alerts (`/api/rituais`, `/api/alertas`)
- Custom events registry (`/api/eventos`)

**Error Handling:** Centralized middleware for standardized JSON error responses.

### Data Storage Solutions

**Database:** PostgreSQL (via Neon serverless).

**ORM:** Drizzle ORM with Drizzle Kit for migrations.

**Schema Validation:** Zod schemas generated from Drizzle tables.

**Key Database Tables:**
- `empresas`: Company profiles — includes `planoStatus`, `planoTipo`, trial fields, `mpSubscriptionId`, `mpSubscriptionStatus` (Mercado Pago), 7 strategic context fields, and 4 PDF document fields
- `usuarios`: User accounts (includes `role` ['admin'/'membro'], `isAdmin` for platform admin; `empresaId` FK links to empresa)
- `fatores_pestel`, `cinco_forcas`, `analise_swot`, `modelo_negocio`: Strategic analysis data
- `estrategias`, `oportunidades_crescimento`, `iniciativas`: Strategic planning and growth
- `objetivos`, `resultados_chave`: OKRs
- `indicadores`: BSC performance indicators
- `rituais`: Management rituals (tipo, dataUltimo, dataProximo, notas, decisoes, completado, checklist)
- `eventos`: Custom strategic events (tipo, titulo, descricao, participantes, decisoes, anexos, dataEvento)
- `faturas`: Invoice management (empresaId FK, valor decimal, descricao, status, dataVencimento, dataPagamento nullable)
- `contexto_macro`: Super-admin curated macroeconomic context injected into all AI prompts (7 fixed categories: cambio_politica_monetaria, inflacao_custos, cenario_politico_regulatorio, geopolitica_comercio_exterior, crises_setoriais, tendencias_mercado, contexto_geral). Each row has textoAtivo, rascunho, ativo flag, scheduler fields, and alertaDias.

**Data Flow:** Client requests via TanStack Query -> Express API -> Zod validation -> Drizzle ORM queries -> JSON response.

### Authentication and Authorization

**Multi-company SaaS with full data isolation and multi-user support.**

- `usuarios` table: id, empresaId (FK), nome, email, senha (bcrypt hash), role ('admin'|'membro'), isAdmin, createdAt
- `express-session` + `connect-pg-simple` for PostgreSQL-backed sessions (cookie-based)
- Requires `SESSION_SECRET` environment secret
- Auth routes (unprotected): POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
- All other `/api/*` routes are protected by `requireAuth` middleware
- Each route uses `req.session.empresaId` to scope data — no cross-tenant access possible
- Registration creates empresa + usuario atomically with `role='admin'` (first user is always company admin)
- Multiple users can belong to the same empresa; each logs in with their own credentials
- Two authorization levels: `isAdmin=true` (platform admin) and `role='admin'` (company admin)
- Company admin routes guarded by `requireCompanyAdmin` middleware
- Frontend: `AuthContext` + `useAuth` hook, protected routing in `AppLayout`, 401 → redirect to /login
- Profile page (Onboarding) supports editing CNPJ, endereço, cidade, estado, CEP and changing password via PATCH /api/auth/senha

### Team Management (Equipe)

- Company admins can manage their team at `/equipe`
- API routes: `GET /api/empresa/usuarios`, `POST /api/empresa/usuarios`, `DELETE /api/empresa/usuarios/:id`, `PATCH /api/empresa/usuarios/:id`
- `POST /api/empresa/usuarios`: creates new user in same empresa, requires nome/email/senha/role
- `DELETE /api/empresa/usuarios/:id`: blocks self-removal and removal of last company admin
- `PATCH /api/empresa/usuarios/:id`: change user role ('admin'|'membro')
- Sidebar shows "Equipe" link only for users with `role='admin'` or `isAdmin=true`

### Monetization Model

**7-Day Trial System:**
- New users get `planoStatus = 'trial'` and `trialStartedAt = NOW()` on registration
- `requireAuth` middleware checks trial status on every protected route; returns 403 `{error: "TRIAL_EXPIRADO"}` when trial expires
- Trial banner shows in authenticated app header (days remaining) for users in trial
- `/trial-expirado` page (public route) shows expiry message + plan benefits + WhatsApp/email CTA
- Frontend auto-redirects expired trial users to `/trial-expirado`
- Users with `planoStatus = 'ativo'` have unrestricted access (no banner)
- `isAdmin` flag on users for future admin panel

### Onboarding: Jornada Estratégica Guiada

A guided onboarding journey implemented across the app:

- **`useJornadaProgresso` hook** (`client/src/hooks/useJornadaProgresso.ts`): Computes real-time completion state for all 11 jornada steps by querying existing API endpoints (no DB changes). Steps: Perfil → KPIs → PESTEL → Cinco Forças → BMC → SWOT → Estratégias → Oportunidades → Iniciativas → OKRs → Acompanhamento.
- **`JornadaEstrategica` component** (`client/src/components/JornadaEstrategica.tsx`): Collapsible card shown at the top of the dashboard (Home.tsx). Shows per-step status (complete/incomplete/blocked), progress bar, and CTA button for next pending step. Disappears when all 11 steps are complete.
- **`PrerequisiteWarning` component** (`client/src/components/PrerequisiteWarning.tsx`): Non-blocking info banner shown on pages with missing prerequisites. Used on SWOT (when no PESTEL/CincoForcas data), Estratégias (when SWOT < 4 items), OKRs (when no Estratégias — blocked by estratégias, not iniciativas), Oportunidades (when no Estratégias), and Iniciativas (when no Estratégias).
- **Sidebar completion indicators**: Each sidebar item in the jornada shows a CheckCircle2 (green) or Circle (gray) indicator. KPIs — Indicadores moved from "Marcha" group to above "Mapa" group (step 2 of jornada).
- **Redirect on first access**: New users without empresa are redirected to `/onboarding`. On completing the profile form, redirect goes to `/dashboard` (was `/pestel`).

### Key Features Implemented:

- **Priority Initiatives Portfolio:** Full CRUD for initiatives (title, description, status, priority, deadline, responsible, impact) with AI generation and anti-duplication.
- **OKR Management:** Full CRUD for Objectives and Key Results with AI-powered generation based on strategic context, including anti-duplication.
- **Balanced Scorecard (BSC) Dashboard:** Modern KPI dashboard with 4 perspective summary tiles (colored), large-number KPI cards with sparklines, status badges, and trend deltas. Click-to-drilldown Sheet panel with AreaChart evolution, period filters (3m/6m/12m/all), inline reading registration, and full history. Backend auto-updates `atual` and `status` fields when new readings are registered. Gap analysis section with progress bars. Full CRUD with AI generation and anti-duplication.
- **Management Rituals & Alerts System:**
    - Four ritual cadences (Daily, Weekly, Monthly, Quarterly) with pre-defined checklists and guiding questions.
    - Intelligent alerts for critical BSC indicators, overdue initiatives, and stale key results.
    - Persistent ritual checklists saved to the database.
- **Timeline of Events (Custom Events & Feed System):**
    - Unified feed/timeline showing both completed rituals and custom strategic events (e.g., Council Meetings, Exceptional Facts, Strategic Changes).
    - Full CRUD for custom events with various types and detailed logging capabilities.
    - Persistent ritual checklists saved to database as JSON.
    - Combined chronological view with visual distinction between event types.
- **Admin Panel (`/admin`):**
    - Restricted to users with `isAdmin === true` (both frontend guard and `requireAdmin` middleware on backend).
    - Admins bypass trial-blocking — they always have full access regardless of planoStatus.
    - Three tabs: Resumo (stat cards), Usuários (filters + Ativar/Suspender actions), Faturas (list + create + mark paid/cancel).
    - Sidebar shows "Administração" link only when `user.isAdmin === true`.
    - Admin API routes: `GET /api/admin/usuarios`, `POST /api/admin/usuarios/:id/ativar-plano`, `POST /api/admin/usuarios/:id/suspender`, `GET /api/admin/faturas`, `POST /api/admin/faturas`, `PATCH /api/admin/faturas/:id`.

## Scripts Utilitários

### Push para o GitHub (`scripts/push-github.sh`)
Envia todas as alterações para o repositório GitHub com um único comando:

```bash
bash scripts/push-github.sh "mensagem de commit"
```

- Se nenhuma mensagem for passada, usa a data/hora atual como mensagem padrão.
- O script detecta automaticamente a branch atual e empurra para `origin`.
- O remote `origin` já está configurado com autenticação para `https://github.com/mapati/BizGuideAI.git`.

## External Dependencies

**AI Integration:**
- OpenAI API for generating strategic insights, suggestions, and contextual assistance. All AI model names are fully configurable via the Admin panel — no hardcoded names in application logic.
- **Per-plan AI model configuration (Task #77):** The `configuracoes_ia` DB table stores 6 independent model fields: `modeloPadraoStart`, `modeloRelatoriosStart`, `modeloBuscaStart`, `modeloPadraoProEnt`, `modeloRelatoriosProEnt`, `modeloBuscaProEnt`. The Admin super-admin page (Modelos IA tab) exposes two sections (Plano Start / Plano Pro & Enterprise), each with 3 selectors. `getModelForPlan(planoTipo, tier)` in `server/routes.ts` picks the correct model by plan; `AI_MODELS` object holds 6 in-memory keys (start_padrao, start_relatorios, start_busca, pro_padrao, pro_relatorios, pro_busca) loaded from DB at startup and updated live on PATCH. Changes take effect immediately without server restart.

### Motor de Contexto Macro para IA (Task #61)

**Hidden super-admin feature** that auto-injects curated macroeconomic context into every AI prompt.

**Access:** Navigate directly to `/admin/contexto-macro` while logged in as the platform super-admin (isAdmin=true). The URL does NOT appear in any sidebar.

**Architecture:**
- `contexto_macro` DB table with 7 fixed categories (natural varchar PK)
- `buildContextoMacroIA()` in `server/routes.ts`: fetches active categories, caches for 60s
- Typed `injectMacroCtx(messages)` helper injects macro context into the system message of key AI routes (pestel, swot, swot-individual, swot-completo, assistente, explicar, gerar-estrategias)
- Web search features (PESTEL, análise competitiva, Contexto Macro) use **Google Custom Search JSON API** (`GOOGLE_API_KEY` + `GOOGLE_CX` secrets). The helper `googleSearch(query, numResults)` in `server/routes.ts` fetches snippets, which are injected into the prompt before calling the Azure LLM (`openai.chat.completions.create`) for synthesis. Falls back gracefully to Azure without web context if the Google keys are absent. No dependency on `OPENAI_API_KEY` for web search. Configure via Google Cloud Console + Programmable Search Engine.
- `node-cron` scheduler (hourly) auto-generates and auto-approves categories on schedule
- `requireSuperAdmin` middleware (checks `email === process.env.ADMIN_EMAIL`) guards all `/api/admin/contexto-macro/*` routes
- PATCH handler auto-computes `proximoAgendamento` server-side when `agendadorAtivo` is toggled on

**Admin API routes:**
- `GET /api/admin/contexto-macro` — list all 7 categories
- `PATCH /api/admin/contexto-macro/:categoria` — update any field
- `POST /api/admin/contexto-macro/:categoria/gerar` — AI generation (auto-approves if scheduler ON, saves draft if OFF)
- `POST /api/admin/contexto-macro/:categoria/aprovar` — approve draft → publish to textoAtivo
- `DELETE /api/admin/contexto-macro/:categoria/rascunho` — discard draft

**Scheduler logic:** When `agendadorAtivo=true AND proximoAgendamento <= NOW()`, the hourly cron generates fresh content, sets `textoAtivo`, and computes the next run based on frequency (diario/semanal/mensal).

**Database Service:**
- Neon serverless PostgreSQL, connected via `DATABASE_URL`.

**UI Component Libraries:**
- Radix UI primitives
- shadcn/ui component system
- Lucide React for icons
- cmdk for command palette
- embla-carousel for carousels
- date-fns for date manipulation

**Development Tools:**
- Replit-specific plugins (error overlays, cartographer, dev banners)
- tsx for direct TypeScript execution
- esbuild for production builds

**Design Resources:**
- Google Fonts (Inter, JetBrains Mono).