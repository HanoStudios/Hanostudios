/* ============================================================
   HANO STUDIOS — interactions
   ============================================================ */

(function () {
  'use strict';

  // Claim the `js` class only once this file is actually executing, so a
  // failed/blocked script can never leave `.reveal` content stuck invisible.
  document.documentElement.classList.add('js');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    // Phone browsers fire resize as the URL bar collapses and expands during
    // scroll; without this every one of those re-measures the pinned sections
    // mid-scrub and the hero visibly jumps. Real rotations still refresh.
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ---------------- Menu ---------------- */

  const menuBtn = document.getElementById('menuBtn');
  const menuOverlay = document.getElementById('menuOverlay');
  const hero = document.querySelector('.hero');

  const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

  function isMenuOpen() {
    return menuOverlay.classList.contains('is-open');
  }

  // Take the page behind an open overlay out of the tab order and the
  // accessibility tree, keeping only the elements in `keep` live. Shared by the
  // menu and the booking modal. Only aria-hidden we added ourselves is removed
  // again — .split and .wipe are decorative and carry their own in the markup.
  function setPageInert(on, keep) {
    Array.from(document.body.children).forEach(el => {
      if (keep.indexOf(el) !== -1) return;
      if (on) {
        el.setAttribute('inert', '');
        if (!el.hasAttribute('aria-hidden')) {
          el.setAttribute('aria-hidden', 'true');
          el.dataset.inertHid = '';
        }
      } else {
        el.removeAttribute('inert');
        if ('inertHid' in el.dataset) {
          el.removeAttribute('aria-hidden');
          delete el.dataset.inertHid;
        }
      }
    });
  }

  // The button sits outside the overlay but is its only visible dismiss control
  // while open, so it belongs in the cycle. DOM order already puts it first.
  function focusCycle() {
    return [menuBtn].concat(Array.from(menuOverlay.querySelectorAll(FOCUSABLE)));
  }

  function toggleMenu(open, restoreFocus) {
    const next = open !== undefined ? open : !isMenuOpen();
    menuOverlay.classList.toggle('is-open', next);
    menuBtn.classList.toggle('is-open', next);
    menuBtn.setAttribute('aria-expanded', String(next));
    menuOverlay.setAttribute('aria-hidden', String(!next));
    menuBtn.setAttribute('aria-label', next ? 'Close menu' : 'Open menu');
    document.body.style.overflow = next ? 'hidden' : '';
    setPageInert(next, [menuOverlay, menuBtn]);

    if (next) {
      menuOverlay.removeAttribute('inert');
      const first = menuOverlay.querySelector('.menu-links a');
      if (first) first.focus();
    } else {
      // Move focus out before inerting, otherwise the browser drops it to <body>.
      if (restoreFocus !== false) menuBtn.focus();
      menuOverlay.setAttribute('inert', '');
    }
  }

  menuBtn.addEventListener('click', () => toggleMenu());
  menuOverlay.addEventListener('click', e => {
    // Following a link hands focus to the target section — don't pull it back.
    if (e.target.tagName === 'A') toggleMenu(false, false);
  });

  document.addEventListener('keydown', e => {
    if (!isMenuOpen()) return;

    if (e.key === 'Escape') {
      toggleMenu(false);
      return;
    }
    if (e.key !== 'Tab') return;

    const items = focusCycle();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (active !== menuBtn && !menuOverlay.contains(active)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Menu button appears once you have scrolled past the first screen. This used
  // to watch .hero with an IntersectionObserver, but the hero is pinned now, so
  // it stays fully on screen through the whole split and the button never showed.
  // Scroll position works whether or not GSAP is driving the pin.
  const revealMenuBtn = () => {
    const on = window.scrollY > window.innerHeight * 0.6;
    menuBtn.classList.toggle('is-visible', on);
    // The hero is pinned, so its top bar is still on screen when this button
    // arrives — and CONTACT US sits exactly under it. Flagging the root lets
    // CSS hand the corner over. It has to be the root rather than a sibling
    // selector because ScrollTrigger wraps .hero in a .pin-spacer, which
    // breaks any relationship between .menu-btn and .hero-top.
    document.documentElement.classList.toggle('nav-armed', on);
  };
  window.addEventListener('scroll', revealMenuBtn, { passive: true });
  revealMenuBtn();

  // Invert the button while a light section is under it. The root is squeezed to
  // a band across the top of the viewport, so this tracks what is actually
  // behind the button rather than whether the section is on screen at all.
  const lightSections = document.querySelectorAll('.services');
  if (lightSections.length) {
    const overLight = new Set();
    const contrastObserver = new IntersectionObserver(
      entries => {
        entries.forEach(en => {
          if (en.isIntersecting) overLight.add(en.target);
          else overLight.delete(en.target);
        });
        menuBtn.classList.toggle('on-light', overLight.size > 0);
      },
      { rootMargin: '0px 0px -90% 0px' }
    );
    lightSections.forEach(s => contrastObserver.observe(s));
  }

  /* ---------------- Scroll reveals ---------------- */

  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.animate(
          [
            { opacity: 0, transform: 'translateY(26px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ],
          { duration: reduce ? 1 : 900, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }
        );
        revealObserver.unobserve(en.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ---------------- Counting stats ---------------- */

  const statObserver = new IntersectionObserver(
    entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const target = parseInt(el.dataset.count, 10);
        if (reduce) {
          el.textContent = target + '+';
          statObserver.unobserve(el);
          return;
        }
        const start = performance.now();
        const dur = 1400;
        (function step(now) {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + '+';
          if (p < 1) requestAnimationFrame(step);
        })(start);
        statObserver.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll('.stats dt').forEach(el => statObserver.observe(el));

  /* The services list used to show a floating image preview on hover. Removed
     on request. The list items keep their data-tone / data-img attributes, so
     restoring it is markup + this handler again, not a re-shoot. */

  /* ---------------- Showcase carousel + video ---------------- */

  const stage = document.getElementById('showStage');
  const prev = document.getElementById('showPrev');
  const next = document.getElementById('showNext');
  // Hoisted out of the `if (stage)` block below so the pinned scroll-scrub —
  // set up later, alongside the other pins, in actual page order (see the
  // long comment down there for why the ordering itself matters) — can reach
  // them too. showST is that pin's ScrollTrigger once it exists.
  // navLock: true while an arrow/click/ended-driven page scroll is in flight,
  // so the pin's per-tick resync doesn't fight it. See goTo().
  let phones = [], current = 0, showST = null, navLock = false;

  if (stage) {
    phones = Array.from(stage.querySelectorAll('.phone'));

    // How far this phone's centre currently sits from the stage's centre, in
    // px. Measured from bounding rects, NOT offsetLeft: .showcase-stage is
    // position:static, so a .phone's offsetParent is the .showcase section
    // rather than the scroll container, and offsetLeft is therefore measured
    // from the wrong origin (it includes the stage's own offset inside the
    // section). centreOn() and nearestPhone() both used that same wrong origin
    // before, so they agreed with each other while both being wrong — the
    // active phone settled ~490px off centre. Rects are origin-independent and
    // are exactly what "centred in the stage" means on screen.
    var centreDelta = function (phone) {
      const p = phone.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      return (p.left + p.width / 2) - (s.left + s.width / 2);
    };

    // Which phone the strip is HEADING for. Re-derived from position at every
    // resync point rather than trusting whatever `current` last was, because a
    // deep link to #process arrives via the browser's own native
    // smooth-scroll, outside GSAP's ticker, and can leave `current` stale.
    //
    // Crucially this reads the trigger's progress, not stage.scrollLeft. The
    // pin scrubs scrollLeft with 0.6s of easing, so scrollLeft trails the real
    // scroll position — and 'scrollend' fires when the WINDOW stops, while the
    // scrub is still catching up. Resyncing off the lagging value therefore
    // resolved to the phone we were leaving and undid the move: auto-advance
    // on 'ended' silently rewound to the clip that had just finished.
    // Progress is the raw scroll-derived value, so it is already at the target.
    var nearestPhone = function () {
      const span = stage.scrollWidth - stage.clientWidth;
      // Where scrollLeft will settle, vs where it is this instant.
      const target = showST ? showST.progress * span : stage.scrollLeft;
      const lag = target - stage.scrollLeft;
      let best = 0, bestDist = Infinity;
      phones.forEach((phone, i) => {
        const d = Math.abs(centreDelta(phone) + lag);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    };

    function centreOn(index, smooth) {
      const phone = phones[index];
      if (!phone) return;
      const span = Math.max(1, stage.scrollWidth - stage.clientWidth);
      // Where scrollLeft needs to land for this phone to sit dead centre.
      // Derived from where it is NOW plus how far off centre it is, so it
      // never depends on offsetParent (see centreDelta). Clamped, because the
      // outermost phones can sit beyond the scrollable range.
      const left = Math.max(0, Math.min(span, stage.scrollLeft + centreDelta(phone)));

      // While the pin is live it OWNS stage.scrollLeft — it rewrites it from
      // the page's scroll position on every tick, so setting scrollLeft here
      // directly would be undone on the next frame (the arrows appeared to do
      // nothing). Move the page instead, to the vertical offset that maps to
      // this phone: one source of truth, and the arrows now travel through the
      // same motion as a scroll rather than fighting it.
      if (showST) {
        const y = showST.start + (left / span) * (showST.end - showST.start);
        window.scrollTo({ top: y, behavior: smooth && !reduce ? 'smooth' : 'auto' });
        return;
      }
      stage.scrollTo({ left: left, behavior: smooth && !reduce ? 'smooth' : 'auto' });
    }

    // A video only gets a src the first time it becomes active, so nothing is
    // fetched for slides the visitor never reaches. A phone with no data-src has
    // no clip yet — it keeps showing its poster and the carousel still works, so
    // the section degrades to exactly what it was before rather than 404ing.
    // `var`, not `function` — this file is strict mode, where a `function`
    // declared inside a block is block-scoped and invisible to the pin set up
    // later, outside this block.
    var play = function (index) {
      phones.forEach((phone, i) => {
        const video = phone.querySelector('.phone-video');
        phone.classList.toggle('is-active', i === index);
        if (!video || !video.dataset.src) return;

        if (i === index) {
          if (!video.src && video.dataset.src) video.src = video.dataset.src;
          // Sound follows the toggle, and only ever on the slide being played.
          video.muted = !soundOn;
          const attempt = video.play();
          if (attempt && attempt.catch) attempt.catch(() => {
            // Autoplay is refused in some contexts. If sound was the reason,
            // fall back to muted so the clip still plays rather than freezing
            // on its poster, and put the toggle back so the UI is not lying
            // about the state.
            if (!video.muted) {
              soundOn = false;
              video.muted = true;
              syncSoundBtn();
              const retry = video.play();
              if (retry && retry.catch) retry.catch(() => {});
            }
          });
        } else {
          video.pause();
          // Belt and braces: a paused clip is silent anyway, but leaving it
          // unmuted means any stray play() would blare.
          video.muted = true;
          if (video.currentTime) video.currentTime = 0;
        }
      });
    }

    /* ---- sound toggle ---- */
    // Muted is the only state a browser will autoplay in, so that is where this
    // starts; the button is the visitor's opt-in. Clicking it IS the user
    // gesture that makes unmuted playback permissible from then on.
    var soundOn = false;
    const soundBtn = document.getElementById('showSound');

    var syncSoundBtn = function () {
      if (!soundBtn) return;
      soundBtn.classList.toggle('is-on', soundOn);
      soundBtn.setAttribute('aria-pressed', String(soundOn));
      soundBtn.setAttribute('aria-label', soundOn ? 'Mute video' : 'Unmute video');
    };

    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        soundOn = !soundOn;
        syncSoundBtn();
        const active = phones[current] && phones[current].querySelector('.phone-video');
        if (active) {
          active.muted = !soundOn;
          // Unmuting a paused clip should also start it — otherwise the button
          // appears to do nothing when the carousel is sitting still.
          if (soundOn && active.paused && active.dataset.src) {
            const a = active.play();
            if (a && a.catch) a.catch(() => {});
          }
        }
      });
    }

    function goTo(index, smooth) {
      current = (index + phones.length) % phones.length;
      // A programmatic move is now a PAGE scroll (see centreOn), and the pin's
      // onUpdate re-derives `current` from stage.scrollLeft on every tick of
      // it. With scrub easing, scrollLeft lags well behind — so mid-flight
      // those ticks would keep resetting `current` back to where the strip
      // still is, and a second goTo(current + 1) would compute its target off
      // that stale value and stall. While we're driving, intent wins; once
      // motion settles, position wins again (scrollend clears this).
      navLock = true;
      centreOn(current, smooth);
      if (!reduce) play(current);
    }

    // Auto-advance when a clip finishes.
    phones.forEach((phone, i) => {
      const video = phone.querySelector('.phone-video');
      if (video) video.addEventListener('ended', () => { if (i === current) goTo(current + 1, true); });
      // Clicking a phone makes it the active slide.
      phone.addEventListener('click', () => goTo(i, true));
    });

    if (prev) prev.addEventListener('click', () => goTo(current - 1, true));
    if (next) next.addEventListener('click', () => goTo(current + 1, true));

    // Only start once the carousel is actually on screen, and stop when it is not,
    // so a video is never playing off-screen.
    const showObserver = new IntersectionObserver(
      entries => entries.forEach(en => {
        if (en.isIntersecting) {
          // The reduce guard sits here, not at the top: leaving the viewport
          // has to stop sound in every mode, and the sound toggle can start a
          // clip even under reduced motion.
          if (reduce) return;
          // Resync to wherever the strip actually is, not whatever `current`
          // last held — see nearestPhone()'s comment.
          current = nearestPhone();
          play(current);
        } else {
          // Scrolling past resets the toggle rather than only pausing. Pausing
          // alone left soundOn true, so the button still read "on" for a
          // carousel nobody could hear, and the clip resumed *with sound*
          // behind the visitor the moment the section clipped back into view.
          soundOn = false;
          syncSoundBtn();
          phones.forEach(p => {
            const v = p.querySelector('.phone-video');
            if (!v) return;
            v.pause();
            // A paused clip is silent, but muting means a stray play() cannot
            // blare from off screen.
            v.muted = true;
          });
        }
      }),
      { threshold: 0.35 }
    );
    showObserver.observe(stage);
  }
  // The pin itself is set up later, with the other pins — see that comment
  // for why creating it here, this early, silently broke it.

  /* ---------------- Work-card mockup clips ---------------- */

  // The case-study cards on the landing page and on work/index.html show their
  // mockup animation instead of a still. Same deal as the showcase phones: the
  // file is only fetched once the card is actually near the viewport, so five
  // cards do not cost five downloads on first paint, and the still underneath
  // stays visible the whole time — it is the poster, so a card that never
  // reaches the viewport, or whose clip fails, looks exactly as it did before.
  //
  // Deliberately outside the GSAP block: these have to work on .no-gsap too.
  // The hero background plate. Same contract as the work cards: the poster and
  // the CSS glow hold the section until the clip is genuinely playing, and
  // reduced motion never requests the file at all.
  (function heroVideo () {
    const video = document.querySelector('.hero-video[data-src]');
    if (!video || reduce) return;

    const hero = video.closest('.hero');
    video.addEventListener('playing', () => {
      video.classList.add('is-playing');
      if (hero) hero.classList.add('has-video');
    }, { once: true });

    video.src = video.dataset.src;
    if (video.readyState === 0) video.load();
    const p = video.play();
    // Autoplay can still be refused (low-power mode, strict settings). The
    // poster and glow are already correct, so there is nothing to undo.
    if (p && p.catch) p.catch(() => {});

    // Decoding a full-screen clip while the visitor is somewhere else on the
    // page is work for nothing, and it is paid on every scrolled frame. The
    // hero is pinned, so it stays on screen for its whole sequence and only
    // leaves once the page has genuinely moved past it.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const r = video.play();
            if (r && r.catch) r.catch(() => {});
          } else if (!video.paused) {
            video.pause();
          }
        });
      }, { threshold: 0.01 }).observe(hero || video);
    }
  })();

  (function workCardVideos () {
    const videos = document.querySelectorAll('.work-video[data-src]');
    // Reduced motion gets the still and nothing else — no request is made at
    // all, rather than downloading a clip that CSS then hides.
    if (!videos.length || reduce) return;

    const start = video => {
      if (!video.src) video.src = video.dataset.src;
      // preload="none" leaves readyState at 0 with no source selected, and
      // play() on that rejects without ever fetching. load() first.
      if (video.readyState === 0) video.load();
      const attempt = video.play();
      if (attempt && attempt.catch) attempt.catch(() => {});
    };

    // Only reveal the clip once it is genuinely rendering frames, so a stalled
    // or codec-refused video never paints a black box over the still.
    videos.forEach(video => {
      video.addEventListener('playing', () => video.classList.add('is-playing'));
    });

    if (!('IntersectionObserver' in window)) {
      videos.forEach(start);
      return;
    }

    // Cards leave the viewport constantly in a horizontal strip; pausing the
    // ones that are gone keeps this to one or two decoding at a time.
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) start(video);
        else if (!video.paused) video.pause();
      });
      // 200px of lead-in is cheap on the desktop strip, where the cards are
      // side by side and one or two qualify at a time. Below 701px the same
      // strip is a vertical stack of full-width cards, so that margin pulled
      // three 1706x960 clips into decode at once while the visitor was
      // scrolling. Start them as they actually arrive there.
    }, { rootMargin: window.matchMedia('(min-width: 701px)').matches ? '200px' : '0px' });

    videos.forEach(video => io.observe(video));
  })();

  /* ---------------- Case-study galleries ---------------- */

  // Used by work/*.html. Each [data-gallery] is self-contained, so a page can
  // hold any number of them. Nothing here runs on the landing page (no matches),
  // and with no JS at all the track is still a horizontally scrollable strip
  // with snap points — the arrows and dots are progressive enhancement.
  // Only one clip on the page is ever audible. Each gallery that has a toggle
  // registers a mute callback here, and whichever one is switched on silences
  // the rest first — two galleries left unmuted would otherwise talk over each
  // other the moment they share the viewport.
  const muteOthers = [];

  document.querySelectorAll('[data-gallery]').forEach(gallery => {
    const track = gallery.querySelector('[data-gallery-track]');
    if (!track) return;
    const slides = Array.from(track.children);
    const dotsBox = gallery.querySelector('[data-gallery-dots]');
    if (!slides.length) return;

    // A clip is only marked data-audio when its master genuinely carries sound.
    // The Bybit Card films were delivered silent — every audio track in the
    // supplied set peaks below -60dB — so that gallery gets no toggle rather
    // than a button that appears to do nothing.
    const hasAudio = track.querySelector('video[data-audio]');
    let soundOn = false;
    let soundBtn = null;

    // Sound rides on the centred slide only. Several slides play at once (that
    // is the whole look), so unmuting all of them would just be noise.
    function applyMute() {
      slides.forEach((slide, i) => {
        const v = slide.querySelector('video');
        if (!v) return;
        v.muted = !(soundOn && i === current && v.hasAttribute('data-audio'));
      });
    }

    function setSound(on) {
      soundOn = Boolean(on && hasAudio);
      if (soundBtn) {
        soundBtn.classList.toggle('is-on', soundOn);
        soundBtn.setAttribute('aria-pressed', String(soundOn));
        soundBtn.setAttribute('aria-label', soundOn ? 'Mute video' : 'Unmute video');
      }
      applyMute();
    }

    // Centre a slide in the track. Same maths as the showcase carousel: derive
    // the target from the element's own offset rather than stepping by a guessed
    // width, because these slides have different widths.
    const centreOf = i => slides[i].offsetLeft - (track.clientWidth - slides[i].offsetWidth) / 2;
    const nearest = () => {
      let best = 0, bestD = Infinity;
      slides.forEach((s, i) => {
        const d = Math.abs(track.scrollLeft - centreOf(i));
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    };

    let current = 0;

    // EVERY slide actually on screen plays — not just `current`. Several slides
    // are visible at once (that is the whole look), and keying playback to the
    // single "current" index left a fully visible neighbour frozen on its
    // poster. Videos still carry preload="none", so a slide the visitor never
    // scrolls to never costs a byte.
    function sync(index) {
      current = Math.max(0, Math.min(index, slides.length - 1));
      const view = track.getBoundingClientRect();
      slides.forEach((slide, i) => {
        const v = slide.querySelector('video');
        if (!v) return;
        const r = slide.getBoundingClientRect();
        // Mostly-visible inside the track's own viewport.
        const shown = Math.min(r.right, view.right) - Math.max(r.left, view.left);
        // Reduced motion suppresses autoplay, but not a clip the visitor has
        // explicitly asked to hear — without this exception the next sync()
        // would pause it again a moment after the toggle started it.
        const wanted = !reduce || (soundOn && i === current);
        if (shown > r.width * 0.5 && wanted) {
          // preload="none" leaves the element at HAVE_NOTHING with no source
          // selected, and play() on that rejects without ever fetching. Kick a
          // load() the first time a slide comes into view; from then on the
          // buffered data is reused and this is a no-op.
          if (v.readyState === 0) v.load();
          v.muted = !(soundOn && i === current && v.hasAttribute('data-audio'));
          const attempt = v.play();
          if (attempt && attempt.catch) attempt.catch(() => {
            // Autoplay refused. If sound was the reason, drop back to muted so
            // the clip still runs rather than freezing on its poster, and put
            // the toggle back so the button is not lying about the state.
            if (!v.muted) {
              setSound(false);
              const retry = v.play();
              if (retry && retry.catch) retry.catch(() => {});
            }
          });
        } else {
          v.pause();
          // A paused clip is silent anyway, but leaving it unmuted means any
          // stray play() would blare.
          v.muted = true;
        }
      });
      if (dotsBox) {
        Array.from(dotsBox.children).forEach((d, i) => d.classList.toggle('is-on', i === current));
      }
    }

    function goTo(index, smooth) {
      const i = Math.max(0, Math.min(index, slides.length - 1));
      track.scrollTo({ left: centreOf(i), behavior: smooth && !reduce ? 'smooth' : 'auto' });
      sync(i);
    }

    if (dotsBox) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dot.addEventListener('click', () => goTo(i, true));
        dotsBox.appendChild(dot);
      });
      dotsBox.removeAttribute('aria-hidden');
    }

    const prevBtn = gallery.querySelector('[data-gallery-prev]');
    const nextBtn = gallery.querySelector('[data-gallery-next]');
    if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1, true));
    if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1, true));

    // Built here rather than in the markup, the same way the dots are, so a
    // gallery of stills never carries a dead control. Muted is the only state a
    // browser will autoplay in, so that is where this starts; the click is both
    // the visitor's opt-in and the gesture that makes unmuted playback
    // permissible from then on. Markup and icons match #showSound exactly.
    let arrowsBox = gallery.querySelector('.gallery-arrows');
    if (hasAudio && !arrowsBox) {
      // Kalshi and Hano Crypto draw a single clip with no arrows and no dots,
      // so those galleries have no foot to hang the toggle on. Build a minimal
      // one — same row, same spacing, just the one control. `.gallery > *` puts
      // it in the copy column, so it lines up with the slide above it.
      const foot = document.createElement('div');
      foot.className = 'gallery-foot';
      arrowsBox = document.createElement('div');
      arrowsBox.className = 'gallery-arrows';
      foot.appendChild(arrowsBox);
      gallery.appendChild(foot);
    }
    if (hasAudio && arrowsBox) {
      soundBtn = document.createElement('button');
      soundBtn.type = 'button';
      soundBtn.className = 'arrow sound-btn';
      soundBtn.setAttribute('aria-pressed', 'false');
      soundBtn.setAttribute('aria-label', 'Unmute video');
      soundBtn.innerHTML =
        '<svg class="ico-muted" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
          '<path d="M4 9v6h4l5 4V5L8 9H4z"/>' +
          '<path d="M16.5 9.5l5 5m0-5l-5 5" class="stroke"/>' +
        '</svg>' +
        '<svg class="ico-on" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
          '<path d="M4 9v6h4l5 4V5L8 9H4z"/>' +
          '<path d="M16.5 8.8a4.5 4.5 0 010 6.4M19 6.3a8 8 0 010 11.4" class="stroke"/>' +
        '</svg>';
      soundBtn.addEventListener('click', () => {
        const turningOn = !soundOn;
        // Silence every other gallery first. Our own callback is in this list
        // too, but soundOn is still false while turning on, so it no-ops.
        if (turningOn) muteOthers.forEach(fn => fn());
        setSound(turningOn);
        // Settle playback for the new state straight away rather than waiting
        // for the next scroll. This is also what makes the button work under
        // reduced motion, where nothing is playing until it is asked for.
        sync(current);
      });
      arrowsBox.appendChild(soundBtn);
      muteOthers.push(() => { if (soundOn) setSound(false); });
    }

    // A gallery whose slides all fit has nothing to scroll, so the track's bleed
    // to the right edge only strands them at the left of the copy column. Mark
    // it and let the CSS drop the bleed and centre them. This cannot be a media
    // query: it depends on how wide the slides turn out to be, and a pair that
    // fits on a desktop overflows on a phone.
    function measure() {
      // +1 absorbs sub-pixel rounding, which otherwise reports a 1px overflow
      // on a track that visibly fits.
      gallery.classList.toggle('is-static', track.scrollWidth <= track.clientWidth + 1);
    }
    measure();
    // Slides are width:auto at a fixed height, so their width is not known
    // until the media reports its aspect ratio. preload="none" videos never
    // do until they are loaded, so re-measure whenever one arrives; the poster
    // fires load on the img path only.
    slides.forEach(slide => {
      const media = slide.querySelector('img, video');
      if (!media) return;
      media.addEventListener('load', measure);
      media.addEventListener('loadedmetadata', measure);
    });
    window.addEventListener('resize', measure);

    // A swipe moves scrollLeft without going through goTo(), so re-derive which
    // slide won once the browser says the scroll has settled.
    track.addEventListener('scrollend', () => sync(nearest()));

    // Pause everything while the gallery is off screen.
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) sync(nearest());
      else {
        // Reset the toggle rather than just muting the elements, or the button
        // would still read "on" for a gallery nobody can hear.
        setSound(false);
        slides.forEach(s => { const v = s.querySelector('video'); if (v) v.pause(); });
      }
    }), { threshold: 0.25 });
    io.observe(gallery);

    sync(0);
  });

  /* ---------------- FAQ smooth open/close ---------------- */

  // <details> snaps open — there is no native way to transition it. Drive the
  // panel height ourselves. Sits before the GSAP block's early return so this
  // still runs under prefers-reduced-motion, just without the tween.
  document.querySelectorAll('.faq-list details').forEach(item => {
    const summary = item.querySelector('summary');
    const panel = item.querySelector('p');
    if (!summary || !panel) return;

    let anim = null;

    summary.addEventListener('click', e => {
      e.preventDefault();

      if (reduce) {
        item.open = !item.open;
        return;
      }
      if (anim) anim.cancel();

      const opening = !item.open;
      // Height has to be measured with the panel rendered, so open first and
      // animate from zero when opening.
      if (opening) item.open = true;

      const pad = getComputedStyle(panel).paddingBottom;
      const full = panel.scrollHeight + 'px';

      const from = { height: opening ? '0px' : full, paddingBottom: opening ? '0px' : pad, opacity: opening ? 0 : 1 };
      const to   = { height: opening ? full : '0px', paddingBottom: opening ? pad : '0px', opacity: opening ? 1 : 0 };

      anim = panel.animate([from, to], {
        duration: opening ? 380 : 300,
        easing: 'cubic-bezier(.22,1,.36,1)'
      });

      anim.onfinish = () => {
        if (!opening) item.open = false;
        panel.style.height = '';
        anim = null;
      };
    });
  });

  /* ---------------- Calendly booking modal ---------------- */

  const calModal = document.getElementById('calModal');

  if (calModal) {
    const calEmbed = document.getElementById('calEmbed');
    const calPanel = calModal.querySelector('.cal-panel');
    let lastFocus = null;
    let requested = false;      // widget assets fetched
    let wantsWidget = false;    // intent seen, so the iframe may be built

    function calFallback() {
      const url = (calEmbed.dataset.url || '').split('?')[0];
      calEmbed.innerHTML =
        '<div class="cal-fallback"><p>The booking widget could not load.</p>' +
        '<a href="' + url + '" target="_blank" rel="noopener">Open the booking page &rarr;</a>' +
        '<a href="mailto:hello@hano.studios">Or email hello@hano.studios</a></div>';
    }

    // Split in two so the cost can be paid before the click rather than during
    // it. Opening used to run serially at click time: DNS, CSS, widget.js, then
    // the iframe — seconds on a phone, on the one path that ads pay for.
    // preconnect in <head> covers DNS/TLS; these cover the rest.
    let inited = false;

    // Build the widget into the (still hidden) modal, so the click only has to
    // reveal it. Called on first intent — hover, focus or touch of any trigger.
    function initCalendly() {
      if (inited || !window.Calendly || !calEmbed.dataset.url) return;
      inited = true;

      // Give the modal its real layout box BEFORE building the widget. Inside
      // a display:none parent the iframe is 0x0, and Calendly sizes its
      // calendar from its own viewport — at zero it renders nothing and defers
      // the actual work to the moment it is shown, which is the delay we are
      // trying to remove. Warm keeps it laid out, invisible and inert.
      if (calModal.hidden) {
        calModal.hidden = false;
        calModal.classList.add('is-warm');
        calModal.setAttribute('inert', '');
      }

      window.Calendly.initInlineWidget({
        url: calEmbed.dataset.url,
        parentElement: calEmbed,
        pageSettings: CAL_PAGE_SETTINGS
      });
    }

    // The colour params on data-url are honoured by Calendly's own page but NOT
    // by the inline widget, which reads them here — pass both and the embed
    // matches the site instead of rendering white.
    const CAL_PAGE_SETTINGS = {
      backgroundColor: '0A0A0A',
      textColor: 'FFFFFF',
      primaryColor: '8B32F7',
      hideGdprBanner: true,
      hideEventTypeDetails: false,
      hideLandingPageDetails: false
    };

    function loadCalendly() {
      if (requested) return;
      requested = true;

      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://assets.calendly.com/assets/external/widget.css';
      document.head.appendChild(css);

      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      script.onload = () => {
        if (window.Calendly && calEmbed.dataset.url) {
          // If intent already fired while the script was in flight, build now;
          // otherwise wait, so a visitor who never approaches the CTA never
          // loads a third-party iframe.
          if (wantsWidget) initCalendly();
        } else {
          calFallback();
        }
      };
      script.onerror = calFallback;      // blocked CDN, ad blocker, offline
      document.head.appendChild(script);
    }

    // ---- Warm-up ----------------------------------------------------------
    // Intent runs ahead of the click: hovering, focusing or touching any
    // trigger builds the widget, so by the time the modal opens the iframe is
    // usually already there. Falls back gracefully — if intent never fires
    // (a straight tap on mobile), openCal still does the work itself.
    function intent() {
      wantsWidget = true;
      loadCalendly();
      initCalendly();          // no-op until the script has landed
    }

    document.querySelectorAll('[data-calendly]').forEach(el => {
      el.addEventListener('pointerenter', intent, { once: true, passive: true });
      el.addEventListener('focus', intent, { once: true });
      el.addEventListener('touchstart', intent, { once: true, passive: true });
      // pointerdown fires before click, so even a straight tap with no hover
      // starts the widget a beat early rather than at open time.
      el.addEventListener('pointerdown', intent, { once: true, passive: true });
    });

    // Build the whole widget — iframe included — while the visitor is still
    // reading, so the click has nothing left to do. Calendly's own booking UI
    // (calendar, timezones, available slots) is the slow part and it is fetched
    // inside that iframe, which is why warming only the script was not enough.
    //
    // Deliberately on idle rather than on load: requestIdleCallback fires when
    // the browser has spare time, so this never competes with first paint or
    // with the opening scroll.
    function preloadCalendly() {
      wantsWidget = true;
      loadCalendly();
      initCalendly();          // no-op until the script lands; onload retries
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadCalendly, { timeout: 1200 });
    } else {
      window.addEventListener('load', () => setTimeout(preloadCalendly, 600));
    }

    function openCal(returnTo) {
      lastFocus = returnTo;
      // Warm means the modal is already displayed and laid out, so the
      // transition has a start value right now. Cold has just been unhidden
      // and needs one frame before the browser has anything to animate from.
      const wasWarm = calModal.classList.contains('is-warm');
      calModal.hidden = false;
      // Leaving the warm state is all an open has to do when the widget was
      // pre-built: the calendar is already rendered behind the zero opacity.
      calModal.removeAttribute('inert');
      calModal.classList.remove('is-warm');
      if (wasWarm) calModal.classList.add('is-open');
      else requestAnimationFrame(() => calModal.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
      setPageInert(true, [calModal]);
      wantsWidget = true;
      loadCalendly();
      initCalendly();          // usually already done by intent
      const close = calModal.querySelector('.cal-close');
      if (close) close.focus();
      if (window.plausible) window.plausible('Booking opened');
    }

    function closeCal() {
      calModal.classList.remove('is-open');
      document.body.style.overflow = '';
      setPageInert(false, []);
      if (lastFocus) lastFocus.focus();
      window.setTimeout(() => {
        // Back to warm rather than hidden when the widget exists, so a second
        // open is instant too. display:none would tear the calendar's layout
        // down and it would have to render again on the next open.
        if (inited) {
          calModal.classList.add('is-warm');
          calModal.setAttribute('inert', '');
        } else {
          calModal.hidden = true;
        }
      }, reduce ? 0 : 300);
    }

    document.querySelectorAll('[data-calendly]').forEach(trigger => {
      trigger.addEventListener('click', e => {
        e.preventDefault();
        // Stop the overlay's own link handler from also running — it would
        // clear the inert state this modal is about to set.
        e.stopPropagation();
        const fromMenu = menuOverlay.contains(trigger);
        if (isMenuOpen()) toggleMenu(false, false);
        // A trigger inside the menu is inert once the menu closes, so send
        // focus back to the menu button instead.
        openCal(fromMenu ? menuBtn : trigger);
      });
    });

    calModal.addEventListener('click', e => {
      if (e.target.hasAttribute('data-cal-close')) closeCal();
    });

    document.addEventListener('keydown', e => {
      if (calModal.hidden) return;

      if (e.key === 'Escape') {
        closeCal();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = Array.from(calPanel.querySelectorAll(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!calPanel.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* ---------------- GSAP scroll sequences ---------------- */

  if (!hasGSAP || reduce) return;

  // Hero sequence, one pinned timeline (Figma frames 1 -> 151 -> 152):
  //   0.00-0.30  tagline, nav and logomark fade; the title rises from the bottom
  //              of the hero to the vertical centre of the screen
  //   0.26-0.62  the title divides — HANO left, STUDIOS right — blurring out
  //   0.24-0.92  the square fades in between them, untwists from its kite, and
  //              grows past the viewport diagonal carrying the next section's
  //              gradient, until the words are gone and it covers the screen
  //   0.92-1.00  the square hands off to the statement behind it and fades out
  //
  // The hero title IS the splitting element — there is no second copy of the
  // words in a separate section any more.
  //
  // The pin ends the moment the cover completes. It used to run 1.7 viewports,
  // which left ~1.4 viewports of already-covered screen with nothing changing —
  // the first half of the black gap between the square and the client list.
  const heroSquare = document.querySelector('.hero-square');
  const heroTitle = document.getElementById('heroTitle');

  if (heroSquare && heroTitle && hero) {
    // How far the title must travel to sit on the viewport's centre line.
    const toCentre = () => {
      const r = heroTitle.getBoundingClientRect();
      const centreOfTitle = r.top + window.scrollY + r.height / 2;
      const heroTop = hero.getBoundingClientRect().top + window.scrollY;
      return (window.innerHeight / 2) - (centreOfTitle - heroTop);
    };
    // Exactly enough to cover, with a hair of margin. The scale tween is linear
    // and runs 0.24 -> 0.92, so any overshoot here means the screen is fully
    // covered before 0.92 and the remainder of the pin is a frozen frame. At the
    // old 1.08 the cover landed at ~0.80 of the pin on a tall window.
    const coverScale = () => {
      const size = heroSquare.offsetWidth || 1;
      return (Math.hypot(window.innerWidth, window.innerHeight) / size) * 1.01;
    };
    // Half the vertical distance between the stacked words' line boxes,
    // measured from layout (offsetTop is immune to the tweens' transforms).
    const htA = document.querySelector('.ht-a');
    const htB = document.querySelector('.ht-b');
    const mergeY = () => (htB.offsetTop - htA.offsetTop) / 2;

    const heroTL = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        // Pin until the statement's top reaches the top of the screen. With
        // pinSpacing:false the statement climbs behind the opaque hero at scroll
        // speed, so ending the pin at its document position means it lands
        // exactly as the pin releases and the square finishes fading — no frozen
        // frame, no seam, at any viewport size. The hero's margin-bottom (CSS)
        // sets how much scroll the sequence gets beyond one viewport; exactly
        // one viewport made the whole animation rush past in a single flick.
        end: () => {
          const st = document.querySelector('.statement');
          return '+=' + (st ? st.offsetTop - hero.offsetTop : hero.offsetHeight * 1.6);
        },
        // The square covers the whole screen by the end, so the screen-worth of
        // layout that pinSpacing would reserve after the pin is never seen as
        // anything but black — it was a full 1740px of dead scroll between the
        // hero and the statement at this window height. The next section follows
        // straight on instead.
        pinSpacing: false,
        scrub: 0.6,
        pin: true,
        anticipatePin: 0,
        invalidateOnRefresh: true,
        // With pinSpacing:false the released hero keeps its translation and
        // rides one full viewport over whatever follows — which meant the
        // opaque, square-covered hero sat ON TOP of the statement through its
        // entire reveal ("a blurred screen, then the text comes a scroll
        // later"). The moment the scroll crosses the pin end, drop the hero
        // beneath the statement, which wears the same surface, so the swap is
        // invisible. Raw-scroll callbacks, not a timeline .set: the scrubbed
        // playhead approaches 1 asymptotically and left the hero on top for
        // up to a second after release. onRefresh restores the right state on
        // load/refresh mid-page. Inline z only — a z-index in the CSS gets
        // cloned onto GSAP's pin-spacer at setup, and a spacer stuck above
        // the statement defeats everything set on the hero inside it.
        onLeave: () => { hero.style.zIndex = '1'; },
        onEnterBack: () => { hero.style.zIndex = '3'; },
        onRefresh: self => { hero.style.zIndex = self.progress >= 1 ? '1' : '3'; }
      }
    });

    // Above the statement from the first frame — onRefresh keeps it correct
    // from here on, but the first refresh may land after the first paint.
    hero.style.zIndex = '3';

    // The two words blur as they part — but a scrubbed blur re-rasterises the
    // text layer on EVERY scroll frame of the pin, and this is the very first
    // thing a visitor scrolls. On a phone that alone made the hero stutter. The
    // filter key is omitted entirely below 901px rather than tweened to 0: a
    // blur(0px) still puts the element on a filter path. The words already
    // travel 92% apart and fade to opacity 0, so at phone size the blur was
    // carrying almost none of the effect for most of the cost. CSS drops
    // `filter` from their will-change to match.
    const wantBlur = window.matchMedia('(min-width: 901px)').matches;
    const divideFrom = () => {
      const v = { xPercent: 0, y: 0, opacity: 1 };
      if (wantBlur) v.filter = 'blur(0px)';
      return v;
    };
    const divideTo = (xPercent, y) => {
      const v = { xPercent: xPercent, y: y, opacity: 0, ease: 'none', duration: 0.36 };
      if (wantBlur) v.filter = 'blur(9px)';
      return v;
    };

    heroTL
      .to('.hero-tagline', { opacity: 0, y: -40, ease: 'none', duration: 0.24 }, 0)
      // The top bar deliberately does NOT fade: frames 218 and 220 both still
      // draw the mark, the links and CONTACT US while the words divide, so it
      // rides the whole sequence. Only the phone's action bar goes with the
      // title it sits under.
      .to('.hero-cta-bar', { opacity: 0, y: 30, ease: 'none', duration: 0.22 }, 0)
      // Title climbs to the middle of the screen before anything divides.
      .to(heroTitle, { y: toCentre, ease: 'none', duration: 0.3 }, 0)
      // Then the two words part. They start at their natural positions so the
      // headline reads "HANO STUDIOS." right up until it divides. On phones the
      // title is stacked two lines, and mobile frame 2 shows the words meeting
      // on a SINGLE line as they divide ("O ◆ ST") — so each word also travels
      // half the stack offset toward the shared centre line. Inline (desktop)
      // the offset is zero and the y tween is a no-op.
      .fromTo('.ht-a', divideFrom(), divideTo(-92, mergeY), 0.26)
      .fromTo('.ht-b', divideFrom(), divideTo(92, () => -mergeY()), 0.26)
      // Square appears between them as they go, then takes the screen. Scale is
      // one continuous tween so it never dips; rotation runs alongside.
      .fromTo(heroSquare,
        { opacity: 0, scale: 0.22 },
        { opacity: 1, ease: 'none', duration: 0.1 }, 0.24)
      .fromTo(heroSquare,
        { rotate: -42 },
        { rotate: 0, ease: 'none', duration: 0.42 }, 0.24)
      // power1.in, not linear. Area grows as the square of scale, so a linear
      // scale covers the screen far faster at the end than the start — the last
      // stretch of the tween was redundant and full cover landed at ~0.80 of the
      // pin, leaving a frozen frame before the hand-off. Easing in spreads the
      // coverage evenly so it completes near the end of the pin.
      //
      // The square NEVER fades. Per the design (frames 192 -> 193) the covered
      // square IS the next section's background: the pin releases with the
      // square still filling the screen, and the statement — whose gradient is
      // the same surface — replaces it in the same frame. Fading it out here
      // used to flash the bare hero glow ("blurred screen") before the text.
      .fromTo(heroSquare,
        { scale: 0.22, borderRadius: '10px' },
        { scale: coverScale, borderRadius: '0px', ease: 'power1.in', duration: 0.76 }, 0.24)
      // ...and its tone settles to the page's black as it finishes covering, so
      // the flat box literally becomes the flat section behind it. This is what
      // lets both the square and .statement be solid colours instead of a pair
      // of matched gradients — that pairing was the only reason .statement
      // carried a gradient, and it showed as a sweep the reference doesn't have.
      // Runs while the screen is already fully covered, so all it does is settle
      // the tone; nothing moves and nothing fades out.
      .to(heroSquare, { backgroundColor: '#0A0A0A', ease: 'none', duration: 0.14 }, 0.86);
  }

  // Statement copy: the block pins, its lines reveal one per scroll step, then it
  // floats up and releases into the client grid. Lines are staggered across the
  // first 70% of the pin so the last one lands before the float begins.
  const statementPin = document.getElementById('statementPin');
  const scLines = document.querySelectorAll('.sc-line > span');

  if (statementPin && scLines.length) {
    const stTL = gsap.timeline({
      scrollTrigger: {
        trigger: statementPin,
        // Anchored so the reveal runs while the copy is actually on screen.
        // 'center center' (the original) made the block travel half a viewport
        // before the first line lit, leaving it visible-but-blank. 'top 78%'
        // overshot the other way and ran the whole reveal below the fold.
        // 'top top' — the block must be filling the screen before its lines
        // reveal. Latching earlier (while it is still entering) runs the whole
        // reveal below the fold on a tall window, so by the time the copy is
        // visible the animation is already over. The dead scroll that used to sit
        // in front of this is removed structurally instead: see .statement, whose
        // leading spacer no longer reserves a screen of its own.
        start: 'top top',
        // One viewport is enough for four lines plus the float. Any longer and
        // the last line lands well before the pin releases, which on a tall
        // window read as the copy just sitting there.
        end: () => '+=' + window.innerHeight,
        scrub: 0.55,
        pin: true,
        pinSpacing: true,
        anticipatePin: 0,
        invalidateOnRefresh: true
      }
    });

    const step = 0.7 / scLines.length;
    scLines.forEach((line, i) => {
      stTL.fromTo(line,
        { yPercent: 105, opacity: 0 },
        { yPercent: 0, opacity: 1, ease: 'power2.out', duration: step * 0.9 },
        i * step);
    });

    // Float to the top of the pin once every line has landed.
    stTL.to('.statement-copy', { yPercent: -14, ease: 'none', duration: 0.28 }, 0.72);
  }

  // Works — horizontal scroll pinned, from 701px up only. The mobile Figma
  // frames stack the cards vertically; CSS lays that out below 700px and
  // gsap.matchMedia tears the tween down (and rebuilds it) across resizes.
  const mm = gsap.matchMedia();
  const track = document.getElementById('worksTrack');
  if (track) {
    mm.add('(min-width: 701px)', () => {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: '.works',
          start: 'top top',
          end: () => '+=' + distance(),
          // anticipatePin pins early based on scroll velocity, which made the
          // Works panel jump over the client logos on a fast scroll. Off.
          scrub: 0.6,
          pin: '.works-pin',
          pinSpacing: true,
          invalidateOnRefresh: true
        }
      });
    });
  }

  // Showcase carousel: pin the section and drive the strip's native
  // scrollLeft with vertical scroll, the same pattern as Works just above —
  // first phone starts centred, continued scrolling pushes the active phone
  // left as the next one takes centre, and the pin releases the instant the
  // last phone is centred. Every width, not gsap.matchMedia'd to desktop like
  // Works — the Figma prototype (frame 198) shows this exact scroll-driven
  // interaction on a phone screen too. Arrows/click/video-ended still call
  // goTo() -> stage.scrollTo() as a manual nudge on top of this.
  //
  // This has to be created HERE — after Works — not back where the rest of
  // the carousel (arrows, click, IntersectionObserver) is set up. That
  // earlier spot runs before Works' own pin exists yet, and ScrollTrigger
  // measures a trigger's start position from the CURRENT layout at the
  // moment it's created: built that early, .showcase's start landed almost
  // exactly on top of Works' start (they measured ~1px apart), and the two
  // pins overlapped for the entire length of the Works horizontal scroll
  // instead of running one after the other. Every other pin on this page is
  // already created in the same order its section appears on the page —
  // this was the one exception, and that was the bug.
  if (stage) {
    const showDistance = () => Math.max(0, stage.scrollWidth - stage.clientWidth);
    const showTween = gsap.to(stage, {
      scrollLeft: () => showDistance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.showcase',
        start: 'top top',
        end: () => '+=' + showDistance(),
        scrub: 0.6,
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        onUpdate: () => {
          if (navLock) return;      // an arrow/click move is mid-flight
          const idx = nearestPhone();
          if (idx !== current) { current = idx; play(current); }
        }
      }
    });
    // centreOn() needs this to translate a phone into a page-scroll offset.
    showST = showTween.scrollTrigger;
    // Belt-and-braces final resync once the browser reports scrolling has
    // genuinely stopped. A deep link to #process lands here via native
    // smooth-scroll, which can cross this section's intersection threshold
    // (triggering the IntersectionObserver's resync, set up earlier) well
    // before the animation is actually done travelling — so that resync can
    // itself run against a stale mid-flight scrollLeft. 'scrollend' only
    // fires once motion has fully settled, whatever caused it, so this is
    // the one point that is never early.
    window.addEventListener('scrollend', () => {
      // Motion has stopped, so release the lock and let position win again.
      navLock = false;
      const idx = nearestPhone();
      if (idx !== current) { current = idx; play(current); }
    });
  }

  // Circle wipe into the light services section
  const wipeCircle = document.getElementById('wipeCircle');
  if (wipeCircle) {
    ScrollTrigger.create({
      trigger: '.wipe',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: self => {
        wipeCircle.style.setProperty('--scale', (0.06 + self.progress * 2.6).toFixed(3));
      }
    });
  }

  // Team panel grows out of the white services section — a narrow rounded card
  // at the bottom of the viewport that widens to full bleed as it scrolls up.
  // Default CSS is the finished state, so no GSAP means no broken half-state.
  if (document.querySelector('.team-riser')) {
    gsap.fromTo('.team',
      { width: '64%', borderTopLeftRadius: '44px', borderTopRightRadius: '44px' },
      {
        width: '100%',
        borderTopLeftRadius: '0px',
        borderTopRightRadius: '0px',
        ease: 'none',
        scrollTrigger: {
          trigger: '.team-riser',
          start: 'top 95%',
          end: 'top 22%',
          scrub: 0.7,
          invalidateOnRefresh: true
        }
      }
    );
  }

  // Showcase carousel is now driven by the pinned scroll-scrub set up back in
  // the carousel block above (search "showDistance") — see the comment there
  // for why. This used to be a subtle desktop-only parallax drift; that is
  // gone, because the real motion is now the scrub itself.

  // Case-study galleries slide in from the left as they enter, one slide after
  // the next, so the strip reads as arriving rather than just being there.
  // Transform only (no layout properties), so this cannot shift the page.
  document.querySelectorAll('[data-gallery] .gallery-track').forEach(track => {
    gsap.fromTo(Array.from(track.children),
      { xPercent: -14, opacity: 0 },
      {
        xPercent: 0,
        opacity: 1,
        ease: 'power2.out',
        duration: 0.7,
        stagger: 0.09,
        scrollTrigger: { trigger: track, start: 'top 88%', once: true }
      }
    );
  });

  // Footer watermark rises into place. A horizontal parallax was the wrong move
  // once the mark was sized to fit inside the page margins — with no overflow
  // there is nothing to reveal, so sideways travel just read as a wobble.
  // .footer already clips, so the mark climbs out from behind the bottom edge.
  // Default CSS is the settled state, so no GSAP leaves it in place and visible.
  gsap.fromTo('.footer-mark',
    { yPercent: 42, opacity: 0 },
    {
      yPercent: 0,
      opacity: 1,
      ease: 'none',
      scrollTrigger: { trigger: '.footer', start: 'top 82%', end: 'bottom bottom', scrub: 0.6 }
    }
  );

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
