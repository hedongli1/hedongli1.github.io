---
layout: default
title: 关于
---

<div class="container page-block">
  <header class="page-head">
    <p class="hero-eyebrow">About · 关于</p>
    <h1 class="page-title">你好，我是 {{ site.title }}<span class="hero-dot">.</span></h1>
    <p class="page-lead">{{ site.description }}</p>
    <p class="page-lead-en">{{ site.description_en }}</p>
  </header>

  <!-- 技能栈：胶囊标签 -->
  <section class="block">
    <h2 class="block-title">技术栈</h2>
    <!-- TODO 替换为你的真实技能，按熟练度分组 -->
    <div class="skill-group">
      <span class="skill-group-label">熟练</span>
      <div class="chip-row">
        <span class="chip">TypeScript</span><span class="chip">JavaScript</span><span class="chip">React</span><span class="chip">Vue</span><span class="chip">Node.js</span>
      </div>
    </div>
    <div class="skill-group">
      <span class="skill-group-label">熟悉</span>
      <div class="chip-row">
        <span class="chip">Python</span><span class="chip">Git</span><span class="chip">Linux</span><span class="chip">HTML / CSS</span>
      </div>
    </div>
    <div class="skill-group">
      <span class="skill-group-label">了解</span>
      <div class="chip-row">
        <span class="chip">Go</span><span class="chip">Docker</span><span class="chip">PostgreSQL</span><span class="chip">Redis</span>
      </div>
    </div>
  </section>

  <!-- 精选项目：卡片网格（占位，上线前替换） -->
  <section class="block">
    <h2 class="block-title">精选项目</h2>
    <div class="project-grid">
      <!-- TODO 每一个卡片换成你的真实项目：名称 / 简介 / 链接 -->
      <a class="project-card" href="https://github.com/{{ site.github_username }}" target="_blank" rel="noopener">
        <span class="project-card-tag">TODO</span>
        <h3 class="project-card-title">项目一</h3>
        <p class="project-card-desc">在这里写项目的名字和一句话介绍。</p>
        <span class="project-card-lang">TypeScript</span>
      </a>
      <a class="project-card" href="https://github.com/{{ site.github_username }}" target="_blank" rel="noopener">
        <span class="project-card-tag">TODO</span>
        <h3 class="project-card-title">项目二</h3>
        <p class="project-card-desc">在这里写项目的名字和一句话介绍。</p>
        <span class="project-card-lang">Python</span>
      </a>
      <a class="project-card project-card-empty" href="https://github.com/{{ site.github_username }}" target="_blank" rel="noopener">
        <span class="project-card-tag">coming soon</span>
        <h3 class="project-card-title">你的下一个项目</h3>
        <p class="project-card-desc">仓库建好后，把它挂到这里。</p>
      </a>
    </div>
  </section>

  <!-- 履历：时间线（占位） -->
  <section class="block">
    <h2 class="block-title">履历</h2>
    <ol class="timeline">
      <li class="timeline-item">
        <span class="timeline-dot" aria-hidden="true"></span>
        <div class="timeline-body">
          <span class="timeline-date">2026.08</span>
          <h3 class="timeline-title">加入 GitHub，开始持续构建</h3>
          <p class="timeline-text">从这里开始记录项目与思考。</p>
        </div>
      </li>
      <!-- TODO 补充教育 / 工作 / 开源经历，每条加一个 timeline-item -->
    </ol>
  </section>

  <!-- 找到我 -->
  <section class="block">
    <h2 class="block-title">找到我</h2>
    <div class="connect-row">
      {% for item in site.social %}
        <a class="connect-link" href="{{ item[1] }}" target="_blank" rel="noopener">{{ item[0] }}</a>
      {% endfor %}
    </div>
  </section>
</div>