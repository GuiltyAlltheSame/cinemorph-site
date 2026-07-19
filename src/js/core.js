/**
 * Shared public-site primitives: DOM references, responsive mode, and mobile
 * viewport effects used by cards in several feature modules.
 */

// DOM registry and shared helpers --------------------------------------------

export const dom = {
  vhsTrigger: document.querySelector(".hotspot-vhs"),
  vhsMenu: document.querySelector("#vhsMenu"),
  vhsMenuContent: document.querySelector("[data-vhs-menu-content]"),
  vcrSlotTarget: document.querySelector("#vcrSlotTarget"),
  scene: document.querySelector(".main-area"),
  content: document.querySelector("main"),
  sceneLoader: document.querySelector("#sceneLoader"),
  siteMenu: document.querySelector("#menu"),
  siteMenuBrand: document.querySelector("#logo-menu"),
  mobileMenuToggle: document.querySelector("#menu .icon"),
  mobileMenu: document.querySelector("#mobileNav"),
  menuLinks: document.querySelectorAll("[data-section-link]"),
  tvContent: document.querySelector(".tv-content"),
  tvNoise: document.querySelector("#tvNoise"),
  tvPowerClick: document.querySelector("#tvPowerClick"),
  vcrTapeInsertSound: document.querySelector("#vcrTapeInsertSound"),
  tvPowerButton: document.querySelector(".hotspot-tv-power"),
  tvBloom: document.querySelector(".tv-bloom"),
  tapePlayer: document.querySelector("[data-vhs-player]"),
  tapePlayerControls: document.querySelector("[data-vhs-player-controls]"),
  tapeUnmuteButton: document.querySelector("[data-vhs-unmute]"),
  tapeExpandButton: document.querySelector("[data-vhs-expand]"),
  vcrClock: document.querySelector("#vcrClock"),
  vcrClockHours: document.querySelector(".vcr-clock__hours"),
  vcrClockMinutes: document.querySelector(".vcr-clock__minutes"),
  vcrClockStatus: document.querySelector(".vcr-clock__status"),
  portfolioCategoryItems: document.querySelectorAll(".portfolio-categories__item"),
  portfolioGrid: document.querySelector("[data-portfolio-grid]"),
  videoModal: document.querySelector("[data-video-modal]"),
  videoModalPlayer: document.querySelector("[data-video-modal-player]"),
  videoModalTitle: document.querySelector("#video-modal-title"),
  videoModalNumber: document.querySelector("[data-video-modal-number]"),
  videoModalCloseButtons: document.querySelectorAll("[data-video-modal-close]"),
  galleryModal: document.querySelector("[data-gallery-modal]"),
  galleryModalImage: document.querySelector("[data-gallery-modal-image]"),
  galleryModalTitle: document.querySelector("#gallery-modal-title"),
  galleryModalNumber: document.querySelector("[data-gallery-modal-number]"),
  galleryModalCloseButtons: document.querySelectorAll("[data-gallery-modal-close]"),
  galleryModalPrev: document.querySelector("[data-gallery-modal-prev]"),
  galleryModalNext: document.querySelector("[data-gallery-modal-next]"),
  galleryStage: document.querySelector("[data-gallery-stage]"),
  galleryStrip: document.querySelector("[data-gallery-strip]"),
  galleryProgress: document.querySelector(".gallery-progress"),
  contactForm: document.querySelector("[data-contact-form]"),
  contactStatus: document.querySelector("[data-contact-status]"),
  contactSubmit: document.querySelector("[data-contact-submit]"),
  dynamicPlaceholderField: document.querySelector("[data-dynamic-placeholder]"),
  referenceToggle: document.querySelector("[data-reference-toggle]"),
  referenceField: document.querySelector("[data-reference-field]"),
  referencePanel: document.querySelector("[data-reference-panel]"),
  referenceBox: document.querySelector("[data-reference-box]"),
  referenceInput: document.querySelector("[data-reference-input]"),
  referenceList: document.querySelector("[data-reference-list]")
};

/** Media query shared by mobile-specific interaction systems. */
export const mobileSceneQuery = window.matchMedia("(max-width: 700px)");

/** Returns whether the compact/mobile interaction mode is currently active. */
export const isMobileScene = () => mobileSceneQuery.matches;

/**
 * Identifies modal backdrops whose mobile click behavior differs from desktop.
 *
 * @param {unknown} element Potential event target.
 * @returns {boolean}
 */
export const isModalBackdropElement = (element) => (
  element instanceof HTMLElement
  && (
    element.classList.contains("video-modal__backdrop")
    || element.classList.contains("gallery-modal__backdrop")
  )
);

/** Creates the shared empty-state element used by public media sections. */
export const createEmptyState = (message) => {
  const empty = document.createElement("div");

  empty.className = "media-empty";
  empty.textContent = message;

  return empty;
};

/** Removes a hash without adding a new browser-history entry. */
export const clearLocationHash = () => {
  if (!window.location.hash) return;

  window.history.replaceState(
    null,
    document.title,
    `${window.location.pathname}${window.location.search}`
  );
};

/** Clears section navigation state before the custom scroller takes control. */
export const clearLocationNavigationState = () => {
  if (!window.location.hash && !window.location.search) return;

  window.history.replaceState(null, document.title, window.location.pathname);
};

// Mobile viewport effects ----------------------------------------------------

const mobileViewportEffectClass = "is-mobile-viewport-active";
const mobileViewportEffects = new Map();
let mobileViewportObserver = null;
let mobileViewportRefreshFrame = null;
let isCoreInitialized = false;

/** Applies a registered mobile viewport effect only when its state changes. */
const setMobileViewportEffectActive = (element, isActive) => {
  const effect = mobileViewportEffects.get(element);

  if (!effect) return;

  const nextActive = Boolean(isActive && isMobileScene());

  if (effect.active === nextActive) return;

  effect.active = nextActive;
  element.classList.toggle(mobileViewportEffectClass, nextActive);

  if (nextActive) {
    effect.onEnter?.();
  } else {
    effect.onExit?.();
  }
};

/** Uses the center viewport band as a fallback for mobile focus detection. */
const isElementInMobileFocusBand = (element) => {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const rect = element.getBoundingClientRect();
  const focusTop = viewportHeight * 0.32;
  const focusBottom = viewportHeight * 0.68;

  return rect.bottom >= focusTop && rect.top <= focusBottom;
};

/** Refreshes all registered effects and drops elements removed from the DOM. */
const refreshMobileViewportEffects = () => {
  mobileViewportEffects.forEach((effect, element) => {
    if (!document.contains(element)) {
      mobileViewportObserver?.unobserve(element);
      mobileViewportEffects.delete(element);
      return;
    }

    setMobileViewportEffectActive(element, isElementInMobileFocusBand(element));
  });
};

/** Coalesces scroll and resize work into one animation frame. */
const queueMobileViewportRefresh = () => {
  if (mobileViewportRefreshFrame) return;

  mobileViewportRefreshFrame = window.requestAnimationFrame(() => {
    mobileViewportRefreshFrame = null;
    refreshMobileViewportEffects();
  });
};

/** Lazily creates the observer because some browsers need the fallback path. */
const getMobileViewportObserver = () => {
  if (!("IntersectionObserver" in window)) return null;
  if (mobileViewportObserver) return mobileViewportObserver;

  mobileViewportObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      setMobileViewportEffectActive(entry.target, entry.isIntersecting);
    });
  }, {
    root: null,
    rootMargin: "-32% 0px -32% 0px",
    threshold: 0.01
  });

  return mobileViewportObserver;
};

/**
 * Registers an element whose hover-like effect should follow the mobile viewport.
 *
 * @param {Element} element Element to observe.
 * @param {{onEnter?: Function, onExit?: Function}} callbacks Optional lifecycle hooks.
 */
export const observeMobileViewportEffect = (element, callbacks = {}) => {
  if (!(element instanceof Element)) return;

  mobileViewportEffects.set(element, {
    active: false,
    onEnter: callbacks.onEnter,
    onExit: callbacks.onExit
  });

  getMobileViewportObserver()?.observe(element);
  queueMobileViewportRefresh();
};

/** Unregisters effects for cards about to be removed or re-rendered. */
export const unobserveMobileViewportEffectsWithin = (root) => {
  if (!(root instanceof Element)) return;

  mobileViewportEffects.forEach((effect, element) => {
    if (!root.contains(element)) return;

    setMobileViewportEffectActive(element, false);
    mobileViewportObserver?.unobserve(element);
    mobileViewportEffects.delete(element);
  });
};

// Global initialization ------------------------------------------------------

/**
 * Initializes global behavior shared by public-site features.
 * The guard keeps listeners from being registered twice during future refactors.
 */
export const initCore = () => {
  if (isCoreInitialized) return;

  isCoreInitialized = true;

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  document.querySelectorAll(".team-card").forEach((card) => {
    observeMobileViewportEffect(card);
  });

  window.addEventListener("scroll", queueMobileViewportRefresh, { passive: true });
  window.addEventListener("resize", queueMobileViewportRefresh, { passive: true });

  if (typeof mobileSceneQuery.addEventListener === "function") {
    mobileSceneQuery.addEventListener("change", queueMobileViewportRefresh);
  } else if (typeof mobileSceneQuery.addListener === "function") {
    // Legacy Safari fallback.
    mobileSceneQuery.addListener(queueMobileViewportRefresh);
  }
};
