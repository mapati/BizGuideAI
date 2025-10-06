# Strategic Planning Application

## Overview

This is a web-based strategic planning application designed to guide entrepreneurs, partners, and CEOs through a complete strategic planning and management journey without business jargon. The application uses AI to transform simple user responses into professional strategic frameworks including PESTEL analysis, SWOT analysis, OKRs (Objectives and Key Results), and BSC (Balanced Scorecard).

**Core Purpose:** Enable business owners without formal management or accounting training to create a comprehensive "One-Page Strategy" document in one day, then execute it with structured rituals and alerts.

**Target Language:** Brazilian Portuguese (pt-BR)  
**User Experience Philosophy:** "Senior consultant + patient teacher" - simple, direct, positive communication

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React with TypeScript  
**Build Tool:** Vite  
**Routing:** Wouter (lightweight client-side routing)  
**State Management:** TanStack Query (React Query) for server state  
**UI Framework:** shadcn/ui component library with Radix UI primitives  
**Styling:** Tailwind CSS with custom design tokens

**Design System:**
- Hybrid approach inspired by Linear, Notion, and Stripe
- Core principles: Clarity over complexity, progressive disclosure, contextual education, action-oriented
- Light and dark mode support with custom color palettes
- Typography: Inter (primary), JetBrains Mono (metrics/KPIs)
- Custom HSL-based theming system with CSS variables

**Key Components:**
- Page layouts with consistent headers and navigation
- Reusable metric cards, progress bars, badges, and status indicators
- AI Assistant component for contextual help
- Form components with validation using react-hook-form and zod
- Empty states and example cards for user guidance

### Backend Architecture

**Runtime:** Node.js with Express  
**Language:** TypeScript (ESM modules)  
**API Style:** RESTful JSON API under `/api/*` routes  
**Development Server:** Vite middleware for HMR in development

**Route Structure:**
- Company/organization profile management (`/api/empresa`)
- PESTEL factor analysis (`/api/fatores-pestel/:empresaId`)
- Five Forces analysis (`/api/cinco-forcas/:empresaId`)
- SWOT analysis (`/api/analise-swot/:empresaId`)
- Business Model Canvas (`/api/modelo-negocio/:empresaId`)
- Strategic planning (`/api/estrategias/:empresaId`)
- Growth opportunities - Ansoff Matrix (`/api/oportunidades-crescimento/:empresaId`)
- Priority initiatives (`/api/iniciativas/:empresaId`)
- OKR management (`/api/objetivos`, `/api/resultados-chave`)
- BSC indicators (`/api/indicadores/:empresaId`)

**Error Handling:** Centralized error middleware with standardized JSON error responses

### Data Storage Solutions

**Database:** PostgreSQL (via Neon serverless)  
**ORM:** Drizzle ORM with Drizzle Kit for migrations  
**Schema Validation:** Zod schemas generated from Drizzle tables using drizzle-zod

**Database Schema:**
- `empresas` - Company/organization profiles
- `fatores_pestel` - External factors analysis (Political, Economic, Social, Technological, Environmental, Legal)
- `cinco_forcas` - Porter's Five Forces competitive analysis
- `analise_swot` - Strengths, Weaknesses, Opportunities, Threats analysis
- `modelo_negocio` - Business Model Canvas blocks
- `estrategias` - TOWS strategic matrix (FO, FA, DO, DA strategies)
- `oportunidades_crescimento` - Ansoff Matrix growth opportunities (penetração_mercado, desenvolvimento_mercado, desenvolvimento_produto, diversificação)
- `iniciativas` - Priority initiatives portfolio (status, prioridade, prazo, responsavel, impacto)
- `objetivos` - Strategic objectives (for OKRs)
- `resultados_chave` - Key results linked to objectives
- `indicadores` - BSC performance indicators across four perspectives

**Data Flow Pattern:**
1. Client makes request via TanStack Query
2. Request hits Express API route
3. Route handler validates input with Zod schemas
4. Storage layer executes Drizzle ORM queries
5. Response returned as JSON
6. TanStack Query caches and updates UI

### Authentication and Authorization

Currently not implemented - appears to be single-user application design. Future consideration for multi-user support would require session management (connect-pg-simple dependency present for PostgreSQL session storage).

### External Dependencies

**AI Integration:**
- OpenAI API (GPT-4o-mini) for generating strategic insights and suggestions
- Used for explaining frameworks, generating examples, and providing contextual assistance
- AI endpoints with anti-duplication safeguards (both prompt-based and programmatic filtering)
- API key configured via `OPENAI_API_KEY` environment variable
- All AI generation uses temperature 0.8 for creative yet consistent outputs

**Database Service:**
- Neon serverless PostgreSQL
- WebSocket support for serverless connections
- Connection string via `DATABASE_URL` environment variable

**UI Component Libraries:**
- Radix UI primitives (dialogs, dropdowns, tooltips, etc.)
- shadcn/ui component system
- Lucide React for icons
- cmdk for command palette functionality
- embla-carousel for carousels
- date-fns for date manipulation

**Development Tools:**
- Replit-specific plugins for error overlays, cartographer, and dev banners (development only)
- tsx for running TypeScript directly
- esbuild for production builds

**Design Resources:**
- Google Fonts (Inter, JetBrains Mono)
- Custom Tailwind configuration with extended color palette and design tokens

## Recent Changes (October 2025)

### Iniciativas Prioritárias (Priority Initiatives Portfolio)
**Date:** October 6, 2025  
**Feature:** Complete priority initiatives management system for strategy execution

**Implementation:**
- Database table `iniciativas` with fields: titulo, descricao, status, prioridade, prazo, responsavel, impacto
- Full CRUD API endpoints at `/api/iniciativas/:empresaId`
- AI generation endpoint `/api/ai/gerar-iniciativas` that generates 5 unique initiatives
- Frontend page at `/iniciativas` with grouping by priority level (alta, média, baixa)
- Anti-duplication system: AI prompt instructions + programmatic filtering (case-insensitive title comparison)
- Integration with existing estrategias and oportunidades_crescimento for context-aware AI generation

**Key Features:**
- AI generates 5 initiatives based on company profile, strategies, and growth opportunities
- Manual CRUD operations with full form validation
- Visual organization by priority with distinct sections
- Status tracking: planejada, em_andamento, concluida, pausada
- Impact assessment: alto, médio, baixo
- Responsible party and deadline tracking
- Seamless integration with sidebar navigation

**Technical Notes:**
- Fixed `apiRequest` function to properly parse JSON responses (added `.json()` call)
- Consistent with established UI/UX patterns across the application
- Follows anti-duplication pattern established in Estrategias and Oportunidades features

### OKRs (Objectives and Key Results) - AI-Powered Generation
**Date:** October 6, 2025  
**Feature:** Complete OKR management system connecting Apostas to Marcha (execution)

**Implementation:**
- Database tables: `objetivos` (titulo, descricao, prazo), `resultados_chave` (metrica, valorInicial, valorAlvo, valorAtual, owner, prazo)
- Full CRUD API endpoints at `/api/objetivos/:empresaId` and `/api/resultados-chave/:objetivoId`
- AI generation endpoint `/api/ai/gerar-objetivos` that generates 3 unique strategic objectives
- Frontend page at `/okrs` with visual cards showing objectives
- Anti-duplication system: AI prompt instructions + programmatic filtering (case-insensitive title comparison)
- Context-aware generation based on estrategias, oportunidades_crescimento, and iniciativas

**Key Features:**
- AI generates 3 qualitative, aspirational objectives aligned with strategic bets
- Manual objective creation with titulo, descricao (optional), and prazo
- Text-based objectives (no numeric targets at objective level)
- Integration with Apostas context for relevant strategic alignment
- Delete functionality for objectives
- Empty state with prominent AI generation CTA

**AI Context:**
- Empresa profile (nome, setor, descricao)
- Estrategias (TOWS matrix strategies)
- Oportunidades de Crescimento (Ansoff matrix opportunities)
- Iniciativas Prioritárias (priority initiatives portfolio)
- Existing objectives (for anti-duplication)

### BSC (Balanced Scorecard) Indicators - AI-Powered Generation
**Date:** October 6, 2025  
**Feature:** Complete BSC indicator management across 4 perspectives

**Implementation:**
- Database table: `indicadores` (perspectiva, nome, meta, atual, status, owner)
- Full CRUD API endpoints at `/api/indicadores/:empresaId`
- AI generation endpoint `/api/ai/gerar-indicadores` that generates 8 unique indicators (2 per perspective)
- Frontend page at `/bsc` with 4 perspective cards (Finanças, Clientes, Processos, Pessoas)
- Anti-duplication system: AI prompt instructions + programmatic filtering (case-insensitive nome comparison)
- Context-aware generation based on objetivos, estrategias, oportunidades, and iniciativas

**Key Features:**
- AI generates 8 indicators distributed across 4 BSC perspectives
- Manual indicator creation with full form: perspectiva, nome, meta, atual, status, owner
- Visual organization by perspective with distinct icons (DollarSign, Users, Zap, Target)
- Status tracking with semaphore badges (verde, amarelo, vermelho)
- Text-based meta/atual values (no strict numeric enforcement)
- Delete functionality for indicators
- Empty state per perspective when no indicators exist

**BSC Perspectives:**
1. **Finanças** - Financial metrics (e.g., Margem Bruta, Lucro Operacional)
2. **Clientes** - Customer satisfaction metrics (e.g., Entregas no Prazo, Satisfação)
3. **Processos** - Internal process efficiency (e.g., Eficiência dos Equipamentos, Perda de Material)
4. **Pessoas** - Human capital development (e.g., Horas de Treinamento, Rotatividade)

**AI Context:**
- Empresa profile
- Objetivos estratégicos (OKRs)
- Estrategias (TOWS)
- Oportunidades de Crescimento (Ansoff)
- Iniciativas Prioritárias
- Existing indicadores (for anti-duplication)

**Technical Notes:**
- All AI endpoints use temperature 0.8 for creative yet consistent outputs
- Anti-duplication pattern: prompt-based warnings + programmatic Set-based filtering
- Frontend auto-creates items after AI generation (loops through returned array)
- Toast notifications for user feedback on generation success/failure