---
layout: post
title: 把 GitHub 个人主页做成一款实时数据仪表盘
date: 2026-09-08 11:00:00 +0800
tags: [GitHub, 个人主页, shields, 开源, 前端]
---

GitHub 个人主页（profile README）是程序员的「门面」——面试官、同行、机会方第一眼看到的地方。但也是**最容易翻车**的地方：我之前的首页就挂着几张裂掉的图（一张「GitHub Stats」卡片加载不出来，只剩破图占位，观感很差）。

这周我把它重做了一版，顺带踩了一堆坑，记录在这里。

## 一、裂图的根因，比想象中隐蔽

原来的 stats 图走的是 `github-readme-stats.vercel.app`。某天开始加载不出来，我用 curl 一测：

```
https://github-readme-stats.vercel.app/api?...   → HTTP 000（超时/不可达）
https://github.com/hedongli1                      → HTTP 200 ✅
https://img.shields.io/...                         → HTTP 200 ✅
```

**只有那一个服务不可达**——而它是主页 stats 图的唯一数据源，图就裂了。这给我一个教训：**第三方图片服务是主页最脆弱的依赖**，它的可用性不在你的掌控里。

解决办法：全换成 **shields.io 的实时徽章**。shields 是业界最稳的徽章服务，它支持直接抓 GitHub API 服务器端渲染（`/github/stars/xxx`、`/github/followers/xxx`），浏览器端零外部依赖：

```
<img src="https://img.shields.io/github/followers/hedongli1?style=for-the-badge">
```

这样「关注者」「总 Star」「公开仓库数」都是实时数据，且不依赖任何会被墙/挂掉的服务。

## 二、更隐蔽的坑：HTTP 200 的假徽章

换徽章时我又踩了个更狡猾的坑。我一开始用了 `dynamic/users` 这种类型名：

```
https://img.shields.io/badge/dynamic/users?url=...&query=public_repos
```

用 `curl -o /dev/null -w "%{http_code}"` 一测，**返回 200**——我以为成功了。直到用浏览器截图渲染，才发现那两个徽章显示的是 **「404: badge not found」**。

原因：shields 的动态类型名写错了（正确是 `dynamic/json`，不是 `dynamic/users`），shields 会返回一张写着「badge not found」的 SVG，**但 HTTP 状态码还是 200**。只看状态码验不出问题，必须**抓 SVG 内容**看里面是不是真数据。

从那以后我养成了习惯：所有越**验证徽章/图片，都抓实际内容、grep `not found` / `rate limit`，而不是只看状态码**。

## 三、主页结构怎么排

重做后的主页 README 分四块，每块一个明确作用：

| 区块 | 作用 |
|---|---|
| **顶部导航徽章**（Blog / Trending Radar / aiscan） | 让访客第一眼知道「这个人做什么」+ 关键入口 |
| **Focus 定位行** | 一行说清方向：Security · AI Engineering · DevOps |
| **Featured Projects 表格** | 用表格展示项目：做什么 / 技术栈 / 在线地址，信息密度高 |
| **实时数据徽章** + Let's Connect | 关注者/Star 实时数据 + 联系方式收尾 |

几个细节：
- 徽章之间加 `&nbsp;` 间距，避免挤成一团；
- Activity 区用 `for-the-badge` 大徽章、顶部用 `flat` 小徽章，分区有层次；
- 项目表加在线入口列（`➜ Board / Repo / Blog`），降低跳转成本。

## 四、给同样想优化主页的人一句话

1. **别用单一第三方图片服务做核心数据**——换成 shields 这种稳定的，或干脆用服务器端实时徽章；
2. **验证徽章要抓内容，不能只看 HTTP 200**；
3. **主页不是越花越好**：清晰展示「你是谁、做什么、项目在哪」，就是好的门面。

想看效果可以直接访问我的 [GitHub 主页](https://github.com/hedongli1)，或者看这套思路是怎么落到 [aiscan](https://github.com/hedongli1/aiscan) 和 [trending-radar](https://github.com/hedongli1/trending-radar) 上的。

> 顺带一提：两枚 shields 实时徽章现在也挂在 [aiscan](https://github.com/hedongli1/aiscan) 和 [trending-radar](https://github.com/hedongli1/trending-radar) 的 README 顶部，作为「存活证明」——项目是否在维护、有没有人用，一眼可见。