# 天星十三宫 Wiki

《天星十三宫》模组的双语静态资料站。站点从相邻的模组源码中提取玩家可见条目、数值、本地化、配方、掉落关系与原始贴图，再由 Vite 构建为可直接发布到 GitHub Pages 的静态文件。

## 本地运行

```powershell
npm install
npm run sync
npm run dev
```

默认源码目录是同级的 `../ThirteenAstralCourts`。也可以通过环境变量 `THIRTEEN_ASTRAL_COURTS_SOURCE` 指向其他源码快照。

## 内容更新

```powershell
npm run sync
npm run validate
npm run build
```

`sync` 只复制 Wiki 需要的结构化数据与游戏内已存在贴图，不复制 `.artwork`、`_sprite_work`、`bin`、`obj`、着色器源码或内部设计原稿。生成的数据快照位于 `src/data/wiki-data.json`，公开贴图位于 `public/assets/content`。

## 发布

仓库包含 GitHub Pages 工作流。推送到 `main` 后，工作流构建 `dist` 并发布为 Pages artifact。站点使用 Hash 路由，因此可在 GitHub Pages 项目子路径下直接刷新和分享条目链接。

## 资料与版权

- 游戏内条目、中文与英文文本、贴图及世界观内容来自《天星十三宫》模组源码快照。
- 站点的信息架构借鉴 Terraria Wiki 与 Calamity Mod Wiki 的分类、信息框、进度和指南组织方式；未复制其页面文本或美术素材。
- Terraria 与相关商标归 Re-Logic 所有。本 Wiki 为非官方模组资料站。
