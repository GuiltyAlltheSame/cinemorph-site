const vhsTrigger = document.querySelector(".hotspot-vhs");
const vhsMenu = document.querySelector("#vhsMenu");
const scene = document.querySelector(".main-area");
const content = document.querySelector("main");
const sceneLoader = document.querySelector("#sceneLoader");
const siteMenu = document.querySelector("#menu");
const siteMenuBrand = document.querySelector("#logo-menu");
const mobileMenuToggle = document.querySelector("#menu .icon");
const mobileMenu = document.querySelector("#mobileNav");
const menuLinks = document.querySelectorAll("[data-section-link]");
const tvContent = document.querySelector(".tv-content");
const tvNoise = document.querySelector("#tvNoise");
const tvPowerClick = document.querySelector("#tvPowerClick");
const tvPowerButton = document.querySelector(".hotspot-tv-power");
const tvBloom = document.querySelector(".tv-bloom");
const vcrClock = document.querySelector("#vcrClock");
const vcrClockHours = document.querySelector(".vcr-clock__hours");
const vcrClockMinutes = document.querySelector(".vcr-clock__minutes");
let tvNoiseController;

if (tvContent && tvNoise && tvPowerButton && tvBloom) {
  const maxNoiseVolume = 0.01;
  const tvBootDuration = 2600;
  const tvShutdownDuration = 420;

  // on/off button sound: 1 = orig, 1.35 = faster, 0.8 = slower.
  const tvPowerClickPlaybackRate = 4;
  
  let noiseFadeFrame;
  let tvShutdownTimer;
  let noiseStarted = false;
  let targetNoiseVolume = 0;
  let tvPoweredOn = false;

  const fadeNoiseTo = (targetVolume, duration = 900) => {
    if (targetNoiseVolume === targetVolume) return;

    targetNoiseVolume = targetVolume;
    window.cancelAnimationFrame(noiseFadeFrame);

    const startVolume = tvNoise.volume;
    const volumeDelta = targetVolume - startVolume;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      tvNoise.volume = startVolume + volumeDelta * easedProgress;

      if (progress < 1) {
        noiseFadeFrame = window.requestAnimationFrame(tick);
      } else if (targetVolume === 0) {
        noiseFadeFrame = null;
        tvNoise.pause();
      } else {
        noiseFadeFrame = null;
      }
    };

    noiseFadeFrame = window.requestAnimationFrame(tick);
  };

  const startNoise = async () => {
    if (!tvPoweredOn) return;

    if (!noiseStarted) {
      tvNoise.volume = 0;
    }

    try {
      await tvNoise.play();
      noiseStarted = true;

      if (window.scrollY <= 2) {
        fadeNoiseTo(maxNoiseVolume, tvBootDuration);
      }
    } catch {
      // Autoplay with sound is often blocked until the first user gesture.
    }
  };

  const playPowerClick = () => {
    if (!tvPowerClick) return;

    tvPowerClick.pause();
    tvPowerClick.currentTime = 0;
    tvPowerClick.playbackRate = tvPowerClickPlaybackRate;
    tvPowerClick.play().catch(() => {});
  };

  const powerOnTv = () => {
    window.clearTimeout(tvShutdownTimer);
    tvPoweredOn = true;
    tvContent.classList.remove("is-switching-off");
    tvContent.classList.add("is-on");
    tvBloom.classList.add("is-on");
    tvPowerButton.classList.add("is-on");
    tvPowerButton.setAttribute("aria-label", "Turn TV off");
    tvPowerButton.setAttribute("aria-pressed", "true");
    startNoise();
  };

  const powerOffTv = () => {
    window.clearTimeout(tvShutdownTimer);
    tvPoweredOn = false;
    tvContent.classList.add("is-switching-off");
    tvContent.classList.remove("is-on");
    tvBloom.classList.remove("is-on");
    tvPowerButton.classList.remove("is-on");
    tvPowerButton.setAttribute("aria-label", "Turn TV on");
    tvPowerButton.setAttribute("aria-pressed", "false");

    if (noiseStarted) {
      fadeNoiseTo(0);
    }

    tvShutdownTimer = window.setTimeout(() => {
      tvContent.classList.remove("is-switching-off");
    }, tvShutdownDuration);
  };

  tvPowerButton.addEventListener("click", () => {
    playPowerClick();

    if (tvPoweredOn) {
      powerOffTv();
      return;
    }

    powerOnTv();
  });

  tvNoiseController = {
    fadeIn: () => {
      if (!tvPoweredOn) return;

      if (!noiseStarted) {
        startNoise();
        return;
      }

      if (tvNoise.paused) {
        tvNoise.play().then(() => fadeNoiseTo(maxNoiseVolume)).catch(() => {});
        return;
      }

      fadeNoiseTo(maxNoiseVolume);
    },
    fadeOut: () => {
      if (tvPoweredOn && noiseStarted) {
        fadeNoiseTo(0);
      }
    },
  };
}

if (vhsTrigger && vhsMenu) {
  const openVhsMenu = () => {
    vhsMenu.classList.add("is-open");
    vhsMenu.setAttribute("aria-hidden", "false");
    vhsTrigger.setAttribute("aria-expanded", "true");
  };

  const closeVhsMenu = () => {
    vhsMenu.classList.remove("is-open");
    vhsMenu.setAttribute("aria-hidden", "true");
    vhsTrigger.setAttribute("aria-expanded", "false");
  };

  vhsTrigger.addEventListener("click", () => {
    if (vhsMenu.classList.contains("is-open")) {
      closeVhsMenu();
      return;
    }

    openVhsMenu();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!vhsMenu.classList.contains("is-open")) return;
    if (vhsMenu.contains(event.target) || vhsTrigger.contains(event.target)) return;

    closeVhsMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeVhsMenu();
    }
  });
}

if (vcrClock && vcrClockHours && vcrClockMinutes) {
  const updateVcrClock = () => {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes();
    const displayTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    vcrClockHours.textContent = String(hours).padStart(2, "0");
    vcrClockMinutes.textContent = String(minutes).padStart(2, "0");
    vcrClock.setAttribute("aria-label", `VCR clock ${displayTime}`);
  };

  updateVcrClock();
  window.setInterval(updateVcrClock, 1000);
}

if (mobileMenuToggle && mobileMenu) {
  const menuBars = mobileMenuToggle.querySelectorAll(".menui");

  const setMobileMenuOpen = (isOpen) => {
    mobileMenu.classList.toggle("is-open", isOpen);
    mobileMenu.setAttribute("aria-hidden", String(!isOpen));
    mobileMenuToggle.setAttribute("aria-expanded", String(isOpen));
    mobileMenuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", isOpen);
    menuBars[0]?.classList.toggle("top-animate", isOpen);
    menuBars[1]?.classList.toggle("mid-animate", isOpen);
    menuBars[2]?.classList.toggle("bottom-animate", isOpen);
  };

  mobileMenuToggle.addEventListener("click", () => {
    setMobileMenuOpen(!mobileMenu.classList.contains("is-open"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMobileMenuOpen(false);
    }
  });

  mobileMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setMobileMenuOpen(false);
    }
  });
}

if (scene && content && sceneLoader) {
  const sections = Array.from(content.querySelectorAll(".section"));
  const pullThreshold = 900;
  const resetDelay = 520;
  const boundaryTolerance = 3;
  const innerScrollTolerance = 2;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const transitionDuration = prefersReducedMotion ? 0 : 720;
  const settleLockDuration = prefersReducedMotion ? 0 : 320;

  const targets = [
    { id: "home", element: scene, top: () => 0 },
    ...sections.map((section) => ({
      id: section.id,
      element: section,
      top: () => section.offsetTop,
    })),
  ];

  let activeTargetIndex = 0;
  let pullAmount = 0;
  let pullDirection = 0;
  let resetTimer;
  let scrollLockTimer;
  let scrollLockTarget = null;
  let isTransitioning = false;
  let lastTouchY = null;
  let touchStartTarget = null;

  const clampIndex = (index) => Math.max(0, Math.min(index, targets.length - 1));
  const targetTop = (index) => targets[clampIndex(index)].top();
  const isScrollLocked = () => scrollLockTarget !== null && performance.now() < scrollLockTarget.until;
  const activeTarget = () => targets[activeTargetIndex];
  const maxInnerScroll = (element) => Math.max(0, element.scrollHeight - element.clientHeight);

  const getWheelDeltaY = (event) => {
    if (event.deltaMode === 1) return event.deltaY * 16;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight;

    return event.deltaY;
  };

  const canElementScrollInDirection = (element, direction) => {
    const scrollRange = maxInnerScroll(element);

    if (scrollRange <= innerScrollTolerance) return false;
    if (direction > 0) return element.scrollTop < scrollRange - innerScrollTolerance;

    return element.scrollTop > innerScrollTolerance;
  };

  const getScrollableElementForEvent = (target, direction) => {
    const activeElement = activeTarget()?.element;
    const startElement = target instanceof Element ? target : target?.parentElement;

    if (!activeElement || activeElement === scene || !startElement) {
      return null;
    }

    let element = startElement;

    while (element && element !== document.body && element !== document.documentElement) {
      if (activeElement.contains(element) && canElementScrollInDirection(element, direction)) {
        return element;
      }

      if (element === activeElement) {
        break;
      }

      element = element.parentElement;
    }

    return null;
  };

  const resetTargetInnerScroll = (index, direction) => {
    const target = targets[clampIndex(index)];
    const element = target?.element;

    if (!element || element === scene) return;

    element.scrollTop = direction < 0 ? maxInnerScroll(element) : 0;
  };

  const nearestTargetIndex = () => {
    const currentY = window.scrollY;

    return targets.reduce((nearestIndex, target, index) => {
      const nearestDistance = Math.abs(currentY - targetTop(nearestIndex));
      const targetDistance = Math.abs(currentY - target.top());

      return targetDistance < nearestDistance ? index : nearestIndex;
    }, 0);
  };

  const updateLoader = (progress) => {
    const clampedProgress = Math.max(0, Math.min(progress, 1));
    const frame = Math.min(Math.floor(clampedProgress * 4), 4);

    sceneLoader.style.setProperty("--loader-frame-position", `${frame * 25}%`);
    sceneLoader.classList.toggle("is-visible", clampedProgress > 0);
    siteMenuBrand?.classList.toggle("is-loading", clampedProgress > 0);
  };

  const updateMenuState = () => {
    const activeId = targets[activeTargetIndex]?.id;

    siteMenu?.classList.toggle("is-off-scene", activeTargetIndex > 0);

    menuLinks.forEach((link) => {
      const linkId = link.getAttribute("href")?.slice(1);
      link.classList.toggle("is-active", linkId === activeId);
    });
  };

  const updateAudioForTarget = () => {
    if (activeTargetIndex === 0) {
      tvNoiseController?.fadeIn();
      return;
    }

    tvNoiseController?.fadeOut();
  };

  const resetPull = () => {
    pullAmount = 0;
    pullDirection = 0;
    updateLoader(0);
  };

  const queueReset = () => {
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(resetPull, resetDelay);
  };

  const lockScrollAt = (top) => {
    window.clearTimeout(scrollLockTimer);
    scrollLockTarget = {
      top,
      until: performance.now() + settleLockDuration,
    };

    window.scrollTo({ top, behavior: "auto" });

    scrollLockTimer = window.setTimeout(() => {
      if (scrollLockTarget?.top === top) {
        scrollLockTarget = null;
      }
    }, settleLockDuration);
  };

  const goToTarget = (index, options = {}) => {
    const nextIndex = clampIndex(index);
    const computedDirection = Math.sign(nextIndex - activeTargetIndex);
    const travelDirection = options.direction ?? (computedDirection || 1);
    const shouldShowLoader = options.showLoader ?? true;

    isTransitioning = true;
    activeTargetIndex = nextIndex;
    resetTargetInnerScroll(nextIndex, travelDirection);
    updateMenuState();
    window.clearTimeout(resetTimer);

    if (shouldShowLoader) {
      updateLoader(1);
    } else {
      resetPull();
    }

    if (nextIndex !== 0) {
      tvNoiseController?.fadeOut();
    }

    window.scrollTo({
      top: targetTop(nextIndex),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    window.setTimeout(() => {
      lockScrollAt(targetTop(nextIndex));
      resetPull();
      updateMenuState();
      updateAudioForTarget();
      isTransitioning = false;
    }, transitionDuration);
  };

  const handlePull = (direction, delta, threshold = pullThreshold) => {
    const nextIndex = activeTargetIndex + direction;

    if (nextIndex < 0 || nextIndex >= targets.length) {
      resetPull();
      return;
    }

    if (pullDirection !== direction) {
      pullDirection = direction;
      pullAmount = 0;
    }

    pullAmount = Math.min(pullAmount + Math.abs(delta), threshold);
    updateLoader(pullAmount / threshold);
    queueReset();

    if (pullAmount >= threshold) {
      goToTarget(nextIndex, { showLoader: true });
    }
  };

  window.addEventListener(
    "wheel",
    (event) => {
      const deltaY = getWheelDeltaY(event);
      const direction = deltaY > 0 ? 1 : -1;

      if (deltaY === 0) {
        return;
      }

      if (isScrollLocked()) {
        event.preventDefault();
        window.scrollTo({ top: scrollLockTarget.top, behavior: "auto" });
        return;
      }

      if (isTransitioning) {
        event.preventDefault();
        return;
      }

      if (getScrollableElementForEvent(event.target, direction)) {
        resetPull();
        return;
      }

      event.preventDefault();
      handlePull(direction, deltaY);
    },
    { passive: false }
  );

  window.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) return;

      lastTouchY = event.touches[0].clientY;
      touchStartTarget = event.target;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (mobileMenu?.classList.contains("is-open")) return;
      if (event.touches.length !== 1 || lastTouchY === null) return;

      const currentY = event.touches[0].clientY;
      const deltaY = lastTouchY - currentY;
      const direction = deltaY > 0 ? 1 : -1;
      const touchThreshold = Math.min(pullThreshold, window.innerHeight * 0.55);

      lastTouchY = currentY;

      if (isScrollLocked()) {
        event.preventDefault();
        window.scrollTo({ top: scrollLockTarget.top, behavior: "auto" });
        return;
      }

      if (isTransitioning) {
        event.preventDefault();
        return;
      }

      if (Math.abs(deltaY) < 1) {
        return;
      }

      if (getScrollableElementForEvent(touchStartTarget, direction)) {
        resetPull();
        return;
      }

      event.preventDefault();
      handlePull(direction, deltaY, touchThreshold);
    },
    { passive: false }
  );

  window.addEventListener(
    "touchend",
    () => {
      lastTouchY = null;
      touchStartTarget = null;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchcancel",
    () => {
      lastTouchY = null;
      touchStartTarget = null;
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      if (isTransitioning) {
        return;
      }

      const target = targetTop(activeTargetIndex);

      if (Math.abs(window.scrollY - target) > boundaryTolerance) {
        window.scrollTo({ top: target, behavior: "auto" });
        return;
      }

      updateAudioForTarget();
    },
    { passive: true }
  );

  menuLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const sectionId = link.getAttribute("href")?.slice(1);
      const targetIndex = targets.findIndex((target) => target.id === sectionId);

      if (targetIndex === -1) return;

      event.preventDefault();
      goToTarget(targetIndex, { showLoader: false });
    });
  });

  activeTargetIndex = nearestTargetIndex();
  lockScrollAt(targetTop(activeTargetIndex));
  updateMenuState();
  updateAudioForTarget();
}
