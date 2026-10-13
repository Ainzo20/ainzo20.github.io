/* ==========================================================================
   Portfolio script
   Language switch, theme toggle, copy email, design gallery + lightbox, toast,
   hero orb word cycler.
   Requires i18n.js (window.I18N) to be loaded first.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Config ---------- */
  var STORAGE_KEYS = { theme: "theme", lang: "lang" };
  var SUPPORTED_LANGS = ["en", "fr"];
  var EMAIL = "karlvait21@gmail.com";
  var TOAST_DURATION_MS = 2000;
  var SWIPE_THRESHOLD_PX = 50;

  // Hero orb word cycler settings
  var ORB_WORDS = [
    // Orb 0 (large, top-left): the developer side
    ["Web apps", "APIs", "Backends", "Interfaces", "Full-stack"],

    // Orb 1 (middle): the range of deliverables
    ["Websites", "Mobile apps", "Dashboards", "Designs", "Products"],

    // Orb 2 (small, top-right): the craft
    ["Clean code", "UI design", "Data", "Testing", "Identity"]
  ];
  var MIN_CYCLE_MS = 3200;
  var MAX_CYCLE_MS = 5200;
  var WORD_FADE_MS = 500;

  var root = document.documentElement;

  /* ---------- Helpers ---------- */
  function all(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  // localStorage can throw (private mode, blocked cookies), so wrap it once.
  function readStorage(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function currentLang() {
    var lang = root.getAttribute("lang");
    return SUPPORTED_LANGS.indexOf(lang) > -1 ? lang : "en";
  }

  // Look up a key in the current language, fall back to English, then to the key.
  function t(key) {
    var dict = window.I18N || {};
    var lang = currentLang();
    return (dict[lang] && dict[lang][key]) || (dict.en && dict.en[key]) || key;
  }

  // "{n} of {total}" -> "2 of 6"
  function formatCount(n, total) {
    return t("gallery.count").replace("{n}", n).replace("{total}", total);
  }

  /* ---------- 1. Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- 2. Language ---------- */
  var langToggle = document.getElementById("lang-toggle");

  function applyLanguage(lang) {
    root.setAttribute("lang", lang);

    // Plain text
    all("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });

    // Text with inline markup (trusted strings from i18n.js only)
    all("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });

    // Attributes, format: "aria-label:nav.label;title:other.key"
    all("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var parts = pair.split(":");
        if (parts.length === 2) el.setAttribute(parts[0].trim(), t(parts[1].trim()));
      });
    });

    // Links that differ per language (e.g. the resume PDF)
    all("[data-href-" + lang + "]").forEach(function (el) {
      el.setAttribute("href", el.getAttribute("data-href-" + lang));
    });

    // Document metadata
    document.title = t("meta.title");
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", t("meta.description"));

    // The button shows the language you can switch TO
    if (langToggle) langToggle.textContent = lang === "en" ? "FR" : "EN";
  }

  if (langToggle) {
    langToggle.addEventListener("click", function () {
      var next = currentLang() === "en" ? "fr" : "en";
      writeStorage(STORAGE_KEYS.lang, next);
      applyLanguage(next);
    });
  }

  /* ---------- 3. Theme (state + effect, vanilla) ---------- */
  var themeToggle = document.getElementById("theme-toggle");

  // STATE: the current theme lives on the <html> element as data-theme.
  // It also persists to localStorage so it survives reloads.
  function getTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  // SETTER: change the state, persist it, then trigger the effect.
  function setTheme(next) {
    root.setAttribute("data-theme", next);
    writeStorage(STORAGE_KEYS.theme, next);
    runThemeEffect();
  }

  // EFFECT: runs every time the theme changes.
  // Colors are NOT handled here. They live in CSS via --tokens, which is
  // the correct place for them. This function only handles the things CSS
  // cannot touch: accessibility state and mobile browser chrome.
  function runThemeEffect() {
    var isDark = getTheme() === "dark";

    // 1. Screen reader state on the toggle button
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(isDark));
    }

    // 2. Mobile browser chrome: match --bg so the address bar does not clash
    var styles = getComputedStyle(root);
    var bg = styles.getPropertyValue("--bg").trim();
    if (bg) {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", bg);
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      setTheme(getTheme() === "dark" ? "light" : "dark");
    });
  }

  // Follow the OS theme live, unless the user already chose manually
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (event) {
    if (readStorage(STORAGE_KEYS.theme)) return;
    setTheme(event.matches ? "dark" : "light");
  });

  /* ---------- 4. Toast ---------- */
  var toast = document.getElementById("toast");
  var toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer); // rapid clicks must not hide the toast early
    toastTimer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, TOAST_DURATION_MS);
  }

  /* ---------- 5. Copy email ---------- */
  var copyBtn = document.getElementById("copy-email");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        showToast(t("toast.unsupported"));
        return;
      }
      navigator.clipboard.writeText(EMAIL)
        .then(function () { showToast(t("toast.copied")); })
        .catch(function () { showToast(t("toast.failed")); });
    });
  }

  /* ---------- 6. Design gallery (scroll-snap carousel) ---------- */
  var track = document.getElementById("gallery-track");
  var galleryPrev = document.getElementById("gallery-prev");
  var galleryNext = document.getElementById("gallery-next");
  var slides = all(".gallery-slide");

  function setDisabled(button, disabled) {
    button.setAttribute("aria-disabled", String(disabled));
  }

  function updateGalleryButtons() {
    var maxScroll = track.scrollWidth - track.clientWidth;
    setDisabled(galleryPrev, track.scrollLeft <= 1);
    setDisabled(galleryNext, track.scrollLeft >= maxScroll - 1);
  }

  function scrollGallery(direction) {
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    var step = slides[0].getBoundingClientRect().width + gap;
    track.scrollBy({
      left: direction * step,
      behavior: prefersReducedMotion() ? "auto" : "smooth"
    });
  }

  if (track && galleryPrev && galleryNext && slides.length) {
    // aria-disabled (not `disabled`) keeps keyboard focus on the button at the ends.
    galleryPrev.addEventListener("click", function () {
      if (galleryPrev.getAttribute("aria-disabled") !== "true") scrollGallery(-1);
    });
    galleryNext.addEventListener("click", function () {
      if (galleryNext.getAttribute("aria-disabled") !== "true") scrollGallery(1);
    });

    // Scroll fires many times per second: update once per animation frame.
    var ticking = false;
    track.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        updateGalleryButtons();
        ticking = false;
      });
    }, { passive: true });
    window.addEventListener("resize", updateGalleryButtons);
    updateGalleryButtons();
  }

  /* ---------- 7. Lightbox (with previous / next) ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxCaptionText = document.getElementById("lightbox-caption-text");
  var lightboxCount = document.getElementById("lightbox-count");
  var lightboxPrev = document.getElementById("lightbox-prev");
  var lightboxNext = document.getElementById("lightbox-next");
  var lightboxClose = document.getElementById("lightbox-close");
  var currentIndex = 0;

  // Show slide `index`, wrapping around at both ends.
  function showSlide(index) {
    currentIndex = (index + slides.length) % slides.length;
    var slide = slides[currentIndex];
    var title = slide.querySelector(".gallery-caption strong");
    var desc = slide.querySelector(".gallery-caption span");

    lightboxImg.src = slide.getAttribute("data-full");
    lightboxImg.alt = (title ? title.textContent : "") + (desc ? ", " + desc.textContent : "");
    lightboxCaptionText.textContent = t(slide.getAttribute("data-caption-key"));
    lightboxCount.textContent = formatCount(currentIndex + 1, slides.length);
  }

  if (lightbox && lightboxImg && slides.length) {
    slides.forEach(function (slide, index) {
      slide.querySelector(".gallery-open").addEventListener("click", function () {
        showSlide(index);
        lightbox.showModal();
      });
    });

    lightboxPrev.addEventListener("click", function () { showSlide(currentIndex - 1); });
    lightboxNext.addEventListener("click", function () { showSlide(currentIndex + 1); });
    lightboxClose.addEventListener("click", function () { lightbox.close(); });

    // Keyboard: arrows navigate (Escape is handled natively by <dialog>).
    lightbox.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") showSlide(currentIndex - 1);
      if (event.key === "ArrowRight") showSlide(currentIndex + 1);
    });

    // Touch: horizontal swipe navigates.
    var touchStartX = null;
    lightbox.addEventListener("touchstart", function (event) {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    lightbox.addEventListener("touchend", function (event) {
      if (touchStartX === null) return;
      var deltaX = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) showSlide(currentIndex + (deltaX < 0 ? 1 : -1));
    }, { passive: true });

    // The figure fills the whole dialog, so "click outside" means
    // "click on anything that is not the image, the caption or a button".
    lightbox.addEventListener("click", function (event) {
      if (!event.target.closest("img, figcaption, .lightbox-close, .lightbox-nav")) lightbox.close();
    });

    // On close (button, Escape or backdrop): free the image and give focus back
    // to the slide the visitor ended on, not the one they opened.
    lightbox.addEventListener("close", function () {
      lightboxImg.removeAttribute("src");
      slides[currentIndex].querySelector(".gallery-open").focus();
    });
  }

    /* ---------- 7b. Header scroll state ---------- */
  // Adds .is-scrolled to the header once the page has scrolled past a
  // small threshold, so the sticky bar gains a shadow and stronger
  // background. Uses rAF throttling because scroll fires many times
  // per second.
  function startHeaderScrollState() {
    var header = document.querySelector(".site-header");
    if (!header) return;

    var ticking = false;
    function update() {
      var scrolled = window.scrollY > 8;
      header.classList.toggle("is-scrolled", scrolled);
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });

    update();   // set the correct state on load
  }


  /* ---------- 8. Hero orb words ---------- */
  // Each orb cycles through its own list of skills. The lists have
  // different lengths on purpose so the three orbs never sync up.
  // Timing is randomized per cycle so the motion never feels mechanical.
  function cycleOrbWord(el, words, index) {
    el.classList.add("is-changing");
    window.setTimeout(function () {
      el.textContent = words[index % words.length];
      el.classList.remove("is-changing");
    }, WORD_FADE_MS);
  }

  function startOrbCycler() {
    var orbWords = all(".orb-word");
    if (!orbWords.length) return;

    // Reduced motion: show one word per orb and never cycle.
    if (prefersReducedMotion()) {
      orbWords.forEach(function (el) {
        var idx = parseInt(el.getAttribute("data-orb"), 10) || 0;
        el.textContent = ORB_WORDS[idx] ? ORB_WORDS[idx][0] : "";
      });
      return;
    }

    orbWords.forEach(function (el) {
      var idx = parseInt(el.getAttribute("data-orb"), 10) || 0;
      var words = ORB_WORDS[idx] || [];
      if (!words.length) return;

      var wordIndex = 0;
      el.textContent = words[wordIndex];   // show the first word immediately

      function scheduleNext() {
        var delay = MIN_CYCLE_MS + Math.random() * (MAX_CYCLE_MS - MIN_CYCLE_MS);
        window.setTimeout(function () {
          wordIndex += 1;
          cycleOrbWord(el, words, wordIndex);
          scheduleNext();
        }, delay);
      }
      scheduleNext();
    });
  }

    /* ---------- 9. Scroll reveals ---------- */
  // Elements with .reveal fade up when they enter the viewport.
  // Uses IntersectionObserver so there is no scroll listener and
  // no layout thrashing. Each element reveals once, then stops being
  // observed. Reduced-motion users see everything immediately.
  function startScrollReveals() {
    var elements = all(".reveal");
    if (!elements.length) return;

    // No IntersectionObserver (very old browsers): just show everything.
    if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
      elements.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);   // reveal once, then stop watching
        }
      });
    }, {
      // Trigger when ~15% of the element is visible, with a small
      // bottom margin so items reveal slightly before hitting the edge.
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px"
    });

    elements.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Init ---------- */
  applyLanguage(currentLang());
  runThemeEffect();   // run once on load, like useEffect with no dependencies
  startOrbCycler();
  startScrollReveals();
  startHeaderScrollState();
})();
