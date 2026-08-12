import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "src", "data", "wiki-data.json");
if (!fs.existsSync(dataPath)) {
  throw new Error("缺少 src/data/wiki-data.json；请先运行 npm run sync。");
}

const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const failures = [];
const ids = new Set();
for (const entry of data.entries || []) {
  if (!entry.id || ids.has(entry.id)) failures.push(`重复或空条目 ID: ${entry.id}`);
  ids.add(entry.id);
  if (!entry.internalName || !entry.kind) failures.push(`条目字段不完整: ${entry.id}`);
  if (!entry.name?.zh || !entry.name?.en) failures.push(`条目缺少双语名称: ${entry.id}`);
  if (!entry.isInternal && entry.kind !== "config" && !entry.image) {
    failures.push(`公开条目缺少贴图: ${entry.id}`);
  }
  if (entry.image) {
    const assetPath = path.join(root, "public", entry.image.replace(/^\.\//, ""));
    if (!fs.existsSync(assetPath)) failures.push(`贴图不存在: ${entry.id} -> ${entry.image}`);
  }
  for (const recipe of entry.recipes || []) {
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      failures.push(`空配方: ${entry.id}`);
    }
  }
}

const expectations = {
  totalEntries: 403,
  publicEntries: 228,
  bosses: 7,
  enemies: 35,
  items: 169,
  buffs: 12,
  tiles: 3,
  projectiles: 170,
  recipes: 115
};
for (const [key, expected] of Object.entries(expectations)) {
  if (data.coverage?.[key] !== expected) failures.push(`覆盖异常：${key} 应为 ${expected}，实为 ${data.coverage?.[key]}`);
}

const expectedItemCategories = {
  Weapons: 39,
  "Weapons/Melee": 9,
  "Weapons/Ranged": 10,
  "Weapons/Magic": 11,
  "Weapons/Summon": 9,
  Armor: 31,
  Accessories: 35,
  Materials: 16,
  Placeable: 26,
  BossSummons: 7,
  BossBags: 7,
  Consumables: 6,
  Tools: 2
};
for (const [key, expected] of Object.entries(expectedItemCategories)) {
  if (data.coverage?.itemCategories?.[key] !== expected) {
    failures.push(`物品分类异常：${key} 应为 ${expected}，实为 ${data.coverage?.itemCategories?.[key]}`);
  }
}

for (const step of data.progression || []) {
  if (!ids.has(step.bossEntryId)) failures.push(`Boss 进度条目不存在: ${step.bossId}`);
  if (!ids.has(step.summonEntryId)) failures.push(`召唤物条目不存在: ${step.summonItem}`);
}
if ((data.progression || []).length !== 7) failures.push("Boss 流程应包含 7 个步骤。");

const byName = new Map((data.entries || []).map((entry) => [entry.internalName, entry]));
for (const entry of data.entries || []) {
  for (const recipe of entry.recipes || []) {
    for (const ingredient of recipe.ingredients || []) {
      if (ingredient.vanilla) continue;
      const target = byName.get(ingredient.id);
      if (!target?.image) failures.push(`模组合成材料缺少可显示贴图: ${entry.id} -> ${ingredient.id}`);
    }
  }
  for (const drop of entry.drops || []) {
    if (drop.vanilla) continue;
    const target = byName.get(drop.item);
    if (!target?.image) failures.push(`模组掉落物缺少可显示贴图: ${entry.id} -> ${drop.item}`);
  }
  for (const drop of entry.dropSources || []) {
    const source = byName.get(drop.source);
    if (source && !source.image) failures.push(`掉落来源缺少可显示贴图: ${entry.id} -> ${drop.source}`);
  }
}

if (byName.get("VitalArmorResonanceCore")?.recipes?.length !== 2) {
  failures.push("VitalArmorResonanceCore 的钴/钯两条配方未完整展开。");
}
if (byName.get("WorldfoldGuillotine")?.dropSources?.length !== 2) {
  failures.push("界壁武器池的普通/专家获取方式未完整展开。");
}
if (!byName.get("RimeboundReturnhook")?.dropSources?.some((drop) => drop.source === "FrosttrailLynx")) {
  failures.push("全局敌怪掉落表未收录霜返钩刃。");
}
if (data.meta?.version !== "0.2.1") {
  failures.push(`Wiki 源码快照版本应为 0.2.1，实为 ${data.meta?.version || "空"}。`);
}
if (byName.get("NestweaverCharm")?.recipes?.length !== 2) {
  failures.push("织巢护符的金锭/铂金锭两条配方未完整展开。");
}
if (!byName.get("ThirdCourtLordLiuyaoBoss")?.drops?.some((drop) => drop.item === "ThirdCourtLordTreasureBag")) {
  failures.push("流曜 Boss 掉落表未收录专家宝藏袋。");
}
for (const name of ["NestweaverCharm", "RiftgazePrism", "ChoirWarbell", "StarwovenSiphon", "SuihuaManifoldArray"]) {
  if (!byName.get(name)?.stage) failures.push(`0.2.1 新增流程物品缺少阶段: ${name}`);
}
if (byName.get("ThirdCourtLordTreasureBag")?.tooltip?.zh !== "右键打开") {
  failures.push("宝藏袋的公共本地化占位符未解析。");
}
for (const name of [
  "RiftgazePrism",
  "ChoirWarbell",
  "StarwovenSiphon",
  "NestweaverCharm",
  "HX301ManaOverdrive",
  "SuihuaManifoldArray",
  "SuihuaStarCore",
  "ThirdCourtLordTreasureBag",
  "RedErosionDebuff"
]) {
  if (!byName.get(name)?.image) failures.push(`0.2.1 新增公开条目缺少贴图: ${name}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Wiki 内容校验通过：${data.coverage.publicEntries} 个公开条目、${data.coverage.bosses} 个 Boss、${data.coverage.recipes} 个配方。`);
