(function () {
  'use strict';
  var root = document.documentElement;

  /* ---------- 主题切换 ---------- */
  function applyTheme(t) {
    if (t === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
  }
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem('hedongli1-theme', next); } catch (e) {}
    });
  }

  /* ---------- 预加载 ---------- */
  var pre = document.getElementById('preloader');
  function hidePreloader() { if (pre) pre.classList.add('hidden'); }
  if (pre) {
    if (document.readyState === 'complete') { setTimeout(hidePreloader, 250); }
    else { window.addEventListener('load', function () { setTimeout(hidePreloader, 350); }); }
    setTimeout(hidePreloader, 1800); // 兜底，防止资源卡住
  }

  /* ---------- 头部滚动态 ---------- */
  var header = document.getElementById('site-header');
  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 10);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 技能条动画 ---------- */
  var fills = document.querySelectorAll('.skill-fill');
  if (fills.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.style.width = (e.target.getAttribute('data-level') || 0) + '%';
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    fills.forEach(function (f) { io.observe(f); });
  } else {
    fills.forEach(function (f) { f.style.width = (f.getAttribute('data-level') || 0) + '%'; });
  }

  /* ---------- 滚动高亮（顶部 nav + 右侧点导航） ---------- */
  var sections = document.querySelectorAll('section[id]');
  var navLinks = document.querySelectorAll('.nav-link');
  var dots = document.querySelectorAll('.dot-nav a');
  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        navLinks.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href').indexOf('#' + id) !== -1);
        });
        dots.forEach(function (d) {
          d.classList.toggle('active', d.getAttribute('href').indexOf('#' + id) !== -1);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 粒子背景（仅 hero 存在时） ---------- */
  var canvas = document.getElementById('particles');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, pts = [];
    function resize() {
      W = canvas.width = canvas.offsetWidth || canvas.parentNode.offsetWidth;
      H = canvas.height = canvas.offsetHeight || canvas.parentNode.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    var N = 60;
    for (var i = 0; i < N; i++) {
      pts.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.6 + 0.4
      });
    }
    var color = getComputedStyle(root).getPropertyValue('--brand').trim() || '#F5A623';
    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var j = 0; j < pts.length; j++) {
        var p = pts[j];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(tick);
    }
    tick();
  }
})();