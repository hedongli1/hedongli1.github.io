---
layout: post
title: 做逆向工程动向雷达时，我踩的四个 GitHub 搜索陷阱
date: 2026-09-17 20:00:00 +0800
tags: [GitHub, GitHub Actions, 逆向工程, 自动化, 开源, API]
---

我又给自己加了一个常驻机器人：[reverse-radar](https://github.com/hedongli1/reverse-radar) —— **逆向工程动向雷达**，每天追踪二进制逆向 / 协议逆向方向的开源新晋与飙升项目。

看板在这里：**https://hedongli1.github.io/reverse-radar/**

搭起来不难，难的是**让搜索结果别跑歪**。这篇记录四个坑，每个都是实测撞出来的——而且其中三个会静默地毁掉数据，不报错、不中断，只是让你拿到一堆看似合理的垃圾。

---

## 先说结论：为什么不做「热榜」

我已有的 [trending-radar](https://hedongli1.github.io/trending-radar/) 是全站热榜。做逆向雷达时我第一反应是照抄，但想清楚一件事就放弃了：

**按总 Star 排序对逆向工程这个领域毫无信息量。**

Ghidra 78131 星、ImHex 54822 星、x64dbg 49531 星——这个头部十年没动过。你第一次打开看完，之后再也不会打开第二次。

所以要的不是「谁最热」，而是「**这一周什么在动**」。

但这里立刻撞上第一个硬约束：

> **GitHub Search API 只返回当前 Star 数，不返回历史。**

没有历史就算不出增量。所以雷达必须自建快照：每天存一份 `{仓库: 星数}`，一周后才有东西可减。这意味着 **雷达上线第一周是瞎的**——这是物理限制，绕不过去。

顺带一个必须守住的纪律：**快照必须每天同一时刻拍**。时刻漂移，7 天的差值就失真。

---

## 坑 1：同类型限定符不能用 OR

这是最要命的一个——**它会让整个 workflow 变红**。

我想让查询同时覆盖两个 topic：

```
topic:proxy OR topic:mitmproxy
```

返回：

```json
{"message": "Validation Failed",
 "errors": [{"message": "The search contains only logical operators (AND / OR / NOT) without any search terms"}]}
```

**裸词 OR 合法，限定符 OR 不合法。** 实测：

| 查询 | 结果 |
| :--- | :--- |
| `frida OR ghidra in:name,description stars:>100` | ✅ 340 条 |
| `topic:proxy OR topic:mitmproxy` | ❌ 422 报错 |

注意报错信息很有误导性——它说"没有搜索词"，但你的查询里明明有词。真正的意思是"你有 OR，但两边的词都被限定符吃掉了"。

---

## 坑 2：括号会让 `in:` 静默失效（这个更危险）

如果我加个括号想"整理一下逻辑"：

```
(hooking OR mitmproxy) in:name,description
```

它**不报错**，返回 **151987 条**。

对比正确写法：

```
hooking OR mitmproxy in:name,description
```

返回 **1392 条**。

差了 100 倍。因为括号打断了限定符的作用域，`in:name,description` 直接失效，等于在全站裸搜。

**这个坑比坑 1 危险得多**：坑 1 会报错，你能立刻发现；坑 2 会给你一份 15 万条的数据，看板上一切正常，只是里面全是垃圾。我是对比了两个写法的 `total_count` 才发现的。

---

## 坑 3：「hooks」这个词被两个圈子劫持了

`hooking` 是逆向工程的正当术语。但它同时是：

- **前端圈**的核心词：`(hooking OR mitmproxy) stars:>100` 的 **top1 是 react-use（44076 星）**，top3 是 alibaba/hooks（14972 星）
- **AI Agent 圈**的核心词：Claude Code / Codex 把生命周期回调叫 hooks

第二个是我上线后才发现的。第一版「最新发现」榜单里混进了这些：

```
Yuzzyuk/marketing-os              AI 营销 skill
Jakeschincariol/linkedin-agent-skill  AI 领英运营 skill
lennney/stop-that-shit            AI coding agent 的 hook 守卫
big0lives/codex-task-pointer      Codex 任务指针
```

**一个逆向雷达，推给你一堆 AI 营销工具。** 而且它不报错——`hooking` 确实出现在这些仓库的描述里。

修法是双管齐下：查询层把 `hooking` 换成领域词 + 双词 AND（`wechat hook`、`douyin sign`），过滤层加黑名单。

**这里我犯了个二次错误**：黑名单一开始加了 `mcp-server` / `mcp-` 模式，结果把 `ida-mcp-server`、`apktool-mcp-server`、`jadx-ai-mcp` 这些**正经逆向工具全杀了**。

**MCP 是接口，不是领域。** 2026 年逆向工具挂 MCP 接口是主流做法，拦掉它们等于自断经脉。已经撤销。拦截量从 34 条降到 14 条。

教训：黑名单要拦的是「领域无关」，不是「形态不同」。

---

## 坑 4：`topic:` 是作者自己填的，乱打严重

我原以为 `topic:reverse-engineering` 是最精准的查询。实测挂这个 topic 的仓库里有：

| 仓库 | 星数 | 实际是什么 |
| :--- | ---: | :--- |
| `Tyrrrz/YoutubeDownloader` | 16k | YouTube 下载器 |
| `librepods-org/librepods` | 29k | AirPods 第三方工具 |
| `JCodesMore/ai-website-cloner-template` | 34k | AI 网站克隆模板 |
| `xtekky/gpt4free` | 66k | LLM 越狱代理 |

它们挂 `reverse-engineering` 是因为确实"逆"了点什么（YouTube 的 API、AirPods 的协议），但**不是逆向工程工具**。而因为 Star 高，它们会牢牢占据榜单前排。

所以纯 topic 查询必须再过一道**语义校验**：名字或描述里得真的出现逆向相关词。实测这一道淘汰了 **173 条**挂错标签的噪音。

同一类问题的还有 awesome-list：

```
topic:reverse-engineering 的 top1 是 Awesome-Hacking（120606 星）
```

star 天然高的清单类会系统性挤掉真工具。但我没有删它们——**awesome 清单是人工整理的领域索引，很有价值**。做法是单开一个「资源清单」分区，让它们待在那边而不占主榜。

---

## 最终形态

```
每日 UTC 02:07
    ↓
fetch.js       多词表 × 多查询抓取 → 去噪 → 入库
    ↓
snapshot/      每日 Star 快照（算增速的唯一依据，保留 90 天）
    ↓
insight.js     对比 7 天前基线 → 增量榜 / 新面孔 / 飙升告警
    ↓
report-issue.js → 滚动周报 issue
    ↓
GitHub Pages
```

几个设计取舍：

- **cron 定在 UTC 02:07**：避开已有的 00:30 / 14:14 / 17:00 三班，也避开整点（GitHub 官方明说整点是全球 cron 排队高峰，任务可能被丢弃）
- **用内置 `GITHUB_TOKEN` 而非个人 PAT**：内置 token 每次运行自动生成、永不过期，个人凭据轮换不会影响自动化
- **issue 用滚动单条而非每天新建**：这个领域每天只有 1-2 条新料，每天开一条 issue 三个月后就是上百条要手动关。只有「7 天涨破 1000 星」的异常信号才单独开告警
- **词表外置到 `keywords.json`**：改词不改代码

看板主视图我选了 **7 日涨星榜**而不是日榜——实测这个领域近 7 天新建且 ≥10 星的仓库只有 12 个，日榜会天天显示"今天没新东西"，看三天你就不想再打开了。

---

## 一句总结

写 GitHub 搜索查询时，**括号、OR、限定符三者的相互作用是不报错的**。唯一可靠的验证方式是：**改动前后各跑一次，对比 `total_count`**。数字不对，说明查询早就跑歪了。

这件事没有文档能替你确认。

---

- 雷达看板：https://hedongli1.github.io/reverse-radar/
- 源码：https://github.com/hedongli1/reverse-radar
- 姊妹项目：[trending-radar](https://github.com/hedongli1/trending-radar) · [aiscan](https://github.com/hedongli1/aiscan)
