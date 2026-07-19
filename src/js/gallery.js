/**
 * Public stills gallery: normalized media, full-screen modal, and frame scroller.
 */

import {
  getSupabaseImagePreviewUrl,
  setImageSourceWithFallback
} from "./api.js";
import {
  createEmptyState,
  dom,
  isMobileScene,
  isModalBackdropElement,
  observeMobileViewportEffect,
  unobserveMobileViewportEffectsWithin
} from "./core.js";

const {
  galleryModal,
  galleryModalImage,
  galleryModalTitle,
  galleryModalNumber,
  galleryModalCloseButtons,
  galleryModalPrev,
  galleryModalNext,
  galleryStage,
  galleryStrip,
  galleryProgress
} = dom;

// Modal and render-session state. Desktop scroller state stays local to its setup.
let galleryModalItems = [];
let activeGalleryModalIndex = 0;
let galleryModalRestoreFocus = null;
let galleryModalSwipeStart = null;
let didSwipeGalleryModal = false;
let isGalleryInitialized = false;
let galleryModalReleaseCleanup = null;
let galleryFocusRestoreCleanup = null;

// Data normalization and thumbnail rendering --------------------------------

/** Converts stored focal coordinates into a safe percentage. */
const normalizeGalleryFocusValue = (value) => {
  const number = Number.parseFloat(value);

  if (!Number.isFinite(number)) return 50;

  return Math.max(0, Math.min(100, Math.round(number)));
};

/** Returns the normalized focal point used by thumbnails and the modal image. */
const getGalleryFocus = (item = {}) => ({
  x: normalizeGalleryFocusValue(item.focus_x),
  y: normalizeGalleryFocusValue(item.focus_y)
});

/** Normalizes one Supabase row for both the thumbnail and full-screen modal. */
const createGalleryViewItem = (item) => {
  const fullSrc = String(item.image_url || "").trim();

  if (!fullSrc) return null;

  const title = item.title || item.file_name || "Gallery image";

  return {
    alt: item.alt_text || title,
    focus: getGalleryFocus(item),
    fullSrc,
    modalSrc: getSupabaseImagePreviewUrl(fullSrc, { width: 2200, quality: 100 }),
    thumbnailSrc: getSupabaseImagePreviewUrl(fullSrc, { width: 1600, quality: 100 }),
    title
  };
};

/** Builds one accessible, lazy-loaded gallery card. */
const createGalleryItem = (item, index = 0) => {
  const link = document.createElement("a");
  const image = document.createElement("img");
  const previewWidth = 1600;
  const previewHeight = Math.round((previewWidth * 9) / 17);

  link.className = "gallery-strip__item";
  link.href = item.fullSrc;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.dataset.galleryIndex = String(index);
  link.setAttribute("aria-label", item.title);

  image.dataset.src = item.thumbnailSrc;
  image.dataset.fallbackSrc = item.fullSrc;
  image.alt = item.alt;
  image.loading = "lazy";
  image.decoding = "async";
  image.width = previewWidth;
  image.height = previewHeight;
  image.style.setProperty("--gallery-focus-x", `${item.focus.x}%`);
  image.style.setProperty("--gallery-focus-y", `${item.focus.y}%`);

  link.append(image);
  observeMobileViewportEffect(link);
  link.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    openGalleryModal(index, link);
  });

  return link;
};

/** Promotes a card's deferred data-src into a real image request. */
const loadGalleryImage = (item) => {
  const image = item.querySelector("img[data-src]");

  if (!image) return;

  setImageSourceWithFallback(image, image.dataset.src, image.dataset.fallbackSrc);
  image.removeAttribute("data-src");
};

/** Renders the gallery strip and refreshes the modal data source. */
export const renderGallery = (items) => {
  if (!galleryStrip || !galleryStage) return;

  unobserveMobileViewportEffectsWithin(galleryStage);

  const galleryItems = items.map(createGalleryViewItem).filter(Boolean);

  galleryModalItems = galleryItems;
  galleryStrip.replaceChildren();

  galleryItems.forEach((item, index) => {
    galleryStrip.append(createGalleryItem(item, index));
  });

  if (!galleryItems.length) {
    galleryStrip.append(createEmptyState("No gallery uploads yet"));
    galleryProgress?.toggleAttribute("hidden", true);
  }
};

// Full-screen modal lifecycle ------------------------------------------------

/** Reports whether the gallery modal currently owns page interaction. */
export const isGalleryModalOpen = () => Boolean(galleryModal?.classList.contains("is-open"));

/** Cancels a deferred image release when the modal is opened again mid-transition. */
const cancelGalleryModalImageRelease = () => {
  galleryModalReleaseCleanup?.();
  galleryModalReleaseCleanup = null;
};

/** Keeps the image mounted during fade-out, then releases it once the modal is invisible. */
const scheduleGalleryModalImageRelease = () => {
  if (!galleryModal || !galleryModalImage) return;

  cancelGalleryModalImageRelease();

  let fallbackTimer;

  /** Detaches both completion paths once either one releases the image. */
  const cleanup = () => {
    galleryModal.removeEventListener("transitionend", handleTransitionEnd);
    window.clearTimeout(fallbackTimer);
  };
  /** Drops the source only if the modal was not reopened during fade-out. */
  const releaseImage = () => {
    cleanup();

    if (galleryModalReleaseCleanup === cleanup) {
      galleryModalReleaseCleanup = null;
    }

    if (isGalleryModalOpen()) return;

    galleryModalImage.removeAttribute("src");
    galleryModalImage.removeAttribute("alt");
  };
  /** Uses the real opacity transition as the preferred release signal. */
  const handleTransitionEnd = (event) => {
    if (event.target === galleryModal && event.propertyName === "opacity") {
      releaseImage();
    }
  };

  galleryModal.addEventListener("transitionend", handleTransitionEnd);
  fallbackTimer = window.setTimeout(releaseImage, 320);
  galleryModalReleaseCleanup = cleanup;
};

/** Hides pointer-restored focus styling until keyboard navigation resumes. */
const suppressPointerRestoredFocus = (focusTarget) => {
  galleryFocusRestoreCleanup?.();

  const suppressionClass = "is-pointer-focus-restored";
  /** Restores normal focus styling on the next keyboard, pointer, or blur event. */
  const cleanup = () => {
    focusTarget.classList.remove(suppressionClass);
    focusTarget.removeEventListener("blur", cleanup);
    document.removeEventListener("keydown", cleanup, true);
    document.removeEventListener("pointerdown", cleanup, true);

    if (galleryFocusRestoreCleanup === cleanup) {
      galleryFocusRestoreCleanup = null;
    }
  };

  focusTarget.classList.add(suppressionClass);
  focusTarget.addEventListener("blur", cleanup);
  document.addEventListener("keydown", cleanup, true);
  document.addEventListener("pointerdown", cleanup, true);
  galleryFocusRestoreCleanup = cleanup;
};

/** Synchronizes the modal image, caption, counter, and navigation controls. */
const renderGalleryModalItem = () => {
  if (!galleryModal || !galleryModalImage || !galleryModalItems.length) return;

  const item = galleryModalItems[activeGalleryModalIndex];

  if (!item) return;

  galleryModalImage.removeAttribute("src");
  galleryModalImage.alt = item.alt;
  galleryModalImage.style.setProperty("--gallery-focus-x", `${item.focus.x}%`);
  galleryModalImage.style.setProperty("--gallery-focus-y", `${item.focus.y}%`);
  setImageSourceWithFallback(galleryModalImage, item.modalSrc, item.fullSrc);

  if (galleryModalTitle) {
    galleryModalTitle.textContent = item.title;
  }

  if (galleryModalNumber) {
    galleryModalNumber.textContent = String(activeGalleryModalIndex + 1).padStart(2, "0");
  }

  const hasMultipleItems = galleryModalItems.length > 1;

  galleryModalPrev?.toggleAttribute("hidden", !hasMultipleItems);
  galleryModalNext?.toggleAttribute("hidden", !hasMultipleItems);
};

/** Opens a gallery item and remembers the element that should regain focus. */
const openGalleryModal = (index = 0, trigger = null) => {
  if (!galleryModal || !galleryModalItems.length) return false;

  cancelGalleryModalImageRelease();
  galleryFocusRestoreCleanup?.();
  activeGalleryModalIndex = Math.max(0, Math.min(index, galleryModalItems.length - 1));
  galleryModalRestoreFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
  renderGalleryModalItem();
  galleryModal.classList.add("is-open");
  galleryModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-gallery-modal-open");

  window.requestAnimationFrame(() => {
    galleryModal.querySelector(".gallery-modal__close")?.focus({ preventScroll: true });
  });

  return true;
};

/** Closes the modal, releases its image after fade-out, and restores keyboard focus. */
const closeGalleryModal = ({ showRestoredFocus = true } = {}) => {
  if (!galleryModal) return;

  galleryModal.classList.remove("is-open");
  galleryModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-gallery-modal-open");

  scheduleGalleryModalImageRelease();

  const focusTarget = galleryModalRestoreFocus;

  galleryModalRestoreFocus = null;

  if (focusTarget instanceof HTMLElement && document.contains(focusTarget)) {
    if (!showRestoredFocus) {
      suppressPointerRestoredFocus(focusTarget);
    }

    focusTarget.focus({ preventScroll: true });
  }
};

/** Moves cyclically through modal items in the requested direction. */
const moveGalleryModal = (direction) => {
  if (!galleryModalItems.length) return;

  activeGalleryModalIndex = (
    activeGalleryModalIndex + direction + galleryModalItems.length
  ) % galleryModalItems.length;
  renderGalleryModalItem();
};

/** Detects clicks in letterboxed space around the rendered object-contain image. */
const isPointOutsideRenderedGalleryImage = (event) => {
  if (!galleryModalImage?.naturalWidth || !galleryModalImage.naturalHeight) return false;

  const rect = galleryModalImage.getBoundingClientRect();
  const imageRatio = galleryModalImage.naturalWidth / galleryModalImage.naturalHeight;
  const frameRatio = rect.width / rect.height;
  let renderedWidth = rect.width;
  let renderedHeight = rect.height;

  if (imageRatio > frameRatio) {
    renderedHeight = rect.width / imageRatio;
  } else {
    renderedWidth = rect.height * imageRatio;
  }

  const renderedLeft = rect.left + (rect.width - renderedWidth) / 2;
  const renderedTop = rect.top + (rect.height - renderedHeight) / 2;

  return (
    event.clientX < renderedLeft
    || event.clientX > renderedLeft + renderedWidth
    || event.clientY < renderedTop
    || event.clientY > renderedTop + renderedHeight
  );
};

// Modal input and accessibility ----------------------------------------------

/** Registers close, navigation, swipe, keyboard, and focus behavior. */
const initGalleryModalEvents = () => {
  galleryModalCloseButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      if (isModalBackdropElement(event.currentTarget) && !isMobileScene()) return;

      closeGalleryModal({ showRestoredFocus: event.detail === 0 });
    });
  });

  galleryModalPrev?.addEventListener("click", () => moveGalleryModal(-1));
  galleryModalNext?.addEventListener("click", () => moveGalleryModal(1));

  galleryModal?.addEventListener("click", (event) => {
    if (!isMobileScene() || !isGalleryModalOpen() || didSwipeGalleryModal) return;

    const target = event.target;

    if (
      target === galleryModal
      || target instanceof HTMLElement && (
        isModalBackdropElement(target)
        || (
          (target.classList.contains("gallery-modal__figure") || target === galleryModalImage)
          && isPointOutsideRenderedGalleryImage(event)
        )
      )
    ) {
      closeGalleryModal({ showRestoredFocus: false });
    }
  });

  galleryModal?.addEventListener("pointerdown", (event) => {
    if (!isMobileScene() || !isGalleryModalOpen() || event.pointerType === "mouse") return;
    if (event.target instanceof Element && event.target.closest("button")) return;

    galleryModalSwipeStart = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };
    didSwipeGalleryModal = false;
  });

  galleryModal?.addEventListener("pointerup", (event) => {
    if (!galleryModalSwipeStart || galleryModalSwipeStart.id !== event.pointerId) return;

    const deltaX = event.clientX - galleryModalSwipeStart.x;
    const deltaY = event.clientY - galleryModalSwipeStart.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    galleryModalSwipeStart = null;

    if (absX < 48 || absX < absY * 1.2) return;

    didSwipeGalleryModal = true;
    moveGalleryModal(deltaX > 0 ? -1 : 1);
    window.setTimeout(() => {
      didSwipeGalleryModal = false;
    }, 260);
  });

  galleryModal?.addEventListener("pointercancel", () => {
    galleryModalSwipeStart = null;
  });

  // Keep keyboard navigation and focus contained while the gallery modal is open.
  document.addEventListener("keydown", (event) => {
    if (!isGalleryModalOpen()) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeGalleryModal();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveGalleryModal(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveGalleryModal(1);
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.from(
      galleryModal?.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])") || []
    ).filter((element) => (
      !element.hasAttribute("disabled")
      && !element.hasAttribute("hidden")
      && element.tabIndex >= 0
    ));

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  });

  document.addEventListener("focusin", (event) => {
    if (!isGalleryModalOpen() || !galleryModal) return;
    if (event.target instanceof Node && galleryModal.contains(event.target)) return;

    galleryModal.querySelector(".gallery-modal__close")?.focus({ preventScroll: true });
  });
};

/** Registers gallery modal interactions once; rendering remains data-driven. */
export const initGallery = () => {
  if (isGalleryInitialized) return;

  isGalleryInitialized = true;
  initGalleryModalEvents();
};

// Desktop frame scroller -----------------------------------------------------

/** Initializes the desktop frame scroller after gallery cards have been rendered. */
export const setupGalleryScroller = () => {
  if (!galleryStrip || !galleryProgress) return;

  const galleryProgressThumb = galleryProgress.querySelector(".gallery-progress__thumb");
  const galleryItems = Array.from(galleryStrip.querySelectorAll(".gallery-strip__item"));
  const visibleCount = Math.max(1, Number.parseInt(galleryStrip.dataset.visibleCount || "5", 10));
  const maxFrame = Math.max(0, galleryItems.length - visibleCount);
  const frameMedia = window.matchMedia("(min-width: 701px)");
  const wheelThreshold = 80;
  const wheelCooldown = 140;
  let activeFrame = 0;
  let progressPointerId = null;
  let wheelAccumulator = 0;
  let wheelDirection = 0;
  let wheelLocked = false;
  let wheelUnlockTimer;

  /** Constrains a requested frame to the current gallery range. */
  const clampGalleryFrame = (frame) => Math.max(0, Math.min(frame, maxFrame));
  /** Enables frame mode only on desktop when the strip overflows. */
  const shouldUseGalleryFrames = () => frameMedia.matches && maxFrame > 0;

  /** Updates screen-reader range information for the custom progress control. */
  const updateGalleryProgressA11y = () => {
    galleryProgress.setAttribute("aria-valuemax", String(maxFrame));
    galleryProgress.setAttribute("aria-valuenow", String(activeFrame));
    galleryProgress.setAttribute("aria-valuetext", `${activeFrame + 1} of ${maxFrame + 1}`);
  };

  /** Sizes the progress thumb according to the visible share of the strip. */
  const updateGalleryProgressThumb = () => {
    const thumbRatio = galleryItems.length
      ? Math.max(0.12, Math.min(visibleCount / galleryItems.length, 1))
      : 1;

    galleryProgress.style.setProperty("--gallery-progress-size", `${thumbRatio * 100}%`);
  };

  /** Applies one logical frame and preloads its neighboring cards. */
  const renderGalleryFrame = (frame = activeFrame) => {
    const shouldUseFrameMode = shouldUseGalleryFrames();

    activeFrame = clampGalleryFrame(frame);
    galleryProgress.toggleAttribute("hidden", !shouldUseFrameMode);
    galleryProgress.style.setProperty(
      "--gallery-progress",
      String(maxFrame > 0 ? activeFrame / maxFrame : 0)
    );
    updateGalleryProgressThumb();
    updateGalleryProgressA11y();

    galleryItems.forEach((item, index) => {
      const isVisible = !shouldUseFrameMode || (index >= activeFrame && index < activeFrame + visibleCount);
      const shouldPreload = !shouldUseFrameMode || (index >= activeFrame - 1 && index < activeFrame + visibleCount + 1);

      if (shouldPreload) {
        loadGalleryImage(item);
      }

      item.hidden = !isVisible;
      item.setAttribute("aria-hidden", String(!isVisible));
    });
  };

  /** Converts a pointer position on the progress track into a frame index. */
  const getGalleryFrameFromProgress = (clientX) => {
    const progressRect = galleryProgress.getBoundingClientRect();
    const thumbWidth = galleryProgressThumb?.getBoundingClientRect().width || 0;
    const range = Math.max(1, progressRect.width - thumbWidth);
    const minX = progressRect.left + thumbWidth / 2;
    const progress = Math.max(0, Math.min((clientX - minX) / range, 1));

    return clampGalleryFrame(Math.round(progress * maxFrame));
  };

  /** Toggles the short CSS transition state while visible cards are replaced. */
  const setGallerySwitching = (isSwitching) => {
    galleryStrip.classList.toggle("is-switching", isSwitching);
  };

  /** Switches frames and removes the transition class after the browser paints. */
  const switchGalleryFrame = (frame) => {
    const nextFrame = clampGalleryFrame(frame);

    if (nextFrame === activeFrame) return;

    setGallerySwitching(true);
    renderGalleryFrame(nextFrame);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setGallerySwitching(false);
      });
    });
  };

  /** Checks whether another frame exists in the requested direction. */
  const canMoveGallery = (direction) => (
    direction > 0 ? activeFrame < maxFrame : activeFrame > 0
  );

  /** Releases the wheel cooldown after one deliberate frame movement. */
  const queueWheelUnlock = () => {
    window.clearTimeout(wheelUnlockTimer);

    wheelUnlockTimer = window.setTimeout(() => {
      wheelLocked = false;
      wheelAccumulator = 0;
      wheelDirection = 0;
    }, wheelCooldown);
  };

  /** Normalizes horizontal and vertical wheel devices to pixel-like units. */
  const getGalleryWheelDelta = (event) => {
    const rawDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

    if (event.deltaMode === 1) return rawDelta * 16;
    if (event.deltaMode === 2) return rawDelta * window.innerWidth;

    return rawDelta;
  };

  /** Accumulates intentional wheel input before advancing a desktop frame. */
  const handleGalleryWheel = (event) => {
    if (!shouldUseGalleryFrames()) return;

    const delta = getGalleryWheelDelta(event);

    if (delta === 0) return;

    const direction = delta > 0 ? 1 : -1;

    if (!canMoveGallery(direction)) {
      wheelAccumulator = 0;
      wheelDirection = 0;
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (wheelLocked) return;

    if (wheelDirection !== direction) {
      wheelDirection = direction;
      wheelAccumulator = 0;
    }

    wheelAccumulator += Math.abs(delta);

    if (wheelAccumulator < wheelThreshold) return;

    switchGalleryFrame(activeFrame + direction);
    wheelAccumulator = 0;
    wheelLocked = true;
    queueWheelUnlock();
  };

  /** Updates the frame while the custom progress thumb is being dragged. */
  const renderGalleryFromProgressPointer = (event) => {
    if (!shouldUseGalleryFrames()) return;

    event.preventDefault();
    event.stopPropagation();
    switchGalleryFrame(getGalleryFrameFromProgress(event.clientX));
  };

  /** Ends pointer capture and clears the global progress-dragging state. */
  const stopGalleryProgressDrag = (event) => {
    if (progressPointerId === null || progressPointerId !== event.pointerId) return;

    if (typeof galleryProgress.hasPointerCapture === "function" && galleryProgress.hasPointerCapture(event.pointerId)) {
      galleryProgress.releasePointerCapture(event.pointerId);
    }

    progressPointerId = null;
    galleryProgress.classList.remove("is-dragging");
    document.body.classList.remove("is-gallery-progress-dragging");
  };

  galleryStrip.addEventListener("wheel", handleGalleryWheel, { passive: false });

  galleryProgress.addEventListener("pointerdown", (event) => {
    if (!shouldUseGalleryFrames() || (event.pointerType === "mouse" && event.button !== 0)) return;

    progressPointerId = event.pointerId;
    galleryProgress.classList.add("is-dragging");
    document.body.classList.add("is-gallery-progress-dragging");
    galleryProgress.setPointerCapture?.(event.pointerId);
    renderGalleryFromProgressPointer(event);
  });

  galleryProgress.addEventListener("pointermove", (event) => {
    if (progressPointerId !== event.pointerId) return;

    renderGalleryFromProgressPointer(event);
  });

  galleryProgress.addEventListener("pointerup", stopGalleryProgressDrag);
  galleryProgress.addEventListener("pointercancel", stopGalleryProgressDrag);

  galleryProgress.addEventListener("keydown", (event) => {
    if (!shouldUseGalleryFrames()) return;

    let nextFrame = activeFrame;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextFrame = activeFrame - 1;
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextFrame = activeFrame + 1;
    } else if (event.key === "Home") {
      nextFrame = 0;
    } else if (event.key === "End") {
      nextFrame = maxFrame;
    } else {
      return;
    }

    event.preventDefault();
    switchGalleryFrame(nextFrame);
  });

  if (typeof frameMedia.addEventListener === "function") {
    frameMedia.addEventListener("change", () => renderGalleryFrame());
  } else if (typeof frameMedia.addListener === "function") {
    frameMedia.addListener(() => renderGalleryFrame());
  }

  window.addEventListener("resize", () => renderGalleryFrame(), { passive: true });
  renderGalleryFrame(0);
};
