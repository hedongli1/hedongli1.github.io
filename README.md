# hedongli1.github.io

个人博客站点（Jekyll + GitHub Pages），卡片网格 · 暖色琥珀 · 深浅双模式。

## 目录结构

```
_config.yml       站点配置（改站点名、简介、社交链接都在这里）
index.md          首页
about.md          关于页（技能 / 项目 / 履历）
_layouts/         页面模板
_includes/        头部 / 导航 / 页脚片段
_posts/           博客文章（发文章就往这里加 .md）
assets/css/       样式（设计系统）
```

## 怎么发一篇新文章

在 `_posts/` 目录新增一个文件，命名格式：`YYYY-MM-DD-标题.md`，开头写成：

```markdown
---
layout: post
title: 文章标题
date: 2026-08-20 12:00:00 +0800
tags: [随笔, 技术]
---

正文从这里开始，Markdown 语法。
```

push 之后 GitHub Pages 自动构建发布。