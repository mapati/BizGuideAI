import React from "react";
import {
  Building2,
  BrainCircuit,
  Target,
  BarChart3,
  Globe2,
  Briefcase,
  Lightbulb,
  Rocket,
} from "lucide-react";

export function NeuralPulse() {
  return (
    <div className="relative w-full h-[580px] bg-[#020817] overflow-hidden flex items-center justify-center font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-sky-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-900/30 blur-[100px] rounded-full pointer-events-none" />

      {/* SVG Canvas — viewBox 1000×580 for absolute coordinate accuracy */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1000 580"
        preserveAspectRatio="xMidYMid meet"
        style={{ zIndex: 1 }}
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <linearGradient id="line-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="line-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="line-gradient-3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Company (x=150,y=290) → AI Core (x=350,y=290) */}
        <path d="M 150 290 L 350 290" stroke="url(#line-gradient-1)" strokeWidth="2" fill="none" opacity="0.5" />
        <path d="M 150 290 L 350 290" stroke="#38bdf8" strokeWidth="3" fill="none" strokeDasharray="10 100" className="animate-[flow_3s_linear_infinite]" filter="url(#glow)" />

        {/* AI Core → Tool 1 (y=116) */}
        <path d="M 350 290 C 450 290 500 116 650 116" stroke="url(#line-gradient-2)" strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M 350 290 C 450 290 500 116 650 116" stroke="#818cf8" strokeWidth="2" fill="none" strokeDasharray="15 150" className="animate-[flow_3.5s_linear_infinite]" style={{ animationDelay: '0.2s' }} filter="url(#glow)" />

        {/* AI Core → Tool 2 (y=203) */}
        <path d="M 350 290 C 450 290 500 203 650 203" stroke="url(#line-gradient-2)" strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M 350 290 C 450 290 500 203 650 203" stroke="#818cf8" strokeWidth="2" fill="none" strokeDasharray="15 150" className="animate-[flow_3.2s_linear_infinite]" style={{ animationDelay: '0.5s' }} filter="url(#glow)" />

        {/* AI Core → Tool 3 (y=290) */}
        <path d="M 350 290 L 650 290" stroke="url(#line-gradient-2)" strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M 350 290 L 650 290" stroke="#818cf8" strokeWidth="2" fill="none" strokeDasharray="15 150" className="animate-[flow_3s_linear_infinite]" style={{ animationDelay: '0.8s' }} filter="url(#glow)" />

        {/* AI Core → Tool 4 (y=377) */}
        <path d="M 350 290 C 450 290 500 377 650 377" stroke="url(#line-gradient-2)" strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M 350 290 C 450 290 500 377 650 377" stroke="#818cf8" strokeWidth="2" fill="none" strokeDasharray="15 150" className="animate-[flow_3.4s_linear_infinite]" style={{ animationDelay: '1.1s' }} filter="url(#glow)" />

        {/* AI Core → Tool 5 (y=464) */}
        <path d="M 350 290 C 450 290 500 464 650 464" stroke="url(#line-gradient-2)" strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M 350 290 C 450 290 500 464 650 464" stroke="#818cf8" strokeWidth="2" fill="none" strokeDasharray="15 150" className="animate-[flow_3.6s_linear_infinite]" style={{ animationDelay: '1.4s' }} filter="url(#glow)" />

        {/* Tool 1 → Plan (x=850,y=290) */}
        <path d="M 650 116 C 750 116 800 290 850 290" stroke="url(#line-gradient-3)" strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M 650 116 C 750 116 800 290 850 290" stroke="#c084fc" strokeWidth="2" fill="none" strokeDasharray="15 150" className="animate-[flow_3.5s_linear_infinite]" style={{ animationDelay: '1s' }} filter="url(#glow)" />

        {/* Tool 2 → Plan */}
        <path d="M 650 203 C 750 203 800 290 850 290" stroke="url(#line-gradient-3)" strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M 650 203 C 750 203 800 290 850 290" stroke="#c084fc" strokeWidth="2" fill="none" strokeDasharray="15 150" className="animate-[flow_3.2s_linear_infinite]" style={{ animationDelay: '1.3s' }} filter="url(#glow)" />

        {/* Tool 3 → Plan */}
        <path d="M 650 290 L 850 290" stroke="url(#line-gradient-3)" strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M 650 290 L 850 290" stroke="#c084fc" strokeWidth="2" fill="none" strokeDasharray="15 150" className="animate-[flow_3s_linear_infinite]" style={{ animationDelay: '1.6s' }} filter="url(#glow)" />

        {/* Tool 4 → Plan */}
        <path d="M 650 377 C 750 377 800 290 850 290" stroke="url(#line-gradient-3)" strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M 650 377 C 750 377 800 290 850 290" stroke="#c084fc" strokeWidth="2" fill="none" strokeDasharray="15 150" className="animate-[flow_3.4s_linear_infinite]" style={{ animationDelay: '1.9s' }} filter="url(#glow)" />

        {/* Tool 5 → Plan */}
        <path d="M 650 464 C 750 464 800 290 850 290" stroke="url(#line-gradient-3)" strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M 650 464 C 750 464 800 290 850 290" stroke="#c084fc" strokeWidth="2" fill="none" strokeDasharray="15 150" className="animate-[flow_3.6s_linear_infinite]" style={{ animationDelay: '2.2s' }} filter="url(#glow)" />
      </svg>

      {/* Nodes — positioned using % to match viewBox proportions */}
      <div className="absolute inset-0 z-10">

        {/* Company — x=15%, y=50% */}
        <div className="absolute top-1/2 left-[15%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border border-slate-700 shadow-[0_0_20px_rgba(14,165,233,0.3)] animate-[pulse_3s_ease-in-out_infinite]">
            <Building2 className="w-8 h-8 text-sky-400" />
            <div className="absolute inset-0 rounded-full border border-sky-400/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
          </div>
          <span className="mt-3 text-sm font-medium text-slate-300 whitespace-nowrap">Perfil da Empresa</span>
        </div>

        {/* AI Core — x=35%, y=50% */}
        <div className="absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-[#030b20] border-2 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.5)] animate-[pulse_2s_ease-in-out_infinite_0.5s]">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-md" />
            <BrainCircuit className="w-12 h-12 text-indigo-400 relative z-10" />
            <div className="absolute w-[120%] h-[120%] animate-[spin_8s_linear_infinite]">
              <div className="absolute top-0 left-1/2 w-2 h-2 bg-indigo-300 rounded-full blur-[1px]" />
            </div>
            <div className="absolute w-[140%] h-[140%] animate-[spin_12s_linear_infinite_reverse]">
              <div className="absolute bottom-0 right-1/2 w-1.5 h-1.5 bg-sky-300 rounded-full blur-[1px]" />
            </div>
          </div>
          <span className="mt-4 text-base font-bold text-indigo-300 whitespace-nowrap drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">
            Núcleo IA
          </span>
        </div>

        {/* Tool 1 — y≈20% (116/580) */}
        <div className="absolute left-[65%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-3" style={{ top: '20%' }}>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600 shadow-[0_0_15px_rgba(129,140,248,0.2)] animate-[pulse_3s_ease-in-out_infinite_0.2s]">
            <Target className="w-5 h-5 text-indigo-300" />
          </div>
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Análise SWOT</span>
        </div>

        {/* Tool 2 — y≈35% */}
        <div className="absolute left-[65%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-3" style={{ top: '35%' }}>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600 shadow-[0_0_15px_rgba(129,140,248,0.2)] animate-[pulse_3s_ease-in-out_infinite_0.5s]">
            <Globe2 className="w-5 h-5 text-indigo-300" />
          </div>
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Cenário Externo</span>
        </div>

        {/* Tool 3 — y=50% */}
        <div className="absolute top-1/2 left-[65%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600 shadow-[0_0_15px_rgba(129,140,248,0.2)] animate-[pulse_3s_ease-in-out_infinite_0.8s]">
            <BarChart3 className="w-5 h-5 text-indigo-300" />
          </div>
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Mercado</span>
        </div>

        {/* Tool 4 — y≈65% */}
        <div className="absolute left-[65%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-3" style={{ top: '65%' }}>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600 shadow-[0_0_15px_rgba(129,140,248,0.2)] animate-[pulse_3s_ease-in-out_infinite_1.1s]">
            <Briefcase className="w-5 h-5 text-indigo-300" />
          </div>
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Modelo de Negócio</span>
        </div>

        {/* Tool 5 — y≈80% */}
        <div className="absolute left-[65%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-3" style={{ top: '80%' }}>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600 shadow-[0_0_15px_rgba(129,140,248,0.2)] animate-[pulse_3s_ease-in-out_infinite_1.4s]">
            <Lightbulb className="w-5 h-5 text-indigo-300" />
          </div>
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Estratégias</span>
        </div>

        {/* Strategic Plan — x=85%, y=50% */}
        <div className="absolute top-1/2 left-[85%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-fuchsia-900/30 border border-fuchsia-500/50 shadow-[0_0_30px_rgba(192,132,252,0.4)] rotate-45 animate-[pulse_4s_ease-in-out_infinite_1s]">
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 rounded-2xl" />
            <Rocket className="w-10 h-10 text-fuchsia-400 -rotate-45 relative z-10" />
            <div className="absolute inset-0 rounded-2xl border border-fuchsia-400/30 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite_1s]" />
          </div>
          <span className="mt-6 text-sm font-bold text-fuchsia-300 whitespace-nowrap">Plano Estratégico</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flow {
          0% { stroke-dashoffset: 110; }
          100% { stroke-dashoffset: 0; }
        }
      ` }} />
    </div>
  );
}
