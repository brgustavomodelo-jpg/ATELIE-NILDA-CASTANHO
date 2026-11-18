/* ==========================================================================
   Ateliê Nilda Castanho — interações
   Módulos: WhatsApp · cabeçalho/menu · revelações · costuras SVG · galeria · abertura
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var NS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     1. WhatsApp (só aparece quando o número é informado em config.js)
     ------------------------------------------------------------------ */
  function setupWhatsApp() {
    var cfg = window.SITE_CONFIG || {};
    var num = String(cfg.whatsappNumber || '').replace(/\D/g, '');
    var links = $$('[data-whatsapp]');
    if (num.length < 10) {
      links.forEach(function (a) { a.hidden = true; });
      if (window.console && console.info) console.info('[Ateliê] WhatsApp não configurado: edite assets/js/config.js para exibir os botões.');
      return;
    }
    var url = 'https://wa.me/' + num + '?text=' + encodeURIComponent(cfg.whatsappMessage || '');
    links.forEach(function (a) { a.href = url; a.hidden = false; });
  }

  /* ------------------------------------------------------------------
     2. Cabeçalho, menu mobile, link ativo, voltar ao topo
     ------------------------------------------------------------------ */
  function setupHeader() {
    var header = $('#siteHeader');
    var burger = $('#burger');
    var nav = $('#nav');
    var toTop = $('#toTop');
    var ring = $('#toTopRing');
    var RING = 138.2;

    $$('.nav__list li').forEach(function (li, i) { li.style.setProperty('--n', i); });

    function setMenu(open) {
      root.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    }
    burger.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); burger.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 960) setMenu(false); });

    var ticking = false;
    function onScroll() {
      ticking = false;
      var y = window.pageYOffset;
      header.classList.toggle('is-scrolled', y > 30);
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, y / max) : 0;
      ring.style.strokeDashoffset = String(RING * (1 - p));
      toTop.classList.toggle('show', y > 640);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
    toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

    // link ativo conforme a seção visível
    if ('IntersectionObserver' in window) {
      var links = $$('.nav__list a');
      var map = {};
      links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (l) { l.removeAttribute('aria-current'); });
          var a = map[en.target.id];
          if (a) a.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main section[id]').forEach(function (s) { if (map[s.id]) io.observe(s); });
      // "Detalhes" não tem item no menu: mantém o último ativo
    }
  }

  /* ------------------------------------------------------------------
     3. Revelações ao rolar (texto, fotos)
     ------------------------------------------------------------------ */
  function observeReveal(els, cls, watchParent) {
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add(cls); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        (en.target._revealEl || en.target).classList.add(cls);
        io.unobserve(en.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) {
      // fotos usam clip-path (invisíveis para o observer): observa o contêiner
      var target = watchParent && e.parentElement ? e.parentElement : e;
      target._revealEl = e;
      io.observe(target);
    });
  }
  function setupReveals() {
    observeReveal($$('[data-reveal]'), 'in');
    observeReveal($$('[data-reveal-img]'), 'in', true);
  }

  /* ------------------------------------------------------------------
     4. Costuras SVG: linhas tracejadas que são "desenhadas" ao rolar
        Técnica: o traço tracejado fica atrás de uma máscara cujo traço
        usa stroke-dasharray/stroke-dashoffset para revelar o caminho.
     ------------------------------------------------------------------ */
  var maskSeq = 0;
  function makeDrawable(svg) {
    $$('.thread', svg).forEach(function (path) {
      if (path.dataset.drawable) return;
      path.dataset.drawable = '1';
      var len = path.getTotalLength();
      var id = 'dm' + (++maskSeq);
      var defs = $('defs', svg) || svg.insertBefore(document.createElementNS(NS, 'defs'), svg.firstChild);
      var mask = document.createElementNS(NS, 'mask');
      mask.setAttribute('id', id);
      mask.setAttribute('maskUnits', 'userSpaceOnUse');
      mask.setAttribute('x', '-4000'); mask.setAttribute('y', '-4000'); mask.setAttribute('width', '12000'); mask.setAttribute('height', '12000');
      var mp = document.createElementNS(NS, 'path');
      mp.setAttribute('d', path.getAttribute('d'));
      mp.setAttribute('class', 'mask-path');
      mp.style.strokeDasharray = len + ' ' + (len + 10);
      mp.style.strokeDashoffset = len;
      mask.appendChild(mp);
      defs.appendChild(mask);
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('mask', 'url(#' + id + ')');
      path.parentNode.insertBefore(g, path);
      g.appendChild(path);
      svg._mp = svg._mp || [];
      svg._mp.push(mp);
    });
  }
  function drawIn(svg, instant) {
    (svg._mp || []).forEach(function (mp) {
      if (instant) { mp.style.transition = 'none'; }
      mp.style.strokeDashoffset = '0';
    });
    svg.classList.add('in');
  }

  function wavePath(w, h, idx) {
    var amp = 9 + (idx % 3) * 3, wl = 150 + (idx % 2) * 60, ph = idx * 1.7, d = 'M0 ' + (h / 2 + Math.sin(ph) * amp).toFixed(1);
    for (var x = 8; x <= w + 8; x += 8) d += ' L' + x + ' ' + (h / 2 + Math.sin(ph + x / wl * 6.2832) * amp).toFixed(1);
    return d;
  }
  function buildDividers() {
    $$('.stitch').forEach(function (el, i) {
      var wasIn = el.classList.contains('in');
      el.innerHTML = '';
      var w = Math.round(el.clientWidth || window.innerWidth), h = 64;
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('class', 'thread');
      p.setAttribute('d', wavePath(w, h, i + 1));
      svg.appendChild(p);
      el.appendChild(svg);
      el.classList.add('draw');
      makeDrawable(svg);
      el._svg = svg;
      if (wasIn) drawIn(svg, true);
    });
  }
  function setupStitches() {
    buildDividers();
    var targets = $$('.stitch').concat($$('svg.draw'));
    $$('svg.draw').forEach(makeDrawable);
    if (!('IntersectionObserver' in window)) { targets.forEach(function (t) { drawIn(t._svg || t, true); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add('in');
        drawIn(el._svg || el, reduceMotion);
        io.unobserve(el);
      });
    }, { threshold: 0.2 });
    targets.forEach(function (t) { io.observe(t); });

    var rt;
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (window.innerWidth !== lastW) { lastW = window.innerWidth; buildDividers(); } }, 220);
    });
  }

  /* ------------------------------------------------------------------
     5. Galeria: filtros + visualização ampliada
     ------------------------------------------------------------------ */
  function setupGallery() {
    var gallery = $('#gallery');
    if (!gallery) return;
    var items = $$('.g-item', gallery);
    var chips = $$('.chip');
    var count = $('#galleryCount');
    var empty = $('#galleryEmpty');
    var labels = {};
    chips.forEach(function (c) { labels[c.dataset.filter] = c.textContent.trim(); });

    function setFilter(f, animate) {
      if (!labels[f]) f = 'todos';
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.filter === f)); });
      var n = 0;
      items.forEach(function (li) {
        var show = f === 'todos' || li.dataset.cat.split(' ').indexOf(f) > -1;
        li.hidden = !show;
        li.classList.remove('g-enter');
        if (show) {
          if (animate && !reduceMotion) { li.style.setProperty('--k', Math.min(n, 14)); void li.offsetWidth; li.classList.add('g-enter'); }
          n++;
        }
      });
      count.textContent = f === 'todos' ? n + ' fotos' : n + (n === 1 ? ' foto' : ' fotos') + ' em ' + labels[f];
      empty.hidden = n > 0;
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { setFilter(c.dataset.filter, true); }); });
    $$('a[data-filter]').forEach(function (a) { a.addEventListener('click', function () { setFilter(a.dataset.filter, true); }); });
    setFilter('todos', false);

    /* Lightbox */
    var dlg = $('#lightbox'), img = $('#lbImg'), cap = $('#lbCap'), cnt = $('#lbCount');
    var list = [], idx = 0;
    function render() {
      var b = list[idx];
      img.classList.add('is-loading');
      img.onload = function () { img.classList.remove('is-loading'); };
      img.alt = b.dataset.caption || '';
      img.src = b.dataset.full;
      if (img.complete) img.classList.remove('is-loading');
      cap.textContent = b.dataset.caption || '';
      cnt.textContent = (idx + 1) + ' / ' + list.length;
      [idx - 1, idx + 1].forEach(function (j) { if (list[j]) { var pre = new Image(); pre.src = list[j].dataset.full; } });
    }
    function step(d) { idx = (idx + d + list.length) % list.length; render(); }
    function open(btn) {
      list = $$('.g-open', gallery).filter(function (b) { return !b.closest('.g-item').hidden; });
      idx = Math.max(0, list.indexOf(btn));
      render();
      root.classList.add('lb-open');
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    }
    function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); root.classList.remove('lb-open'); }
    gallery.addEventListener('click', function (e) { var b = e.target.closest('.g-open'); if (b) open(b); });
    $('#lbClose').addEventListener('click', close);
    $('#lbPrev').addEventListener('click', function () { step(-1); });
    $('#lbNext').addEventListener('click', function () { step(1); });
    dlg.addEventListener('close', function () { root.classList.remove('lb-open'); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.classList.contains('lb__fig')) close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
    var sx = null;
    dlg.addEventListener('touchstart', function (e) { sx = e.changedTouches[0].clientX; }, { passive: true });
    dlg.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     6. ABERTURA: a costura revelando a marca
     ------------------------------------------------------------------ */
  var siteInitDone = false;
  function initSite() {
    if (siteInitDone) return;
    siteInitDone = true;
    setupReveals();
    setupStitches();
  }

  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * t); } // easeInOutSine
  function mk(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function runIntro() {
    var overlay = $('#intro'), svg = $('#introSvg'), brand = $('#introBrand'), skip = $('#introSkip');
    var locked = [$('#siteHeader'), $('#conteudo'), $('.site-footer')];
    locked.forEach(function (el) { if (el) el.setAttribute('inert', ''); });
    try { sessionStorage.setItem('nc-intro', '1'); } catch (e) {}

    var W = overlay.clientWidth || window.innerWidth;
    var H = overlay.clientHeight || window.innerHeight;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    /* --- medidas (a logo nunca é ampliada além de ~1.1x o tamanho original) --- */
    var logo = Math.round(Math.min(180, Math.max(128, Math.min(W * 0.46, H * 0.26))));
    var s = Math.max(24, Math.min(54, W * 0.045));          // "unidade" do coração
    var heartH = 1.72 * s, gap = Math.max(18, s * 0.7), tagH = 40;
    var y0 = Math.max(64, (H - (heartH + gap + logo + tagH)) / 2 - 6);
    var cx = W / 2, tipY = y0 + heartH, logoTop = tipY + gap, endY = logoTop + logo * 0.05;
    brand.style.setProperty('--logo-size', logo + 'px');
    brand.style.setProperty('--logo-top', logoTop + 'px');

    /* --- trajetória da linha: ondula, chega ao coração, desce até a logo --- */
    function P(x, y) { return x.toFixed(1) + ' ' + y.toFixed(1); }
    function T(dx, dy) { return P(cx + dx * s, tipY + dy * s); }
    var d = 'M ' + P(-40, tipY + 46) +
      ' C ' + P(W * 0.06, tipY + 30) + ' ' + P(W * 0.12, tipY - 80) + ' ' + P(W * 0.23, tipY - 62) +
      ' C ' + P(W * 0.34, tipY - 44) + ' ' + P(cx - s * 2.5, tipY + 8) + ' ' + P(cx, tipY) +
      // coração (lóbulo direito → cúspide → lóbulo esquerdo → ponta)
      ' C ' + T(0.3, -0.25) + ' ' + T(1.0, -0.75) + ' ' + T(1.0, -1.3) +
      ' C ' + T(1.0, -1.75) + ' ' + T(0.35, -1.95) + ' ' + T(0, -1.4) +
      ' C ' + T(-0.35, -1.95) + ' ' + T(-1.0, -1.75) + ' ' + T(-1.0, -1.3) +
      ' C ' + T(-1.0, -0.75) + ' ' + T(-0.3, -0.25) + ' ' + T(0, 0) +
      // desce até a logo
      ' C ' + P(cx + s * 0.35, tipY + 0.25 * s) + ' ' + P(cx + 2, endY - 10) + ' ' + P(cx, endY);

    var defs = mk('defs');
    var grad = mk('linearGradient', { id: 'needleGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
    [['0', '#f0dca4'], ['.55', '#c9a24c'], ['1', '#9a7630']].forEach(function (st) { grad.appendChild(mk('stop', { offset: st[0], 'stop-color': st[1] })); });
    defs.appendChild(grad);
    var mask = mk('mask', { id: 'introMask', maskUnits: 'userSpaceOnUse', x: '-100', y: '-100', width: String(W + 200), height: String(H + 200) });
    var maskPath = mk('path', { d: d, fill: 'none', stroke: '#fff', 'stroke-width': '16', 'stroke-linecap': 'butt' });
    mask.appendChild(maskPath);
    defs.appendChild(mask);
    svg.appendChild(defs);

    var g = mk('g', { mask: 'url(#introMask)' });
    var stitches = mk('path', { d: d, fill: 'none', stroke: '#b9706e', 'stroke-width': String(W > 900 ? 3 : 2.4), 'stroke-linecap': 'round', 'stroke-dasharray': (W > 900 ? '13 10' : '10 8') });
    g.appendChild(stitches);
    svg.appendChild(g);

    var k = Math.max(0.9, Math.min(1.7, W / 760));
    var needle = mk('g', { opacity: '0' });
    var shadow = mk('path', { d: 'M-62 -1.6 L-4 -0.7 L4 0 L-4 0.7 L-62 1.6 Z', fill: '#33231c', opacity: '.14', transform: 'translate(2 5)' });
    var body = mk('path', { d: 'M-62 -2 L-4 -0.9 L4 0 L-4 0.9 L-62 2 Z', fill: 'url(#needleGrad)' });
    var eye = mk('ellipse', { cx: '-55', cy: '0', rx: '4.2', ry: '1', fill: '#f8f3ec', stroke: '#8a6a2c', 'stroke-width': '.5' });
    var shine = mk('path', { d: 'M-50 -1 L-8 -.4', stroke: '#fff', 'stroke-opacity': '.75', 'stroke-width': '.5', fill: 'none' });
    [shadow, body, eye, shine].forEach(function (n) { needle.appendChild(n); });
    svg.appendChild(needle);

    var measure = mk('path', { d: d }); // só para medir
    svg.appendChild(measure); measure.setAttribute('visibility', 'hidden');
    var L = measure.getTotalLength();
    maskPath.style.strokeDasharray = L + ' ' + (L + 20);
    maskPath.style.strokeDashoffset = L;

    /* --- linha do tempo (segundos) --- */
    var T0 = 0.25, T_DRAW = 1.75;        // agulha costura o caminho
    var T_LOGO = 1.8, T_TAG = 2.2;       // logo e frase
    var T_SEAM = 2.8, T_OPEN = 3.1;      // fecho costurado → abre
    var T_READY = 3.2, T_END = 4.0;      // página entra → remove abertura

    var start = null, done = false, skipped = false, raf = 0;
    var flags = { logo: false, tag: false, seam: false, open: false, ready: false };

    function place(sPos, t) {
      var p = measure.getPointAtLength(sPos);
      var q = measure.getPointAtLength(Math.min(L, sPos + 3));
      var p0 = measure.getPointAtLength(Math.max(0, sPos - 3));
      var ang = Math.atan2(q.y - p0.y, q.x - p0.x) * 180 / Math.PI;
      var wob = Math.sin(sPos / 9) * 3.2;                 // vai-e-vem da agulha ao costurar
      var dip = Math.sin(sPos / 9) * 1.8;
      needle.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + (ang + wob).toFixed(1) + ') translate(0 ' + dip.toFixed(1) + ') scale(' + k.toFixed(2) + ')');
    }

    function frame(now) {
      if (done || skipped) return;
      if (start === null) start = now;
      var t = (now - start) / 1000;

      var p = ease((t - T0) / T_DRAW);
      var sPos = p * L;
      maskPath.style.strokeDashoffset = (L - sPos).toFixed(1);
      if (t >= T0 - 0.05 && t < T0 + T_DRAW + 0.35) {
        var fadeIn = Math.min(1, (t - (T0 - 0.05)) / 0.2);
        var fadeOut = t > T0 + T_DRAW ? 1 - (t - (T0 + T_DRAW)) / 0.35 : 1;
        needle.setAttribute('opacity', Math.max(0, Math.min(fadeIn, fadeOut)).toFixed(2));
        place(Math.max(0.5, Math.min(L - 0.5, sPos)), t);
      } else if (t >= T0 + T_DRAW + 0.35) { needle.setAttribute('opacity', '0'); }

      if (!flags.logo && t >= T_LOGO) { flags.logo = true; root.classList.add('intro-logo-in'); }
      if (!flags.tag && t >= T_TAG) { flags.tag = true; root.classList.add('intro-tag-in'); }
      if (!flags.seam && t >= T_SEAM) { flags.seam = true; overlay.classList.add('intro--seam'); }
      if (!flags.open && t >= T_OPEN) { flags.open = true; overlay.classList.add('intro--open'); }
      if (!flags.ready && t >= T_READY) { flags.ready = true; pageReady(); }
      if (t >= T_END) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }

    function pageReady() { root.classList.add('page-ready'); initSite(); }

    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      overlay.parentNode && overlay.parentNode.removeChild(overlay);
      root.classList.remove('intro-on', 'intro-logo-in', 'intro-tag-in');
      root.classList.add('page-ready');
      locked.forEach(function (el) { if (el) el.removeAttribute('inert'); });
      document.removeEventListener('keydown', onKey);
      initSite();
    }

    function skipNow() {
      if (done || skipped) return;
      skipped = true;
      cancelAnimationFrame(raf);
      overlay.classList.add('intro--fast', 'intro--seam');
      requestAnimationFrame(function () { overlay.classList.add('intro--open'); });
      root.classList.add('page-ready');
      initSite();
      setTimeout(finish, 520);
    }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skipNow(); } }
    skip.addEventListener('click', skipNow);
    document.addEventListener('keydown', onKey);

    raf = requestAnimationFrame(frame);
    // rede de segurança: nunca deixa o visitante preso na abertura
    setTimeout(finish, 6500);
  }

  /* ------------------------------------------------------------------
     Início
     ------------------------------------------------------------------ */
  function init() {
    var year = $('#year'); if (year) year.textContent = new Date().getFullYear();
    setupWhatsApp();
    setupHeader();
    setupGallery();
    if (root.classList.contains('intro-on') && $('#intro')) {
      try { runIntro(); } catch (err) {
        if (window.console) console.error('[Ateliê] falha na abertura, exibindo o site:', err);
        var ov = $('#intro'); if (ov) ov.remove();
        root.classList.remove('intro-on');
        $$('[inert]').forEach(function (el) { el.removeAttribute('inert'); });
        initSite();
      }
    } else {
      initSite();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
