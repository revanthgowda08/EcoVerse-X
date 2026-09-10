function initConnectForms() {
  document.querySelectorAll(".connect-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector(".form-status");
      const button = form.querySelector("button[type='submit']");
      button.disabled = true;
      status.textContent = "";
      status.classList.remove("success", "error");

      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        if (response.ok) {
          status.textContent = "Thanks — we'll be in touch soon.";
          status.classList.add("success");
          form.reset();
        } else {
          status.textContent =
            "Something went wrong. Please try again or email us directly.";
          status.classList.add("error");
        }
      } catch (error) {
        status.textContent =
          "Something went wrong. Please try again or email us directly.";
        status.classList.add("error");
      } finally {
        button.disabled = false;
      }
    });
  });
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function initScrollReveal() {
  const selectors = [
    ".feature-card",
    ".venture-card",
    ".world-card",
    ".loop-steps li",
    ".article-card",
    ".explore-card",
    ".connect-form",
    ".metrics div",
    ".vision-media",
  ];
  const els = document.querySelectorAll(selectors.join(","));
  if (!els.length) return;

  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    return;
  }

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
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  els.forEach((el) => observer.observe(el));
}

function initCounters() {
  const counters = document.querySelectorAll(".metrics dt");
  if (!counters.length) return;

  function animateCounter(el) {
    const match = el.textContent.trim().match(/^(\d+)(.*)$/);
    if (!match) return;
    const target = parseInt(match[1], 10);
    const suffix = match[2] || "";

    if (prefersReducedMotion()) {
      el.textContent = target + suffix;
      return;
    }

    const duration = 1200;
    let start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  if (!("IntersectionObserver" in window)) {
    counters.forEach(animateCounter);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}

function initMagneticButtons() {
  if (prefersReducedMotion() || window.matchMedia("(hover: none)").matches) {
    return;
  }

  document.querySelectorAll(".button").forEach((btn) => {
    btn.addEventListener("mousemove", (event) => {
      const rect = btn.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.22}px, ${y * 0.35}px)`;
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
    });
  });
}

function initParallax() {
  if (prefersReducedMotion()) return;

  const headerEl = document.querySelector(".site-header");

  const imageTargets = Array.prototype.slice.call(
    document.querySelectorAll(".hero-image, .article-cover img, .vision-media img")
  );

  // Each layer moves at its own speed/range, creating depth as the page
  // scrolls. Deliberately excludes body paragraph text — moving actual
  // reading copy hurts legibility, especially on the long-form articles.
  const layerConfigs = [
    { selector: ".launch-panel", speed: -0.09, clamp: 34, guardHeader: false },
    { selector: ".hero-content", speed: -0.03, clamp: 14, guardHeader: true },
    {
      selector: [
        ".intro-section h2",
        ".loop-section h2",
        ".venture-intro h2",
        ".worlds-section > div:first-child h2",
        ".journal-hero h1",
        ".article-header h1",
        ".connect-intro h2",
        ".vision-copy h2",
      ].join(","),
      speed: -0.05,
      clamp: 18,
      guardHeader: true,
    },
    {
      selector: [
        ".intro-section .section-label",
        ".loop-section .section-label",
        ".venture-intro .section-label",
        ".worlds-section > div:first-child .section-label",
        ".connect-intro .section-label",
        ".vision-copy .section-label",
        ".journal-hero .eyebrow",
        ".article-header .eyebrow",
        ".venture-tag",
        ".world-tag",
        ".article-tag",
      ].join(","),
      speed: -0.03,
      clamp: 10,
      guardHeader: true,
    },
    {
      selector: ".feature-card svg, .explore-card svg, .loop-index, .metrics dt",
      speed: -0.04,
      clamp: 16,
      guardHeader: true,
    },
  ];

  const layers = layerConfigs
    .map((cfg) => ({
      els: Array.prototype.slice.call(document.querySelectorAll(cfg.selector)),
      speed: cfg.speed,
      clamp: cfg.clamp,
      guardHeader: cfg.guardHeader,
    }))
    .filter((layer) => layer.els.length);

  if (!imageTargets.length && !layers.length) return;

  let ticking = false;

  function update() {
    const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 90;

    imageTargets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -0.06;
      el.style.transform = `translateY(${offset}px) scale(1.08)`;
    });

    layers.forEach((layer) => {
      layer.els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // Freeze the offset once the element nears the fixed header so it
        // never drifts up underneath/through it.
        if (layer.guardHeader && rect.top < headerHeight) {
          el.style.transform = "translateY(0px)";
          return;
        }
        const raw = (rect.top + rect.height / 2 - window.innerHeight / 2) * layer.speed;
        const offset = Math.max(-layer.clamp, Math.min(layer.clamp, raw));
        el.style.transform = `translateY(${offset}px)`;
      });
    });

    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );

  update();
}

window.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
  initConnectForms();
  initScrollReveal();
  initCounters();
  initMagneticButtons();
  initParallax();
});
