/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum PikminColor {
  Red = "Red",
  Blue = "Blue",
  Yellow = "Yellow",
  Purple = "Purple",
  White = "White",
  Pink = "Pink",
  Rock = "Rock"
}

export interface PikminCharacter {
  id: PikminColor;
  name: string;
  jpName: string;
  speed: number; // 跑速 1-10
  description: string;
  abilityDescription: string;
  passiveTrait: string;
  activeAbility: string;
  accentColor: string; // Tailwind class like bg-red-400
  textColor: string;
  borderColor: string;
  introQuote: string;
  victoryQuote: string;
  hurtQuote: string;
}

export interface FruitItem {
  id: string;
  type: "white" | "red" | "blue";
  name: string;
  points: number;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
}

export interface BuffItem {
  id: string;
  type: "heart" | "multiplier" | "clock"; // clock is for level mode only
  name: string;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  value: number; // heart: +1 life, multiplier: x2, clock: +10s
}

export interface Obstacle {
  id: string;
  type: "rock" | "barricade" | "mushroom";
  name: string;
  x: number;
  width: number;
  height: number;
  destructible: boolean;
  destroyed: boolean;
}

export interface Trap {
  id: string;
  type: "lava" | "water" | "electric";
  name: string;
  x: number;
  width: number;
  height: number;
  damage: number;
}

export interface CollectionItem {
  id: string;
  name: string;
  type: "character" | "fruit";
  description: string;
  image: string; // placeholder or description
  count: number;
  unlockedLevel: number; // levels of description unlocked by repeat counts
}

export interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  pikmin_type: PikminColor;
  date: string;
  play_time: number; // in seconds
  star_rating: number;
  timestamp: number; // for sorting tiebreakers (older gets priority as per "最先達成的為主")
}

export interface SystemSettings {
  playerName: string;
  soundEnabled: boolean;
  bgmEnabled: boolean;
  difficulty: "easy" | "normal" | "hard";
}

export interface GamePreferences {
  unlockedCharacters: PikminColor[];
  collections: { [key: string]: number }; // ID -> count
  levelStars: { [key: string]: number }; // levelId -> stars (1-3)
  highScore: number;
}
