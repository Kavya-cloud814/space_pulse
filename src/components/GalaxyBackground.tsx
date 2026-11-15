import React, { useEffect, useRef } from 'react';

export const GalaxyBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const starColors = ['#F3F8FB', '#74C7E8', '#36D6C4', '#C4B5FD', '#E7C6A5', '#E879C9'];
    const stars = Array.from({ length: 135 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.65 + 0.25,
      speed: Math.random() * 0.008 + 0.002,
      phase: Math.random() * Math.PI * 2,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      // Deep Void base
      ctx.fillStyle = '#090D19';
      ctx.fillRect(0, 0, width, height);

      // Supernova / Galaxy Nebula Radial Blooms
      const blooms = [
        { x: width * 0.18, y: height * 0.22, r: Math.max(width, height) * 0.45, color: 'rgba(146, 119, 245, 0.13)' },
        { x: width * 0.82, y: height * 0.28, r: Math.max(width, height) * 0.42, color: 'rgba(54, 214, 196, 0.11)' },
        { x: width * 0.56, y: height * 0.78, r: Math.max(width, height) * 0.46, color: 'rgba(232, 121, 201, 0.08)' },
        { x: width * 0.72, y: height * 0.62, r: Math.max(width, height) * 0.34, color: 'rgba(205, 112, 85, 0.08)' },
      ];

      for (const b of blooms) {
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, b.color);
        grad.addColorStop(1, 'rgba(9, 13, 25, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // Subtle diagonal Milky Way dust ribbon
      ctx.save();
      ctx.translate(width * 0.5, height * 0.48);
      ctx.rotate(-0.35);
      const band = ctx.createLinearGradient(0, -height * 0.24, 0, height * 0.24);
      band.addColorStop(0, 'rgba(9, 13, 25, 0)');
      band.addColorStop(0.5, 'rgba(102, 139, 255, 0.06)');
      band.addColorStop(1, 'rgba(9, 13, 25, 0)');
      ctx.fillStyle = band;
      ctx.fillRect(-width, -height * 0.24, width * 2, height * 0.48);
      ctx.restore();

      // Twinkling stars
      for (const s of stars) {
        const twinkle = prefersReduced
          ? s.alpha
          : s.alpha * (0.65 + 0.35 * Math.sin(t * s.speed + s.phase));
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!prefersReduced) {
        animId = window.requestAnimationFrame(draw);
      }
    };

    animId = window.requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 h-full w-full pointer-events-none"
    />
  );
};
