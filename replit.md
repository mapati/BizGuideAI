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
- SWOT analysis (`/api/analise-swot/:empresaId`)
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
- `analise_swot` - Strengths, Weaknesses, Opportunities, Threats analysis
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
- OpenAI API for generating strategic insights and suggestions
- Used for explaining frameworks, generating examples, and providing contextual assistance
- API key configured via `OPENAI_API_KEY` environment variable

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