/**
 * Desktop section-navigation state machine plus the compact mobile menu.
 * Native inner-section scrolling is preserved before page-level transitions.
 */

import {
  clearLocationHash,
  clearLocationNavigationState,
  dom,
  isMobileScene,
  mobileSceneQuery
} from "./core.js";

const {
  scene,
  content,
  sceneLoader,
  siteMenu,
  siteMenuBrand,
  mobileMenuToggle,
  mobileMenu,
  menuLinks
} = dom;

let isNavigationInitialized = false;

/**
 * Initializes the mobile menu and the desktop section-scrolling state machine.
 * Media callbacks keep navigation independent from the TV/VHS implementation.
 */
export const initNavigation = ({
  isVideoModalOpen = () => false,
  isGalleryModalOpen = () => false,
  hasTapeInlinePlayer = () => false,
  suspendTapeInlinePlaybackForSection = () => {},
  resumeTapeInlinePlaybackForSection = () => {},
  getTvNoiseController = () => null
} = {}) => {
  if (isNavigationInitialized) return;

  isNavigationInitialized = true;

  // Mobile menu ---------------------------------------------------------------

  if (mobileMenuToggle && mobileMenu) {
    const menuBars = mobileMenuToggle.querySelectorAll(".menui");

    /** Synchronizes menu visibility, accessibility attributes, and icon animation. */
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

  // Desktop section model and tuning -----------------------------------------

  if (scene && content && sceneLoader) {
    const sections = Array.from(content.querySelectorAll(".section"));
    // These thresholds distinguish deliberate section changes from trackpad noise.
    const pullThreshold = 420;
    const queuedScrollThreshold = 680;
    const queuedScrollStartDelay = 240;
    const precisionWheelDeltaCeiling = 80;
    const precisionWheelGestureGap = 48;
    const precisionWheelRenewedImpulseDelay = 120;
    const precisionWheelFadedDelta = 8;
    const precisionWheelRenewedDelta = 20;
    const resetDelay = 520;
    const boundaryTolerance = 3;
    const innerScrollTolerance = 2;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const transitionDuration = prefersReducedMotion ? 0 : 520;
    const transitionMaxDuration = prefersReducedMotion ? 0 : 900;
    const settleLockDuration = prefersReducedMotion ? 0 : 120;
    const postTransitionInputCooldown = prefersReducedMotion ? 0 : 160;

    const targets = [
      { id: "home", element: scene, top: () => 0 },
      ...sections.map((section) => ({
        id: section.id,
        element: section,
        top: () => section.offsetTop,
      })),
    ];

    /** Resolves an optional ?section=id request to a safe target index. */
    const getRequestedTargetIndex = () => {
      const requestedId = new URLSearchParams(window.location.search).get("section");

      if (!requestedId) return 0;

      const requestedIndex = targets.findIndex((target) => target.id === requestedId);

      return requestedIndex >= 0 ? requestedIndex : 0;
    };

    let activeTargetIndex = 0;
    let pullAmount = 0;
    let pullDirection = 0;
    let resetTimer;
    let scrollLockTimer;
    let transitionFinishTimer;
    let transitionFinishFrame;
    let scrollLockTarget = null;
    let isTransitioning = false;
    let transitionId = 0;
    let trailingInputUntil = 0;
    let lastTouchY = null;
    let touchStartTarget = null;
    let transitionStartedAt = 0;
    let queuedScrollDirection = 0;
    let queuedScrollAmount = 0;
    let precisionWheelGestureActive = false;
    let precisionWheelGestureConsumed = false;
    let precisionWheelConsumedAt = 0;
    let lastPrecisionWheelAt = 0;
    let lastPrecisionWheelDelta = 0;
    let lastPrecisionWheelDirection = 0;

    /** Keeps native scrolling on mobile and enables snapping only on desktop. */
    const shouldUseSectionScroller = () => !isMobileScene();
    /** Constrains navigation to an existing scene or content section. */
    const clampIndex = (index) => Math.max(0, Math.min(index, targets.length - 1));
    /** Returns the current document offset for a target. */
    const targetTop = (index) => targets[clampIndex(index)].top();
    /** Reports whether the short post-transition position lock is active. */
    const isScrollLocked = () => scrollLockTarget !== null && performance.now() < scrollLockTarget.until;
    /** Returns the target currently represented by menu and audio state. */
    const activeTarget = () => targets[activeTargetIndex];
    /** Calculates the usable inner-scroll range of a section element. */
    const maxInnerScroll = (element) => Math.max(0, element.scrollHeight - element.clientHeight);

    // Input normalization and nested-scroll ownership -------------------------

    /** Normalizes wheel delta modes to pixel-like vertical movement. */
    const getWheelDeltaY = (event) => {
      if (event.deltaMode === 1) return event.deltaY * 16;
      if (event.deltaMode === 2) return event.deltaY * window.innerHeight;

      return event.deltaY;
    };

    /** Checks whether a nested element should consume input before section navigation. */
    const canElementScrollInDirection = (element, direction) => {
      const scrollRange = maxInnerScroll(element);

      if (scrollRange <= innerScrollTolerance) return false;
      if (direction > 0) return element.scrollTop < scrollRange - innerScrollTolerance;

      return element.scrollTop > innerScrollTolerance;
    };

    /** Finds the nearest scrollable ancestor inside the active content section. */
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

    /** Positions a destination section at the correct inner edge before entering it. */
    const resetTargetInnerScroll = (index, direction) => {
      const target = targets[clampIndex(index)];
      const element = target?.element;

      if (!element || element === scene) return;

      element.scrollTop = direction < 0 ? maxInnerScroll(element) : 0;
    };

    /** Finds the section closest to the actual window position. */
    const nearestTargetIndex = () => {
      const currentY = window.scrollY;

      return targets.reduce((nearestIndex, target, index) => {
        const nearestDistance = Math.abs(currentY - targetTop(nearestIndex));
        const targetDistance = Math.abs(currentY - target.top());

        return targetDistance < nearestDistance ? index : nearestIndex;
      }, 0);
    };

    // Indicator, menu, and media synchronization ------------------------------

    /** Runs the reel animation independently while scroll navigation is active. */
    const setLoaderActive = (isActive) => {
      sceneLoader.classList.toggle("is-visible", isActive);
      siteMenuBrand?.classList.toggle("is-loading", isActive);
    };

    /** Synchronizes header styling and active navigation links. */
    const updateMenuState = () => {
      const activeId = targets[activeTargetIndex]?.id;

      siteMenu?.classList.toggle("is-off-scene", activeTargetIndex > 0);
      siteMenu?.classList.toggle("is-contact-section", activeId === "contact");

      menuLinks.forEach((link) => {
        const linkId = link.getAttribute("href")?.slice(1);
        link.classList.toggle("is-active", linkId === activeId);
      });
    };

    /** Coordinates tape playback and TV noise when the active section changes. */
    const updateAudioForTarget = () => {
      if (activeTargetIndex === 0) {
        resumeTapeInlinePlaybackForSection();
        if (hasTapeInlinePlayer()) {
          getTvNoiseController()?.silence();
          return;
        }

        getTvNoiseController()?.fadeIn();
        return;
      }

      suspendTapeInlinePlaybackForSection();
      getTvNoiseController()?.fadeOut();
    };

    /** Clears an incomplete pull gesture and hides the loader. */
    const resetPull = () => {
      pullAmount = 0;
      pullDirection = 0;
      setLoaderActive(false);
    };

    /** Clears wheel input accumulated for a chained section transition. */
    const resetQueuedScroll = () => {
      queuedScrollDirection = 0;
      queuedScrollAmount = 0;
    };

    /** Distinguishes a new touchpad impulse from momentum belonging to the previous gesture. */
    const trackPrecisionWheelGesture = (event, deltaY) => {
      const now = performance.now();
      const elapsed = now - lastPrecisionWheelAt;
      const direction = Math.sign(deltaY);
      const absoluteDelta = Math.abs(deltaY);
      const isPrecisionEvent = event.deltaMode === 0 && (
        Math.abs(event.deltaX) > 0
        || Math.abs(event.deltaY) <= precisionWheelDeltaCeiling
        || !Number.isInteger(event.deltaY)
      );
      const continuesPrecisionGesture = precisionWheelGestureActive && elapsed < precisionWheelGestureGap;
      const isPrecisionGesture = isPrecisionEvent || continuesPrecisionGesture;

      if (!isPrecisionGesture) {
        precisionWheelGestureActive = false;
        return false;
      }

      const hasGestureGap = !precisionWheelGestureActive || elapsed >= precisionWheelGestureGap;
      const changedDirection = Boolean(lastPrecisionWheelDirection && direction !== lastPrecisionWheelDirection);
      const hasRenewedImpulse = (
        precisionWheelGestureConsumed
        && now - precisionWheelConsumedAt >= precisionWheelRenewedImpulseDelay
        && lastPrecisionWheelDelta <= precisionWheelFadedDelta
        && absoluteDelta >= precisionWheelRenewedDelta
      );
      const isNewGesture = hasGestureGap || changedDirection || hasRenewedImpulse;

      if (isNewGesture) {
        precisionWheelGestureConsumed = false;
      }

      precisionWheelGestureActive = true;
      lastPrecisionWheelAt = now;
      lastPrecisionWheelDelta = absoluteDelta;
      lastPrecisionWheelDirection = direction;

      return true;
    };

    /** Marks one precision gesture as handled without delaying the next distinct impulse. */
    const consumePrecisionWheelGesture = () => {
      precisionWheelGestureConsumed = true;
      precisionWheelConsumedAt = performance.now();
    };

    /** Checks whether a neighboring section exists. */
    const canMoveToTarget = (direction) => {
      const nextIndex = activeTargetIndex + direction;

      return nextIndex >= 0 && nextIndex < targets.length;
    };

    /** Delays chained input until the current transition is visibly underway. */
    const canQueueChainedScroll = () => (
      !isTransitioning || performance.now() - transitionStartedAt >= queuedScrollStartDelay
    );

    /** Accumulates deliberate wheel input for moving through multiple sections. */
    const queueSectionScroll = (direction, delta) => {
      if (!canQueueChainedScroll()) return false;

      if (!canMoveToTarget(direction)) {
        resetQueuedScroll();
        return false;
      }

      if (queuedScrollDirection !== direction) {
        queuedScrollDirection = direction;
        queuedScrollAmount = 0;
      }

      queuedScrollAmount += Math.abs(delta);

      return queuedScrollAmount >= queuedScrollThreshold;
    };

    /** Resets partial pull input after the user stops scrolling. */
    const queueReset = () => {
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(resetPull, resetDelay);
    };

    /** Holds the exact target position briefly after smooth scrolling settles. */
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

    /** Ignores momentum events immediately following a completed transition. */
    const suppressTrailingInput = () => {
      if (postTransitionInputCooldown <= 0) return;

      trailingInputUntil = performance.now() + postTransitionInputCooldown;
    };

    /** Reports whether trackpad momentum is still inside the cooldown window. */
    const isTrailingInputSuppressed = () => performance.now() < trailingInputUntil;

    /** Cancels both mechanisms used to detect transition completion. */
    const clearTransitionFinish = () => {
      window.clearTimeout(transitionFinishTimer);

      if (transitionFinishFrame) {
        window.cancelAnimationFrame(transitionFinishFrame);
        transitionFinishFrame = null;
      }
    };

    // Section transition state machine ----------------------------------------

    /** Performs one section transition and synchronizes visual/media state. */
    const goToTarget = (index, options = {}) => {
      const nextIndex = clampIndex(index);

      if (!shouldUseSectionScroller()) {
        activeTargetIndex = nextIndex;
        resetPull();
        targets[nextIndex]?.element?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
        updateMenuState();
        updateAudioForTarget();
        return;
      }

      const computedDirection = Math.sign(nextIndex - activeTargetIndex);
      const travelDirection = options.direction ?? (computedDirection || 1);
      const shouldShowLoader = options.showLoader ?? true;
      const currentTransitionId = transitionId + 1;
      const currentTransitionStartedAt = performance.now();

      transitionId = currentTransitionId;
      transitionStartedAt = currentTransitionStartedAt;
      clearTransitionFinish();
      window.clearTimeout(scrollLockTimer);
      scrollLockTarget = null;
      trailingInputUntil = 0;

      isTransitioning = true;
      activeTargetIndex = nextIndex;
      resetTargetInnerScroll(nextIndex, travelDirection);
      updateMenuState();
      window.clearTimeout(resetTimer);

      if (shouldShowLoader) {
        setLoaderActive(true);
      } else {
        resetPull();
      }

      if (nextIndex !== 0) {
        suspendTapeInlinePlaybackForSection();
        getTvNoiseController()?.fadeOut();
      }

      window.scrollTo({
        top: targetTop(nextIndex),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });

      /** Finalizes only the latest transition and consumes queued movement. */
      const finishTransition = () => {
        if (currentTransitionId !== transitionId) return;

        const settledTop = targetTop(nextIndex);

        transitionFinishFrame = null;
        window.scrollTo({ top: settledTop, behavior: "auto" });
        resetPull();
        updateMenuState();
        updateAudioForTarget();
        isTransitioning = false;

        if (consumeQueuedScroll()) {
          return;
        }

        lockScrollAt(settledTop);
        suppressTrailingInput();
      };

      /** Polls smooth-scroll position until it settles or reaches the time limit. */
      const waitForScrollSettle = () => {
        if (currentTransitionId !== transitionId) return;

        const elapsed = performance.now() - currentTransitionStartedAt;
        const distance = Math.abs(window.scrollY - targetTop(nextIndex));

        if (distance <= boundaryTolerance || elapsed >= transitionMaxDuration) {
          finishTransition();
          return;
        }

        transitionFinishFrame = window.requestAnimationFrame(waitForScrollSettle);
      };

      transitionFinishTimer = window.setTimeout(waitForScrollSettle, transitionDuration);
    };

    /** Converts wheel/touch distance into loader progress and a target change. */
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
      setLoaderActive(true);
      queueReset();

      if (pullAmount >= threshold) {
        goToTarget(nextIndex, { showLoader: true });
      }
    };

    /** Starts the next transition after enough chained input was collected. */
    const consumeQueuedScroll = () => {
      const direction = queuedScrollDirection;

      resetQueuedScroll();

      if (!direction || !canMoveToTarget(direction)) return false;

      goToTarget(activeTargetIndex + direction, {
        direction,
        showLoader: true
      });

      return true;
    };

    // Wheel and touch input ----------------------------------------------------

    window.addEventListener(
      "wheel",
      (event) => {
        if (isVideoModalOpen() || isGalleryModalOpen()) {
          event.preventDefault();
          return;
        }

        if (!shouldUseSectionScroller()) {
          resetPull();
          resetQueuedScroll();
          return;
        }

        const deltaY = getWheelDeltaY(event);
        const direction = deltaY > 0 ? 1 : -1;

        if (deltaY === 0) {
          return;
        }

        const isPrecisionWheelGesture = trackPrecisionWheelGesture(event, deltaY);

        // One touchpad flick may emit momentum for hundreds of milliseconds.
        // After it changes a section, consume its tail instead of treating it as new navigation.
        if (isPrecisionWheelGesture && precisionWheelGestureConsumed) {
          event.preventDefault();
          resetPull();
          resetQueuedScroll();

          if (isScrollLocked()) {
            window.scrollTo({ top: scrollLockTarget.top, behavior: "auto" });
          }

          return;
        }

        if (isScrollLocked()) {
          event.preventDefault();
          resetPull();

          if (isPrecisionWheelGesture) {
            window.clearTimeout(scrollLockTimer);
            scrollLockTarget = null;
            trailingInputUntil = 0;
            resetQueuedScroll();
            consumePrecisionWheelGesture();

            if (canMoveToTarget(direction)) {
              goToTarget(activeTargetIndex + direction, { direction, showLoader: true });
            }

            return;
          }

          if (queueSectionScroll(direction, deltaY)) {
            window.clearTimeout(scrollLockTimer);
            scrollLockTarget = null;
            consumeQueuedScroll();
          } else {
            window.scrollTo({ top: scrollLockTarget.top, behavior: "auto" });
          }
          return;
        }

        if (isTransitioning) {
          event.preventDefault();

          if (isPrecisionWheelGesture) {
            resetQueuedScroll();
            consumePrecisionWheelGesture();

            if (canMoveToTarget(direction)) {
              queuedScrollDirection = direction;
              queuedScrollAmount = queuedScrollThreshold;
            }

            return;
          }

          queueSectionScroll(direction, deltaY);
          return;
        }

        if (isTrailingInputSuppressed()) {
          event.preventDefault();
          resetPull();

          if (isPrecisionWheelGesture) {
            trailingInputUntil = 0;
            resetQueuedScroll();
            consumePrecisionWheelGesture();

            if (canMoveToTarget(direction)) {
              goToTarget(activeTargetIndex + direction, { direction, showLoader: true });
            }

            return;
          }

          if (queueSectionScroll(direction, deltaY)) {
            trailingInputUntil = 0;
            consumeQueuedScroll();
          }
          return;
        }

        if (getScrollableElementForEvent(event.target, direction)) {
          resetPull();
          return;
        }

        event.preventDefault();
        resetQueuedScroll();

        if (isPrecisionWheelGesture) {
          consumePrecisionWheelGesture();

          if (canMoveToTarget(direction)) {
            goToTarget(activeTargetIndex + direction, { direction, showLoader: true });
          } else {
            resetPull();
          }

          return;
        }

        handlePull(direction, deltaY);
      },
      { passive: false }
    );

    window.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) return;

        if (!shouldUseSectionScroller()) {
          lastTouchY = null;
          touchStartTarget = null;
          return;
        }

        lastTouchY = event.touches[0].clientY;
        touchStartTarget = event.target;
      },
      { passive: true }
    );

    window.addEventListener(
      "touchmove",
      (event) => {
        if (isVideoModalOpen() || isGalleryModalOpen()) {
          event.preventDefault();
          return;
        }

        if (!shouldUseSectionScroller()) {
          resetPull();
          resetQueuedScroll();
          return;
        }

        if (mobileMenu?.classList.contains("is-open")) return;
        if (event.touches.length !== 1 || lastTouchY === null) return;

        const currentY = event.touches[0].clientY;
        const deltaY = lastTouchY - currentY;
        const direction = deltaY > 0 ? 1 : -1;
        const touchThreshold = Math.min(pullThreshold, window.innerHeight * 0.55);

        lastTouchY = currentY;

        if (isScrollLocked()) {
          event.preventDefault();
          resetPull();
          window.scrollTo({ top: scrollLockTarget.top, behavior: "auto" });
          return;
        }

        if (isTransitioning) {
          event.preventDefault();
          return;
        }

        if (isTrailingInputSuppressed()) {
          event.preventDefault();
          resetPull();
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
        if (!shouldUseSectionScroller()) {
          activeTargetIndex = nearestTargetIndex();
          scrollLockTarget = null;
          resetPull();
          updateMenuState();
          updateAudioForTarget();
          return;
        }

        if (isTransitioning) {
          return;
        }

        const target = targetTop(activeTargetIndex);

        if (Math.abs(window.scrollY - target) > boundaryTolerance) {
          resetPull();
          suppressTrailingInput();
          window.scrollTo({ top: target, behavior: "auto" });
          return;
        }

        updateAudioForTarget();
      },
      { passive: true }
    );

    // Direct menu navigation and responsive reconciliation --------------------

    menuLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        const sectionId = link.getAttribute("href")?.slice(1);
        const targetIndex = targets.findIndex((target) => target.id === sectionId);

        if (targetIndex === -1) return;

        event.preventDefault();
        clearLocationHash();
        mobileMenu?.classList.remove("is-open");
        mobileMenu?.setAttribute("aria-hidden", "true");
        mobileMenuToggle?.setAttribute("aria-expanded", "false");
        mobileMenuToggle?.setAttribute("aria-label", "Open menu");
        document.body.classList.remove("menu-open");
        goToTarget(targetIndex, { showLoader: false });
      });
    });

    /** Reconciles state after crossing the mobile/desktop breakpoint. */
    const syncSectionScrollerMode = () => {
      clearTransitionFinish();
      window.clearTimeout(scrollLockTimer);
      scrollLockTarget = null;
      isTransitioning = false;
      trailingInputUntil = 0;
      lastTouchY = null;
      touchStartTarget = null;
      activeTargetIndex = nearestTargetIndex();
      resetPull();
      resetQueuedScroll();
      updateMenuState();
      updateAudioForTarget();

      if (shouldUseSectionScroller()) {
        lockScrollAt(targetTop(activeTargetIndex));
      }
    };

    /** Establishes the initial section without playing a transition animation. */
    const startAtTarget = (index = 0) => {
      const nextIndex = clampIndex(index);

      clearTransitionFinish();
      window.clearTimeout(scrollLockTimer);
      scrollLockTarget = null;
      isTransitioning = false;
      trailingInputUntil = 0;
      activeTargetIndex = nextIndex;
      resetPull();
      resetQueuedScroll();
      clearLocationNavigationState();
      window.scrollTo({ top: targetTop(nextIndex), behavior: "auto" });
      updateMenuState();
      updateAudioForTarget();

      if (shouldUseSectionScroller()) {
        lockScrollAt(targetTop(nextIndex));
      }
    };

    if (typeof mobileSceneQuery.addEventListener === "function") {
      mobileSceneQuery.addEventListener("change", syncSectionScrollerMode);
    } else if (typeof mobileSceneQuery.addListener === "function") {
      mobileSceneQuery.addListener(syncSectionScrollerMode);
    }

    startAtTarget(getRequestedTargetIndex());

    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        startAtTarget();
      }
    });
  }
};
