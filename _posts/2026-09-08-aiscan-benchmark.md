---
layout: post
title: 让安全扫描工具「被验证」：aiscan 从能扫到 30 个漏洞样本 F1=100% 的经过
date: 2026-09-08 10:00:00 +0800
tags: [安全, DevSecOps, 开源, Node.js, 静态分析, 工具]
---

很多安全工具的 README 会写「支持检测 200+ 漏洞类型」「AI 智能识别」——但你怎么知道它真能扫出来？我也曾被这类话术噎住：**工具说自己准，但它到底准在哪？**

这篇文章讲我给 [aiscan](https://github.com/hedongli1/aiscan) 补上「可测量」的一课：用一套带标注的漏洞样本做**真实基准**，把 precision / recall 摆到台面上。能做到什么程度，数字说了算。

## 一、问题：demo 能扫出来 ≠ 真能扫出来

最早 aiscan 的验证方式很朴素：`fixtures/demo.js` 埋了十来个漏洞，能检出就说明工具是好的。但这有 2 个明显坑：

1. **demo 是我们自己写的**，等于自问自答，测不出意外情况；
2. **只测「找得到」**，测不出「会不会误报」——漏报和误报是同等严重的问题。

后来我真实去扫描 [ledger-app](https://github.com/hedongli1/ledger-app) 和 [purple-team-lab](https://github.com/hedongli1/purple-team-lab) 时，工具果然对我「全绿」的自信泼了冷水：`innerHTML = userHtml` 这种真实写法它根本没认出来（旧规则只认 `req`/`query`/`input` 等固定变量名），`"lodash": "*"` 这种未锁版本也没报警。**demo 全过，真实场景漏报**——这就是「自证式验证」的局限。

## 二、方案：ground-truth 基准，让数字说话

我给 aiscan 加了一套**可复现的基准**（`benchmark/`）：

```
fixtures/bench/          ← 每个漏洞类型一个独立小文件（真实写法）
benchmark/manifest.json  ← 标注：每个样本「应该命中哪条规则」「哪行」「哪些不该命中」
benchmark/bench.js       ← 跑一轮，对比扫描结果与标注，算 precision/recall
```

这套基准最狠的地方在于**同时配了正例和反例**：

- **正例**：SSRF（`fetch(target)`）、开放重定向、`createCipheriv('aes-128-ecb')`、jQuery 的 `.html()`、Vue 的 `v-html`、React 的 `dangerouslySetInnerHTML`、JWT 硬编码 secret、`preinstall: curl | bash` 投毒脚本……
- **反例**：`fetch(\`/api/users/${id}\`)` 相对路径不该报 SSRF、`randomBytes(32)` 不该报弱随机、`v-text` 不该报 XSS、`process.env.JWT_SECRET` 不该报硬编码——**专门防止规则做得太宽松而误报**。

每个样本都精确标到**行号、期望命中的规则 ID**，基准一跑，偏一点都藏不住。

## 三、被基准「逼」出来的修复

这套基准不是装门面——它真的暴露并逼修了几个问题（每个都带根因）：

| 版本 | 修复 | 基准暴露 | 根因 |
|---|---|---|---|
| v0.5.0 | XSS 规则 | `innerHTML = userHtml` 漏报 | 旧规则只认固定变量名，真实代码变量名任意 |
| v0.5.0 | DEPS-PIN-ANY | `"lodash": "*"` 漏报 | 旧规则只匹配 `^` 前缀，漏掉 `*` 未锁版本 |
| v0.6.0 | 新增 9 类规则 | SSRF/重定向/AES-ECB·CBC/硬编码 IV/框架 XSS/JWT/投毒脚本全部漏报 | 规则库本就没有这些真实高频类目 |
| v0.6.0 | SSRF 规则 | `fetch(\`/api/users/${id}\`)` 误报 | 模板插值判断过宽，补反例修正 |

## 四、一个更隐蔽的坑：HTTP 200 的「404 徽章」

运营 aiscan 时还踩了个跟扫描无关但很有代表性的坑——主页上的 GitHub 数据徽章。原来的 stats 图走 `github-readme-stats.vercel.app`，某天开始裂图。排查后发现：

- shields.io / github.com 都通，唯独 vercel 那个服务不可达（HTTP 000）；
- 更隐蔽的是 `dynamic/users` 这种**错误的动态类型名**——它返回的 SVG 内容其实是「404: badge not found」，但 **HTTP 状态码是 200**，只看状态码根本验不出来。

后来我们改成内容级验证（抓 SVG、看里面有没有 `not found`），才真正兜住。这也是做工具的一个道理：**验证方式本身也要经得起验证**。

## 五、现在的数字（可以自己复现）

```
真正例 TP: 30    假阳性 FP: 0    漏报 FN: 0
precision: 100.0%   recall: 100.0%   F1: 100.0%
```

- 31 个单元测试全部通过
- aiscan 扫描自身源码：0 发现，评分 100/A（dogfooding）
- demo 漏洞文件：检出 14 项（7 critical / 6 high / 1 medium）
- 基准已接入 CI，任何改动让 precision / recall 掉下来就 fail

跑法在 [aiscan](https://github.com/hedongli1/aiscan) 仓库里写得很清楚：`node benchmark/bench.js`。欢迎拉下来自己验一遍——**数字是公开的，验证路径也是公开的**。

## 六、小结

给工具做「可测量」这件事，收益率比想象得高：

- 它逼你去面对真实场景，而不是 demo 自嗨；
- 它把「准不准」从营销话术变成了**可回归的工程指标**；
- 它反过来约束规则质量——加规则必须配样本，否则 CI 会挂。

如果你也在写扫描器/质检类工具，强烈建议补一套 ground-truth 基准。**先定义什么算「对」，再谈怎么扫。**

相关阅读：[aiscan-action-debug：把安全扫描接进 GitHub Actions 的过程](https://hedongli1.github.io/2026/08/26/aiscan-action-debug/)