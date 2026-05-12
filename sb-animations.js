/**
 * SalesBlast Animation Engine
 * Drop-in premium UI/UX animation system
 */
(function () {
  'use strict';

  /* ─── Utilities ─────────────────────────────────────────── */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── ScrollProgress ─────────────────────────────────────── */
  function ScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'sb-scroll-bar';
    const fill = document.createElement('div');
    fill.className = 'sb-scroll-bar__fill';
    const glow = document.createElement('div');
    glow.className = 'sb-scroll-bar__glow';
    fill.appendChild(glow);
    bar.appendChild(fill);
    document.body.prepend(bar);

    function update() {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      fill.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ─── CursorSystem ───────────────────────────────────────── */
  function CursorSystem() {
    if (reduced || window.matchMedia('(pointer: coarse)').matches) return;

    const glow = document.createElement('div');
    glow.className = 'sb-cursor-glow';
    const dot = document.createElement('div');
    dot.className = 'sb-cursor-dot';
    document.body.append(glow, dot);

    let mx = -200, my = -200, gx = -200, gy = -200;
    let hovering = false, clicking = false;

    document.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
    });

    document.addEventListener('mousedown', () => {
      clicking = true;
      dot.classList.add('sb-cursor-dot--click');
    });
    document.addEventListener('mouseup', () => {
      clicking = false;
      dot.classList.remove('sb-cursor-dot--click');
    });

    // Detect hover on interactive elements
    const interactors = 'a,button,[data-magnetic],input,textarea,select,.eco-card,.feat-card,.card-shell';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(interactors)) {
        hovering = true;
        dot.classList.add('sb-cursor-dot--hover');
      }
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(interactors)) {
        hovering = false;
        dot.classList.remove('sb-cursor-dot--hover');
      }
    });

    function tick() {
      gx = lerp(gx, mx, 0.08);
      gy = lerp(gy, my, 0.08);
      glow.style.transform = `translate(${gx - 200}px, ${gy - 200}px)`;
      dot.style.transform = `translate(${mx - 4}px, ${my - 4}px)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ─── RevealSystem ───────────────────────────────────────── */
  function RevealSystem() {
    // Add .sb-reveal to any element with data-reveal or .reveal
    qsa('[data-reveal], .reveal').forEach(el => {
      if (!el.classList.contains('sb-reveal')) el.classList.add('sb-reveal');
    });

    if (reduced) {
      qsa('.sb-reveal').forEach(el => el.classList.add('sb-in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = parseFloat(el.dataset.delay || 0) * 1000;
        setTimeout(() => {
          el.classList.add('sb-in');
        }, delay);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    // Also handle stagger parents
    qsa('[data-stagger]').forEach(parent => {
      qsa('.sb-reveal', parent).forEach((child, i) => {
        child.style.setProperty('--sb-stagger-i', i);
      });
    });

    qsa('.sb-reveal').forEach(el => io.observe(el));
  }

  /* ─── ParallaxSystem ─────────────────────────────────────── */
  function ParallaxSystem() {
    if (reduced) return;

    const layers = qsa('[data-parallax]');
    if (!layers.length) return;

    function update() {
      const sy = window.scrollY;
      layers.forEach(el => {
        const speed = parseFloat(el.dataset.parallax || 0.2);
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const offset = (window.innerHeight / 2 - center) * speed;
        el.style.transform = `translateY(${offset}px)`;
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ─── MagneticSystem ─────────────────────────────────────── */
  function MagneticSystem() {
    if (reduced || window.matchMedia('(pointer: coarse)').matches) return;

    qsa('[data-magnetic]').forEach(el => {
      let ox = 0, oy = 0, tx = 0, ty = 0, raf = null;

      function animate() {
        ox = lerp(ox, tx, 0.18);
        oy = lerp(oy, ty, 0.18);
        el.style.transform = `translate(${ox}px, ${oy}px)`;
        if (Math.abs(ox - tx) > 0.05 || Math.abs(oy - ty) > 0.05) {
          raf = requestAnimationFrame(animate);
        } else {
          raf = null;
        }
      }

      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const strength = parseFloat(el.dataset.magnetic || 0.35);
        tx = (e.clientX - cx) * strength;
        ty = (e.clientY - cy) * strength;
        if (!raf) raf = requestAnimationFrame(animate);
      });

      el.addEventListener('mouseleave', () => {
        tx = 0;
        ty = 0;
        if (!raf) raf = requestAnimationFrame(animate);
      });
    });
  }

  /* ─── CounterSystem ─────────────────────────────────────── */
  function CounterSystem() {
    const counters = qsa('[data-count]');
    if (!counters.length) return;

    function easeOutQuart(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    function animateCounter(el) {
      const target = parseFloat(el.dataset.count);
      const duration = parseInt(el.dataset.countDuration || 1800);
      const decimals = (el.dataset.count.split('.')[1] || '').length;
      const prefix = el.dataset.countPrefix || '';
      const suffix = el.dataset.countSuffix || '';
      const start = performance.now();

      function tick(now) {
        const elapsed = now - start;
        const progress = clamp(elapsed / duration, 0, 1);
        const value = easeOutQuart(progress) * target;
        el.textContent = prefix + value.toFixed(decimals) + suffix;

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = prefix + target.toFixed(decimals) + suffix;
          el.classList.add('sb-counter-pop');
          setTimeout(() => el.classList.remove('sb-counter-pop'), 600);
        }
      }
      requestAnimationFrame(tick);
    }

    if (reduced) {
      counters.forEach(el => {
        const target = parseFloat(el.dataset.count);
        const decimals = (el.dataset.count.split('.')[1] || '').length;
        const prefix = el.dataset.countPrefix || '';
        const suffix = el.dataset.countSuffix || '';
        el.textContent = prefix + target.toFixed(decimals) + suffix;
      });
      return;
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    counters.forEach(el => io.observe(el));
  }

  /* ─── TextScramble ───────────────────────────────────────── */
  class TextScramble {
    constructor(el) {
      this.el = el;
      this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&';
      this.resolve = null;
      this.raf = null;
    }

    setText(newText) {
      return new Promise(resolve => {
        this.resolve = resolve;
        const old = this.el.innerText;
        const len = Math.max(old.length, newText.length);
        const startTime = performance.now();
        const duration = 600;
        const queue = [];

        for (let i = 0; i < len; i++) {
          queue.push({
            from: old[i] || '',
            to: newText[i] || '',
            start: Math.floor(Math.random() * 10),
            end: Math.floor(Math.random() * 10) + 10,
            char: ''
          });
        }

        const tick = (now) => {
          const progress = clamp((now - startTime) / duration, 0, 1);
          let output = '';
          let complete = 0;

          for (let i = 0; i < queue.length; i++) {
            const q = queue[i];
            const step = Math.floor(progress * 20);
            if (step >= q.end) {
              complete++;
              output += q.to;
            } else if (step >= q.start) {
              if (!q.char || Math.random() < 0.28) {
                q.char = this.chars[Math.floor(Math.random() * this.chars.length)];
              }
              output += `<span class="sb-scramble-char">${q.char}</span>`;
            } else {
              output += q.from;
            }
          }

          this.el.innerHTML = output;
          if (complete < queue.length) {
            this.raf = requestAnimationFrame(tick);
          } else {
            this.el.innerHTML = newText;
            resolve();
          }
        };

        this.raf = requestAnimationFrame(tick);
      });
    }

    cancel() {
      if (this.raf) cancelAnimationFrame(this.raf);
    }
  }

  function ScrambleSystem() {
    if (reduced) return;

    qsa('[data-scramble]').forEach(el => {
      const original = el.textContent.trim();
      const scrambler = new TextScramble(el);
      let active = false;

      el.addEventListener('mouseenter', () => {
        if (!active) {
          active = true;
          scrambler.setText(original).then(() => { active = false; });
        }
      });
    });

    // Auto-scramble on reveal for headlines
    qsa('[data-scramble-reveal]').forEach(el => {
      const original = el.textContent.trim();
      const scrambler = new TextScramble(el);

      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          setTimeout(() => scrambler.setText(original), 200);
          io.unobserve(el);
        });
      }, { threshold: 0.5 });

      io.observe(el);
    });
  }

  /* ─── NavSystem ─────────────────────────────────────────── */
  function NavSystem() {
    const nav = qs('nav, .nav, header');
    if (!nav) return;

    // Scroll-based header shrink
    function updateNav() {
      const scrolled = window.scrollY > 50;
      nav.classList.toggle('sb-nav-scrolled', scrolled);
    }
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();

    // Active link highlighting
    const links = qsa('a[href^="#"]', nav).filter(a => a.getAttribute('href').length > 1);
    const sections = links
      .map(a => qs(a.getAttribute('href')))
      .filter(Boolean);

    if (!sections.length) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach(a => {
          const isActive = a.getAttribute('href') === '#' + id;
          a.classList.toggle('sb-nav-active', isActive);
        });
      });
    }, { threshold: 0.4 });

    sections.forEach(s => io.observe(s));
  }

  /* ─── CardSpotlight ─────────────────────────────────────── */
  function CardSpotlight() {
    if (reduced || window.matchMedia('(pointer: coarse)').matches) return;

    qsa('.sb-card-spotlight, .eco-card, .feat-card, .card-shell').forEach(el => {
      el.classList.add('sb-card-spotlight');

      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty('--spot-x', x + '%');
        el.style.setProperty('--spot-y', y + '%');
      });
    });
  }

  /* ─── AmbientSystem ─────────────────────────────────────── */
  function AmbientSystem() {
    if (reduced) return;

    const flash = document.createElement('div');
    flash.className = 'sb-ambient-flash';
    document.body.appendChild(flash);

    let lastFlash = 0;
    const interval = 8000 + Math.random() * 4000;

    function pulse() {
      const now = Date.now();
      if (now - lastFlash > interval) {
        flash.style.opacity = '1';
        setTimeout(() => { flash.style.opacity = '0'; }, 80);
        lastFlash = now;
      }
      requestAnimationFrame(pulse);
    }
    requestAnimationFrame(pulse);
  }

  /* ─── SectionAtmosphere ──────────────────────────────────── */
  function SectionAtmosphere() {
    if (reduced) return;

    const sections = qsa('[data-hue]');
    if (!sections.length) return;

    let currentHue = 220;
    let targetHue = 220;

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          targetHue = parseInt(entry.target.dataset.hue || 220);
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(s => io.observe(s));

    function tick() {
      currentHue = lerp(currentHue, targetHue, 0.02);
      document.documentElement.style.setProperty('--sb-hue', currentHue);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ─── RippleSystem ───────────────────────────────────────── */
  function RippleSystem() {
    if (reduced) return;

    document.addEventListener('click', e => {
      const btn = e.target.closest('button, .btn, [data-ripple], a.cta-btn, a.btn-primary, a.btn-secondary');
      if (!btn) return;

      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const size = Math.max(r.width, r.height) * 2;

      const ripple = document.createElement('span');
      ripple.className = 'sb-ripple';
      ripple.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x - size / 2}px;
        top: ${y - size / 2}px;
      `;

      // Ensure button has position:relative
      const pos = getComputedStyle(btn).position;
      if (pos === 'static') btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);

      setTimeout(() => ripple.remove(), 700);
    });
  }

  /* ─── SmoothScroll ───────────────────────────────────────── */
  function SmoothScroll() {
    document.addEventListener('click', e => {
      const anchor = e.target.closest('a[href^="#"]');
      if (!anchor || anchor.getAttribute('href').length <= 1) return;
      const target = qs(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ─── TiltSystem ─────────────────────────────────────────── */
  function TiltSystem() {
    if (reduced || window.matchMedia('(pointer: coarse)').matches) return;

    qsa('[data-tilt]').forEach(el => {
      const maxX = parseFloat(el.dataset.tiltX || 8);
      const maxY = parseFloat(el.dataset.tiltY || 10);
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

      function animate() {
        cx = lerp(cx, tx, 0.1);
        cy = lerp(cy, ty, 0.1);
        el.style.transform = `perspective(800px) rotateX(${cx}deg) rotateY(${cy}deg)`;
        if (Math.abs(cx - tx) > 0.01 || Math.abs(cy - ty) > 0.01) {
          raf = requestAnimationFrame(animate);
        } else {
          raf = null;
        }
      }

      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        tx = -ny * maxX;
        ty = nx * maxY;
        if (!raf) raf = requestAnimationFrame(animate);
      });

      el.addEventListener('mouseleave', () => {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(animate);
      });
    });
  }

  /* ─── GlowHover ──────────────────────────────────────────── */
  function GlowHover() {
    if (reduced) return;

    qsa('[data-glow]').forEach(el => {
      const color = el.dataset.glow || 'var(--cyan-400, #22d3ee)';
      el.addEventListener('mouseenter', () => {
        el.style.boxShadow = `0 0 24px 4px ${color}40, 0 0 48px 8px ${color}20`;
        el.style.transition = 'box-shadow 0.3s ease';
      });
      el.addEventListener('mouseleave', () => {
        el.style.boxShadow = '';
      });
    });
  }

  /* ─── StaggerReveal ──────────────────────────────────────── */
  function StaggerReveal() {
    // Find grid/list containers and stagger their children
    qsa('[data-stagger]').forEach(parent => {
      const children = qsa(':scope > *, :scope > li', parent);
      children.forEach((child, i) => {
        if (!child.classList.contains('sb-reveal')) {
          child.classList.add('sb-reveal');
        }
        child.style.setProperty('--sb-stagger-i', i);
        child.dataset.delay = (i * 0.08).toFixed(2);
      });
    });
  }

  /* ─── ImageReveal ────────────────────────────────────────── */
  function ImageReveal() {
    if (reduced) return;

    qsa('img[data-reveal-img]').forEach(img => {
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      img.style.transform = 'scale(1.04)';

      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'scale(1)';
          io.unobserve(entry.target);
        });
      }, { threshold: 0.1 });

      io.observe(img);
    });
  }

  /* ─── LineReveal (section dividers) ──────────────────────── */
  function LineReveal() {
    if (reduced) return;

    qsa('.sb-scan-line, .scan-line').forEach(el => {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('sb-scan-line--active');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      io.observe(el);
    });
  }

  /* ─── PageTransition ─────────────────────────────────────── */
  function PageTransition() {
    if (reduced) return;

    // Fade-in on load — start transparent only if the page isn't already visible
    if (document.readyState !== 'complete') {
      document.documentElement.style.opacity = '0';
      document.documentElement.style.transition = 'opacity 0.5s ease';
      window.addEventListener('load', () => {
        requestAnimationFrame(() => {
          document.documentElement.style.opacity = '1';
        });
      });
    }
  }

  /* ─── Auto-init existing stat/counter elements ────────────── */
  function AutoTagCounters() {
    // Tag elements that look like stats (number-only text content)
    qsa('.stat-value, .infra-value, .counter, [data-stat], .sb-stat-num').forEach(el => {
      if (el.dataset.count) return; // Already tagged
      const text = el.textContent.trim();
      const match = text.match(/^([^\d]*)([\d,]+\.?\d*)([^\d]*)$/);
      if (!match) return;
      const raw = parseFloat(match[2].replace(/,/g, ''));
      if (isNaN(raw) || raw === 0) return;
      el.dataset.count = raw;
      if (match[1]) el.dataset.countPrefix = match[1];
      if (match[3]) el.dataset.countSuffix = match[3];
      el.textContent = match[1] + '0' + match[3];
    });
  }

  /* ─── Auto-tag reveal elements ───────────────────────────── */
  function AutoTagReveals() {
    // Headings, paragraphs, and cards get reveal treatment if not already tagged
    const selectors = [
      'h1, h2, h3',
      '.section-header',
      '.feat-card',
      '.eco-card',
      '.testi-card',
      '.step-content',
      '.story-stat',
      '.process-step'
    ];

    selectors.forEach(sel => {
      qsa(sel).forEach(el => {
        if (!el.classList.contains('sb-reveal') && !el.classList.contains('reveal')) {
          el.classList.add('sb-reveal');
        }
      });
    });
  }

  /* ─── CinematicSystem ───────────────────────────────────── */
  function CinematicSystem() {
    if (reduced) return;

    // ─── UTILS ───
    const hexRgb = (h) => {
      const i = parseInt(h.slice(1), 16);
      return [ (i >> 16) & 255, (i >> 8) & 255, i & 255 ];
    };

    // ─── HERO: NET CANVAS ───
    (function initNet() {
      const c = qs('#net-canvas');
      if (!c) return;
      const x = c.getContext('2d');
      let w, h, pts = [];

      const resize = () => {
        const r = c.parentElement.getBoundingClientRect();
        w = c.width = r.width; h = c.height = r.height;
        pts = Array.from({ length: 45 }, () => ({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 2 + 1
        }));
      };

      function frame() {
        x.clearRect(0, 0, w, h);
        pts.forEach((p, i) => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          x.beginPath(); x.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          x.fillStyle = 'rgba(96,165,250,0.3)'; x.fill();
          for (let j = i + 1; j < pts.length; j++) {
            const d = Math.hypot(p.x - pts[j].x, p.y - pts[j].y);
            if (d < 140) {
              x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(pts[j].x, pts[j].y);
              x.strokeStyle = `rgba(59,130,246,${(1 - d / 140) * 0.15})`;
              x.stroke();
            }
          }
        });
        requestAnimationFrame(frame);
      }
      resize(); frame(); window.addEventListener('resize', resize);
    })();

    // ─── STORY: CONSTELLATION ───
    (function initConst() {
      const c = qs('#const-canvas');
      if (!c) return;
      const x = c.getContext('2d');
      let w, h, t = 0;
      const resize = () => {
        w = c.width = c.offsetWidth; h = c.height = c.offsetHeight;
      };
      function frame() {
        x.clearRect(0, 0, w, h); t += 0.01;
        // Subtle drift lines
        x.strokeStyle = 'rgba(59,130,246,0.06)'; x.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const y = (h * 0.2) + (i * h * 0.15) + Math.sin(t + i) * 20;
          x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y - 40, w * 0.7, y + 40, w, y);
          x.stroke();
        }
        requestAnimationFrame(frame);
      }
      resize(); frame(); window.addEventListener('resize', resize);
    })();

    // ─── ECOSYSTEM: CARDS PREVIEWS ───
    (function initEco() {
      const canvases = ['inboxes', 'sequencer', 'enrich'].map(id => qs(`#canvas-${id}`));
      canvases.forEach(c => {
        if (!c) return;
        const x = c.getContext('2d');
        const w = c.width = 400, h = c.height = 268;
        function frame() {
          x.clearRect(0, 0, w, h);
          // Simplified placeholder animations for the cinematic merge
          x.fillStyle = 'rgba(255,255,255,0.03)';
          x.fillRect(20, 20, w - 40, h - 40);
          requestAnimationFrame(frame);
        }
        frame();
      });
    })();

    // ─── PROCESS: TIMELINE ───
    (function initProc() {
      const c = qs('#process-canvas');
      if (!c) return;
      const x = c.getContext('2d');
      const w = c.width = 400, h = c.height = 300;
      let t = 0;
      function frame() {
        x.clearRect(0, 0, w, h); t += 0.02;
        x.translate(w / 2, h / 2);
        x.rotate(t * 0.2);
        x.strokeStyle = 'rgba(34,211,238,0.2)';
        x.strokeRect(-50, -50, 100, 100);
        x.setTransform(1, 0, 0, 1, 0, 0);
        requestAnimationFrame(frame);
      }
      frame();
    })();

    // ─── CTA: STARS & SCENE ───
    (function initCTA() {
      const starsC = qs('#stars-canvas');
      const sceneC = qs('#scene-canvas');
      if (!starsC || !sceneC) return;
      
      // Stars logic
      const sx = starsC.getContext('2d');
      let sw, sh, stars = [];
      const resizeS = () => {
        sw = starsC.width = window.innerWidth; sh = starsC.height = window.innerHeight;
        stars = Array.from({ length: 150 }, () => ({
          x: Math.random() * sw, y: Math.random() * sh,
          s: Math.random() * 1.5, a: Math.random()
        }));
      };
      function frameS() {
        sx.clearRect(0, 0, sw, sh);
        stars.forEach(s => {
          s.a += 0.01;
          sx.globalAlpha = 0.3 + Math.sin(s.a) * 0.3;
          sx.fillStyle = 'white';
          sx.beginPath(); sx.arc(s.x, s.y, s.s, 0, Math.PI * 2); sx.fill();
        });
        sx.globalAlpha = 1;
        requestAnimationFrame(frameS);
      }
      resizeS(); frameS(); window.addEventListener('resize', resizeS);

      // Scene logic
      const scx = sceneC.getContext('2d');
      let scw, sch;
      const resizeSc = () => {
        scw = sceneC.width = window.innerWidth; sch = sceneC.height = window.innerHeight;
      };
      function frameSc() {
        scx.clearRect(0, 0, scw, sch);
        // Horizon glow
        const g = scx.createLinearGradient(0, sch * 0.7, 0, sch);
        g.addColorStop(0, 'rgba(37,99,235,0)'); g.addColorStop(1, 'rgba(37,99,235,0.15)');
        scx.fillStyle = g; scx.fillRect(0, sch * 0.7, scw, sch * 0.3);
        requestAnimationFrame(frameSc);
      }
      resizeSc(); frameSc(); window.addEventListener('resize', resizeSc);
    })();
  }

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    ScrollProgress();
    CursorSystem();
    AutoTagReveals();
    AutoTagCounters();
    StaggerReveal();
    RevealSystem();
    ParallaxSystem();
    MagneticSystem();
    CounterSystem();
    ScrambleSystem();
    NavSystem();
    CardSpotlight();
    AmbientSystem();
    SectionAtmosphere();
    RippleSystem();
    SmoothScroll();
    TiltSystem();
    GlowHover();
    ImageReveal();
    LineReveal();
    PageTransition();
    CinematicSystem();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for manual use
  window.SBAnimations = { TextScramble, lerp, clamp };
})();
