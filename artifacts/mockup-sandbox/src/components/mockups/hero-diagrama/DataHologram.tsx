import React from "react";
import {
  Building2,
  Globe2,
  TrendingUp,
  BrainCircuit,
  Target,
  Lightbulb,
  Workflow,
  FileText,
  Sparkles,
  Database,
  Network
} from "lucide-react";

export function DataHologram() {
  return (
    <div className="relative w-full h-[520px] bg-[#020817] rounded-xl overflow-hidden font-sans flex items-center justify-center border border-white/5 shadow-2xl">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08)_0%,transparent_70%)]" />
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <style>{`
        @keyframes scan-vertical {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        @keyframes core-pulse {
          0%, 100% { 
            box-shadow: 0 0 30px rgba(56,189,248,0.15), inset 0 0 20px rgba(56,189,248,0.05); 
            border-color: rgba(56,189,248,0.3); 
          }
          50% { 
            box-shadow: 0 0 60px rgba(56,189,248,0.4), inset 0 0 40px rgba(56,189,248,0.15); 
            border-color: rgba(56,189,248,0.8); 
          }
        }
        @keyframes data-flow-right {
          to { stroke-dashoffset: -20; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        
        .hologram-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .hologram-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(56, 189, 248, 0.3);
        }
        
        .glass-panel {
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }
      `}</style>

      {/* Connecting Lines (Background SVG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <linearGradient id="line-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(56,189,248,0.1)" />
            <stop offset="50%" stopColor="rgba(56,189,248,0.8)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.1)" />
          </linearGradient>
        </defs>
        
        {/* Left to Center Lines */}
        <path d="M 25% 30% C 35% 30%, 40% 50%, 50% 50%" fill="none" stroke="url(#line-grad-1)" strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: 'data-flow-right 1s linear infinite' }} />
        <path d="M 25% 50% C 35% 50%, 40% 50%, 50% 50%" fill="none" stroke="url(#line-grad-1)" strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: 'data-flow-right 1s linear infinite' }} />
        <path d="M 25% 70% C 35% 70%, 40% 50%, 50% 50%" fill="none" stroke="url(#line-grad-1)" strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: 'data-flow-right 1s linear infinite' }} />
        
        {/* Center to Right Lines */}
        <path d="M 50% 50% C 60% 50%, 65% 25%, 75% 25%" fill="none" stroke="url(#line-grad-1)" strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: 'data-flow-right 1s linear infinite' }} />
        <path d="M 50% 50% C 60% 50%, 65% 42%, 75% 42%" fill="none" stroke="url(#line-grad-1)" strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: 'data-flow-right 1s linear infinite' }} />
        <path d="M 50% 50% C 60% 50%, 65% 58%, 75% 58%" fill="none" stroke="url(#line-grad-1)" strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: 'data-flow-right 1s linear infinite' }} />
        <path d="M 50% 50% C 60% 50%, 65% 75%, 75% 75%" fill="none" stroke="url(#line-grad-1)" strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: 'data-flow-right 1s linear infinite' }} />
      </svg>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {[
          { w: 3, h: 3, top: '12%', left: '8%', op: 0.3, dur: '4s', delay: '0s' },
          { w: 2, h: 2, top: '25%', left: '18%', op: 0.5, dur: '3s', delay: '0.5s' },
          { w: 4, h: 4, top: '60%', left: '5%', op: 0.2, dur: '5s', delay: '1s' },
          { w: 2, h: 2, top: '80%', left: '22%', op: 0.4, dur: '3.5s', delay: '0.2s' },
          { w: 3, h: 3, top: '40%', left: '32%', op: 0.25, dur: '4.5s', delay: '1.2s' },
          { w: 2, h: 2, top: '70%', left: '45%', op: 0.35, dur: '3s', delay: '0.8s' },
          { w: 3, h: 3, top: '15%', left: '55%', op: 0.3, dur: '4s', delay: '0.3s' },
          { w: 4, h: 4, top: '50%', left: '62%', op: 0.2, dur: '5s', delay: '1.5s' },
          { w: 2, h: 2, top: '85%', left: '70%', op: 0.45, dur: '3.5s', delay: '0.7s' },
          { w: 3, h: 3, top: '30%', left: '78%', op: 0.3, dur: '4.5s', delay: '0.4s' },
          { w: 2, h: 2, top: '90%', left: '85%', op: 0.35, dur: '3s', delay: '1.1s' },
          { w: 4, h: 4, top: '20%', left: '92%', op: 0.25, dur: '5s', delay: '0.6s' },
          { w: 2, h: 2, top: '55%', left: '88%', op: 0.4, dur: '3.5s', delay: '1.8s' },
          { w: 3, h: 3, top: '10%', left: '40%', op: 0.2, dur: '4s', delay: '0.9s' },
          { w: 2, h: 2, top: '75%', left: '58%', op: 0.3, dur: '3s', delay: '1.4s' },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-sky-400"
            style={{
              width: p.w + 'px',
              height: p.h + 'px',
              top: p.top,
              left: p.left,
              opacity: p.op,
              animation: `float-medium ${p.dur} ease-in-out infinite, pulse-opacity ${p.dur} infinite`,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-5xl px-8 flex items-center justify-between h-full">
        
        {/* LEFT COLUMN: Input */}
        <div className="w-[260px] flex flex-col gap-4" style={{ animation: 'float-slow 6s ease-in-out infinite' }}>
          <div className="text-xs font-mono text-sky-400/70 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Database className="w-3 h-3" />
            Entrada de Dados
          </div>
          
          <div className="hologram-card rounded-lg p-3.5 flex items-center gap-3 transition-colors duration-300">
            <div className="bg-sky-500/10 p-2 rounded-md border border-sky-500/20 text-sky-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white/90 text-sm font-medium">Perfil da Empresa</div>
              <div className="text-white/40 text-[10px] font-mono mt-0.5">Identidade & Cultura</div>
            </div>
          </div>

          <div className="hologram-card rounded-lg p-3.5 flex items-center gap-3 transition-colors duration-300">
            <div className="bg-sky-500/10 p-2 rounded-md border border-sky-500/20 text-sky-400">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white/90 text-sm font-medium">Cenário Externo</div>
              <div className="text-white/40 text-[10px] font-mono mt-0.5">Variáveis Macroeconômicas</div>
            </div>
          </div>

          <div className="hologram-card rounded-lg p-3.5 flex items-center gap-3 transition-colors duration-300">
            <div className="bg-sky-500/10 p-2 rounded-md border border-sky-500/20 text-sky-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white/90 text-sm font-medium">Mercado</div>
              <div className="text-white/40 text-[10px] font-mono mt-0.5">Concorrentes & Tendências</div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: AI Core */}
        <div className="relative w-[320px] h-[320px] flex items-center justify-center">
          {/* Decorative Outer Rings */}
          <div className="absolute inset-0 rounded-full border border-sky-500/10 border-dashed animate-[spin_20s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border border-sky-500/20 animate-[spin_15s_linear_infinite_reverse]" />
          
          {/* AI Core Box */}
          <div 
            className="glass-panel relative w-48 h-56 rounded-2xl flex flex-col items-center justify-center overflow-hidden"
            style={{ animation: 'core-pulse 3s ease-in-out infinite' }}
          >
            {/* Scanning Beam */}
            <div 
              className="absolute left-0 right-0 h-[20%] w-full z-20 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent, rgba(56,189,248,0.5), transparent)',
                animation: 'scan-vertical 2.5s ease-in-out infinite',
                boxShadow: '0 0 15px rgba(56,189,248,0.3)'
              }}
            />

            {/* Core Content */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative mb-4">
                <BrainCircuit className="w-16 h-16 text-sky-400" strokeWidth={1.5} />
                <Sparkles className="w-5 h-5 text-white absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-white font-semibold text-lg tracking-wide">Núcleo IA</div>
              <div className="text-sky-400/80 text-xs font-mono mt-1 flex items-center gap-1">
                <Network className="w-3 h-3" />
                Processando...
              </div>
            </div>
            
            {/* Binary Rain overlay (subtle) */}
            <div className="absolute inset-0 opacity-10 font-mono text-[8px] leading-none text-sky-300 break-all overflow-hidden p-2 select-none pointer-events-none">
              010101101001010101110101010101101010101101010101011010010101010101101010101011010101
              101010101010110101010101011010010101010111010101010110101010110101010101101001010101
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Output */}
        <div className="w-[260px] flex flex-col gap-3" style={{ animation: 'float-slow 5s ease-in-out infinite', animationDelay: '1s' }}>
          <div className="text-xs font-mono text-sky-400/70 uppercase tracking-widest mb-1 flex items-center justify-end gap-2 text-right">
            Inteligência Gerada
            <Workflow className="w-3 h-3" />
          </div>

          <div className="hologram-card rounded-lg p-3 flex items-center gap-3 transition-colors duration-300">
            <div className="bg-sky-500/10 p-1.5 rounded-md border border-sky-500/20 text-sky-400">
              <Target className="w-4 h-4" />
            </div>
            <div className="text-white/90 text-sm font-medium">Análise SWOT</div>
          </div>

          <div className="hologram-card rounded-lg p-3 flex items-center gap-3 transition-colors duration-300">
            <div className="bg-sky-500/10 p-1.5 rounded-md border border-sky-500/20 text-sky-400">
              <Workflow className="w-4 h-4" />
            </div>
            <div className="text-white/90 text-sm font-medium">Modelo de Negócio</div>
          </div>

          <div className="hologram-card rounded-lg p-3 flex items-center gap-3 transition-colors duration-300">
            <div className="bg-sky-500/10 p-1.5 rounded-md border border-sky-500/20 text-sky-400">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="text-white/90 text-sm font-medium">Estratégias</div>
          </div>

          <div className="glass-panel relative rounded-lg p-4 mt-2 border-sky-500/30">
            <div className="absolute inset-0 bg-sky-500/5 rounded-lg" />
            <div className="relative flex items-center gap-3">
              <div className="bg-sky-500 p-2 rounded-md shadow-[0_0_15px_rgba(56,189,248,0.5)] text-[#020817]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Plano Estratégico</div>
                <div className="text-sky-400 text-[10px] font-mono mt-0.5">Pronto para Execução</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
