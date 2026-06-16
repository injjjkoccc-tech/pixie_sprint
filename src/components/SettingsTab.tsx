/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { SystemSettings } from "../types";
import { Volume2, VolumeX, User, HelpCircle, Gamepad2, Info, Star } from "lucide-react";

interface SettingsTabProps {
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
  onResetAllData: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onResetAllData,
}) => {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ ...settings, playerName: e.target.value });
  };

  const handleSoundToggle = () => {
    onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled });
  };

  const handleBgmToggle = () => {
    onUpdateSettings({ ...settings, bgmEnabled: !settings.bgmEnabled });
  };

  const handleDifficultyChange = (diff: "easy" | "normal" | "hard") => {
    onUpdateSettings({ ...settings, difficulty: diff });
  };

  return (
    <div className="bg-[#FDFBF7] border-4 border-[#8C7E6A] rounded-2xl p-4 sm:p-6 shadow-md animate-fade-in text-left" id="settings-tab-container">
      {/* Title */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-[#D1C7B7] pb-4 mb-6">
        <h3 className="text-xl font-bold text-[#5A5A40] flex items-center gap-2 font-serif italic">
          <Info className="w-5 h-5 text-[#89C09E] fill-[#A8D5BA]" />
          遊戲系統設定 (System Settings)
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left: Input controls */}
        <div className="space-y-4">
          {/* Player Name */}
          <div className="bg-[#F5F2ED] p-4 border-2 border-[#D1C7B7] rounded-xl flex flex-col gap-2">
            <label className="text-sm font-bold text-[#5A5A40] font-serif italic flex items-center gap-1.5 select-none animate-pulse-slow">
              <User className="w-4 h-4 text-[#F27D26]" />
              探險家玩家暱稱 (Name)
            </label>
            <input
              type="text"
              value={settings.playerName}
              onChange={handleNameChange}
              placeholder="輸入您的宇宙飛船暱稱"
              maxLength={15}
              className="w-full px-3 py-2 border-2 border-[#D1C7B7] bg-white rounded-lg font-serif italic text-sm focus:border-[#8C7E6A] focus:outline-none focus:ring-0 text-stone-750"
            />
          </div>

          {/* Sound settings */}
          <div className="bg-[#F5F2ED] p-4 border-2 border-[#D1C7B7] rounded-xl flex flex-col gap-3">
            <label className="text-sm font-bold text-[#5A5A40] font-serif italic flex items-center gap-1.5 select-none">
              <Gamepad2 className="w-4 h-4 text-[#89C09E]" />
              聲音與氛圍設定 (Audio)
            </label>

            <div className="flex flex-col gap-2 font-mono text-xs text-stone-700">
              <button
                onClick={handleSoundToggle}
                className={`p-2.5 rounded-lg border-2 flex items-center justify-between text-left transition duration-150 cursor-pointer ${
                  settings.soundEnabled
                    ? "bg-[#89C09E]/20 border-[#89C09E] text-slate-800"
                    : "bg-white border-[#D1C7B7] text-stone-450"
                }`}
              >
                <span>解鎖哨音與跳躍音效 (Sound FX)</span>
                {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                onClick={handleBgmToggle}
                className={`p-2.5 rounded-lg border-2 flex items-center justify-between text-left transition duration-150 cursor-pointer ${
                  settings.bgmEnabled
                    ? "bg-[#89C09E]/20 border-[#89C09E] text-slate-800"
                    : "bg-white border-[#D1C7B7] text-stone-450"
                }`}
              >
                <span>開啟快樂口風琴背景BGM律動 (Music)</span>
                {settings.bgmEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Difficulty setting */}
          <div className="bg-[#F5F2ED] p-4 border-2 border-[#D1C7B7] rounded-xl flex flex-col gap-2">
            <label className="text-sm font-bold text-[#5A5A40] font-serif italic flex items-center gap-1.5 select-none">
              <Gamepad2 className="w-4 h-4 text-[#F27D26]" />
              出發基礎速度 (Initial spd scale)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "normal", "hard"] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => handleDifficultyChange(diff)}
                  className={`py-2 text-xs font-serif italic font-bold rounded-lg border-2 transition capitalize cursor-pointer ${
                    settings.difficulty === diff
                      ? "bg-[#5A5A40] border-[#2D2D1B] text-white shadow-xs"
                      : "bg-white border-[#D1C7B7] text-[#5A5A40] hover:bg-[#F5F2ED]"
                  }`}
                >
                  {diff === "easy" ? "微風慢行" : diff === "normal" ? "小跑步" : "狂風疾奔"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Play description and Help info */}
        <div className="space-y-4">
          <div className="bg-[#F5F2ED] p-4 border-2 border-[#D1C7B7] rounded-xl select-none" id="help-play-guide">
            <h4 className="text-sm font-bold text-[#5A5A40] flex items-center gap-1 border-b pb-2 mb-2 border-dashed border-[#D1C7B7] font-serif italic animate-pulse-slow">
              <HelpCircle className="w-4 h-4 text-[#F27D26]" />
              遊戲企劃思路與未來發展
            </h4>
            <div className="text-xs text-[#5A5A40] opacity-85 font-mono space-y-2.5 leading-relaxed">
              <p>
                <strong>※ 設計來源:</strong> 來自微光元素精靈們扛著神秘晶石辛勤奔跑的感動，融合了恐龍橫向跳空與道具吃金幣要素。
              </p>
              <p>
                <strong>※ 特殊克制:</strong> 火元素無視烈火岩漿、水元素優雅跨越水池、雷元素安全避開高壓電網！好好挑選角色是通往排行大師的捷徑。
              </p>
              <p>
                <strong>※ 關於多人連線:</strong> 後續研發包括「4人俯視大地圖搶秘境晶石大亂鬥」。在無限關卡挑戰告一段落後，敬請期待多人亂鬥地圖連線更新！
              </p>
            </div>
          </div>

          <div className="p-4 bg-orange-50/50 border-2 border-dashed border-orange-350 rounded-xl select-none text-left">
            <h4 className="text-xs font-bold text-orange-850 flex items-center gap-1 mb-1 font-serif italic">
              ⚠️ 重大數據清空 (Dangerous Reset)
            </h4>
            <p className="text-[10px] text-orange-700 font-mono leading-normal mb-3">
              這會清除您所有的本地緩存、解鎖的小名信片、高分紀錄、以及圖鑑等級，將一切回復為最純淨的初始狀態。
            </p>
            <button
              onClick={() => {
                if (confirm("這會徹底抹去您努力跑出來的高分、收集到的圖鑑與一切設定，您真的要重置嗎？")) {
                  onResetAllData();
                }
              }}
              className="w-full py-2 bg-red-500 hover:brightness-105 text-white font-serif italic font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
            >
              徹底抹除所有遊玩記錄
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
