---
layout: post
title: 我的 GitHub Action 上线第一天就失败了：aiscan 接入 ledger-app 排障记
date: 2026-08-26 15:30:00 +0800
tags: [GitHub Actions, 安全, DevSecOps, 排障, 开源]
---

前天写的 [aiscan](https://github.com/hedongli1/aiscan)（AI 辅助代码安全审计）今天正式接入我的真实项目 [ledger-app](https://github.com/hedongli1/ledger-app)。

结果——**上线第一天，CI 就红了。**

这篇文章完整记录这次"实弹失败 → 定位 → 修复 → 转绿"的过程。没有编造，全是真实日志。

## 一、接入

在 ledger-app 加了一个 workflow：

```yaml
name: aiscan-security
on:
  push:
  pull_request:
  schedule:
    - cron: "0 2 * * *"   # 每日凌晨 2 点自动扫

jobs:
  security-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - name: aiscan 静态安全扫描
        uses: hedongli1/aiscan@v1
        with:
          path: server/src
          severity: low
          fail-on: high
```

一行 `uses:` 就把 aiscan 接进来了。推送后 GitHub 立刻跑起来。

## 二、红了一年

等了两分钟，**aiscan-security FAILED**。日志：

```
##[error]aiscan found 1 finding(s) at or above high severity
##[error]Process completed with exit code 1.
```

在它扫描 server/src 的结果里：

```json
{
  "ruleId": "INJ-SQL-CONCAT",
  "severity": "critical",
  "title": "SQL 注入：字符串拼接查询",
  "file": "routes.js",
  "line": 43
}
```

**我的 aiscan 在 GitHub 云端成功报出了我另一个项目的 SQL 拼接告警，然后 fail-on=high 把构建拦下来了。**

等等——这个问题我前天不是已经人工复核过、确认是**白名单常量拼接**（`conds` 全是服务端硬编码片段，用户输入全部 `?` 占位符），并且加了 `.aiscanignore` 吗？为什么还在报？

## 三、定位：aiscan 的 bug

我把 ledger-app 的 `.aiscanignore` 打开看：

```gitignore
node_modules/
server/src/routes.js
```

ignore 里明明写了忽略 routes.js。但 aiscan 在 `server/src` 目录运行时，它去**当前目录**（server/src）找 `.aiscanignore`，那个目录下没有—— ignore 文件在 **仓库根**。

**根因：aiscan 的 CLI 默认从 cwd 读 `.aiscanignore`，而我的 Action 先 `cd server/src` 再扫描，导致仓库根的忽略规则没被加载。**

这是我自己的 bug。排障过程：

```
本地复现（从 server/src 扫，不带 ignore）: 1 finding, 84/B
本地复现（带 ignore-file 指向仓库根）  : 0 finding, 100/A
```

复现成功，方向明确。

## 四、修复

给 aiscan 加了 `--ignore-file` 参数：

```js
// scanner.js
async function loadIgnoreList(ignoreFilePath) {
  // 优先用显式指定的 ignore 文件（Action 场景）
  if (ignoreFilePath) { try { text = await fs.readFile(ignoreFilePath, 'utf8') } catch {} }
  // 回退到 cwd 查找
  if (text === null) { text = await fs.readFile(path.join(process.cwd(), '.aiscanignore'), 'utf8') }
}
```

Action 里从仓库根加载：

```bash
IGNORE_FILE="$GITHUB_WORKSPACE/.aiscanignore"
cd "$GITHUB_WORKSPACE/server/src"
aiscan.js . --ignore-file="$IGNORE_FILE"
```

**顺手还修了一个隐患**：GitHub 已经弃用 `::set-output`（报 warning，未来会禁用），我改用了新的 `$GITHUB_ENV` 机制。

然后把 `v1` tag 移到修复后的 commit，让所有 `uses: hedongli1/aiscan@v1` 自动拿到修复。

## 五、转绿

重新触发，**aiscan-security ✅ + CI ✅ 双绿**：

```
✅ Set up job
✅ Run actions/checkout@v4
✅ aiscan 静态安全扫描
SARIF 上传: outcome=success
```

## 六、这件事的价值

1. **aiscan 证明了自己**：在云端真实扫出 SQL 拼接告警 → fail-on 拦截 → 返回证据
2. **ignore 机制经受真实考验**：子目录扫描 vs 仓库根 ignore 的边界，不是我想当然那样
3. **"真实使用"是开源项目最好的调试器**：如果我只是本地 `npm test`，永远不会踩到 Action 里 cwd 变化的坑

## 七、收获给读者

- **GitHub Action 复合动作里 `uses:` 引用的 tag 不会自动跟随**，修复发布后要记得 `git tag -f v1`
- **`.aiscanignore` 这类配置的加载基准**（cwd vs 仓库根）是真实项目最常见的坑，设计时要想清楚
- **fail-on 门禁的价值**：不是让 CI 一直绿，而是让"该被拦下的问题"真的拦下来、然后排障

---

项目：[aiscan](https://github.com/hedongli1/aiscan) · MIT · 欢迎 Star
排障完整记录：[ledger-app workflow](https://github.com/hedongli1/ledger-app/actions)