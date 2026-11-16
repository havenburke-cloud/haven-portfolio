/* ==========================================================================
   Web Designs by Haven: main.js
   Plain JavaScript, no libraries.
   ========================================================================== */

/* --------------------------------------------------------------------------
   >>> 1. "HAVE A QUESTION?" FORM → GMAIL <<<
   Your Google Apps Script "Web app" URL (README.md, step 1). It ends in /exec.
   While it says YOUR_APPS_SCRIPT_URL_HERE, the form sends nothing (preview mode).
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

/* Intro screens ("Hello!" → "I've got you."): how the snap feels */
const INTRO_AXIS = 'x';          // 'x' = screens swipe sideways (next comes in from the right), 'y' = up/down
const INTRO_DURATION_MS = 900;   // length of one swipe
const INTRO_RECOIL = 4;          // how far (in % of the screen) it overshoots before settling back

/* ------------------------------------------------------------------------ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

document.addEventListener('DOMContentLoaded', () => {
  initSlotFit();
  initIntro();
  initIntroOneWay();
  initEyes();
  initHeader();
  initNav();
  initReveal();
  initBooking();
  initQuestionForm();
  initAiPolicy();

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
  // A reload always starts over at "Hello!", even if the address still ends in
  // something like #about from clicking the menu earlier.
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (nav && nav.type === 'reload' && location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }
  const deepLink = location.hash && location.hash !== '#intro';
  if (!deepLink) {
    window.scrollTo(0, 0);
    // Some browsers jump to the old #section a moment later; undo that once loaded.
    window.addEventListener('load', () => window.scrollTo(0, 0), { once: true });
  } else {
    // The browser jumped to the section before the intro shrank to one screen,
    // so go there again now that the page is laid out.
    const goToSection = () => {
      let target = null;
      try { target = document.querySelector(location.hash); } catch { /* not a valid selector */ }
      if (target) target.scrollIntoView({ behavior: 'instant' });
    };
    requestAnimationFrame(goToSection);
    window.addEventListener('load', goToSection, { once: true });
  }
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
  const wants = (dir) => !intro.hidden && atTop() && (dir > 0 ? index < last : index > 0);

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

/* ---------- The intro only plays once per visit ----------
   As soon as the visitor has scrolled completely past the intro, it is removed,
   so scrolling up stops at About. Reloading the page brings it back. */
function initIntroOneWay() {
  const intro = document.querySelector('[data-intro]');
  if (!intro) return;

  function collapse() {
    if (intro.hidden) return;
    const h = intro.offsetHeight;
    const y = window.scrollY;
    intro.hidden = true;
    window.scrollTo({ top: Math.max(0, y - h), behavior: 'instant' }); // keep the same content in view
  }

  const check = () => {
    if (!intro.hidden && window.scrollY >= intro.offsetHeight) collapse();
  };
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('load', check, { once: true }); // e.g. arriving on a #section link

  // "Skip intro" goes straight to About without playing the rest.
  document.querySelectorAll('.skip-link[href="#about"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      collapse();
      document.getElementById('about').scrollIntoView({ behavior: 'instant' });
      document.getElementById('about').focus?.({ preventScroll: true });
    });
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
