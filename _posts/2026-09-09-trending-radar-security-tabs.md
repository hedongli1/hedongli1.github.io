---
layout: post
title: 用 GitHub Actions 自动追踪「加密流量检测」和「AI 攻防」方向
date: 2026-09-09 10:00:00 +0800
tags: [GitHub, GitHub Actions, 自动化, 安全, DevSecOps, 开源]
---

我的 [trending-radar](https://github.com/hedongli1/trending-radar) 是个免费白嫖 GitHub Actions 的自动化看板：每天定时抓取开源热门项目，按 Star 自动排序，再部署到 GitHub Pages 给人看。之前它有 4 个榜单（全站 Top / 黑马 / 活跃 / AI·LLM 榜），这周我给它在**安全方向**上加了 2 个新榜单：

- 🔐 **加密流量检测**：mitmproxy、AdGuardHome、dnscrypt 这类做 TLS 审计、加密 DNS、流量分析的仓库
- ⚔️ **AI 自动化攻防**：h4cker、PurpleLlama、Cybersecurity AI 这类用 AI 做攻防/做安全评估的仓库

这篇文章讲讲背后的原理，以及这过程中踩的两个"看不见"的坑——其中一个直接导致线上看板**三个月没更新**却没被任何人发现。

## 一、整套东西的原理（一句话）

> **GitHub Actions 里的定时任务 → 每天两次调用 GitHub 官方搜索 API → 按 Star 降序把结果落成 JSON → 存档 + 自动部署到 Pages → 网页 tab 展示。**

没有任何自建服务器，纯白嫖 GitHub 的免费算力。新增 2 个榜单，本质就是给抓取脚本加了两组关键词 + 看板加了两个 tab。

```
定时触发(cron 08:30/22:14) → 调 Search API → 按 Star 排序 → JSON 落盘 → push → pages.yml 自动部署 → 看板 6 tab
```

## 二、实现细节：只有两处改动

**1）抓取脚本 `fetch-trending.js`，给每个榜单加一组搜索关键词：**

```js
secTraffic: await fetchCategory('安全 · 加密流量检测',
  `"encrypted traffic" OR "traffic analysis" OR mitmproxy OR
   "encrypted dns" OR dnscrypt OR sniffer stars:>200 pushed:>30天前`, 'stars', 'desc', 40)
```

**2）看板 `index.html`，加两个 tab 按钮：**

```html
<button data-cat="secTraffic">🔐 安全 · 加密流量检测</button>
<button data-cat="secAiCyber">⚔️ 安全 · AI 自动化攻防</button>
```

看板 JS 是动态读取 `dataset.categories[currentCat]` 的，所以**只要数据里有这两个分类，tab 点了就能用**，不用改渲染逻辑。

## 三、坑 #1：GitHub 搜索的括号陷阱

加榜单时我踩了个很迷惑的坑。先单个词测：

```
mitmproxy stars:>200        → 43 个结果 ✅
"traffic analysis" stars:>200 → 17 个结果 ✅
```

但把这些词组合起来、包上括号：

```
("encrypted traffic" OR "traffic analysis" OR mitmproxy) stars:>200  → 0 个结果 ❌
```

**GitHub 搜索不支持 `(A OR B)` 带括号的 qualifier 组合**——一包括号结果就归零。去掉括号、裸 OR 拼接就立刻正常：

```
"encrypted traffic" OR "traffic analysis" OR mitmproxy stars:>200   → 62 个结果 ✅
```

这个坑的代价是：第一次上线的数据全是个空榜单，看板上只有 0 条。**建议任何写 GitHub 搜索查询的别忘了这点。**

## 四、坑 #2（最隐蔽）：代码早就推上去了，线上三个月没更新

这是最值得记的一个教训。加完双榜单我推送后，仓库 `main` 分支一看**已经是 6 个 tab 的最新代码**，数据文件也含新分类——我以为上线了。结果线上页面怎么刷都是老的 4 tab。

排查发现，真正的坑在这：

| 检查对象 | 结果 |
|---|---|
| 仓库 `main` 分支代码 | ✅ 已有 6 tab |
| 线上 `hedongli1.github.io/trending-radar/` | ❌ 还是老 4 tab |
| **Pages 构建历史** | **0 条——这个仓库从来没成功部署过！** |

也就是说，trending-radar 的看板页面压根没有 Pages 构建记录，每次数据更新都只是把 JSON 提交回了 main 分支，**页面本身一直是某个很早期的手动版本**。而我的 aiscan 仓库却有 23 次 Pages 构建记录稳播正常——对比就明白了：trending-radar 缺了 `pages.yml` 自动部署步骤。

修复就是补一个标准的部署 workflow，每次 push 到 main 强制构建部署 `docs/`：

```yaml
on:
  push:
    branches: [main]          # 每次推 main 触发
jobs:
  build:
    steps:
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3   # 打包 docs/
  deploy:
    needs: build
    steps:
      - uses: actions/deploy-pages@v4            # 部署到 Pages
```

部署 workflow 跑通（success）之后，线上立刻变成 6 tab 新版。

## 五、教训复盘

1. **"代码推上去了" ≠ "线上生效了"**。对 GitHub Pages 站点，先查 `/pages/builds` 构建记录，再下结论。
2. **验证要看线上实际内容，不能只看仓库代码**。这次如果一开始就 curl 线上页面 grep 关键词，一秒就发现没更新，而不是埋头排查半天的代码。
3. GitHub Action 这类"部署通道"是隐性的，**仓库健康度检查要覆盖"推送→构建→部署"完整链路**，缺一环就要排查。

## 六、想看效果？

- 看板地址：[https://hedongli1.github.io/trending-radar/](https://hedongli1.github.io/trending-radar/) —— 顶部第 5、6 个 tab 就是新加的
- 🔐 加密流量检测：40 个仓库（mitmproxy 44964⭐ 居首）
- ⚔️ AI 自动化攻防：20 个仓库（h4cker 29337⭐、PurpleLlama、Cybersecurity AI 居前）

所有数据都是 GitHub 官方 API 每天定时抓的真实值，没有人工填充；数字和你打开时 GitHub 页面差几颗星，是因为榜单是**抓取时刻的快照**，不是造假。

---

如果你也想做类似的东西——用 GitHub Actions 白嫖定时任务 + Pages 免费托管一个自动更新的看板，这几个文件可以参考：`scripts/fetch-trending.js`（抓取）、`.github/workflows/trending.yml`（定时）、`.github/workflows/pages.yml`（部署）、`docs/index.html`（看板）。