import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Hjson from "hjson";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const modRoot = path.resolve(
  process.env.THIRTEEN_ASTRAL_COURTS_SOURCE
    || process.argv[2]
    || path.join(siteRoot, "..", "ThirteenAstralCourts")
);
const dataDir = path.join(siteRoot, "src", "data");
const publicDir = path.join(siteRoot, "public", "assets");
const contentAssetDir = path.join(publicDir, "content");
const brandDir = path.join(publicDir, "brand");

const requiredFiles = [
  "build.txt",
  "description.txt",
  path.join("Localization", "zh-Hans_Mods.ThirteenAstralCourts.hjson"),
  path.join("Localization", "en-US_Mods.ThirteenAstralCourts.hjson")
];

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(modRoot, relativePath))) {
    throw new Error(`模组源码目录无效，缺少 ${relativePath}: ${modRoot}`);
  }
}

for (const target of [dataDir, contentAssetDir, brandDir]) {
  fs.mkdirSync(target, { recursive: true });
}

const resolvedContentAssetDir = path.resolve(contentAssetDir);
if (!resolvedContentAssetDir.startsWith(path.resolve(siteRoot) + path.sep)) {
  throw new Error("拒绝清理站点目录之外的资源路径");
}
fs.rmSync(resolvedContentAssetDir, { recursive: true, force: true });
fs.mkdirSync(resolvedContentAssetDir, { recursive: true });

const readText = (relativePath) => fs.readFileSync(path.join(modRoot, relativePath), "utf8");
const zh = Hjson.parse(readText(path.join("Localization", "zh-Hans_Mods.ThirteenAstralCourts.hjson")));
const en = Hjson.parse(readText(path.join("Localization", "en-US_Mods.ThirteenAstralCourts.hjson")));
const zhConfigs = Hjson.parse(readText(path.join("Localization", "zh-Hans_Mods.ThirteenAstralCourts.Configs.hjson")));
const enConfigs = Hjson.parse(readText(path.join("Localization", "en-US_Mods.ThirteenAstralCourts.Configs.hjson")));

const buildMeta = Object.fromEntries(
  readText("build.txt")
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1].trim(), match[2].trim()])
);

const TYPE_MAP = new Map([
  ["ModItem", "item"],
  ["ModNPC", "npc"],
  ["ModProjectile", "projectile"],
  ["ModBuff", "buff"],
  ["ModTile", "tile"],
  ["ModBannerTile", "tile"],
  ["ModWall", "wall"],
  ["ModBiome", "biome"],
  ["ModConfig", "config"]
]);

const KIND_LOCALIZATION_GROUP = {
  item: "Items",
  npc: "NPCs",
  projectile: "Projectiles",
  buff: "Buffs",
  tile: "Tiles",
  wall: "Walls",
  biome: "Biomes",
  config: "Configs"
};

const BOSS_STAGE_META = {
  StarfaringLarvaBoss: {
    key: "world-evil",
    zh: "世界邪恶 Boss 前后",
    en: "Around the world-evil boss",
    order: 2.6,
    accent: "#d98b53",
    shortZh: "寄生与孵化",
    shortEn: "Parasites and hatching"
  },
  WatcherBoss: {
    key: "pre-hardmode-late",
    zh: "困难模式前后期",
    en: "Late Pre-Hardmode",
    order: 5.1,
    accent: "#63b8ff",
    shortZh: "观测与星轨",
    shortEn: "Observation and orbits"
  },
  OtherworldlyLoneStarBoss: {
    key: "early-hardmode",
    zh: "困难模式初期",
    en: "Early Hardmode",
    order: 8.5,
    accent: "#c88cff",
    shortZh: "孤星与引力",
    shortEn: "A lone star and gravity"
  },
  AstralCruiserHX301Boss: {
    key: "post-plantera",
    zh: "世纪之花后",
    en: "Post-Plantera",
    order: 12.5,
    accent: "#61e0ce",
    shortZh: "测绘与舰炮",
    shortEn: "Surveying and artillery"
  },
  WorldBoundaryBoss: {
    key: "post-moon-lord",
    zh: "月亮领主后",
    en: "Post-Moon Lord",
    order: 18.1,
    accent: "#79a7ff",
    shortZh: "破界与界孔",
    shortEn: "The breach and apertures"
  },
  FirstCourtLordZhaohuiBoss: {
    key: "post-boundary",
    zh: "击破世界界壁后",
    en: "After the World Boundary",
    order: 19.1,
    accent: "#f3c96b",
    shortZh: "垂象与审视",
    shortEn: "Omens and judgment"
  },
  ThirdCourtLordLiuyaoBoss: {
    key: "post-first-court",
    zh: "击败昭回后",
    en: "After Zhaohui",
    order: 19.7,
    accent: "#ff8ca8",
    shortZh: "岁华与回溯",
    shortEn: "Ages and reversal"
  }
};

const KNOWN_ITEM_STAGES = {
  StarveilRecurve: ["post-eye", "克苏鲁之眼后", "Post-Eye of Cthulhu", 1.5],
  GloameyeLantern: ["post-eye", "克苏鲁之眼后", "Post-Eye of Cthulhu", 1.5],
  YoungstarFormationStaff: ["post-world-evil", "世界邪恶 Boss 后", "Post world-evil boss", 2.7],
  RimeboundReturnhook: ["early-hardmode", "困难模式初期", "Early Hardmode", 8.1],
  MiragetailNeedlebow: ["early-hardmode", "困难模式初期", "Early Hardmode", 8.1],
  TriuneCalibrationAstrolabe: ["post-mechs", "三机械 Boss 后", "Post-mechanical bosses", 11.1],
  CountervoyageStarAnchor: ["martian", "火星暴乱", "Martian Madness", 15.1],
  PatrolSwarmBeacon: ["martian", "火星暴乱", "Martian Madness", 15.1],
  MoonfallCrossbow: ["post-moon-lord", "月亮领主后", "Post-Moon Lord", 18.05],
  StarcrownSporeboundInstrument: ["post-moon-lord", "月亮领主后", "Post-Moon Lord", 18.05],
  WallknellEchoHalberd: ["post-boundary", "击破世界界壁后", "After the World Boundary", 18.2],
  SeamwingRayInstrument: ["post-boundary", "击破世界界壁后", "After the World Boundary", 18.2]
};

function walk(root, predicate = () => true) {
  const result = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    if (!fs.existsSync(current)) continue;
    for (const dirent of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        if (!["bin", "obj", ".artwork", "_sprite_work", "tmp"].includes(dirent.name)) {
          stack.push(absolute);
        }
      } else if (predicate(absolute)) {
        result.push(absolute);
      }
    }
  }
  return result.sort((a, b) => a.localeCompare(b, "en"));
}

function findMatchingBrace(source, openIndex) {
  let depth = 0;
  let mode = "code";
  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (mode === "line-comment") {
      if (char === "\n") mode = "code";
      continue;
    }
    if (mode === "block-comment") {
      if (char === "*" && next === "/") {
        mode = "code";
        i += 1;
      }
      continue;
    }
    if (mode === "string") {
      if (char === "\\") i += 1;
      else if (char === '"') mode = "code";
      continue;
    }
    if (mode === "char") {
      if (char === "\\") i += 1;
      else if (char === "'") mode = "code";
      continue;
    }
    if (char === "/" && next === "/") {
      mode = "line-comment";
      i += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      mode = "block-comment";
      i += 1;
      continue;
    }
    if (char === '"') {
      mode = "string";
      continue;
    }
    if (char === "'") {
      mode = "char";
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parseClasses(source, sourcePath) {
  const classes = [];
  const declaration = /\b(?<modifiers>(?:(?:public|internal|private|protected|sealed|abstract|partial|static)\s+)*)class\s+(?<name>[A-Za-z_]\w*)(?:\s*:\s*(?<bases>[^{};]+?))?\s*{/g;
  let match;
  while ((match = declaration.exec(source))) {
    const open = source.indexOf("{", match.index + match[0].length - 1);
    const close = findMatchingBrace(source, open);
    if (close < 0) continue;
    classes.push({
      name: match.groups.name,
      modifiers: match.groups.modifiers || "",
      bases: match.groups.bases?.trim() || "",
      body: source.slice(open + 1, close),
      sourcePath,
      declarationIndex: match.index
    });
    declaration.lastIndex = open + 1;
  }
  return classes;
}

function firstBaseName(bases) {
  if (!bases) return "";
  const first = bases.split(",")[0].trim();
  return first.replace(/<.*$/, "").replace(/^global::/, "").split(".").pop();
}

function resolveKind(typeName, typeMap, seen = new Set()) {
  if (TYPE_MAP.has(typeName)) return TYPE_MAP.get(typeName);
  if (seen.has(typeName)) return null;
  seen.add(typeName);
  const parts = typeMap.get(typeName);
  if (!parts) return null;
  for (const part of parts) {
    const base = firstBaseName(part.bases);
    const kind = resolveKind(base, typeMap, seen);
    if (kind) return kind;
  }
  return null;
}

function deepLookup(root, dottedPath) {
  if (root == null) return undefined;
  if (Object.prototype.hasOwnProperty.call(root, dottedPath)) return root[dottedPath];
  return dottedPath.split(".").reduce((current, key) => current?.[key], root);
}

function localNode(root, group, name) {
  return deepLookup(root, `${group}.${name}`)
    ?? deepLookup(root, group)?.[name]
    ?? {};
}

function localizedValue(root, group, name, field) {
  const node = localNode(root, group, name);
  if (typeof node === "string") return field === "DisplayName" ? node : "";
  return deepLookup(node, field)
    ?? deepLookup(root, `${group}.${name}.${field}`)
    ?? "";
}

function localizedBestiary(root, name) {
  return deepLookup(root, `Bestiary.${name}`) ?? "";
}

function humanizePascal(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

function parseConstants(body) {
  const constants = {};
  const regex = /\bconst\s+(?:int|float|double|short|byte|long)\s+(\w+)\s*=\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(body))) constants[match[1]] = match[2].trim();
  return constants;
}

function cleanExpression(expression, constants = {}, depth = 0) {
  if (depth > 4) return expression.trim();
  let value = expression.trim().replace(/\s+/g, " ");
  if (Object.prototype.hasOwnProperty.call(constants, value)) {
    return cleanExpression(constants[value], constants, depth + 1);
  }
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === "true";
  if (/^"(?:[^"\\]|\\.)*"$/.test(value)) {
    try { return JSON.parse(value); } catch { return value.slice(1, -1); }
  }
  const price = value.match(/Item\.(?:buyPrice|sellPrice)\(([^)]*)\)/);
  if (price) {
    const units = {};
    for (const pair of price[1].split(",")) {
      const unit = pair.match(/(platinum|gold|silver|copper)\s*:\s*(\d+)/i);
      if (unit) units[unit[1].toLowerCase()] = Number(unit[2]);
    }
    return { type: "coin", ...units };
  }
  const enumValue = value.match(/(?:ItemRarityID|ItemUseStyleID|AmmoID|TileID|DustID|SoundID|DamageClass)\.(\w+)/);
  if (enumValue && enumValue[0] === value) return enumValue[1];
  let numeric = value.replace(/_/g, "").replace(/(?<=\d)[fFdDmMlL]\b/g, "");
  for (const [name, constantValue] of Object.entries(constants)) {
    numeric = numeric.replace(new RegExp(`\\b${name}\\b`, "g"), `(${constantValue})`);
  }
  if (/^[\d\s+\-*/().]+$/.test(numeric)) {
    try {
      const evaluated = Function(`"use strict"; return (${numeric});`)();
      if (Number.isFinite(evaluated)) return evaluated;
    } catch {
      // Keep the authored expression below.
    }
  }
  return value.length > 120 ? `${value.slice(0, 117)}…` : value;
}

function collectAssignments(body, entityName, inheritedConstants = {}) {
  const constants = { ...inheritedConstants, ...parseConstants(body) };
  const result = {};
  const regex = new RegExp(`\\b${entityName}\\.(\\w+)\\s*=\\s*([^;]+);`, "g");
  let match;
  while ((match = regex.exec(body))) {
    result[match[1]] = cleanExpression(match[2], constants);
  }
  return result;
}

function selectStats(kind, body) {
  const constants = parseConstants(body);
  const entityName = kind === "item" ? "Item"
    : kind === "npc" ? "NPC"
      : kind === "projectile" ? "Projectile"
        : "";
  const authoredDefaults = entityName ? methodBody(body, "SetDefaults") : "";
  const source = entityName
    ? {
        ...collectAssignments(body, entityName, constants),
        ...collectAssignments(authoredDefaults, entityName, constants)
      }
    : {};
  const allowed = {
    item: ["damage", "DamageType", "knockBack", "crit", "useTime", "useAnimation", "mana", "defense", "shootSpeed", "useAmmo", "pick", "axe", "hammer", "maxStack", "consumable", "accessory", "rare", "value", "width", "height"],
    npc: ["lifeMax", "damage", "defense", "knockBackResist", "value", "boss", "npcSlots", "width", "height", "aiStyle"],
    projectile: ["damage", "DamageType", "knockBack", "timeLeft", "penetrate", "friendly", "hostile", "tileCollide", "extraUpdates", "minion", "sentry", "width", "height", "scale"]
  }[kind] || [];
  return Object.fromEntries(allowed.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}

function methodBody(body, methodName) {
  const match = new RegExp(`\\b${methodName}\\s*\\([^)]*\\)\\s*{`).exec(body);
  if (!match) return "";
  const open = body.indexOf("{", match.index);
  const close = findMatchingBrace(body, open);
  return close > open ? body.slice(open + 1, close) : "";
}

function parseRecipes(body) {
  const recipes = [];
  let cursor = 0;
  while (cursor < body.length) {
    const start = body.indexOf("CreateRecipe", cursor);
    if (start < 0) break;
    const register = body.indexOf("Register();", start);
    if (register < 0) break;
    const chunk = body.slice(start, register + "Register();".length);
    const resultCount = Number(chunk.match(/CreateRecipe\s*\(\s*(\d+)\s*\)/)?.[1] || 1);
    const ingredients = [];
    const genericIngredient = /AddIngredient\s*<\s*(\w+)\s*>\s*\(\s*(\d+)?\s*\)/g;
    const typedIngredient = /AddIngredient\s*\(\s*ModContent\.ItemType\s*<\s*(\w+)\s*>\s*\(\s*\)\s*(?:,\s*(\d+))?\s*\)/g;
    const vanillaIngredient = /AddIngredient\s*\(\s*ItemID\.(\w+)\s*(?:,\s*(\d+))?\s*\)/g;
    const recipeGroup = /AddRecipeGroup\s*\(\s*(?:RecipeGroupID\.)?(\w+)\s*(?:,\s*(\d+))?\s*\)/g;
    for (const regex of [genericIngredient, typedIngredient, vanillaIngredient, recipeGroup]) {
      let match;
      while ((match = regex.exec(chunk))) {
        ingredients.push({
          id: match[1],
          count: Number(match[2] || 1),
          vanilla: regex === vanillaIngredient || regex === recipeGroup,
          group: regex === recipeGroup
        });
      }
    }
    const tile = chunk.match(/AddTile\s*(?:<\s*(\w+)\s*>\s*\(\s*\)|\(\s*(?:TileID\.)?(\w+)\s*\))/);
    const conditions = [...chunk.matchAll(/AddCondition\s*\(\s*([^)]+)\)/g)].map((match) => match[1].trim());
    recipes.push({
      resultCount,
      ingredients,
      station: tile?.[1] || tile?.[2] || "",
      conditions
    });
    cursor = register + "Register();".length;
  }
  return recipes;
}

function parseDropReferences(body) {
  const drops = [];
  const methods = [methodBody(body, "ModifyNPCLoot"), methodBody(body, "ModifyItemLoot")].filter(Boolean);
  for (const method of methods) {
    const patterns = [
      { regex: /ModContent\.ItemType\s*<\s*(\w+)\s*>\s*\(\s*\)/g, vanilla: false },
      { regex: /ItemID\.(\w+)/g, vanilla: true }
    ];
    for (const { regex, vanilla } of patterns) {
      for (const match of method.matchAll(regex)) {
        const tail = method.slice(match.index + match[0].length, match.index + match[0].length + 220);
        const positional = tail.match(/^\s*,\s*(\d+)(?:\s*,\s*(\d+)\s*,\s*(\d+))?/);
        const namedChance = tail.match(/^[\s\S]{0,100}?chanceDenominator\s*:\s*(\d+)/);
        const namedQuantity = tail.match(/^[\s\S]{0,160}?minimumDropped\s*:\s*(\d+)[\s\S]{0,80}?maximumDropped\s*:\s*(\d+)/);
        drops.push({
          item: match[1],
          vanilla,
          chanceDenominator: Number(namedChance?.[1] || positional?.[1] || 0) || null,
          minimum: Number(namedQuantity?.[1] || positional?.[2] || 1),
          maximum: Number(namedQuantity?.[2] || positional?.[3] || namedQuantity?.[1] || positional?.[2] || 1)
        });
      }
    }
  }
  return [...new Map(drops.map((drop) => [`${drop.vanilla ? "vanilla" : "mod"}:${drop.item}`, drop])).values()];
}

function categoryFromPath(kind, relativePath, stats, isBoss, internalName) {
  const segments = relativePath.split(/[\\/]/);
  if (kind === "item") {
    if (internalName === "CelestialAstrolabe") return { category: "BossSummons", subcategory: "" };
    if (internalName === "WatcherTreasureBag") return { category: "BossBags", subcategory: "" };
    const itemsIndex = segments.indexOf("Items");
    const folder = itemsIndex >= 0 ? segments[itemsIndex + 1] : "Other";
    const subfolder = itemsIndex >= 0 ? segments[itemsIndex + 2] : "";
    return { category: folder || "Other", subcategory: subfolder && !subfolder.endsWith(".cs") ? subfolder : "" };
  }
  if (kind === "npc") {
    return { category: isBoss ? "Bosses" : relativePath.includes(`${path.sep}Enemies${path.sep}`) || relativePath.includes("/Enemies/") ? "Enemies" : "NPCs", subcategory: "" };
  }
  if (kind === "projectile") {
    const disposition = stats.friendly ? "Friendly" : stats.hostile ? "Hostile" : "Utility";
    return { category: "Projectiles", subcategory: disposition };
  }
  return { category: `${kind[0].toUpperCase()}${kind.slice(1)}s`, subcategory: "" };
}

function normalizeTexturePath(rawTexture) {
  if (!rawTexture) return "";
  return rawTexture
    .replace(/^ThirteenAstralCourts\//, "")
    .replace(/\\/g, "/");
}

const csRoots = [path.join(modRoot, "Content"), path.join(modRoot, "Common")];
const csFiles = csRoots.flatMap((root) => walk(root, (file) => file.endsWith(".cs")));
const typeMap = new Map();
for (const absolutePath of csFiles) {
  const sourcePath = path.relative(modRoot, absolutePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  for (const typePart of parseClasses(source, sourcePath)) {
    const list = typeMap.get(typePart.name) || [];
    list.push(typePart);
    typeMap.set(typePart.name, list);
  }
}

const pngFiles = walk(path.join(modRoot, "Content"), (file) => file.toLowerCase().endsWith(".png"));
const pngByBase = new Map();
for (const file of pngFiles) {
  const base = path.basename(file, ".png");
  const list = pngByBase.get(base) || [];
  list.push(file);
  pngByBase.set(base, list);
}

function chooseTexture(name, parts, kind) {
  const body = parts.map((part) => part.body).join("\n");
  const literalTexture = body.match(/override\s+string\s+Texture\s*=>\s*"([^"]+)"/)?.[1];
  const normalized = normalizeTexturePath(literalTexture);
  if (normalized) {
    const candidate = path.join(modRoot, `${normalized}.png`);
    if (fs.existsSync(candidate)) return candidate;
  }
  const sameFolderCandidates = parts.flatMap((part) => {
    const folder = path.dirname(path.join(modRoot, part.sourcePath));
    return [path.join(folder, `${name}.png`), path.join(folder, `${path.basename(part.sourcePath, ".cs")}.png`)];
  });
  for (const candidate of sameFolderCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  const byName = pngByBase.get(name) || [];
  if (byName.length === 1) return byName[0];
  if (kind === "npc" && byName.length) return byName.find((file) => !file.includes("BossHead")) || byName[0];
  return byName[0] || "";
}

function choosePortrait(name, texture) {
  const candidates = [
    ...(pngByBase.get(`${name}_BossHead`) || []),
    ...(pngByBase.get("BossHead") || []).filter((file) => file.includes(name.replace(/Boss$/, "")))
  ];
  return candidates[0] || texture;
}

function copyPublicTexture(sourceFile, kind, name, suffix = "") {
  if (!sourceFile || !fs.existsSync(sourceFile)) return "";
  const folder = path.join(contentAssetDir, kind);
  fs.mkdirSync(folder, { recursive: true });
  const outputName = `${name}${suffix}.png`;
  fs.copyFileSync(sourceFile, path.join(folder, outputName));
  return `./assets/content/${kind}/${outputName}`;
}

function frameCount(kind, body) {
  const pattern = kind === "npc" ? /Main\.npcFrameCount\s*\[\s*Type\s*\]\s*=\s*(\d+)/
    : kind === "projectile" ? /Main\.projFrames\s*\[\s*Type\s*\]\s*=\s*(\d+)/
      : kind === "item" ? /DrawAnimationVertical\s*\([^,]+,\s*(\d+)\s*\)/
        : null;
  return Number(pattern?.exec(body)?.[1] || 1);
}

function detectBuffFlags(body) {
  return {
    debuff: /Main\.debuff\s*\[\s*Type\s*\]\s*=\s*true/.test(body),
    noSave: /Main\.buffNoSave\s*\[\s*Type\s*\]\s*=\s*true/.test(body),
    noTimeDisplay: /Main\.buffNoTimeDisplay\s*\[\s*Type\s*\]\s*=\s*true/.test(body)
  };
}

function parseDifficultyProfile(body, stats) {
  const profile = {};
  const normalizeNumber = (value) => Number(String(value).replace(/_/g, ""));
  const life = body.match(/SinglePlayerLifeTarget\s*=>\s*Main\.masterMode\s*\?\s*([\d_]+)\s*:\s*Main\.expertMode\s*\?\s*([\d_]+)\s*:\s*([\d_]+)/s);
  if (life) {
    profile.life = {
      classic: normalizeNumber(life[3]),
      expert: normalizeNumber(life[2]),
      master: normalizeNumber(life[1])
    };
    if (stats.lifeMax === "SinglePlayerLifeTarget") stats.lifeMax = profile.life.classic;
  }
  const attacks = [];
  const difficultyInt = /\b(?:private|public|internal)\s+(?:static\s+)?int\s+(\w*Damage)\s*=>\s*DifficultyInt\s*\(\s*([\d_]+)\s*,\s*([\d_]+)\s*,\s*([\d_]+)\s*\)/g;
  let match;
  while ((match = difficultyInt.exec(body))) {
    attacks.push({
      name: match[1],
      classic: normalizeNumber(match[2]),
      expert: normalizeNumber(match[3]),
      master: normalizeNumber(match[4])
    });
  }
  const ternaryDamage = /\b(?:private|public|internal)\s+(?:static\s+)?int\s+(\w*Damage)\s*=>\s*Main\.masterMode\s*\?\s*([\d_]+)\s*:\s*Main\.expertMode\s*\?\s*([\d_]+)\s*:\s*([\d_]+)/g;
  while ((match = ternaryDamage.exec(body))) {
    attacks.push({
      name: match[1],
      classic: normalizeNumber(match[4]),
      expert: normalizeNumber(match[3]),
      master: normalizeNumber(match[2])
    });
  }
  if (attacks.length) profile.attacks = [...new Map(attacks.map((attack) => [attack.name, attack])).values()];
  return profile;
}

const entries = [];
const dropSources = [];
for (const [name, parts] of typeMap) {
  const kind = resolveKind(name, typeMap);
  if (!kind) continue;
  if (parts.some((part) => /\babstract\b/.test(part.modifiers))) continue;
  const body = parts.map((part) => part.body).join("\n");
  const sourcePath = parts[0].sourcePath;
  const stats = selectStats(kind, body);
  const difficulty = kind === "npc" ? parseDifficultyProfile(body, stats) : {};
  const isBoss = kind === "npc" && (stats.boss === true || /NPC\.boss\s*=\s*true/.test(body));
  const isInternal = kind === "projectile"
    || (kind === "npc" && sourcePath.replace(/\\/g, "/").includes("/Bosses/") && !isBoss)
    || /(?:Controller|Relay|Hitbox|Aperture|CocoonKnot|StarBud|Echo)$/.test(name);
  const { category, subcategory } = categoryFromPath(kind, sourcePath, stats, isBoss, name);
  const group = KIND_LOCALIZATION_GROUP[kind];
  const configRoot = kind === "config" ? { zh: zhConfigs, en: enConfigs } : { zh, en };
  const zhName = localizedValue(configRoot.zh, group, name, "DisplayName")
    || localizedValue(configRoot.zh, group, name, "Label")
    || humanizePascal(name);
  const enName = localizedValue(configRoot.en, group, name, "DisplayName")
    || localizedValue(configRoot.en, group, name, "Label")
    || humanizePascal(name);
  const zhTooltip = localizedValue(configRoot.zh, group, name, "Tooltip")
    || localizedValue(configRoot.zh, group, name, "Description")
    || localizedValue(configRoot.zh, group, name, "Tooltip0")
    || "";
  const enTooltip = localizedValue(configRoot.en, group, name, "Tooltip")
    || localizedValue(configRoot.en, group, name, "Description")
    || localizedValue(configRoot.en, group, name, "Tooltip0")
    || "";
  const texture = chooseTexture(name, parts, kind);
  const portrait = isBoss ? choosePortrait(name, texture) : texture;
  const image = copyPublicTexture(texture, kind, name);
  const portraitImage = portrait && portrait !== texture
    ? copyPublicTexture(portrait, kind, name, "-portrait")
    : image;
  const bossStage = BOSS_STAGE_META[name];
  const knownItemStage = KNOWN_ITEM_STAGES[name];
  const stage = bossStage
    ? bossStage
    : knownItemStage
      ? { key: knownItemStage[0], zh: knownItemStage[1], en: knownItemStage[2], order: knownItemStage[3] }
      : null;
  const recipes = kind === "item" ? parseRecipes(methodBody(body, "AddRecipes") || body) : [];
  if (kind === "item" && name === "VitalArmorResonanceCore") {
    const helper = methodBody(body, "RegisterRecipe");
    for (const bar of ["CobaltBar", "PalladiumBar"]) {
      recipes.push(...parseRecipes(helper.replaceAll("barType", `ItemID.${bar}`)));
    }
  }
  const dropReferences = parseDropReferences(body);
  if (dropReferences.length) dropSources.push({ source: name, sourceKind: kind, drops: dropReferences });
  entries.push({
    id: `${kind}/${name}`,
    internalName: name,
    kind,
    category,
    subcategory,
    name: { zh: String(zhName), en: String(enName) },
    tooltip: { zh: String(zhTooltip || ""), en: String(enTooltip || "") },
    description: {
      zh: String(kind === "npc" ? localizedBestiary(zh, name) : ""),
      en: String(kind === "npc" ? localizedBestiary(en, name) : "")
    },
    spawnInfo: {
      zh: String(kind === "npc" ? localizedValue(zh, "NPCs", name, "BossChecklistIntegration.SpawnInfo") : ""),
      en: String(kind === "npc" ? localizedValue(en, "NPCs", name, "BossChecklistIntegration.SpawnInfo") : "")
    },
    image,
    portraitImage,
    frames: frameCount(kind, body),
    stats: kind === "buff" ? detectBuffFlags(body) : stats,
    difficulty,
    recipes,
    stage,
    isBoss,
    isInternal,
    sourcePath: sourcePath.replace(/\\/g, "/")
  });
}

entries.sort((a, b) => {
  const kindOrder = ["npc", "item", "buff", "tile", "wall", "biome", "projectile", "config"];
  const kindDelta = kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind);
  if (kindDelta) return kindDelta;
  const bossDelta = Number(b.isBoss) - Number(a.isBoss);
  if (bossDelta) return bossDelta;
  return a.name.zh.localeCompare(b.name.zh, "zh-Hans-CN");
});

const entryByName = new Map(entries.map((entry) => [entry.internalName, entry]));

function attachDrop(sourceInfo, drop) {
  const normalized = {
    source: sourceInfo.source,
    sourceKind: sourceInfo.sourceKind || "npc",
    ...(sourceInfo.sourceLabel ? { sourceLabel: sourceInfo.sourceLabel } : {}),
    ...(sourceInfo.condition ? { condition: sourceInfo.condition } : {}),
    item: drop.item,
    vanilla: Boolean(drop.vanilla),
    chanceDenominator: drop.chanceDenominator || null,
    minimum: drop.minimum ?? 1,
    maximum: drop.maximum ?? drop.minimum ?? 1
  };

  const sourceEntry = entryByName.get(sourceInfo.source);
  if (sourceEntry) {
    sourceEntry.drops ||= [];
    sourceEntry.drops.push({
      item: normalized.item,
      vanilla: normalized.vanilla,
      chanceDenominator: normalized.chanceDenominator,
      minimum: normalized.minimum,
      maximum: normalized.maximum,
      ...(normalized.condition ? { condition: normalized.condition } : {})
    });
  }

  if (normalized.vanilla) return;
  const target = entryByName.get(normalized.item);
  if (!target) return;
  target.dropSources ||= [];
  target.dropSources.push({
    source: normalized.source,
    sourceKind: normalized.sourceKind,
    ...(normalized.sourceLabel ? { sourceLabel: normalized.sourceLabel } : {}),
    ...(normalized.condition ? { condition: normalized.condition } : {}),
    chanceDenominator: normalized.chanceDenominator,
    minimum: normalized.minimum,
    maximum: normalized.maximum
  });
}

for (const source of dropSources) {
  for (const drop of source.drops) {
    attachDrop(source, drop);
  }
}

const condition = (zhText, enText) => ({ zh: zhText, en: enText });
const globalConditionalDrops = [];
const addGlobalDrop = (sources, item, chanceDenominator, minimum, maximum, ruleCondition) => {
  for (const source of sources) {
    globalConditionalDrops.push({
      source: typeof source === "string" ? source : source.id,
      sourceKind: "npc",
      ...(typeof source === "string" ? {} : { sourceLabel: source.label }),
      condition: ruleCondition,
      drop: { item, chanceDenominator, minimum, maximum, vanilla: false }
    });
  }
};

const preHardmodeFauna = ["StarfallScarab", "GloamMoth", "StarveilRay"];
addGlobalDrop(preHardmodeFauna, "GlimmeringStarMatter", 2, 1, 2,
  condition("非雕像生成；击败克苏鲁之眼后", "Natural spawn; after Eye of Cthulhu"));
addGlobalDrop(preHardmodeFauna, "AwakenedTrackGland", 3, 1, 2,
  condition("非雕像生成；击败世界邪恶 Boss 后", "Natural spawn; after the world-evil boss"));

const earlyHardmodeFauna = ["MiragesandScorpion", "FrosttrailLynx", "StarvineMantis"];
addGlobalDrop(earlyHardmodeFauna, "SpiritTideCrystal", 2, 1, 2,
  condition("非雕像生成；困难模式", "Natural spawn; Hardmode"));
addGlobalDrop(earlyHardmodeFauna, "CalibrationGearcore", 3, 1, 1,
  condition("非雕像生成；击败全部机械 Boss 后", "Natural spawn; after all mechanical bosses"));
addGlobalDrop(["FrosttrailLynx"], "RimeboundReturnhook", 30, 1, 1,
  condition("非雕像生成；困难模式", "Natural spawn; Hardmode"));
addGlobalDrop(["MiragesandScorpion"], "MiragetailNeedlebow", 30, 1, 1,
  condition("非雕像生成；困难模式", "Natural spawn; Hardmode"));

const martianCommon = {
  id: "VanillaMartianCommonEnemies",
  label: { zh: "火星暴乱普通敌怪", en: "Martian Madness common enemies" }
};
const martianHeavy = {
  id: "VanillaMartianHeavyEnemies",
  label: { zh: "火星暴乱重型敌怪", en: "Martian Madness heavy enemies" }
};
const martianRule = condition("非雕像生成；击败石巨人后", "Natural spawn; after Golem");
addGlobalDrop([martianCommon], "CounterstarCapacitor", 5, 1, 1, martianRule);
addGlobalDrop([martianHeavy], "CounterstarCapacitor", 2, 1, 2, martianRule);
addGlobalDrop([{
  id: "VanillaMartianWalker",
  label: { zh: "火星走卒", en: "Martian Walker" }
}], "CountervoyageStarAnchor", 30, 1, 1, martianRule);
addGlobalDrop([{
  id: "VanillaMartianEngineer",
  label: { zh: "火星工程师", en: "Martian Engineer" }
}], "PatrolSwarmBeacon", 30, 1, 1, martianRule);

const postMoonElite = ["MoonfallDuneVulture", "MoonrimeOwl", "StarcrownSporeMatron"];
const moonRule = condition("非雕像生成；击败月亮领主后", "Natural spawn; after Moon Lord");
addGlobalDrop(postMoonElite, "MooncoreExuvia", null, 1, 1, moonRule);
addGlobalDrop(postMoonElite, "MooncoreExuvia", 4, 1, 1, moonRule);
addGlobalDrop(["MoonrimeOwl"], "MoonfallCrossbow", 8, 1, 1, moonRule);
addGlobalDrop(["StarcrownSporeMatron"], "StarcrownSporeboundInstrument", 8, 1, 1, moonRule);

const extramuralFauna = [
  "SeamwingRay",
  "BoundaryChorusNest",
  "RiftLanternMatron",
  "WallKnockerClawbeast",
  "WallErodingLeviathan"
];
const boundaryRule = condition("非雕像生成；击败界壁后", "Natural spawn; after the World Boundary");
addGlobalDrop(extramuralFauna, "ExtramuralEssence", 10, 1, 1, boundaryRule);
addGlobalDrop(extramuralFauna.filter((name) => name !== "WallErodingLeviathan"), "ExtramuralCarapace", null, 1, 2, boundaryRule);
addGlobalDrop(["WallErodingLeviathan"], "ExtramuralCarapace", null, 6, 10, boundaryRule);
addGlobalDrop(["WallKnockerClawbeast"], "WallknellEchoHalberd", 20, 1, 1, boundaryRule);
addGlobalDrop(["SeamwingRay"], "SeamwingRayInstrument", 20, 1, 1, boundaryRule);

for (const globalDrop of globalConditionalDrops) {
  attachDrop(globalDrop, globalDrop.drop);
}

const weaponPools = [
  ["StarfaringLarvaWeaponPool", "StarfaringLarvaBoss", "StarfaringLarvaTreasureBag"],
  ["WatcherWeaponPool", "WatcherBoss", "WatcherTreasureBag"],
  ["LoneStarWeaponPool", "OtherworldlyLoneStarBoss", "LoneStarTreasureBag"],
  ["WorldBoundaryWeaponPool", "WorldBoundaryBoss", "WorldBoundaryTreasureBag"],
  ["FirstCourtLordWeaponPool", "FirstCourtLordZhaohuiBoss", "FirstCourtLordTreasureBag"]
];
for (const [poolName, bossName, bagName] of weaponPools) {
  const poolBody = (typeMap.get(poolName) || []).map((part) => part.body).join("\n");
  const weapons = [...poolBody.matchAll(/ModContent\.ItemType\s*<\s*(\w+)\s*>\s*\(\s*\)/g)].map((match) => match[1]);
  for (const weapon of weapons) {
    attachDrop({
      source: bossName,
      sourceKind: "npc",
      condition: condition("经典模式武器池（四选一）", "Classic-mode weapon pool (one of four)")
    }, { item: weapon, chanceDenominator: weapons.length, minimum: 1, maximum: 1, vanilla: false });
    attachDrop({
      source: bagName,
      sourceKind: "item",
      condition: condition("专家宝藏袋武器池（四选一）", "Expert treasure bag weapon pool (one of four)")
    }, { item: weapon, chanceDenominator: weapons.length, minimum: 1, maximum: 1, vanilla: false });
  }
}

const checklistSource = readText(path.join("Common", "Systems", "BossChecklistIntegrationSystem.cs"));
const progression = [];
const checklistPattern = /LogBoss\(\s*bossChecklist,\s*"([^"]+)",\s*([\d.]+)f,[\s\S]*?NPCType\s*<\s*(\w+)\s*>\s*\(\s*\),\s*ModContent\.ItemType\s*<\s*(\w+)\s*>/g;
let checklistMatch;
while ((checklistMatch = checklistPattern.exec(checklistSource))) {
  const [, checklistName, weight, bossId, summonItem] = checklistMatch;
  const boss = entryByName.get(bossId);
  const summon = entryByName.get(summonItem);
  progression.push({
    checklistName,
    weight: Number(weight),
    bossId,
    summonItem,
    stage: BOSS_STAGE_META[bossId] || boss?.stage || null,
    bossEntryId: boss?.id || "",
    summonEntryId: summon?.id || ""
  });
}
progression.sort((a, b) => a.weight - b.weight);

for (const step of progression) {
  const boss = entryByName.get(step.bossId);
  if (boss) {
    boss.progressionWeight = step.weight;
    boss.summonItem = step.summonItem;
  }
  const summon = entryByName.get(step.summonItem);
  if (summon && !summon.stage) summon.stage = step.stage;
}

for (const entry of entries) {
  if (entry.kind !== "item" || entry.stage) continue;
  const directBossSource = entry.dropSources?.map((source) => entryByName.get(source.source)).find((source) => source?.isBoss);
  if (directBossSource?.stage) entry.stage = directBossSource.stage;
}

const itemCounts = entries.filter((entry) => entry.kind === "item" && !entry.isInternal).reduce((counts, entry) => {
  counts[entry.category] = (counts[entry.category] || 0) + 1;
  if (entry.category === "Weapons" && entry.subcategory) counts[`Weapons/${entry.subcategory}`] = (counts[`Weapons/${entry.subcategory}`] || 0) + 1;
  return counts;
}, {});

const coverage = {
  totalEntries: entries.length,
  publicEntries: entries.filter((entry) => !entry.isInternal).length,
  internalEntries: entries.filter((entry) => entry.isInternal).length,
  images: entries.filter((entry) => entry.image).length,
  localizedZh: entries.filter((entry) => entry.name.zh !== humanizePascal(entry.internalName)).length,
  localizedEn: entries.filter((entry) => entry.name.en !== humanizePascal(entry.internalName)).length,
  recipes: entries.reduce((sum, entry) => sum + entry.recipes.length, 0),
  bosses: entries.filter((entry) => entry.isBoss).length,
  enemies: entries.filter((entry) => entry.kind === "npc" && entry.category === "Enemies").length,
  items: entries.filter((entry) => entry.kind === "item" && !entry.isInternal).length,
  buffs: entries.filter((entry) => entry.kind === "buff" && !entry.isInternal).length,
  tiles: entries.filter((entry) => ["tile", "wall"].includes(entry.kind) && !entry.isInternal).length,
  projectiles: entries.filter((entry) => entry.kind === "projectile").length,
  itemCategories: itemCounts
};

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  meta: {
    modName: "ThirteenAstralCourts",
    displayName: buildMeta.displayName || "天星十三宫",
    author: buildMeta.author || "M.Aya",
    version: buildMeta.version || "0.1",
    terrariaVersion: "1.4.4.9",
    description: readText("description.txt").trim()
  },
  coverage,
  progression,
  entries
};

fs.writeFileSync(path.join(dataDir, "wiki-data.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");

const brandCopies = [
  ["icon.png", "icon.png"],
  ["icon_workshop.png", "workshop.png"]
];
for (const [source, destination] of brandCopies) {
  const absoluteSource = path.join(modRoot, source);
  if (fs.existsSync(absoluteSource)) fs.copyFileSync(absoluteSource, path.join(brandDir, destination));
}

console.log(`Wiki 数据同步完成：${coverage.publicEntries} 个公开条目，${coverage.internalEntries} 个内部图鉴条目，${coverage.images} 张贴图。`);
console.log(`输出：${path.relative(process.cwd(), path.join(dataDir, "wiki-data.json"))}`);
