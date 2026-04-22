import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type Props = {
  className?: string;
};

export default function HeroConstellation({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let rafId = 0;
    const mouse = { x: -9999, y: -9999, active: false };

    const computeDensity = () => {
      const isNarrow = window.innerWidth < 640;
      const area = width * height;
      const base = isNarrow ? 9000 : 6500;
      const max = isNarrow ? 35 : 90;
      return Math.min(max, Math.max(12, Math.floor(area / base)));
    };

    const seed = () => {
      const count = computeDensity();
      particles = new Array(count).fill(0).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
      }));
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        mouse.active = false;
        mouse.x = -9999;
        mouse.y = -9999;
        return;
      }
      mouse.x = x;
      mouse.y = y;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const linkDist = 130;
    const mouseRadius = 180;

    const step = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;
      }

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > linkDist) continue;
          let alpha = 1 - dist / linkDist;
          alpha *= 0.22;
          if (mouse.active) {
            const mx = (a.x + b.x) / 2 - mouse.x;
            const my = (a.y + b.y) / 2 - mouse.y;
            const md = Math.hypot(mx, my);
            if (md < mouseRadius) {
              alpha += (1 - md / mouseRadius) * 0.55;
            }
          }
          if (alpha <= 0.02) continue;
          ctx.strokeStyle = `rgba(165, 180, 252, ${Math.min(0.85, alpha)})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const p of particles) {
        let r = 1.1;
        let alpha = 0.45;
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const md = Math.hypot(dx, dy);
          if (md < mouseRadius) {
            const t = 1 - md / mouseRadius;
            r += t * 1.4;
            alpha += t * 0.5;
          }
        }
        ctx.fillStyle = `rgba(186, 230, 253, ${Math.min(1, alpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(step);
    };

    resize();
    rafId = requestAnimationFrame(step);

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-auto ${className ?? ""}`}
      aria-hidden="true"
      data-testid="hero-constellation"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
