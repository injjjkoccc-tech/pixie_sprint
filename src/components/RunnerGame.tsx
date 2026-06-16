/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import { PikminCharacter, PikminColor, FruitItem, BuffItem, Obstacle, Trap } from "../types";
import { gameAudio } from "../utils/audio";
import { PIKMIN_CHARACTERS } from "../utils/constants";
import { Play, RotateCcw, Volume2, VolumeX, Shield, Star, Clock } from "lucide-react";

interface SpiritRunnerGameProps {
  character: PikminCharacter;
  mode: "infinite" | "level";
  levelId?: number;
  onGameOver: (
    score: number,
    rewards: { white: number; red: number; blue: number; items: string[] },
    reason: "time_up" | "lives_depleted" | "voluntary_exit",
    chosenChar?: PikminCharacter
  ) => void;
  onExit: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
}

interface SpeechBubble {
  text: string;
  x: number;
  y: number;
  alpha: number;
  life: number;
}

export const SpiritRunnerGame: React.FC<SpiritRunnerGameProps> = ({
  character: initialCharacter,
  mode,
  levelId = 1,
  onGameOver,
  onExit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sound toggles
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Stateful active character chosen dynamically in pre-game screen
  const [activeChar, setActiveChar] = useState<PikminCharacter>(initialCharacter);
  const character = activeChar;

  const selectCharacter = (char: PikminCharacter) => {
    setActiveChar(char);
    speedRef.current = char.speed * 0.7 + 2;
    if (soundEnabled) gameAudio.playJump();
  };

  // React states to handle Pause / Setup overlay
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  // React states representing the synchronized HUD numbers
  const [hudScore, setHudScore] = useState(0);
  const [hudLives, setHudLives] = useState(3);
  const hudTimeLeftValue = mode === "level" ? 60 : 999999;
  const [hudTimeLeft, setHudTimeLeft] = useState(hudTimeLeftValue);
  const [hudDistance, setHudDistance] = useState(0);
  const [hudMultiplierTimer, setHudMultiplierTimer] = useState(0);

  // Gameplay tracking variables (Refs to avoid React state delay in 60fps loop)
  const scoreRef = useRef(0);
  const multiplierRef = useRef(1); // Purple gives +1.1x base (is calculated during finalize), but star gives active multiplier active powerup x2
  const multiplierTimerRef = useRef(0);
  const distanceRef = useRef(0);
  const livesRef = useRef(3);
  const maxLivesRef = useRef(mode === "infinite" ? 5 : 3);
  const timeLeftRef = useRef(mode === "level" ? 60 : 999999); // init 60 seconds (1 min) for level mode
  const accumulatedAddedTimeRef = useRef(0); // caps at 2 minutes added (+120 seconds) as per instruction "BUFF增加時間已達累計2分鐘時就無法再生成該道具"

  // Collected metrics
  const collectedFruitsRef = useRef({ white: 0, red: 0, blue: 0 });
  const collectedItemsRef = useRef<string[]>([]); // random unique clip, buttons, stamps found

  // Character controller vectors
  const pikminRef = useRef({
    x: 100,
    y: 250,
    width: 45,
    height: 55,
    vy: 0,
    isOnGround: true,
    isDizzy: false,
    dizzyTimer: 0,
    isHurt: false,
    hurtTimer: 0,
    isRolling: false, // unique Rock pikmin
    rollTimer: 0,
    isPoisoning: false, // unique White pikmin skill B
    poisonTimer: 0,
    spinAngle: 0,
    flyFuel: mode === "level" ? 180 : 180, // Unique Pink flight time (3 seconds at 60fps)
  });

  // Game arrays
  const obstaclesRef = useRef<Obstacle[]>([]);
  const trapsRef = useRef<Trap[]>([]);
  const fruitsRef = useRef<FruitItem[]>([]);
  const buffsRef = useRef<BuffItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const speechesRef = useRef<SpeechBubble[]>([]);

  // Frame, loop timers and speed management
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const speedRef = useRef(initialCharacter.speed * 0.7 + 2); // adapt initial speed based on speed stat
  const countTimeRef = useRef(0); // game ticker

  // Item generation limits (Level Mode totals: rand but capped. Infinite Mode: infinitely spawning)
  const spawnTimerRef = useRef({
    obstacle: 0,
    trap: 0,
    item: 0,
    speech: 0,
  });

  // Unique elements for multi-level configs
  const levelObstaclePresets = [
    { type: "rock", destructible: true, name: "鬆軟土堆" },
    { type: "barricade", destructible: true, name: "枯木樹枝" },
    { type: "mushroom", destructible: true, name: "劇毒蕈菇" },
  ];

  const trapPresets = [
    { type: "lava", name: "狂暴岩漿", color: "#ef4444" },
    { type: "water", name: "深藍雨水窪", color: "#3b82f6" },
    { type: "electric", name: "高壓電磁網", color: "#a855f7" },
  ];

  // Sound handle sync helper
  const handleToggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    gameAudio.setSoundEnabled(newState);
  };

  // Keyboard events
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default scroll behaviors
      if (["Space", "ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(e.code)) {
        e.preventDefault();
      }
      keysPressedRef.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Set initial settings check
  useEffect(() => {
    gameAudio.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  // Adjust size of canvas based on responsive container padding
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current && containerRef.current) {
        const measuredWidth = containerRef.current.clientWidth;
        canvasRef.current.width = measuredWidth > 0 ? measuredWidth : 800;
        canvasRef.current.height = 360; // crisp fixed horizontal gameplay height
      }
    };
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    const timer = setTimeout(updateCanvasSize, 100);
    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      clearTimeout(timer);
    };
  }, [isReady]);

  // Trigger countdown whistle on load
  const startCountdown = () => {
    setIsReady(true);
    let count = 3;
    setCountdown(count);
    gameAudio.playWhistle();

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        gameAudio.playWhistle();
      } else if (count === 0) {
        setCountdown("GO!");
        gameAudio.playGoWhistle();
      } else {
        clearInterval(interval);
        setCountdown(null);
        // Start rendering loops
        lastTimeRef.current = performance.now();
        requestRef.current = requestAnimationFrame(gameLoop);
      }
    }, 850);
  };

  // Sound triggering functions / bubble builders
  const triggerSpeech = (text: string) => {
    speechesRef.current.push({
      text,
      x: pikminRef.current.x + 10,
      y: pikminRef.current.y - 15,
      alpha: 1.0,
      life: 50,
    });
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2,
        radius: Math.random() * 5 + 3,
        color,
        alpha: 1,
        life: 30 + Math.random() * 20,
      });
    }
  };

  // Action B trigger: Skill activations
  const triggerSkillB = () => {
    const p = pikminRef.current;
    if (p.isDizzy || p.isHurt) return;

    // White Pikmin toxin explosion
    if (character.id === PikminColor.White && !p.isPoisoning) {
      p.isPoisoning = true;
      p.poisonTimer = 40; // ~0.7 seconds active poison trail
      gameAudio.playSmash();
      triggerSpeech("毒霧噴射！");
      spawnParticles(p.x + p.width + 20, p.y + p.height / 2, "#cef3cc", 25);

      // Destroy reachable obstacles in front
      obstaclesRef.current.forEach((obs) => {
        if (!obs.destroyed && obs.x > p.x && obs.x < p.x + 220) {
          obs.destroyed = true;
          spawnParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, "#a3e635", 15);
          scoreRef.current += 30; // clearing obstacles reward
        }
      });
    }

    // Rock Pikmin spin roll
    if (character.id === PikminColor.Rock && !p.isRolling) {
      p.isRolling = true;
      p.rollTimer = 50; // ~0.8 seconds active roll
      gameAudio.playSmash();
      triggerSpeech("堅石衝擊！");

      // Crush obstacles
      obstaclesRef.current.forEach((obs) => {
        if (!obs.destroyed && obs.x > p.x && obs.x < p.x + 150) {
          obs.destroyed = true;
          spawnParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, "#78716c", 20);
          scoreRef.current += 30;
        }
      });
    }
  };

  // Main Canvas gameLoop running at 2D WebGL equivalent rate
  const gameLoop = (timestamp: number) => {
    if (isPausedRef.current) {
      requestRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate delta time briefly
    // const dt = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // Clear and draw everything
    updateGameLogic(canvas.width, canvas.height);
    renderGameCanvas(ctx, canvas.width, canvas.height);

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // Physics update & dynamic spawning
  const updateGameLogic = (width: number, height: number) => {
    countTimeRef.current++;
    distanceRef.current += speedRef.current / 10;

    // Increment score passively based on distance
    if (countTimeRef.current % 12 === 0) {
      scoreRef.current += 1;
    }

    // Handle timer for Level mode
    if (mode === "level" && countTimeRef.current % 60 === 0) {
      timeLeftRef.current--;
      if (timeLeftRef.current <= 0) {
        handleGameFinished("time_up");
        return;
      }
    }

    // Handle Active Multiplier timer
    if (multiplierTimerRef.current > 0) {
      multiplierTimerRef.current--;
      if (multiplierTimerRef.current <= 0) {
        multiplierRef.current = 1;
      }
    }

    // Accelerate game speed slightly as distance increases to keep it matching infinite runner scales
    if (countTimeRef.current % 400 === 0 && speedRef.current < 16) {
      speedRef.current += 0.35;
    }

    const p = pikminRef.current;

    // Keyboard Controller handling
    const isUpPressed =
      keysPressedRef.current["ArrowUp"] ||
      keysPressedRef.current["Space"] ||
      keysPressedRef.current["KeyW"];
    const isDownPressed =
      keysPressedRef.current["ArrowDown"] || keysPressedRef.current["KeyS"];

    // 1. Actions logic for character states
    if (p.isDizzy) {
      p.dizzyTimer--;
      if (p.dizzyTimer <= 0) p.isDizzy = false;
    }

    if (p.isHurt) {
      p.hurtTimer--;
      if (p.hurtTimer <= 0) p.isHurt = false;
    }

    if (p.isRolling) {
      p.rollTimer--;
      if (p.rollTimer <= 0) p.isRolling = false;
      p.spinAngle += 0.25;
    }

    if (p.isPoisoning) {
      p.poisonTimer--;
      if (p.poisonTimer <= 0) p.isPoisoning = false;
    }

    // Jumping physics or Winged Pikmin flying flight controller
    if (isUpPressed && !p.isDizzy) {
      if (character.id === PikminColor.Pink) {
        // Pink Pikmin can fly on space or continuous taps
        if (p.flyFuel > 0) {
          p.vy = -3.8; // fly upward
          p.flyFuel -= 1;
          p.isOnGround = false;
          if (countTimeRef.current % 15 === 0) {
            spawnParticles(p.x, p.y + p.height - 10, "#fb7185", 3);
          }
        } else {
          // Slow fall glide
          p.vy += 0.12;
        }
      } else {
        // Normal Pikmins standard jump
        if (p.isOnGround) {
          // Yellow jumps higher as per description (大耳朵高跳躍)
          p.vy = character.id === PikminColor.Yellow ? -14 : -11.5;
          p.isOnGround = false;
          gameAudio.playJump();
          spawnParticles(p.x + p.width / 4, p.y + p.height, "#bef264", 6);
        }
      }
    } else {
      // Drift gravity down
      if (character.id === PikminColor.Pink) {
        p.vy += 0.18; // wings float glidably
      } else {
        p.vy += 0.55; // standard gravity push
      }
    }

    // B button triggers
    if (isDownPressed && !p.isDizzy) {
      triggerSkillB();
    }

    // Gravity boundaries (Floor height calculation)
    const floorY = height - 90; // grass floor height
    p.y += p.vy;

    if (p.y + p.height >= floorY) {
      p.y = floorY - p.height;
      p.vy = 0;
      p.isOnGround = true;
      if (character.id === PikminColor.Pink) {
        p.flyFuel = 180; // refuels flight gauge instantly on floor
      }
    }

    // Periodic Speech pop "嘿咻！嘿咻！" matching Pikmin's running motion
    if (p.isOnGround && !p.isDizzy && !p.isHurt && !p.isRolling) {
      spawnTimerRef.current.speech++;
      if (spawnTimerRef.current.speech > 150 + Math.random() * 80) {
        const words = ["嘿咻！", "嘿咻！", "搬果實！", "呼嚕嚕！", "快點快點！", "那裡那裡！"];
        const randWord = words[Math.floor(Math.random() * words.length)];
        triggerSpeech(randWord);
        spawnTimerRef.current.speech = 0;
      }
    }

    // 2. Obstacles spawn logic
    spawnTimerRef.current.obstacle++;
    const obstacleSpawnInterval = 140 + Math.random() * 90;
    if (spawnTimerRef.current.obstacle > obstacleSpawnInterval) {
      // Pick random preset
      const preset = levelObstaclePresets[Math.floor(Math.random() * levelObstaclePresets.length)];
      obstaclesRef.current.push({
        id: `obs_${countTimeRef.current}`,
        type: preset.type as any,
        name: preset.name,
        x: width + 50,
        width: 38,
        height: 48,
        destructible: preset.destructible,
        destroyed: false,
      });
      spawnTimerRef.current.obstacle = 0;
    }

    // 3. Traps spawn logic (Don't spawn trap simultaneously with obstacles)
    spawnTimerRef.current.trap++;
    const trapSpawnInterval = 210 + Math.random() * 120;
    if (spawnTimerRef.current.trap > trapSpawnInterval && spawnTimerRef.current.obstacle > 40) {
      let filteredTraps = [...trapPresets];
      if (mode === "level") {
        if (levelId === 1) {
          filteredTraps = [];
        } else if (levelId === 2) {
          filteredTraps = trapPresets.filter(p => p.type === "water");
        } else if (levelId === 3) {
          filteredTraps = [...trapPresets];
        }
      }

      if (filteredTraps.length > 0) {
        const preset = filteredTraps[Math.floor(Math.random() * filteredTraps.length)];
        trapsRef.current.push({
          id: `trap_${countTimeRef.current}`,
          type: preset.type as any,
          name: preset.name,
          x: width + 50,
          width: 75,
          height: 35,
          damage: 1,
        });
      }
      spawnTimerRef.current.trap = 0;
    }

    // 4. Fruits spawn logic (Random altitudes)
    spawnTimerRef.current.item++;
    if (spawnTimerRef.current.item > 60 + Math.random() * 50) {
      const isAlt = Math.random() > 0.45;
      const fruitTypes: Array<"white" | "red" | "blue"> = ["white", "white", "red", "red", "blue"];
      const chosenType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
      const pointsTable = { white: 10, red: 50, blue: 100 };

      // Rarely, spawn a random souvenir collection artifact!
      const isRareSouvenir = Math.random() > 0.95;
      let name = "果實";
      if (isRareSouvenir) {
        const souvenirPool = ["item_lens", "item_button", "item_clip", "item_die", "item_stamp"];
        const randSouvenir = souvenirPool[Math.floor(Math.random() * souvenirPool.length)];
        fruitsRef.current.push({
          id: randSouvenir, // we pass the solid ID as key for collection cataloging directly!
          type: "white", // fallback representation
          name: "神奇古物寶藏",
          points: 150,
          x: width + 30,
          y: isAlt ? floorY - 90 - Math.random() * 65 : floorY - 20,
          radius: 15,
          collected: false,
        });
      } else {
        fruitsRef.current.push({
          id: `f_${countTimeRef.current}`,
          type: chosenType,
          name: `草莓`,
          points: pointsTable[chosenType],
          x: width + 30,
          y: isAlt ? floorY - 90 - Math.random() * 65 : floorY - 14,
          radius: 12,
          collected: false,
        });
      }

      spawnTimerRef.current.item = 0;
    }

    // 5. Buffs spawn logic (Heart / Star)
    // Only spawn Clock buff in Level mode, Heart/Multiplier stars in Infinite mode
    if (countTimeRef.current % 450 === 0) {
      const buffType =
        mode === "level"
          ? Math.random() > 0.6
            ? "clock"
            : "multiplier"
          : Math.random() > 0.7
          ? "heart"
          : "multiplier";

      // Cap added clock time in Level mode to prevent over-farming (capped +2 min added accumulatably!)
      if (buffType !== "clock" || accumulatedAddedTimeRef.current < 120) {
        buffsRef.current.push({
          id: `b_${countTimeRef.current}`,
          type: buffType as any,
          name: buffType === "heart" ? "愛心草本露" : buffType === "clock" ? "時間沙漏" : "幸運雙重星星",
          x: width + 40,
          y: floorY - 60 - Math.random() * 60,
          radius: 14,
          collected: false,
          value: buffType === "heart" ? 1 : buffType === "clock" ? 10 : 2,
        });
      }
    }

    // 6. Update Position & Obstacle Collision Checks
    obstaclesRef.current.forEach((obs) => {
      obs.x -= speedRef.current;

      // Box Collision check
      if (!obs.destroyed && !obs.destroyed) {
        const obsLeft = obs.x;
        const obsRight = obs.x + obs.width;
        const obsTop = floorY - obs.height;
        const obsBottom = floorY;

        const pikminLeft = p.x;
        const pikminRight = p.x + p.width;
        const pikminTop = p.y;
        const pikminBottom = p.y + p.height;

        if (
          pikminRight > obsLeft + 5 &&
          pikminLeft < obsRight - 5 &&
          pikminBottom > obsTop + 5 &&
          pikminTop < obsBottom - 5
        ) {
          // If Rock Pikmin is rolling or White Pikmin has proactive poisoning, demolish obstacles!
          if (p.isRolling && obs.destructible) {
            obs.destroyed = true;
            spawnParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, "#4b5563", 15);
            gameAudio.playSmash();
            scoreRef.current += 30;
          } else if (p.isPoisoning && obs.destructible) {
            obs.destroyed = true;
            spawnParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, "#cef3cc", 12);
            scoreRef.current += 35;
          } else {
            // White and Rock also immunely avoid normal smash dizziness timers, else dizzy stun!
            if (!p.isDizzy && !p.isHurt) {
              if (character.id === PikminColor.Rock || character.id === PikminColor.White) {
                // Rock shrugs it off! Less stun
                p.isDizzy = true;
                p.dizzyTimer = 25; // short dizzy
                speedRef.current = Math.max(2, speedRef.current - 1.5); // halt visual speed
                triggerSpeech("好硬！撞開他！");
                gameAudio.playHurt();
              } else {
                p.isDizzy = true;
                p.dizzyTimer = 50; // dizzy 50 ticks
                speedRef.current = Math.max(1, speedRef.current - 3); // sudden stall speed
                triggerSpeech("好痛、轉圈圈...");
                gameAudio.playHurt();
                livesRef.current -= 1;
                spawnParticles(p.x + p.width / 2, p.y + p.height / 2, "#f87171", 10);
                if (livesRef.current <= 0) {
                  handleGameFinished("lives_depleted");
                }
              }
            }
          }
        }
      }
    });

    // 7. Water, Lava, Electric Traps Collision Checks
    trapsRef.current.forEach((trap) => {
      trap.x -= speedRef.current;

      const trapLeft = trap.x;
      const trapRight = trap.x + trap.width;
      const trapTop = floorY;
      const trapBottom = floorY + trap.height;

      const pLeft = p.x;
      const pRight = p.x + p.width;
      const pBottom = p.y + p.height;

      if (pRight > trapLeft + 8 && pLeft < trapRight - 8 && pBottom >= trapTop - 8) {
        // Red resists fire lava
        if (trap.type === "lava" && character.id === PikminColor.Red) {
          if (countTimeRef.current % 12 === 0) {
            triggerSpeech("暖烘烘！");
            spawnParticles(p.x + p.width / 2, p.y + p.height, "#ef4444", 3);
          }
          return;
        }

        // Blue resists water pools and swims
        if (trap.type === "water" && character.id === PikminColor.Blue) {
          if (countTimeRef.current % 15 === 0) {
            triggerSpeech("游泳中～");
            spawnParticles(p.x + p.width / 2, p.y + p.height - 10, "#3b82f6", 4);
          }
          return;
        }

        // Yellow resists high electricity web
        if (trap.type === "electric" && character.id === PikminColor.Yellow) {
          if (countTimeRef.current % 15 === 0) {
            triggerSpeech("麻酥酥！");
            spawnParticles(p.x + p.width / 2, p.y + p.height / 2, "#eab308", 4);
          }
          return;
        }

        // Otherwise damage!
        if (!p.isHurt && !p.isDizzy) {
          p.isHurt = true;
          p.hurtTimer = 65; // recovery invincibility
          livesRef.current -= trap.damage;
          gameAudio.playHurt();

          let trapSpeech = "受重傷！";
          if (trap.type === "lava") trapSpeech = "被火燙到啦！";
          if (trap.type === "water") trapSpeech = "咕嚕咕嚕要溺水！";
          if (trap.type === "electric") trapSpeech = "被高壓電給電到！";

          triggerSpeech(trapSpeech);
          spawnParticles(p.x + p.width / 2, p.y + p.height / 2, "#ef4444", 15);

          if (livesRef.current <= 0) {
            handleGameFinished("lives_depleted");
          }
        }
      }
    });

    // 8. Collect Fruits
    fruitsRef.current.forEach((fruit) => {
      fruit.x -= speedRef.current;

      const dx = p.x + p.width / 2 - fruit.x;
      const dy = p.y + p.height / 2 - fruit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < fruit.radius + p.width / 2 && !fruit.collected) {
        fruit.collected = true;

        // Collect point calculations
        const pt = fruit.points * multiplierRef.current;
        scoreRef.current += pt;
        gameAudio.playCollectFruit(fruit.type);

        // Record visual count
        if (fruit.id.startsWith("f_")) {
          collectedFruitsRef.current[fruit.type]++;
        } else {
          // It's a special rare accessory artifact ID!
          // Push to collected list
          if (!collectedItemsRef.current.includes(fruit.id)) {
            collectedItemsRef.current.push(fruit.id);
          }
          triggerSpeech("挖到古代珍品！");
          spawnParticles(fruit.x, fruit.y, "#eab308", 15);
        }

        spawnParticles(fruit.x, fruit.y, "#fbbf24", 8);
      }
    });

    // 9. Collect Buffs
    buffsRef.current.forEach((buff) => {
      buff.x -= speedRef.current;

      const dx = p.x + p.width / 2 - buff.x;
      const dy = p.y + p.height / 2 - buff.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < buff.radius + p.width / 2 && !buff.collected) {
        buff.collected = true;
        gameAudio.playCollectBuff();
        spawnParticles(buff.x, buff.y, "#ec4899", 12);

        if (buff.type === "heart") {
          livesRef.current = Math.min(maxLivesRef.current, livesRef.current + 1);
          triggerSpeech("獲得生命充沛露！");
        } else if (buff.type === "multiplier") {
          multiplierRef.current = 2;
          multiplierTimerRef.current = 300; // 5 seconds at 60fps
          triggerSpeech("積分金幣加倍！");
        } else if (buff.type === "clock") {
          timeLeftRef.current += 10;
          accumulatedAddedTimeRef.current += 10;
          triggerSpeech("時間延長 +10s！");
        }
      }
    });

    // 10. Filter out obstacles, traps and particles out of visual screen
    obstaclesRef.current = obstaclesRef.current.filter((obs) => obs.x > -100);
    trapsRef.current = trapsRef.current.filter((trap) => trap.x > -150);
    fruitsRef.current = fruitsRef.current.filter((fruit) => fruit.x > -50 && !fruit.collected);
    buffsRef.current = buffsRef.current.filter((buff) => buff.x > -50 && !buff.collected);

    // Update floating particles
    particlesRef.current.forEach((part) => {
      part.x += part.vx;
      part.y += part.vy;
      part.vy += 0.08; // subtle falling weight
      part.alpha = Math.max(0, part.alpha - 0.035);
      part.life--;
    });
    particlesRef.current = particlesRef.current.filter((part) => part.life > 0 && part.alpha > 0);

    // Update text speech bubble states
    speechesRef.current.forEach((sp) => {
      sp.y -= 0.6; // rise upwards
      sp.alpha = Math.max(0, sp.alpha - 0.02);
      sp.life--;
    });
    speechesRef.current = speechesRef.current.filter((sp) => sp.life > 0);

    // Sync HUD states dynamically on each logical frame
    setHudScore((prev) => (prev !== scoreRef.current ? scoreRef.current : prev));
    setHudLives((prev) => (prev !== livesRef.current ? livesRef.current : prev));
    setHudTimeLeft((prev) => (prev !== timeLeftRef.current ? timeLeftRef.current : prev));
    const distFloor = Math.floor(distanceRef.current);
    setHudDistance((prev) => (prev !== distFloor ? distFloor : prev));
    setHudMultiplierTimer((prev) => (prev !== multiplierTimerRef.current ? multiplierTimerRef.current : prev));
  };

  // Complete runner logic visualization
  const renderGameCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // Mystical deep fantasy night sky blending into quiet forest depths
    const skyGrd = ctx.createLinearGradient(0, 0, 0, height);
    skyGrd.addColorStop(0, "#020617"); // very deep magical slate blue night sky
    skyGrd.addColorStop(0.4, "#0f172a"); // space indigo
    skyGrd.addColorStop(0.95, "#064e3b"); // rich emerald fantasy forest depth near the floor
    skyGrd.addColorStop(1, "#022d1a"); // deep dark vegetation shade
    ctx.fillStyle = skyGrd;
    ctx.fillRect(0, 0, width, height);

    // DRAW SHINING CRESCENT FANTASY MOON
    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#fde047";
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(width - 80, 65, 22, 0, Math.PI * 2);
    ctx.fill();
    // subtract mask to make it a crescent
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#020617";
    ctx.beginPath();
    ctx.arc(width - 89, 61, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // DRAW TWINKLING FANTASY MAGIC STARS
    ctx.fillStyle = "rgba(254, 240, 138, 0.9)";
    const starCoords = [
      { x: 40, y: 50, s: 2 },
      { x: 130, y: 90, s: 1.5 },
      { x: 260, y: 40, s: 3 },
      { x: 380, y: 110, s: 2 },
      { x: 490, y: 60, s: 2.5 },
      { x: 620, y: 100, s: 1.5 },
      { x: 730, y: 45, s: 3 },
      { x: 860, y: 85, s: 2 }
    ];
    starCoords.forEach((st, idx) => {
      const xCoord = (st.x) % width;
      const twinkle = Math.sin(countTimeRef.current * 0.05 + idx) * 0.45 + 0.55;
      ctx.save();
      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc(xCoord, st.y, st.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // DRAW SILHOUETTED MYSTIQUE WAVY BACKGROUND FOREST MOUNTAINS (Parallax depth)
    ctx.fillStyle = "rgba(6, 78, 59, 0.28)"; // furthest layer
    ctx.beginPath();
    ctx.moveTo(0, height - 90);
    for (let x = 0; x <= width + 80; x += 40) {
      const hY = (height - 90) - 25 - Math.sin(x * 0.006 + countTimeRef.current * 0.008) * 12 - Math.cos(x * 0.003) * 6;
      ctx.lineTo(x, hY);
    }
    ctx.lineTo(width, height - 90);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(4, 120, 87, 0.16)"; // closer layer
    ctx.beginPath();
    ctx.moveTo(0, height - 90);
    for (let x = 0; x <= width + 80; x += 55) {
      const hY = (height - 90) - 15 - Math.cos(x * 0.008 - countTimeRef.current * 0.005) * 8 - Math.sin(x * 0.002) * 4;
      ctx.lineTo(x, hY);
    }
    ctx.lineTo(width, height - 90);
    ctx.closePath();
    ctx.fill();

    const floorY = height - 90;

    // Render Traps under floor (lava bubbling, deep ocean water pits)
    trapsRef.current.forEach((tr) => {
      if (tr.type === "lava") {
        ctx.fillStyle = "#ef4444"; // fire red
        ctx.fillRect(tr.x, floorY + 1, tr.width, 95);

        // draw cute orange bubbles bubbling in lava
        ctx.fillStyle = "#f97316";
        for (let i = 0; i < tr.width; i += 22) {
          const bubbleHeight = (Math.sin(countTimeRef.current * 0.08 + i) * 6) + 20;
          ctx.beginPath();
          ctx.arc(tr.x + i + 8, floorY + bubbleHeight, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tr.type === "water") {
        ctx.fillStyle = "#60a5fa"; // water blue
        ctx.fillRect(tr.x, floorY + 1, tr.width, 95);

        // tiny splash lines on water surface
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < tr.width; i += 15) {
          const waveHeight = (Math.sin(countTimeRef.current * 0.12 + i) * 3) + 8;
          ctx.lineTo(tr.x + i, floorY + waveHeight);
        }
        ctx.stroke();
      } else if (tr.type === "electric") {
        // glowing high grid poles
        ctx.fillStyle = "#475569";
        ctx.fillRect(tr.x, floorY - 55, 10, 56);
        ctx.fillRect(tr.x + tr.width - 10, floorY - 55, 10, 56);

        // sparkling electric bolt
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(tr.x + 5, floorY - 45);
        if (countTimeRef.current % 4 < 2) {
          ctx.lineTo(tr.x + tr.width / 2, floorY - 60);
          ctx.lineTo(tr.x + tr.width - 5, floorY - 45);
        } else {
          ctx.lineTo(tr.x + tr.width / 2, floorY - 30);
          ctx.lineTo(tr.x + tr.width - 5, floorY - 45);
        }
        ctx.stroke();
      }
    });

    // Draw Ground (Soil / Crayon Grass path in Fantasy style)
    const bgGrd = ctx.createLinearGradient(0, floorY, 0, height);
    bgGrd.addColorStop(0, "#059669"); // beautiful dark magical green emerald grass edge
    bgGrd.addColorStop(0.2, "#047857"); // rich emerald forest jade
    bgGrd.addColorStop(0.25, "#1e293b"); // under soil deep dark charcoal slate
    bgGrd.addColorStop(1, "#0f172a"); // deepest magical navy soil
    ctx.fillStyle = bgGrd;

    // Draw terrain block (skip holes where lava or deep water is!)
    let currentX = 0;
    type TerrainInterval = { start: number; end: number };
    const terrainHoles: TerrainInterval[] = [];

    // Map overlaps for ground cuts
    trapsRef.current.forEach((trap) => {
      if (trap.type === "lava" || trap.type === "water") {
        terrainHoles.push({ start: trap.x, end: trap.x + trap.width });
      }
    });

    // Sort holes from left to right
    terrainHoles.sort((a, b) => a.start - b.start);

    // Draw ground segments sequentially
    ctx.beginPath();
    currentX = 0;
    terrainHoles.forEach((hole) => {
      if (hole.start > currentX) {
        ctx.fillRect(currentX, floorY, hole.start - currentX, height - floorY);
      }
      currentX = hole.end;
    });
    if (currentX < width) {
      ctx.fillRect(currentX, floorY, width - currentX, height - floorY);
    }

    // Drawing cute textured hand-drawn crayon edge lines for the grass top
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    currentX = 0;
    terrainHoles.forEach((hole) => {
      if (hole.start > currentX) {
        // Draw wavy crayon grass texture line
        ctx.moveTo(currentX, floorY);
        for (let j = currentX; j <= hole.start; j += 10) {
          ctx.lineTo(j, floorY - (j % 3 === 0 ? 3 : 1));
        }
      }
      currentX = hole.end;
    });
    if (currentX < width) {
      ctx.moveTo(currentX, floorY);
      for (let j = currentX; j < width; j += 10) {
        ctx.lineTo(j, floorY - (j % 3 === 0 ? 3 : 1));
      }
    }
    ctx.stroke();

    // 8. Draw Fruits
    fruitsRef.current.forEach((fruit) => {
      ctx.save();
      
      // Determine the representation (emoji, background glow, and border color)
      let emoji = "💧";
      let bgGlow = "rgba(16, 185, 129, 0.15)"; // default green glow
      let borderCol = "#10b981";
      
      if (fruit.id.startsWith("f_")) {
        if (fruit.type === "white") {
          emoji = "💧";
          bgGlow = "rgba(14, 165, 233, 0.18)"; // water blue glow
          borderCol = "#0ea5e9";
        } else if (fruit.type === "red") {
          emoji = "🍊";
          bgGlow = "rgba(249, 115, 22, 0.18)"; // orange red glow
          borderCol = "#f97316";
        } else if (fruit.type === "blue") {
          emoji = "🔮";
          bgGlow = "rgba(168, 85, 247, 0.18)"; // crystal violet glow
          borderCol = "#a855f7";
        }
      } else {
        // Special souvenirs
        const itemId = fruit.id;
        if (itemId === "item_lens") {
          emoji = "⚙️";
          bgGlow = "rgba(100, 116, 139, 0.25)"; // iron metal slate glow
          borderCol = "#64748b";
        } else if (itemId === "item_button") {
          emoji = "❇️";
          bgGlow = "rgba(239, 68, 68, 0.25)"; // ruby red glow
          borderCol = "#ef4444";
        } else if (itemId === "item_clip") {
          emoji = "🔑";
          bgGlow = "rgba(234, 179, 8, 0.25)"; // gold yellow glow
          borderCol = "#eab308";
        } else if (itemId === "item_die") {
          emoji = "🎲";
          bgGlow = "rgba(220, 38, 38, 0.25)"; // deep red cube glow
          borderCol = "#dc2626";
        } else if (itemId === "item_stamp") {
          emoji = "🔖";
          bgGlow = "rgba(236, 72, 153, 0.25)"; // pink stamp glow
          borderCol = "#ec4899";
        }
      }

      // Draw beautiful magic aura / bubble around the item so players see it clearly
      ctx.shadowBlur = 10;
      ctx.shadowColor = borderCol;
      
      ctx.fillStyle = bgGlow;
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      const r = fruit.radius + (fruit.id.startsWith("f_") ? 3 : 5);
      ctx.arc(fruit.x, fruit.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw a subtle dashed secondary rotating celestial border for souvenir rarities
      if (!fruit.id.startsWith("f_")) {
        ctx.save();
        ctx.strokeStyle = "#fbbf24"; // gold ring
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(fruit.x, fruit.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Reset shadows for emoji text rendering inside
      ctx.shadowBlur = 0;
      
      // Draw the beautiful matching high-contrast emoji in center
      // Emojis on canvas look stunning and perfectly recognizable
      const fontSize = fruit.id.startsWith("f_") ? 18 : 22;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, fruit.x, fruit.y + (fruit.id.startsWith("f_") ? 0.5 : 1));

      // Floating sparkling text tags above for souvenir
      if (!fruit.id.startsWith("f_") && countTimeRef.current % 15 < 7) {
        ctx.fillStyle = "#d97706";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText("RARE!", fruit.x, fruit.y - r - 8);
      }
      ctx.restore();
    });

    // 9. Draw Buff Items
    buffsRef.current.forEach((buff) => {
      ctx.save();
      ctx.lineWidth = 2.5;

      if (buff.type === "heart") {
        ctx.fillStyle = "#ec4899"; // candy pink
        ctx.strokeStyle = "#9d174d";
        ctx.beginPath();
        // cute heart vector shape
        const cx = buff.x;
        const cy = buff.y;
        ctx.moveTo(cx, cy + 6);
        ctx.bezierCurveTo(cx - 10, cy - 8, cx - 18, cy + 2, cx, cy + 14);
        ctx.bezierCurveTo(cx + 18, cy + 2, cx + 10, cy - 8, cx, cy + 6);
        ctx.fill();
        ctx.stroke();
      } else if (buff.type === "multiplier") {
        // glowing double star
        ctx.fillStyle = "#eab308";
        ctx.strokeStyle = "#a16207";
        ctx.beginPath();
        ctx.arc(buff.x, buff.y, buff.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("x2", buff.x, buff.y + 0.5);
      } else if (buff.type === "clock") {
        // Cute sand glass shape
        ctx.fillStyle = "#06b6d4";
        ctx.strokeStyle = "#0891b2";
        ctx.beginPath();
        ctx.moveTo(buff.x - 7, buff.y - 12);
        ctx.lineTo(buff.x + 7, buff.y - 12);
        ctx.lineTo(buff.x - 5, buff.y + 12);
        ctx.lineTo(buff.x + 5, buff.y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });

    // 10. Draw Obstacles (Rocks, Barricades, Mushrooms)
    obstaclesRef.current.forEach((obs) => {
      if (obs.destroyed) return;
      ctx.save();
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;

      if (obs.type === "rock") {
        // Big rough gray rock boulder
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.moveTo(obs.x, floorY);
        ctx.lineTo(obs.x + 8, floorY - obs.height + 6);
        ctx.lineTo(obs.x + obs.width - 5, floorY - obs.height + 2);
        ctx.lineTo(obs.x + obs.width, floorY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crack details
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(obs.x + 8, floorY - obs.height + 14);
        ctx.lineTo(obs.x + 22, floorY - 10);
        ctx.stroke();
      } else if (obs.type === "barricade") {
        // Wooden fence construction barricade
        ctx.fillStyle = "#f97316"; // bright safety orange stripe
        ctx.fillRect(obs.x, floorY - obs.height + 15, obs.width, 14);

        // white stripes
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(obs.x + 7, floorY - obs.height + 15, 8, 14);
        ctx.fillRect(obs.x + 23, floorY - obs.height + 15, 8, 14);

        // draw legs
        ctx.fillStyle = "#334155";
        ctx.fillRect(obs.x + 4, floorY - obs.height + 29, 6, obs.height - 29);
        ctx.fillRect(obs.x + obs.width - 10, floorY - obs.height + 29, 6, obs.height - 29);

        // stroke board
        ctx.strokeRect(obs.x, floorY - obs.height + 15, obs.width, 14);
      } else if (obs.type === "mushroom") {
        // Red cap mushrooms
        // Stem
        ctx.fillStyle = "#f1f5f9";
        ctx.beginPath();
        ctx.ellipse(obs.x + obs.width / 2, floorY - 14, 8, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cap
        ctx.fillStyle = "#ec4899"; // pink violet cap
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2, floorY - obs.height + 12, obs.width / 2, Math.PI, 0);
        ctx.lineTo(obs.x + obs.width, floorY - obs.height + 18);
        ctx.lineTo(obs.x, floorY - obs.height + 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Little white spots on cap
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2 - 6, floorY - obs.height + 14, 3, 0, Math.PI * 2);
        ctx.arc(obs.x + obs.width / 2 + 5, floorY - obs.height + 12, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 11. Render Player character - PIKMIN (Crayon procedural vectors)
    const p = pikminRef.current;
    ctx.save();

    // Shake visual effect if player is hurt or dizzy
    if (p.isHurt || p.isDizzy) {
      ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3);
    }

    // White Pikmin active Skill B: Poison aura
    if (p.isPoisoning) {
      const grad = ctx.createRadialGradient(
        p.x + p.width / 2,
        p.y + p.height / 2,
        15,
        p.x + p.width / 2,
        p.y + p.height / 2,
        65
      );
      grad.addColorStop(0, "rgba(220, 252, 231, 0.65)");
      grad.addColorStop(1, "rgba(240, 253, 244, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, 65, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rock Pikmin active Skill B: Rotation roll transform
    if (p.isRolling) {
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
      ctx.rotate(p.spinAngle);
      // Draw polygonal dark stone
      ctx.fillStyle = "#52525b";
      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      // Draw a rotating heptagonal rock boulder body!
      for (let s = 0; s < 7; s++) {
        const theta = (s * Math.PI * 2) / 7;
        const rx = Math.sin(theta) * 23;
        const ry = Math.cos(theta) * 23;
        if (s === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Stone cracks
      ctx.strokeStyle = "#a1a1aa";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-15, -6);
      ctx.lineTo(8, 12);
      ctx.stroke();
    } else {
      // Standard drawing of Element Spirits based on colors
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

      const pikminColorVal = bodyColorTable[character.id as keyof typeof bodyColorTable] || "#ff7300";
      const pikminStrokeVal = strokeColorTable[character.id as keyof typeof strokeColorTable] || "#7c2d12";

      // Apply JELLY animation / floating rhythm & GLOW neon aura filter
      ctx.save();
      const scaleX = 1 + Math.sin(countTimeRef.current * 0.12) * 0.04;
      const scaleY = 1 + Math.cos(countTimeRef.current * 0.12) * 0.04;
      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;
      ctx.translate(cx, cy);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-cx, -cy);

      // Neon glowing halo shading
      ctx.shadowBlur = 16;
      ctx.shadowColor = pikminColorVal;

      ctx.fillStyle = pikminColorVal;
      ctx.strokeStyle = pikminStrokeVal;
      ctx.lineWidth = 3;

      // Bobbing height for running legs effect
      const legsBobY = p.isOnGround ? Math.sin(countTimeRef.current * 0.35) * 4 : 0;

      // Draw Main extremely round / fire/water droplet body (胖嘟嘟圓潤造型, based on elemental characteristics)
      ctx.fillStyle = pikminColorVal;
      ctx.strokeStyle = pikminStrokeVal;

      if (character.id === PikminColor.Red) {
        // 1. 火元素：像一團圓圓的火焰，在燃燒的感覺
        ctx.beginPath();
        const rx = p.width / 2;
        const ry = p.height / 2;
        const fireTime = countTimeRef.current * 0.15;
        const swayY1 = Math.sin(fireTime) * 3;
        const swayY2 = Math.cos(fireTime) * 3;
        const swayY3 = Math.sin(fireTime + 2) * 3;

        ctx.moveTo(cx, cy + ry);
        ctx.bezierCurveTo(cx + rx + 2, cy + ry, cx + rx, cy, cx + rx - 2, cy - ry / 3);
        // flame lick 1
        ctx.quadraticCurveTo(cx + rx / 2 + 3, cy - ry + swayY1, cx + rx / 3, cy - ry / 2);
        // flame lick 2 (highest middle)
        ctx.quadraticCurveTo(cx, cy - ry - 7 + swayY2, cx - rx / 4, cy - ry / 2);
        // flame lick 3
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

      } else if (character.id === PikminColor.Blue) {
        // 2. 水元素：改水滴狀，有明顯尖尖，上尖下圓的經典水滴
        ctx.beginPath();
        const rx = p.width / 2 + 3;
        const ry = p.height / 2;
        ctx.moveTo(cx, cy - ry - 15); // Very sharp point at top
        // curve down to bottom right, rounding up perfectly
        ctx.bezierCurveTo(cx + rx + 3, cy - ry + 3, cx + rx + 3, cy + ry, cx, cy + ry);
        // curve up to bottom left returning to top sharp point
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

      } else if (character.id === PikminColor.Yellow) {
        // 3. 雷元素：四邊的星形，會有亮亮的光芒，雙腿完美連結身體
        ctx.beginPath();
        const outer = p.height / 2 + 2; // goes down to overlap legs
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

        // Sparkle rays (亮亮的光芒)
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 1.5;
        const angleSpark = countTimeRef.current * 0.1;
        for (let i = 0; i < 4; i++) {
          const angle = angleSpark + (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * (outer + 2), cy + Math.sin(angle) * (outer + 2));
          ctx.lineTo(cx + Math.cos(angle) * (outer + 11), cy + Math.sin(angle) * (outer + 11));
          ctx.stroke();
        }
        ctx.restore();

      } else if (character.id === PikminColor.Purple) {
        // 4. 引力元素：圓形，像木星有一圈光環圍在腰間的感覺
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

      } else if (character.id === PikminColor.White) {
        // 5. 毒元素：中央主體是白色，邊框去除，改用絨毛構成外型，絨毛與腿都是淺灰色
        const d_radius = 12; 
        
        ctx.save();
        ctx.shadowBlur = 32;
        ctx.shadowColor = "rgba(168, 85, 247, 0.45)"; // Larger purple glow aura
        ctx.fillStyle = "rgba(243, 232, 255, 0.25)";
        ctx.beginPath();
        ctx.arc(cx, cy, d_radius + 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Radial light gray fuzzy lines (絨毛，淺灰色)
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#cbd5e1"; // 淺灰色
        ctx.lineWidth = 2;
        const spikesCount = 13;
        for (let i = 0; i < spikesCount; i++) {
          const angle = (i * Math.PI * 2) / spikesCount + (countTimeRef.current * 0.04);
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

        // Central white base circle (smaller) with NO border (邊框去除)
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff"; // 中央主體是白色
        ctx.beginPath();
        ctx.arc(cx, cy, d_radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

      } else if (character.id === PikminColor.Pink) {
        // 6. 蝶元素：兩片翅膀翅膀放大，身體更長（蝴蝶身體感覺）讓身體跟腿完美連結，有觸角
        ctx.beginPath();
        ctx.roundRect(cx - 5.5, cy - 15, 11, 35, 5.5);
        ctx.fill();
        ctx.stroke();

        // Flapping giant double butterfly wings (兩片翅膀放大)
        ctx.save();
        ctx.shadowBlur = 0;
        const waveWing = Math.sin(countTimeRef.current * 0.4) * 0.25;
        ctx.fillStyle = "rgba(244, 114, 182, 0.85)";
        ctx.strokeStyle = "#86198f";
        ctx.lineWidth = 2.5;

        // Big Left wings
        ctx.beginPath();
        ctx.ellipse(cx - 16, cy - 10, 19, 13, -0.4 + waveWing, 0, Math.PI * 2);
        ctx.ellipse(cx - 13, cy + 5, 12, 8, -Math.PI / 6 + waveWing, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Big Right wings
        ctx.beginPath();
        ctx.ellipse(cx + 16, cy - 10, 19, 13, 0.4 - waveWing, 0, Math.PI * 2);
        ctx.ellipse(cx + 13, cy + 5, 12, 8, Math.PI / 6 - waveWing, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Cute antennae (觸角) on top of body (10px length)
        ctx.strokeStyle = pikminStrokeVal;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 2, cy - 12);
        ctx.quadraticCurveTo(cx - 8, cy - 22, cx - 12, cy - 20);
        ctx.moveTo(cx + 2, cy - 12);
        ctx.quadraticCurveTo(cx + 8, cy - 22, cx + 12, cy - 20);
        ctx.stroke();

        // antenna nodes
        ctx.fillStyle = pikminStrokeVal;
        ctx.beginPath();
        ctx.arc(cx - 12, cy - 20, 1.8, 0, Math.PI * 2);
        ctx.arc(cx + 12, cy - 20, 1.8, 0, Math.PI * 2);
        ctx.fill();

      } else if (character.id === PikminColor.Rock) {
        // 7. 岩元素：方塊更大、加厚、高大頁岩，完美覆蓋到雙腿
        const w = 34;
        const h = 37;
        ctx.beginPath();
        ctx.roundRect(cx - w / 2, cy - h / 2 + 3, w, h, 8);
        ctx.fill();
        ctx.stroke();

        // Nested strata slate stripes (頁岩一層一層紋路)
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

      // DRAW INNOCENT GIANT EYE DETAILS (圓滾滾的大眼睛，黑眼珠帶白色高光，呈現無辜、呆萌感，沒有嘴巴)
      ctx.save();
      ctx.shadowBlur = 0; // disable shadow overlay on eye iris

      const eyeY = cy - 2;
      const eyeSpacer = 6.2;
      const eyeRad = 5;

      // Draw left & right white sclera base separately to avoid white-bridge connecting lines
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx - eyeSpacer, eyeY, eyeRad, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx + eyeSpacer, eyeY, eyeRad, 0, Math.PI * 2);
      ctx.fill();

      // Draw large innocent dark pupils (changed to green for White/Poison element!)
      ctx.fillStyle = character.id === PikminColor.White ? "#10b981" : "#22252a";
      ctx.beginPath();
      ctx.arc(cx - eyeSpacer, eyeY, eyeRad - 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx + eyeSpacer, eyeY, eyeRad - 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Specular Highlighting White dots (雙高光點增添呆萌感)
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

      // DRAW RUNNING LEGS
      // Legs are light gray for White (Poison/毒) as explicitly requested, and matching stroke for others
      let legStrokeVal = pikminStrokeVal;
      if (character.id === PikminColor.White) {
        legStrokeVal = "#cbd5e1"; // light gray
      }
      ctx.strokeStyle = legStrokeVal;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";

      // Left leg (starts at p.y + p.height - 10 to ensure body overlap)
      ctx.beginPath();
      ctx.moveTo(p.x + p.width / 3, p.y + p.height - 10);
      ctx.lineTo(p.x + p.width / 3 - 2, p.y + p.height + legsBobY);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(p.x + (p.width * 2) / 3, p.y + p.height - 10);
      ctx.lineTo(p.x + (p.width * 2) / 3 + 2, p.y + p.height - legsBobY);
      ctx.stroke();

      ctx.restore(); // restores the scale/jelly transformation cleanly
    }
    ctx.restore();

    // 12. Draw Dizzy / Stun star tags above head
    if (p.isDizzy) {
      ctx.fillStyle = "#eab308";
      ctx.font = "bold 15px sans-serif";
      const sx = p.x + p.width / 2 + Math.sin(countTimeRef.current * 0.4) * 12;
      const sy = p.y - 18;
      ctx.fillText("★", sx, sy);
    }

    // 13. Draw Particles (dust overlays, item splashes)
    particlesRef.current.forEach((part) => {
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = part.color;
      ctx.globalAlpha = part.alpha;
      ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 14. Draw Crayon Speech Bubbles ("嘿咻！嘿咻！")
    speechesRef.current.forEach((sp) => {
      ctx.save();
      ctx.globalAlpha = sp.alpha;

      // Draw cozy round border with pointer pointing down at Pikmin
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2.5;

      const spWidth = ctx.measureText(sp.text).width + 18;
      const spHeight = 26;
      const sx = sp.x - spWidth / 2;
      const sy = sp.y - spHeight - 8;

      ctx.beginPath();
      ctx.roundRect(sx, sy, spWidth, spHeight, 6);
      ctx.fill();
      ctx.stroke();

      // tiny chat bubble arrow
      ctx.beginPath();
      ctx.moveTo(sp.x - 5, sy + spHeight);
      ctx.lineTo(sp.x, sy + spHeight + 6);
      ctx.lineTo(sp.x + 5, sy + spHeight);
      ctx.fill();
      ctx.stroke();

      // text itself in crayon typography
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sp.text, sp.x, sy + spHeight / 2);

      ctx.restore();
    });

    // Double Star Multiplier Active graphic overlay alert corner!
    if (multiplierTimerRef.current > 0) {
      ctx.fillStyle = "rgba(234, 179, 8, 0.15)";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, width - 8, height - 8);
    }
  };

  // Triggers game completion state
  const handleGameFinished = (reason: "time_up" | "lives_depleted" | "voluntary_exit") => {
    isPausedRef.current = true;
    // End frame loops
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    gameAudio.stopBGM();

    if (reason === "lives_depleted") {
      gameAudio.playGameOver();
    } else {
      gameAudio.playCelebration();
    }

    // compile reward packet
    const finScore = scoreRef.current;
    const finalRewards = {
      white: collectedFruitsRef.current.white,
      red: collectedFruitsRef.current.red,
      blue: collectedFruitsRef.current.blue,
      items: collectedItemsRef.current,
    };

    onGameOver(finScore, finalRewards, reason, activeChar);
  };

  const handlePause = () => {
    isPausedRef.current = true;
    setIsPaused(true);
    gameAudio.stopBGM();
  };

  const handleResume = () => {
    isPausedRef.current = false;
    setIsPaused(false);
    gameAudio.startBGM();
  };

  // If the game stage is not ready (character select state), render a highly accessible, beautiful full-screen choice panel
  if (!isReady) {
    return (
      <div className="flex flex-col w-full h-full min-h-[580px] bg-[#FAF6EE] p-4 sm:p-6 md:p-8 font-sans overflow-y-auto" id="game-playground-container">
        
        {/* Top Camp Return Bar / Message line */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FCFAF6] border-2 border-dashed border-[#8C7E6A] px-4 py-3.5 rounded-2xl text-xs sm:text-sm text-[#5A5A40] mb-5 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏕️</span>
            <p className="font-serif italic font-bold">已進入召喚誓約大廳，帶上契合的元素夥伴，隨時可以安全返回溫馨營地喔！</p>
          </div>
          <button
            type="button"
            onClick={() => onExit()}
            className="w-full sm:w-auto px-4 py-1.5 bg-[#5A5A40] hover:bg-[#40402E] text-white font-serif italic font-bold rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-1 shadow-xs"
          >
            ↩ 回到營地 (Return to Camp)
          </button>
        </div>

        <div className="bg-[#FDFBF7] p-5 sm:p-7 border-4 border-[#8C7E6A] rounded-2xl w-full text-left flex flex-col gap-5.5" id="crayon-ready-selection-panel">
          
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#5A5A40] font-serif italic mb-1 tracking-tight flex items-center gap-2">
              <span>請選擇出戰的元素精靈 (Choose Runner)</span>
              <span className="text-2xs bg-amber-100 text-amber-800 font-sans font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                {mode === "infinite" ? "無限原野" : `奇幻探險第 ${levelId} 關`}
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-[#8C7E6A] leading-relaxed font-serif italic">
              每種屬性的元素精靈都擁有獨一無二的絕配被動屬性與技能～
            </p>
          </div>

          {/* Grid list of Pikmins with custom buttons */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-2.5 font-sans" id="ready-rns-selector">
            {PIKMIN_CHARACTERS.map((char) => {
              const isSelected = char.id === activeChar.id;
              const symbolEmoji = 
                char.id === "Red" ? "🔥" : 
                char.id === "Blue" ? "💧" : 
                char.id === "Yellow" ? "⚡" : 
                char.id === "Purple" ? "🌌" : 
                char.id === "White" ? "🍄" : 
                char.id === "Pink" ? "🦋" : "🪨";

              const labelName = 
                char.id === "Red" ? "火" : 
                char.id === "Blue" ? "水" : 
                char.id === "Yellow" ? "雷" : 
                char.id === "Purple" ? "引力" : 
                char.id === "White" ? "毒" : 
                char.id === "Pink" ? "蝶" : "岩";

              return (
                <button
                   key={char.id}
                   onClick={() => selectCharacter(char)}
                   title={char.name}
                   style={{ contentVisibility: "auto" }}
                   className={`p-2 sm:p-2.5 border-2 shadow-sm rounded-xl flex flex-col items-center justify-center gap-1 transition duration-150 cursor-pointer ${
                     isSelected
                       ? "bg-[#5A5A40] text-white border-[#2D2D1B] scale-105 ring-2 ring-amber-400 font-bold"
                       : "bg-white text-[#5A5A40] border-[#D1C7B7] hover:bg-[#F5F2ED]"
                   }`}
                >
                  <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-black/10 flex items-center justify-center text-lg sm:text-xl shrink-0 ${char.accentColor}`}>
                    {symbolEmoji}
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold font-serif italic tracking-tight text-center">{labelName}</span>
                </button>
              );
            })}
          </div>

          {/* Active Pikmin stats & traits */}
          <div className="bg-white p-4 border-2 border-[#D1C7B7] rounded-xl flex items-start gap-4 transition shadow-xs">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-black/10 flex items-center justify-center text-xl sm:text-2xl shrink-0 ${activeChar.accentColor}`}>
              {activeChar.id === "Red" ? "🔥" : 
               activeChar.id === "Blue" ? "💧" : 
               activeChar.id === "Yellow" ? "⚡" : 
               activeChar.id === "Purple" ? "🌌" : 
               activeChar.id === "White" ? "🍄" : 
               activeChar.id === "Pink" ? "🦋" : "🪨"}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm sm:text-base text-[#5A5A40] font-serif italic leading-tight">
                {activeChar.name} (特技：{activeChar.passiveTrait})
              </h4>
              <p className="text-xs sm:text-sm text-[#5A5A40] opacity-90 mt-1 sm:mt-1.5 leading-relaxed font-medium">
                {activeChar.abilityDescription}
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-[#F5F2ED] p-4 border border-dashed border-[#D1C7B7] rounded-xl text-left font-sans text-stone-700 flex flex-col gap-2 shadow-inner">
            <span className="font-bold text-[#F27D26] font-serif italic text-sm sm:text-base block">🎮 遊戲操作方式指南：</span>
            <div className="opacity-95 space-y-1 text-xs sm:text-sm font-medium">
              <p className="flex items-center gap-1.5"><span className="bg-[#89C09E] text-white font-serif px-1.5 py-0.5 rounded text-[10px] sm:text-xs uppercase font-bold">按鈕 A 鍵</span> 【方向鍵 ↑ / W / 空白鍵】: 向上跳躍 / 飛翔</p>
              <p className="flex items-center gap-1.5"><span className="bg-[#F27D26] text-white font-serif px-1.5 py-0.5 rounded text-[10px] sm:text-xs uppercase font-bold">按鈕 B 鍵</span> 【方向鍵 ↓ / S】: 特殊互動技能 B</p>
              {activeChar.id === PikminColor.Pink && <p className="text-pink-600 font-bold bg-pink-50 p-1.5 rounded border border-pink-100">★ 蝶元素精靈：連續狂點 ↑ 按鈕(或W鍵) 即可在天空中自由拍翅飛翔！</p>}
              {activeChar.id === PikminColor.White && <p className="text-emerald-700 font-bold bg-emerald-50 p-1.5 rounded border border-emerald-100">★ 毒元素精靈：按 ↓ 按鈕(或S鍵) 釋放猛烈毒霧，能直接融化前方的大石頭喔！</p>}
              {activeChar.id === PikminColor.Rock && <p className="text-stone-700 font-bold bg-stone-100 p-1.5 rounded border border-stone-200">★ 晶岩元素精靈：按 ↓ 按鈕(或S鍵) 化身無敵堅硬滾石，直接撞碎前方一切障礙物！</p>}
              {activeChar.id !== PikminColor.Pink && activeChar.id !== PikminColor.White && activeChar.id !== PikminColor.Rock && (
                <p className="opacity-80 text-xs sm:text-sm">★ 適配技巧：不同關卡有著各樣陷阱（如岩漿、積水窪、高壓电網），請選擇擅長對應屬性的元素精靈來奔跑喔！</p>
              )}
            </div>
          </div>

          {/* Actions Button Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-1.5">
            <button
              type="button"
              onClick={() => onExit()}
              className="w-full sm:w-1/4 py-3 bg-[#E8E1D5] hover:bg-[#D1C7B7] text-[#5A5A40] text-xs sm:text-sm font-serif italic font-bold rounded-xl border-2 border-[#8C7E6A] transition cursor-pointer text-center hover:shadow-xs active:translate-y-0.5"
            >
              ↩ 回上一頁
            </button>
            <button
              type="button"
              onClick={startCountdown}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3 bg-[#F27D26] hover:brightness-105 border-b-4 border-orange-700 active:border-b-0 text-white font-serif italic font-bold text-sm sm:text-base rounded-xl transition cursor-pointer shadow-md"
            >
              <Play className="w-4 h-4 fill-current text-white animate-pulse" />
              召喚出戰・開始冒險！
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-stone-50" id="game-playground-container">
      {/* 1. Header Toolbar metrics */}
      <div className="flex items-center justify-between p-3 border-b-2 border-stone-200 bg-stone-100 shadow-xs" id="game-status-panel">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-amber-300 rounded-full shadow-xs">
            <Star className="w-5 h-5 text-amber-500 fill-amber-300 animate-spin-slow" />
            <span className="font-mono font-bold text-amber-800 text-base">{hudScore}</span>
            {hudMultiplierTimer > 0 && (
              <span className="text-xs bg-amber-400 text-white px-1.5 rounded-sm ml-1 font-bold animate-pulse">
                x2
              </span>
            )}
          </div>

          <div className="flex items-center gap-1" id="heart-lives-display">
            {Array.from({ length: maxLivesRef.current }).map((_, idx) => (
              <Shield
                key={idx}
                className={`w-5 h-5 ${
                  idx < hudLives
                    ? "text-rose-500 fill-rose-300 scale-100"
                    : "text-stone-300 fill-transparent scale-90"
                } transition-all duration-300`}
              />
            ))}
          </div>

          <div className="text-xs font-mono text-stone-500 bg-white border-2 border-stone-200 px-2 py-0.5 rounded-md hidden sm:block">
            已前進: <span className="font-bold text-stone-800">{hudDistance}m</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === "level" && (
            <div className="flex items-center gap-1 bg-cyan-100 border-2 border-cyan-300 text-cyan-800 px-3 py-1 rounded-full font-mono font-bold">
              <Clock className="w-4 h-4" />
              <span>{hudTimeLeft}s</span>
            </div>
          )}

          <button
            onClick={handleToggleSound}
            className="p-1.5 rounded-full border-2 border-stone-300 bg-white hover:bg-stone-50 transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-stone-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </button>

          {!isPaused && isReady && countdown === null && (
            <button
              onClick={handlePause}
              className="px-3 py-1 border-2 border-amber-500 bg-amber-400 hover:bg-amber-300 text-stone-800 rounded-md font-bold text-xs"
            >
              暫停離場
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Game Canvas Arena */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-stone-100 border-x-2 border-b-2 border-stone-200 overflow-hidden"
        style={{ minHeight: "360px" }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Countdown Overlays */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-transparent z-10 select-none pointer-events-none">
            <span className="text-8xl font-black text-amber-500 drop-shadow-[0_4px_4px_rgba(251,191,36,0.5)] animate-ping">
              {countdown}
            </span>
          </div>
        )}

        {/* Game Paused Overlay */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs z-[100] animate-fade-in">
            <div className="bg-white p-6 border-4 border-stone-800 rounded-2xl max-w-xs shadow-2xl skew-y-1 relative z-[110]">
              <h3 className="text-xl font-bold text-stone-800 text-center mb-3">冒險暫停中</h3>
              <p className="text-xs text-stone-500 text-center mb-5">
                元素精靈把採集到的晶石抱得緊緊的，正在樹蔭下休息充電呢！
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleResume}
                  className="w-full py-2 bg-amber-400 hover:bg-amber-300 font-bold text-stone-800 border-b-2 border-amber-600 rounded-lg text-sm transition"
                >
                  返回關卡奔跑
                </button>
                <button
                  onClick={() => handleGameFinished("voluntary_exit")}
                  className="w-full py-2 bg-stone-200 hover:bg-stone-300 font-bold text-stone-700 rounded-lg text-sm transition"
                >
                  帶走戰利品結算
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Mobile screen button controllers */}
      <div className="flex items-center justify-center gap-10 p-4 border-t-2 border-[#D1C7B7] bg-[#F5F2ED] shadow-inner select-none" id="mobile-control-overlay">
        <button
          onMouseDown={() => { keysPressedRef.current["Space"] = true; }}
          onMouseUp={() => { keysPressedRef.current["Space"] = false; }}
          onTouchStart={(e) => { e.preventDefault(); keysPressedRef.current["Space"] = true; }}
          onTouchEnd={() => { keysPressedRef.current["Space"] = false; }}
          className="w-24 h-24 bg-[#89C09E] hover:brightness-105 border-b-4 border-[#5A5A40] active:border-b-0 text-white font-bold rounded-full flex flex-col items-center justify-center shadow-md transition active:translate-y-1 cursor-pointer overflow-hidden px-2"
        >
          <span className="text-xs font-serif italic">按鈕 A</span>
          <span className="text-lg font-black leading-none my-1">↑</span>
          <span className="text-[10px] whitespace-nowrap font-medium opacity-90">跳躍 / 飛行</span>
        </button>

        <button
          onMouseDown={() => { keysPressedRef.current["ArrowDown"] = true; }}
          onMouseUp={() => { keysPressedRef.current["ArrowDown"] = false; }}
          onTouchStart={(e) => { e.preventDefault(); keysPressedRef.current["ArrowDown"] = true; }}
          onTouchEnd={() => { keysPressedRef.current["ArrowDown"] = false; }}
          className="w-24 h-24 bg-[#F27D26] hover:brightness-105 border-b-4 border-orange-700 active:border-b-0 text-white font-bold rounded-full flex flex-col items-center justify-center shadow-md transition active:translate-y-1 cursor-pointer overflow-hidden px-2"
        >
          <span className="text-xs font-serif italic">按鈕 B</span>
          <span className="text-lg font-black leading-none my-1">↓</span>
          <span className="text-[10px] whitespace-nowrap font-medium opacity-90">特殊互動</span>
        </button>
      </div>
    </div>
  );
};

export default SpiritRunnerGame;
