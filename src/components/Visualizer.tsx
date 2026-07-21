/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { Zap, Activity, Radio } from "lucide-react";

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  scaleKey: string;
}

export function Visualizer({ analyser, isPlaying, scaleKey }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI screens
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    // Dynamic wave phase for idle state
    let idlePhase = 0;

    const draw = () => {
      // Loop
      animationRef.current = requestAnimationFrame(draw);

      // Clear with elegant translucent brand dark to create trailing glow
      ctx.fillStyle = "rgba(13, 13, 18, 0.25)";
      ctx.fillRect(0, 0, width, height);

      // Draw subtle background grids
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 0; j < height; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);

        // Compute average frequency power to pump elements
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const averagePower = sum / bufferLength; // 0 to 255
        const intensityFactor = averagePower / 120; // normal range 0 to 1+

        // Paint dynamic glowing bars
        const barWidth = (width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height * 0.85;

          // Gradient color depending on frequency index (Cyan to Pink to Purple)
          const percent = i / bufferLength;
          let r = Math.floor(0 + percent * 255);
          let g = Math.floor(255 - percent * 255 + intensityFactor * 20);
          let b = Math.floor(255);

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
          
          // Draw rounded bars
          ctx.beginPath();
          ctx.arc(x + barWidth / 2, height - barHeight, barWidth / 2, Math.PI, 0);
          ctx.lineTo(x + barWidth, height);
          ctx.lineTo(x, height);
          ctx.closePath();
          ctx.fill();

          x += barWidth + 3;
        }

        // Draw a central floating glowing vector core that pulses to the beat!
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = 30 + intensityFactor * 15;

        // Pulse gradient glowing core
        const coreGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius * 1.5);
        coreGradient.addColorStop(0, "rgba(255, 0, 255, 0.95)"); // Solid Brand Pink
        coreGradient.addColorStop(0.4, "rgba(112, 0, 255, 0.6)"); // Brand Purple
        coreGradient.addColorStop(1, "rgba(0, 255, 255, 0)"); // Alpha Brand Cyan

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Overlay a sharp vector ring
        ctx.strokeStyle = "rgba(0, 255, 255, 0.9)"; // Neon cyan
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw compass tick vectors
        ctx.strokeStyle = "rgba(255, 0, 255, 0.5)";
        ctx.lineWidth = 1;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          const startX = centerX + Math.cos(angle) * (radius - 5);
          const startY = centerY + Math.sin(angle) * (radius - 5);
          const endX = centerX + Math.cos(angle) * (radius + 8);
          const endY = centerY + Math.sin(angle) * (radius + 8);
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }

        // Add a micro waveform line cutting through the center
        ctx.strokeStyle = "rgba(255, 0, 255, 0.8)"; // Hot Pink/Magenta
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < width; i += 8) {
          const segmentIndex = Math.floor((i / width) * bufferLength);
          const offset = ((dataArray[segmentIndex] - 128) / 128) * height * 0.15;
          if (i === 0) {
            ctx.moveTo(i, centerY + offset);
          } else {
            ctx.lineTo(i, centerY + offset);
          }
        }
        ctx.stroke();

      } else {
        // IDLE STATE - Paint elegant mathematical floating sine wave grids!
        idlePhase += 0.04;
        const centerY = height / 2;

        ctx.strokeStyle = "rgba(255, 0, 255, 0.3)"; // Brand Pink
        ctx.lineWidth = 1.5;

        // Draw multiple offset sinusoids
        for (let waveOffset = 0; waveOffset < 3; waveOffset++) {
          ctx.beginPath();
          const frequencyMultiplier = 0.005 + waveOffset * 0.002;
          const amplitude = 25 - waveOffset * 7;
          
          // Cross-blend Pink and Cyan
          if (waveOffset === 0) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 - waveOffset * 0.12})`;
          } else if (waveOffset === 1) {
            ctx.strokeStyle = `rgba(112, 0, 255, ${0.5 - waveOffset * 0.12})`;
          } else {
            ctx.strokeStyle = `rgba(255, 0, 255, ${0.5 - waveOffset * 0.12})`;
          }

          for (let i = 0; i < width; i++) {
            const y = centerY + Math.sin(i * frequencyMultiplier + idlePhase + waveOffset) * amplitude;
            if (i === 0) {
              ctx.moveTo(i, y);
            } else {
              ctx.lineTo(i, y);
            }
          }
          ctx.stroke();
        }

        // Draw static central ring
        const centerX = width / 2;
        const radius = 35;
        const glowGr = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 50);
        glowGr.addColorStop(0, "rgba(255, 0, 255, 0.15)");
        glowGr.addColorStop(1, "rgba(0, 255, 255, 0)");
        ctx.fillStyle = glowGr;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(0, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying]);

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden h-72">
      {/* Visualizer header tabs */}
      <div className="flex items-center justify-between border-b border-brand-border pb-2.5 z-10">
        <div className="flex items-center gap-2 text-brand-gold">
          <Activity className="h-4 w-4" />
          <span className="text-xs font-mono font-medium tracking-wide uppercase text-brand-ink-muted">
            Oscilloscope & Spectral Power
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-brand-ink-muted">
          <div className="flex items-center gap-1 font-medium">
            <Radio className="h-3 w-3 text-brand-gold animate-pulse" />
            <span>Scale: {scaleKey || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1 font-medium">
            <Zap className="h-3 w-3 text-brand-gold" />
            <span>STFT: Live</span>
          </div>
        </div>
      </div>

      {/* Embedded Canvas */}
      <div className="flex-1 w-full bg-brand-bg/80 rounded-2xl overflow-hidden border border-brand-border">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Frame aesthetic decorations (clean, structural, and literal - no slop) */}
      <div className="absolute bottom-2.5 right-4 z-10">
        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wide">
          CrazyJam Spatializer Node
        </span>
      </div>
    </div>
  );
}
