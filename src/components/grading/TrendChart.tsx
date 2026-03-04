"use client";

import { useEffect, useRef } from "react";

interface DataPoint {
  label: string;
  score: number;
}

interface TrendChartProps {
  data: DataPoint[];
  height?: number;
}

export function TrendChart({ data, height = 200 }: TrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(128, 128, 128, 0.15)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Y axis labels
      ctx.fillStyle = "rgba(128, 128, 128, 0.7)";
      ctx.font = "11px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(`${100 - i * 25}%`, padding.left - 8, y + 4);
    }

    if (data.length < 2) {
      // Single point
      const x = padding.left + plotW / 2;
      const y = padding.top + plotH * (1 - data[0].score);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = data[0].score >= 0.8 ? "#10b981" : data[0].score >= 0.5 ? "#eab308" : "#ef4444";
      ctx.fill();
      return;
    }

    // Line
    const stepX = plotW / (data.length - 1);
    ctx.beginPath();
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";

    data.forEach((point, i) => {
      const x = padding.left + stepX * i;
      const y = padding.top + plotH * (1 - point.score);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area
    ctx.lineTo(padding.left + stepX * (data.length - 1), padding.top + plotH);
    ctx.lineTo(padding.left, padding.top + plotH);
    ctx.closePath();
    ctx.fillStyle = "rgba(99, 102, 241, 0.1)";
    ctx.fill();

    // Points
    data.forEach((point, i) => {
      const x = padding.left + stepX * i;
      const y = padding.top + plotH * (1 - point.score);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = point.score >= 0.8 ? "#10b981" : point.score >= 0.5 ? "#eab308" : "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // X labels
      if (data.length <= 10 || i % Math.ceil(data.length / 10) === 0) {
        ctx.fillStyle = "rgba(128, 128, 128, 0.7)";
        ctx.font = "10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(point.label, x, h - 8);
      }
    });
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground"
        style={{ height }}
      >
        No grading data yet
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-lg border"
      style={{ height }}
    />
  );
}
