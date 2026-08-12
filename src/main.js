import "./styles.css";
import wikiData from "./data/wiki-data.json";
import {
  bossEditorial,
  categoryLabels,
  classLabels,
  courtLore,
  guideCatalog,
  kindLabels,
  referenceLinks,
  ui
} from "./editorial.js";

const app = document.querySelector("#app");
const entries = wikiData.entries;
const byId = new Map(entries.map((entry) => [entry.id, entry]));
const byName = new Map(entries.map((entry) => [entry.internalName, entry]));

const EXTERNAL_WIKIS = Object.freeze({
  terraria: {
    articleBase: "https://terraria.wiki.gg/wiki/",
    apiUrl: "https://terraria.wiki.gg/api.php",
    badge: "TW"
  }
});

const VANILLA_WIKI_TITLES = Object.freeze({
  BandofRegeneration: "Band of Regeneration",
  FossilOre: "Desert Fossil",
  FragmentNebula: "Nebula Fragment",
  FragmentSolar: "Solar Fragment",
  FragmentStardust: "Stardust Fragment",
  FragmentVortex: "Vortex Fragment",
  LunarBar: "Luminite Bar",
  LunarTabletFragment: "Solar Tablet Fragment",
  PaladinsShield: "Paladin's Shield",
  SoulofFlight: "Soul of Flight",
  SoulofLight: "Soul of Light",
  SoulofNight: "Soul of Night",
  Vertebrae: "Vertebra"
});

const VANILLA_SOURCE_WIKI = Object.freeze({
  VanillaMartianWalker: { pageTitle: "Martian Walker", imageTitle: "Martian Walker" },
  VanillaMartianEngineer: { pageTitle: "Martian Engineer", imageTitle: "Martian Engineer" },
  VanillaMartianCommonEnemies: { pageTitle: "Martian Madness", imageTitle: "Martian Madness" },
  VanillaMartianHeavyEnemies: { pageTitle: "Martian Madness", imageTitle: "Martian Madness" }
});

const externalWikiThumbnailCache = new Map();

const state = {
  lang: localStorage.getItem("tac-wiki-lang") || "zh",
  theme: localStorage.getItem("tac-wiki-theme") || "dark",
  menuOpen: false,
  searchOpen: false,
  searchQuery: ""
};

document.documentElement.dataset.theme = state.theme;
document.documentElement.lang = state.lang === "zh" ? "zh-Hans" : "en";

const CATEGORY_ROUTES = [
  ["weapons", "weapons", "✦"],
  ["armor", "armor", "◇"],
  ["accessories", "accessories", "◈"],
  ["materials", "materials", "⬢"],
  ["bosses", "bosses", "◆"],
  ["enemies", "enemies", "△"],
  ["world", "world", "▦"],
  ["buffs", "buffs", "◎"]
];

const CATEGORY_CONFIG = {
  items: {
    label: { zh: "全部物品", en: "All items" },
    description: { zh: "武器、护甲、饰品、材料、召唤物与可放置内容。", en: "Weapons, armor, accessories, materials, summons, and placeable content." },
    filter: (entry) => entry.kind === "item" && !entry.isInternal
  },
  weapons: {
    label: categoryLabels.Weapons,
    description: { zh: "覆盖近战、远程、魔法与召唤四职业的完整武器索引。", en: "The complete melee, ranged, magic, and summon weapon index." },
    filter: (entry) => entry.kind === "item" && entry.category === "Weapons"
  },
  armor: {
    label: categoryLabels.Armor,
    description: { zh: "基础套装、职业头盔与对应套装加成。", en: "Base sets, class helmets, and their set bonuses." },
    filter: (entry) => entry.kind === "item" && entry.category === "Armor"
  },
  accessories: {
    label: categoryLabels.Accessories,
    description: { zh: "进攻、生存、机动与机制型饰品。", en: "Offensive, defensive, mobility, and mechanic-focused accessories." },
    filter: (entry) => entry.kind === "item" && entry.category === "Accessories"
  },
  materials: {
    label: categoryLabels.Materials,
    description: { zh: "Boss、生态敌怪、矿物与界外路线产出的制作材料。", en: "Crafting materials from bosses, biome enemies, ore, and the extramural route." },
    filter: (entry) => entry.kind === "item" && entry.category === "Materials"
  },
  bosses: {
    label: categoryLabels.Bosses,
    description: { zh: "七场嵌入原版流程的星外 Boss 战。", en: "Seven astral boss encounters woven into vanilla progression." },
    filter: (entry) => entry.kind === "npc" && entry.isBoss
  },
  enemies: {
    label: categoryLabels.Enemies,
    description: { zh: "随世界进度进入原版生态与界外天空的敌怪。", en: "Enemies that enter vanilla biomes and the extramural sky as the world advances." },
    filter: (entry) => entry.kind === "npc" && entry.category === "Enemies" && !entry.isInternal
  },
  buffs: {
    label: categoryLabels.Buffs,
    description: { zh: "增益、减益与装备机制使用的状态效果。", en: "Buffs, debuffs, and equipment-driven status effects." },
    filter: (entry) => entry.kind === "buff" && !entry.isInternal
  },
  world: {
    label: { zh: "世界内容", en: "World content" },
    description: { zh: "矿物、物块、墙、家具、Boss 召唤物与世界进度内容。", en: "Ore, tiles, walls, furniture, boss summons, and world-progression content." },
    filter: (entry) => ["tile", "wall", "biome"].includes(entry.kind)
      || (entry.kind === "item" && ["Placeable", "BossSummons", "Summons"].includes(entry.category))
  },
  technical: {
    label: { zh: "开发者图鉴", en: "Developer compendium" },
    description: { zh: "弹幕、Boss 辅助实体和没有独立玩家条目的内部内容。", en: "Projectiles, boss support entities, and other internal content without standalone player pages." },
    filter: (entry) => entry.isInternal
  }
};

function t(key) {
  return ui[state.lang][key] ?? key;
}

function l(value, fallback = "") {
  if (value == null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return String(value[state.lang] ?? value.zh ?? value.en ?? fallback);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripTerrariaMarkup(value) {
  return String(value ?? "")
    .replace(/\[c\/[0-9a-fA-F]{6}:([^\]]+)\]/g, "$1")
    .replace(/\[i:(?:ThirteenAstralCourts\/)?([^\]]+)\]/g, "$1")
    .replace(/\{\d+(?::[^}]*)?\}/g, "—")
    .trim();
}

function richText(value) {
  let text = String(value ?? "");
  const itemTokens = [];
  text = text.replace(/\[i:(?:ThirteenAstralCourts\/)?([^\]]+)\]/g, (_, id) => {
    const token = `__ITEM_TOKEN_${itemTokens.length}__`;
    itemTokens.push(id);
    return token;
  });
  text = stripTerrariaMarkup(text);
  let output = escapeHtml(text).replace(/\r?\n/g, "<br />");
  itemTokens.forEach((id, index) => {
    const entry = byName.get(id);
    const replacement = entry
      ? `<a class="inline-entry" href="#/entry/${entry.id}">${escapeHtml(l(entry.name))}</a>`
      : escapeHtml(humanize(id));
    output = output.replace(`__ITEM_TOKEN_${index}__`, replacement);
  });
  return output;
}

function humanize(value) {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace("Soulof", "Soul of ")
    .replaceAll("_", " ")
    .trim();
}

function vanillaWikiTitle(value) {
  return VANILLA_WIKI_TITLES[value] || humanize(value).replace(/\s+/g, " ");
}

function labelForCategory(value) {
  return l(categoryLabels[value], humanize(value));
}

function labelForClass(value) {
  return l(classLabels[value], humanize(value));
}

function labelForKind(value) {
  return l(kindLabels[value], humanize(value));
}

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [pathPart = "", queryPart = ""] = raw.split("?");
  return {
    segments: pathPart.split("/").filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(queryPart)
  };
}

function routeHref(path) {
  return `#/${path.replace(/^\//, "")}`;
}

function entryHref(entry) {
  return routeHref(`entry/${entry.id}`);
}

function entryStage(entry) {
  return entry.stage ? l(entry.stage) : "";
}

function sprite(entry, size = "md", portrait = false) {
  const image = portrait ? entry.portraitImage || entry.image : entry.image;
  if (!image) {
    return `<span class="sprite-box sprite-${size} sprite-fallback" aria-hidden="true">${escapeHtml(l(entry.name).slice(0, 1))}</span>`;
  }
  const frames = portrait && entry.portraitImage !== entry.image ? 1 : entry.frames || 1;
  return `<span class="sprite-box sprite-${size}" data-frames="${frames}"><img src="${escapeHtml(image)}" alt="" loading="lazy" /></span>`;
}

function iconButton(action, label, symbol, extra = "") {
  return `<button class="icon-button ${extra}" type="button" data-action="${action}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${symbol}</button>`;
}

function navLink(path, label, icon, current) {
  const active = current === path || (path.startsWith("category/") && current === path.split("/")[1]);
  return `<a class="side-link${active ? " is-active" : ""}" href="${routeHref(path)}"><span aria-hidden="true">${icon}</span><span>${escapeHtml(label)}</span></a>`;
}

function renderHeader() {
  return `
    <header class="site-header">
      <div class="header-inner">
        ${iconButton("menu", t("openMenu"), "☰", "menu-button")}
        <a class="brand" href="#/" aria-label="${escapeHtml(t("home"))}">
          <img src="./assets/brand/icon.png" alt="" />
          <span><strong>${escapeHtml(t("siteName"))}</strong><small>${escapeHtml(t("siteKicker"))}</small></span>
        </a>
        <button class="header-search" type="button" data-action="search">
          <span aria-hidden="true">⌕</span><span>${escapeHtml(t("search"))}</span><kbd>Ctrl K</kbd>
        </button>
        <div class="header-actions">
          ${iconButton("lang", t("language"), state.lang === "zh" ? "EN" : "中")}
          ${iconButton("theme", t("theme"), state.theme === "dark" ? "☼" : "☾")}
        </div>
      </div>
    </header>`;
}

function renderSidebar(current) {
  return `
    <div class="sidebar-scrim${state.menuOpen ? " is-open" : ""}" data-action="close-menu"></div>
    <aside class="sidebar${state.menuOpen ? " is-open" : ""}" aria-label="Wiki navigation">
      <div class="sidebar-scroll">
        <p class="side-heading">${escapeHtml(state.lang === "zh" ? "导航" : "Navigation")}</p>
        ${navLink("", t("home"), "⌂", current)}
        ${navLink("progression", t("progression"), "⌁", current)}
        ${navLink("guides", t("guides"), "☷", current)}
        <p class="side-heading">${escapeHtml(state.lang === "zh" ? "百科" : "Encyclopedia")}</p>
        ${CATEGORY_ROUTES.map(([path, key, icon]) => navLink(`category/${path}`, t(key), icon, current)).join("")}
        ${navLink("category/items", state.lang === "zh" ? "全部物品" : "All items", "▤", current)}
        ${navLink("category/technical", t("compendium"), "⌘", current)}
        <p class="side-heading">${escapeHtml(state.lang === "zh" ? "站点" : "Site")}</p>
        ${navLink("about", t("about"), "○", current)}
        <div class="snapshot-card">
          <span>${escapeHtml(t("currentSnapshot"))}</span>
          <strong>v${escapeHtml(wikiData.meta.version)}</strong>
          <small>Terraria ${escapeHtml(wikiData.meta.terrariaVersion)}</small>
        </div>
      </div>
    </aside>`;
}

function renderSearchOverlay() {
  if (!state.searchOpen) return "";
  return `
    <div class="search-overlay" role="dialog" aria-modal="true" aria-label="${escapeHtml(t("search"))}">
      <button class="search-backdrop" type="button" data-action="close-search" aria-label="${escapeHtml(t("close"))}"></button>
      <section class="search-panel">
        <div class="search-input-wrap">
          <span aria-hidden="true">⌕</span>
          <input id="global-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="${escapeHtml(t("searchHint"))}" value="${escapeHtml(state.searchQuery)}" />
          <button type="button" data-action="close-search"><kbd>Esc</kbd></button>
        </div>
        <div id="global-search-results" class="search-results">${renderSearchResults(state.searchQuery)}</div>
      </section>
    </div>`;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      <div>
        <strong>${escapeHtml(t("siteName"))}</strong>
        <span>${escapeHtml(t("footerDisclaimer"))}</span>
      </div>
      <nav aria-label="Reference links">
        ${referenceLinks.map((link) => `<a href="${link.url}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("")}
      </nav>
    </footer>`;
}

function renderShell(content, current = "") {
  return `
    ${renderHeader()}
    ${renderSidebar(current)}
    <div class="site-frame">
      <main id="main-content" class="main-content">${content}</main>
      ${renderFooter()}
    </div>
    <div id="toast-region" class="toast-region" aria-live="polite"></div>
    ${renderSearchOverlay()}`;
}

function searchScore(entry, query) {
  const q = query.toLocaleLowerCase(state.lang === "zh" ? "zh-Hans" : "en").trim();
  if (!q) return 0;
  const primary = l(entry.name).toLocaleLowerCase();
  const alternate = l(entry.name, entry.name.en).toLocaleLowerCase();
  const internal = entry.internalName.toLocaleLowerCase();
  const body = `${stripTerrariaMarkup(l(entry.tooltip))} ${stripTerrariaMarkup(l(entry.description))} ${entry.sourcePath}`.toLocaleLowerCase();
  let score = 0;
  if (primary === q || internal === q) score += 100;
  if (primary.startsWith(q) || internal.startsWith(q)) score += 50;
  if (primary.includes(q)) score += 30;
  if (alternate.includes(q)) score += 20;
  if (internal.includes(q)) score += 25;
  if (body.includes(q)) score += 5;
  if (!entry.isInternal) score += 2;
  return score;
}

function renderSearchResults(query) {
  const clean = query.trim();
  if (!clean) {
    const featured = wikiData.progression.map((step) => byName.get(step.bossId)).filter(Boolean);
    return `<p class="search-caption">${escapeHtml(state.lang === "zh" ? "推荐：Boss 进度" : "Suggested: boss progression")}</p>${featured.slice(0, 7).map(searchResult).join("")}`;
  }
  const results = entries
    .map((entry) => [entry, searchScore(entry, clean)])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1] || l(a[0].name).localeCompare(l(b[0].name)))
    .slice(0, 40)
    .map(([entry]) => searchResult(entry))
    .join("");
  return results || `<div class="empty-state"><span>∅</span><p>${escapeHtml(t("noResults"))}</p></div>`;
}

function searchResult(entry) {
  return `<a class="search-result" href="${entryHref(entry)}">
    ${sprite(entry, "sm", entry.isBoss)}
    <span><strong>${escapeHtml(l(entry.name))}</strong><small>${escapeHtml(entry.internalName)} · ${escapeHtml(labelForKind(entry.kind))}${entryStage(entry) ? ` · ${escapeHtml(entryStage(entry))}` : ""}</small></span>
    <span aria-hidden="true">→</span>
  </a>`;
}

function statPill(value, label) {
  return `<div class="hero-stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function renderHome() {
  const bosses = wikiData.progression.map((step) => byName.get(step.bossId)).filter(Boolean);
  const portals = [
    ["weapons", wikiData.coverage.itemCategories.Weapons || 0, "✦"],
    ["armor", wikiData.coverage.itemCategories.Armor || 0, "◇"],
    ["accessories", wikiData.coverage.itemCategories.Accessories || 0, "◈"],
    ["materials", wikiData.coverage.itemCategories.Materials || 0, "⬢"],
    ["bosses", wikiData.coverage.bosses, "◆"],
    ["enemies", wikiData.coverage.enemies, "△"],
    ["world", wikiData.coverage.tiles + (wikiData.coverage.itemCategories.Placeable || 0), "▦"]
  ];
  const content = `
    <section class="home-hero">
      <div class="hero-stars" aria-hidden="true"></div>
      <div class="hero-copy">
        <span class="eyebrow">${escapeHtml(state.lang === "zh" ? "欢迎来到模组资料站" : "WELCOME TO THE MOD COMPENDIUM")} · v${escapeHtml(wikiData.meta.version)}</span>
        <h1>${escapeHtml(state.lang === "zh" ? "欢迎来到天星十三宫 Wiki" : "Welcome to the Thirteen Astral Courts Wiki")}</h1>
        <p>${escapeHtml(state.lang === "zh"
          ? "由模组源码同步生成的综合参考资料，收录从第一枚星游卵到世界界壁之外的 Boss、敌怪、装备、配方、掉落、流程与双语文本。"
          : "A comprehensive source-synchronized reference covering every boss, enemy, item, recipe, drop, progression step, and bilingual entry from the first astral egg to the world beyond the Boundary.")}</p>
        <button class="hero-search" type="button" data-action="search"><span aria-hidden="true">⌕</span><span>${escapeHtml(t("searchHint"))}</span><kbd>Ctrl K</kbd></button>
        <div class="hero-ctas">
          <a class="button button-primary" href="#/guide/getting-started">${escapeHtml(t("startHere"))}</a>
          <a class="button button-secondary" href="#/progression">${escapeHtml(t("viewProgression"))}</a>
        </div>
      </div>
      <div class="hero-emblem" aria-label="${escapeHtml(t("siteName"))}">
        <div class="emblem-core"><img src="./assets/brand/workshop.png" alt="" /></div>
        <div class="wiki-wordmark"><strong>${escapeHtml(t("siteName"))}</strong><span>THIRTEEN ASTRAL COURTS</span><small>${escapeHtml(state.lang === "zh" ? "星界档案 · 游戏资料百科" : "ASTRAL ARCHIVE · GAME ENCYCLOPEDIA")}</small></div>
      </div>
      <div class="hero-stat-row">
        ${statPill(wikiData.coverage.publicEntries, t("publicContent"))}
        ${statPill(wikiData.coverage.bosses, t("bosses"))}
        ${statPill(wikiData.coverage.itemCategories.Weapons || 0, t("weapons"))}
        ${statPill(wikiData.coverage.recipes, t("recipes"))}
      </div>
    </section>

    <section class="section-block progression-preview">
      <div class="section-heading"><div><span class="eyebrow">${escapeHtml(state.lang === "zh" ? "主线" : "MAIN ROUTE")}</span><h2>${escapeHtml(t("progression"))}</h2></div><a href="#/progression">${escapeHtml(t("viewProgression"))} →</a></div>
      <div class="boss-rail">
        ${bosses.map((boss, index) => `<a class="boss-rail-card" href="${entryHref(boss)}" style="--boss-accent:${boss.stage?.accent || "#81a7ff"}">
          <span class="rail-index">${String(index + 1).padStart(2, "0")}</span>
          ${sprite(boss, "lg", true)}
          <span><small>${escapeHtml(entryStage(boss))}</small><strong>${escapeHtml(l(boss.name))}</strong></span>
        </a>`).join("")}
      </div>
    </section>

    <section class="section-block">
      <div class="section-heading"><div><span class="eyebrow">${escapeHtml(state.lang === "zh" ? "资料门户" : "CONTENT PORTALS")}</span><h2>${escapeHtml(t("browseAll"))}</h2></div><a href="#/category/items">${escapeHtml(state.lang === "zh" ? "全部索引" : "Full index")} →</a></div>
      <div class="portal-grid">
        ${portals.map(([route, count, icon]) => {
          const config = CATEGORY_CONFIG[route];
          const samples = entries.filter(config.filter).filter((entry) => entry.image).slice(0, 4);
          return `<a class="portal-card" href="#/category/${route}">
            <div class="portal-top"><span class="portal-icon">${icon}</span><span class="portal-count">${count}</span></div>
            <h3>${escapeHtml(l(config.label))}</h3><p>${escapeHtml(l(config.description))}</p>
            <div class="portal-sprites">${samples.map((entry) => sprite(entry, "xs", entry.isBoss)).join("")}</div>
          </a>`;
        }).join("")}
      </div>
    </section>

    <section class="section-block split-feature">
      <article class="feature-panel feature-guide">
        <span class="eyebrow">${escapeHtml(state.lang === "zh" ? "指南" : "GUIDES")}</span>
        <h2>${escapeHtml(state.lang === "zh" ? "指南与流程" : "Guides and progression")}</h2>
        <p>${escapeHtml(state.lang === "zh" ? "查阅模组流程、四职业配装、七场 Boss 攻略与十三宫世界观资料。" : "Browse the mod progression, four-class setups, seven boss strategies, and the lore of all thirteen Courts.")}</p>
        <div class="link-list">${guideCatalog.map((guide) => `<a href="#/guide/${guide.id}"><span>${escapeHtml(l(guide.title))}</span><span>→</span></a>`).join("")}</div>
      </article>
      <article class="feature-panel data-panel">
        <span class="eyebrow">${escapeHtml(state.lang === "zh" ? "可核验资料" : "VERIFIABLE DATA")}</span>
        <h2>${escapeHtml(state.lang === "zh" ? "数据来源与版本" : "Data source and version")}</h2>
        <p>${escapeHtml(state.lang === "zh" ? `名称、Tooltip、基础数值、配方、掉落关系与贴图由 v${wikiData.meta.version} 源码自动同步；页面同时标记内部名与源码位置。` : `Names, tooltips, base stats, recipes, drop relations, and sprites are synchronized from the v${wikiData.meta.version} source, with internal names and source paths preserved.`)}</p>
        <dl class="coverage-list">
          <div><dt>${escapeHtml(state.lang === "zh" ? "贴图覆盖" : "Sprite coverage")}</dt><dd>${wikiData.coverage.images}/${wikiData.coverage.totalEntries}</dd></div>
          <div><dt>${escapeHtml(state.lang === "zh" ? "技术图鉴" : "Technical records")}</dt><dd>${wikiData.coverage.internalEntries}</dd></div>
          <div><dt>${escapeHtml(state.lang === "zh" ? "源码快照" : "Source snapshot")}</dt><dd>${new Date(wikiData.generatedAt).toLocaleDateString(state.lang === "zh" ? "zh-CN" : "en-US")}</dd></div>
        </dl>
      </article>
    </section>`;
  return renderShell(content, "");
}

function categoryEntries(slug, query) {
  const config = CATEGORY_CONFIG[slug] || CATEGORY_CONFIG.items;
  let result = entries.filter(config.filter);
  const text = query.get("q")?.trim().toLocaleLowerCase() || "";
  const subcategory = query.get("class") || "";
  const stage = query.get("stage") || "";
  if (text) {
    result = result.filter((entry) => `${l(entry.name)} ${entry.internalName} ${stripTerrariaMarkup(l(entry.tooltip))}`.toLocaleLowerCase().includes(text));
  }
  if (subcategory) result = result.filter((entry) => entry.subcategory === subcategory || entry.category === subcategory);
  if (stage) result = result.filter((entry) => entry.stage?.key === stage);
  return result.sort((a, b) => {
    const stageA = a.stage?.order ?? 999;
    const stageB = b.stage?.order ?? 999;
    return stageA - stageB || l(a.name).localeCompare(l(b.name), state.lang === "zh" ? "zh-CN" : "en");
  });
}

function renderCategory(slug, query) {
  const config = CATEGORY_CONFIG[slug] || CATEGORY_CONFIG.items;
  const allForCategory = entries.filter(config.filter);
  const filtered = categoryEntries(slug, query);
  const classes = [...new Set(allForCategory.map((entry) => entry.subcategory || entry.category).filter(Boolean))].sort();
  const stages = [...new Map(allForCategory.filter((entry) => entry.stage).map((entry) => [entry.stage.key, entry.stage])).values()].sort((a, b) => a.order - b.order);
  const cardMode = ["bosses", "enemies", "world", "buffs", "technical"].includes(slug);
  const content = `
    ${pageHero(l(config.label), l(config.description), `${allForCategory.length} ${t("entries")}`, slug === "bosses" ? "◆" : "✦")}
    <section class="category-toolbar" aria-label="${escapeHtml(t("filters"))}">
      <label class="filter-search"><span aria-hidden="true">⌕</span><input id="category-search" type="search" value="${escapeHtml(query.get("q") || "")}" placeholder="${escapeHtml(t("searchHint"))}" data-category="${escapeHtml(slug)}" /></label>
      ${classes.length > 1 ? `<label><span>${escapeHtml(state.lang === "zh" ? "类型" : "Type")}</span><select data-filter="class" data-category="${slug}"><option value="">${escapeHtml(t("all"))}</option>${classes.map((value) => `<option value="${escapeHtml(value)}"${query.get("class") === value ? " selected" : ""}>${escapeHtml(labelForClass(value) || labelForCategory(value))}</option>`).join("")}</select></label>` : ""}
      ${stages.length ? `<label><span>${escapeHtml(t("stage"))}</span><select data-filter="stage" data-category="${slug}"><option value="">${escapeHtml(t("all"))}</option>${stages.map((value) => `<option value="${escapeHtml(value.key)}"${query.get("stage") === value.key ? " selected" : ""}>${escapeHtml(l(value))}</option>`).join("")}</select></label>` : ""}
      <span class="result-count">${filtered.length} / ${allForCategory.length}</span>
    </section>
    <section class="category-results category-results-${escapeHtml(slug)}">
      ${filtered.length
        ? cardMode
          ? `<div class="entry-card-grid">${filtered.map(entryCard).join("")}</div>`
          : `<div class="entry-table-wrap">${entryTable(filtered)}</div>`
        : `<div class="empty-state large"><span>∅</span><h2>${escapeHtml(t("noResults"))}</h2><button class="button button-secondary" data-action="clear-category" data-category="${slug}">${escapeHtml(t("clearFilters"))}</button></div>`}
    </section>`;
  return renderShell(content, slug);
}

function pageHero(title, description, meta, symbol = "✦") {
  return `<section class="page-hero"><div class="page-hero-symbol" aria-hidden="true">${symbol}</div><div><span class="eyebrow">ENCYCLOPEDIA</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><span class="page-meta">${escapeHtml(meta)}</span></div></section>`;
}

function entryCard(entry) {
  const editorial = bossEditorial[entry.internalName];
  const description = editorial ? l(editorial.intro) : stripTerrariaMarkup(l(entry.description) || l(entry.tooltip)) || t("notDocumented");
  return `<a class="entry-card${entry.isBoss ? " boss-card" : ""}" href="${entryHref(entry)}"${entry.stage?.accent ? ` style="--entry-accent:${entry.stage.accent}"` : ""}>
    <div class="entry-card-visual">${sprite(entry, entry.isBoss ? "xl" : "lg", entry.isBoss)}${entry.isInternal ? `<span class="technical-badge">TECH</span>` : ""}</div>
    <div class="entry-card-body">
      <div class="entry-tags"><span>${escapeHtml(labelForKind(entry.kind))}</span>${entryStage(entry) ? `<span>${escapeHtml(entryStage(entry))}</span>` : ""}</div>
      <h2>${escapeHtml(l(entry.name))}</h2>
      ${entry.name.en && state.lang === "zh" ? `<small>${escapeHtml(entry.name.en)}</small>` : ""}
      <p>${escapeHtml(description)}</p>
      <span class="entry-card-link">${escapeHtml(state.lang === "zh" ? "查看条目" : "View entry")} →</span>
    </div>
  </a>`;
}

function entryTable(list) {
  return `<table class="entry-table">
    <thead><tr><th class="entry-image-column">${escapeHtml(state.lang === "zh" ? "图片" : "Image")}</th><th>${escapeHtml(state.lang === "zh" ? "条目" : "Entry")}</th><th>${escapeHtml(t("category"))}</th><th>${escapeHtml(t("stage"))}</th><th>${escapeHtml(t("statistics"))}</th></tr></thead>
    <tbody>${list.map((entry) => `<tr>
      <td class="entry-image-cell"><a href="${entryHref(entry)}" aria-label="${escapeHtml(l(entry.name))}">${sprite(entry, "sm", entry.isBoss)}</a></td>
      <td><a class="table-entry-name" href="${entryHref(entry)}"><span><strong>${escapeHtml(l(entry.name))}</strong><small>${escapeHtml(entry.internalName)}</small></span></a></td>
      <td>${escapeHtml(entry.subcategory ? labelForClass(entry.subcategory) : labelForCategory(entry.category))}</td>
      <td>${escapeHtml(entryStage(entry) || t("emptyValue"))}</td>
      <td>${compactStats(entry)}</td>
    </tr>`).join("")}</tbody>
  </table>`;
}

function compactStats(entry) {
  if (entry.internalName === "SuihuaManifoldArray") {
    return escapeHtml(state.lang === "zh" ? "消耗魔力 × 1.3 伤害 · 消耗全部当前魔力" : "Mana spent × 1.3 damage · consumes all current mana");
  }
  const stats = [];
  if (entry.stats.damage != null) stats.push(`${entry.stats.damage} ${t("damage")}`);
  if (entry.stats.defense != null) stats.push(`${entry.stats.defense} ${t("defense")}`);
  if (entry.stats.lifeMax != null) stats.push(`${formatValue(entry.stats.lifeMax)} ${t("health")}`);
  if (entry.stats.mana != null) stats.push(`${entry.stats.mana} ${t("mana")}`);
  return escapeHtml(stats.slice(0, 2).join(" · ") || t("emptyValue"));
}

function renderProgression() {
  const steps = wikiData.progression.map((step) => ({ ...step, boss: byName.get(step.bossId), summon: byName.get(step.summonItem) })).filter((step) => step.boss);
  const content = `
    ${pageHero(t("progression"), state.lang === "zh" ? "从世界邪恶生态到击破界壁，再踏入十三宫的纪元长卷。" : "From the world's evil biomes to the broken boundary and onward into the scroll of the Courts.", `${steps.length} ${t("bosses")}`, "⌁")}
    <div class="guide-notice"><span>i</span><p>${escapeHtml(t("guideNote").replace("{version}", wikiData.meta.version))}</p></div>
    <section class="progression-timeline">
      ${steps.map((step, index) => progressionStep(step, index)).join("")}
    </section>
    <section class="section-block next-paths"><div class="section-heading"><div><span class="eyebrow">${escapeHtml(state.lang === "zh" ? "继续查阅" : "KEEP READING")}</span><h2>${escapeHtml(t("guides"))}</h2></div></div><div class="guide-grid">${guideCatalog.slice(1).map(guideCard).join("")}</div></section>`;
  return renderShell(content, "progression");
}

function progressionStep(step, index) {
  const boss = step.boss;
  const summon = step.summon;
  const editorial = bossEditorial[boss.internalName];
  const previousWeight = index ? wikiData.progression[index - 1].weight : -Infinity;
  const gear = entries.filter((entry) => entry.kind === "item" && entry.stage?.order > previousWeight && entry.stage?.order <= step.weight && ["Weapons", "Armor", "Accessories", "Materials"].includes(entry.category)).slice(0, 8);
  return `<article class="progression-step" style="--entry-accent:${boss.stage?.accent || "#87a8ff"}">
    <div class="timeline-marker"><span>${String(index + 1).padStart(2, "0")}</span></div>
    <div class="progression-main">
      <div class="progression-title"><div><span class="eyebrow">${escapeHtml(entryStage(boss))}</span><h2><a href="${entryHref(boss)}">${escapeHtml(l(boss.name))}</a></h2><p>${escapeHtml(l(editorial?.intro) || l(boss.description))}</p></div>${sprite(boss, "xl", true)}</div>
      <div class="progression-detail-grid">
        <div><h3>${escapeHtml(state.lang === "zh" ? "如何挑战" : "How to challenge")}</h3><p>${richText(l(boss.spawnInfo) || t("notDocumented"))}</p>${summon ? `<a class="compact-entry" href="${entryHref(summon)}">${sprite(summon, "xs")}<span>${escapeHtml(l(summon.name))}</span><span>→</span></a>` : ""}</div>
        <div><h3>${escapeHtml(state.lang === "zh" ? "本阶段装备" : "Gear at this stage")}</h3>${gear.length ? `<div class="mini-entry-list">${gear.map((entry) => `<a href="${entryHref(entry)}" title="${escapeHtml(l(entry.name))}">${sprite(entry, "xs")}</a>`).join("")}</div>` : `<p>${escapeHtml(state.lang === "zh" ? "以同期原版装备和上一节点掉落为主。" : "Use contemporary vanilla gear and drops from the previous node.")}</p>`}</div>
      </div>
    </div>
  </article>`;
}

function renderEntry(id) {
  const entry = byId.get(id);
  if (!entry) return renderNotFound();
  const editorial = bossEditorial[entry.internalName];
  const lead = l(editorial?.intro) || l(entry.description) || l(entry.tooltip) || t("notDocumented");
  const related = relatedEntries(entry);
  const content = `
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/">${escapeHtml(t("home"))}</a><span>›</span><a href="#/category/${categorySlug(entry)}">${escapeHtml(labelForCategory(entry.category) || labelForKind(entry.kind))}</a><span>›</span><span>${escapeHtml(l(entry.name))}</span></nav>
    <article class="wiki-article">
      <header class="article-header">
        <div>
          <div class="entry-tags"><span>${escapeHtml(labelForKind(entry.kind))}</span>${entryStage(entry) ? `<span>${escapeHtml(entryStage(entry))}</span>` : ""}${entry.isInternal ? `<span>TECH</span>` : ""}</div>
          <h1>${escapeHtml(l(entry.name))}</h1>
          <p class="article-alias">${escapeHtml(state.lang === "zh" ? entry.name.en : entry.name.zh)} · ${escapeHtml(entry.internalName)}</p>
        </div>
        <button class="button button-quiet" type="button" data-action="copy-link">⌁ ${escapeHtml(t("copyLink"))}</button>
      </header>
      <div class="article-layout">
        <div class="article-body">
          <p class="article-lead">${escapeHtml(stripTerrariaMarkup(lead))}</p>
          ${entry.isInternal ? `<div class="technical-notice"><strong>${escapeHtml(t("technicalContent"))}</strong><p>${escapeHtml(state.lang === "zh" ? "此内容主要用于战斗实现或开发核对，游戏内通常不会作为独立百科条目出现。" : "This content primarily supports combat implementation or developer verification and normally has no standalone in-game encyclopedia entry.")}</p></div>` : ""}
          ${entry.kind === "item" ? renderItemBody(entry) : ""}
          ${entry.isBoss ? renderBossBody(entry, editorial) : ""}
          ${entry.kind === "npc" && !entry.isBoss ? renderNpcBody(entry) : ""}
          ${entry.kind === "buff" ? renderBuffBody(entry) : ""}
          ${entry.kind === "projectile" ? renderProjectileBody(entry) : ""}
          ${renderTechnicalSection(entry)}
          ${related.length ? `<section class="article-section"><h2>${escapeHtml(t("related"))}</h2><div class="related-grid">${related.map(relatedCard).join("")}</div></section>` : ""}
        </div>
        ${renderInfobox(entry)}
      </div>
    </article>`;
  return renderShell(content, categorySlug(entry));
}

function categorySlug(entry) {
  if (entry.isInternal) return "technical";
  if (entry.isBoss) return "bosses";
  if (entry.kind === "npc") return "enemies";
  if (entry.kind === "buff") return "buffs";
  if (["tile", "wall", "biome"].includes(entry.kind) || ["Placeable", "BossSummons", "Summons"].includes(entry.category)) return "world";
  if (entry.category === "Weapons") return "weapons";
  if (entry.category === "Armor") return "armor";
  if (entry.category === "Accessories") return "accessories";
  if (entry.category === "Materials") return "materials";
  return "items";
}

function renderItemBody(entry) {
  const tooltip = l(entry.tooltip);
  return `
    ${tooltip ? `<section class="article-section"><h2>${escapeHtml(t("mechanics"))}</h2><blockquote class="tooltip-box">${richText(tooltip)}</blockquote></section>` : ""}
    ${entry.recipes.length ? `<section class="article-section"><h2>${escapeHtml(t("recipes"))}</h2>${renderRecipes(entry)}</section>` : ""}
    ${entry.dropSources?.length ? `<section class="article-section"><h2>${escapeHtml(t("drops"))}</h2>${renderDropSources(entry)}</section>` : ""}
    ${entry.drops?.length ? `<section class="article-section"><h2>${escapeHtml(state.lang === "zh" ? "开启后获得" : "Contains")}</h2>${renderOutgoingDrops(entry)}</section>` : ""}
    ${!entry.recipes.length && !entry.dropSources?.length && !entry.drops?.length ? `<section class="article-section"><h2>${escapeHtml(t("acquisition"))}</h2><p>${escapeHtml(state.lang === "zh" ? "当前源码未在本物品类中声明配方或直接掉落关系；它可能由世界生成、任务或其他系统授予。" : "No recipe or direct drop relation is declared on this item class. It may come from world generation, a quest, or another system.")}</p></section>` : ""}`;
}

function renderRecipes(entry) {
  return `<div class="recipe-list">${entry.recipes.map((recipe, index) => `<article class="recipe-card"><header><strong>${escapeHtml(t("recipe"))} ${entry.recipes.length > 1 ? index + 1 : ""}</strong><span class="recipe-output">${sprite(entry, "xs")}<span><b>${escapeHtml(l(entry.name))}</b> ×${recipe.resultCount}</span></span></header><table><thead><tr><th>${escapeHtml(t("ingredient"))}</th><th>${escapeHtml(t("amount"))}</th></tr></thead><tbody>${recipe.ingredients.map((ingredient) => `<tr><td>${ingredientLink(ingredient)}</td><td>${ingredient.count}</td></tr>`).join("")}</tbody></table><footer><span><b>${escapeHtml(t("station"))}:</b> ${escapeHtml(humanize(recipe.station) || t("emptyValue"))}</span>${recipe.conditions.length ? `<span><b>${escapeHtml(t("condition"))}:</b> ${escapeHtml(recipe.conditions.map(humanize).join(", "))}</span>` : ""}</footer></article>`).join("")}</div>`;
}

function ingredientLink(ingredient) {
  const target = byName.get(ingredient.id);
  if (!ingredient.vanilla && target) return visualEntryLink(target, "inline-entry recipe-entry-link");
  const title = vanillaWikiTitle(ingredient.id);
  return externalWikiEntry({ label: title, pageTitle: title, imageTitle: title }, "recipe-entry-link");
}

function renderDropSources(entry) {
  return `<div class="data-table-wrap"><table class="data-table drop-table"><thead><tr><th>${escapeHtml(state.lang === "zh" ? "来源" : "Source")}</th><th>${escapeHtml(t("chance"))}</th><th>${escapeHtml(t("amount"))}</th><th>${escapeHtml(t("condition"))}</th></tr></thead><tbody>${entry.dropSources.map((drop) => {
    const source = byName.get(drop.source);
    const sourceLabel = source ? l(source.name) : drop.sourceLabel ? l(drop.sourceLabel) : humanize(drop.source);
    const externalSource = VANILLA_SOURCE_WIKI[drop.source];
    const sourceCell = source
      ? visualEntryLink(source, "drop-entry-link")
      : externalSource
        ? externalWikiEntry({ label: sourceLabel, ...externalSource }, "drop-entry-link")
        : escapeHtml(sourceLabel);
    return `<tr><td>${sourceCell}</td><td>${drop.chanceDenominator ? `1/${drop.chanceDenominator}` : "100%"}</td><td>${drop.minimum === drop.maximum ? drop.minimum : `${drop.minimum}–${drop.maximum}`}</td><td>${escapeHtml(drop.condition ? l(drop.condition) : t("emptyValue"))}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function renderOutgoingDrops(entry) {
  return `<div class="data-table-wrap"><table class="data-table drop-table"><thead><tr><th>${escapeHtml(state.lang === "zh" ? "物品" : "Item")}</th><th>${escapeHtml(t("chance"))}</th><th>${escapeHtml(t("amount"))}</th><th>${escapeHtml(t("condition"))}</th></tr></thead><tbody>${entry.drops.map((drop) => {
    const target = !drop.vanilla ? byName.get(drop.item) : null;
    const label = target ? l(target.name) : vanillaWikiTitle(drop.item);
    const itemCell = target
      ? visualEntryLink(target, "drop-entry-link")
      : externalWikiEntry({ label, pageTitle: label, imageTitle: label }, "drop-entry-link");
    return `<tr><td>${itemCell}</td><td>${drop.chanceDenominator ? `1/${drop.chanceDenominator}` : "100%"}</td><td>${drop.minimum === drop.maximum ? drop.minimum : `${drop.minimum}–${drop.maximum}`}</td><td>${escapeHtml(drop.condition ? l(drop.condition) : t("emptyValue"))}</td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function visualEntryLink(entry, className = "visual-entry-link", size = "xs") {
  return `<a class="${className}" href="${entryHref(entry)}">${sprite(entry, size, entry.isBoss)}<span>${escapeHtml(l(entry.name))}</span></a>`;
}

function externalWikiEntry({ label, pageTitle, imageTitle = pageTitle, provider = "terraria" }, className = "") {
  const wiki = EXTERNAL_WIKIS[provider];
  if (!wiki) return escapeHtml(label);
  const articleUrl = `${wiki.articleBase}${encodeURIComponent(pageTitle.replaceAll(" ", "_"))}`;
  return `<a class="external-entry external-wiki-entry ${className}" href="${articleUrl}" target="_blank" rel="noreferrer noopener"><span class="external-wiki-thumb" data-wiki-provider="${escapeHtml(provider)}" data-wiki-title="${escapeHtml(imageTitle)}" aria-hidden="true"><span>${escapeHtml(wiki.badge)}</span></span><span class="external-wiki-label">${escapeHtml(label)}</span><sup aria-hidden="true">↗</sup></a>`;
}

function renderBossBody(entry, editorial) {
  const mechanics = editorial?.mechanics?.[state.lang] || [];
  const drops = entries.filter((candidate) => candidate.dropSources?.some((source) => source.source === entry.internalName));
  return `
    <section class="article-section"><h2>${escapeHtml(state.lang === "zh" ? "召唤" : "Summoning")}</h2><p>${richText(l(entry.spawnInfo) || t("notDocumented"))}</p>${entry.summonItem && byName.get(entry.summonItem) ? `<a class="compact-entry wide" href="${entryHref(byName.get(entry.summonItem))}">${sprite(byName.get(entry.summonItem), "sm")}<span><strong>${escapeHtml(l(byName.get(entry.summonItem).name))}</strong><small>${escapeHtml(state.lang === "zh" ? "Boss 召唤物" : "Boss summon")}</small></span><span>→</span></a>` : ""}</section>
    ${mechanics.length ? `<section class="article-section"><h2>${escapeHtml(t("strategy"))}</h2><ol class="strategy-list">${mechanics.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section>` : ""}
    ${entry.difficulty?.life ? `<section class="article-section"><h2>${escapeHtml(t("difficulty"))}</h2>${difficultyTable(entry)}</section>` : ""}
    <section class="article-section"><h2>${escapeHtml(state.lang === "zh" ? "战利品与解锁" : "Loot and unlocks")}</h2>${drops.length ? `<div class="loot-grid">${drops.slice(0, 20).map(relatedCard).join("")}</div>` : `<p>${escapeHtml(state.lang === "zh" ? "战利品由普通掉落规则、专家宝藏袋与条件系统共同定义；当前自动索引未识别到可直接归属的物品。" : "Loot is shared across normal drop rules, Expert treasure bags, and conditional systems; the current automatic index found no directly attributable entries.")}</p>`}</section>`;
}

function difficultyTable(entry) {
  const life = entry.difficulty.life;
  const attacks = entry.difficulty.attacks || [];
  return `<div class="data-table-wrap"><table class="data-table difficulty-table"><thead><tr><th>${escapeHtml(state.lang === "zh" ? "项目" : "Metric")}</th><th>${escapeHtml(t("classic"))}</th><th>${escapeHtml(t("expert"))}</th><th>${escapeHtml(t("master"))}</th></tr></thead><tbody><tr><th>${escapeHtml(t("health"))}</th><td>${formatNumber(life.classic)}</td><td>${formatNumber(life.expert)}</td><td>${formatNumber(life.master)}</td></tr>${attacks.slice(0, 8).map((attack) => `<tr><th>${escapeHtml(humanize(attack.name))}</th><td>${attack.classic}</td><td>${attack.expert}</td><td>${attack.master}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderNpcBody(entry) {
  return `<section class="article-section"><h2>${escapeHtml(t("mechanics"))}</h2><p>${escapeHtml(stripTerrariaMarkup(l(entry.description) || t("notDocumented")))}</p></section>${entry.drops?.length ? `<section class="article-section"><h2>${escapeHtml(t("drops"))}</h2>${renderOutgoingDrops(entry)}</section>` : ""}`;
}

function renderBuffBody(entry) {
  return `<section class="article-section"><h2>${escapeHtml(t("mechanics"))}</h2><blockquote class="tooltip-box">${richText(l(entry.tooltip) || t("notDocumented"))}</blockquote><ul class="flag-list"><li><span>${escapeHtml(state.lang === "zh" ? "机制分类" : "Mechanic type")}</span><strong>${escapeHtml(entry.stats.debuff ? (state.lang === "zh" ? "减益" : "Debuff") : (state.lang === "zh" ? "增益 / 条件状态" : "Buff / conditional status"))}</strong></li><li><span>${escapeHtml(state.lang === "zh" ? "退出后保存" : "Persists on exit")}</span><strong>${escapeHtml(entry.stats.noSave ? (state.lang === "zh" ? "否" : "No") : (state.lang === "zh" ? "是" : "Yes"))}</strong></li></ul></section>`;
}

function renderProjectileBody(entry) {
  return `<section class="article-section"><h2>${escapeHtml(t("mechanics"))}</h2><p>${escapeHtml(stripTerrariaMarkup(l(entry.tooltip) || t("notDocumented")))}</p><p class="muted">${escapeHtml(state.lang === "zh" ? "弹幕的实际伤害通常由生成它的武器、敌怪或 Boss 传入，默认字段不代表最终游戏伤害。" : "A projectile's final damage is usually supplied by its weapon, enemy, or boss; defaults do not necessarily represent live combat damage.")}</p></section>`;
}

function renderTechnicalSection(entry) {
  return `<section class="article-section technical-section"><h2>${escapeHtml(state.lang === "zh" ? "资料核验" : "Data provenance")}</h2><div class="guide-notice compact"><span>✓</span><p>${escapeHtml(t("verifiedNote").replace("{version}", wikiData.meta.version))}</p></div><dl class="source-list"><div><dt>${escapeHtml(t("internalName"))}</dt><dd><code>${escapeHtml(entry.internalName)}</code></dd></div><div><dt>${escapeHtml(t("sourceFile"))}</dt><dd><code>${escapeHtml(entry.sourcePath)}</code></dd></div><div><dt>${escapeHtml(t("sourceSnapshot"))}</dt><dd>${escapeHtml(new Date(wikiData.generatedAt).toLocaleString(state.lang === "zh" ? "zh-CN" : "en-US"))}</dd></div></dl></section>`;
}

function renderInfobox(entry) {
  const statRows = statRowsForEntry(entry);
  return `<aside class="infobox" aria-label="${escapeHtml(t("statistics"))}">
    <header><span>${escapeHtml(labelForKind(entry.kind))}</span><h2>${escapeHtml(l(entry.name))}</h2></header>
    <div class="infobox-sprite">${sprite(entry, entry.isBoss ? "hero" : "xl", entry.isBoss)}</div>
    <dl>
      <div><dt>${escapeHtml(t("category"))}</dt><dd>${escapeHtml(entry.subcategory ? labelForClass(entry.subcategory) : labelForCategory(entry.category))}</dd></div>
      ${entryStage(entry) ? `<div><dt>${escapeHtml(t("stage"))}</dt><dd>${escapeHtml(entryStage(entry))}</dd></div>` : ""}
      ${statRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${formatValue(value)}</dd></div>`).join("")}
      <div><dt>${escapeHtml(t("version"))}</dt><dd>${escapeHtml(wikiData.meta.version)}</dd></div>
    </dl>
  </aside>`;
}

function statRowsForEntry(entry) {
  const s = entry.stats || {};
  const rows = [];
  if (s.lifeMax != null) rows.push([t("health"), s.lifeMax]);
  if (entry.internalName === "SuihuaManifoldArray") {
    rows.push([t("damage"), state.lang === "zh" ? "消耗魔力 × 1.3" : "Mana spent × 1.3"]);
  } else if (s.damage != null) {
    rows.push([entry.kind === "npc" ? (state.lang === "zh" ? "接触伤害" : "Contact damage") : t("damage"), s.damage]);
  }
  if (s.DamageType != null) rows.push([state.lang === "zh" ? "伤害类型" : "Damage class", labelForClass(s.DamageType)]);
  if (s.defense != null) rows.push([t("defense"), s.defense]);
  if (s.useTime != null) rows.push([t("useTime"), `${s.useTime} ${state.lang === "zh" ? "帧" : "ticks"}`]);
  if (entry.internalName === "SuihuaManifoldArray") {
    rows.push([t("mana"), state.lang === "zh" ? "全部当前魔力" : "All current mana"]);
  } else if (s.mana != null) {
    rows.push([t("mana"), s.mana]);
  }
  if (s.knockBack != null) rows.push([t("knockback"), s.knockBack]);
  if (s.rare != null) rows.push([t("rarity"), humanize(s.rare)]);
  if (s.value != null) rows.push([t("value"), s.value]);
  if (s.width != null && s.height != null) rows.push([t("dimensions"), `${s.width} × ${s.height}`]);
  if (s.timeLeft != null) rows.push([state.lang === "zh" ? "基础寿命" : "Base lifetime", `${s.timeLeft} ${state.lang === "zh" ? "帧" : "ticks"}`]);
  if (s.penetrate != null) rows.push([state.lang === "zh" ? "穿透" : "Penetration", s.penetrate]);
  return rows.slice(0, 12);
}

function formatValue(value) {
  if (value == null || value === "") return escapeHtml(t("emptyValue"));
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return escapeHtml(value ? (state.lang === "zh" ? "是" : "Yes") : (state.lang === "zh" ? "否" : "No"));
  if (typeof value === "object" && value.type === "coin") {
    const labels = state.lang === "zh"
      ? { platinum: "铂金币", gold: "金币", silver: "银币", copper: "铜币" }
      : { platinum: "platinum", gold: "gold", silver: "silver", copper: "copper" };
    return escapeHtml(["platinum", "gold", "silver", "copper"].filter((key) => value[key]).map((key) => `${value[key]} ${labels[key]}`).join(" ") || t("emptyValue"));
  }
  return escapeHtml(String(value));
}

function formatNumber(value) {
  return escapeHtml(Number(value).toLocaleString(state.lang === "zh" ? "zh-CN" : "en-US"));
}

function relatedEntries(entry) {
  return entries
    .filter((candidate) => candidate.id !== entry.id && !candidate.isInternal === !entry.isInternal && (candidate.category === entry.category || (candidate.stage?.key && candidate.stage.key === entry.stage?.key)))
    .sort((a, b) => {
      const sameCategory = Number(b.category === entry.category) - Number(a.category === entry.category);
      return sameCategory || Math.abs((a.stage?.order ?? 999) - (entry.stage?.order ?? 999)) - Math.abs((b.stage?.order ?? 999) - (entry.stage?.order ?? 999));
    })
    .slice(0, 6);
}

function relatedCard(entry) {
  return `<a class="related-card" href="${entryHref(entry)}">${sprite(entry, "sm", entry.isBoss)}<span><strong>${escapeHtml(l(entry.name))}</strong><small>${escapeHtml(entryStage(entry) || labelForCategory(entry.category))}</small></span></a>`;
}

function renderGuides() {
  const content = `${pageHero(t("guides"), state.lang === "zh" ? "先按流程找到方向，再进入条目核对事实与数值。" : "Use progression to find direction, then consult entries for exact facts and values.", `${guideCatalog.length} ${t("guides")}`, "☷")}<section class="guide-grid guide-index">${guideCatalog.map(guideCard).join("")}</section>`;
  return renderShell(content, "guides");
}

function guideCard(guide) {
  return `<a class="guide-card" href="#/guide/${guide.id}"><span class="guide-number">${String(guideCatalog.indexOf(guide) + 1).padStart(2, "0")}</span><div><h2>${escapeHtml(l(guide.title))}</h2><p>${escapeHtml(l(guide.summary))}</p></div><span aria-hidden="true">→</span></a>`;
}

function renderGuide(id) {
  const guide = guideCatalog.find((candidate) => candidate.id === id);
  if (!guide) return renderNotFound();
  let body = "";
  if (guide.dynamic === "class-setups") body = renderClassSetups();
  else if (guide.dynamic === "boss-strategies") body = renderBossStrategyIndex();
  else if (guide.dynamic === "lore") body = renderLoreGuide();
  else body = (guide.sections || []).map((section) => `<section class="article-section guide-section"><h2>${escapeHtml(l(section.heading))}</h2>${(section.paragraphs[state.lang] || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`).join("");
  const content = `<nav class="breadcrumbs"><a href="#/">${escapeHtml(t("home"))}</a><span>›</span><a href="#/guides">${escapeHtml(t("guides"))}</a><span>›</span><span>${escapeHtml(l(guide.title))}</span></nav><article class="guide-article"><header><span class="eyebrow">GUIDE</span><h1>${escapeHtml(l(guide.title))}</h1><p>${escapeHtml(l(guide.summary))}</p></header><div class="guide-notice"><span>i</span><p>${escapeHtml(t("guideNote").replace("{version}", wikiData.meta.version))}</p></div>${body}</article>`;
  return renderShell(content, "guides");
}

function renderClassSetups() {
  const stagedWeapons = entries.filter((entry) => entry.kind === "item" && entry.category === "Weapons" && entry.stage).sort((a, b) => a.stage.order - b.stage.order);
  const stages = [...new Map(stagedWeapons.map((entry) => [entry.stage.key, entry.stage])).values()].sort((a, b) => a.order - b.order);
  return `<section class="class-setup-list">${stages.map((stage) => `<article class="setup-stage"><header><span>${escapeHtml(l(stage))}</span><h2>${escapeHtml(state.lang === "zh" ? "四职业选择" : "Four-class options")}</h2></header><div class="class-columns">${["Melee", "Ranged", "Magic", "Summon"].map((damageClass) => {
    const weapons = stagedWeapons.filter((entry) => entry.stage.key === stage.key && entry.subcategory === damageClass);
    return `<section class="class-column class-${damageClass.toLowerCase()}"><h3>${escapeHtml(labelForClass(damageClass))}</h3>${weapons.length ? weapons.map((entry) => `<a class="compact-entry" href="${entryHref(entry)}">${sprite(entry, "xs")}<span>${escapeHtml(l(entry.name))}</span><span>→</span></a>`).join("") : `<p>${escapeHtml(state.lang === "zh" ? "使用同期原版装备或上一阶段掉落。" : "Use contemporary vanilla gear or drops from the previous tier.")}</p>`}</section>`;
  }).join("")}</div></article>`).join("")}</section>`;
}

function renderBossStrategyIndex() {
  return `<section class="boss-strategy-index">${wikiData.progression.map((step, index) => {
    const boss = byName.get(step.bossId);
    const editorial = bossEditorial[step.bossId];
    return `<article class="strategy-index-card" style="--entry-accent:${boss.stage?.accent || "#81a7ff"}">${sprite(boss, "xl", true)}<div><span class="eyebrow">${String(index + 1).padStart(2, "0")} · ${escapeHtml(entryStage(boss))}</span><h2><a href="${entryHref(boss)}">${escapeHtml(l(boss.name))}</a></h2><p>${escapeHtml(l(editorial?.intro))}</p><ul>${(editorial?.mechanics?.[state.lang] || []).slice(0, 2).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><a class="text-link" href="${entryHref(boss)}">${escapeHtml(state.lang === "zh" ? "完整条目与数值" : "Full entry and stats")} →</a></div></article>`;
  }).join("")}</section>`;
}

function renderLoreGuide() {
  return `<section class="lore-intro"><blockquote>${state.lang === "zh" ? "天垂其象，云槎渡汉；岁华如水，九垓无岸。<br />扶光未熄，华胥先梦；名归玉简，罪问璇衡。<br />霜旌蔽野，晏晖沉璧；玄缄既启，无何可归。" : "Omens descend; the cloud-skiff crosses the sky. Ages flow; the Nine Bounds have no shore.<br />Light is borne; Huaxu dreams before creation. Names return to jade; the balance weighs all.<br />The frost-banner veils the field; afterglow sinks with jade. The dark seal opens; nowhere remains to return."}</blockquote><p>${escapeHtml(state.lang === "zh" ? "十三宫的序位不可互换，二字宫号是诗性称谓而非全部职能的直白概括。当前剧情只正式揭示了部分宫主与使徒。" : "The Courts' order is fixed, and each two-character title is a poetic name rather than a literal job description. The current story formally reveals only some Lords and apostles.")}</p></section><section class="court-grid">${courtLore.map((court) => `<article><span>${escapeHtml(state.lang === "zh" ? court[0] : court[3])}</span><h2>${escapeHtml(state.lang === "zh" ? court[1] : court[4])}</h2><p>${escapeHtml(state.lang === "zh" ? court[2] : court[5])}</p></article>`).join("")}</section>`;
}

function renderAbout() {
  const content = `
    ${pageHero(t("about"), state.lang === "zh" ? "资料范围、自动同步、设计参考与版权说明。" : "Data scope, automatic synchronization, design references, and credits.", `v${wikiData.meta.version}`, "○")}
    <section class="about-grid">
      <article class="about-panel"><span class="eyebrow">${escapeHtml(state.lang === "zh" ? "资料范围" : "DATA SCOPE")}</span><h2>${escapeHtml(t("sourceVerified"))}</h2><p>${escapeHtml(state.lang === "zh" ? "站点从本地模组源码提取双语本地化、基础数值、配方、掉落引用、流程与原始贴图。开发原稿、构建产物、着色器源码和美术中间文件不会进入公开仓库。" : "The site extracts bilingual localization, base values, recipes, drop references, progression, and original in-game sprites. Design drafts, build artifacts, shader source, and art intermediates are excluded from the public repository.")}</p><dl class="coverage-list large"><div><dt>${escapeHtml(t("publicContent"))}</dt><dd>${wikiData.coverage.publicEntries}</dd></div><div><dt>${escapeHtml(t("technicalContent"))}</dt><dd>${wikiData.coverage.internalEntries}</dd></div><div><dt>${escapeHtml(t("recipes"))}</dt><dd>${wikiData.coverage.recipes}</dd></div><div><dt>${escapeHtml(state.lang === "zh" ? "同步贴图" : "Synchronized sprites")}</dt><dd>${wikiData.coverage.images}</dd></div></dl></article>
      <article class="about-panel"><span class="eyebrow">${escapeHtml(t("officialReferences"))}</span><h2>${escapeHtml(state.lang === "zh" ? "参考结构，不复制内容" : "Structural reference without copied content")}</h2><p>${escapeHtml(state.lang === "zh" ? "站点借鉴原版 Terraria Wiki 的内容门户、信息框与高密度百科结构，以及灾厄 Wiki 的月后进度、职业配装和 Boss 指南组织方式。配色、布局、文字与素材均围绕本模组重新设计。" : "The site borrows the content portals, infoboxes, and dense reference structure of the Terraria Wiki, plus the post-Moon-Lord progression, class setup, and boss-guide organization of the Calamity Wiki. Its palette, layout, copy, and assets are original to this mod.")}</p><div class="reference-list">${referenceLinks.map((link) => `<a href="${link.url}" target="_blank" rel="noreferrer"><span>${escapeHtml(link.label)}</span><span>↗</span></a>`).join("")}</div></article>
      <article class="about-panel full"><span class="eyebrow">GITHUB PAGES</span><h2>${escapeHtml(state.lang === "zh" ? "公开部署与更新" : "Public deployment and updates")}</h2><p>${escapeHtml(state.lang === "zh" ? "Wiki 使用独立仓库与 GitHub Actions 部署，不会公开 1.24 GiB 的模组开发目录。每次同步后都会执行条目唯一性、资源存在性、配方与七 Boss 进度校验。" : "The Wiki uses a separate repository and GitHub Actions deployment, keeping the 1.24 GiB mod-development directory private. Every sync validates entry uniqueness, assets, recipes, and the complete seven-boss route.")}</p><a class="button button-secondary" href="https://github.com/Tairitsu-Aya/ThirteenAstralCourts-Wiki" target="_blank" rel="noreferrer">GitHub ↗</a></article>
    </section>`;
  return renderShell(content, "about");
}

function renderNotFound() {
  const content = `<div class="empty-state not-found"><span>404</span><h1>${escapeHtml(state.lang === "zh" ? "这页卷册尚未写入" : "This page is not in the archive")}</h1><p>${escapeHtml(state.lang === "zh" ? "返回首页，或使用全文搜索寻找相关条目。" : "Return home or use full-text search to find a related entry.")}</p><a class="button button-primary" href="#/">${escapeHtml(t("home"))}</a></div>`;
  return renderShell(content, "");
}

function routeView() {
  const { segments, query } = parseRoute();
  if (!segments.length) return renderHome();
  if (segments[0] === "progression") return renderProgression();
  if (segments[0] === "category") return renderCategory(segments[1] || "items", query);
  if (segments[0] === "entry") return renderEntry(`${segments[1] || ""}/${segments.slice(2).join("/")}`);
  if (segments[0] === "guides") return renderGuides();
  if (segments[0] === "guide") return renderGuide(segments[1]);
  if (segments[0] === "about") return renderAbout();
  return renderNotFound();
}

function updateDocumentTitle() {
  const { segments } = parseRoute();
  let title = t("siteName");
  if (segments[0] === "entry") {
    const entry = byId.get(`${segments[1] || ""}/${segments.slice(2).join("/")}`);
    if (entry) title = `${l(entry.name)} · ${title}`;
  } else if (segments[0] === "category") {
    title = `${l((CATEGORY_CONFIG[segments[1]] || CATEGORY_CONFIG.items).label)} · ${title}`;
  } else if (segments[0] === "progression") title = `${t("progression")} · ${title}`;
  else if (segments[0] === "guide") {
    const guide = guideCatalog.find((candidate) => candidate.id === segments[1]);
    if (guide) title = `${l(guide.title)} · ${title}`;
  }
  document.title = title;
}

function hydrateSprites() {
  document.querySelectorAll(".sprite-box[data-frames]").forEach((box) => {
    const img = box.querySelector("img");
    const layout = () => {
      const frames = Math.max(1, Number(box.dataset.frames) || 1);
      const frameHeight = img.naturalHeight / frames;
      if (!img.naturalWidth || !frameHeight) return;
      const boxWidth = box.clientWidth || 64;
      const boxHeight = box.clientHeight || 64;
      const scale = Math.min(boxWidth / img.naturalWidth, boxHeight / frameHeight, 4);
      const width = img.naturalWidth * scale;
      const fullHeight = img.naturalHeight * scale;
      const visibleHeight = frameHeight * scale;
      img.style.width = `${width}px`;
      img.style.height = `${fullHeight}px`;
      img.style.left = `${(boxWidth - width) / 2}px`;
      img.style.top = `${(boxHeight - visibleHeight) / 2}px`;
    };
    if (img.complete) layout();
    else img.addEventListener("load", layout, { once: true });
  });
}

function normalizeWikiFileTitle(value) {
  return String(value || "").replaceAll("_", " ").trim();
}

function resolveWikiAlias(title, aliases) {
  let resolved = normalizeWikiFileTitle(title);
  const visited = new Set();
  while (aliases.has(resolved) && !visited.has(resolved)) {
    visited.add(resolved);
    resolved = aliases.get(resolved);
  }
  return resolved;
}

function applyExternalWikiThumbnail(node, source) {
  if (!node.isConnected) return;
  if (!source) {
    node.classList.add("is-missing");
    return;
  }
  const image = document.createElement("img");
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("load", () => node.classList.add("is-loaded"), { once: true });
  image.addEventListener("error", () => {
    image.remove();
    node.classList.add("is-missing");
  }, { once: true });
  image.src = source;
  node.append(image);
}

async function fetchExternalWikiThumbnails(provider, titles) {
  const wiki = EXTERNAL_WIKIS[provider];
  if (!wiki || !titles.length) return;
  for (let index = 0; index < titles.length; index += 40) {
    const batch = titles.slice(index, index + 40);
    const requestedFiles = batch.map((title) => `File:${title}.png`);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      origin: "*",
      redirects: "1",
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: "64",
      titles: requestedFiles.join("|")
    });
    try {
      const response = await fetch(`${wiki.apiUrl}?${params}`, {
        credentials: "omit",
        mode: "cors"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const aliases = new Map();
      for (const item of data.query?.normalized || []) {
        aliases.set(normalizeWikiFileTitle(item.from), normalizeWikiFileTitle(item.to));
      }
      for (const item of data.query?.redirects || []) {
        aliases.set(normalizeWikiFileTitle(item.from), normalizeWikiFileTitle(item.to));
      }
      const pages = new Map((data.query?.pages || []).map((page) => [
        normalizeWikiFileTitle(page.title),
        page.missing ? null : page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url || null
      ]));
      batch.forEach((title) => {
        const requestedFile = `File:${title}.png`;
        const resolvedFile = resolveWikiAlias(requestedFile, aliases);
        externalWikiThumbnailCache.set(`${provider}:${title}`, pages.get(resolvedFile) || null);
      });
    } catch (error) {
      console.warn(`Unable to load ${provider} wiki thumbnails`, error);
    }
  }
}

async function hydrateExternalWikiThumbnails() {
  const nodes = [...document.querySelectorAll(".external-wiki-thumb[data-wiki-provider][data-wiki-title]")];
  const pendingByProvider = new Map();
  nodes.forEach((node) => {
    const provider = node.dataset.wikiProvider;
    const title = node.dataset.wikiTitle;
    const key = `${provider}:${title}`;
    if (externalWikiThumbnailCache.has(key)) {
      applyExternalWikiThumbnail(node, externalWikiThumbnailCache.get(key));
      return;
    }
    if (!pendingByProvider.has(provider)) pendingByProvider.set(provider, new Set());
    pendingByProvider.get(provider).add(title);
  });
  await Promise.all([...pendingByProvider].map(([provider, titles]) => fetchExternalWikiThumbnails(provider, [...titles])));
  nodes.forEach((node) => {
    if (node.querySelector("img") || node.classList.contains("is-missing")) return;
    applyExternalWikiThumbnail(node, externalWikiThumbnailCache.get(`${node.dataset.wikiProvider}:${node.dataset.wikiTitle}`) || null);
  });
}

function render({ preserveScroll = false } = {}) {
  const scrollY = window.scrollY;
  app.innerHTML = routeView();
  updateDocumentTitle();
  hydrateSprites();
  void hydrateExternalWikiThumbnails();
  if (state.searchOpen) {
    requestAnimationFrame(() => {
      const input = document.querySelector("#global-search-input");
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    });
  }
  if (preserveScroll) window.scrollTo(0, scrollY);
}

function setCategoryQuery(category, key, value) {
  const { query } = parseRoute();
  if (value) query.set(key, value);
  else query.delete(key);
  const serialized = query.toString();
  location.hash = `#/category/${category}${serialized ? `?${serialized}` : ""}`;
}

function toast(message) {
  const region = document.querySelector("#toast-region");
  if (!region) return;
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  region.append(node);
  window.setTimeout(() => node.remove(), 2400);
}

document.addEventListener("click", async (event) => {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;
  const action = actionTarget.dataset.action;
  if (action === "search") {
    state.searchOpen = true;
    render({ preserveScroll: true });
  } else if (action === "close-search") {
    state.searchOpen = false;
    state.searchQuery = "";
    render({ preserveScroll: true });
  } else if (action === "lang") {
    state.lang = state.lang === "zh" ? "en" : "zh";
    localStorage.setItem("tac-wiki-lang", state.lang);
    document.documentElement.lang = state.lang === "zh" ? "zh-Hans" : "en";
    render({ preserveScroll: true });
  } else if (action === "theme") {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("tac-wiki-theme", state.theme);
    document.documentElement.dataset.theme = state.theme;
    render({ preserveScroll: true });
  } else if (action === "menu") {
    state.menuOpen = !state.menuOpen;
    render({ preserveScroll: true });
  } else if (action === "close-menu") {
    state.menuOpen = false;
    render({ preserveScroll: true });
  } else if (action === "clear-category") {
    location.hash = `#/category/${actionTarget.dataset.category}`;
  } else if (action === "copy-link") {
    try {
      await navigator.clipboard.writeText(location.href);
      toast(t("copied"));
    } catch {
      toast(location.href);
    }
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "global-search-input") {
    state.searchQuery = event.target.value;
    const results = document.querySelector("#global-search-results");
    if (results) {
      results.innerHTML = renderSearchResults(state.searchQuery);
      hydrateSprites();
    }
  }
  if (event.target.id === "category-search") {
    window.clearTimeout(event.target._routeTimer);
    event.target._routeTimer = window.setTimeout(() => setCategoryQuery(event.target.dataset.category, "q", event.target.value.trim()), 220);
  }
});

document.addEventListener("change", (event) => {
  const select = event.target.closest("select[data-filter]");
  if (select) setCategoryQuery(select.dataset.category, select.dataset.filter, select.value);
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
    event.preventDefault();
    if (!state.searchOpen) {
      state.searchOpen = true;
      render({ preserveScroll: true });
    }
  }
  if (event.key === "Escape" && (state.searchOpen || state.menuOpen)) {
    state.searchOpen = false;
    state.menuOpen = false;
    state.searchQuery = "";
    render({ preserveScroll: true });
  }
});

window.addEventListener("hashchange", () => {
  state.searchOpen = false;
  state.menuOpen = false;
  state.searchQuery = "";
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
});

if (!location.hash) history.replaceState(null, "", "#/" + location.search);
render();
