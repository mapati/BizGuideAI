# Strategic Planning Application

## Overview

This web-based strategic planning application assists entrepreneurs, partners, and CEOs in their strategic planning and management journey. It leverages AI to transform simple user input into professional strategic frameworks such as PESTEL, SWOT, OKRs, and Balanced Scorecard. The primary goal is to empower business owners without formal training to develop a "One-Page Strategy" and execute it through structured rituals and alerts. The application is designed for Brazilian Portuguese speakers, adopting a "Senior consultant + patient teacher" communication style. The project aims to provide comprehensive strategic management capabilities, from initial analysis to execution and monitoring, fostering business growth and clarity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React and TypeScript, using Vite for tooling, Wouter for routing, TanStack Query for state management, and shadcn/ui with Radix UI primitives and Tailwind CSS for styling. The design system is inspired by Linear, Notion, and Stripe, focusing on clarity, progressive disclosure, contextual education, and action orientation, featuring light/dark modes and custom HSL-based theming.

### Backend
The backend utilizes Node.js with Express and TypeScript, exposing a RESTful JSON API. Key API routes manage company profiles, strategic analysis frameworks (PESTEL, Five Forces, SWOT, Business Model Canvas, Ansoff Matrix), strategic planning and execution (Strategies, Priority Initiatives, OKRs, BSC Indicators), management rituals, alerts, and custom events. Error handling is centralized for standardized responses.

### Data Storage
PostgreSQL (Neon serverless) is used for the database, with Drizzle ORM and Drizzle Kit for migrations. Zod schemas provide data validation. Core tables include `empresas` (company profiles), `usuarios` (user accounts), various strategic framework tables, `rituais`, `eventos`, `faturas`, and `contexto_macro` for AI-curated macroeconomic context.

### Authentication and Authorization
The system supports a multi-company SaaS model with full data isolation. Authentication uses `express-session` with PostgreSQL-backed sessions. All API routes are protected by `requireAuth` middleware, ensuring data is scoped by `empresaId`. Registration atomically creates a company and its first administrator user. Two authorization levels exist: platform `isAdmin` and company `role='admin'`. Team management features allow company administrators to manage users within their organization.

### Monetization
A 7-day trial system is implemented, where new users start with `planoStatus = 'trial'`. Access is restricted upon trial expiry, redirecting users to a dedicated page for plan benefits and contact information.

### Guided Onboarding (Jornada Estratégica)
A guided onboarding journey facilitates user engagement through 11 strategic steps. A `useJornadaProgresso` hook tracks completion status, and a `JornadaEstrategica` component displays progress on the dashboard. `PrerequisiteWarning` components provide contextual guidance on pages with unmet dependencies. Sidebar indicators show step completion, and new users are guided through an initial profile setup.

### Key Features
- **Priority Initiatives Portfolio:** CRUD operations for initiatives with AI generation and anti-duplication.
- **OKR Management:** CRUD for Objectives and Key Results, leveraging AI for generation based on strategic context.
- **Strategy Traceability View:** Each strategy card on `/estrategias` has a clickable counter (data-testid: `button-ver-vinculados-{id}`) that opens a Sheet panel showing all linked Iniciativas and OKRs with title, status, and progress. Backend endpoint `GET /api/estrategias/:id/vinculados` returns detailed lists; OKR progress is computed from resultadosChave averages; initiative progress maps status to 0/50/100%.
- **Balanced Scorecard (BSC) Dashboard:** A KPI dashboard with 4 perspective summary tiles, detailed KPI cards, trend analysis, reading registration, and historical data.
- **Management Rituals & Alerts:** Pre-defined ritual cadences (Daily, Weekly, Monthly, Quarterly) with checklists and intelligent alerts for critical indicators, overdue initiatives, and stale key results.
- **Timeline of Events:** A unified feed combining completed rituals and custom strategic events, with full CRUD for event management.
- **Admin Panel:** A restricted interface for platform administrators to manage users, invoices, and system configurations, bypassing trial limitations.

## External Dependencies

-   **AI Integration:** OpenAI API for generating strategic insights, suggestions, and contextual assistance. AI model names are configurable per plan via the Admin panel.
-   **Web Search:** Google Custom Search JSON API for injecting web context into AI prompts, used in features like PESTEL and competitive analysis.
-   **Database:** Neon serverless PostgreSQL.
-   **UI Component Libraries:** Radix UI primitives, shadcn/ui, Lucide React, cmdk, embla-carousel, date-fns.
-   **Design Resources:** Google Fonts (Inter, JetBrains Mono).
-   **Payment Gateway:** Mercado Pago (referenced in `empresas` table for subscription management).