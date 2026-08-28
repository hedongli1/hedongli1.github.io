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
    setTimeout(hidePreloader, 1800);
  }

  /* ---------- 头部滚动态 ---------- */
  var header = document.getElementById('site-header');
  function onScrollHeader() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 10);
  }
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

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

  /* ---------- 全屏粒子背景：星云(底) + 星空连线(中) + 流星(顶) ---------- */
  var canvas = document.getElementById('particles');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, pts = [], meteors = [], mouse = { x: -9999, y: -9999 };

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // 粒子密度（最强档：随面积自适应，偏密）
    var N = Math.min(180, Math.max(70, Math.round(W * H / 9000)));
    for (var i = 0; i < N; i++) {
      pts.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.8 + 0.5
      });
    }

    // 金色系（品牌金 → 亮金 之间渐变）
    function cssVar(name, fb) { return getComputedStyle(root).getPropertyValue(name).trim() || fb; }
    var gold = cssVar('--brand', '#F5A623');
    var goldHi = cssVar('--brand-strong', '#FBBF24');
    function hexToRgb(h) {
      h = h.replace('#', '');
      if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
      var n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    var cA = hexToRgb(gold), cB = hexToRgb(goldHi);
    function goldRgba(mix, alpha) {
      return 'rgba(' + Math.round(cA.r + (cB.r - cA.r) * mix) + ',' + Math.round(cA.g + (cB.g - cA.g) * mix) + ',' + Math.round(cA.b + (cB.b - cA.b) * mix) + ',' + alpha + ')';
    }

    // 鼠标跟随（整页，含滚动到任意区块时）
    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX; mouse.y = e.clientY;
    });
    window.addEventListener('blur', function () { mouse.x = -9999; mouse.y = -9999; });

    // 流星：周期性划过的金色光尾
    function spawnMeteor() {
      meteors.push({
        x: Math.random() * W * 0.9 + W * 0.1,
        y: -20,
        vx: -(3 + Math.random() * 4),
        vy: 1.8 + Math.random() * 2,
        life: 1
      });
    }
    spawnMeteor();
    setInterval(spawnMeteor, 2600);

    var LINK_DIST = 130;

    function tick() {
      ctx.clearRect(0, 0, W, H);

      // 星空连线粒子
      for (var j = 0; j < pts.length; j++) {
        var p = pts[j];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;

        var dxm = p.x - mouse.x, dym = p.y - mouse.y;
        var dm = Math.sqrt(dxm * dxm + dym * dym);
        if (dm < 150 && dm > 0.01) {
          p.x -= dxm / dm * 0.6; p.y -= dym / dm * 0.6;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = goldRgba(Math.abs(Math.sin(j * 0.7)), 0.75);
        ctx.fill();
      }

      for (var a = 0; a < pts.length; a++) {
        for (var b = a + 1; b < pts.length; b++) {
          var dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y;
          var d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            var alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.3;
            ctx.strokeStyle = goldRgba(0.4, alpha);
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(pts[a].x, pts[a].y);
            ctx.lineTo(pts[b].x, pts[b].y);
            ctx.stroke();
          }
        }
        var dxm = pts[a].x - mouse.x, dym = pts[a].y - mouse.y;
        var dm2 = dxm * dxm + dym * dym;
        if (dm2 < LINK_DIST * LINK_DIST) {
          ctx.strokeStyle = goldRgba(0.7, 0.55 * (1 - Math.sqrt(dm2) / LINK_DIST));
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pts[a].x, pts[a].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      // 流星（金色拖尾 + 白色高点头）
      for (var m = meteors.length - 1; m >= 0; m--) {
        var mt = meteors[m];
        mt.x += mt.vx; mt.y += mt.vy; mt.life -= 0.005;
        if (mt.life <= 0 || mt.y > H || mt.x < -40) { meteors.splice(m, 1); continue; }
        var tx = mt.x - mt.vx * 11, ty = mt.y - mt.vy * 11;
        var grad = ctx.createLinearGradient(mt.x, mt.y, tx, ty);
        grad.addColorStop(0, goldRgba(0.7, 0.85 * mt.life));
        grad.addColorStop(1, goldRgba(0.2, 0));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(mt.x, mt.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mt.x, mt.y, 1.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * mt.life) + ')';
        ctx.fill();
      }

      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ---------- 轨道环：金色光点绕椭圆环运行（复刻 lhwu1 的 #orbit） ---------- */
  var orbit = document.getElementById('orbit');
  if (orbit) {
    var octx = orbit.getContext('2d');
    var OW = 0, OH = 0;
    function oresize() {
      var dpr = window.devicePixelRatio || 1;
      OW = orbit.width = window.innerWidth * dpr;
      OH = orbit.height = window.innerHeight * dpr;
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    oresize();
    window.addEventListener('resize', oresize);

    // 四条椭圆环：中心偏右下，直径随视口缩放
    var rings = [
      { rx: 0.38, ry: 0.22, tilt: -0.38, speed: 0.0006, hue: 0.55, size: 3.4 },
      { rx: 0.30, ry: 0.18, tilt: 0.52,  speed: -0.0009, hue: 0.20, size: 2.6 },
      { rx: 0.47, ry: 0.28, tilt: 0.10,  speed: 0.0004, hue: 0.75, size: 2.2 },
      { rx: 0.22, ry: 0.13, tilt: -0.12, speed: 0.0011, hue: 0.35, size: 1.8 }
    ];

    // 金色系：品牌金 → 亮金渐变（与粒子层同源，独立取色）
    function ocssVar(name, fb) { return getComputedStyle(root).getPropertyValue(name).trim() || fb; }
    function ohexToRgb(h) {
      h = h.replace('#', '');
      if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
      var n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    var oCA = ohexToRgb(ocssVar('--brand', '#F5A623'));
    var oCB = ohexToRgb(ocssVar('--brand-strong', '#FBBF24'));

    function ocolor(mix, alpha) {
      var r = Math.round(oCA.r + (oCB.r - oCA.r) * mix);
      var g = Math.round(oCA.g + (oCB.g - oCA.g) * mix);
      var b = Math.round(oCA.b + (oCB.b - oCA.b) * mix);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    var cx = 0.68, cy = 0.46; // 轨道环中心（相对视口）
    function otick(ts) {
      var t = ts || 0;
      var W = window.innerWidth, H = window.innerHeight;
      octx.clearRect(0, 0, W, H);
      var ox = W * cx, oy = H * cy;
      for (var i = 0; i < rings.length; i++) {
        var R = rings[i];
        var a = t * R.speed;
        var px = Math.cos(a), py = Math.sin(a);
        var x = ox + px * W * R.rx;
        var y = oy + py * H * R.ry;

        // 轨道线（可见）
        octx.save();
        octx.translate(ox, oy);
        octx.rotate(R.tilt);
        octx.scale(1, R.ry / R.rx);
        octx.beginPath();
        octx.arc(0, 0, W * R.rx, 0, Math.PI * 2);
        octx.strokeStyle = ocolor(R.hue, 0.30);
        octx.lineWidth = 1.4;
        octx.stroke();
        octx.restore();

        // 光点 + 光晕
        octx.beginPath();
        octx.arc(x, y, R.size, 0, Math.PI * 2);
        octx.fillStyle = ocolor(R.hue, 1);
        octx.shadowColor = ocolor(R.hue, 0.95);
        octx.shadowBlur = 22;
        octx.fill();
        octx.shadowBlur = 0;

        // 拖尾（更长更亮）
        var ta = a - 0.22;
        var tx = ox + Math.cos(ta) * W * R.rx;
        var ty = oy + Math.sin(ta) * H * R.ry;
        var grad = octx.createLinearGradient(x, y, tx, ty);
        grad.addColorStop(0, ocolor(R.hue, 0.7));
        grad.addColorStop(1, ocolor(R.hue, 0));
        octx.strokeStyle = grad;
        octx.lineWidth = 2;
        octx.beginPath();
        octx.moveTo(x, y);
        octx.lineTo(tx, ty);
        octx.stroke();
      }
      requestAnimationFrame(otick);
    }
    requestAnimationFrame(otick);
  }

  /* ---------- 首屏滚动视差（内容上移渐隐，增强纵深） ---------- */
  var heroEl = document.querySelector('.hero');
  var heroInner = heroEl ? heroEl.querySelector('.container') : null;
  var heroHint = document.querySelector('.hero-scroll');
  function onScrollParallax() {
    if (!heroEl) return;
    var sc = window.scrollY;
    var h = heroEl.offsetHeight || 1;
    if (sc <= h) {
      var p = sc / h;
      if (heroInner) {
        heroInner.style.transform = 'translate3d(0,' + (p * 70) + 'px,0)';
        heroInner.style.opacity = String(Math.max(0, 1 - p * 1.6));
      }
      if (heroHint) heroHint.style.opacity = String(Math.max(0, 1 - p * 4));
    }
  }
  window.addEventListener('scroll', onScrollParallax, { passive: true });
  onScrollParallax();

  /* ---------- 滚动渐入 ---------- */
  var revealEls = document.querySelectorAll('.section-head, .about-grid > *, .skill-item, .project-card, .timeline-item, .post-card, .contact-inner, .stat-item');
  if (revealEls.length && 'IntersectionObserver' in window) {
    revealEls.forEach(function (el) { el.classList.add('reveal'); });
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { ro.observe(el); });
  }

  /* ---------- 数字递增计数 ---------- */
  var countEls = document.querySelectorAll('.stat-num[data-count]');
  if (countEls.length && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var dur = 1200, start = null;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min(1, (ts - start) / dur);
          el.textContent = Math.round(target * p);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        co.unobserve(el);
      });
    }, { threshold: 0.5 });
    countEls.forEach(function (n) { co.observe(n); });
  }
})();