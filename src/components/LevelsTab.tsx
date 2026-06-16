/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { POSTCARDS, PostcardAchievement } from "../utils/constants";
import { Play, Star, MapPin, Heart, HelpCircle } from "lucide-react";

interface LevelsTabProps {
  unlockedLevelStars: { [key: string]: number }; // levelKey -> stars (0-3)
  onPlayLevel: (levelId: number) => void;
  unlockedPostcardIds: string[];
}

export const LevelsTab: React.FC<LevelsTabProps> = ({
  unlockedLevelStars,
  onPlayLevel,
  unlockedPostcardIds,
}) => {
  const [selectedPostcard, setSelectedPostcard] = useState<PostcardAchievement | null>(null);

  const levels = [
    {
      id: 1,
      title: "第一關 綠野泥土小路",
      description: "充滿鬆軟泥土與枯木樹枝的和平路段。這裡是幼苗萌芽的起點！",
      target3Stars: 300,
      initialTime: "1分鐘 (+10s 沙漏)",
      features: "障礙物：岩石、路柵、蘑菇、果實隨機生成",
      accent: "from-green-100 to-emerald-100 border-green-400 text-green-800",
      unlockText: "初始關卡直接挑戰",
    },
    {
      id: 2,
      title: "第二關 潺潺水窪迷霧",
      description: "低窪潮濕地帶。地面有很多泥濘水窪，非常推薦讓會游泳的藍水精靈領隊！",
      target3Stars: 600,
      initialTime: "1分鐘 (+10s 沙漏)",
      features: "新增陷阱：深藍雨水池 (提示: 紅火、黃電精靈會遇溺！)",
      accent: "from-blue-100 to-indigo-100 border-blue-400 text-blue-800",
      unlockText: "需要第一關完成挑戰",
    },
    {
      id: 3,
      title: "第三關 紅蓮岩漿峽谷",
      description: "四周煙霧瀰漫，滾燙的小地熱帶。如果不拍動翅膀或依靠紅火精靈，寸步難行！",
      target3Stars: 1000,
      initialTime: "1分鐘 (+10s 沙漏)",
      features: "新增陷阱：狂暴地底岩漿 + 電磁網 (極高威脅度！)",
      accent: "from-rose-100 to-orange-100 border-rose-400 text-rose-800",
      unlockText: "需要第二關完成挑戰",
    },
  ];

  return (
    <div className="bg-[#FDFBF7] border-4 border-[#8C7E6A] rounded-2xl p-4 sm:p-6 shadow-md animate-fade-in text-left" id="levels-tab-container">
      {/* Levels list title */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-[#D1C7B7] pb-4 mb-6">
        <h3 className="text-xl font-bold text-[#5A5A40] flex items-center gap-2 font-serif italic">
          <MapPin className="w-5 h-5 text-[#89C09E] fill-[#A8D5BA]" />
          探險任務章節 (Stage Adventure Selection)
        </h3>
        <span className="text-xs font-serif italic text-[#8C7E6A]">
          達到3星評分即可奪得絕美手繪成就明信片！
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stages list (Left 7-column grid) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {levels.map((level, index) => {
            const stars = unlockedLevelStars[`level_${level.id}`] || 0;
            const isUnlocked = level.id === 1 || unlockedLevelStars[`level_${level.id - 1}`] > 0;

            return (
              <div
                key={level.id}
                className={`border-2 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-150 ${
                  isUnlocked
                    ? "bg-[#F5F2ED] border-[#8C7E6A] hover:bg-white hover:shadow-xs"
                    : "bg-[#E8E1D5]/30 border-[#D1C7B7] opacity-65"
                }`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[#5A5A40] text-white rounded">
                      STAGE 0{level.id}
                    </span>
                    <h4 className="font-bold text-[#5A5A40] text-base font-serif italic">{level.title}</h4>
                  </div>

                  <p className="text-xs text-[#5A5A40] opacity-85 leading-relaxed">
                    {level.description}
                  </p>

                  <div className="text-[11px] font-mono text-[#8C7E6A] space-y-0.5 pt-1">
                    <p className="text-[#89C09E] font-bold">❖ {level.features}</p>
                    <p>❖ 初始時間: {level.initialTime} | 3星門檻分數: <span className="font-bold text-[#F27D26]">{level.target3Stars}分</span></p>
                  </div>
                </div>

                {/* Score Stars and Trigger button */}
                <div className="flex flex-row md:flex-col justify-between md:justify-center items-center w-full md:w-auto gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-[#D1C7B7]/40">
                  {isUnlocked ? (
                    <div className="flex flex-col gap-1 items-center">
                      {/* Interactive Stars */}
                      <div className="flex gap-0.5">
                        {Array.from({ length: 3 }).map((_, sIdx) => (
                          <Star
                            key={sIdx}
                            className={`w-5 h-5 ${
                              sIdx < stars ? "text-[#F27D26] fill-[#F27D26]/80 animate-pulse-slow" : "text-[#D1C7B7]"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-[#8C7E6A]">目前星數: {stars}/3</span>
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono text-stone-450 italic">
                      🔒 {level.unlockText}
                    </span>
                  )}

                  {isUnlocked ? (
                    <button
                      onClick={() => onPlayLevel(level.id)}
                      className="px-4 py-2 bg-[#F27D26] hover:brightness-105 text-white font-serif font-bold italic text-xs rounded-lg flex items-center gap-1 shadow-sm transition active:translate-y-0.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      啟程契約
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 bg-[#E8E1D5] text-stone-550 font-serif italic font-bold text-xs rounded-lg cursor-not-allowed"
                    >
                      未解鎖
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* PostcardCGs collection album (Right 5-column grid) */}
        <div className="lg:col-span-5 flex flex-col bg-[#F5F2ED] border-4 border-[#8C7E6A] rounded-2xl p-4 shadow-sm transform rotate-0.5">
          <h4 className="text-sm font-bold text-[#5A5A40] flex items-center gap-1 border-b pb-2 mb-3 border-dashed border-[#D1C7B7] font-serif italic">
            <Heart className="w-4 h-4 text-[#F27D26] fill-[#F27D26]/10" />
            成就明信片珍藏簿 (CG Postcards)
          </h4>

          <div className="grid grid-cols-2 gap-3 mb-2">
            {POSTCARDS.map((card) => {
              const starsRequiredMap: { [key: string]: number } = {
                pc_1: unlockedLevelStars["level_1"] || 0,
                pc_2: (unlockedLevelStars["level_1"] || 0) + (unlockedLevelStars["level_2"] || 0),
                pc_3: (unlockedLevelStars["level_3"] || 0) === 3 ? 3 : 0, // 3 stars on level 3
              };

              const scoreProgress = starsRequiredMap[card.id] || 0;
              // we set simple unlock condition: pc_1 needs level 1 at 2+ stars, pc_2 needs level 2 stars >= 2, pc_3 needs level 3 stars === 3
              const isUnlocked =
                (card.id === "pc_1" && scoreProgress >= 1) ||
                (card.id === "pc_2" && scoreProgress >= 2) ||
                (card.id === "pc_3" && scoreProgress >= 3);

              return (
                <button
                  key={card.id}
                  disabled={!isUnlocked}
                  onClick={() => setSelectedPostcard(card)}
                  className={`relative p-2 aspect-[4/3] rounded-xl border-2 flex flex-col items-center justify-center text-center transition ${
                    isUnlocked
                      ? "bg-white border-[#8C7E6A] hover:scale-102 cursor-pointer shadow-sm"
                      : "bg-[#E8E1D5]/40 border-[#D1C7B7] cursor-not-allowed opacity-50"
                  }`}
                >
                  {isUnlocked ? (
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">{card.id === "pc_1" ? "🌸" : card.id === "pc_2" ? "🫧" : "⛈️"}</span>
                      <span className="font-bold text-[#5A5A40] font-serif italic text-3xs tracking-tight mt-1 truncate max-w-[100px]">
                        {card.title}
                      </span>
                      <span className="text-[10px] bg-[#89C09E] text-white rounded font-mono px-1 py-0.2 mt-1 font-bold">
                        已收藏
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center select-none text-stone-400">
                      <span className="text-lg">🔒</span>
                      <span className="text-[10px] tracking-tight text-stone-400 font-mono mt-1">
                        通關星數解鎖
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-[#5A5A40] opacity-70 font-serif italic text-center leading-normal mt-2">
            ※ 每當對應的關卡取得高星，我們的溫馨營地就會收到特別印製的 3D 手繪明信片，點擊可欣賞超療癒的故事和圖畫喔！
          </p>
        </div>
      </div>

      {/* Postcard CG Zoom Modal */}
      {selectedPostcard && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-[#FDFBF7] border-4 border-[#8C7E6A] rounded-2xl p-5 sm:p-6 shadow-2xl max-w-sm sm:max-w-md w-full relative transform -rotate-1 text-center">
            <span className="absolute top-3 right-3 text-[10px] font-bold font-serif text-[#8C7E6A] bg-[#FCFAF6] border border-[#8C7E6A]/30 px-2 py-0.5 rounded-full select-none">✿ 秘境珍藏 ✿</span>
            
            <h3 className="text-2xl font-bold text-[#5A5A40] font-serif italic mb-1">{selectedPostcard.title}</h3>
            <p className="text-[10px] text-[#8C7E6A] font-serif mb-4 uppercase tracking-wider">─── 大魔法師元素手札紀錄 ───</p>

            {/* Hand-drawn style image placeholder box */}
            <div className="w-full flex-1 aspect-video bg-white rounded-xl border-2 border-[#8C7E6A] flex flex-col items-center justify-center p-2 mb-4 overflow-hidden relative shadow-inner">
              {/* If it's the cover image path from prompt, draw background beautifully inside! */}
              {selectedPostcard.id === "pc_1" ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-tr from-rose-50 to-amber-50">
                  <span className="text-5xl animate-bounce">🍓🌱</span>
                  <p className="text-xs font-serif italic text-stone-700 font-bold mt-2">火元素與雷元素手拉手坐在草地上野餐分享甜美的微光魔法晶石。</p>
                </div>
              ) : selectedPostcard.id === "pc_2" ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-tr from-sky-100 to-indigo-100">
                  <span className="text-5xl animate-pulse">🫧🫐🌱</span>
                  <p className="text-xs font-serif italic text-stone-700 font-bold mt-2">水元素潛泳在幽暗湛藍的小溪裡，周圍冒著水晶般的氣泡和神秘深藍奇珍。</p>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-tr from-purple-100 to-indigo-200">
                  <span className="text-5xl">⚡🌩️🔋</span>
                  <p className="text-xs font-serif italic text-stone-700 font-bold mt-2">狂風暴雨中雷元素牽著小尖耳當成天生的大降壓器，排成整齊的隊伍劈啪發電！</p>
                </div>
              )}
            </div>

            <p className="text-xs text-stone-700 font-mono text-left italic bg-[#F5F2ED] p-4 border-2 border-[#D1C7B7] rounded-xl leading-relaxed mb-5">
              "{selectedPostcard.lore}"
            </p>

            <button
              onClick={() => setSelectedPostcard(null)}
              className="px-6 py-2 bg-[#5A5A40] text-white font-serif italic font-bold text-xs hover:brightness-110 rounded-lg shadow-sm"
            >
              收回珍藏簿
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LevelsTab;
