/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canva-style album art editor. The logical canvas is always exported at a
 * fixed 1400x1400 PNG regardless of on-screen zoom, since streaming
 * platforms expect a fixed square cover size.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Image as ImageIcon,
  Type,
  Square,
  Circle,
  Trash2,
  Download,
  Save,
  Layers as LayersIcon,
  ChevronUp,
  ChevronDown,
  Palette,
  FolderOpen,
  Plus,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X,
} from "lucide-react";
import { saveAlbumArt, updateAlbumArt, listAlbumArt, deleteAlbumArt } from "../utils/api";

export const CANVAS_SIZE = 1400;
const EDITOR_SIZE = 520;
const SCALE = EDITOR_SIZE / CANVAS_SIZE;

type LayerType = "text" | "image" | "shape";

interface ArtLayer {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: "left" | "center" | "right";
  src?: string;
  shape?: "rect" | "ellipse";
  fill?: string;
}

const FONT_OPTIONS = ["Arial", "Georgia", "Impact", "Courier New", "Trebuchet MS"];
const SWATCHES = ["#ffffff", "#ff00c8", "#00e5ff", "#e59632", "#a855f7", "#10b981", "#0d0d12", "#f43f5e"];

function newId() {
  return `layer-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

interface AlbumArtStudioProps {
  addLog?: (log: any) => void;
}

export const AlbumArtStudio: React.FC<AlbumArtStudioProps> = ({ addLog }) => {
  const [title, setTitle] = useState("Untitled Cover");
  const [background, setBackground] = useState("#14141d");
  const [layers, setLayers] = useState<ArtLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [gallery, setGallery] = useState<any[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragState = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{ id: string; startX: number; startY: number; origW: number; origH: number } | null>(null);

  const selectedLayer = layers.find((l) => l.id === selectedId) || null;

  const updateLayer = (id: string, patch: Partial<ArtLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const addTextLayer = () => {
    const layer: ArtLayer = {
      id: newId(),
      type: "text",
      x: 140,
      y: 600,
      width: 1120,
      height: 160,
      zIndex: layers.length,
      text: "Track Title",
      fontSize: 90,
      color: "#ffffff",
      fontFamily: "Arial",
      fontWeight: "900",
      textAlign: "center",
    };
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
  };

  const addShapeLayer = (shape: "rect" | "ellipse") => {
    const layer: ArtLayer = {
      id: newId(),
      type: "shape",
      x: 400,
      y: 400,
      width: 600,
      height: 600,
      zIndex: layers.length,
      shape,
      fill: "#ff00c8",
    };
    setLayers((prev) => [...prev, layer]);
    setSelectedId(layer.id);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatusMsg("That file isn't an image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const layer: ArtLayer = {
        id: newId(),
        type: "image",
        x: 200,
        y: 200,
        width: 1000,
        height: 1000,
        zIndex: layers.length,
        src,
      };
      setLayers((prev) => [...prev, layer]);
      setSelectedId(layer.id);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const deleteLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveLayerZ = (id: string, dir: 1 | -1) => {
    setLayers((prev) => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((l) => l.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const tmp = sorted[idx].zIndex;
      sorted[idx].zIndex = sorted[swapIdx].zIndex;
      sorted[swapIdx].zIndex = tmp;
      return [...sorted];
    });
  };

  // --- Drag to move ---
  const onLayerMouseDown = (e: React.MouseEvent, layer: ArtLayer) => {
    e.stopPropagation();
    setSelectedId(layer.id);
    dragState.current = { id: layer.id, startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y };
  };

  const onResizeMouseDown = (e: React.MouseEvent, layer: ArtLayer) => {
    e.stopPropagation();
    resizeState.current = { id: layer.id, startX: e.clientX, startY: e.clientY, origW: layer.width, origH: layer.height };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragState.current) {
        const { id, startX, startY, origX, origY } = dragState.current;
        const dx = (e.clientX - startX) / SCALE;
        const dy = (e.clientY - startY) / SCALE;
        updateLayer(id, {
          x: Math.max(-2000, Math.min(CANVAS_SIZE * 1.5, origX + dx)),
          y: Math.max(-2000, Math.min(CANVAS_SIZE * 1.5, origY + dy)),
        });
      } else if (resizeState.current) {
        const { id, startX, startY, origW, origH } = resizeState.current;
        const dx = (e.clientX - startX) / SCALE;
        const dy = (e.clientY - startY) / SCALE;
        updateLayer(id, {
          width: Math.max(40, origW + dx),
          height: Math.max(40, origH + dy),
        });
      }
    };
    const onUp = () => {
      dragState.current = null;
      resizeState.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Export to a real 1400x1400 PNG ---
  const renderToCanvas = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = exportCanvasRef.current;
      if (!canvas) return reject("No canvas");
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No context");

      ctx.fillStyle = background;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
      const imageLoaders = sorted
        .filter((l) => l.type === "image" && l.src)
        .map(
          (l) =>
            new Promise<void>((res) => {
              const img = new Image();
              img.onload = () => res();
              img.onerror = () => res();
              img.src = l.src!;
              (l as any)._imgEl = img;
            })
        );

      Promise.all(imageLoaders).then(() => {
        for (const layer of sorted) {
          if (layer.type === "shape") {
            ctx.fillStyle = layer.fill || "#ffffff";
            if (layer.shape === "ellipse") {
              ctx.beginPath();
              ctx.ellipse(
                layer.x + layer.width / 2,
                layer.y + layer.height / 2,
                layer.width / 2,
                layer.height / 2,
                0,
                0,
                Math.PI * 2
              );
              ctx.fill();
            } else {
              ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
            }
          } else if (layer.type === "image") {
            const img = (layer as any)._imgEl as HTMLImageElement | undefined;
            if (img && img.complete && img.naturalWidth > 0) {
              ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
            }
          } else if (layer.type === "text") {
            const fontSize = layer.fontSize || 80;
            ctx.fillStyle = layer.color || "#ffffff";
            ctx.font = `${layer.fontWeight || "900"} ${fontSize}px ${layer.fontFamily || "Arial"}`;
            ctx.textBaseline = "top";
            const align = layer.textAlign || "center";
            ctx.textAlign = align;
            const lines = (layer.text || "").split("\n");
            const lineHeight = fontSize * 1.15;
            let anchorX = layer.x;
            if (align === "center") anchorX = layer.x + layer.width / 2;
            if (align === "right") anchorX = layer.x + layer.width;
            lines.forEach((line, i) => {
              ctx.fillText(line, anchorX, layer.y + i * lineHeight, layer.width);
            });
          }
        }
        resolve(canvas.toDataURL("image/png"));
      });
    });
  }, [layers, background]);

  const handleExportDownload = async () => {
    const dataUrl = await renderToCanvas();
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${title.replace(/[^a-z0-9]+/gi, "_") || "album-art"}-1400x1400.png`;
    a.click();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg("");
    try {
      const dataUrl = await renderToCanvas();
      const base64 = dataUrl.split(",")[1];
      let result;
      if (savedId) {
        result = await updateAlbumArt(savedId, title, layers, background, base64);
      } else {
        result = await saveAlbumArt(title, layers, background, base64);
        setSavedId(result.id);
      }
      setStatusMsg("Saved.");
      addLog?.({
        agentName: "Art Director",
        role: "Cover Art",
        avatar: "🎨",
        message: `Album art "${title}" saved at 1400x1400 and ready to attach to a release.`,
        phase: "System",
        status: "completed",
      });
    } catch (e: any) {
      setStatusMsg(e.message || "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const openGallery = async () => {
    setShowGallery(true);
    setLoadingGallery(true);
    try {
      const items = await listAlbumArt();
      setGallery(items);
    } catch {
      setStatusMsg("Could not load saved covers.");
    } finally {
      setLoadingGallery(false);
    }
  };

  const loadFromGallery = (item: any) => {
    setTitle(item.title);
    setBackground(item.backgroundColor);
    setLayers(item.layers);
    setSavedId(item.id);
    setSelectedId(null);
    setShowGallery(false);
  };

  const removeFromGallery = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteAlbumArt(id);
    setGallery((prev) => prev.filter((g) => g.id !== id));
    if (savedId === id) setSavedId(null);
  };

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6 animate-fadeIn">
      <canvas ref={exportCanvasRef} className="hidden" />

      {/* Toolbar column */}
      <div className="xl:col-span-3 flex flex-col gap-4">
        <div className="bg-brand-card border border-white/10 rounded-[28px] p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-brand-pink border-b border-white/5 pb-3">
            <Palette className="h-4.5 w-4.5" />
            <h2 className="font-display font-black text-sm tracking-widest uppercase text-white">Cover Art Studio</h2>
          </div>
          <p className="text-[10px] font-mono text-white/40">Exports fixed at 1400 × 1400px for every streaming platform.</p>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Cover title"
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 focus:border-brand-pink/50 text-white px-3 py-2 text-xs rounded-xl outline-none font-bold"
          />

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button onClick={addTextLayer} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-brand-pink/20 border border-white/10 hover:border-brand-pink/40 rounded-xl py-2.5 text-[10px] font-mono font-bold uppercase text-white transition-all">
              <Type className="h-3.5 w-3.5" /> Text
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-brand-cyan/20 border border-white/10 hover:border-brand-cyan/40 rounded-xl py-2.5 text-[10px] font-mono font-bold uppercase text-white transition-all">
              <ImageIcon className="h-3.5 w-3.5" /> Image
            </button>
            <button onClick={() => addShapeLayer("rect")} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 rounded-xl py-2.5 text-[10px] font-mono font-bold uppercase text-white transition-all">
              <Square className="h-3.5 w-3.5" /> Rect
            </button>
            <button onClick={() => addShapeLayer("ellipse")} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 rounded-xl py-2.5 text-[10px] font-mono font-bold uppercase text-white transition-all">
              <Circle className="h-3.5 w-3.5" /> Circle
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

          <div className="mt-1">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest font-bold block mb-1.5">Background</span>
            <div className="flex flex-wrap gap-1.5">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => setBackground(c)}
                  className={`h-6 w-6 rounded-lg border-2 transition-all ${background === c ? "border-white scale-110" : "border-white/10"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="h-6 w-6 rounded-lg border-2 border-white/10 bg-transparent cursor-pointer" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-white/5">
            <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-brand-purple to-brand-pink rounded-xl py-2.5 text-[10px] font-mono font-black uppercase text-white transition-all disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> {isSaving ? "Saving..." : "Save"}
            </button>
            <button onClick={handleExportDownload} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 text-[10px] font-mono font-bold uppercase text-white transition-all">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
          <button onClick={openGallery} className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 text-[10px] font-mono font-bold uppercase text-white transition-all">
            <FolderOpen className="h-3.5 w-3.5" /> My Saved Covers
          </button>
          {statusMsg && <p className="text-[10px] font-mono text-brand-cyan text-center">{statusMsg}</p>}
        </div>

        {/* Layer inspector */}
        {selectedLayer && (
          <div className="bg-brand-card border border-white/10 rounded-[28px] p-5 flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-mono font-black uppercase text-white/60 tracking-widest">Edit Layer</span>
              <button onClick={() => deleteLayer(selectedLayer.id)} className="text-red-400 hover:text-red-300">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {selectedLayer.type === "text" && (
              <>
                <textarea
                  value={selectedLayer.text}
                  onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 focus:border-brand-pink/50 text-white px-3 py-2 text-xs rounded-xl outline-none resize-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select value={selectedLayer.fontFamily} onChange={(e) => updateLayer(selectedLayer.id, { fontFamily: e.target.value })} className="bg-white/5 border border-white/10 text-white text-[10px] rounded-lg px-2 py-1.5">
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={selectedLayer.fontSize}
                    onChange={(e) => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })}
                    className="bg-white/5 border border-white/10 text-white text-[10px] rounded-lg px-2 py-1.5"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {(["left", "center", "right"] as const).map((a) => {
                    const AlignIcon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                    return (
                      <button key={a} onClick={() => updateLayer(selectedLayer.id, { textAlign: a })} className={`p-1.5 rounded-lg border ${selectedLayer.textAlign === a ? "border-brand-pink bg-brand-pink/10 text-brand-pink" : "border-white/10 text-white/50"}`}>
                        <AlignIcon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                  <button onClick={() => updateLayer(selectedLayer.id, { fontWeight: selectedLayer.fontWeight === "900" ? "400" : "900" })} className={`p-1.5 rounded-lg border ${selectedLayer.fontWeight === "900" ? "border-brand-pink bg-brand-pink/10 text-brand-pink" : "border-white/10 text-white/50"}`}>
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SWATCHES.map((c) => (
                    <button key={c} onClick={() => updateLayer(selectedLayer.id, { color: c })} className={`h-5 w-5 rounded-md border-2 ${selectedLayer.color === c ? "border-white scale-110" : "border-white/10"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </>
            )}

            {selectedLayer.type === "shape" && (
              <div className="flex flex-wrap gap-1.5">
                {SWATCHES.map((c) => (
                  <button key={c} onClick={() => updateLayer(selectedLayer.id, { fill: c })} className={`h-6 w-6 rounded-md border-2 ${selectedLayer.fill === c ? "border-white scale-110" : "border-white/10"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <button onClick={() => moveLayerZ(selectedLayer.id, 1)} className="flex-1 flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg py-1.5 text-[9px] font-mono font-bold uppercase text-white/60">
                <ChevronUp className="h-3 w-3" /> Bring Forward
              </button>
              <button onClick={() => moveLayerZ(selectedLayer.id, -1)} className="flex-1 flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg py-1.5 text-[9px] font-mono font-bold uppercase text-white/60">
                <ChevronDown className="h-3 w-3" /> Send Back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Canvas column */}
      <div className="xl:col-span-6 flex flex-col items-center gap-3">
        <div
          ref={canvasRef}
          onMouseDown={() => setSelectedId(null)}
          className="relative rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl select-none"
          style={{ width: EDITOR_SIZE, height: EDITOR_SIZE, backgroundColor: background }}
        >
          {sortedLayers.map((layer) => {
            const style: React.CSSProperties = {
              position: "absolute",
              left: layer.x * SCALE,
              top: layer.y * SCALE,
              width: layer.width * SCALE,
              height: layer.height * SCALE,
              cursor: "move",
              outline: selectedId === layer.id ? "2px solid #ff00c8" : "none",
              outlineOffset: 2,
            };
            return (
              <div key={layer.id} style={style} onMouseDown={(e) => onLayerMouseDown(e, layer)}>
                {layer.type === "text" && (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      color: layer.color,
                      fontFamily: layer.fontFamily,
                      fontWeight: layer.fontWeight as any,
                      fontSize: (layer.fontSize || 80) * SCALE,
                      textAlign: layer.textAlign,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.15,
                      overflow: "hidden",
                    }}
                  >
                    {layer.text}
                  </div>
                )}
                {layer.type === "image" && (
                  <img src={layer.src} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
                )}
                {layer.type === "shape" && (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: layer.fill,
                      borderRadius: layer.shape === "ellipse" ? "50%" : 0,
                    }}
                  />
                )}
                {selectedId === layer.id && (
                  <div
                    onMouseDown={(e) => onResizeMouseDown(e, layer)}
                    className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 rounded-full bg-brand-pink border-2 border-white cursor-se-resize"
                  />
                )}
              </div>
            );
          })}
          {layers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-center px-8">
              <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Add text, images, or shapes from the left panel to start your cover</p>
            </div>
          )}
        </div>
        <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">1400 × 1400px canvas &bull; drag to move &bull; pink dot to resize</span>
      </div>

      {/* Layers list column */}
      <div className="xl:col-span-3">
        <div className="bg-brand-card border border-white/10 rounded-[28px] p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-brand-cyan border-b border-white/5 pb-3 mb-1">
            <LayersIcon className="h-4.5 w-4.5" />
            <h2 className="font-display font-black text-sm tracking-widest uppercase text-white">Layers</h2>
          </div>
          {sortedLayers.length === 0 && <p className="text-[10px] font-mono text-white/30 text-center py-6">No layers yet</p>}
          {[...sortedLayers].reverse().map((layer) => (
            <button
              key={layer.id}
              onClick={() => setSelectedId(layer.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left border transition-all ${
                selectedId === layer.id ? "bg-brand-pink/10 border-brand-pink/40" : "bg-white/5 border-transparent hover:bg-white/10"
              }`}
            >
              {layer.type === "text" && <Type className="h-3.5 w-3.5 text-white/50 shrink-0" />}
              {layer.type === "image" && <ImageIcon className="h-3.5 w-3.5 text-white/50 shrink-0" />}
              {layer.type === "shape" && <Square className="h-3.5 w-3.5 text-white/50 shrink-0" />}
              <span className="text-[10px] font-mono text-white/70 truncate">
                {layer.type === "text" ? layer.text || "Text" : layer.type === "image" ? "Image" : `Shape (${layer.shape})`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Gallery modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowGallery(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-brand-card border border-white/10 rounded-[28px] p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h2 className="font-display font-black text-sm tracking-widest uppercase text-white">My Saved Covers</h2>
              <button onClick={() => setShowGallery(false)}><X className="h-4 w-4 text-white/50" /></button>
            </div>
            {loadingGallery ? (
              <p className="text-center text-white/40 text-xs font-mono py-8">Loading...</p>
            ) : gallery.length === 0 ? (
              <p className="text-center text-white/40 text-xs font-mono py-8">No saved covers yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {gallery.map((item) => (
                  <div key={item.id} onClick={() => loadFromGallery(item)} className="relative group cursor-pointer rounded-xl overflow-hidden border border-white/10 hover:border-brand-pink/50 transition-all">
                    <img src={`data:image/png;base64,${item.renderedImage}`} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-end p-2">
                      <span className="text-[9px] font-mono text-white truncate flex-1">{item.title}</span>
                      <button onClick={(e) => removeFromGallery(item.id, e)} className="text-red-400 hover:text-red-300 shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
