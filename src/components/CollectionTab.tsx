/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { PIKMIN_CHARACTERS, INITIAL_COLLECTIONS, COLLECTION_LORE } from "../utils/constants";
import { CollectionItem, PikminCharacter, PikminColor } from "../types";
import { Award, BookOpen, Star, Trash2 } from "lucide-react";

// Canvas Renderer for Element Portrait
const SpiritAvatarCanvas: React.FC<{ characterId: string }> = ({ characterId }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    timeRef.current = 0;

    const render = () => {
      timeRef.current += 1;
      const t = timeRef.current;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Save/Restore State
      ctx.save();

      const cx = w / 2;
      const cy = h / 2 + 15; // lower down slightly to make room for stem & leaf

      // Colors definition based on characterId (Matching PikminRunnerGame.tsx EXACTLY!)
      const bodyColorTable = {
        Red: "#ff7300",    // Fire Red / Orange Warmth
        Blue: "#38bdf8",   // Water Sky Blue Glow
        Yellow: "#fbbf24", // Electric Yellow Brightness
        Purple: "#a78bfa", // Gravity Deep Violet
        White: "#f1f5f9",  // Poison White Spores
        Pink: "#f472b6",   // Butterfly Pink Blossom
        Rock: "#6b7280",   // Rock Gray Stone
      };

      const strokeColorTable = {
        Red: "#7c2d12",
        Blue: "#0c4a6e",
        Yellow: "#78350f",
        Purple: "#3b0764",
        White: "#475569",
        Pink: "#701a75",
        Rock: "#1c1917",
      };

      const pikminColorVal = bodyColorTable[characterId as keyof typeof bodyColorTable] || "#ff7300";
      const pikminStrokeVal = strokeColorTable[characterId as keyof typeof strokeColorTable] || "#7c2d12";

      // Draw shadow under legs
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 32, 24, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Define body size parameters for portrait rendering (scaled slightly up)
      const p = {
        x: cx - 25,
        y: cy - 23,
        width: 50,
        height: 50
      };

      // 1. DRAW LEGS
      let legStrokeVal = pikminStrokeVal;
      if (characterId === PikminColor.White) {
        legStrokeVal = "#cbd5e1"; // light gray legs for Poison
      }
      ctx.strokeStyle = legStrokeVal;
      ctx.lineWidth = 4.5;
      ctx.lineCap = "round";

      // Breathing animation bob
      const legsBobY = Math.sin(t * 0.1) * 3;

      // Left leg
      ctx.beginPath();
      ctx.moveTo(p.x + p.width / 3, p.y + p.height - 10);
      ctx.lineTo(p.x + p.width / 3 - 3, p.y + p.height + legsBobY + 6);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(p.x + (p.width * 2) / 3, p.y + p.height - 10);
      ctx.lineTo(p.x + (p.width * 2) / 3 + 3, p.y + p.height - legsBobY + 6);
      ctx.stroke();

      // 2. DRAW MAIN SPECIFIC BODY SHAPE (Using exact physics/vector paths of the game!)
      ctx.fillStyle = pikminColorVal;
      ctx.strokeStyle = pikminStrokeVal;
      ctx.lineWidth = 3.5;

      if (characterId === PikminColor.Red) {
        // Red Fire Element burning flame
        ctx.beginPath();
        const rx = p.width / 2;
        const ry = p.height / 2;
        const fireTime = t * 0.15;
        const swayY1 = Math.sin(fireTime) * 3;
        const swayY2 = Math.cos(fireTime) * 3;
        const swayY3 = Math.sin(fireTime + 2) * 3;

        ctx.moveTo(cx, cy + ry);
        ctx.bezierCurveTo(cx + rx + 2, cy + ry, cx + rx, cy, cx + rx - 2, cy - ry / 3);
        // flame licks
        ctx.quadraticCurveTo(cx + rx / 2 + 3, cy - ry + swayY1, cx + rx / 3, cy - ry / 2);
        ctx.quadraticCurveTo(cx, cy - ry - 7 + swayY2, cx - rx / 4, cy - ry / 2);
        ctx.quadraticCurveTo(cx - rx / 2 - 3, cy - ry + swayY3, cx - rx + 2, cy - ry / 3);
        ctx.bezierCurveTo(cx - rx, cy, cx - rx - 2, cy + ry, cx, cy + ry);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Internal burning core layer
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fed7aa"; // light fire orange core
        ctx.beginPath();
        ctx.ellipse(cx, cy + 3, rx - 6, ry - 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

      } else if (characterId === PikminColor.Blue) {
        // Blue Water classic waterdrop (上尖下圓的經典水滴)
        ctx.beginPath();
        const rx = p.width / 2 + 3;
        const ry = p.height / 2;
        ctx.moveTo(cx, cy - ry - 15); // Very sharp point at top
        ctx.bezierCurveTo(cx + rx + 3, cy - ry + 3, cx + rx + 3, cy + ry, cx, cy + ry);
        ctx.bezierCurveTo(cx - rx - 3, cy + ry, cx - rx - 3, cy - ry + 3, cx, cy - ry - 15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bubble glaze shine highlight
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.beginPath();
        ctx.ellipse(cx - 5, cy - 6, 4, 2, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

      } else if (characterId === PikminColor.Yellow) {
        // Yellow Electric Star
        ctx.beginPath();
        const outer = p.height / 2 + 2;
        const inner = 12;
        ctx.moveTo(cx, cy - outer);
        ctx.lineTo(cx + inner, cy - inner);
        ctx.lineTo(cx + outer, cy);
        ctx.lineTo(cx + inner, cy + inner);
        ctx.lineTo(cx, cy + outer);
        ctx.lineTo(cx - inner, cy + inner);
        ctx.lineTo(cx - outer, cy);
        ctx.lineTo(cx - inner, cy - inner);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Sparkle rays
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1.5;
        const angleSpark = t * 0.1;
        for (let i = 0; i < 4; i++) {
          const angle = angleSpark + (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * (outer + 2), cy + Math.sin(angle) * (outer + 2));
          ctx.lineTo(cx + Math.cos(angle) * (outer + 11), cy + Math.sin(angle) * (outer + 11));
          ctx.stroke();
        }
        ctx.restore();

      } else if (characterId === PikminColor.Purple) {
        // Purple Gravity Celestial Ring Orbit
        ctx.beginPath();
        const r = p.width / 2;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Saturn-like Gravity celestial ring
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, r + 11, 4, -Math.PI / 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

      } else if (characterId === PikminColor.White) {
        // White Poison spores - Fuzzy Spikes and Glow central orb (no border)
        const d_radius = 12;

        ctx.save();
        ctx.shadowBlur = 24;
        ctx.shadowColor = "rgba(168, 85, 247, 0.45)";
        ctx.fillStyle = "rgba(243, 232, 255, 0.25)";
        ctx.beginPath();
        ctx.arc(cx, cy, d_radius + 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Radial fuzzy lines (淺灰色絨毛)
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2;
        const spikesCount = 13;
        for (let i = 0; i < spikesCount; i++) {
          const angle = (i * Math.PI * 2) / spikesCount + (t * 0.04);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * (d_radius + 8), cy + Math.sin(angle) * (d_radius + 8));
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx + Math.cos(angle) * (d_radius + 8), cy + Math.sin(angle) * (d_radius + 8), 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "#cbd5e1";
          ctx.fill();
        }
        ctx.restore();

        // Central white circle base
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx, cy, d_radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

      } else if (characterId === PikminColor.Pink) {
        // Pink Butterfly elements
        ctx.beginPath();
        ctx.roundRect(cx - 5.5, cy - 15, 11, 35, 5.5);
        ctx.fill();
        ctx.stroke();

        // Butterfly giant wings
        ctx.save();
        ctx.shadowBlur = 0;
        const waveWing = Math.sin(t * 0.4) * 0.25;
        ctx.fillStyle = "rgba(244, 114, 182, 0.85)";
        ctx.strokeStyle = "#86198f";
        ctx.lineWidth = 2.5;

        // Left wings
        ctx.beginPath();
        ctx.ellipse(cx - 16, cy - 10, 19, 13, -0.4 + waveWing, 0, Math.PI * 2);
        ctx.ellipse(cx - 13, cy + 5, 12, 8, -Math.PI / 6 + waveWing, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right wings
        ctx.beginPath();
        ctx.ellipse(cx + 16, cy - 10, 19, 13, 0.4 - waveWing, 0, Math.PI * 2);
        ctx.ellipse(cx + 13, cy + 5, 12, 8, Math.PI / 6 - waveWing, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Antennae
        ctx.strokeStyle = pikminStrokeVal;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 2, cy - 12);
        ctx.quadraticCurveTo(cx - 8, cy - 22, cx - 12, cy - 20);
        ctx.moveTo(cx + 2, cy - 12);
        ctx.quadraticCurveTo(cx + 8, cy - 22, cx + 12, cy - 20);
        ctx.stroke();

        ctx.fillStyle = pikminStrokeVal;
        ctx.beginPath();
        ctx.arc(cx - 12, cy - 20, 1.8, 0, Math.PI * 2);
        ctx.arc(cx + 12, cy - 20, 1.8, 0, Math.PI * 2);
        ctx.fill();

      } else if (characterId === PikminColor.Rock) {
        // Rock Slate Gray heavy blocky shale octagon
        const w = 34;
        const h = 37;
        ctx.beginPath();
        ctx.roundRect(cx - w / 2, cy - h / 2 + 3, w, h, 8);
        ctx.fill();
        ctx.stroke();

        // Strata rock lines (頁岩層紋)
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#4b5563";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - w / 2 + 3, cy - 6);
        ctx.quadraticCurveTo(cx, cy - 5, cx + w / 2 - 3, cy - 7);
        ctx.moveTo(cx - w / 2 + 2, cy + 1);
        ctx.quadraticCurveTo(cx, cy + 3, cx + w / 2 - 2, cy + 0);
        ctx.moveTo(cx - w / 2 + 3, cy + 8);
        ctx.quadraticCurveTo(cx, cy + 7, cx + w / 2 - 3, cy + 9);
        ctx.stroke();
        ctx.restore();
      }

      // 3. DRAW INNOCENT GIANT EYE DETAILS (Matching look of game eyes perfectly!)
      ctx.save();
      ctx.shadowBlur = 0;

      const eyeY = cy - 2;
      const eyeSpacer = 6.2;
      const eyeRad = 5;

      // Sclera separately to avoid bridge-connecting lines
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx - eyeSpacer, eyeY, eyeRad, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx + eyeSpacer, eyeY, eyeRad, 0, Math.PI * 2);
      ctx.fill();

      // Pupils (Green for Poison/White, deep dark slate for others)
      ctx.fillStyle = characterId === PikminColor.White ? "#10b981" : "#22252a";
      ctx.beginPath();
      ctx.arc(cx - eyeSpacer, eyeY, eyeRad - 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx + eyeSpacer, eyeY, eyeRad - 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Dual Highlighting glistening specs
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx - eyeSpacer - 1.2, eyeY - 1.2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx + eyeSpacer - 1.2, eyeY - 1.2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx - eyeSpacer + 1.2, eyeY + 1.2, 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx + eyeSpacer + 1.2, eyeY + 1.2, 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [characterId]);

  return (
    <div className="relative flex items-center justify-center p-2 rounded-xl bg-radial from-[#FDFBF7] to-[#E8E1D5] border-2 border-[#8C7E6A] shadow-inner mb-2 w-[140px] h-[160px]">
      {/* Dynamic scanlines accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none opacity-40 animate-pulse" />
      <canvas ref={canvasRef} width={130} height={150} className="w-[130px] h-[150px] object-contain drop-shadow-sm" />
    </div>
  );
};


interface CollectionTabProps {
  collectedStats: { [key: string]: number }; // ID -> count
  onResetCollection?: () => void;
}

export const CollectionTab: React.FC<CollectionTabProps> = ({
  collectedStats,
  onResetCollection,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"spirits" | "fruits">("spirits");
  const [selectedSpirit, setSelectedSpirit] = useState<PikminCharacter>(PIKMIN_CHARACTERS[0]);

  // Combine static item lists with dynamic local storage statistics
  const fruitsWithStats: CollectionItem[] = INITIAL_COLLECTIONS.map((item) => {
    const actualCount = collectedStats[item.id] || 0;
    // Unlocked level: 0 if 0 collections, 1 if 1+, 2 if 5+, 3 if 15+
    let level = 0;
    if (actualCount >= 15) level = 3;
    else if (actualCount >= 5) level = 2;
    else if (actualCount >= 1) level = 1;

    return {
      ...item,
      count: actualCount,
      unlockedLevel: level,
    };
  });

  return (
    <div className="bg-[#FDFBF7] border-4 border-[#8C7E6A] rounded-2xl p-4 sm:p-6 shadow-md animate-fade-in" id="collection-tab-container">
      {/* Tab headers */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b-2 border-dashed border-[#D1C7B7] pb-4 mb-6 gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab("spirits")}
            className={`px-4 py-2 text-xs font-serif font-bold italic rounded-lg border-2 transition duration-150 ${
              activeSubTab === "spirits"
                ? "bg-[#5A5A40] border-[#2D2D1B] text-white shadow-xs"
                : "bg-white border-[#D1C7B7] text-[#5A5A40] hover:bg-[#F5F2ED]"
            }`}
          >
            元素精靈圖鑑 (Spirits)
          </button>
          <button
            onClick={() => setActiveSubTab("fruits")}
            className={`px-4 py-2 text-xs font-serif font-bold italic rounded-lg border-2 transition duration-150 ${
              activeSubTab === "fruits"
                ? "bg-[#5A5A40] border-[#2D2D1B] text-white shadow-xs"
                : "bg-white border-[#D1C7B7] text-[#5A5A40] hover:bg-[#F5F2ED]"
            }`}
          >
            微光秘境奇珍 (Curiosities)
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs bg-[#F5F2ED] px-3 py-1.5 rounded-lg border border-[#D1C7B7] text-[#8C7E6A] font-serif italic">
          <BookOpen className="w-3.5 h-3.5 text-[#89C09E]" />
          <span>圖鑑解鎖率: {Math.floor((Object.keys(collectedStats).filter(k => collectedStats[k] > 0).length / INITIAL_COLLECTIONS.length) * 100)}%</span>
        </div>
      </div>

      {/* SUB-TAB 1: SPIRIT ENCYCLOPEDIA */}
      {activeSubTab === "spirits" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5" id="spirit_dictionary_view">
          {/* Left: Spirit items menu column */}
          <div className="md:col-span-5 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 scrollbar-none">
            {PIKMIN_CHARACTERS.map((char) => (
              <button
                key={char.id}
                onClick={() => setSelectedSpirit(char)}
                className={`p-3 rounded-xl border-2 text-left flex items-center md:justify-between shrink-0 md:shrink gap-3 transition-all duration-150 ${
                  selectedSpirit.id === char.id
                    ? "bg-[#5A5A40] border-[#2D2D1B] text-white"
                    : "bg-white border-[#D1C7B7] text-[#5A5A40] hover:bg-[#F5F2ED]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full border border-black/15 flex items-center justify-center text-lg ${char.accentColor}`}>
                    {char.id === "Red" ? "🔥" : char.id === "Blue" ? "💧" : char.id === "Yellow" ? "⚡" : char.id === "Purple" ? "🌌" : char.id === "White" ? "🍄" : char.id === "Pink" ? "🦋" : "🪨"}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm tracking-tight font-serif italic">{char.name}</h4>
                    <p className="text-[10px] font-mono opacity-70 uppercase">{char.jpName}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E8E1D5] text-[#5A5A40] font-bold ml-auto md:ml-0">
                  跑速: {char.speed}
                </span>
              </button>
            ))}
          </div>

          {/* Right: Selected Spirit details */}
          <div className="md:col-span-7 bg-[#F5F2ED] border-4 border-[#8C7E6A] rounded-2xl p-4 sm:p-5 shadow-xs transform -rotate-0.5">
            {/* Header Layout Row: Name/JP Name & Speed Indicators */}
            <div className="flex items-start justify-between mb-4 border-b-2 border-dashed border-[#D1C7B7] pb-3">
              <div>
                <h3 className={`text-xl sm:text-2xl font-bold font-serif italic ${selectedSpirit.textColor}`}>
                  {selectedSpirit.name}
                </h3>
                <p className="text-xs font-bold text-[#8C7E6A] font-serif italic">
                  {selectedSpirit.jpName}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xl sm:text-2xl font-mono font-bold text-[#5A5A40]">
                  {selectedSpirit.speed} <span className="text-xs opacity-60">/ 10</span>
                </span>
                <p className="text-[8px] font-mono text-stone-400 font-bold uppercase tracking-wider leading-none">跑速指標</p>
              </div>
            </div>

            {/* Split layout: Photo & Whisper Quote on Left Column, Description & Tech Stats on Right Column */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Column: 精靈照片 AND THEN 精靈微光呢喃 right below */}
              <div className="md:col-span-5 flex flex-col gap-3">
                <div className="w-full bg-[#FCFAF6] border-2 border-[#8C7E6A] rounded-xl p-3 flex flex-col items-center relative overflow-hidden shadow-sm">
                  {/* Stamp title changed to 元素精靈簡介 */}
                  <div className="text-[9px] font-mono tracking-wider font-extrabold text-[#8C7E6A] uppercase mb-2 border-b border-dashed border-[#D1C7B7] pb-1 w-full text-center">
                    ✿ 元素精靈簡介 ✿
                  </div>
                  
                  {/* Real-time high fidelity dynamic avatar matching rendering inside game */}
                  <SpiritAvatarCanvas characterId={selectedSpirit.id} />

                  {/* Registered text stamps */}
                  <div className="w-full text-center mt-1">
                    <span className="text-[9px] font-serif font-extrabold italic text-stone-800 bg-[#E8E1D5] px-2 py-0.5 rounded border border-[#D1C7B7]">
                      STATUS: ACTIVE
                    </span>
                    <span className="text-[8px] font-mono font-bold block text-[#8C7E6A] mt-1 leading-none uppercase">
                      微光契約特等精靈
                    </span>
                  </div>
                </div>

                {/* 精靈微光呢喃 positioned strictly under the photo */}
                <div className="bg-[#E8E1D5]/40 p-3 rounded-xl border border-[#D1C7B7]/65 flex-1 flex flex-col justify-center min-h-[90px]">
                  <span className="text-[10px] font-bold text-[#8C7E6A] block font-serif italic">精靈微光呢喃：</span>
                  <p className="text-xs text-stone-700 italic font-serif leading-snug">
                    「{selectedSpirit.introQuote}」
                  </p>
                </div>
              </div>

              {/* Right Column: 精靈簡介 AND THEN 特色技能屬性 right below */}
              <div className="md:col-span-7 flex flex-col gap-3">
                {/* 精靈簡介 Description card (Fixed height for exactly 4 lines of text) */}
                <div className="bg-white rounded-xl p-3 border border-[#D1C7B7] text-xs leading-relaxed font-serif italic text-stone-700 h-[104px] overflow-y-auto">
                  <p>
                    "{selectedSpirit.description}"
                  </p>
                </div>

                {/* 精靈技能與特色屬性 (Expands to occupy the rest of the height) */}
                <div className="flex flex-col gap-2 bg-[#FDFBF7] p-3 rounded-xl border border-[#D1C7B7] text-xs flex-1">
                  <h4 className="font-bold text-orange-850 flex items-center gap-1 font-serif italic border-b border-[#D1C7B7]/60 pb-1.5 mb-1">
                    <Award className="w-4 h-4 text-[#F27D26] fill-[#F27D26]/10" />
                    特色定位與靈能屬性
                  </h4>
                  <p className="font-mono text-stone-700 leading-normal">
                    <span className="font-bold text-stone-900 block mt-0.5">特技：</span>
                    {selectedSpirit.abilityDescription}
                  </p>
                  <p className="font-mono text-stone-700 leading-normal mt-1">
                    <span className="font-bold text-stone-900 block">被動：</span>
                    免疫所有屬性關卡陷阱：{" "}
                    <span className="underline font-bold text-orange-700">{selectedSpirit.passiveTrait}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FRUITS & SOUVENIRS ARCHIVE */}
      {activeSubTab === "fruits" && (
        <div className="flex flex-col gap-5" id="fruits_dictionary_view">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {fruitsWithStats.map((item) => {
              const loreUnlocks = COLLECTION_LORE[item.id] || [];

              return (
                <div
                  key={item.id}
                  className={`bg-white border-2 rounded-xl p-3 shadow-xs relative overflow-hidden transition ${
                    item.count > 0 ? "border-[#8C7E6A]" : "border-[#D1C7B7] opacity-60"
                  }`}
                >
                  {/* Floating counter badge */}
                  {item.count > 0 ? (
                    <span className="absolute top-2 right-2 bg-[#89C09E] text-white font-mono text-xs font-bold px-2 py-0.5 rounded-full border border-[#8C7E6A] shadow-xs">
                      x{item.count}
                    </span>
                  ) : (
                    <span className="absolute top-2 right-2 bg-[#E8E1D5] text-[#5A5A40] font-mono text-[9px] px-1.5 py-0.5 rounded border border-[#D1C7B7]">
                      未解鎖
                    </span>
                  )}

                  <div className="text-3xl mb-1 mt-1">{item.count > 0 ? item.image : "❓"}</div>

                  <h3 className="font-bold text-sm text-[#5A5A40] font-serif italic tracking-tight mt-1 truncate">{item.name}</h3>

                  {item.count > 0 ? (
                    <div className="flex items-center gap-0.5 mt-1">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-3.5 h-3.5 ${
                            idx < item.unlockedLevel
                              ? "text-[#F27D26] fill-[#F27D26]/85"
                              : "text-[#D1C7B7]"
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#8C7E6A] font-serif italic mt-1">在關卡中撿起果實解鎖資料</p>
                  )}

                  {/* Lore sections based on counts */}
                  {item.count > 0 && (
                    <div className="mt-2 text-[11px] text-[#5A5A40] border-t border-dashed border-[#D1C7B7] pt-2 font-serif italic flex flex-col gap-1 text-left">
                      <p className="text-stone-700 font-bold leading-normal">
                        - {loreUnlocks[0]}
                      </p>
                      {item.unlockedLevel >= 2 && (
                        <p className="text-orange-850 leading-normal bg-orange-50/50 p-1 rounded mt-0.5 border border-orange-100">
                          - {loreUnlocks[1]}
                        </p>
                      )}
                      {item.unlockedLevel >= 3 && (
                        <p className="text-purple-800 leading-normal bg-[#FDFBF7] p-1 rounded mt-0.5 border border-[#D1C7B7]">
                          - {loreUnlocks[2]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-[#F5F2ED] py-3.5 px-4 border border-[#D1C7B7] rounded-xl text-left text-xs font-serif italic text-stone-700">
            <span className="font-bold text-[#F27D26]">★ 小提示:</span> 
            <span> 每種秘境奇珍重複收集累積 1次 / 5次 / 15次 後，將能解鎖更高層級的「大魔法師元素手札」與「精靈能量提煉指南」！快去奔跑蒐集起更多戰利品吧！</span>
          </div>

          {onResetCollection && (
            <button
              onClick={() => {
                if (confirm("您確定要清除所有圖鑑記錄，重新開始收集嗎？")) {
                  onResetCollection();
                }
              }}
              className="mx-auto flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-mono hover:bg-rose-100 transition mt-4"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空收藏帳目重新記錄
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionTab;
