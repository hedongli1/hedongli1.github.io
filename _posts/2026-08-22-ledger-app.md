---
layout: post
title: 记账本 Ledger 开发复盘：从零手写一个全栈应用
date: 2026-08-22 08:00:00 +0800
tags: [项目复盘, 全栈开发, Vue3, Node.js, SQLite]
---

这两天我给自己定了个目标：仓库里不能只有主页和博客，要有一个**真正能用的、从零写的项目**。于是有了这篇复盘的主角——[ledger-app](https://github.com/hedongli1/ledger-app)，一个前后端分离的个人记账本。

这篇文章不写教程，写**决策过程**：为什么这么选、怎么实现的、踩了什么坑、下一版要做什么。

## 一、为什么做记账本

选项目时我给自己三个标准：

1. **真能用**——不是 todo demo，是每天都会打开的 App 级功能；
2. **链路完整**——登录 → 增删改查 → 统计视图，覆盖一个产品的核心闭环；
3. **面试可讲**——技术点能引出 15 分钟的回答（鉴权、数据隔离、测试、部署）。

记账本三个全占：有真实需求、CRUD 天然完整、统计图表自带亮点。

## 二、技术选型

| 层 | 选择 | 理由 |
| --- | --- | --- |
| 前端 | Vue 3 + Vite | 组合式 API 简洁，Vite 启动快 |
| 图表 | ECharts 5 | 折线 + 环形图，配置对象化，黑金主题好定制 |
| 后端 | Express | 生态最大，中间件模型写鉴权最直观 |
| 数据库 | SQLite（Node 内置 `node:sqlite`） | **零原生编译依赖**，npm install 秒装，单文件备份 |
| 认证 | JWT + bcryptjs | 无状态，前后端分离标配 |

最值得说的是数据库选型：`better-sqlite3` 这类库需要原生编译，在 Windows/macOS/Linux 之间折腾版本匹配是劝退点。Node 22 起内置 `node:sqlite`，整个后端没有任何原生依赖，跨平台秒装——我把这当作一个"刻意减少依赖面"的工程决策。

## 三、架构与数据设计

两张表：

```sql
users(id, username UNIQUE, password, created_at)
transactions(id, user_id FK,
             type IN('income','expense'), amount > 0,
             category, date, note, created_at)
```

两个设计重点：

1. **数据隔离**——所有 SQL 都带 `user_id = ?` 条件，天然防止 A 用户操作 B 用户数据；更新/删除时校验归属，不属于自己的返回 404；
2. **参数化查询**——全部使用 prepared statement，SQL 注入无从谈起（写完确实被"金额 = 0"之类的脏数据教育过，所以把校验全都写在了服务端）。

鉴权流程：注册/登录 → 服务端签发 JWT（7 天过期）→ 前端存 localStorage → 每个请求带 `Authorization: Bearer <token>` → `authRequired` 中间件统一校验，401 时前端自动跳登录。

## 四、统计接口的三条 SQL

统计页三个数据源，都是不超过十行的聚合查询：

- 单月汇总：`GROUP BY type` 求和；
- 近 6 个月趋势：按月分组取 `substr(date, 1, 7)`，直接用字符串前缀截出 YYYY-MM，比日期函数省事且够用；
- 分类占比：`GROUP BY category ORDER BY total DESC`。

前端用 ECharts 画成双线趋势图和环形图，工具提示、配色全部对齐站点的黑金主题。

## 五、踩过的坑（真实记录）

1. **`NODE_ENV=production` 让前端构建失败**——环境变量是 `production` 时 `npm install` 自动跳过 devDependencies，vite 报 `Could not resolve 'vite'`。排查了三轮才发现是环境问题，按需用 `NODE_ENV=development npm install` 解决；
2. **`node --test test/` 报 `ERR_UNSUPPORTED_DIR_IMPORT`**——直接用 `node --test` 自动发现用例即可，目录参数在新版本里反而成了坑；
3. **ECharts 打包超 500kB**——用 `manualChunks` 把 echarts / vue 拆成独立 chunk，首屏加载更快（顺带学会了 Vite 的按需分包配置）。

## 六、测试：零依赖的端到端测试

用 Node 内置 `node:test` + 内置 `fetch`，一共 15 个用例，覆盖：注册 / 登录 / 重复注册 / 密码过短 / 未登录 401 / 记账 CRUD / 非法金额 / 三组统计。没有引入任何测试框架——不是偷懒，是想展示"用标准库能力写出可维护的测试"。

```bash
cd server && npm test
# 15 pass / 0 fail
```

## 七、部署

`docker compose up -d` 一条命令：后端 `node:22-alpine`，前端 nginx 托静态资源 + 反代 `/api`，SQLite 数据挂 volume 持久化。真要上线，换个生产 `JWT_SECRET` 就行。

## 八、收获 & 简历话术

最大的收获不是语法，是**完整的工程手感**：从建表到接口到图表到部署，每一层都知道自己在干什么。面试时这项目可以这样讲：

> 独立完成个人记账全栈应用：Vue3 + ECharts 前端、Express + SQLite 后端、JWT 用户鉴权与数据隔离、参数化查询防注入；使用 Node 内置 SQLite 消除原生编译依赖；编写 15 个端到端测试覆盖全链路。

## 九、下一步

- 预算提醒（超支告警）
- 导出 CSV
- 分类自定义

代码在 [github.com/hedongli1/ledger-app](https://github.com/hedongli1/ledger-app)，欢迎提 PR——至少我自己会看 😄