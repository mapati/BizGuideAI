import React from 'react';
import { 
  Building2, 
  BrainCircuit, 
  Target, 
  BarChart3, 
  Globe, 
  Briefcase, 
  FileText, 
  CheckCircle2,
  Cpu,
  Zap
} from 'lucide-react';

export function OrbitalGrid() {
  return (
    <div className="relative w-full h-[520px] bg-[#020817] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.05)_0%,rgba(2,8,23,0)_70%)]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgoJPHJlY3Qgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI2ZmZmZmZiIgZmlsbC1vcGFjaXR5PSIwLjAyIi8+Cjwvc3ZnPg==')] opacity-50" />

      {/* Internal Styles for keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes orbit-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes counter-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes dash-flow {
          to { stroke-dashoffset: -100; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        @keyframes fill-bar {
          0% { width: 0%; }
          100% { width: var(--target-width); }
        }
        .orbit-container {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
        }
        .orbit-ring-1 {
          animation: orbit-rotate 30s linear infinite;
        }
        .orbit-ring-2 {
          animation: orbit-rotate 45s linear infinite reverse;
        }
        .orbit-node {
          position: absolute;
          /* The negative margin centers the node on the orbit path */
          margin-top: -24px;
          margin-left: -24px;
          width: 48px;
          height: 48px;
          animation: counter-rotate 30s linear infinite;
        }
        .orbit-node-reverse {
          animation: counter-rotate 45s linear infinite reverse;
        }
        .path-line {
          stroke-dasharray: 6 6;
          animation: dash-flow 2s linear infinite;
        }
        .pulse-core {
          animation: pulse-ring 3s ease-in-out infinite;
        }
        .progress-bar-fill {
          animation: fill-bar 2s ease-out forwards;
        }
      `}} />

      {/* SVG Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
          <linearGradient id="glow-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glow-blur">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Path: Empresa -> AI */}
        <path 
          d="M 150 290 Q 250 290 350 290" 
          fill="none" 
          stroke="url(#glow-line)" 
          strokeWidth="2" 
          className="path-line"
          filter="url(#glow-blur)"
        />

        {/* Path: AI -> Plano */}
        <path 
          d="M 650 290 Q 750 290 850 290" 
          fill="none" 
          stroke="url(#glow-line)" 
          strokeWidth="2" 
          className="path-line"
          filter="url(#glow-blur)"
        />
        
        {/* Decorative Orbit Rings in SVG */}
        <circle cx="500" cy="290" r="140" fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
        <circle cx="500" cy="290" r="200" fill="none" stroke="#ffffff" strokeOpacity="0.03" strokeWidth="1" strokeDasharray="4 8" />
      </svg>

      {/* Main Grid Layout */}
      <div className="relative z-10 w-full max-w-[1000px] flex items-center justify-between px-10">
        
        {/* LEFT: Empresa Node */}
        <div className="flex flex-col items-center gap-4 w-[140px]">
          <div className="relative">
            <div className="absolute inset-0 bg-sky-500/20 rounded-2xl blur-xl pulse-core" />
            <div className="relative w-20 h-20 bg-[#0f172a] border border-sky-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.2)]">
              <Building2 className="w-8 h-8 text-sky-400" />
            </div>
            
            {/* Small data particles */}
            <div className="absolute -right-3 top-1/2 w-2 h-2 bg-sky-400 rounded-full animate-ping" />
          </div>
          <div className="text-center">
            <h3 className="text-white font-medium text-sm">Perfil da Empresa</h3>
            <p className="text-slate-400 text-xs mt-1">Dados & Contexto</p>
          </div>
        </div>

        {/* CENTER: AI Nucleus & Orbits */}
        <div className="relative w-[300px] h-[300px] flex items-center justify-center">
          
          {/* Inner Core */}
          <div className="relative z-20 flex flex-col items-center">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl pulse-core" />
            
            {/* AI Brain Element */}
            <div className="relative w-28 h-28 rounded-full border border-indigo-500/50 bg-[#0a0f24] flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)]">
              <div className="absolute inset-1 rounded-full border border-indigo-400/20 border-dashed animate-spin-slow" style={{ animationDuration: '20s' }} />
              <BrainCircuit className="w-12 h-12 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              <Cpu className="absolute bottom-2 right-2 w-5 h-5 text-sky-300 opacity-70" />
            </div>
            <div className="mt-4 text-center">
              <h2 className="text-white font-bold tracking-wider text-sm uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">Núcleo IA</h2>
              <div className="flex items-center gap-1 justify-center mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400/80 text-[10px] uppercase font-mono tracking-wider">Processando</span>
              </div>
            </div>
          </div>

          {/* Orbiting Elements */}
          <div className="orbit-container">
            {/* Ring 1 (140px radius) */}
            <div className="absolute inset-0 orbit-ring-1">
              
              {/* Node 1: SWOT */}
              <div className="orbit-node flex flex-col items-center" style={{ transform: 'translate(140px, 0)' }}>
                <div className="w-12 h-12 rounded-full bg-[#111827] border border-white/10 flex items-center justify-center shadow-lg backdrop-blur-sm group hover:border-sky-400/50 transition-colors">
                  <Target className="w-5 h-5 text-sky-400" />
                </div>
                <span className="absolute top-14 text-[10px] text-slate-300 font-medium whitespace-nowrap bg-[#020817]/80 px-2 py-0.5 rounded">Análise SWOT</span>
              </div>

              {/* Node 2: PESTEL / Cenário */}
              <div className="orbit-node flex flex-col items-center" style={{ transform: 'translate(-70px, 121.2px)' }}>
                <div className="w-12 h-12 rounded-full bg-[#111827] border border-white/10 flex items-center justify-center shadow-lg backdrop-blur-sm">
                  <Globe className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="absolute top-14 text-[10px] text-slate-300 font-medium whitespace-nowrap bg-[#020817]/80 px-2 py-0.5 rounded">Cenário Externo</span>
              </div>

              {/* Node 3: Mercado */}
              <div className="orbit-node flex flex-col items-center" style={{ transform: 'translate(-70px, -121.2px)' }}>
                <div className="w-12 h-12 rounded-full bg-[#111827] border border-white/10 flex items-center justify-center shadow-lg backdrop-blur-sm">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="absolute top-14 text-[10px] text-slate-300 font-medium whitespace-nowrap bg-[#020817]/80 px-2 py-0.5 rounded">Mercado</span>
              </div>

            </div>
            
            {/* Ring 2 (200px radius, counter-rotating) */}
            <div className="absolute inset-0 orbit-ring-2">
              
              {/* Node 4: Modelo Negócio */}
              <div className="orbit-node-reverse orbit-node flex flex-col items-center" style={{ transform: 'translate(0, -200px)' }}>
                <div className="w-12 h-12 rounded-full bg-[#111827] border border-white/10 flex items-center justify-center shadow-lg backdrop-blur-sm">
                  <Briefcase className="w-5 h-5 text-fuchsia-400" />
                </div>
                <span className="absolute top-14 text-[10px] text-slate-300 font-medium whitespace-nowrap bg-[#020817]/80 px-2 py-0.5 rounded">Modelo de Negócio</span>
              </div>

              {/* Node 5: Estratégias */}
              <div className="orbit-node-reverse orbit-node flex flex-col items-center" style={{ transform: 'translate(0, 200px)' }}>
                <div className="w-12 h-12 rounded-full bg-[#111827] border border-white/10 flex items-center justify-center shadow-lg backdrop-blur-sm">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <span className="absolute top-14 text-[10px] text-slate-300 font-medium whitespace-nowrap bg-[#020817]/80 px-2 py-0.5 rounded">Estratégias</span>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT: Plano Estratégico Card */}
        <div className="w-[220px] relative">
          <div className="absolute inset-0 bg-emerald-500/10 rounded-xl blur-xl pulse-core" style={{ animationDelay: '1s' }} />
          
          <div className="relative bg-[#0a0f1e]/90 border border-emerald-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-md">
            
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm leading-tight">Plano<br/>Estratégico</h3>
              </div>
            </div>

            <div className="space-y-3">
              {/* Fake Progress Rows */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Diretrizes
                  </span>
                  <span className="text-[10px] text-white">100%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full progress-bar-fill" style={{ '--target-width': '100%' } as React.CSSProperties} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Metas (OKRs)
                  </span>
                  <span className="text-[10px] text-white">85%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full progress-bar-fill" style={{ '--target-width': '85%', animationDelay: '0.5s' } as React.CSSProperties} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full border border-slate-500" /> Ações
                  </span>
                  <span className="text-[10px] text-white">40%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full progress-bar-fill" style={{ '--target-width': '40%', animationDelay: '1s' } as React.CSSProperties} />
                </div>
              </div>
            </div>

            <button className="w-full mt-5 py-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-medium transition-colors">
              Visualizar Plano
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
