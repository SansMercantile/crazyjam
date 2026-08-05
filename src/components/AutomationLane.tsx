/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FL Studio-style automation lane: drag across the 16 steps to draw a real
 * gain curve. Values are stored on the track (`volumeAutomation`) and read
 * live by the audio engine every scheduler tick (see applyStepAutomation in
 * audioEngine.ts) - this genuinely rides the track's actual playback volume
 * over time, it isn't a decorative widget.
 */
import React, { useCallback, useEffect, useRef } from "react";

const STEP_COUNT = 16;
const HEIGHT = 40;

interface AutomationLaneProps {
  values: number[]; // length 16
  onChange: (values: number[]) => void;
  currentStep: number;
  label?: string;
  bipolar?: boolean; // true = range is -1..1 (e.g. pan), centered; false = 0..1 (e.g. volume)
  resetValue?: number;
}

export function AutomationLane({ values, onChange, currentStep, label = "Volume automation", bipolar = false, resetValue }: AutomationLaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const min = bipolar ? -1 : 0;
  const max = 1;
  const flat = resetValue ?? (bipolar ? 0 : 1);

  const setFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const stepWidth = rect.width / STEP_COUNT;
      let stepIdx = Math.floor(relX / stepWidth);
      stepIdx = Math.max(0, Math.min(STEP_COUNT - 1, stepIdx));
      let val = max - (relY / rect.height) * (max - min);
      val = Math.max(min, Math.min(max, val));
      const next = [...valuesRef.current];
      next[stepIdx] = Math.round(val * 100) / 100;
      onChange(next);
    },
    [onChange, min, max]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = true;
    setFromEvent(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      setFromEvent(e.clientX, e.clientY);
    };
    const handleUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [setFromEvent]);

  const handleReset = () => onChange(Array(STEP_COUNT).fill(flat));


  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-brand-ink-muted">{label} - drag to draw</span>
        <button onClick={handleReset} className="text-[9px] text-brand-ink-muted hover:text-brand-gold transition-colors">
          Reset to flat
        </button>
      </div>
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="relative bg-brand-bg border border-brand-border rounded-md overflow-hidden cursor-crosshair select-none"
        style={{ height: HEIGHT }}
      >
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${STEP_COUNT}, 1fr)` }}>
          {values.map((v, i) => {
            const pct = ((v - min) / (max - min)) * 100;
            const centerPct = ((flat - min) / (max - min)) * 100;
            const barTop = Math.min(pct, centerPct);
            const barHeight = Math.abs(pct - centerPct);
            return (
              <div key={i} className={`relative border-r border-brand-border/40 ${i === currentStep ? "bg-brand-gold/10" : ""}`}>
                {bipolar && (
                  <div className="absolute left-0 w-full border-t border-brand-border/60" style={{ bottom: `${centerPct}%` }} />
                )}
                <div
                  className="absolute left-0 w-full bg-brand-gold/70"
                  style={{ bottom: `${100 - barTop - barHeight}%`, height: `${barHeight}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
