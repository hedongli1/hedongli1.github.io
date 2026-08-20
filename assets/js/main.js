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

  /* ---------- 星空连线粒子背景（仅 hero 存在时） ---------- */
  var canvas = document.getElementById('particles');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, pts = [], mouse = { x: -9999, y: -9999 };
    function resize() {
      W = canvas.width = canvas.offsetWidth || canvas.parentNode.offsetWidth;
      H = canvas.height = canvas.offsetHeight || canvas.parentNode.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // 粒子数量随屏幕面积自适应
    var N = Math.min(140, Math.max(50, Math.round(W * H / 12000)));
    for (var i = 0; i < N; i++) {
      pts.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.5
      });
    }

    var brand = getComputedStyle(root).getPropertyValue('--brand').trim() || '#F5A623';
    var accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#FB923C';
    function hexToRgb(h) {
      h = h.replace('#', '');
      if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
      var n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    var cA = hexToRgb(brand), cB = hexToRgb(accent);

    // 鼠标跟随（桌面端）
    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
    });
    canvas.addEventListener('mouseleave', function () { mouse.x = -9999; mouse.y = -9999; });

    var LINK_DIST = 130;
    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var j = 0; j < pts.length; j++) {
        var p = pts[j];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        // 鼠标附近的粒子被轻微吸引
        var dxm = p.x - mouse.x, dym = p.y - mouse.y;
        var dm = Math.sqrt(dxm * dxm + dym * dym);
        if (dm < 140 && dm > 0.01) {
          p.x -= dxm / dm * 0.5; p.y -= dym / dm * 0.5;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        // 颜色在品牌色与强调色之间渐变
        var mix = Math.abs(Math.sin(j * 0.7));
        ctx.fillStyle = 'rgba(' + Math.round(cA.r + (cB.r - cA.r) * mix) + ',' + Math.round(cA.g + (cB.g - cA.g) * mix) + ',' + Math.round(cA.b + (cB.b - cA.b) * mix) + ',0.7)';
        ctx.fill();
      }

      // 粒子间连线（距离近才连，透明度随距离衰减）
      for (var a = 0; a < pts.length; a++) {
        for (var b = a + 1; b < pts.length; b++) {
          var dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y;
          var d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            var alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.28;
            ctx.strokeStyle = 'rgba(' + cA.r + ',' + cA.g + ',' + cA.b + ',' + alpha + ')';
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(pts[a].x, pts[a].y);
            ctx.lineTo(pts[b].x, pts[b].y);
            ctx.stroke();
          }
        }
        // 鼠标与粒子的连线更亮
        var dxm = pts[a].x - mouse.x, dym = pts[a].y - mouse.y;
        var dm2 = dxm * dxm + dym * dym;
        if (dm2 < LINK_DIST * LINK_DIST) {
          ctx.strokeStyle = 'rgba(' + cA.r + ',' + cA.g + ',' + cA.b + ',' + (0.5 * (1 - Math.sqrt(dm2) / LINK_DIST)) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pts[a].x, pts[a].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      requestAnimationFrame(tick);
    }
    tick();
  }
})();