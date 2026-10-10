# lbx's Blog

一个 Java 后端开发者的个人博客 —— 记录、思考、与技术同行。

基于 **Astro 5** 构建，视觉围绕「极光玻璃」展开：深邃夜空底色上漂浮极光光斑与液态玻璃卡片，GSAP 驱动全站动效，暗色模式优先，注重可访问性与性能。

线上地址：`https://lbx-ux.github.io`

## ✨ 功能

### 浏览体验
- **首页**：Hero 液态玻璃主卡 + 文章列表（按「专栏顺序 → 专栏内顺序」层级展示）+ 专栏速览
- **文章页**：标题 / 日期 / 阅读时长 / 目录（TOC 滚动高亮）/ Shiki 双主题代码高亮 + 一键复制 / 上一篇·下一篇 / 相关文章推荐
- **沉浸式阅读**：一键进入无干扰阅读模式，文章 GSAP Flip 动画移至屏幕中央，支持 Esc / 按钮 / 点击遮罩三种退出方式，退出后恢复原滚动位置
- **全局搜索**：任意页面按 `Ctrl+K`（Mac `⌘K`）呼出命令面板，构建时生成 JSON 索引，客户端加权模糊匹配，零后端
- **关于页 / 404**：统一的玻璃视觉
- **返回顶部 / 阅读进度条 / 导航栏智能隐藏**

### 内容与 SEO
- **RSS 全文输出**（`/rss.xml`）、**sitemap**、`robots.txt`
- **Open Graph / Twitter 卡片**、JSON-LD 结构化数据（BlogPosting / Person / WebSite）
- **草稿支持**：`draft: true` 的文章构建时排除，不会公开
- **暗色 / 浅色主题**：localStorage 记忆 + 系统偏好跟随 + 防首帧闪烁 + 视图过渡后主题保持

### 工程化
- **无障碍**：跳转正文链接、`focus-visible` 焦点环、对比度 ≥ 4.5:1、`prefers-reduced-motion` 全面适配
- **响应式**：375 / 768 / 1440 宽度全适配
- **动效**：GSAP 3.13（ScrollTrigger / SplitText / Flip / Observer），页面切换用 Astro ClientRouter + `astro:page-load` 重放入场动画

## 🚀 快速开始

```bash
npm install
npm run dev       # http://localhost:4321
```

## 📋 命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm run build` | 构建到 `dist/` |
| `npm run preview` | 预览构建产物 |
| `npm run og` | 重新生成 `public/og-default.png`（默认分享图） |

## ✍️ 写作

在 `src/content/blog/` 新建 `.md` 文件：

```yaml
---
title: 文章标题
description: 一句话摘要（用于列表卡片与 SEO）
pubDate: 2026-08-31
series: 专栏名        # 可选，发布后台自动推导
order: 1             # 可选，专栏内位置（后台拖拽排序自动维护）
# draft: true        # 可选，草稿构建时排除
---

正文 Markdown……
```

## 🗂 上传发布后台（本地工具）

本博客配套一个**本地运行的发布后台**（零依赖 Node 脚本，仅绑定 `127.0.0.1`，不对公网暴露），通过**拖拽上传**发布文章：

- 拖入 `.md` 笔记与图片（或点击「选择文件 / 选择文件夹」；选文件夹会保留目录结构）
- 专栏与序号**按上传的目录路径自动推导**（如 `Java后端/数据库/Redis/…` → Redis 专栏），可在发布弹窗手改
- 自动完成：Obsidian 语法清洗（`![[嵌入]]`、callout、双链等）、图片配对落盘与压缩（限宽 + PNG→WebP 择优，可用 `scripts/admin/config.json` 的 `imageMaxWidth` / `imageQuality` 调整）、frontmatter 补全、slug 生成
- 正文里引用但未随笔记上传的图片会留「缺图」注释占位，手动把图片放进 `public/covers/<slug>/` 后改回链接即可
- 已发布文章管理：按专栏分组展示；**拖拽排序**（拖专栏标题栏调专栏顺序、拖文章调专栏内顺序，主页与专栏页同步）；**在线编辑正文与元信息** / 下架转草稿 / 删除
- 专栏顺序存于 `src/content/series-order.json`（后台拖动自动写入）

启动方式：双击 `scripts/admin/启动发布后台.bat`，或：

```bash
node scripts/admin/server.mjs   # http://127.0.0.1:8799
```

> 端口等配置存于 `scripts/admin/config.json`（已 gitignore，不会上传）。

## 📦 部署到 GitHub Pages

1. **创建 GitHub 仓库**：在 GitHub 新建仓库（如 `blog`；若用 `<用户名>.github.io` 作为仓库名则是用户主页站）
2. **修改站点配置**：
   - [astro.config.mjs](astro.config.mjs)：`SITE` 改为 `https://<用户名>.github.io`；`BASE` 用户页仓库保持 `/`，普通仓库改为 `/<仓库名>/`（同步修改 [src/consts.ts](src/consts.ts) 的 `BASE_PATH`）
3. **推送代码**：

   ```bash
   git init
   git add .
   git commit -m "init: lbx's blog"
   git branch -M main
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin main
   ```

4. **开启 Pages**：仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**
5. 推送到 `main` 后，[.github/workflows/deploy.yml](.github/workflows/deploy.yml) 自动构建部署；也可以在 Actions 页手动触发（`workflow_dispatch`）
   > ⏸ 部署目前**已冻结**：workflow 只保留手动触发。恢复自动部署：把 deploy.yml `on:` 里的 push 触发加回来即可。
6. 部署完成后访问 `https://<用户名>.github.io/<仓库名>/`

> 🔒 注意：`scripts/admin/` 完全独立于构建产物，不会被部署；`config.json` 已在 `.gitignore` 中排除。

## 🛠 技术栈

| 层 | 技术 |
| --- | --- |
| 框架 | Astro 5（静态输出，Content Collections） |
| 动效 | GSAP 3.13（ScrollTrigger / SplitText / Flip / Observer / ScrollTo） |
| 视觉 | 液态玻璃引擎（SVG displacement 折射，Chromium 专属，其余浏览器自动降级为 CSS 毛玻璃） |
| 代码高亮 | Shiki（浅色 one-light / 暗色 one-dark-pro 双主题） |
| 字体 | Outfit / Noto Sans SC / JetBrains Mono（@fontsource 自托管） |
| 部署 | GitHub Pages + GitHub Actions |

## 📁 目录结构

```
├─ astro.config.mjs          # 站点配置（site / base / sitemap / shiki）
├─ scripts/
│  ├─ generate-og.mjs        # OG 分享图生成（sharp）
│  ├─ import-notes.mjs       # CLI 笔记导入
│  └─ admin/                 # 本地发布后台（http 服务 + 前端）
├─ src/
│  ├─ consts.ts              # 站点单一配置源（站名 / 作者 / 社交链接）
│  ├─ content.config.ts      # 文章集合 schema
│  ├─ content/blog/          # 文章（Markdown）
│  ├─ layouts/               # BaseLayout / PostLayout
│  ├─ components/            # Header / PostCard / Toc / Footer ...
│  ├─ lib/                   # GSAP 动效编排 / 液态玻璃引擎 / 工具
│  ├─ scripts/site.ts        # 客户端引导（主题 / 生命周期）
│  └─ styles/                # 设计 token / prose 样式
├─ public/                   # 静态资源（favicon / og 图 / covers）
└─ .github/workflows/        # Pages 自动部署
```

## 📄 许可

文章内容采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 协议分享，转载请附原文链接；站点代码仅供学习参考。
