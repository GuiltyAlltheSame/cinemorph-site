/**
 * Portfolio feature: Vimeo URL/player helpers, shared video modal, and previews.
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
  portfolioCategoryItems,
  portfolioGrid,
  videoModal,
  videoModalPlayer,
  videoModalTitle,
  videoModalNumber,
  videoModalCloseButtons
} = dom;

// Shared modal state and the callback injected by the gallery feature.
let isPortfolioInitialized = false;
let isGalleryModalOpenCallback = () => false;
let videoModalRestoreFocus = null;
let modalVimeoPlayer = null;
let modalPlaybackTime = 0;
let modalCloseCallback = null;

// Vimeo URL and Player helpers ------------------------------------------------

/** Normalizes a Vimeo identifier into the external project link. */
const getPortfolioHref = (url) => {
  const cleanUrl = String(url || "").trim();

  if (!cleanUrl) return "";
  if (/^https?:\/\//i.test(cleanUrl)) return cleanUrl;

  return `https://vimeo.com/${cleanUrl.replace(/^\/+/, "").split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
};

/**
 * Converts public, private, manage, and player Vimeo URLs to one safe embed URL.
 * Options control inline VHS playback without duplicating URL parsing elsewhere.
 */
export const getVimeoEmbedSrc = (url, options = {}) => {
  const cleanUrl = String(url || "").trim();

  if (!cleanUrl) return "";

  const source = /^https?:\/\//i.test(cleanUrl)
    ? cleanUrl
    : /^(?:www\.)?(?:vimeo\.com|player\.vimeo\.com)\//i.test(cleanUrl)
      ? `https://${cleanUrl}`
      : `https://vimeo.com/${cleanUrl.replace(/^\/+/, "")}`;

  try {
    const parsedUrl = new URL(source);
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    const isVimeoHost = host === "vimeo.com" || host === "player.vimeo.com";

    if (!isVimeoHost) return "";

    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    let videoId = "";
    let videoIndex = -1;

    if (host === "player.vimeo.com") {
      const videoSegmentIndex = segments.indexOf("video");

      if (/^\d+$/.test(segments[videoSegmentIndex + 1] || "")) {
        videoId = segments[videoSegmentIndex + 1];
        videoIndex = videoSegmentIndex + 1;
      }
    }

    if (!videoId && host === "vimeo.com") {
      const manageVideosIndex = segments.findIndex((segment, index) => (
        segment === "manage" && segments[index + 1] === "videos"
      ));
      const videoSegmentIndex = segments.indexOf("video");

      if (manageVideosIndex >= 0 && /^\d+$/.test(segments[manageVideosIndex + 2] || "")) {
        videoId = segments[manageVideosIndex + 2];
        videoIndex = manageVideosIndex + 2;
      } else if (videoSegmentIndex >= 0 && /^\d+$/.test(segments[videoSegmentIndex + 1] || "")) {
        videoId = segments[videoSegmentIndex + 1];
        videoIndex = videoSegmentIndex + 1;
      }
    }

    if (!videoId) {
      videoIndex = segments.findIndex((segment) => /^\d+$/.test(segment));
      videoId = videoIndex >= 0 ? segments[videoIndex] : "";
    }

    if (!videoId) return "";

    const nextSegment = segments[videoIndex + 1] || "";
    const reservedSegments = ["comments", "privacy", "review", "settings"];
    const pathHash = /^[a-z0-9]+$/i.test(nextSegment) && !reservedSegments.includes(nextSegment.toLowerCase())
      ? nextSegment
      : "";
    const privateHash = parsedUrl.searchParams.get("h") || pathHash;
    const embedUrl = new URL(`https://player.vimeo.com/video/${videoId}`);

    if (privateHash) {
      embedUrl.searchParams.set("h", privateHash);
    }

    embedUrl.searchParams.set("autoplay", "1");
    if (options.muted) {
      embedUrl.searchParams.set("muted", "1");
    }
    if (options.controls === false) {
      embedUrl.searchParams.set("controls", "0");
    }
    if (options.api) {
      embedUrl.searchParams.set("api", "1");
      embedUrl.searchParams.set("player_id", options.playerId || "vhs-tv-player");
    }
    if (Number.isFinite(Number(options.startTime)) && Number(options.startTime) > 0) {
      embedUrl.hash = `t=${Math.floor(Number(options.startTime))}s`;
    }
    embedUrl.searchParams.set("playsinline", "1");
    embedUrl.searchParams.set("title", "0");
    embedUrl.searchParams.set("byline", "0");
    embedUrl.searchParams.set("portrait", "0");
    embedUrl.searchParams.set("autopause", "0");
    embedUrl.searchParams.set("dnt", "1");

    return embedUrl.toString();
  } catch {
    return "";
  }
};

/** Returns the external Vimeo Player constructor when its deferred script is ready. */
const getVimeoPlayerApi = () => window.Vimeo?.Player || null;

/** Creates a Vimeo Player instance without allowing API failures to break the UI. */
export const createVimeoPlayer = (iframe) => {
  const Player = getVimeoPlayerApi();

  if (!Player || !iframe) return null;

  try {
    return new Player(iframe);
  } catch (error) {
    console.warn("Vimeo player could not initialize:", error);
    return null;
  }
};

/** Converts an unknown playback value into a non-negative finite number. */
export const getSafePlaybackTime = (value) => {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : 0;
};

/** Adds a Vimeo time fragment while preserving all embed query parameters. */
export const addVimeoStartHash = (src, seconds) => {
  const time = getSafePlaybackTime(seconds);

  if (!src || time <= 0.05) return src;

  try {
    const url = new URL(src);

    url.hash = `t=${Math.floor(time)}s`;
    return url.toString();
  } catch {
    return src;
  }
};

/** Reads current Vimeo time and falls back safely if the player is unavailable. */
export const getVimeoPlayerTime = async (player, fallback = 0) => {
  if (!player || typeof player.getCurrentTime !== "function") return getSafePlaybackTime(fallback);

  try {
    return getSafePlaybackTime(await player.getCurrentTime());
  } catch {
    return getSafePlaybackTime(fallback);
  }
};

/** Seeks a Vimeo player when a meaningful playback position is available. */
export const setVimeoPlayerTime = async (player, seconds) => {
  const time = getSafePlaybackTime(seconds);

  if (!player || typeof player.setCurrentTime !== "function" || time <= 0.05) return;

  try {
    await player.setCurrentTime(time);
  } catch (error) {
    console.warn("Vimeo player seek failed:", error);
  }
};

// Shared portfolio/VHS modal -------------------------------------------------

/** Reports whether the shared portfolio/VHS video modal is active. */
export const isVideoModalOpen = () => Boolean(videoModal?.classList.contains("is-open"));

/** Returns enabled elements used by the video modal focus trap. */
const getVideoModalFocusableElements = () => {
  if (!videoModal) return [];

  return Array.from(
    videoModal.querySelectorAll(
      "button, iframe, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    )
  ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);
};

/** Clears modal playback state after close or before a new player is attached. */
const resetVideoModalPlayback = () => {
  modalVimeoPlayer = null;
  modalPlaybackTime = 0;
  modalCloseCallback = null;
};

/**
 * Closes the modal and returns its final playback time to an optional owner.
 * VHS uses the callback to resume its inline player without portfolio coupling.
 */
const closePortfolioVideoModal = async () => {
  if (!videoModal) return;

  const finalPlaybackTime = modalVimeoPlayer
    ? await getVimeoPlayerTime(modalVimeoPlayer, modalPlaybackTime)
    : modalPlaybackTime;
  const onClose = modalCloseCallback;

  resetVideoModalPlayback();
  videoModal.classList.remove("is-open");
  videoModal.setAttribute("aria-hidden", "true");
  videoModalPlayer?.replaceChildren();
  document.body.classList.remove("is-video-modal-open");

  const focusTarget = videoModalRestoreFocus;

  videoModalRestoreFocus = null;

  if (focusTarget instanceof HTMLElement && document.contains(focusTarget)) {
    focusTarget.focus({ preventScroll: true });
  }

  if (onClose) {
    try {
      await onClose(finalPlaybackTime);
    } catch (error) {
      console.warn("Video modal close callback failed:", error);
    }
  }
};

/**
 * Opens either a regular portfolio video or a playback-synchronized VHS video.
 *
 * @param {object} options Modal content and optional playback bridge.
 * @returns {boolean} Whether the modal was opened.
 */
export const openPortfolioVideoModal = ({
  title,
  embedSrc,
  trigger,
  number,
  syncPlayback = false,
  startTime = 0,
  onClose = null
}) => {
  if (!videoModal || !videoModalPlayer || !embedSrc) return false;

  const iframe = document.createElement("iframe");
  const modalStartTime = getSafePlaybackTime(startTime);

  iframe.title = title || "Portfolio video";
  iframe.src = embedSrc;
  iframe.allow = "autoplay; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.loading = "eager";

  videoModalRestoreFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;

  if (videoModalTitle) {
    videoModalTitle.textContent = title || "Portfolio video";
  }

  if (videoModalNumber) {
    videoModalNumber.textContent = String(number || 1).padStart(2, "0");
  }

  videoModalPlayer.replaceChildren(iframe);
  videoModal.classList.add("is-open");
  videoModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-video-modal-open");

  resetVideoModalPlayback();
  modalPlaybackTime = modalStartTime;
  modalCloseCallback = typeof onClose === "function" ? onClose : null;

  if (syncPlayback) {
    modalVimeoPlayer = createVimeoPlayer(iframe);

    if (modalVimeoPlayer) {
      const modalPlayerReady = modalVimeoPlayer.ready?.() || Promise.resolve();

      modalPlayerReady
        .then(async () => {
          await setVimeoPlayerTime(modalVimeoPlayer, modalStartTime);
          await modalVimeoPlayer.play?.();
        })
        .catch(() => {});
      modalVimeoPlayer.on?.("timeupdate", (data) => {
        modalPlaybackTime = getSafePlaybackTime(data?.seconds);
      });
    }
  }

  window.requestAnimationFrame(() => {
    videoModal.querySelector(".video-modal__close")?.focus({ preventScroll: true });
  });

  return true;
};

/** Registers modal pointer, keyboard, and focus behavior once. */
const initVideoModalEvents = () => {
  videoModalCloseButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      if (isModalBackdropElement(event.currentTarget) && !isMobileScene()) return;

      closePortfolioVideoModal();
    });
  });

  videoModal?.addEventListener("click", (event) => {
    if (!isMobileScene() || !isVideoModalOpen()) return;

    const target = event.target;

    if (target === videoModal || isModalBackdropElement(target)) {
      closePortfolioVideoModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (isGalleryModalOpenCallback() || !isVideoModalOpen()) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closePortfolioVideoModal();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = getVideoModalFocusableElements();

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
    if (isGalleryModalOpenCallback() || !isVideoModalOpen() || !videoModal) return;
    if (event.target instanceof Node && videoModal.contains(event.target)) return;

    videoModal.querySelector(".video-modal__close")?.focus({ preventScroll: true });
  });
};

// Portfolio controls, previews, and cards ------------------------------------

/** Registers category buttons used by the current portfolio presentation. */
const initPortfolioCategories = () => {
  portfolioCategoryItems.forEach((item) => {
    item.addEventListener("click", () => {
      portfolioCategoryItems.forEach((categoryItem) => {
        const isSelected = categoryItem === item;

        categoryItem.classList.toggle("is-active", isSelected);
        categoryItem.setAttribute("aria-pressed", String(isSelected));
      });
    });
  });
};

const previewFadeDuration = 490;
const stopTimers = new WeakMap();

/** Selects the first compatible MP4 preview field from a portfolio row. */
const getVideoPreviewMp4Url = (video = {}) => String(
  video.preview_mp4_url
  || video.preview_video_url
  || video.thumbnail_mp4_url
  || ""
).trim();

/** Lazily attaches an MP4 or GIF preview to desktop hover and mobile viewport state. */
const setupPortfolioPreview = (card, thumb, { mp4Src = "", gifSrc = "" } = {}) => {
  let playPreview = null;
  let pausePreview = null;

  if (mp4Src) {
    const video = document.createElement("video");

    video.className = "portfolio-preview";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.setAttribute("aria-hidden", "true");
    thumb.append(video);

    /** Loads and reveals the MP4 only when the card becomes active. */
    playPreview = () => {
      window.clearTimeout(stopTimers.get(video));

      if (!video.getAttribute("src")) {
        video.setAttribute("src", mp4Src);
        video.load();
      }

      video.play().catch(() => {});

      window.requestAnimationFrame(() => {
        video.classList.add("is-playing");
      });
    };

    /** Pauses and releases the MP4 source after its CSS fade completes. */
    pausePreview = () => {
      video.classList.remove("is-playing");
      video.pause();

      const timer = window.setTimeout(() => {
        video.removeAttribute("src");
        video.load();
      }, previewFadeDuration);

      stopTimers.set(video, timer);
    };
  } else if (gifSrc) {
    const image = document.createElement("img");

    image.className = "portfolio-preview portfolio-preview--gif";
    image.alt = "";
    image.decoding = "async";
    thumb.append(image);

    /** Loads and reveals the GIF only while the card is active. */
    playPreview = () => {
      window.clearTimeout(stopTimers.get(image));

      if (!image.getAttribute("src")) {
        image.setAttribute("src", gifSrc);
      }

      window.requestAnimationFrame(() => {
        image.classList.add("is-playing");
      });
    };

    /** Releases the GIF source after its CSS fade completes. */
    pausePreview = () => {
      image.classList.remove("is-playing");

      const timer = window.setTimeout(() => {
        image.removeAttribute("src");
      }, previewFadeDuration);

      stopTimers.set(image, timer);
    };
  }

  if (playPreview && pausePreview) {
    /** Prevents pointer/focus events from starting previews in mobile mode. */
    const playPreviewOnDesktop = () => {
      if (!isMobileScene()) playPreview();
    };
    /** Stops desktop previews without interfering with mobile viewport callbacks. */
    const pausePreviewOnDesktop = () => {
      if (!isMobileScene()) pausePreview();
    };

    card.addEventListener("pointerenter", playPreviewOnDesktop);
    card.addEventListener("pointerleave", pausePreviewOnDesktop);
    card.addEventListener("focusin", playPreviewOnDesktop);
    card.addEventListener("focusout", pausePreviewOnDesktop);
  }

  observeMobileViewportEffect(card, {
    onEnter: playPreview,
    onExit: pausePreview
  });
};

/** Renders portfolio cards and wires modal/preview behavior for each video row. */
export const renderPortfolio = (videos) => {
  if (!portfolioGrid) return;

  unobserveMobileViewportEffectsWithin(portfolioGrid);
  portfolioGrid.replaceChildren();
  portfolioGrid.classList.toggle("is-empty", !videos.length);

  if (!videos.length) {
    portfolioGrid.append(createEmptyState("No portfolio uploads yet"));
    return;
  }

  videos.forEach((video, index) => {
    const card = document.createElement("article");
    const body = document.createElement("div");
    const title = document.createElement("h3");
    const thumb = document.createElement(video.vimeo_url ? "a" : "div");
    const posterUrl = String(video.poster_url || "").trim();
    const previewMp4Url = getVideoPreviewMp4Url(video);
    const gifUrl = String(video.thumbnail_gif_url || "").trim();
    const projectTitle = video.title || "Untitled project";
    const href = getPortfolioHref(video.vimeo_url);
    const embedSrc = getVimeoEmbedSrc(video.vimeo_url);

    card.className = video.featured ? "card card--feature" : "card";
    body.className = "card__body";
    title.textContent = projectTitle;
    thumb.className = "ph-thumb";

    if (href && thumb instanceof HTMLAnchorElement) {
      thumb.href = href;
      thumb.target = "_blank";
      thumb.rel = "noreferrer";
      thumb.setAttribute("aria-label", projectTitle);

      if (embedSrc) {
        thumb.setAttribute("aria-haspopup", "dialog");
        thumb.addEventListener("click", (event) => {
          event.preventDefault();
          openPortfolioVideoModal({
            title: projectTitle,
            embedSrc,
            trigger: thumb,
            number: index + 1
          });
        });
      }
    }

    if (posterUrl) {
      const poster = document.createElement("img");
      const posterPreviewUrl = getSupabaseImagePreviewUrl(posterUrl, {
        width: video.featured ? 1600 : 900,
        quality: 100
      });

      poster.className = "portfolio-poster";
      poster.alt = projectTitle;
      poster.loading = "lazy";
      poster.decoding = "async";
      thumb.append(poster);
      setImageSourceWithFallback(poster, posterPreviewUrl, posterUrl);
    } else {
      thumb.classList.add("ph-thumb--empty");
    }

    setupPortfolioPreview(card, thumb, {
      mp4Src: previewMp4Url,
      gifSrc: gifUrl
    });
    body.append(title);
    card.append(body, thumb);
    portfolioGrid.append(card);
  });
};

// Public initialization ------------------------------------------------------

/**
 * Initializes portfolio controls and modal behavior once.
 *
 * @param {{isGalleryModalOpen?: Function}} dependencies Cross-modal guard.
 */
export const initPortfolio = ({ isGalleryModalOpen = () => false } = {}) => {
  isGalleryModalOpenCallback = typeof isGalleryModalOpen === "function"
    ? isGalleryModalOpen
    : () => false;

  if (isPortfolioInitialized) return;

  isPortfolioInitialized = true;
  initPortfolioCategories();
  initVideoModalEvents();
};
