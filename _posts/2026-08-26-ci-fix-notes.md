---
layout: post
title: 给项目加 CI 时，我修了两个真实 bug
date: 2026-08-26 10:00:00 +0800
tags: [CI, 工程实践, 测试, Node.js, GitHub Actions]
---

给 [purple-team-lab](https://github.com/hedongli1/purple-team-lab) 和 [ledger-app](https://github.com/hedongli1/ledger-app) 接 GitHub Actions 的这半天，比写业务代码收获更大——**因为 CI 把两个平时根本不会暴露的真实问题"逼"了出来。**

这篇文章记录问题是什么、为什么平时发现不了、怎么修的。所有结论都可以在仓库里复现。

## 问题一：`npm test` 会把进程挂死

### 现象

在本地跑 `cd server && npm test`（`node --test`），测试用例全部通过，但**命令永远不结束**，进程卡住直到被 `timeout` 杀掉。

### 根因

`server/src/index.js` 里有这样一段：

```js
// 仅直接运行时监听端口（测试时由测试代码自己起服务）
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT);
}
```

测试文件（`test/api.test.js`）本身是标准写法：

```js
before(async () => {
  server = app.listen(0);              // 测试自己起服务，端口 0 = 随机端口
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());           // 只关掉自己起的那台
```

问题就在这：**如果 `NODE_ENV` 不是 `'test'`，`index.js` 在顶层就 `app.listen(3100)` 起了一台监听 3100 的服务**。测试自己的 `app.listen(0)` 是另一台（随机端口）。`after()` 只关掉随机端口那台，**3100 那台没人关 → Node 事件循环永远有活动 handle → `node --test` 进程永不退出。**

为什么"平时发现不了"？因为大部分人的 shell 里 `NODE_ENV` 是空的，`undefined !== 'test'` 成立，所以一直触发这个隐藏分支。而一旦你把 `NODE_ENV=test` 显式设了，就绕过了。

### 修复

```json
// server/package.json
"test": "NODE_ENV=test node --test"
```

让测试命令自己带上 `NODE_ENV=test`，测试时不监听固定端口。**修复后 `npm test` 干净退出，exit code 0。**

## 问题二：`package-lock.json` 绑死了内网镜像，CI 直接 403

### 现象

push 之后，GitHub Actions 里所有 job 的 `npm ci` 全部失败：

```
npm error 403 Forbidden - GET https://npm.mirrors.qihoo.net/.../vue-router-4.6.4.tgz
```

### 根因

我的开发机配置了全局 npm 镜像（`~/.npmrc` 指向内网源）。`npm install` 生成的 `package-lock.json` 里，每个包的 `resolved` 字段**全是指向内网镜像的 URL**：

```json
"resolved": "https://npm.mirrors.qihoo.net/repository/qihoo-npm/express/-/express-4.22.2.tgz"
```

本地开发正常，因为本机可以访问内网镜像。但 GitHub Actions 的 runner 在公网，访问不到 → 403 → `npm ci` 失败。**本地测试通过 ≠ CI 能跑通**，这是最典型的一课。

### 修复

删掉 lockfile 重新生成，指向官方源：

```bash
rm -rf node_modules package-lock.json
npm install --registry=https://registry.npmjs.org/
```

重新提交后，CI 绿了。

## 收获

1. **测试的"退出"也是测试的一部分**。进程挂死会让 CI 直接超时失败，比断言失败更隐蔽。
2. **lockfile 会绑定来源**。凡是涉及 npm registry 的项目，尽量在 CI 里用官方源生成干净的 lockfile，否则换个环境就 403。
3. **本地绿 ≠ CI 绿**。只有真跑一遍 CI，才知道你的项目在"别人的机器"上能不能起来。

## 现在的可验证状态

两个仓库现在都有 CI 流水线，随时可以点徽章查看运行历史：

- [purple-team-lab CI](https://github.com/hedongli1/purple-team-lab/actions) · Node 22/24 测试 + Vite 构建
- [ledger-app CI](https://github.com/hedongli1/ledger-app/actions) · Node 22/24 测试 + Vite 构建

本地复现：`cd server && npm install && npm test` 即可看到全部用例通过、进程正常退出。
