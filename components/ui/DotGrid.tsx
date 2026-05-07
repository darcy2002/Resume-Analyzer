"use client";
import { useEffect, useRef } from "react";

export default function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SPACING = 28;
    const BASE_RADIUS = 1.2;
    const MAX_RADIUS = 2.8;
    const PULSE_SPEED = 0.0008;

    let animFrame: number;
    const startTime = Date.now();

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const elapsed = (Date.now() - startTime) * PULSE_SPEED;

      const cols = Math.ceil(canvas.width / SPACING) + 1;
      const rows = Math.ceil(canvas.height / SPACING) + 1;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);

      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          const x = col * SPACING;
          const y = row * SPACING;
          const dist = Math.sqrt(
            Math.pow(x - cx, 2) + Math.pow(y - cy, 2)
          );
          const normalizedDist = dist / maxDist;

          const wave = Math.sin(elapsed - normalizedDist * 8);
          const edgeFade = Math.max(0, 1 - normalizedDist * 1.3);
          const intensity = ((wave + 1) / 2) * edgeFade;

          const radius = BASE_RADIUS + intensity * (MAX_RADIUS - BASE_RADIUS);
          const opacity = 0.05 + intensity * 0.4;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.fill();
        }
      }

      animFrame = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <div className="dot-grid-bg" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
