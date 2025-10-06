# Design Guidelines: Aplicativo de Planejamento Estratégico

## Design Approach

**Selected Approach:** Design System Hybrid (Linear + Notion + Stripe inspiration)

**Justification:** This is a utility-focused, information-dense productivity application requiring clarity, professional credibility, and educational guidance. The design must balance sophistication with approachability for non-technical business owners.

**Core Principles:**
1. **Clarity Over Complexity** - Every element serves user comprehension
2. **Progressive Disclosure** - Guide users through complex frameworks step-by-step
3. **Contextual Education** - Embedded micro-learning without disruption
4. **Action-Oriented** - Clear CTAs and next steps always visible

---

## Color Palette

### Light Mode
- **Primary Brand:** 240 60% 45% (deep professional blue - trust, strategy)
- **Primary Hover:** 240 60% 38%
- **Secondary/Accent:** 160 45% 48% (balanced teal - growth, action)
- **Background Base:** 0 0% 100%
- **Background Elevated:** 240 20% 98%
- **Background Subtle:** 240 15% 96%
- **Text Primary:** 240 15% 15%
- **Text Secondary:** 240 8% 45%
- **Border Default:** 240 10% 88%
- **Success:** 145 65% 42%
- **Warning:** 35 90% 55%
- **Error:** 0 70% 50%

### Dark Mode
- **Primary Brand:** 240 55% 60%
- **Primary Hover:** 240 55% 68%
- **Secondary/Accent:** 160 40% 55%
- **Background Base:** 240 8% 12%
- **Background Elevated:** 240 6% 16%
- **Background Subtle:** 240 5% 20%
- **Text Primary:** 240 5% 92%
- **Text Secondary:** 240 5% 65%
- **Border Default:** 240 8% 28%

---

## Typography

**Primary Font:** Inter (Google Fonts) - clarity, professionalism
**Monospace:** JetBrains Mono (for metrics/KPIs)

### Scale
- **Display (H1):** 36px / 600 weight / -0.02em tracking
- **Heading (H2):** 28px / 600 weight / -0.01em tracking
- **Subheading (H3):** 20px / 600 weight / normal tracking
- **Body Large:** 16px / 400 weight / normal tracking
- **Body:** 14px / 400 weight / normal tracking
- **Caption:** 13px / 500 weight / 0.01em tracking
- **Label:** 12px / 600 weight / 0.04em tracking (uppercase)

### Hierarchy Rules
- Section titles: H2 + subtle border-bottom
- Card headers: H3 + secondary text pairing
- Metric displays: Monospace font, larger size, bold weight
- Microcopy/tooltips: Caption size, secondary color

---

## Layout System

**Spacing Primitives:** Tailwind units of **2, 4, 6, 8, 12, 16, 20, 24** (p-2, m-4, gap-6, etc.)

### Grid Structure
- **Container Max-Width:** max-w-7xl (1280px)
- **Content Max-Width:** max-w-5xl (1024px) for wizards/forms
- **Sidebar Width:** 280px (navigation) / 320px (assistant panel)
- **Card Padding:** p-6 on desktop, p-4 on mobile
- **Section Spacing:** py-12 on desktop, py-8 on mobile

### Layout Patterns
- **Dashboard:** Sidebar + main content area with metric cards grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- **Wizards:** Centered single-column (max-w-3xl) with progress indicator
- **Canvas Tools (BMC, SWOT):** Full-width with drag-drop zones
- **Forms:** Two-column on desktop (lg:grid-cols-2), single on mobile

---

## Component Library

### Navigation
- **Top Bar:** Fixed, 64px height, glass-morphism effect (backdrop-blur-lg bg-white/80 dark:bg-gray-900/80)
- **Sidebar:** Persistent on desktop, slide-over on mobile, grouped navigation with icons
- **Progress Indicator:** Stepped progress bar for wizards (current/total steps)

### Cards & Containers
- **Metric Card:** Rounded-lg, subtle shadow, hover lift effect, icon + value + label + trend indicator
- **Framework Card (PESTEL/5F):** Expandable accordion with header showing summary, impact badge
- **Canvas Block (BMC):** Draggable card with dotted border, rounded corners, colored header by type
- **Priority Matrix Cell:** Grid item with impact/effort axes, color-coded by decision

### Forms & Inputs
- **Text Input:** Rounded-md, focus ring in primary color, label above, helper text below
- **Select/Dropdown:** Custom styled with chevron icon, search when >5 options
- **Slider (Weight 1-5):** Track with pip markers, large thumb, value display
- **Radio/Checkbox:** Larger touch targets (24px), custom styled, aligned left

### Buttons & Actions
- **Primary CTA:** Solid bg-primary, white text, rounded-lg, px-6 py-3, medium weight
- **Secondary:** Outline with border-primary, text-primary, same size as primary
- **Ghost:** No border, text-secondary, hover bg-subtle
- **Floating AI Assistant:** 56px circle, fixed bottom-right, primary color, pulse animation, extends to panel on click

### Data Display
- **NSM Hero Card:** Extra large metric display, trend graph sparkline, period selector
- **KPI Grid:** 4-column on desktop, compact cards with semaphore indicators (green/yellow/red dots)
- **Table:** Striped rows, sortable headers, sticky header on scroll, row hover highlight
- **Timeline/Gantt (OKRs):** Horizontal bars with owner avatars, progress fill, milestone markers

### Overlays & Modals
- **Tooltip:** Rounded-md, max-width 280px, primary text, subtle shadow, arrow pointer
- **Modal:** Centered, max-w-2xl, rounded-xl, backdrop blur + dim
- **Slide-over (Assistant):** Right-aligned, 480px width, full height, with tabs for 4 modes
- **Alert Banner:** Top of page, dismissible, icon + message, color-coded by type

### Educational Elements
- **"?" Help Icon:** Subtle, hover reveals tooltip with 2-4 line explanation
- **Example Card:** Light background, italic text, "Exemplo típico:" prefix
- **Concept Callout:** Left border accent, icon, heading + 3-4 lines, "Entenda em 10s" label

---

## Animations

**Principle:** Minimal and purposeful only

- **Page Transitions:** 200ms fade-in for content
- **Card Hover:** Subtle lift (translateY -2px) + shadow increase, 150ms ease
- **Button Press:** Scale 0.98, 100ms
- **Accordion Expand:** Height animation 250ms ease-out
- **Drag & Drop:** Opacity 0.6 while dragging, snap animation 200ms
- **AI Assistant Pulse:** Gentle scale pulse (1.0 to 1.05) every 3s when idle

---

## Images

**Hero/Welcome Section:** Professional illustration or photo showing strategic planning (board room, strategy canvas, executive team). Suggested placement: top of onboarding flow, 40% viewport height, with gradient overlay for text readability.

**Empty States:** Simple line illustrations for each framework (PESTEL globe, Porter forces diagram, BMC canvas outline) - SVG format, monochromatic in primary color.

**Feature Education:** Icon-based illustrations (not photos) for tooltips and micro-lessons - maintain consistent style across all educational content.