"use client";

import { useEffect, useRef, useState } from "react";

type WheelEntry = { restaurant_name: string; person_name: string };

const COLORS = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
];

const SIZE = 320;
const RADIUS = SIZE / 2;

function drawWheel(canvas: HTMLCanvasElement, entries: WheelEntry[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, SIZE, SIZE);

  const sliceAngle = (Math.PI * 2) / entries.length;

  entries.forEach((entry, i) => {
    const start = i * sliceAngle - Math.PI / 2;
    const end = start + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(RADIUS, RADIUS);
    ctx.arc(RADIUS, RADIUS, RADIUS - 4, start, end);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.stroke();

    ctx.save();
    ctx.translate(RADIUS, RADIUS);
    ctx.rotate(start + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#1f2937";
    ctx.font = "600 13px system-ui, sans-serif";
    const label =
      entry.restaurant_name.length > 18
        ? entry.restaurant_name.slice(0, 17) + "…"
        : entry.restaurant_name;
    ctx.fillText(label, RADIUS - 16, 0);
    ctx.restore();
  });
}

export default function SpinWheel({
  pool,
  winnerRestaurant,
}: {
  pool: WheelEntry[];
  winnerRestaurant: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const spinsRef = useRef(0);

  useEffect(() => {
    if (canvasRef.current) drawWheel(canvasRef.current, pool);
  }, [pool]);

  useEffect(() => {
    spin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, winnerRestaurant]);

  function spin() {
    if (pool.length === 0) return;
    const winnerIndex = pool.findIndex(
      (p) => p.restaurant_name.toLowerCase() === winnerRestaurant.toLowerCase()
    );
    const index = winnerIndex === -1 ? 0 : winnerIndex;
    const sliceDeg = 360 / pool.length;
    const winnerCenterDeg = index * sliceDeg + sliceDeg / 2;
    spinsRef.current += 1;
    const extraTurns = 4 + spinsRef.current;
    const target = extraTurns * 360 - winnerCenterDeg;
    setRotation(target);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: SIZE, height: SIZE, maxWidth: "90vw" }}>
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-2 z-10"
          style={{
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "16px solid var(--foreground)",
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            transition: "transform 4s cubic-bezier(0.17, 0.67, 0.2, 1)",
            transform: `rotate(${rotation}deg)`,
            boxShadow: "0 0 0 4px var(--foreground)",
          }}
        />
      </div>
      <button
        onClick={spin}
        className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
      >
        Watch it spin again
      </button>
    </div>
  );
}
