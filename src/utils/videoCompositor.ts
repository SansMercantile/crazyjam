/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Real client-side video compositing: draws a background clip full-frame
 * and an overlay clip as a rounded picture-in-picture corner box, mixes
 * both clips' audio tracks, and records the result via Canvas
 * captureStream() + MediaRecorder - same underlying technique
 * MusicVideoCreator already uses for its own timeline export, just
 * applied to two source clips instead of a sequence of them.
 */

export interface CompositeOptions {
  /** 0-1, fraction of canvas width the overlay box occupies. */
  overlaySize?: number;
  /** Corner to place the overlay in. */
  corner?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /** Canvas output size. */
  width?: number;
  height?: number;
}

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("video");
    el.src = URL.createObjectURL(file);
    el.muted = false;
    el.playsInline = true;
    el.crossOrigin = "anonymous";
    el.onloadedmetadata = () => resolve(el);
    el.onerror = () => reject(new Error("Could not load video for compositing"));
  });
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Composites `overlay` (typically a Wav2Lip performer clip) as a
 * picture-in-picture box on top of `background` (typically an AI Video
 * Director atmosphere clip), mixes both clips' real audio, and returns a
 * single combined mp4/webm File. The shorter clip loops to match the
 * longer one's duration (capped at 20s to avoid runaway output).
 */
export async function compositeOverlayVideo(
  background: File,
  overlay: File,
  opts: CompositeOptions = {}
): Promise<File> {
  const { overlaySize = 0.32, corner = "bottom-right", width = 1280, height = 720 } = opts;

  const [bgVideo, overlayVideo] = await Promise.all([loadVideo(background), loadVideo(overlay)]);

  const duration = Math.min(Math.max(bgVideo.duration, overlayVideo.duration), 20);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Real audio mix: both clips' actual audio tracks, summed through a
  // shared gain stage into a MediaStreamDestination.
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const bgSource = audioCtx.createMediaElementSource(bgVideo);
  const overlaySource = audioCtx.createMediaElementSource(overlayVideo);
  const bgGain = audioCtx.createGain();
  const overlayGain = audioCtx.createGain();
  bgGain.gain.value = 0.5; // atmosphere track sits under the vocal
  overlayGain.gain.value = 1.0; // performer's voice stays prominent
  bgSource.connect(bgGain).connect(dest);
  overlaySource.connect(overlayGain).connect(dest);

  const canvasStream = (canvas as any).captureStream(30) as MediaStream;
  const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";
  const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const overlayW = width * overlaySize;
  const overlayH = overlayW * (height / width);
  const margin = width * 0.03;
  const [overlayX, overlayY] =
    corner === "bottom-right" ? [width - overlayW - margin, height - overlayH - margin] :
    corner === "bottom-left" ? [margin, height - overlayH - margin] :
    corner === "top-right" ? [width - overlayW - margin, margin] :
    [margin, margin];

  const drawFrame = () => {
    ctx.drawImage(bgVideo, 0, 0, width, height);
    ctx.save();
    roundedRectPath(ctx, overlayX, overlayY, overlayW, overlayH, overlayW * 0.06);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 3;
    ctx.drawImage(overlayVideo, overlayX, overlayY, overlayW, overlayH);
    ctx.restore();
    roundedRectPath(ctx, overlayX, overlayY, overlayW, overlayH, overlayW * 0.06);
    ctx.stroke();
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = async () => {
      audioCtx.close().catch(() => {});
      URL.revokeObjectURL(bgVideo.src);
      URL.revokeObjectURL(overlayVideo.src);
      const blob = new Blob(chunks, { type: mimeType });
      resolve(new File([blob], `director-composite-${Date.now()}.webm`, { type: mimeType }));
    };
    recorder.onerror = (e) => reject(e);

    let rafId: number;
    let stopped = false;
    const loopIfNeeded = (video: HTMLVideoElement) => {
      if (video.ended && !stopped) video.currentTime = 0, video.play().catch(() => {});
    };

    const tick = () => {
      if (stopped) return;
      drawFrame();
      loopIfNeeded(bgVideo);
      loopIfNeeded(overlayVideo);
      rafId = requestAnimationFrame(tick);
    };

    Promise.all([bgVideo.play(), overlayVideo.play()])
      .then(() => {
        recorder.start();
        tick();
        setTimeout(() => {
          stopped = true;
          cancelAnimationFrame(rafId);
          bgVideo.pause();
          overlayVideo.pause();
          recorder.stop();
        }, duration * 1000);
      })
      .catch(reject);
  });
}
