/* ==========================================================================
   Web Designs by Haven: main.js
   Plain JavaScript, no libraries.
   ========================================================================== */

/* --------------------------------------------------------------------------
   >>> 1. QUOTE FORM → GMAIL: REPLACE THIS <<<
   Paste your Google Apps Script "Web app" URL here (README.md, step 1).
   It ends in /exec. While it still says YOUR_APPS_SCRIPT_URL_HERE, the form
   runs in preview mode: it shows the confirmation but sends nothing.
   -------------------------------------------------------------------------- */
const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx-02Ap8oKV1Pw5LqbU175hHi0FXZLfjSYSwKJEW-3LbqBkdP8jKdmw_hC4Sotv2aiC/exec';

/* --------------------------------------------------------------------------
   >>> 2. CONSULTATION BOOKING → GOOGLE CALENDAR <<<
   Your Google Calendar appointment schedule link (README.md, step 2).
   The "Choose a time" button opens it in a new tab, where Google takes the
   $20 payment through Stripe. Either the long link (…/appointments/schedules/…)
   or the short share link (https://calendar.app.google/…) works.
   While it says YOUR_BOOKING_URL_HERE, a "booking opens soon" note shows.
   -------------------------------------------------------------------------- */
const BOOKING_URL = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1Q5F74ffKXCiqlz4yuGBwal7FCJKbMy-8JYSYDOU5OkCIH8eJu_eOvgAteJN2A6ReZXtQWbgcQ?gv=true';

/* Upload limits for "Upload images of your work" */
const MAX_FILES = 10;
const MAX_FILE_MB = 10;      // per image, before shrinking
const IMAGE_MAX_PX = 2000;   // images are shrunk to this size in the browser before sending
const MAX_TOTAL_MB = 30;     // total upload after shrinking (Google's limit is about 50 MB)

/* Intro screens ("Hello!" → "I've got you."): how the snap feels */
const INTRO_AXIS = 'x';          // 'x' = screens swipe sideways (next comes in from the right), 'y' = up/down
const INTRO_DURATION_MS = 900;   // length of one swipe
const INTRO_RECOIL = 4;          // how far (in % of the screen) it overshoots before settling back

/* Work showcase: time each screenshot stays on screen */
const SLIDE_INTERVAL_MS = 4000;

/* ------------------------------------------------------------------------ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

document.addEventListener('DOMContentLoaded', () => {
  initSlotFit();
  initIntro();
  initEyes();
  initHeader();
  initNav();
  initReveal();
  initShowcase();
  initTierButtons();
  initBooking();
  initQuestionForm();
  initAiPolicy();
  initQuoteForm();

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
});

/* ---------- Intro: snapping swipe between the five screens ----------
   While the intro fills the screen (page scrolled to the very top), each scroll
   gesture, swipe or arrow key moves exactly one screen, with a slight overshoot
   and spring back. Past the last screen the page scrolls normally; scrolling back
   up to the top steps back through the screens. */
function initIntro() {
  const intro = document.querySelector('[data-intro]');
  if (!intro || reduceMotion.matches) return; // reduced motion: screens just stack and scroll normally
  const slides = Array.from(intro.querySelectorAll('[data-slide]'));
  const last = slides.length - 1;
  if (last < 1) return;

  intro.classList.add('is-snapping');

  // Get every screen's photo fully ready now, so no screen flashes blank mid-swipe.
  intro.querySelectorAll('img').forEach((img) => {
    img.loading = 'eager';
    if (img.decode) img.decode().catch(() => {});
  });

  // Always open on "Hello!": stop the browser restoring an old scroll position.
  // Only a deliberate link to a section (e.g. #book) skips past the intro.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const deepLink = location.hash && location.hash !== '#intro';
  if (!deepLink) window.scrollTo(0, 0);
  let index = deepLink ? last : 0;
  slides[index].classList.add('is-current', 'is-settled');

  // Runs once a swipe (including its recoil) has fully finished.
  function settled(slide) {
    slide.classList.add('is-settled'); // turns "this?" red
    if (slide.matches('.intro__slide--maybe') && window.luckySlot && !window.luckySlot.isSpinning()) {
      setTimeout(() => window.luckySlot.spin(), 150); // the slot machine spins by itself
    }
  }

  let animating = false;
  let locked = false;      // ignore the tail of a scroll gesture (trackpad momentum)
  let lastWheel = 0;
  let lastDelta = 0;
  let unlockTimer = null;

  const atTop = () => window.scrollY <= 2;
  const QUIET_MS = 180;    // a gesture is over once the wheel has been quiet this long

  const tf = (v) => (INTRO_AXIS === 'x' ? `translate3d(${v}%,0,0)` : `translate3d(0,${v}%,0)`);

  function go(dir) {
    const to = index + dir;
    if (animating || to < 0 || to > last) return;
    animating = true;
    const from = slides[index];
    const next = slides[to];
    from.classList.remove('is-settled');
    next.classList.remove('is-settled');
    next.classList.add('is-incoming');

    // Swipe in, overshoot by INTRO_RECOIL %, then settle back: the "recoil".
    const SNAP = 'cubic-bezier(.77, 0, .18, 1)';
    const SETTLE = 'cubic-bezier(.3, 0, .25, 1)';
    const timing = { duration: INTRO_DURATION_MS, fill: 'both' };
    const r = INTRO_RECOIL;
    const outAnim = from.animate([
      { transform: tf(0), easing: SNAP },
      { transform: tf(-dir * (100 + r)), offset: 0.7, easing: SETTLE },
      { transform: tf(-dir * 100) },
    ], timing);
    next.animate([
      { transform: tf(dir * 100), easing: SNAP },
      { transform: tf(-dir * r), offset: 0.7, easing: SETTLE },
      { transform: tf(0) },
    ], timing);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      from.classList.remove('is-current');
      next.classList.remove('is-incoming');
      next.classList.add('is-current');
      from.getAnimations().forEach((a) => a.cancel());
      next.getAnimations().forEach((a) => a.cancel());
      index = to;
      animating = false;
      settled(next);
      scheduleUnlock();
    };
    outAnim.finished.then(finish, finish);
    setTimeout(finish, INTRO_DURATION_MS + 150); // backup, in case the browser pauses animations
  }

  function scheduleUnlock() {
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => {
      if (animating) return scheduleUnlock();
      if (performance.now() - lastWheel < QUIET_MS) return scheduleUnlock();
      locked = false;
    }, QUIET_MS);
  }

  // Should the intro handle a move in this direction right now?
  const wants = (dir) => atTop() && (dir > 0 ? index < last : index > 0);

  /* Mouse wheel / trackpad */
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // pinch-zoom
    const delta = INTRO_AXIS === 'x' && Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 1) return;
    const dir = delta > 0 ? 1 : -1;
    if (!wants(dir)) return;
    e.preventDefault();

    const now = performance.now();
    // A sharp new push after a pause-free stream still counts as a new gesture.
    const newImpulse = Math.abs(delta) > 40 && Math.abs(delta) > Math.abs(lastDelta) * 1.8;
    lastWheel = now;
    lastDelta = delta;

    if (animating) return;
    if (locked && !newImpulse) { scheduleUnlock(); return; }
    locked = true;
    go(dir);
    scheduleUnlock();
  }, { passive: false });

  /* Touch swipes */
  let touch = null;
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, handled: null };
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!touch) return;
    const dx = touch.x - e.touches[0].clientX;
    const dy = touch.y - e.touches[0].clientY;
    if (touch.handled === null && Math.max(Math.abs(dx), Math.abs(dy)) > 6) {
      const d = INTRO_AXIS === 'x' && Math.abs(dx) > Math.abs(dy) ? dx : dy;
      touch.handled = wants(d > 0 ? 1 : -1);
    }
    if (touch.handled) e.preventDefault(); // stop the page scrolling while the intro swipes
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    if (!touch || !touch.handled) { touch = null; return; }
    const t = e.changedTouches[0];
    const dx = touch.x - t.clientX;
    const dy = touch.y - t.clientY;
    const d = INTRO_AXIS === 'x' && Math.abs(dx) > Math.abs(dy) ? dx : dy;
    touch = null;
    if (Math.abs(d) > 35) go(d > 0 ? 1 : -1);
  });

  /* Keyboard: arrows, Page Up/Down, Space */
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof Element && e.target.closest('input, textarea, select, button, [contenteditable]')) return;
    const forward = ['ArrowDown', 'PageDown', ' ', ...(INTRO_AXIS === 'x' ? ['ArrowRight'] : [])];
    const back = ['ArrowUp', 'PageUp', ...(INTRO_AXIS === 'x' ? ['ArrowLeft'] : [])];
    const dir = forward.includes(e.key) && !e.shiftKey ? 1
      : back.includes(e.key) || (e.key === ' ' && e.shiftKey) ? -1 : 0;
    if (!dir || !wants(dir)) return;
    e.preventDefault();
    go(dir);
  });

  // Arriving back at the top with leftover scroll momentum shouldn't instantly step back.
  let wasAtTop = atTop();
  window.addEventListener('scroll', () => {
    const now = atTop();
    if (now && !wasAtTop) { locked = true; lastWheel = performance.now(); scheduleUnlock(); }
    wasAtTop = now;
  }, { passive: true });

  // Links back to the very top (e.g. the "Haven" wordmark when it points at #intro) restart the intro.
  window.addEventListener('hashchange', () => {
    if (location.hash === '#intro') {
      slides[index].classList.remove('is-current', 'is-settled');
      index = 0;
      slides[0].classList.add('is-current', 'is-settled');
    }
  });
}

/* ---------- "Looking for this?": the eyes follow the mouse ----------
   Each eye window holds a copy of the photo lined up exactly over the original;
   sliding that copy a little moves the iris while the lids and lashes stay put.
   Without a mouse (phones), the eyes glance around slowly on their own. */
function initEyes() {
  const eyes = Array.from(document.querySelectorAll('[data-eye]'));
  const slide = document.querySelector('.intro__slide--looking');
  if (!eyes.length || !slide || reduceMotion.matches) return;

  const MAX_X = 0.16; // furthest the iris travels sideways, as a share of the eye window's width
  const MAX_Y = 0.05; // and up/down, as a share of its height (kept small so lashes don't shift)
  const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let mouse = null;   // last mouse position
  let look = { x: 0, y: 0 };   // where the eyes are looking now (-1 … 1)
  let running = false;

  if (hasMouse) {
    window.addEventListener('mousemove', (e) => { mouse = { x: e.clientX, y: e.clientY }; wake(); }, { passive: true });
    document.addEventListener('mouseleave', () => { mouse = null; });
  }

  const visible = () => {
    const intro = slide.closest('.intro');
    if (intro && intro.classList.contains('is-snapping')) {
      return slide.classList.contains('is-current') || slide.classList.contains('is-incoming');
    }
    const r = slide.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  };

  function target(t) {
    if (mouse) {
      // Aim at the mouse from the point between the two eyes.
      const a = eyes[0].getBoundingClientRect();
      const b = eyes[eyes.length - 1].getBoundingClientRect();
      const cx = (a.left + b.right) / 2;
      const cy = (a.top + b.bottom) / 2;
      return {
        x: Math.max(-1, Math.min(1, (mouse.x - cx) / (window.innerWidth * 0.45))),
        y: Math.max(-1, Math.min(1, (mouse.y - cy) / (window.innerHeight * 0.45))),
      };
    }
    if (!hasMouse) {
      // Idle glance: drift left and right, pausing now and then.
      return { x: Math.sin(t / 1400) * 0.8 * Math.min(1, Math.abs(Math.sin(t / 3100)) * 1.6), y: 0 };
    }
    return { x: 0, y: 0 };
  }

  function frame(t) {
    if (!visible()) { running = false; return; }
    const goal = target(t);
    look.x += (goal.x - look.x) * 0.12; // ease toward the goal for a natural follow
    look.y += (goal.y - look.y) * 0.12;
    eyes.forEach((eye) => {
      const img = eye.firstElementChild;
      img.style.transform = `translate(${(look.x * MAX_X * eye.clientWidth).toFixed(2)}px, ${(look.y * MAX_Y * eye.clientHeight).toFixed(2)}px)`;
    });
    requestAnimationFrame(frame);
  }

  function wake() {
    if (running || !visible()) return;
    running = true;
    requestAnimationFrame(frame);
  }

  // Start whenever the "Looking for this?" screen comes into view.
  new MutationObserver(wake).observe(slide, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('scroll', wake, { passive: true });
  wake();
}

/* ---------- Slot machine: scale the 860px-wide machine to fit its box ---------- */
function initSlotFit() {
  const box = document.querySelector('[data-slot-fit]');
  const inner = box && box.querySelector('[data-slot-inner]');
  if (!inner) return;
  const fit = () => {
    const scale = box.clientWidth / inner.offsetWidth; // layout width comes from CSS (--slot-layout-width)
    inner.style.transform = `scale(${scale})`;
    box.style.height = `${inner.offsetHeight * scale}px`;
  };
  fit();
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(inner);
  if (document.fonts) document.fonts.ready.then(fit);
}

/* ---------- Header: hairline border once the page scrolls ---------- */
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

/* ---------- Mobile menu ---------- */
function initNav() {
  const toggle = document.querySelector('.nav__toggle');
  const links = document.getElementById('nav-links');
  if (!toggle || !links) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // Close after choosing a link, on Escape, or when clicking elsewhere.
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav')) setOpen(false);
  });
}

/* ---------- Subtle scroll fade-ins ---------- */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach((el) => io.observe(el));
}

/* ---------- Work showcase: laptop screenshot rotation ---------- */
function initShowcase() {
  const root = document.querySelector('[data-showcase]');
  if (!root) return;

  const slides = Array.from(root.querySelectorAll('.laptop__slide'));
  const dotsWrap = root.querySelector('[data-showcase-dots]');
  const caption = root.querySelector('[data-showcase-caption]');
  const pauseBtn = root.querySelector('[data-showcase-pause]');
  if (slides.length < 2) return;

  let index = 0;
  let timer = null;
  let hoverPaused = false;
  let focusPaused = false;
  // People who ask for reduced motion start paused; they can press play.
  let userPaused = reduceMotion.matches;

  // Build one dot per slide.
  const dots = slides.map((slide, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'showcase__dot';
    btn.setAttribute('aria-label', `Show ${slide.dataset.title || `screenshot ${i + 1}`} (${i + 1} of ${slides.length})`);
    btn.addEventListener('click', () => {
      goTo(i);
      restart();
    });
    dotsWrap.appendChild(btn);
    return btn;
  });

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      const active = n === index;
      s.classList.toggle('is-active', active);
      s.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((d, n) => d.setAttribute('aria-current', n === index ? 'true' : 'false'));
    if (caption) caption.textContent = slides[index].dataset.title || '';

    // Warm up the next screenshot so the crossfade never shows a blank screen.
    const next = slides[(index + 1) % slides.length];
    if (next.loading === 'lazy' && isNearViewport(root)) next.loading = 'eager';
  }

  function isRunning() {
    return !userPaused && !hoverPaused && !focusPaused && !document.hidden;
  }

  function restart() {
    clearInterval(timer);
    timer = null;
    if (isRunning()) {
      timer = setInterval(() => goTo(index + 1), SLIDE_INTERVAL_MS);
    }
  }

  function updatePauseButton() {
    if (!pauseBtn) return;
    pauseBtn.classList.toggle('is-paused', userPaused);
    pauseBtn.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
  }

  // Pause on hover (laptop + controls) and while keyboard focus is inside.
  root.addEventListener('mouseenter', () => { hoverPaused = true; restart(); });
  root.addEventListener('mouseleave', () => { hoverPaused = false; restart(); });
  root.addEventListener('focusin', () => { focusPaused = true; restart(); });
  root.addEventListener('focusout', (e) => {
    if (!root.contains(e.relatedTarget)) { focusPaused = false; restart(); }
  });
  document.addEventListener('visibilitychange', restart);

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      userPaused = !userPaused;
      updatePauseButton();
      restart();
    });
  }

  // Follow changes to the reduced-motion setting while the page is open.
  reduceMotion.addEventListener?.('change', (e) => {
    userPaused = e.matches;
    updatePauseButton();
    restart();
  });

  goTo(0);
  updatePauseButton();
  restart();
}

function isNearViewport(el) {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight * 2 && r.bottom > -window.innerHeight;
}

/* ---------- "Request this" buttons: preselect the tier ---------- */
function initTierButtons() {
  const form = document.getElementById('quote-form');
  if (!form) return;

  document.querySelectorAll('[data-tier]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const radio = form.querySelector(`input[data-tier-value="${btn.dataset.tier}"]`);
      if (!radio) return;
      e.preventDefault();

      showForm();
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));

      const section = document.getElementById('quote');
      section.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', '#quote');
      radio.focus({ preventScroll: true });

      const option = radio.closest('.tier-option');
      option.classList.remove('is-highlighted');
      void option.offsetWidth; // restart the highlight animation
      option.classList.add('is-highlighted');
    });
  });
}

/* ---------- Consultation: link to the Google Calendar booking page ---------- */
function initBooking() {
  if (BOOKING_URL.includes('YOUR_BOOKING_URL')) return; // keep the "opens soon" note

  let url;
  try { url = new URL(BOOKING_URL); } catch { return; }
  url.searchParams.delete('gv'); // "gv" is only for embedding; without it Google shows the full booking page

  document.querySelectorAll('[data-booking-link]').forEach((a) => {
    a.href = url.href;
    a.hidden = false;
  });
  document.querySelectorAll('[data-booking-fallback]').forEach((el) => { el.hidden = true; });
}

/* ---------- AI policy pop-up ---------- */
function initAiPolicy() {
  const dialog = document.getElementById('ai-policy');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  let opener = null;
  document.querySelectorAll('[data-open-ai-policy]').forEach((btn) => {
    btn.addEventListener('click', () => { opener = btn; dialog.showModal(); });
  });
  dialog.querySelector('[data-close-ai-policy]').addEventListener('click', () => dialog.close());
  // Clicking the dark area outside the panel closes it.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { if (opener) opener.focus(); });
}

/* ---------- "Have a question?" form → Gmail ---------- */
function initQuestionForm() {
  const form = document.getElementById('question-form');
  if (!form) return;

  const alertBox = form.querySelector('[data-q-alert]');
  const submitBtn = form.querySelector('[data-q-submit]');
  const done = document.querySelector('[data-q-done]');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const rules = {
    name: (v) => (v ? '' : 'Please enter your name.'),
    email: (v) => (!v ? 'Please enter your email address so I can reply.'
      : EMAIL_RE.test(v) ? '' : 'That email doesn’t look quite right. Try something like name@example.com.'),
    message: (v) => (v ? '' : 'Please type your question.'),
  };

  const check = (field) => {
    const input = form.elements[field];
    const message = rules[field](input.value.trim());
    form.querySelector(`[data-q-error-for="${field}"]`).textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !message;
  };

  Object.keys(rules).forEach((field) => {
    const input = form.elements[field];
    input.addEventListener('blur', () => { if (input.value.trim() || input.hasAttribute('aria-invalid')) check(field); });
    input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) check(field); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.hidden = true;

    const invalid = Object.keys(rules).filter((f) => !check(f));
    if (invalid.length) {
      form.elements[invalid[0]].focus();
      return;
    }

    const name = form.elements.name.value.trim();
    if (form.elements._gotcha.value) { showDone(name); return; } // spam trap

    submitBtn.disabled = true;
    const label = submitBtn.textContent;
    submitBtn.textContent = 'Sending…';

    try {
      await sendToScript({
        type: 'question',
        name,
        email: form.elements.email.value.trim(),
        tier: 'General question',
        details: form.elements.message.value.trim(),
        page: location.href,
      });
      showDone(name);
    } catch (err) {
      console.error(err);
      alertBox.textContent = 'Sorry, your question didn’t send. Please try again in a moment.';
      alertBox.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = label;
    }
  });

  function showDone(name) {
    done.querySelector('[data-q-name]').textContent = name.split(/\s+/)[0] || 'friend';
    form.hidden = true;
    done.hidden = false;
    done.querySelector('.question__done-title').focus();
  }

  done.querySelector('[data-q-again]').addEventListener('click', () => {
    form.reset();
    done.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
}

/** Sends a JSON payload to the Google Apps Script web app (FORM_ENDPOINT). */
async function sendToScript(payload) {
  if (FORM_ENDPOINT.includes('YOUR_APPS_SCRIPT_URL')) {
    console.warn('[Haven] FORM_ENDPOINT is still a placeholder in js/main.js, so nothing was sent.', payload);
    await new Promise((r) => setTimeout(r, 600));
    return;
  }
  // text/plain keeps this a "simple" request, which Google Apps Script accepts from any site.
  const res = await fetch(FORM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.ok) throw new Error(result.error || `Server responded ${res.status}`);
}

/* If the confirmation is showing, bring the form back (used by "Request this"). */
function showForm() {
  const form = document.getElementById('quote-form');
  const confirmation = document.querySelector('[data-confirmation]');
  if (form && form.hidden) {
    form.hidden = false;
    confirmation.hidden = true;
  }
}

/* ---------- Quote form ---------- */
function initQuoteForm() {
  const form = document.getElementById('quote-form');
  if (!form) return;

  const alertBox = form.querySelector('[data-form-alert]');
  const submitBtn = form.querySelector('[data-submit]');
  const confirmation = document.querySelector('[data-confirmation]');
  const fileInput = form.querySelector('#images');
  const dropzone = form.querySelector('[data-dropzone]');
  const thumbs = form.querySelector('[data-thumbs]');
  const tierGroup = form.querySelector('#tier-group');

  /** Images the visitor has chosen, kept here so single images can be removed. */
  let files = [];

  /* ----- Validation ----- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const rules = {
    name: () => {
      const v = form.elements.name.value.trim();
      return v ? '' : 'Please enter your name.';
    },
    email: () => {
      const v = form.elements.email.value.trim();
      if (!v) return 'Please enter your email address so I can reply.';
      if (!EMAIL_RE.test(v)) return 'That email doesn’t look quite right. Try something like name@example.com.';
      return '';
    },
    tier: () => (form.querySelector('input[name="tier"]:checked') ? '' : 'Please choose a tier. Pick “Custom” if you’re not sure.'),
    details: () => {
      const v = form.elements.details.value.trim();
      return v ? '' : 'Please tell me a little about what you’re looking for.';
    },
  };

  function setError(field, message) {
    const errorEl = form.querySelector(`[data-error-for="${field}"]`);
    if (errorEl) errorEl.textContent = message;

    if (field === 'tier') {
      tierGroup.classList.toggle('is-invalid', Boolean(message));
      form.querySelectorAll('input[name="tier"]').forEach((r) => {
        if (message) r.setAttribute('aria-invalid', 'true');
        else r.removeAttribute('aria-invalid');
      });
      return;
    }
    const input = form.elements[field];
    if (!input) return;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function validateField(field) {
    const message = rules[field]();
    setError(field, message);
    return !message;
  }

  // Check a field when the visitor leaves it, then re-check as they type
  // once it has been flagged, so the error disappears as soon as it is fixed.
  ['name', 'email', 'details'].forEach((field) => {
    const input = form.elements[field];
    input.addEventListener('blur', () => {
      if (input.value.trim() || input.hasAttribute('aria-invalid')) validateField(field);
    });
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) validateField(field);
    });
  });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'tier') validateField('tier');
  });

  /* ----- Image uploads with previews ----- */
  const isImage = (f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name);
  const sameFile = (a, b) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

  function addFiles(list) {
    const problems = [];
    for (const f of Array.from(list)) {
      if (!isImage(f)) { problems.push(`“${f.name}” isn’t an image.`); continue; }
      if (f.size > MAX_FILE_MB * 1024 * 1024) { problems.push(`“${f.name}” is over ${MAX_FILE_MB} MB.`); continue; }
      if (files.some((existing) => sameFile(existing, f))) continue;
      if (files.length >= MAX_FILES) { problems.push(`You can add up to ${MAX_FILES} images.`); break; }
      files.push(f);
    }
    setError('images', problems.join(' '));
    renderThumbs();
  }

  function renderThumbs() {
    // Free the memory used by the old previews.
    thumbs.querySelectorAll('img').forEach((img) => URL.revokeObjectURL(img.src));
    thumbs.innerHTML = '';

    files.forEach((file, i) => {
      const li = document.createElement('li');
      li.className = 'thumb';

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = `Preview of ${file.name}`;
      img.addEventListener('error', () => { img.remove(); }); // e.g. HEIC in browsers that can't preview it

      const name = document.createElement('span');
      name.className = 'thumb__name';
      name.textContent = file.name;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'thumb__remove';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.innerHTML = '<span aria-hidden="true">&times;</span>';
      remove.addEventListener('click', () => {
        files.splice(i, 1);
        setError('images', '');
        renderThumbs();
        // Keep keyboard focus somewhere sensible after the button disappears.
        const nextRemove = thumbs.querySelectorAll('.thumb__remove')[Math.min(i, files.length - 1)];
        (nextRemove || fileInput).focus();
      });

      li.append(img, name, remove);
      thumbs.appendChild(li);
    });
  }

  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = ''; // so the same image can be picked again after removing it
  });

  ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragging');
  }));
  ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    if (type === 'dragleave' && dropzone.contains(e.relatedTarget)) return;
    dropzone.classList.remove('is-dragging');
  }));
  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  /* ----- Submit ----- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.hidden = true;

    const invalid = Object.keys(rules).filter((field) => !validateField(field));
    if (invalid.length) {
      alertBox.textContent = invalid.length === 1
        ? 'Please fix the highlighted field below.'
        : `Please fix the ${invalid.length} highlighted fields below.`;
      alertBox.hidden = false;
      const first = invalid[0] === 'tier'
        ? form.querySelector('input[name="tier"]')
        : form.elements[invalid[0]];
      first.focus();
      return;
    }

    // Spam trap: real people never fill in the hidden "_gotcha" field.
    if (form.elements._gotcha?.value) {
      showConfirmation(form.elements.name.value, false);
      return;
    }

    const fields = Object.fromEntries(new FormData(form));
    delete fields.images;
    delete fields._gotcha;
    Object.keys(fields).forEach((k) => { fields[k] = String(fields[k]).trim(); });

    // Turn "yoursite.com" into a clickable "https://yoursite.com".
    if (fields.website && !/^https?:\/\//i.test(fields.website)) fields.website = `https://${fields.website}`;

    submitBtn.disabled = true;
    const label = submitBtn.textContent;
    submitBtn.textContent = files.length ? 'Preparing images…' : 'Sending…';

    const previewMode = FORM_ENDPOINT.includes('YOUR_APPS_SCRIPT_URL');

    try {
      const images = await Promise.all(files.map(prepareImage));
      const totalMB = images.reduce((sum, img) => sum + img.data.length * 0.75, 0) / 1024 / 1024;
      if (totalMB > MAX_TOTAL_MB) {
        throw new UserFacingError(`Those images add up to about ${Math.round(totalMB)} MB, which is more than the ${MAX_TOTAL_MB} MB limit. Please remove a few and try again.`);
      }
      submitBtn.textContent = 'Sending…';
      const payload = { ...fields, images, page: location.href };

      await sendToScript({ type: 'quote', ...payload });
      showConfirmation(fields.name, previewMode);
    } catch (err) {
      console.error(err);
      const mail = document.querySelector('a[href^="mailto:"]');
      alertBox.textContent = err instanceof UserFacingError
        ? err.message
        : 'Sorry, something went wrong sending your request. Please try again in a moment'
          + (mail ? `, or email me at ${mail.textContent.trim()}.` : '.');
      alertBox.hidden = false;
      alertBox.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = label;
    }
  });

  function showConfirmation(name, previewMode) {
    const first = String(name || '').trim().split(/\s+/)[0];
    confirmation.querySelector('[data-confirm-name]').textContent = first || 'friend';
    confirmation.querySelector('[data-preview-note]').hidden = !previewMode;

    form.hidden = true;
    confirmation.hidden = false;
    document.getElementById('quote').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    confirmation.querySelector('.confirmation__title').focus({ preventScroll: true });
  }

  confirmation.querySelector('[data-send-another]').addEventListener('click', () => {
    form.reset();
    files = [];
    renderThumbs();
    Object.keys(rules).forEach((field) => setError(field, ''));
    setError('images', '');
    alertBox.hidden = true;
    confirmation.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
}

/* ---------- Image helpers for the quote form ---------- */
class UserFacingError extends Error {}

/**
 * Shrinks a photo to IMAGE_MAX_PX on its longest side and re-saves it as JPEG,
 * so phone photos (often 5 to 12 MB) upload as roughly 0.3 to 1 MB.
 * Formats the browser can't draw (such as HEIC in most browsers) are sent as-is.
 * Returns { name, type, data } where data is base64 without the "data:" prefix.
 */
async function prepareImage(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, IMAGE_MAX_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // transparent PNGs get a white background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error('toBlob failed');
    return {
      name: file.name.replace(/\.[^.]+$/, '') + '.jpg',
      type: 'image/jpeg',
      data: await toBase64(blob),
    };
  } catch {
    return { name: file.name, type: file.type || 'application/octet-stream', data: await toBase64(file) };
  }
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
