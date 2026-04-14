import type { CSSProperties } from "react";
import {
  Building2,
  FileText,
  CheckCircle2,
} from "lucide-react";

/* ─── Neural network node positions (viewBox 0 0 130 110) ─── */
const NN_NODES = {
  input:  [{ x: 18, y: 28 }, { x: 18, y: 55 }, { x: 18, y: 82 }],
  h1:     [{ x: 52, y: 18 }, { x: 52, y: 43 }, { x: 52, y: 68 }, { x: 52, y: 93 }],
  h2:     [{ x: 86, y: 28 }, { x: 86, y: 55 }, { x: 86, y: 82 }],
  output: [{ x: 116, y: 41 }, { x: 116, y: 70 }],
};

const NN_EDGE_DELAYS = [
  "0s","0.15s","0.3s","0.45s","0.6s","0.75s","0.9s","1.05s",
  "1.2s","1.35s","1.5s","1.65s","1.8s","1.95s","2.1s","2.25s",
  "2.4s","2.55s","2.7s","2.85s","3.0s","3.15s","3.3s","3.45s",
];
const NN_EDGES: Array<{ x1: number; y1: number; x2: number; y2: number; delay: string }> = [];
let edgeIdx = 0;
NN_NODES.input.forEach(a => NN_NODES.h1.forEach(b => {
  NN_EDGES.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, delay: NN_EDGE_DELAYS[edgeIdx++ % NN_EDGE_DELAYS.length] });
}));
NN_NODES.h1.forEach(a => NN_NODES.h2.forEach(b => {
  NN_EDGES.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, delay: NN_EDGE_DELAYS[edgeIdx++ % NN_EDGE_DELAYS.length] });
}));
NN_NODES.h2.forEach(a => NN_NODES.output.forEach(b => {
  NN_EDGES.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, delay: NN_EDGE_DELAYS[edgeIdx++ % NN_EDGE_DELAYS.length] });
}));

const PLAN_ROWS = [
  { label: "Diretrizes", pct: "100%", delay: "0s",   done: true  },
  { label: "Metas OKR",  pct: "82%",  delay: "0.5s", done: true  },
  { label: "Ações",      pct: "45%",  delay: "1.0s", done: false },
];

/*
 * SVG coordinate space: viewBox "0 0 990 380"
 *
 * The 4 chip paths in SVG coordinates — each chip exits the right edge of the
 * left panel (SVG x≈190) at its own y and curves smoothly into the core (495,190).
 * Right edge of left panel: px-8(32) + w-[138px] ≈ CSS 170 → SVG x≈190
 * Chip y centers (CSS→SVG, scale≈0.905, vOffset≈18):
 *   chip1 CSS≈200 → SVG≈201   chip3 CSS≈280 → SVG≈289
 *   chip2 CSS≈240 → SVG≈245   chip4 CSS≈320 → SVG≈334
 */
const CHIP_PATHS = [
  "M 190 201 C 340 201 440 190 495 190",
  "M 190 245 C 340 245 440 190 495 190",
  "M 190 289 C 340 289 440 190 495 190",
  "M 190 334 C 340 334 440 190 495 190",
];

/* Two packets per chip lane — offset by half the cycle duration (2.6s) */
const LEFT_PACKET_OFFSETS = ["0s", "1.3s"];

/* Three packets from core → plan, starting after ~1s processing delay */
const RIGHT_PACKET_OFFSETS = ["1.0s", "1.87s", "2.73s"];
const RIGHT_PATH = "M 495 190 C 650 190 740 190 840 190";

export function HeroDiagramaIA() {
  return (
    <div className="relative w-full bg-[#020817] rounded-xl border border-white/10 overflow-hidden font-sans" style={{ height: 380 }}>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes og-pulse-core {
          0%,100% { opacity: 0.4; transform: scale(0.97); }
          50%     { opacity: 0.9; transform: scale(1.03); }
        }
        @keyframes og-nn-signal {
          0%,40% { stroke-dashoffset: 60; opacity: 0; }
          50%    { opacity: 0.9; }
          100%   { stroke-dashoffset: 0;  opacity: 0; }
        }
        @keyframes og-node-pulse {
          0%,100% { r: 4;   opacity: 0.6; }
          50%     { r: 5.5; opacity: 1; }
        }
        @keyframes og-fill-bar {
          0%   { width: 0%; }
          100% { width: var(--tw, 100%); }
        }
        @keyframes og-float {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-6px); }
        }

        .og-pulse { animation: og-pulse-core 3s ease-in-out infinite; }
        .og-float { animation: og-float 6s ease-in-out infinite; }

        .og-nn-edge {
          fill: none;
          stroke: #818cf8;
          stroke-width: 1;
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: og-nn-signal 1.8s ease-in-out var(--ed,0s) infinite;
        }
        .og-nn-base {
          fill: none;
          stroke: rgba(99,102,241,0.12);
          stroke-width: 0.8;
        }
        .og-bar-fill {
          animation: og-fill-bar 2.5s ease-out var(--bd,0s) forwards;
        }
      ` }} />

      {/* Radial background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(56,189,248,0.06)_0%,transparent_70%)]" />

      {/* ── Main SVG ── paths + particles */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        viewBox="0 0 990 380"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Per-path gradients for left chip lanes */}
          {CHIP_PATHS.map((_, i) => (
            <linearGradient key={i} id={`og-chip-grad-${i}`} gradientUnits="userSpaceOnUse"
              x1="190" y1="0" x2="495" y2="0">
              <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.04" />
              <stop offset="60%"  stopColor="#38bdf8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.04" />
            </linearGradient>
          ))}
          <linearGradient id="og-grad-right" gradientUnits="userSpaceOnUse" x1="495" y1="190" x2="840" y2="190">
            <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0.04" />
            <stop offset="55%"  stopColor="#a78bfa" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.04" />
          </linearGradient>

          {/* Glow filters */}
          <filter id="og-glow-sm" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="og-glow-md" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── 4 chip guide paths (subtle) ── */}
        {CHIP_PATHS.map((d, i) => (
          <path key={i} d={d} fill="none"
            stroke={`url(#og-chip-grad-${i})`} strokeWidth="1.2"
            filter="url(#og-glow-sm)" />
        ))}
        {/* Arrow tip at core entry */}
        <polygon points="492,185 503,190 492,195" fill="#38bdf8" opacity="0.4" />

        {/* ── Right guide path (core → plan) ── */}
        <path d={RIGHT_PATH} fill="none"
          stroke="url(#og-grad-right)" strokeWidth="1.5"
          filter="url(#og-glow-sm)" />
        <polygon points="837,185 848,190 837,195" fill="#a78bfa" opacity="0.45" />

        {/* ── LEFT PARTICLES: 2 per chip lane × 4 chips = 8 spheres ── */}
        {CHIP_PATHS.flatMap((chipPath, ci) =>
          LEFT_PACKET_OFFSETS.map((offset, pi) => (
            <circle key={`l-${ci}-${pi}`} r="5.5" fill="#38bdf8" opacity="0" filter="url(#og-glow-md)">
              <animateMotion dur="2.6s" begin={offset} repeatCount="indefinite" calcMode="spline"
                keySplines="0.4 0 0.6 1" path={chipPath} />
              <animate attributeName="opacity" dur="2.6s" begin={offset} repeatCount="indefinite"
                values="0;0;1;1;0.8;0" keyTimes="0;0.04;0.12;0.80;0.92;1" />
              <animate attributeName="r" dur="2.6s" begin={offset} repeatCount="indefinite"
                values="3;5.5;5.5;4.5;3" keyTimes="0;0.12;0.80;0.92;1" />
            </circle>
          ))
        )}

        {/* ── RIGHT PARTICLES: 3 spheres from core to plan ── */}
        {RIGHT_PACKET_OFFSETS.map((offset, i) => (
          <circle key={`r-${i}`} r="5.5" fill="#a78bfa" opacity="0" filter="url(#og-glow-md)">
            <animateMotion dur="2.8s" begin={offset} repeatCount="indefinite" calcMode="spline"
              keySplines="0.4 0 0.6 1" path={RIGHT_PATH} />
            <animate attributeName="opacity" dur="2.8s" begin={offset} repeatCount="indefinite"
              values="0;0;1;1;0.8;0" keyTimes="0;0.04;0.12;0.80;0.92;1" />
            <animate attributeName="r" dur="2.8s" begin={offset} repeatCount="indefinite"
              values="3;5.5;5.5;4.5;3" keyTimes="0;0.12;0.80;0.92;1" />
          </circle>
        ))}
      </svg>

      {/* ── Three-column layout ── */}
      <div className="relative z-10 w-full h-full flex items-center justify-between px-8">

        {/* LEFT: Empresa */}
        <div className="flex flex-col items-center gap-3 w-[138px] og-float">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-sky-500/15 blur-xl og-pulse" />
            <div className="relative w-20 h-20 bg-[#0c1627] border border-sky-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.18)]">
              <Building2 className="w-9 h-9 text-sky-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-sm leading-tight">Perfil da<br />Empresa</p>
          </div>
          {["Dados Coletados", "Diagnóstico", "Mercado", "Cenários"].map((label, i) => (
            <div
              key={label}
              className="w-full flex items-center gap-1.5 bg-sky-500/5 border border-sky-500/15 rounded-lg px-2.5 py-1.5"
              style={{ opacity: 0.75 + i * 0.08 }}
            >
              {/* pulsing dot simulating data leaving this chip */}
              <div className="relative flex-shrink-0 w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-sky-400 animate-ping" style={{ animationDelay: `${i * 0.65}s`, animationDuration: "2.6s" }} />
                <span className="absolute inset-0 rounded-full bg-sky-300" />
              </div>
              <span className="text-sky-300/80 text-[10px]">{label}</span>
            </div>
          ))}
        </div>

        {/* CENTER: Núcleo IA */}
        <div className="flex flex-col items-center">
          <div className="relative z-20 flex flex-col items-center" style={{ width: 160, height: 160 }}>
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl og-pulse" />
            <div className="relative w-[160px] h-[160px] rounded-full border border-indigo-500/40 bg-[#07091f] shadow-[0_0_40px_rgba(99,102,241,0.3)] flex items-center justify-center overflow-hidden">
              <svg viewBox="0 0 130 110" className="w-full h-full" style={{ padding: "14px" }}>
                {NN_EDGES.map((e, i) => (
                  <line key={`b${i}`} className="og-nn-base" x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
                ))}
                {NN_EDGES.map((e, i) => (
                  <line key={`s${i}`} className="og-nn-edge" x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                    style={{ "--ed": e.delay } as CSSProperties} />
                ))}
                {NN_NODES.input.map((n, i) => (
                  <circle key={`in${i}`} cx={n.x} cy={n.y} r="4.5" fill="#38bdf8" opacity="0.8"
                    style={{ animation: `og-node-pulse 2s ease-in-out ${i * 0.4}s infinite` }} />
                ))}
                {NN_NODES.h1.map((n, i) => (
                  <circle key={`h1${i}`} cx={n.x} cy={n.y} r="4" fill="#818cf8" opacity="0.75"
                    style={{ animation: `og-node-pulse 2s ease-in-out ${0.2 + i * 0.3}s infinite` }} />
                ))}
                {NN_NODES.h2.map((n, i) => (
                  <circle key={`h2${i}`} cx={n.x} cy={n.y} r="4" fill="#a5b4fc" opacity="0.75"
                    style={{ animation: `og-node-pulse 2s ease-in-out ${0.4 + i * 0.35}s infinite` }} />
                ))}
                {NN_NODES.output.map((n, i) => (
                  <circle key={`out${i}`} cx={n.x} cy={n.y} r="5" fill="#c084fc" opacity="0.9"
                    style={{ animation: `og-node-pulse 2s ease-in-out ${0.6 + i * 0.5}s infinite` }} />
                ))}
              </svg>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(99,102,241,0.12) 50%, transparent 100%)", animation: "og-pulse-core 2.5s ease-in-out infinite" }}
              />
            </div>
          </div>
          <div className="mt-3 text-center">
            <p className="text-white font-bold text-sm tracking-wider">Núcleo IA</p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400/80 text-[9px] font-mono uppercase tracking-widest">processando</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Plano Estratégico */}
        <div className="w-[175px] relative og-float" style={{ animationDelay: "1.5s" }}>
          <div className="absolute inset-0 rounded-xl bg-violet-500/10 blur-xl og-pulse" style={{ animationDelay: "0.8s" } as CSSProperties} />
          <div className="relative bg-[#0a0e1e]/90 border border-violet-500/30 rounded-xl p-4 shadow-[0_0_25px_rgba(139,92,246,0.15)] backdrop-blur-md">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/5">
              <div className="w-9 h-9 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-violet-300" />
              </div>
              <div>
                <p className="text-white font-semibold text-xs leading-tight">Plano<br />Estratégico</p>
                <p className="text-violet-400/60 text-[9px] font-mono mt-0.5 uppercase">Gerado por IA</p>
              </div>
            </div>

            {PLAN_ROWS.map(({ label, pct, delay, done }) => (
              <div key={label} className="space-y-1 mb-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className={`w-2.5 h-2.5 ${done ? "text-emerald-400" : "text-slate-600"}`} />
                    {label}
                  </span>
                  <span className="text-[9px] text-white font-mono">{pct}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full og-bar-fill"
                    style={{ "--tw": pct, "--bd": delay } as CSSProperties}
                  />
                </div>
              </div>
            ))}

            <button className="w-full mt-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-300 font-medium tracking-wide hover:bg-violet-500/20 transition-colors">
              Visualizar Plano
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
