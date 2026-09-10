/* ============================================================
   Cinematic homepage interactivity — index.html only.
   Progressive enhancement: every effect here checks for its
   library/API and for prefers-reduced-motion before running, and
   the page is fully readable/usable with none of it.
   ============================================================ */

(function () {
  const reduceMotion =
    typeof prefersReducedMotion === "function"
      ? prefersReducedMotion()
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // NOTE: script.js/home.js load without `defer`, but the GSAP/ScrollTrigger/
  // Lenis <script> tags in <head> do use `defer` — so at the moment this file
  // itself executes, those libraries have not necessarily loaded yet. Every
  // check below is re-evaluated inside the DOMContentLoaded handler (which
  // always fires after all deferred scripts have run), never hoisted to
  // module-load time, so the feature checks stay accurate.
  let hasGSAP = false;
  let hasScrollTrigger = false;
  let hasLenis = false;

  function detectLibraries() {
    hasGSAP = typeof window.gsap !== "undefined";
    hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== "undefined";
    hasLenis = typeof window.Lenis !== "undefined";

    if (hasGSAP && hasScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
    }
  }

  /* ---------- Lenis smooth scroll ---------- */
  function initLenis() {
    if (reduceMotion || !hasLenis) return null;

    const lenis = new window.Lenis({
      duration: 1.1,
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (hasScrollTrigger) {
      lenis.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add((time) => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    }

    return lenis;
  }

  /* ---------- custom cursor ---------- */
  function initCustomCursor() {
    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (reduceMotion || isTouch) {
      document.body.classList.add("no-custom-cursor");
      return;
    }

    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    if (!dot || !ring) return;

    let ringX = window.innerWidth / 2;
    let ringY = window.innerHeight / 2;
    let targetX = ringX;
    let targetY = ringY;

    window.addEventListener(
      "mousemove",
      (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
        dot.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
      },
      { passive: true }
    );

    function tick() {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    document.querySelectorAll("a, button, .journey-card").forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("is-active"));
      el.addEventListener("mouseleave", () => ring.classList.remove("is-active"));
    });
  }

  /* ---------- nav scroll-blur state ---------- */
  function initNavBlur() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- hero particle network ---------- */
  function initParticleField() {
    const canvas = document.getElementById("particle-field");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width, height, particles;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const COUNT = reduceMotion ? 0 : 70;

    function resize() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * DPR;
      canvas.height = height * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function makeParticles() {
      particles = Array.from({ length: COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    }

    function drawStatic() {
      resize();
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(139, 226, 138, 0.5)";
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (reduceMotion) {
      drawStatic();
      window.addEventListener("resize", drawStatic, { passive: true });
      return;
    }

    resize();
    makeParticles();

    const LINK_DIST = 130;

    function step() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            ctx.strokeStyle = `rgba(139, 226, 138, ${0.16 * (1 - dist / LINK_DIST)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = "rgba(139, 226, 138, 0.75)";
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
    window.addEventListener(
      "resize",
      () => {
        resize();
      },
      { passive: true }
    );
  }

  /* ---------- impact orbit canvas ---------- */
  function initImpactOrbit() {
    const canvas = document.getElementById("impact-orbit");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let size;
    let angle = 0;

    function resize() {
      size = canvas.clientWidth;
      canvas.width = size * DPR;
      canvas.height = size * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const rings = [0.32, 0.5, 0.68, 0.86];

    function draw() {
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;

      ctx.strokeStyle = "rgba(139, 226, 138, 0.16)";
      rings.forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * (size / 2), 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.fillStyle = "#8be28a";
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.045, 0, Math.PI * 2);
      ctx.fill();

      rings.forEach((r, i) => {
        const speed = 0.4 + i * 0.18;
        const a = angle * speed + i;
        const x = cx + Math.cos(a) * r * (size / 2);
        const y = cy + Math.sin(a) * r * (size / 2);
        ctx.beginPath();
        ctx.arc(x, y, size * 0.014, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(242, 244, 236, 0.9)";
        ctx.fill();
      });
    }

    if (reduceMotion) {
      draw();
      return;
    }

    function loop() {
      angle += 0.0035;
      draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ---------- morph text crossfade ---------- */
  function initMorph() {
    const wrap = document.querySelector(".cine-morph-inner");
    if (!wrap) return;
    const out = wrap.querySelector(".morph-out");
    const inEl = wrap.querySelector(".morph-in");
    if (!out || !inEl) return;

    if (reduceMotion || !hasGSAP || !hasScrollTrigger) {
      out.style.opacity = "0";
      inEl.style.opacity = "1";
      return;
    }

    window.gsap.set(inEl, { opacity: 0, y: 20 });

    window.gsap.timeline({
      scrollTrigger: {
        trigger: ".cine-morph",
        start: "top top",
        end: "+=120%",
        scrub: 0.6,
        pin: true,
      },
    })
      .to(out, { opacity: 0, y: -20, duration: 0.4 })
      .to(inEl, { opacity: 1, y: 0, duration: 0.4 }, "-=0.1");
  }

  /* ---------- pinned horizontal journey ---------- */
  function initJourney() {
    const pinWrap = document.querySelector(".cine-journey-pin");
    const track = document.querySelector(".cine-journey-track");
    const bar = document.querySelector(".cine-journey-progress-bar");
    if (!pinWrap || !track) return;

    if (reduceMotion || !hasGSAP || !hasScrollTrigger) return;

    pinWrap.classList.add("js-pinned-journey");

    function distance() {
      return Math.max(track.scrollWidth - window.innerWidth + 64, 0);
    }

    window.gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: pinWrap,
        start: "top top",
        end: () => "+=" + (distance() + window.innerHeight * 0.6),
        scrub: 0.5,
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          if (bar) bar.style.width = self.progress * 100 + "%";
        },
      },
    });
  }

  /* ---------- generic reveal for cinematic sections ---------- */
  function initCineReveal() {
    const els = document.querySelectorAll(
      ".cine-problem-copy, .cine-impact-copy, #impact-orbit, .cine-explore-card, .cine-partners-placeholder, .cine-cta h2, .cine-cta p, .cine-cta .cta-actions"
    );
    if (!els.length || reduceMotion || !("IntersectionObserver" in window)) return;

    els.forEach((el) => el.classList.add("reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => observer.observe(el));
  }

  window.addEventListener("DOMContentLoaded", () => {
    detectLibraries();
    initLenis();
    initCustomCursor();
    initNavBlur();
    initParticleField();
    initImpactOrbit();
    initMorph();
    initJourney();
    initCineReveal();
  });
})();
