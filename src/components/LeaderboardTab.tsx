/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { LeaderboardEntry } from "../types";
import { Trophy, Calendar, Sparkles, Clock } from "lucide-react";

interface LeaderboardTabProps {
  entries: LeaderboardEntry[];
  currPlayerName?: string;
  onResetLeaderboard?: () => void;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({
  entries,
  currPlayerName = "小冒險家",
}) => {
  // Deep copy and sort as instructed:
  // 1. Score in descending order
  // 2. Earliest timestamp (older first) in ascending order to settle ties
  const sortedEntries = [...entries].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.timestamp - b.timestamp; // earlier first
  });

  return (
    <div className="flex flex-col gap-6" id="leaderboard-tab-root">
      
      {/* Real-time Global Leaderboard Card */}
      <div className="bg-[#FDFBF7] border-4 border-[#8C7E6A] rounded-2xl p-4 sm:p-6 shadow-md animate-fade-in text-left" id="leaderboard-tab-container">
        {/* Title */}
        <div className="flex items-center justify-between border-b-2 border-dashed border-[#D1C7B7] pb-4 mb-6">
          <h3 className="text-xl font-bold text-[#5A5A40] flex items-center gap-2 font-serif italic">
            <Trophy className="w-5 h-5 text-[#F27D26] fill-[#F27D26]/10" />
            全宇宙微光元素精靈「即時線上」排行榜
          </h3>
          <span className="text-[10px] font-mono text-[#8C7E6A] bg-[#F5F2ED] border border-[#D1C7B7] px-2.5 py-1 rounded-lg">
            即時線上聯網同步
          </span>
        </div>

        <p className="text-xs text-[#5A5A40] opacity-85 text-left mb-4 font-serif italic leading-relaxed">
          ※ 競合成績：全球玩家即時更新！成績相同時會以<strong className="text-[#F27D26]">最先達成者為優先排序</strong>，沒有同名次。您也可以更換不同元素精靈重複挑戰，刷出一整排同分洗板喔！
        </p>

        {/* Leaderboard Table Grid */}
        <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto scrollbar-thin pr-1">
          {sortedEntries.length === 0 ? (
            <div className="text-center py-8 bg-white border border-[#D1C7B7] rounded-xl text-[#8C7E6A] font-mono text-xs">
              目前空空如也，快去進行一場無限關卡挑戰吧！
            </div>
          ) : (
            sortedEntries.map((entry, index) => {
              const rank = index + 1;
              const isCurrentPlayer = entry.player_name.includes(currPlayerName);

              // Medals highlight styles
              const rankBgClass =
                rank === 1
                  ? "bg-[#F27D26] border-orange-700 text-white animate-bounce-slow"
                  : rank === 2
                  ? "bg-[#89C09E] border-emerald-700 text-white"
                  : rank === 3
                  ? "bg-[#A8D5BA]/40 border-[#89C09E] text-[#5A5A40] font-bold"
                  : "bg-[#E8E1D5] border-[#D1C7B7] text-[#5A5A40]";

              return (
                <div
                  key={entry.id || index}
                  className={`flex items-center justify-between p-3 border-2 rounded-xl transition-all duration-150 ${
                    isCurrentPlayer
                      ? "bg-[#F5F2ED] border-[#8C7E6A] shadow-xs"
                      : "bg-white border-[#D1C7B7]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank badge */}
                    <span
                      className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono font-bold text-xs shrink-0 ${rankBgClass}`}
                    >
                      {rank}
                    </span>

                    {/* Player info */}
                    <div>
                      <h4 className="font-bold text-sm text-[#5A5A40] font-serif italic flex items-center gap-1.5 text-left">
                        {entry.player_name}
                        {isCurrentPlayer && (
                          <span className="text-[9px] bg-[#F27D26] text-white rounded px-1.5 py-0.2 ml-1 font-sans font-normal italic">
                            您的佳績
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-[#8C7E6A] mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5 text-[#F27D26]" />
                          出戰隊伴: {entry.pikmin_type}元素精靈
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5 text-teal-600" />
                          跑了: {entry.play_time}秒
                        </span>
                        <span className="flex items-center gap-0.5 hidden sm:inline-flex">
                          <Calendar className="w-2.5 h-2.5 text-stone-400" />
                          日期: {entry.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <span className="text-xl font-mono font-bold text-[#5A5A40]">{entry.score}</span>
                    <span className="text-[10px] text-orange-600 font-bold block leading-none">PTS</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardTab;
