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

const delays = [
  "0s","0.15s","0.3s","0.45s","0.6s","0.75s","0.9s","1.05s",
  "1.2s","1.35s","1.5s","1.65s","1.8s","1.95s","2.1s","2.25s",
  "2.4s","2.55s","2.7s","2.85s","3.0s","3.15s","3.3s","3.45s",
];
const NN_EDGES: Array<{ x1: number; y1: number; x2: number; y2: number; delay: string }> = [];
let edgeIdx = 0;
NN_NODES.input.forEach(a => NN_NODES.h1.forEach(b => {
  NN_EDGES.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, delay: delays[edgeIdx++ % delays.length] });
}));
NN_NODES.h1.forEach(a => NN_NODES.h2.forEach(b => {
  NN_EDGES.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, delay: delays[edgeIdx++ % delays.length] });
}));
NN_NODES.h2.forEach(a => NN_NODES.output.forEach(b => {
  NN_EDGES.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, delay: delays[edgeIdx++ % delays.length] });
}));

const LEFT_PACKETS  = [{ dur: "2.0s", delay: "0.0s" }, { dur: "2.0s", delay: "0.7s" }, { dur: "2.0s", delay: "1.4s" }];
const RIGHT_PACKETS = [{ dur: "2.2s", delay: "0.3s" }, { dur: "2.2s", delay: "1.1s" }, { dur: "2.2s", delay: "1.9s" }];

const PLAN_ROWS = [
  { label: "Diretrizes", pct: "100%", delay: "0s",   done: true  },
  { label: "Metas OKR",  pct: "82%",  delay: "0.5s", done: true  },
  { label: "Ações",      pct: "45%",  delay: "1.0s", done: false },
];

/* Height & vertical center for this component */
const H = 380;
const CY = H / 2; // 190

export function HeroDiagramaIA() {
  return (
    <div className="relative w-full bg-[#020817] rounded-xl border border-white/10 overflow-hidden font-sans" style={{ height: H }}>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes og-pulse-core {
          0%,100% { opacity: 0.4; transform: scale(0.97); }
          50%     { opacity: 0.9; transform: scale(1.03); }
        }
        @keyframes og-packet-left {
          0%   { offset-distance: 0%;   opacity: 0; }
          5%   { opacity: 1; }
          90%  { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes og-packet-right {
          0%   { offset-distance: 0%;   opacity: 0; }
          5%   { opacity: 1; }
          90%  { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
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

        .og-pkt-left {
          offset-path: path('M 155 ${CY} C 260 ${CY} 340 ${CY} 400 ${CY}');
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #38bdf8;
          box-shadow: 0 0 8px 3px rgba(56,189,248,0.7);
          position: absolute;
          animation: og-packet-left var(--dur,2s) linear var(--del,0s) infinite;
        }
        .og-pkt-right {
          offset-path: path('M 600 ${CY} C 660 ${CY} 740 ${CY} 830 ${CY}');
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #a78bfa;
          box-shadow: 0 0 8px 3px rgba(167,139,250,0.7);
          position: absolute;
          animation: og-packet-right var(--dur,2.2s) linear var(--del,0s) infinite;
        }

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

      {/* Main SVG — tubes only */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        viewBox={`0 0 990 ${H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="og-grad-left" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.05" />
            <stop offset="50%"  stopColor="#38bdf8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="og-grad-right" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0.05" />
            <stop offset="50%"  stopColor="#a78bfa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.05" />
          </linearGradient>
          <filter id="og-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Left tube: Empresa → Core */}
        <path d={`M 155 ${CY} C 260 ${CY} 340 ${CY} 400 ${CY}`}
          stroke="url(#og-grad-left)" strokeWidth="2" fill="none" filter="url(#og-glow)" />
        <polygon points={`398,${CY - 5} 410,${CY} 398,${CY + 5}`} fill="#38bdf8" opacity="0.5" />

        {/* Right tube: Core → Plano */}
        <path d={`M 590 ${CY} C 650 ${CY} 730 ${CY} 835 ${CY}`}
          stroke="url(#og-grad-right)" strokeWidth="2" fill="none" filter="url(#og-glow)" />
        <polygon points={`833,${CY - 5} 845,${CY} 833,${CY + 5}`} fill="#a78bfa" opacity="0.5" />
      </svg>

      {/* Animated data packets (CSS motion-path) */}
      {LEFT_PACKETS.map((p, i) => (
        <div key={i} className="og-pkt-left" style={{ "--dur": p.dur, "--del": p.delay } as CSSProperties} />
      ))}
      {RIGHT_PACKETS.map((p, i) => (
        <div key={i} className="og-pkt-right" style={{ "--dur": p.dur, "--del": p.delay } as CSSProperties} />
      ))}

      {/* ── Three-column layout ── */}
      <div className="relative z-10 w-full h-full flex items-center justify-between px-8">

        {/* LEFT: Empresa */}
        <div className="flex flex-col items-center gap-3 w-[138px] og-float">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-sky-500/15 blur-xl og-pulse" />
            <div className="relative w-20 h-20 bg-[#0c1627] border border-sky-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.18)]">
              <Building2 className="w-9 h-9 text-sky-400" />
            </div>
            <div className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" style={{ animationDuration: "1.4s" }} />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-sm leading-tight">Perfil da<br />Empresa</p>
            <p className="text-sky-400/60 text-[10px] font-mono mt-1 uppercase tracking-wider">→ dados</p>
          </div>
          {["Missão", "Mercado", "Finanças"].map((label, i) => (
            <div
              key={label}
              className="w-full flex items-center gap-1.5 bg-sky-500/5 border border-sky-500/15 rounded-lg px-2.5 py-1.5"
              style={{ opacity: 0.7 + i * 0.1 }}
            >
              <div className="w-1 h-1 rounded-full bg-sky-400 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
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
