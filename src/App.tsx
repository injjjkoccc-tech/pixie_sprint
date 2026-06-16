/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { PikminColor, PikminCharacter, LeaderboardEntry, SystemSettings } from "./types";
import { PIKMIN_CHARACTERS, DEFAULT_LEADERBOARD, POSTCARDS } from "./utils/constants";
import { gameAudio } from "./utils/audio";
import { SpiritRunnerGame } from "./components/RunnerGame";
import { CollectionTab } from "./components/CollectionTab";
import { LeaderboardTab } from "./components/LeaderboardTab";
import { SettingsTab } from "./components/SettingsTab";
import { LevelsTab } from "./components/LevelsTab";

import { Star, ShieldAlert, Award, Calendar, Volume2, VolumeX, Play, Flame, Compass, Settings, Trophy, BookOpen, UserCheck, Gamepad } from "lucide-react";
import { listenToLeaderboard, submitLeaderboardScore, deleteLeaderboardEntry } from "./utils/firebase";


// Dynamic path for our generated cute crayon cover asset
const coverImg = "/src/assets/images/element_spirit_cover_1781234981512.jpg";

export default function App() {
  // 1. Navigation state
  const [activeTab, setActiveTab] = useState<"home" | "levels" | "infinite" | "collection" | "leaderboard" | "settings">("home");

  // 2. Persistent States (Synchronized with localStorage)
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem("pikmin_playerName") || "探險家";
  });

  const [showNamePrompt, setShowNamePrompt] = useState(() => {
    return localStorage.getItem("pikmin_hasSetNickname") !== "true";
  });

  // Track the high score IDs submitted by this player's active device/session
  const [myScoreIds, setMyScoreIds] = useState<string[]>(() => {
    const savedIds = localStorage.getItem("pikmin_my_score_ids");
    if (savedIds) {
      try {
        return JSON.parse(savedIds);
      } catch {
        // Fallback
      }
    }
    // Extract past local records
    try {
      const savedScores = localStorage.getItem("pikmin_highscores");
      if (savedScores) {
        const parsed = JSON.parse(savedScores) as LeaderboardEntry[];
        return parsed.filter(e => e.id.startsWith("ld_u_")).map(e => e.id);
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const handleSaveInitialNickname = (name: string) => {
    setPlayerName(name);
    setSettings((prev) => ({ ...prev, playerName: name }));
    localStorage.setItem("pikmin_playerName", name);
    localStorage.setItem("pikmin_hasSetNickname", "true");
    setShowNamePrompt(false);
    gameAudio.playWhistle();
  };

  const [highScores, setHighScores] = useState<LeaderboardEntry[]>(() => {
    const saved = localStorage.getItem("pikmin_highscores");
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved) as LeaderboardEntry[];
      // Filter out any mock accounts that might have been saved in the browser database
      const filtered = parsed.filter(entry => {
        const isMock = entry.id.startsWith("ld_") && !entry.id.startsWith("ld_u_");
        const containsMockName = /olimar|louie|alph|president|brittany|歐利瑪|路易|阿爾夫|社長|布莉特妮/i.test(entry.player_name);
        return !isMock && !containsMockName;
      });
      return filtered;
    } catch {
      return [];
    }
  });

  const [collectedStats, setCollectedStats] = useState<{ [key: string]: number }>(() => {
    const saved = localStorage.getItem("pikmin_collections");
    return saved ? JSON.parse(saved) : {};
  });

  const [levelStars, setLevelStars] = useState<{ [key: string]: number }>(() => {
    const saved = localStorage.getItem("pikmin_levelstars");
    return saved ? JSON.parse(saved) : { level_1: 0, level_2: 0, level_3: 0 };
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem("pikmin_settings");
    return saved
      ? JSON.parse(saved)
      : {
          playerName: "阿爾夫",
          soundEnabled: true,
          bgmEnabled: false, // wait for user's explicit interaction before blast BGM
          difficulty: "normal",
        };
  });

  // 3. active session triggers
  const [selectedCharId, setSelectedCharId] = useState<PikminColor>(PikminColor.Red);
  const [activeGame, setActiveGame] = useState<{
    type: "infinite" | "level";
    levelId?: number;
    character: PikminCharacter;
  } | null>(null);

  // Settlement Ending results
  const [endingResult, setEndingResult] = useState<{
    score: number;
    starRating: number;
    reason: "time_up" | "lives_depleted" | "voluntary_exit";
    fruitRewards: { white: number; red: number; blue: number };
    itemsFound: string[];
    character: PikminCharacter;
    gameType: "infinite" | "level";
    levelId?: number;
  } | null>(null);

  // Incremental counting state for visual settlement dramatic tally tick
  const [tallyScore, setTallyScore] = useState(0);

  // Mini Toast Notification System for Database & Action feed back
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem("pikmin_playerName", playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem("pikmin_highscores", JSON.stringify(highScores));
  }, [highScores]);

  useEffect(() => {
    localStorage.setItem("pikmin_my_score_ids", JSON.stringify(myScoreIds));
  }, [myScoreIds]);

  // When playerName or myScoreIds or highScores change, auto-sync and update the user's past leaderboard names
  useEffect(() => {
    if (myScoreIds.length === 0 || !playerName) return;

    const expectedName = `${playerName}的小隊`;
    
    // Find all matching entries with old names in our current loaded list
    const toUpdate = highScores.filter(entry => 
      myScoreIds.includes(entry.id) && entry.player_name !== expectedName
    );

    if (toUpdate.length > 0) {
      // 1. Update in local state list first
      setHighScores(prev => prev.map(entry => {
        if (myScoreIds.includes(entry.id) && entry.player_name !== expectedName) {
          return { ...entry, player_name: expectedName };
        }
        return entry;
      }));

      // 2. Submit the updated named ones to Firestore to sync the cloud scores
      toUpdate.forEach(entry => {
        const updatedEntry = { ...entry, player_name: expectedName };
        submitLeaderboardScore(updatedEntry)
          .then(() => {
            showToast(`已成功將歷史排名暱稱同步更新為「${expectedName}」！`, "success");
          })
          .catch(err => {
            console.error("更新雲端排行榜玩家名字失敗:", err);
          });
      });
    }
  }, [playerName, myScoreIds, highScores]);

  useEffect(() => {
    localStorage.setItem("pikmin_collections", JSON.stringify(collectedStats));
  }, [collectedStats]);

  useEffect(() => {
    localStorage.setItem("pikmin_levelstars", JSON.stringify(levelStars));
  }, [levelStars]);

  useEffect(() => {
    localStorage.setItem("pikmin_settings", JSON.stringify(settings));
  }, [settings]);

  // Handle BGM audio toggle when tabs change or toggling settings
  useEffect(() => {
    gameAudio.setSoundEnabled(settings.soundEnabled);
    gameAudio.setBgmEnabled(settings.bgmEnabled);
  }, [settings]);

  // Synchronize with Firestore real-time leaderboard
  useEffect(() => {
    // 1. Read local-only high scores that might have been saved before Firestore was added
    let localHighScores: LeaderboardEntry[] = [];
    try {
      const saved = localStorage.getItem("pikmin_highscores");
      if (saved) {
        const parsed = JSON.parse(saved) as LeaderboardEntry[];
        localHighScores = parsed.filter(entry => {
          const isMock = entry.id.startsWith("ld_") && !entry.id.startsWith("ld_u_");
          const containsMockName = /olimar|louie|alph|president|brittany|歐利瑪|路易|阿爾夫|社長|布莉特妮/i.test(entry.player_name);
          return !isMock && !containsMockName;
        });
      }
    } catch (e) {
      console.error("讀取本地舊成績時出錯:", e);
    }

    const unsubscribe = listenToLeaderboard(
      (entries) => {
        setHighScores(entries);

        // 2. If there are local scores that aren't on the online leaderboard yet, upload them to Firestore!
        if (localHighScores.length > 0) {
          const onlineIds = new Set(entries.map(e => e.id));
          localHighScores.forEach((localEntry) => {
            if (!onlineIds.has(localEntry.id)) {
              submitLeaderboardScore(localEntry).catch((err) => {
                console.error("同步上傳本地舊成績至雲端失敗:", err);
              });
            }
          });
          // Clear reference so we only attempt this migration once upon startup
          localHighScores = [];
        }
      },
      (error) => {
        console.error("訂閱線上排行榜發生錯誤:", error);
        showToast("聯網同步排行榜失敗，請檢查網路連線或稍後再試。", "error");
      }
    );
    return () => unsubscribe();
  }, []);


  const selectedChar = PIKMIN_CHARACTERS.find((c) => c.id === selectedCharId) || PIKMIN_CHARACTERS[0];

  // Starts general scrolling gameplay
  const handleLaunchGame = (type: "infinite" | "level", levelId?: number) => {
    gameAudio.playWhistle();
    // Launch active runner
    setActiveGame({
      type,
      levelId,
      character: selectedChar,
    });
    setEndingResult(null);
  };

  // Settles game outcomes, increments collection multipliers, tallies highscore and saves
  const handleGameFinished = (
    finalScore: number,
    rewards: { white: number; red: number; blue: number; items: string[] },
    reason: "time_up" | "lives_depleted" | "voluntary_exit",
    chosenChar?: PikminCharacter
  ) => {
    // 1. Calculate general star rating for Level Mode if active
    let earnedStars = 0;
    if (activeGame?.type === "level") {
      const target = activeGame.levelId === 1 ? 300 : activeGame.levelId === 2 ? 600 : 1000;
      if (finalScore >= target) earnedStars = 3;
      else if (finalScore >= target * 0.6) earnedStars = 2;
      else if (finalScore >= target * 0.2) earnedStars = 1;

      // Update persistent Level stars
      const levelKey = `level_${activeGame.levelId}`;
      if (earnedStars > (levelStars[levelKey] || 0)) {
        const updatedStars = { ...levelStars, [levelKey]: earnedStars };
        setLevelStars(updatedStars);
      }
    }

    // 2. Increment fruit dictionary metrics
    const newCollections = { ...collectedStats };
    newCollections["fruit_white"] = (newCollections["fruit_white"] || 0) + rewards.white;
    newCollections["fruit_red"] = (newCollections["fruit_red"] || 0) + rewards.red;
    newCollections["fruit_blue"] = (newCollections["fruit_blue"] || 0) + rewards.blue;

    // Check unique souvenir items
    rewards.items.forEach((itemId) => {
      newCollections[itemId] = (newCollections[itemId] || 0) + 1;
    });

    setCollectedStats(newCollections);

    // 3. Register leaderboard trace for Infinite Mode
    if (activeGame?.type === "infinite") {
      const newEntryId = `ld_u_${Date.now()}`;
      const newEntry: LeaderboardEntry = {
        id: newEntryId,
        player_name: `${playerName}的小隊`,
        score: finalScore,
        pikmin_type: chosenChar?.id || activeGame.character.id,
        date: new Date().toISOString().split('T')[0], // Guaranteed 10 char YYYY-MM-DD format
        play_time: 45 + Math.floor(Math.random() * 20), // mock duration
        star_rating: finalScore >= 2500 ? 3 : finalScore >= 1000 ? 2 : 1,
        timestamp: Date.now(),
      };
      setMyScoreIds(prev => [...prev, newEntryId]);
      setHighScores((prev) => [...prev, newEntry]);
      
      showToast("正在傳送高分成績至全宇宙線上排行榜...", "info");
      submitLeaderboardScore(newEntry)
        .then(() => {
          showToast(`恭喜！您的佳績 ${finalScore} PTS 已登入線上排行榜！`, "success");
        })
        .catch(err => {
          console.error("上傳高分至排行榜失敗:", err);
          showToast(`成績上傳排行榜失敗: ${err.message || err}`, "error");
        });
    }

    // 4. Trigger settlement counter tally
    setEndingResult({
      score: finalScore,
      starRating: earnedStars || Math.min(3, Math.floor(finalScore / 1000) + 1),
      reason,
      fruitRewards: rewards,
      itemsFound: rewards.items,
      character: chosenChar || activeGame!.character,
      gameType: activeGame?.type || "infinite",
      levelId: activeGame?.levelId,
    });

    // Reset game instance
    setActiveGame(null);
    setTallyScore(0);
  };

  // Sound play ticker on numerical settlement increment
  useEffect(() => {
    if (!endingResult) return;
    if (tallyScore < endingResult.score) {
      const diff = endingResult.score - tallyScore;
      const step = Math.max(1, Math.floor(diff / 15));
      const interval = setTimeout(() => {
        setTallyScore((prev) => {
          const next = Math.min(endingResult.score, prev + step);
          if (settings.soundEnabled && next % 5 === 0) {
            gameAudio.playCollectFruit("white");
          }
          return next;
        });
      }, 30);
      return () => clearTimeout(interval);
    }
  }, [endingResult, tallyScore]);

  // Cleans logs functions
  const handleResetAllData = () => {
    localStorage.clear();
    setPlayerName("探險家");
    setHighScores(DEFAULT_LEADERBOARD);
    setCollectedStats({});
    setLevelStars({ level_1: 0, level_2: 0, level_3: 0 });
    setSettings({
      playerName: "探險家",
      soundEnabled: true,
      bgmEnabled: false,
      difficulty: "normal",
    });
    setShowNamePrompt(true);
    alert("所有遊戲進度、解鎖明信片與蒐集冊紀錄及設定均已重置為初始狀態！");
  };

  const handleResetCollectionsOnly = () => {
    setCollectedStats({});
    alert("收集冊紀錄已清空。您可以重新尋找失落的古物了！");
  };

  const handleResetLeaderboardOnly = () => {
    setHighScores([]);
    alert("無限關卡排行榜已成功清空。");
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans text-[#5A5A40] antialiased md:border-[12px] border-[#E8E1D5]" id="spirit-app-root">
      
      {/* App Global Toast Overlay */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-2xl border-4 font-bold text-xs sm:text-sm flex items-center gap-2.5 shadow-2xl transition-all duration-300 animate-bounce ${
          toast.type === "success" 
            ? "bg-[#EBF7EE] border-[#89C09E] text-emerald-800"
            : toast.type === "error"
            ? "bg-[#FDF2F2] border-red-500 text-[#a32a2a]"
            : "bg-orange-50 border-[#F27D26] text-orange-900"
        }`} id="app-global-toast">
          <span className="text-base sm:text-lg">{toast.type === "success" ? "🎉" : toast.type === "error" ? "⚠️" : "💡"}</span>
          <span className="font-serif italic text-stone-900">{toast.message}</span>
        </div>
      )}
      
      {/* 1. Global Navigation header (Warm Organic / Cultural theme) */}
      <header className="bg-[#FDFBF7] border-b-2 border-dashed border-[#D1C7B7] py-4 px-6 relative select-none z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full border-4 border-[#8C7E6A] flex items-center justify-center text-2xl duration-500 hover:rotate-12 transform limit-shadow shrink-0 animate-bounce">
              ✨
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif italic text-[#5A5A40] font-bold tracking-tight drop-shadow-xs flex items-center gap-2">
                微光元素精靈的奇幻旅程
                <span className="text-[10px] uppercase tracking-widest bg-[#E8E1D5] text-[#5A5A40] px-2 py-0.5 rounded-full font-mono font-bold">GHIBLI v2.0</span>
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-[#5A5A40] opacity-60 leading-tight">Enchanted Elemental & Meadow Expeditions</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-serif italic bg-[#F5F2ED] text-[#5A5A40] px-3 py-1.5 rounded-full border-2 border-[#D1C7B7] shadow-sm">
              精靈契約者: <strong className="font-bold text-[#F27D26]">{playerName}</strong>
            </span>
            <button
              onClick={() => {
                const newSound = !settings.soundEnabled;
                setSettings({ ...settings, soundEnabled: newSound });
                gameAudio.setSoundEnabled(newSound);
              }}
              className="w-10 h-10 border-2 border-[#D1C7B7] rounded-full bg-white hover:bg-[#F5F2ED] transition flex items-center justify-center shadow-sm cursor-pointer"
              title="切換音效"
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-[#5A5A40]" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
            </button>
            <button
              onClick={() => {
                setActiveTab("settings");
                if (settings.soundEnabled) gameAudio.playJump();
              }}
              className={`w-10 h-10 border-2 rounded-full transition flex items-center justify-center shadow-sm cursor-pointer ${
                activeTab === "settings"
                  ? "bg-[#5A5A40] text-white border-[#2D2D1B]"
                  : "bg-white text-[#5A5A40] border-[#D1C7B7] hover:bg-[#F5F2ED]"
              }`}
              title="系統設定"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Canvas Play Frame or Static Tabs */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 flex flex-col justify-start">
        {activeGame ? (
          /* GAME RUNNING WINDOW */
          <div className="w-full bg-white border-4 border-stone-800 rounded-3xl overflow-hidden shadow-2xl relative">
            <SpiritRunnerGame
              character={activeGame.character}
              mode={activeGame.type}
              levelId={activeGame.levelId}
              onGameOver={handleGameFinished}
              onExit={() => setActiveGame(null)}
            />
          </div>
        ) : endingResult ? (
          /* 3. SETTLEMENT END CARD ("角色捧著戰利品果實立繪 + 一段小對白 + 一筆一筆加上去最後定格的分數&星數") */
          <div className="w-full max-w-2xl mx-auto bg-orange-50 border-4 border-stone-800 rounded-3xl p-5 sm:p-8 shadow-2xl relative text-center transform -rotate-0.5 animate-fade-in" id="settlement-end-card">
            <span className="absolute top-4 right-4 text-4xs text-amber-800 bg-amber-100/50 px-2 py-0.5 rounded border border-amber-200/50 leading-none font-bold">✨ 微光營地結算認證 ✨</span>
            
            <h2 className="text-3xl font-black text-amber-900 drop-shadow-xs mb-1">
              {endingResult.reason === "voluntary_exit" ? "安全歸來結算！" : endingResult.reason === "time_up" ? "大成功通關！" : "能量耗盡成功回營！"}
            </h2>
            <p className="text-2xs text-amber-800 font-medium font-serif italic mb-6">─── 元素暖心小隊能量搬運收納報表 ───</p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: Visual dynamic vector representation of Pikmin (unblemished or muddy) */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="w-40 h-40 bg-slate-900 rounded-3xl border-4 border-stone-800 flex flex-col items-center justify-center p-3 relative shadow-inner overflow-hidden">
                  {/* Dynamic cute procedural SVG of the chosen Element Spirit holding a magic gem! */}
                  <svg viewBox="0 0 100 100" className="w-full h-full select-none">
                    {/* Render Grass/Soil Backdrop */}
                    <ellipse cx="50" cy="85" rx="36" ry="12" fill="#2d3d5a" />

                    {/* Happy treasures piled up indicating rich haul! */}
                    <circle cx="28" cy="82" r="5" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
                    <path d="M 26,78 L 28,75 L 30,78 Z" fill="#22c55e" />
                    <circle cx="72" cy="81" r="5" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1.5" />
                    <path d="M 70,77 L 72,74 L 74,77 Z" fill="#22c55e" />
                    <circle cx="50" cy="84" r="5" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
                    <text x="50" y="85" fontSize="6.5" fill="#ffffff" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">★</text>

                    {/* Twinkling background stars representing pride/exultation */}
                    <path d="M 20,24 L 21.5,27 L 25,27 L 22.5,29 L 23,32 L 20,30.5 L 17,32 L 17.5,29 L 15,27 L 18.5,27 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
                    <path d="M 78,16 L 79.5,19 L 83,19 L 80.5,21 L 81,24 L 78,22.5 L 75,24 L 75.5,21 L 73,19 L 76.5,19 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
                    <circle cx="82" cy="42" r="1.5" fill="#ffffff" />
                    <circle cx="22" cy="58" r="2" fill="#ffffff" />

                    {/* Main chosen Element Spirit Body with high quality accurate shape centered at transform(50, 48) */}
                    <g transform="translate(50, 48)">
                      {/* Legs */}
                      <path d="M -8, 20 L -12, 34" stroke={endingResult.character.id === PikminColor.White ? "#cbd5e1" : (endingResult.character.id === PikminColor.Red ? "#7c2d12" : endingResult.character.id === PikminColor.Blue ? "#0c4a6e" : endingResult.character.id === PikminColor.Yellow ? "#78350f" : endingResult.character.id === PikminColor.Purple ? "#3b0764" : endingResult.character.id === PikminColor.Pink ? "#701a75" : "#1c1917")} strokeWidth="4" strokeLinecap="round" />
                      <path d="M 8, 20 L 12, 34" stroke={endingResult.character.id === PikminColor.White ? "#cbd5e1" : (endingResult.character.id === PikminColor.Red ? "#7c2d12" : endingResult.character.id === PikminColor.Blue ? "#0c4a6e" : endingResult.character.id === PikminColor.Yellow ? "#78350f" : endingResult.character.id === PikminColor.Purple ? "#3b0764" : endingResult.character.id === PikminColor.Pink ? "#701a75" : "#1c1917")} strokeWidth="4" strokeLinecap="round" />

                      {/* Character Custom Shape */}
                      {endingResult.character.id === PikminColor.Red && (
                        <>
                          <path d="M 0,26 C 22,26 21,3 18,-1 C 11,-15 8,-6 5,-15 Q 0,-24 -5,-15 C -8,-6 -11,-15 -18,-1 C -21,3 -22,26 0,26 Z" fill="#ff7300" stroke="#7c2d12" strokeWidth="2.5" />
                          <ellipse cx="0" cy="5" rx="14" ry="15" fill="#fed7aa" />
                        </>
                      )}

                      {endingResult.character.id === PikminColor.Blue && (
                        <>
                          <path d="M 0,-32 C 16,-20 22,5 22,20 C 22,32 12,32 0,32 C -12,32 -22,32 -22,20 C -22,5 -16,-20 0,-32 Z" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="2.5" />
                          <ellipse cx="-6" cy="-2" rx="4" ry="2" fill="rgba(255, 255, 255, 0.45)" transform="rotate(-45, -6, -2)" />
                        </>
                      )}

                      {endingResult.character.id === PikminColor.Yellow && (
                        <>
                          <path d="M 0,-28 L 8,-10 L 26,0 L 8,10 L 0,28 L -8,10 L -26,0 L -8,-10 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="2.5" />
                          <line x1="0" y1="-28" x2="0" y2="-36" stroke="#fef08a" strokeWidth="1.8" />
                          <line x1="26" y1="0" x2="34" y2="0" stroke="#fef08a" strokeWidth="1.8" />
                          <line x1="0" y1="28" x2="0" y2="36" stroke="#fef08a" strokeWidth="1.8" />
                          <line x1="-26" y1="0" x2="-34" y2="0" stroke="#fef08a" strokeWidth="1.8" />
                        </>
                      )}

                      {endingResult.character.id === PikminColor.Purple && (
                        <>
                          <circle cx="0" cy="0" r="23" fill="#a78bfa" stroke="#3b0764" strokeWidth="2.5" />
                          <ellipse cx="0" cy="4" rx="31" ry="8.5" fill="none" stroke="#c084fc" strokeWidth="3" transform="rotate(-12)" />
                        </>
                      )}

                      {endingResult.character.id === PikminColor.White && (
                        <>
                          <g stroke="#cbd5e1" strokeWidth="2.5">
                            <line x1="0" y1="0" x2="0" y2="-21" />
                            <line x1="0" y1="0" x2="20" y2="-7" />
                            <line x1="0" y1="0" x2="15" y2="15" />
                            <line x1="0" y1="0" x2="-15" y2="15" />
                            <line x1="0" y1="0" x2="-20" y2="-7" />
                            <line x1="0" y1="0" x2="11" y2="-18" />
                            <line x1="0" y1="0" x2="-11" y2="-18" />
                            <line x1="0" y1="0" x2="18" y2="8" />
                            <line x1="0" y1="0" x2="-18" y2="8" />
                          </g>
                          <circle cx="0" cy="0" r="14" fill="#ffffff" />
                        </>
                      )}

                      {endingResult.character.id === PikminColor.Pink && (
                        <>
                          <ellipse cx="-18" cy="-5" rx="18" ry="12" fill="rgba(244, 114, 182, 0.85)" stroke="#701a75" strokeWidth="2" transform="rotate(-15, -18, -5)" />
                          <ellipse cx="18" cy="-5" rx="18" ry="12" fill="rgba(244, 114, 182, 0.85)" stroke="#701a75" strokeWidth="2" transform="rotate(15, 18, -5)" />
                          <rect x="-5" y="-18" width="10" height="36" rx="5" fill="#f472b6" stroke="#701a75" strokeWidth="2.5" />
                          <path d="M -2,-18 Q -8,-25 -10,-24" fill="none" stroke="#701a75" strokeWidth="1.5" />
                          <path d="M 2,-18 Q 8,-25 10,-24" fill="none" stroke="#701a75" strokeWidth="1.5" />
                        </>
                      )}

                      {endingResult.character.id === PikminColor.Rock && (
                        <>
                          <polygon points="-16,-16 16,-16 22,0 16,18 -16,18 -22,0" fill="#6b7280" stroke="#1c1917" strokeWidth="2.5" />
                          <path d="M -15, -8 Q 0, -6 14, -7" stroke="#4b5563" strokeWidth="1.5" fill="none" />
                          <path d="M -15, 8 Q 0, 7 14, 9" stroke="#4b5563" strokeWidth="1.5" fill="none" />
                        </>
                      )}

                      {/* Joyful celebrative face with squinting happy eyes, blush, and sweet smile */}
                      <path d="M -11, -3 Q -7.5, -9 -4, -3" fill="none" stroke="#111111" strokeWidth="3.2" strokeLinecap="round" />
                      <path d="M 4, -3 Q 7.5, -9 11, -3" fill="none" stroke="#111111" strokeWidth="3.2" strokeLinecap="round" />
                      <ellipse cx="-12" cy="4" rx="4" ry="2.2" fill="#f43f5e" opacity="0.65" />
                      <ellipse cx="12" cy="4" rx="4" ry="2.2" fill="#f43f5e" opacity="0.65" />
                      <path d="M -3.5, 4 Q 0, 8.5 3.5, 4 Z" fill="#881337" stroke="#310008" strokeWidth="1" />

                      {/* Proudly showcasing a high quality glowing cyan treasure crystal right in front! */}
                      <polygon points="0,15 9,21 5,30 -5,30 -9,21" fill="#67e8f9" stroke="#0891b2" strokeWidth="2" />
                      <polygon points="0,15 3,21 0,30 -3,21" fill="#e0f7fa" />
                    </g>
                  </svg>

                  {/* Bubble showing muddy or unblemished text indicator */}
                  <span className="absolute bottom-2 bg-[#FCFAF6] text-[#8C7E6A] border-2 border-[#8C7E6A] font-serif font-extrabold text-[10px] px-3 py-0.5 rounded-full shadow-md z-10 select-none">
                    {endingResult.reason === "lives_depleted" ? "精靈有些許微光黯淡，安全回巢" : "大成功：元素能量完美無缺！"}
                  </span>
                </div>

                {/* Pikmin dialog bubble */}
                <div className="mt-4 bg-white border-2 border-stone-800 rounded-2xl p-3 relative shadow-xs max-w-xs transform rotate-1">
                  <p className="text-3xs font-mono text-stone-700 italic">
                    「{endingResult.reason === "lives_depleted" ? endingResult.character.hurtQuote : endingResult.character.victoryQuote}」
                  </p>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-x-6 border-x-transparent border-b-6 border-b-stone-800" />
                </div>
              </div>

              {/* Right Column: Score counters and rewards list */}
              <div className="md:col-span-7 space-y-4">
                <div className="bg-white border-2 border-stone-800 rounded-3xl p-4 text-left shadow-xs">
                  <span className="text-xs text-[#5A5A40] block font-serif font-bold italic leading-none mb-1">🌟 本次挑戰所帶回的能量總值</span>
                  {/* Tally counter counting up dynamically! */}
                  <div className="flex items-baseline gap-1.5 mt-1.5">
                    <span className="text-4xl font-mono font-black text-stone-850">{tallyScore}</span>
                    <span className="text-xs font-mono font-bold text-amber-600">PTS</span>

                    {tallyScore === endingResult.score && (
                      <span className="text-5xs bg-emerald-100 border border-emerald-300 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-black ml-auto animate-bounce">
                        ✔ 結算完成
                      </span>
                    )}
                  </div>

                  {/* Level stars rating indicators */}
                  <div className="flex gap-1 mt-3 border-t border-dashed border-stone-100 pt-2.5">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`w-6 h-6 ${
                          idx < endingResult.starRating ? "text-amber-400 fill-amber-300 animate-spin-slow" : "text-stone-200"
                        }`}
                      />
                    ))}
                    <span className="text-5xs font-mono text-stone-400 self-center ml-2">評分等級: {endingResult.starRating}星</span>
                  </div>
                </div>

                {/* Reward items lists harvested */}
                <div className="bg-stone-100 border-2 border-stone-300 rounded-2xl p-4 text-left">
                  <h4 className="font-bold text-xs text-stone-700 font-sans border-b border-stone-200 pb-1.5 mb-2.5 flex items-center gap-1 leading-none select-none">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    本次搬運採集戰利品清單：
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-2 rounded-xl border border-stone-200 text-center shadow-3xs">
                      <span className="text-xl">💧</span>
                      <h5 className="text-4xs text-stone-500 font-mono font-black mt-1">晨露綠晶瑩</h5>
                      <span className="text-sm font-mono font-bold text-stone-800 block">+{endingResult.fruitRewards.white}</span>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-stone-200 text-center shadow-3xs">
                      <span className="text-xl">🍊</span>
                      <h5 className="text-4xs text-stone-500 font-mono font-black mt-1">烈焰暖果核</h5>
                      <span className="text-sm font-mono font-bold text-stone-800 block">+{endingResult.fruitRewards.red}</span>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-stone-200 text-center shadow-3xs">
                      <span className="text-xl">🔮</span>
                      <h5 className="text-4xs text-stone-500 font-mono font-black mt-1">星海潮汐晶</h5>
                      <span className="text-sm font-mono font-bold text-stone-800 block">+{endingResult.fruitRewards.blue}</span>
                    </div>
                  </div>

                  {/* Souvenir items checklist section */}
                  {endingResult.itemsFound.length > 0 && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 p-2 rounded-xl text-4xs font-mono text-amber-800">
                      <span className="font-bold text-amber-950 block mb-1">★ 額外意外收穫 (Souvenirs found):</span>
                      <div className="flex flex-wrap gap-1">
                        {endingResult.itemsFound.map((itemKey) => {
                          const lookup = {
                            item_lens: "⚙️失落的星軌儀齒輪",
                            item_button: "❇️精靈王的紅寶石星章",
                            item_clip: "🔑命運的秘銀雙環鑰匙",
                            item_die: "🎲古代預言占卜幻立方",
                            item_stamp: "🔖春櫻紀念古森明信片",
                          };
                          return (
                            <span key={itemKey} className="px-2 py-0.5 bg-white border border-amber-300 rounded-md">
                              {lookup[itemKey as keyof typeof lookup] || "古老神器"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  {endingResult?.gameType === "level" ? (
                    <>
                      <button
                        onClick={() => {
                          setEndingResult(null);
                          setActiveTab("levels");
                        }}
                        className="px-5 py-3 bg-stone-800 hover:bg-stone-700 text-white font-extrabold text-sm rounded-xl transition cursor-pointer whitespace-nowrap"
                      >
                        返回關卡
                      </button>
                      <button
                        onClick={() => {
                          const gType = endingResult?.gameType || "infinite";
                          const lId = endingResult?.levelId;
                          setEndingResult(null);
                          handleLaunchGame(gType, lId);
                        }}
                        className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-stone-900 border-b-4 border-amber-600 active:border-b-0 font-extrabold text-sm rounded-xl transition cursor-pointer"
                      >
                        重新開始冒險
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEndingResult(null);
                          setActiveTab("home");
                        }}
                        className="px-4 py-3 bg-[#E8E1D5] hover:bg-[#D1C7B7] text-[#5A5A40] border-2 border-[#8C7E6A] font-extrabold text-sm rounded-xl transition cursor-pointer whitespace-nowrap"
                      >
                        返回營地
                      </button>
                      <button
                        onClick={() => {
                          setEndingResult(null);
                          setActiveTab("leaderboard");
                        }}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white border-b-4 border-emerald-850 active:border-b-0 font-extrabold text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        🏆 前往排行榜
                      </button>
                      <button
                        onClick={() => {
                          const gType = endingResult?.gameType || "infinite";
                          setEndingResult(null);
                          handleLaunchGame(gType);
                        }}
                        className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-stone-900 border-b-4 border-amber-600 active:border-b-0 font-extrabold text-sm rounded-xl transition cursor-pointer whitespace-nowrap"
                      >
                        再跑一次
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col gap-4">
            {/* 4. STATIC PAGES GATE TABS */}
            
            {/* Elegant upper breadcrumb navigation shown ONLY on Subpages with required 'Return to Camp' button on top-right */}
            {activeTab !== "home" && (
              <div className="flex justify-between items-center bg-[#F5F2ED] border-4 border-[#8C7E6A] rounded-2xl px-5 py-3 shadow-sm select-none animate-fade-in">
                <div className="flex items-center gap-2 font-serif italic text-sm font-bold text-[#5A5A40]">
                  <Compass className="w-4 h-4 text-[#89C09E] animate-spin-slow" />
                  <span>微光冒險中 › </span>
                  <span className="text-[#F27D26] underline decoration-dashed decoration-1">
                    {activeTab === "levels" && "奇幻探險關卡 (Stages)"}
                    {activeTab === "collection" && "元素奇珍圖鑑 (Guide Book)"}
                    {activeTab === "leaderboard" && "微光契約排行榜 (Leaderboard)"}
                    {activeTab === "settings" && "系統設定 (Settings)"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab("home");
                    if (settings.soundEnabled) gameAudio.playJump();
                  }}
                  className="flex items-center gap-1 px-4 py-2 bg-[#F27D26] hover:bg-[#d96611] text-white border-2 border-[#8C7E6A] rounded-xl text-xs font-bold font-serif italic transition cursor-pointer btn-shadow"
                >
                  ⛺ 回到營地 (Back to Camp)
                </button>
              </div>
            )}

            {/* TAB CONTENT MULTI-ROUTE RENDERERS */}
            {activeTab === "home" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5" id="home-dashboard-grid">
                
                {/* Visual Banner cover card (Left 4-column grid) */}
                <div className="md:col-span-4 bg-[#F5F2ED] border-4 border-[#8C7E6A] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="aspect-[4/3] rounded-xl border-2 border-[#8C7E6A] overflow-hidden relative shadow-inner bg-gradient-to-tr from-[#FAF7F0] to-[#EBE4D5]">
                      {/* Procedural Handscroll Vector Scene representing current Element Spirits! */}
                      <svg viewBox="0 0 200 150" className="w-full h-full select-none">
                        {/* Midnight forest backdrop with soft magical purple & dark emerald colors */}
                        <rect x="0" y="0" width="200" height="150" fill="#0b1329" />
                        
                        {/* Background forest silhouettes */}
                        <path d="M 12 140 L 12 75 L 18 65 L 24 75 L 24 140 Z" fill="#022d1a" />
                        <path d="M 52 140 L 52 90 L 58 80 L 64 90 L 64 140 Z" fill="#033b22" opacity="0.6" />
                        <path d="M 188 140 L 188 80 L 194 70 L 200 80 L 200 140 Z" fill="#022d1a" />
                        <path d="M 148 140 L 148 95 L 154 85 L 160 95 L 160 140 Z" fill="#033b22" opacity="0.6" />
                        
                        {/* Starry sky details and Crescent Moon */}
                        <circle cx="170" cy="28" r="9" fill="#fef08a" opacity="0.9" />
                        <circle cx="166" cy="25" r="9" fill="#0b1329" />

                        {/* Soft glowing ambient wisps (representing poisonous / white micro spores) */}
                        <circle cx="45" cy="50" r="4.5" fill="#e9d5ff" opacity="0.35" />
                        <circle cx="140" cy="40" r="3.5" fill="#e9d5ff" opacity="0.25" />
                        
                        {/* Quiet mossy forest ground */}
                        <ellipse cx="100" cy="148" rx="120" ry="24" fill="#064e3b" stroke="#047857" strokeWidth="2" />

                        {/* 1. PURPLE GRAVITY SPIRIT (far-left): Celestial orb & Saturn ring */}
                        <g transform="translate(11, 0)">
                          <circle cx="24" cy="122" r="10" fill="url(#gravityGrad)" stroke="#3b0764" strokeWidth="1.2" />
                          <ellipse cx="24" cy="124" rx="15" ry="3.5" fill="none" stroke="#c084fc" strokeWidth="1.5" transform="rotate(-12, 24, 124)" />
                          {/* Sclera & Pupils */}
                          <circle cx="20.5" cy="121" r="2.2" fill="#ffffff" />
                          <circle cx="27.5" cy="121" r="2.2" fill="#ffffff" />
                          <circle cx="20.5" cy="121" r="1" fill="#22252a" />
                          <circle cx="27.5" cy="121" r="1" fill="#22252a" />
                        </g>

                        {/* 2. RED FIRE SPIRIT (center-left): Burning flame shape with licks */}
                        <g transform="translate(17, 0)">
                          <path d="M 58 123 C 71 123 70 106 67 103 Q 62 90 60 98 Q 58 88 56 98 Q 53 90 49 103 C 46 106 45 123 58 123 Z" fill="url(#fireGrad)" stroke="#7c2d12" strokeWidth="1.2" />
                          {/* Inner warm lava core */}
                          <ellipse cx="58" cy="111" rx="8" ry="7" fill="#fed7aa" />
                          {/* Sclera & Pupils */}
                          <circle cx="54.5" cy="110" r="2.2" fill="#ffffff" />
                          <circle cx="61.5" cy="110" r="2.2" fill="#ffffff" />
                          <circle cx="54.5" cy="110" r="1" fill="#22252a" />
                          <circle cx="61.5" cy="110" r="1" fill="#22252a" />
                        </g>

                        {/* 3. YELLOW ELECTRIC SPIRIT (center-right): Electric star & shining sparkles */}
                        <g transform="translate(2, 0)">
                          <path d="M 118 100 L 123 108 L 132 113 L 123 118 L 118 127 L 113 118 L 104 113 L 113 108 Z" fill="url(#electricGrad)" stroke="#78350f" strokeWidth="1.2" />
                          {/* Spark rays */}
                          <line x1="118" y1="97" x2="118" y2="92" stroke="#fef08a" strokeWidth="1" />
                          <line x1="135" y1="113" x2="140" y2="113" stroke="#fef08a" strokeWidth="1" />
                          <line x1="118" y1="130" x2="118" y2="135" stroke="#fef08a" strokeWidth="1" />
                          <line x1="101" y1="113" x2="96" y2="113" stroke="#fef08a" strokeWidth="1" />
                          {/* Sclera & Pupils */}
                          <circle cx="114" cy="112" r="2.2" fill="#ffffff" />
                          <circle cx="122" cy="112" r="2.2" fill="#ffffff" />
                          <circle cx="114" cy="112" r="1" fill="#22252a" />
                          <circle cx="122" cy="112" r="1" fill="#22252a" />
                        </g>

                        {/* 4. BLUE WATER SPIRIT (far-right): Sharp teardrop with highlights */}
                        <g transform="translate(14, 0)">
                          <path d="M 148 97 C 157 110 157 124 148 124 C 139 124 139 110 148 97 Z" fill="url(#waterGrad)" stroke="#0c4a6e" strokeWidth="1.2" />
                          <ellipse cx="145" cy="112" rx="2" ry="1" fill="rgba(255, 255, 255, 0.45)" transform="rotate(-45, 145, 112)" />
                          {/* Sclera & Pupils */}
                          <circle cx="144" cy="114" r="2.2" fill="#ffffff" />
                          <circle cx="152" cy="114" r="2.2" fill="#ffffff" />
                          <circle cx="144" cy="114" r="1" fill="#22252a" />
                          <circle cx="152" cy="114" r="1" fill="#22252a" />
                        </g>

                        {/* Gradients definitions inline */}
                        <defs>
                          <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff9f43" />
                            <stop offset="100%" stopColor="#ff4d4d" />
                          </linearGradient>
                          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7dd3fc" />
                            <stop offset="100%" stopColor="#0284c7" />
                          </linearGradient>
                          <linearGradient id="electricGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fef08a" />
                            <stop offset="100%" stopColor="#f59e0b" />
                          </linearGradient>
                          <linearGradient id="gravityGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#c084fc" />
                            <stop offset="100%" stopColor="#6b21a8" />
                          </linearGradient>
                          <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f472b6" />
                            <stop offset="100%" stopColor="#db2777" />
                          </linearGradient>
                          <linearGradient id="rockGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#9ca3af" />
                            <stop offset="100%" stopColor="#4b5563" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <h3 className="text-xl font-bold text-[#5A5A40] font-serif italic tracking-tight leading-snug">
                      契約者，喚醒微光精靈一起探險吧！
                    </h3>
                    <p className="text-xs text-[#5A5A40] opacity-85 leading-relaxed text-left">
                      圓滾滾的元素精靈們閃著暖光與您同行！在神秘林野中跨越水窪與熱岩，撞碎藤蔓，收集亮晶晶的元素能量與失落的時光古物吧！
                    </p>
                  </div>

                  <div className="flex gap-2 text-xs font-mono bg-white border-2 border-[#D1C7B7] rounded-xl p-3 mt-4 text-left shadow-2xs">
                    <span className="font-bold text-[#F27D26] block shrink-0 font-serif italic">極致統計:</span>
                    <div className="text-[#5A5A40] opacity-90">
                      <p>● 原野高分: <strong className="font-bold text-[#F27D26]">{Math.max(...highScores.map(h => h.score), 0)} pts</strong></p>
                      <p>● 奇珍解鎖: <strong className="font-bold">{Object.keys(collectedStats).length} 種</strong></p>
                    </div>
                  </div>
                </div>

                {/* Visual grid portals list (Right 8-column grid representing central Camp entries) */}
                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5" id="camp-portals-grid">
                  
                  {/* Portal 1: Stage Select */}
                  <div
                    onClick={() => {
                      setActiveTab("levels");
                      if (settings.soundEnabled) gameAudio.playJump();
                    }}
                    className="cursor-pointer bg-white border-4 border-[#8C7E6A] rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:bg-[#FDFBF7] hover:scale-[1.02] active:scale-[0.98] hover:border-[#F27D26] transition-all duration-200 btn-shadow group text-left relative"
                  >
                    <span className="absolute top-2 right-3 text-[9px] font-mono text-[#8C7E6A]/75 font-bold uppercase">STAGES</span>
                    <div className="space-y-2.5">
                      <div className="w-12 h-12 bg-[#F27D26]/10 rounded-xl border-2 border-orange-500 flex items-center justify-center text-xl shadow-xs group-hover:rotate-6 transition-transform">
                        🎬
                      </div>
                      <h4 className="text-lg font-bold text-[#5A5A40] font-serif italic flex items-center gap-1.5 mt-2">
                        奇幻探險關卡
                      </h4>
                      <p className="text-xs text-[#5A5A40] opacity-80 leading-relaxed">
                        在三大奇珍探險地圖中精巧跨越，一邊收集元素露水明信片、一邊拼取完美的三星獎章評價！
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#F27D26] font-serif italic group-hover:translate-x-1 transition-transform">
                      前往秘境 ➔
                    </div>
                  </div>

                  {/* Portal 2: Endless Run */}
                  <div
                    onClick={() => {
                      handleLaunchGame("infinite");
                    }}
                    className="cursor-pointer bg-white border-4 border-[#8C7E6A] rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:bg-[#FDFBF7] hover:scale-[1.02] active:scale-[0.98] hover:border-red-500 transition-all duration-200 btn-shadow group text-left relative"
                  >
                    <span className="absolute top-2 right-3 text-[9px] font-mono text-[#8C7E6A]/75 font-bold uppercase animate-pulse">ENDLESS</span>
                    <div className="space-y-2.5">
                      <div className="w-12 h-12 bg-red-100 rounded-xl border-2 border-red-500 flex items-center justify-center text-xl shadow-xs group-hover:rotate-6 transition-transform">
                        🔥
                      </div>
                      <h4 className="text-lg font-bold text-[#5A5A40] font-serif italic flex items-center gap-1.5 mt-2">
                        無限原野遊玩
                      </h4>
                      <p className="text-xs text-[#5A5A40] opacity-80 leading-relaxed">
                        挑戰無止境的奇妙原野！在狂奔中點選並帶上心儀的 7 大元素小夥伴，打破記錄登上宇宙排行榜！
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-bold text-red-600 font-serif italic group-hover:translate-x-1 transition-transform animate-pulse">
                      召喚大精靈・開跑 ➔
                    </div>
                  </div>

                  {/* Portal 3: Collection Tab */}
                  <div
                    onClick={() => {
                      setActiveTab("collection");
                      if (settings.soundEnabled) gameAudio.playJump();
                    }}
                    className="cursor-pointer bg-white border-4 border-[#8C7E6A] rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:bg-[#FDFBF7] hover:scale-[1.02] active:scale-[0.98] hover:border-[#89C09E] transition-all duration-200 btn-shadow group text-left relative"
                  >
                    <span className="absolute top-2 right-3 text-[9px] font-mono text-[#8C7E6A]/75 font-bold uppercase">GUIDE</span>
                    <div className="space-y-2.5">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl border-2 border-emerald-500 flex items-center justify-center text-xl shadow-xs group-hover:rotate-6 transition-transform">
                        📖
                      </div>
                      <h4 className="text-lg font-bold text-[#5A5A40] font-serif italic flex items-center gap-1.5 mt-2">
                        元素奇珍圖鑑
                      </h4>
                      <p className="text-xs text-[#5A5A40] opacity-80 leading-relaxed">
                        查看 7 種核心元素夥伴的主被動屬性描述，與您辛勤搬運所收藏到的微光失落古物珍品。
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 font-serif italic group-hover:translate-x-1 transition-transform">
                      開啟圖鑑 ➔
                    </div>
                  </div>

                  {/* Portal 4: Leaderboard Tab */}
                  <div
                    onClick={() => {
                      setActiveTab("leaderboard");
                      if (settings.soundEnabled) gameAudio.playJump();
                    }}
                    className="cursor-pointer bg-white border-4 border-[#8C7E6A] rounded-2xl p-5 sm:p-6 flex flex-col justify-between hover:bg-[#FDFBF7] hover:scale-[1.02] active:scale-[0.98] hover:border-amber-500 transition-all duration-200 btn-shadow group text-left relative"
                  >
                    <span className="absolute top-2 right-3 text-[9px] font-mono text-[#8C7E6A]/75 font-bold uppercase">RANKING</span>
                    <div className="space-y-2.5">
                      <div className="w-12 h-12 bg-amber-100 rounded-xl border-2 border-amber-500 flex items-center justify-center text-xl shadow-xs group-hover:rotate-6 transition-transform">
                        🏆
                      </div>
                      <h4 className="text-lg font-bold text-[#5A5A40] font-serif italic flex items-center gap-1.5 mt-2">
                        微光契約排行榜
                      </h4>
                      <p className="text-xs text-[#5A5A40] opacity-80 leading-relaxed">
                        即時連線同步！展示全宇宙頂級精靈契約者的狂奔記錄，帶上您培養的元素夥伴閃亮上榜！
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-600 font-serif italic group-hover:translate-x-1 transition-transform">
                      登高遠望 ➔
                    </div>
                  </div>

                </div>
              </div>
            )}

            {activeTab === "levels" && (
              <LevelsTab
                unlockedLevelStars={levelStars}
                unlockedPostcardIds={POSTCARDS.map((p) => p.id)} // dynamically feed unlocked milestones
                onPlayLevel={(lvlId) => handleLaunchGame("level", lvlId)}
              />
            )}

            {activeTab === "collection" && (
              <CollectionTab
                collectedStats={collectedStats}
                onResetCollection={handleResetCollectionsOnly}
              />
            )}

            {activeTab === "leaderboard" && (
              <LeaderboardTab
                entries={highScores}
                currPlayerName={playerName}
                onResetLeaderboard={handleResetLeaderboardOnly}
              />
            )}

            {activeTab === "settings" && (
              <SettingsTab
                settings={settings}
                onUpdateSettings={(uSet) => {
                  setSettings(uSet);
                  setPlayerName(uSet.playerName);
                  localStorage.setItem("pikmin_hasSetNickname", "true");
                }}
                onResetAllData={handleResetAllData}
              />
            )}

          </div>
        )}
      </main>

      {/* 5. Crayon Footer statement line art */}
      <footer className="py-4 text-stone-400 border-t-2 border-stone-200 bg-stone-50 text-center font-mono text-5xs leading-none select-none">
        <p>© 2026 ELEMENTAL SPIRITS FANTASY FAN GAME. ALL RIGHTS RESERVED IN CHUBBY GLOW GARDEN.</p>
      </footer>

      {/* First-time nickname input modal overlay (Crayon cozy theme) */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="first-time-nickname-modal">
          <div className="bg-[#FDFBF7] p-6 rounded-2xl border-4 border-[#8C7E6A] shadow-2xl max-w-sm w-full text-center relative transform rotate-0.5 select-none font-sans">
            <div className="w-14 h-14 bg-[#F27D26]/10 rounded-full border-2 border-dashed border-[#F27D26] flex items-center justify-center text-2xl mx-auto mb-3 animate-bounce">
              ✨
            </div>
            <h3 className="text-xl font-bold text-[#5A5A40] font-serif italic mb-1.5">
              歡迎來到微光元素精靈世界！
            </h3>
            <p className="text-xs text-[#8C7E6A] leading-tight font-serif italic mb-5">
              請簽訂您的契約者御用暱稱或法名，這將代表您與元素夥伴刻印在微光契約排行榜上喔！
            </p>

            <div className="w-full bg-[#F5F2ED] p-3 rounded-xl border-2 border-[#D1C7B7] text-left flex flex-col gap-1.5 shadow-2xs">
              <label className="text-xs font-bold text-[#5A5A40] font-serif italic">
                🔑 契約者姓名：
              </label>
              <input
                type="text"
                placeholder="例如：小楓、若葉、晴人、蓮"
                maxLength={12}
                defaultValue={playerName === "探險家" ? "" : playerName}
                id="first-time-name-input"
                className="w-full px-3 py-2 border-2 border-[#D1C7B7] bg-white rounded-lg font-serif italic text-xs focus:border-[#8C7E6A] focus:outline-none focus:ring-0 text-stone-750 font-bold"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const typedName = (e.currentTarget as HTMLInputElement).value.trim();
                    if (typedName) {
                      handleSaveInitialNickname(typedName);
                    } else {
                      alert("請填寫一個可愛的契約者法名喔！");
                    }
                  }
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const element = document.getElementById("first-time-name-input") as HTMLInputElement;
                const typedName = element?.value.trim();
                if (!typedName) {
                  alert("請填寫一個可愛的契約者法名喔！");
                  return;
                }
                handleSaveInitialNickname(typedName);
              }}
              className="mt-5 w-full py-3 bg-[#F27D26] hover:brightness-105 border-b-4 border-orange-750 active:border-b-0 text-white font-serif italic font-bold text-sm rounded-xl transition cursor-pointer"
            >
              召喚小精靈 啟程！
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
