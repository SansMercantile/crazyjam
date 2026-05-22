import React from "react";
import { motion } from "motion/react";

interface AnimatedAvatarProps {
  avatar: string; // Emoji character, custom upload DataURL, or unique key
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number;
  interactive?: boolean;
}

export function AnimatedAvatar({
  avatar,
  className = "",
  size = "md",
  interactive = true
}: AnimatedAvatarProps) {
  // Determine if this is an uploaded custom image URL
  const isCustomImage =
    avatar.startsWith("data:") ||
    avatar.startsWith("blob:") ||
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.includes("/") ||
    avatar.includes(".");

  // Size configurations
  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-9 w-9 text-sm",
    md: "h-12 w-12 text-md",
    lg: "h-20 w-20 text-lg",
    xl: "h-28 w-28 text-xl",
    "2xl": "h-36 w-36 text-2xl"
  };

  const isNumberSize = typeof size === "number";
  const selectedSizeClass = isNumberSize ? "" : sizeClasses[size as keyof typeof sizeClasses];
  const customStyle = isNumberSize ? { width: size, height: size } : undefined;

  if (isCustomImage) {
    return (
      <div 
        className={`relative rounded-2xl overflow-hidden border border-white/20 bg-black/40 shadow-inner flex items-center justify-center ${selectedSizeClass} ${className} ${
          interactive ? "hover:scale-105 hover:border-brand-cyan/50 hover:shadow-neon-cyan/20 transition-all duration-300" : ""
        }`}
        style={customStyle}
      >
        <img
          src={avatar}
          alt="User Profile"
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
        {/* Ambient Overlay Shine */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
      </div>
    );
  }

  // Helper container styles
  const wrapperStyle = `relative flex items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 shadow-lg ${selectedSizeClass} ${className}`;

  // Dedicated titles for metadata
  const titles: Record<string, string> = {
    "🎧": "Headphones Operator",
    "🎹": "Keyboard Lead",
    "🎙️": "Studio Vocalist",
    "🕵️": "Neural Agent DJ",
    "👽": "Nebula Alien",
    "🎚️": "Volume Fader Array",
    "🎸": "Guitar / Synth Strings",
    "🥁": "Beatmaker Pad",
    "⚡": "Overload Energizer",
    "👾": "Chiptune Invader"
  };
  const activeTitle = titles[avatar] || avatar;

  const renderInnerContent = () => {
    switch (avatar) {
      case "🎧": // Headphones
        return (
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-none text-brand-cyan">
            {/* Ambient pulse circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.2"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            />
            {/* Headphones Arch */}
            <motion.path
              d="M20,55 C20,25 80,25 80,55"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              animate={{ scaleY: [1, 1.04, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            />
            {/* Connection wire band */}
            <path d="M25,32 C35,21 65,21 75,32" stroke="#ff00ff" strokeWidth="2" opacity="0.6" />
            
            {/* Left Cup */}
            <motion.rect
              x="13"
              y="50"
              width="14"
              height="24"
              rx="6"
              fill="#14141d"
              stroke="currentColor"
              strokeWidth="4"
              animate={{ scale: [1, 1.08, 1], x: [0, -1, 0] }}
              transition={{ repeat: Infinity, duration: 0.75, ease: "easeInOut" }}
            />
            {/* Right Cup */}
            <motion.rect
              x="73"
              y="50"
              width="14"
              height="24"
              rx="6"
              fill="#14141d"
              stroke="currentColor"
              strokeWidth="4"
              animate={{ scale: [1, 1.08, 1], x: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.75, ease: "easeInOut" }}
            />
            {/* Pulsing visualizer bars in between */}
            <g transform="translate(32, 54)">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.rect
                  key={i}
                  x={i * 6}
                  y="0"
                  width="3"
                  height="16"
                  rx="1"
                  fill="#ff00ff"
                  transform="translate(0, 8) scale(1, -1) translate(0, -8)"
                  animate={{ scaleY: [0.3, i * 0.3 + 0.1, 0.4, i * 0.2 + 0.3, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1 + i * 0.15, ease: "easeInOut" }}
                />
              ))}
            </g>
          </svg>
        );

      case "🎹": // Piano Keyboard
        return (
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-none">
            {/* Base plate */}
            <rect x="15" y="30" width="70" height="42" rx="6" fill="#14141d" stroke="#ff00ff" strokeWidth="3" />
            
            {/* Keys grid (4 white keys) */}
            {[0, 1, 2, 3].map((index) => {
              const xPos = 21 + index * 14;
              return (
                <motion.rect
                  key={index}
                  x={xPos}
                  y="34"
                  width="12"
                  height="34"
                  rx="2"
                  fill="#ffffff"
                  stroke="#14141d"
                  strokeWidth="1.5"
                  transformOrigin="top"
                  animate={{ fill: ["#ffffff", "#00ffff", "#ffffff", "#ffffff"], y: [0, 2, 0] }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.8, 
                    delay: index * 0.3, 
                    ease: "easeInOut" 
                  }}
                />
              );
            })}

            {/* Black keys */}
            {[29, 43, 57].map((xBase, keyIdx) => (
              <motion.rect
                key={keyIdx}
                x={xBase}
                y="34"
                width="8"
                height="20"
                rx="1"
                fill="#ff00ff"
                animate={{ fill: ["#ff00ff", "#ffffff", "#ff00ff"], scaleY: [1, 0.95, 1] }}
                transition={{ repeat: Infinity, duration: 2.2, delay: keyIdx * 0.5 }}
              />
            ))}

            {/* Glowing note floating up */}
            <motion.circle
              cx="50"
              cy="20"
              r="4"
              fill="#00ffff"
              animate={{ y: [15, -15], opacity: [0, 1, 0], scale: [0.8, 1.4, 0.5] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
            />
            <motion.circle
              cx="35"
              cy="20"
              r="3"
              fill="#ff00ff"
              animate={{ y: [10, -18], opacity: [0, 1, 0], scale: [0.8, 1.2, 0.4] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.8, ease: "easeOut" }}
            />
          </svg>
        );

      case "🎙️": // Vintage Microphone
        return (
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-none text-[#e59632]">
            {/* Concentric soundwaves emitting outward */}
            <motion.circle
              cx="50"
              cy="40"
              r="22"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.6"
              animate={{ scale: [0.8, 1.6], opacity: [0.8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
            />
            <motion.circle
              cx="50"
              cy="40"
              r="34"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.4"
              animate={{ scale: [0.8, 1.8], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.8, ease: "easeOut" }}
            />

            {/* Stand Base */}
            <path d="M35,80 L65,80 M50,68 L50,80" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
            {/* U-Shaped cradle */}
            <path d="M36,44 C36,65 64,65 64,44" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />

            {/* Mic Body Capsule */}
            <motion.rect
              x="42"
              y="26"
              width="16"
              height="28"
              rx="8"
              fill="#14141d"
              stroke="currentColor"
              strokeWidth="4.5"
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            />
            {/* Grille details */}
            <motion.path
              d="M42,35 L58,35 M42,41 L58,41 M50,26 L50,45"
              stroke="#ff00ff"
              strokeWidth="1.5"
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            />
          </svg>
        );

      case "🕵️": // Cyber Agent DJ / Producer
        return (
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-none">
            {/* Grid network background */}
            <path d="M10,25 Q50,15 90,25 M10,75 Q50,85 90,75 M20,10 L80,90" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" />
            
            {/* Producer Hood & Silhouette */}
            <motion.path
              d="M22,78 C22,65 33,52 50,52 C67,52 78,65 78,78"
              stroke="currentColor"
              className="text-purple-400"
              strokeWidth="5.5"
              fill="#14141d"
            />
            
            {/* Hood circle */}
            <motion.path
              d="M32,54 C24,44 26,24 50,24 C74,24 76,44 68,54"
              stroke="currentColor"
              className="text-purple-400"
              strokeWidth="6"
              fill="#14141d"
              strokeLinecap="round"
              animate={{ scaleY: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            />

            {/* Sunglasses / Visor */}
            <motion.rect
              x="36"
              y="38"
              width="28"
              height="9"
              rx="3.5"
              fill="#14141d"
              stroke="#ff00ff"
              strokeWidth="3.5"
              animate={{ stroke: ["#ff00ff", "#00ffff", "#ff00ff"] }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            />

            {/* Glowing sweep scanner inside visor */}
            <motion.rect
              x="38"
              y="40"
              width="4"
              height="5"
              fill="#00ffff"
              filter="blur(0.5px)"
              animate={{ x: [0, 20, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            />

            {/* Cybernetic code circles next to head */}
            <motion.circle
              cx="18"
              cy="34"
              r="3"
              fill="#00ffff"
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.9, 0.3] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            <motion.circle
              cx="82"
              cy="45"
              r="2.5"
              fill="#ff00ff"
              animate={{ scale: [1.3, 0.8, 1.3], opacity: [0.8, 0.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.7, delay: 0.5, ease: "easeInOut" }}
            />
          </svg>
        );

      case "👽": // Alien Synth Head
        return (
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-none text-emerald-400">
            {/* Outer space floating elements */}
            <motion.circle
              cx="20"
              cy="25"
              r="1.5"
              fill="#00ffff"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
            />
            <motion.circle
              cx="80"
              cy="22"
              r="2"
              fill="#ff00ff"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 2.1 }}
            />

            <motion.g
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              {/* Alien Head Outline */}
              <path
                d="M30,30 C30,14 70,14 70,30 C70,44 56,66 50,66 C44,66 30,44 30,30 Z"
                fill="#14141d"
                stroke="currentColor"
                strokeWidth="4.5"
                strokeLinejoin="round"
              />

              {/* Big Glossy Eyes */}
              <motion.path
                d="M36,32 C36,25 46,28 46,38 C41,40 36,36 36,32 Z"
                fill="#ff00ff"
                animate={{ fill: ["#ff00ff", "#00ffff", "#ff00ff"] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              />
              <motion.path
                d="M64,32 C64,25 54,28 54,38 C59,40 64,36 64,32 Z"
                fill="#ff00ff"
                animate={{ fill: ["#ff00ff", "#00ffff", "#ff00ff"] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.2 }}
              />

              {/* Tiny nose notches and mouth line */}
              <circle cx="47" cy="46" r="1" fill="currentColor" />
              <circle cx="53" cy="46" r="1" fill="currentColor" />
              <motion.path
                d="M44,53 Q50,56 56,53"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                animate={{ d: ["M44,53 Q50,56 56,53", "M46,54 H54", "M44,53 Q50,56 56,53"] }}
                transition={{ repeat: Infinity, duration: 3, delay: 1 }}
              />
            </motion.g>
          </svg>
        );

      case "🎚️": // Mixer Sliders
        return (
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-none text-brand-pink">
            {/* 3 slider slot lines */}
            {[26, 50, 74].map((xBase, ch) => (
              <g key={ch}>
                {/* Channel slot */}
                <line x1={xBase} y1="20" x2={xBase} y2="80" stroke="#1d1d2b" strokeWidth="6" strokeLinecap="round" />
                <line x1={xBase} y1="20" x2={xBase} y2="80" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.4" />

                {/* Vertical decibel lines */}
                <line x1={xBase - 6} y1="35" x2={xBase - 3} y2="35" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
                <line x1={xBase - 6} y1="50" x2={xBase - 3} y2="50" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
                <line x1={xBase - 6} y1="65" x2={xBase - 3} y2="65" stroke="#ffffff" strokeWidth="1" opacity="0.3" />

                {/* Animated Slider caps */}
                <motion.rect
                  x={xBase - 7}
                  width="14"
                  height="10"
                  rx="2"
                  fill="#00ffff"
                  stroke="#14141d"
                  strokeWidth="2"
                  transformOrigin="center"
                  animate={{ y: ch === 1 ? [25, 65, 25] : ch === 0 ? [55, 25, 55] : [40, 70, 40] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2 + ch * 0.4,
                    ease: "easeInOut"
                  }}
                />
              </g>
            ))}
          </svg>
        );

      case "🎸": // Guitar Neck
        return (
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-none text-[#ff00ff]">
            {/* Guitar wood background grid */}
            <path d="M15,85 L85,15" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" />
            
            {/* Frets neck grid */}
            <path d="M26,74 L42,90 M40,60 L56,76 M54,46 L70,62 M68,32 L84,48" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

            {/* Synthesizer strings lines that vibrate! */}
            <motion.path
              d="M10,90 L90,10"
              stroke="#00ffff"
              strokeWidth="3.5"
              animate={{ d: [
                "M10,90 L90,10",
                "M10,90 Q47,47 90,10",
                "M10,90 Q53,53 90,10",
                "M10,90 L90,10"
              ] }}
              transition={{ repeat: Infinity, duration: 0.18, ease: "linear" }}
            />
            <motion.path
              d="M18,92 L92,18"
              stroke="#ff00ff"
              strokeWidth="2.5"
              animate={{ d: [
                "M18,92 L92,18",
                "M18,92 Q51,51 92,18",
                "M18,92 Q59,59 92,18",
                "M18,92 L92,18"
              ] }}
              transition={{ repeat: Infinity, duration: 0.22, ease: "linear", delay: 0.05 }}
            />
            <motion.path
              d="M26,94 L94,26"
              stroke="#00ffff"
              strokeWidth="1.5"
              opacity="0.8"
              animate={{ d: [
                "M26,94 L94,26",
                "M26,94 Q56,56 94,26",
                "M26,94 L94,26"
              ] }}
              transition={{ repeat: Infinity, duration: 0.15, ease: "linear", delay: 0.08 }}
            />

            {/* Glowing music sparkle particles */}
            <motion.circle
              cx="55"
              cy="35"
              r="2.5"
              fill="#e2933a"
              animate={{ scale: [0.5, 1.4, 0.5], opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            />
          </svg>
        );

      case "🥁": // Drum Pad Controller
        return (
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-none">
            {/* Chassis outline */}
            <rect x="18" y="18" width="64" height="64" rx="8" fill="#14141d" stroke="#1d1d2b" strokeWidth="4" />

            {/* 4 neon drum pads */}
            <g transform="translate(23, 23)">
              {/* Pad 1 */}
              <motion.rect
                x="0"
                y="0"
                width="22"
                height="22"
                rx="4"
                fill="#1c1424"
                stroke="#ff00ff"
                strokeWidth="2"
                animate={{ fill: ["#1c1424", "#ff00ff", "#1c1424", "#1c1424"], scale: [1, 0.96, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              />
              
              {/* Pad 2 */}
              <motion.rect
                x="32"
                y="0"
                width="22"
                height="22"
                rx="4"
                fill="#141d24"
                stroke="#00ffff"
                strokeWidth="2"
                animate={{ fill: ["#141d24", "#141d24", "#00ffff", "#141d24"], scale: [1, 1.02, 0.96, 1] }}
                transition={{ repeat: Infinity, duration: 1.6, delay: 0.4, ease: "easeInOut" }}
              />

              {/* Pad 3 */}
              <motion.rect
                x="0"
                y="32"
                width="22"
                height="22"
                rx="4"
                fill="#141d24"
                stroke="#00ffff"
                strokeWidth="2"
                animate={{ fill: ["#141d24", "#141d24", "#141d24", "#00ffff"], scale: [1, 1, 1.04, 0.96] }}
                transition={{ repeat: Infinity, duration: 1.6, delay: 0.8, ease: "easeInOut" }}
              />

              {/* Pad 4 */}
              <motion.rect
                x="32"
                y="32"
                width="22"
                height="22"
                rx="4"
                fill="#1c1c14"
                stroke="#e2933a"
                strokeWidth="2"
                animate={{ fill: ["#1c1c14", "#e2933a", "#1c1c14", "#1c1c14"], scale: [1, 0.95, 1, 1] }}
                transition={{ repeat: Infinity, duration: 1.6, delay: 1.2, ease: "easeInOut" }}
              />
            </g>
          </svg>
        );

      case "⚡": // Lightning Spark
        return (
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-none text-yellow-400">
            {/* Electric field aura circles */}
            <motion.circle
              cx="50"
              cy="50"
              r="24"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.3"
              strokeDasharray="3 5"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            />
            
            {/* Energetic lightning path with twitch shakiness */}
            <motion.path
              d="M52,15 L32,54 L50,54 L44,85 L68,44 L48,44 Z"
              fill="#e2933a"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="filter drop-shadow"
              animate={{
                scale: [1, 1.15, 0.95, 1.1, 1],
                x: [0, 1, -1.5, 0.5, 0],
                y: [0, -0.5, 1, -1, 0]
              }}
              transition={{ repeat: Infinity, duration: 0.45, ease: "linear" }}
            />

            {/* Glowing power flashes */}
            <motion.circle
              cx="50"
              cy="50"
              r="6"
              fill="currentColor"
              opacity="0.25"
              filter="blur(3px)"
              animate={{ scale: [1, 2.5, 1] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            />
          </svg>
        );

      case "👾": // Pixel Retro Game Synth Monster
        return (
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-none text-brand-cyan">
            {/* Matrix arcade line */}
            <line x1="10" y1="80" x2="90" y2="80" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />

            {/* 8-bit invader pixel blocks */}
            <motion.g
              animate={{ y: [0, -4, 0], scaleX: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            >
              {/* Outer Invader body grids */}
              {/* Row 1 */}
              <rect x="38" y="24" width="8" height="8" rx="1.5" fill="currentColor" />
              <rect x="54" y="24" width="8" height="8" rx="1.5" fill="currentColor" />
              {/* Row 2 */}
              <rect x="30" y="32" width="40" height="8" rx="1.5" fill="currentColor" />
              {/* Row 3 (with eye holes) */}
              <rect x="22" y="40" width="8" height="8" rx="1.5" fill="currentColor" />
              <rect x="38" y="40" width="8" height="8" rx="1.5" fill="currentColor" />
              <rect x="54" y="40" width="8" height="8" rx="1.5" fill="currentColor" stroke="#1d1d2b" />
              <rect x="70" y="40" width="8" height="8" rx="1.5" fill="currentColor" />
              {/* Row 4 */}
              <rect x="22" y="48" width="56" height="8" rx="1.5" fill="currentColor" />
              {/* Row 5 */}
              <rect x="30" y="56" width="40" height="8" rx="1.5" fill="currentColor" />
              {/* Row 6 (Legs/Tentacles changing states) */}
              <motion.rect
                x="22"
                y="64"
                width="8"
                height="8"
                rx="1.5"
                fill="currentColor"
                animate={{ height: [8, 16, 8] }}
                transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut" }}
              />
              <motion.rect
                x="38"
                y="64"
                width="8"
                height="8"
                rx="1.5"
                fill="currentColor"
                animate={{ height: [12, 6, 12] }}
                transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut" }}
              />
              <motion.rect
                x="54"
                y="64"
                width="8"
                height="8"
                rx="1.5"
                fill="currentColor"
                animate={{ height: [6, 14, 6] }}
                transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut" }}
              />
              <motion.rect
                x="70"
                y="64"
                width="8"
                height="8"
                rx="1.5"
                fill="currentColor"
                animate={{ height: [8, 16, 8] }}
                transition={{ repeat: Infinity, duration: 0.7, delay: 0.2, ease: "easeInOut" }}
              />
            </motion.g>

            {/* Glowing neon eyes */}
            <motion.rect
              x="33"
              y="42"
              width="4"
              height="4"
              fill="#ff00ff"
              animate={{ fill: ["#ff00ff", "#00ffff", "#ff00ff"] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <motion.rect
              x="63"
              y="42"
              width="4"
              height="4"
              fill="#ff00ff"
              animate={{ fill: ["#ff00ff", "#00ffff", "#ff00ff"] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}
            />
          </svg>
        );

      default: // Procedural musical grid orb fallback for any other emojis/strings
        return (
          <svg viewBox="0 0 100 100" className="w-[85%] h-[85%] fill-none">
            {/* Spinning galactic ambient orbit */}
            <motion.circle
              cx="50"
              cy="50"
              r="38"
              stroke="#ff00ff"
              strokeWidth="1.5"
              opacity="0.3"
              strokeDasharray="4 6"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            />
            <motion.circle
              cx="50"
              cy="50"
              r="28"
              stroke="#00ffff"
              strokeWidth="1"
              opacity="0.4"
              strokeDasharray="2 3"
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            />
            {/* Inner background orb glow */}
            <motion.circle
              cx="50"
              cy="50"
              r="22"
              fill="rgba(112,0,255,0.15)"
              stroke="rgba(255,0,255,0.25)"
              strokeWidth="2"
              animate={{ scale: [0.94, 1.06, 0.94] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            {/* Layering emoji character layered elegantly inside */}
            <foreignObject x="0" y="0" width="100" height="100">
              <div className="w-full h-full flex items-center justify-center text-xl select-none leading-none pt-1">
                {avatar}
              </div>
            </foreignObject>
          </svg>
        );
    }
  };

  return (
    <div 
      className={`${wrapperStyle} ${interactive ? "hover:scale-105 hover:border-brand-pink/40 hover:shadow-[#ff00ff]/10 transition-all duration-300" : ""}`}
      style={customStyle}
      title={activeTitle}
    >
      {renderInnerContent()}
    </div>
  );
}
