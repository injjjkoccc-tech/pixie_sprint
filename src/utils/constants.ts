/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PikminCharacter, PikminColor, CollectionItem, LeaderboardEntry } from "../types";

export const PIKMIN_CHARACTERS: PikminCharacter[] = [
  {
    id: PikminColor.Red,
    name: "火之小肥苗 (火元素)",
    jpName: "カルシファー",
    speed: 7,
    description: "外觀像胖嘟嘟的火苗與柔和水滴的結合體，身上散發出暖洋洋的橘紅光芒。",
    abilityDescription: "【被動】辟火真意：直接無視地面岩漿與火焰陷阱，行走不扣除生命值！",
    passiveTrait: "【被動】火焰豁免 (免受岩漿)",
    activeAbility: "無（免除岩漿損害）",
    accentColor: "bg-radial from-orange-400 to-rose-600 shadow-[0_0_15px_rgba(253,186,116,0.6)] animate-pulse",
    textColor: "text-orange-600",
    borderColor: "border-orange-500",
    introQuote: "噗啾！我是溫暖的火元素。前面滾燙的岩漿交給我就可以啦！",
    victoryQuote: "暖烘烘的，體內源源不絕的能量都要滿溢出來了呢！",
    hurtQuote: "嗚...胖嘟嘟的身體被大石子砸到了，差點要熄滅啦..."
  },
  {
    id: PikminColor.Blue,
    name: "露之小嘟嘟 (水元素)",
    jpName: "ミズドロップ",
    speed: 5,
    description: "極度圓潤的溫柔水滴精靈，擁有半透明的蔚藍漸層，運動時像果凍般彈動。",
    abilityDescription: "【被動】水波護體：在深水池與雨水窪陷阱中暢行無阻，水流是它的最愛避風港！",
    passiveTrait: "【被動】水中遨遊 (免受水洗)",
    activeAbility: "無（免除深潭阻礙）",
    accentColor: "bg-radial from-cyan-400 to-blue-600 shadow-[0_0_15px_rgba(103,232,249,0.6)] animate-pulse",
    textColor: "text-blue-600",
    borderColor: "border-blue-500",
    introQuote: "咕嚕咕嚕～我是清爽的水元素。亮晶晶的水窪是我的遊樂場！",
    victoryQuote: "身上濕答答的，像是剛經歷了一場清新的森林洗禮，好舒服！",
    hurtQuote: "雖然不怕深水，但是雷電傳導過來會讓我渾身麻酥酥的..."
  },
  {
    id: PikminColor.Yellow,
    name: "雷之小火花 (雷元素)",
    jpName: "ライスパーク",
    speed: 7,
    description: "呈亮黃色圓潤三角形，邊角帶有微芒，周圍飄浮著劈啪作響的療癒電花。",
    abilityDescription: "【被動】雷磁引力：防禦星河中一切高壓帶電網陷阱與間歇電磁，觸碰時不受影響！",
    passiveTrait: "【被動】高壓絕緣 (免受電擊)",
    activeAbility: "無（防禦高壓電網）",
    accentColor: "bg-radial from-yellow-300 to-amber-500 shadow-[0_0_15px_rgba(254,240,138,0.6)] animate-pulse",
    textColor: "text-amber-600",
    borderColor: "border-yellow-450",
    introQuote: "耶咿！我是電力滿滿的雷元素。閃電劈啦啪啦的真漂亮呀！",
    victoryQuote: "體內儲蓄的微光電能，要把整個夜空都點亮啦！",
    hurtQuote: "水池太深的話，我的電花會瞬間消散，咕嚕咕嚕沉下去的..."
  },
  {
    id: PikminColor.Purple,
    name: "重力小星團 (引力元素)",
    jpName: "グラビティ",
    speed: 6,
    description: "散發出高貴深邃的星流紫光，它的重力環能稍微扭曲身邊的空間，步伐沉穩。",
    abilityDescription: "【被動】引力增幅：擁有強大的重力黑洞氣場，無限關卡冒險中獲得的所有積分固定 1.1x 倍加成！",
    passiveTrait: "【被動】引力磁場 (得分1.1x加成)",
    activeAbility: "無（自動得分倍乘）",
    accentColor: "bg-radial from-purple-500 to-indigo-700 shadow-[0_0_15px_rgba(196,181,253,0.5)] animate-pulse",
    textColor: "text-purple-700",
    borderColor: "border-purple-600",
    introQuote: "齁齁！我是引力元素。雖然跑得慢，但能用星河引力吸收最多分數！",
    victoryQuote: "這點古物的重量，在我指尖的微型引力場裡根本像羽毛一樣輕！",
    hurtQuote: "唔...雖然是引力肉盾，被火焰燒到的話重力環還是會不穩定的呢。"
  },
  {
    id: PikminColor.White,
    name: "微光毒孢子 (毒元素)",
    jpName: "コドクキノ",
    speed: 8,
    description: "嬌小雪白的微光精靈，泛著粉白色的神祕幽光，蘊含溶解一切阻礙的純真能量。",
    abilityDescription: "【特技】淨化毒霧：在狂奔中按下【B按鈕（S鍵或方向鍵↓）】釋放孢子毒液霧氣，直接融化排除前方的枯木與岩石障礙物！",
    passiveTrait: "【特技】孢子毒霧 (融解枯石)",
    activeAbility: "按B噴射融解毒霧",
    accentColor: "bg-radial from-slate-50 to-neutral-300 shadow-[0_0_15px_rgba(255,255,255,0.7)] animate-pulse",
    textColor: "text-slate-600",
    borderColor: "border-slate-400",
    introQuote: "啾～我是毒元素。前方的岩石藤蔓，我可以噴一點毒素幫大家融化喔！",
    victoryQuote: "跑得像風一樣快！即使是在迷霧重重的林間，也沒人抓得住我～",
    hurtQuote: "毒元素雖然帶有溶解能量，但我的身子其實像泡泡一樣脆弱呢..."
  },
  {
    id: PikminColor.Pink,
    name: "風之仙蝶精 (蝶元素)",
    jpName: "ゼピュロス",
    speed: 10,
    description: "擁有透明如蟬翼的櫻粉色薄翅，能抵抗重力在森林微光中隨風起伏、飄在空中。",
    abilityDescription: "【特技】羽風滑翔：在狂奔中按下【A按鈕（W鍵或方向鍵↑或空白鍵）】拍動雙翼。連續狂點按鈕即可逆引力飛向天空中自由拍翅飛翔，不與地表陷阱接觸！",
    passiveTrait: "【特技】羽翼滑翔 (拍翅浮空)",
    activeAbility: "按A拍翅騰空",
    accentColor: "bg-radial from-pink-300 to-rose-500 shadow-[0_0_15px_rgba(244,114,182,0.6)] animate-pulse",
    textColor: "text-pink-600",
    borderColor: "border-pink-400",
    introQuote: "咘嚕嚕～我是蝶元素。地上的泥濘跟岩漿？我只要飛過去就好啦！",
    victoryQuote: "在蔚藍而溫慢的星光高空中飛來飛去，真的太自由、太享受啦～",
    hurtQuote: "在空中飛得太開心，不小心撞在堅硬的崖壁上了，嗚嗚..."
  },
  {
    id: PikminColor.Rock,
    name: "地岩護衛者 (岩元素)",
    jpName: "タイタニア",
    speed: 5,
    description: "由晶瑩的多面體黑曜石構成，散發出淡淡的灰白微光。堅硬無比，能在翻滾時破壞萬物。",
    abilityDescription: "【特技】晶石滾碎：在狂奔中按下【B按鈕（S鍵或方向鍵↓）】化身無敵滾向磐石，以極高撞擊力碎岩，直接撞碎前方一切木箱碎石與大障礙物！",
    passiveTrait: "【特技】晶石滾碎 (無敵衝鋒)",
    activeAbility: "按B滾動撞碎林莽",
    accentColor: "bg-radial from-zinc-500 to-neutral-700 shadow-[0_0_12px_rgba(120,113,108,0.5)] animate-pulse",
    textColor: "text-zinc-700",
    borderColor: "border-neutral-600",
    introQuote: "轟隆隆！我是岩元素。沒有任何雜木頑石能阻擋我狂暴滾動！",
    victoryQuote: "滾啊滾、撞啊撞，把擋路的東西全都撞開，感覺真痛快啊！",
    hurtQuote: "雖然我不怕撞擊，但高壓電或者冰窟窿還是會讓我有點頭疼的。"
  }
];

export const INITIAL_COLLECTIONS: CollectionItem[] = [
  // Fruits / Minerals
  {
    id: "fruit_white",
    name: "晨露綠晶瑩",
    type: "fruit",
    description: "清晨綠草上凝聚的第一滴晶瑩露水，散發出微弱的翡翠綠光，味道清甜沁神。",
    image: "💧",
    count: 0,
    unlockedLevel: 0
  },
  {
    id: "fruit_red",
    name: "烈焰暖果核",
    type: "fruit",
    description: "蘊含著溫暖心火力量的神奇果實，外殼澄紅，是所有愛暖和的元素精靈的最愛之星！",
    image: "🍊",
    count: 0,
    unlockedLevel: 0
  },
  {
    id: "fruit_blue",
    name: "星海潮汐晶",
    type: "fruit",
    description: "在幽暗湖泊深處吸收無盡月色凝結而成的幽藍寶石。能提供巨額的晶體能量與魔力補給。",
    image: "🔮",
    count: 0,
    unlockedLevel: 0
  },
  // Unique souvenir items
  {
    id: "item_lens",
    name: "失落的星軌儀齒輪",
    type: "fruit",
    description: "古代占星學家遺落在林地間的黃銅精緻齒輪。精靈們常把它當作神秘的旋轉舞台，看日光折射璀璨的亮線。",
    image: "⚙️",
    count: 0,
    unlockedLevel: 0
  },
  {
    id: "item_button",
    name: "精靈王的紅寶石星章",
    type: "fruit",
    description: "雕琢有細膩四星紋理的紅寶石星章，質地溫潤。常有小精靈把它頂在頭頂當成小雨傘或是睡覺時的安心軟枕。",
    image: "❇️",
    count: 0,
    unlockedLevel: 0
  },
  {
    id: "item_clip",
    name: "命運的秘銀雙環鑰匙",
    type: "fruit",
    description: "傳說中能開啟古老精靈庭院大門的秘銀鑰匙之一。精靈常將其豎立在空地上，當作攀爬和曬乾花草的優雅滑梯。",
    image: "🔑",
    count: 0,
    unlockedLevel: 0
  },
  {
    id: "item_die",
    name: "古代預言占卜幻立方",
    type: "fruit",
    description: "表面鐫刻著泛紅星點的神奧方石，會隨精靈的觸碰而翻轉。精靈們聚會時常圍繞它，在月下跳起星能祈願舞。",
    image: "🎲",
    count: 0,
    unlockedLevel: 0
  },
  {
    id: "item_stamp",
    name: "春櫻紀念古森明信片",
    type: "fruit",
    description: "承載著旅人思念的紙卡，邊緣長滿柔軟苔蘚。小精靈會一齊拉著明信片的四角把它當成可以翺翔藍天的飛天魔毯。",
    image: "🔖",
    count: 0,
    unlockedLevel: 0
  }
];

export const COLLECTION_LORE: { [key: string]: string[] } = {
  fruit_white: [
    "清晨綠草上凝聚的第一滴晶瑩露水，散發出微弱的翡翠綠光，能給辛勤奔跑的小精靈提供甜美靈氣。",
    "【學者研究】研究顯示此露水含靈能活性極高，能給奔跑的元素精靈提供微小但關鍵的體力回復與精神撫慰。",
    "【極秘調研紀錄】將其引入微光山泉、混合粉晶花粉，可以釀造出精靈王宴會上最愛的水晶瓊漿！"
  ],
  fruit_red: [
    "蘊含溫暖心火力量的神奇紅色果實，是火之小肥苗與其他小精靈一致最愛的水果之星，吃下去可以暖和心靈。",
    "【搬運記錄】它圓溜溜的，在斜坡上容易骨碌骨碌往下滾，火精靈最喜歡用胖嘟嘟的小腦袋頂著它快樂快跑。",
    "【能量學報告】果實含有精純的熱輻射因子，這據說是火元素精靈能無視高溫火焰在烈火中穿梭的核心來源噢。"
  ],
  fruit_blue: [
    "吸收無盡月色凝結而成的幽藍寶石。能提供巨額的熱量與晶能，在漆黑的森林晚上特別耀眼奪目。",
    "【自然筆記】在林地深潭邊緣生長。水、蝶等元素精靈常在深夜聚在一起，利用此潮汐晶在清冷水面上玩捉迷藏。",
    "【隊長旅行日誌】味道有著神秘的野薄荷與藍莓香氣！稍微榨汁，就是一頓讓人神清氣爽的頂級星光氣泡魔力飲！"
  ],
  item_lens: [
    "古代占星學家遺落在林間空地上的純黃銅多齒齒輪，精雕細琢透著神祕的機械工藝美感。",
    "由於對精靈而言極其沉重，往往需要多個小夥伴一起合抱。精靈常一邊轉動它，一邊看折射出來的漫天七彩陽光。",
    "【精靈生態】將此精巧神聖的古齒輪搬回營地會吸引周遭神祕的星光精靈在此憩息，帶有不可思議的生活靈氣活性。"
  ],
  item_button: [
    "雕有細緻紋理的晶瑩紅寶石徽章。工藝完美無比，在微光環境中會自發散出迷人的暖融光澤。",
    "小精靈們常搬來好幾個，排成一列坐在上面滑草嬉鬧，這是他們在忙碌收集工作之餘最愛的游樂設施了。",
    "【日誌】星章有各種元素色調。若集齊紅色、藍色以及黃色星章，小精靈們甚至會一邊唱歌一邊開心地跳起精靈拍手舞。"
  ],
  item_clip: [
    "一柄由秘銀合金打造、飾有圓形雙環的古老秘銀雙環鑰匙，抗磨損性能極高且能反射月夜銀光。",
    "精靈們常拿它當作營地的堅固立體支架、或用來繫掛採摘下的乾香草葉片，屬於極為稀有奢華的魔法建材。",
    "【小知識】孢子精靈會利用身體釋放的微量融解孢子，認真把鑰匙表面氧化發黑的局部擦拭乾淨，至耀眼如新才停下手來。"
  ],
  item_die: [
    "一尊奇妙的月光石質占卜幻立方，上面烙印有名為「創世軌跡」的紅色凹點神奧符号。",
    "精靈將它高高頂起一扔，如果投擲出「1」點，他們就會雀躍不已、在林間飛馳，認為這天受到了古老森林的眷顧。",
    "【機密檔案】它的縫隙裡往往會散發出淡淡的、香甜無比的魔力蜜酒香，饞得雷電精靈經常忍不住上去舔舐咬。 "
  ],
  item_stamp: [
    "一片極富彈性與韌性的魔法植物卡紙，上頭彩繪有一朵永不凋謝的璀璨櫻色精靈花，堪稱大自然的奇蹟造物。",
    "精靈會牽起卡片四角當作滑翔翼，借著晨曦微風在树林葉冠間瀟灑滑行，並發出「呼呼～」的快樂呼哨聲。",
    "【隊長感言】這卡卡讓我想起了幼時媽媽繪本上的精靈童話。或許小精靈們也是被這張卡上蘊含的思念牽引，才在林間不知疲倦地收集希望吧？"
  ]
};

// High-scores initial list for online feel but persisted locally
export const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [];

// Cute Postcards CG list for achievements inside levels
export interface PostcardAchievement {
  id: string;
  title: string;
  scoreRequired: number;
  description: string;
  crayolArtPrompt: string;
  imagePath: string; // or dynamic renderer
  lore: string;
}

export const POSTCARDS: PostcardAchievement[] = [
  {
    id: "pc_1",
    title: "森之庭院的篝火聚會",
    scoreRequired: 500,
    description: "在無限關卡或一般關卡中首次突破 500 分解鎖",
    crayolArtPrompt: "A cute hand-drawn Ghibli crayon drawing of small glowing chubby orange fire and lime-green grass spirits sitting under a giant wild clover leaf on a warm sunset, cozy concept",
    imagePath: "/src/assets/images/element_spirit_cover_1781234981512.jpg",
    lore: "今天林子裡起霜了，我們和火精靈、雷精靈一起縮在巨大的魔法三葉草羽翼下。火之小肥苗一邊揉著肚子眨眼，一邊釋放溫暖的橘色微光烤香甜晨露，這大約就是奇幻世界最溫馨療癒的黃昏。"
  },
  {
    id: "pc_2",
    title: "湛藍深淵的水晶歌謠",
    scoreRequired: 1500,
    description: "累積獲得積分達到 1500 分解鎖",
    crayolArtPrompt: "A cute Japanese hand-drawn watercolor crayon of a very round chubby blue water spirit carrying shiny glowing crystal gems underwater, glowing aura",
    imagePath: "⭐", 
    lore: "溪流深處竟然有些發光的螢光水菇和星海潮汐魔晶。露之小嘟嘟在水中宛如一顆天生的果凍，歡快地踏著水珠悠遊。我也好想學會泡泡魔法，和他們一起在幽藍水底下咕嚕嚕吐氣泡呢。"
  },
  {
    id: "pc_3",
    title: "暴風星空下的小雷暴",
    scoreRequired: 3000,
    description: "在單次狂奔中超越 3000 分解鎖",
    crayolArtPrompt: "A cozy colored pencil style postcard illustration of a chubby round yellow electric spirit playfully catching lightning sparks and glowing in a deep blue night forest",
    imagePath: "⚡",
    lore: "當夜空劈下金燦燦的閃電時，我都急得閉上眼睛。沒想到，雷電小火花們竟然排成一整列拉著胖胖小手，像是一長串夢幻的金色小風燈！原來，它們是黑夜裡最美麗的發電藝術家。"
  }
];
