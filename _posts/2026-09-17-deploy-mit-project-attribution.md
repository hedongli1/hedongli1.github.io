---
layout: post
title: 把别人的 MIT 项目部署到自己的 Pages：一次踩坑与署名义务的完整记录
date: 2026-09-17 14:00:00 +0800
tags: [GitHub Pages, Next.js, 开源许可, MIT, 部署]
---

我把一个别人的项目部署到了自己的 GitHub Pages 上：**[大模型世界](https://hedongli1.github.io/ai-model-world/)** —— 一个把 556 个大模型拟人化成像素小人的可视化站点。

项目是 **[程序员鱼皮（liyupi）](https://github.com/liyupi) 的 [ai-model-world](https://github.com/liyupi/ai-model-world)**，MIT 协议。

这件事看起来很简单（clone → 构建 → push → 开 Pages），但里面有两个部分值得完整记下来：**一个把我带偏了半小时的构建坑**，和**一件比技术更重要的事——署名义务**。

---

## 一、先说结论：改动只有 3 个文件

既然是"部署别人的项目"，我给自己划了条线：**只做部署适配，不碰任何业务代码**。

最终改了三处：

| 文件 | 改动 |
| :--- | :--- |
| `.github/workflows/deploy.yml` | **新增**，Pages 部署流水线 |
| `.github/workflows/sync.yml` | **加一步**，数据更新后触发重新部署 |
| `README.md` | **顶部加署名横幅** |

`src/`、`scripts/`、`data/`、视觉、文案——**一行没动**。

---

## 二、坑：`NODE_ENV=development` 会让 `next build` 崩溃

这是我这次唯一真正卡住的地方，而且**它的报错信息把我带向了完全错误的方向**。

### 现象

用 GitHub Pages 需要的子路径构建：

```bash
NEXT_BASE_PATH=/ai-model-world npm run build
```

报错：

```
Error occurred prerendering page "/_global-error"
TypeError: Cannot read properties of null (reading 'useContext')
```

### 我的第一反应（错的）

`useContext` 为 null → 经典症状是 **React 多副本冲突**。查了一遍：

- `node_modules/react` 只有一个副本
- `react` / `react-dom` 都是 19.2.8，与 `next@16.3.3` 的 peer 范围兼容

没冲突。那会不会是 **basePath 本身有 bug**？毕竟子路径部署确实容易出问题。

### 救了我的一步：跑基线

在动手回滚之前，我做了一件事——**不加 basePath，原样构建一次**：

```bash
npm run build    # 不设 NEXT_BASE_PATH
```

**一样失败，错误一字不差。**

这一步是决定性的：basePath 与错误无关，问题在更底层。

### 真因

回头看我自己做过什么。为了让 npm 装上 devDependencies（`vite`、`tsx` 这些构建必需的包），我设过：

```bash
export NODE_ENV=development
```

而 **`next build` 必须在 production 模式下运行**。development 模式下 React 的运行时走的是另一套分支，预渲染内置的 `/_global-error` 页时就会拿到 null context。

取消这个变量，构建立刻通过：

```
✓ Compiled successfully in 16.2s
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /chronicle
├ ○ /credits
├ ○ /leaderboard
├ ○ /leaderboard/all
├   /model/[slug]
│ ├ ● /model/ai21-jamba-large
│ └ ● [+553 more paths]
...
```

**教训：** 报错信息说的是"哪儿炸了"，不是"为什么炸"。**跑一次不做任何改动的基线**，是区分"我的改动引入的"与"本来就有的"最快的方法——我差点因为不跑基线而错误回滚一个完全正确的改动。

---

## 三、第二个坑：浅克隆推不上去

`git push` 被拒，报：

```
remote: fatal: did not receive expected object 7034f894...
error: 远程解包失败：index-pack failed
```

原因很隐蔽：我最初用 `git clone --depth 1` 克隆（为了快）。**浅克隆的版本库缺少历史对象**，虽然本地看起来一切正常，但推送时远端解包会失败。

重来一次完整克隆（21 个提交、5.3 MB），一次成功。

**教训：** 要推送到新远端时，**别用浅克隆**。

---

## 四、更重要的部分：署名义务

这才是"二次开源"里真正需要动脑子的地方。

### 先看许可证

MIT 允许修改、分发、甚至商用。但 MIT 有一条约定义务：

> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

**必须保留版权声明和许可全文。**

### 但这个项目更复杂

MIT 只覆盖**代码**。而 ai-model-world 的仓库里还有三类资产，各有各的许可证：

| 内容 | 来源 | 许可 |
| :--- | :--- | :--- |
| 像素角色素材 | Universal LPC Spritesheet Generator | CC0 / OGA-BY 3.0 |
| 中文字体 | Fusion Pixel Font | SIL OFL 1.1 |
| 模型数据 | Epoch AI / models.dev / LiveBench | CC-BY 4.0 / MIT / Apache-2.0 |

项目自己的 `NOTICE.md` 写得很清楚：

> **再分发本仓库或其衍生作品时需保留该署名文件。**

而且 `assets/lpc/CREDITS.md` 有 **82703 字节**——逐条列出 269 个素材、35 位作者、各自的采用许可与上游链接。

### 我的处理

1. **一个署名文件都没删**：`LICENSE`、`NOTICE.md`、`CREDITS.md`、`OFL.txt`、`LICENSES/` 全部原样保留
2. **README 顶部加署名横幅**，写明：

> 原作者：程序员鱼皮（liyupi）
> 上游仓库：liyupi/ai-model-world
> 本仓库是部署副本，代码文案数据视觉均出自原作者
> 本副本只做了一件事：GitHub Pages 部署适配
> **若你只是想看这个项目，请优先访问上游仓库**

3. **顺着原仓库的历史推送**（21 个提交全部保留），而不是压成一个"initial commit"——这样作者的每一次贡献在 `git log` 里都还在

### 我的判断标准

> **如果一个访客只看到我的仓库，他能不能正确地知道"这是谁做的"？**

如果答案是"不知道"或者"以为是你做的"，那就是署名没做到位。

---

## 五、两个自动化的细节

### 1. 数据同步：`GITHUB_TOKEN` 推送不触发其他 workflow

上游有个 `sync.yml`，每天两次抓 Epoch AI / models.dev / LiveBench / Hugging Face，把快照提交回仓库。

上游是靠 Vercel / EdgeOne 收到 push 后自动重建的。但 **GitHub Pages 这套不行**——GitHub 官方文档明确：

> With the exception of `workflow_dispatch` and `repository_dispatch`, other `GITHUB_TOKEN`-triggered events do not create workflow runs at all.

也就是说，`sync.yml` 用 `GITHUB_TOKEN` 提交数据后，**`deploy.yml` 不会自动跑**。结果会是："数据每天同步成功，站点永远停在旧快照"——而且**没有任何报错**。

补的一步：

```yaml
- name: 数据有更新时触发重新部署
  if: success()
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    if git diff --quiet HEAD~1 HEAD -- data/ 2>/dev/null; then
      echo "本次未提交数据变更，跳过部署触发"
      exit 0
    fi
    gh workflow run deploy.yml --repo "${{ github.repository }}" --ref main
```

### 2. 子路径部署的前置断言

站点挂在 `/ai-model-world/` 而不是域名根目录，所以要靠 basePath。**如果 basePath 没生效，整站会 404**。

这类问题部署完才发现太浪费，所以在部署前加了一道断言：

```yaml
- name: 检查产物
  run: |
    if ! grep -q '/ai-model-world/_next' .next-build/index.html; then
      echo "::error::index.html 里找不到 /ai-model-world/_next 前缀，basePath 没生效，中止部署"
      exit 1
    fi
    echo "✅ basePath 前缀检查通过"
```

**便宜的断言放在前面**，比部署完再排查划算得多。

---

## 六、最终状态

```
614 个静态页面 · 418 MB 产物 · 构建约 25 秒
https://hedongli1.github.io/ai-model-world/
```

产物走 Actions artifact 投递，**不进 git**——所以仓库本身很轻（5.3 MB）。

抽查过的页面与资源（全部 200）：

- 首页 / 榜单 / 时间线 / credits / 模型详情 / 厂商页
- `_next` 下的 JS、CSS、精灵图 PNG、中文字体 woff2

---

## 七、如果你也想这么做

1. **先看许可证**。MIT / Apache-2.0 可以，GPL 要看你怎么分发，**没有 LICENSE 的默认是"保留所有权利"**（即使代码公开）。
2. **看有没有 NOTICE / CREDITS**。第三方素材、字体、数据往往不在主许可证覆盖范围内。
3. **保留全部署名**，别嫌文件大（这个项目光素材署名就 82 KB）。
4. **顺着原仓库历史推**，别压成一个 commit。
5. **README 里写清楚"这不是我做的"**，并引导读者去上游。
6. **只做部署适配，别顺手改业务代码**。想改就去上游提 issue/PR，而不是在这里分叉出一份。

最后一条尤其重要：**你部署它，是因为它已经做得足够好；既然足够好，就没有理由在你的副本里改成另一个样子。**

---

- 部署副本：https://hedongli1.github.io/ai-model-world/
- 上游项目：https://github.com/liyupi/ai-model-world
- 原作者：[程序员鱼皮](https://github.com/liyupi)
