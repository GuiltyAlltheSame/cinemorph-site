/**
 * VHS feature: cassette data, inline playback, shared-modal sync, and VCR drag UI.
 */

import { dom, isMobileScene } from "./core.js";
import {
  addVimeoStartHash,
  createVimeoPlayer,
  getSafePlaybackTime,
  getVimeoEmbedSrc,
  getVimeoPlayerTime,
  openPortfolioVideoModal,
  setVimeoPlayerTime
} from "./portfolio.js";

const {
  vhsTrigger,
  vhsMenu,
  vhsMenuContent,
  vcrSlotTarget,
  scene,
  tapePlayer,
  tapePlayerControls,
  tapeUnmuteButton,
  tapeExpandButton
} = dom;

const vcrTapeInsertSoundSrc = "assets/sounds/edr-vcr-tape-eject.mp3?v=20260616";
const vcrTapeInsertSound = dom.vcrTapeInsertSound || new Audio(vcrTapeInsertSoundSrc);

// Injected TV/VCR bridges use no-op fallbacks until public initialization.
let getTvNoiseControllerCallback = () => null;
let getTvPowerControllerCallback = () => null;
let updateVcrDisplay = () => {};
let readVcrDisplay = () => "clock";
let resetVcrState = () => {};

// Active cassette and inline-player session state.
let isTapeVideoPlaying = false;
let isTapeAudioMuted = true;
let shouldResumeTapeAfterModalClose = false;
let tapeInlineVimeoPlayer = null;
let tapeInlineVideoElement = null;
let tapePlaybackTime = 0;
let isTapeInlineSuspendedBySection = false;
let shouldResumeTapeInlineAfterSection = false;
let tapeMutedBeforeSectionSuspend = true;
let isVhsInitialized = false;

// Playback primitives --------------------------------------------------------

/** Restarts the physical tape-insert sound for one accepted drag action. */
const playTapeInsertSound = () => {
  if (isMobileScene()) return;

  vcrTapeInsertSound.pause();
  try {
    vcrTapeInsertSound.currentTime = 0;
  } catch {
    vcrTapeInsertSound.load();
  }

  vcrTapeInsertSound.play().catch((error) => {
    console.warn("Tape insert sound could not play:", error);
  });
};

/** Reads and caches the current inline Vimeo or HTML video position. */
const getTapeInlinePlaybackTime = async () => {
  if (tapeInlineVimeoPlayer) {
    tapePlaybackTime = await getVimeoPlayerTime(tapeInlineVimeoPlayer, tapePlaybackTime);
    return tapePlaybackTime;
  }

  const video = tapeInlineVideoElement || tapePlayer?.querySelector("video");

  if (video) {
    tapePlaybackTime = getSafePlaybackTime(video.currentTime);
  }

  return tapePlaybackTime;
};

/** Restores inline playback time, mute state, and playback after modal/section pauses. */
const seekAndResumeTapeInlinePlayer = async (seconds = tapePlaybackTime) => {
  const time = getSafePlaybackTime(seconds);
  const iframe = tapePlayer?.querySelector("iframe");
  const video = tapeInlineVideoElement || tapePlayer?.querySelector("video");

  tapePlaybackTime = time;

  if (tapeInlineVimeoPlayer) {
    await setVimeoPlayerTime(tapeInlineVimeoPlayer, time);

    try {
      await tapeInlineVimeoPlayer.setMuted?.(isTapeAudioMuted);
      await tapeInlineVimeoPlayer.setVolume?.(isTapeAudioMuted ? 0 : 1);
      await tapeInlineVimeoPlayer.play?.();
      return;
    } catch {
      // Fall back to postMessage below.
    }
  }

  if (iframe) {
    if (time > 0.05) {
      postVimeoPlayerCommand(iframe, "setCurrentTime", time);
    }
    postVimeoPlayerCommand(iframe, "play");
    postVimeoPlayerCommand(iframe, "setMuted", isTapeAudioMuted);
    postVimeoPlayerCommand(iframe, "setVolume", isTapeAudioMuted ? 0 : 1);
  }

  if (video) {
    try {
      video.currentTime = time;
    } catch {}

    video.muted = isTapeAudioMuted;
    video.volume = isTapeAudioMuted ? 0 : 1;
    video.play().catch(() => {});
  }
};

// Cassette data and menu rendering -------------------------------------------

const tapeTextureKeys = [
  "vhs-01",
  "vhs-02",
  "vhs-03",
  "vhs-04",
  "vhs-05",
  "vhs-06",
  "vhs-07",
  "vhs-08",
  "vhs-09",
  "vhs-10"
];
const defaultTapeTextureKey = "vhs-01";

/** Resolves admin-provided texture values to a known local cassette asset. */
const normalizeTapeTextureKey = (value) => {
  const cleanKey = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^.*\//, "")
    .replace(/\.(?:png|jpe?g|webp)$/i, "");

  return tapeTextureKeys.includes(cleanKey) ? cleanKey : defaultTapeTextureKey;
};

/** Builds the public URL for a normalized cassette texture. */
const getTapeTextureUrl = (textureKey) => `assets/img/${normalizeTapeTextureKey(textureKey)}.png`;

/** Splits long cassette titles into two balanced label lines. */
const splitTapeLabel = (value, maxLineLength = 20) => {
  const cleanLabel = String(value || "Untitled tape")
    .replace(/\s+/g, " ")
    .trim() || "Untitled tape";

  if (cleanLabel.length <= maxLineLength) {
    return {
      isSplit: false,
      isLong: false,
      lines: [cleanLabel]
    };
  }

  const targetIndex = Math.ceil(cleanLabel.length / 2);
  const minSplitIndex = Math.max(7, Math.floor(maxLineLength * 0.35));
  const spaceIndexes = Array.from(cleanLabel.matchAll(/\s/g))
    .map((match) => match.index)
    .filter((index) => index >= minSplitIndex && index <= cleanLabel.length - minSplitIndex);
  const spaceSplitIndex = spaceIndexes.reduce((bestIndex, index) => {
    if (bestIndex === null) return index;

    const distance = Math.abs(index - targetIndex);
    const bestDistance = Math.abs(bestIndex - targetIndex);

    return distance < bestDistance ? index : bestIndex;
  }, null);
  const breaksInsideWord = spaceSplitIndex === null;
  const splitIndex = breaksInsideWord ? Math.max(minSplitIndex, targetIndex) : spaceSplitIndex;
  const firstLine = cleanLabel.slice(0, splitIndex).trim();
  const secondLineStart = breaksInsideWord ? splitIndex : splitIndex + 1;
  const secondLine = cleanLabel.slice(secondLineStart).trim();
  const lines = [
    `${firstLine}${breaksInsideWord ? "-" : ""}`,
    secondLine
  ].filter(Boolean);
  const longestLineLength = Math.max(...lines.map((line) => line.length), 0);

  return {
    isSplit: true,
    isLong: cleanLabel.length > maxLineLength * 1.55 || longestLineLength > maxLineLength,
    isExtraLong: cleanLabel.length > maxLineLength * 2.25 || longestLineLength > maxLineLength * 1.45,
    lines
  };
};

/** Renders the split label and exposes sizing metadata to CSS. */
const appendTapeLabel = (labelElement, title) => {
  const splitLabel = splitTapeLabel(title);

  labelElement.className = [
    "vhs-menu__cassette-label",
    "tape-label",
    splitLabel.isSplit ? "is-split" : "",
    splitLabel.isLong ? "is-long" : "",
    splitLabel.isExtraLong ? "is-extra-long" : ""
  ].filter(Boolean).join(" ");
  labelElement.replaceChildren();

  splitLabel.lines.forEach((line) => {
    const lineElement = document.createElement("span");

    lineElement.textContent = line;
    labelElement.append(lineElement);
  });
};

/** Applies the admin visibility flag while remaining backward compatible. */
const isTapeEnabled = (video = {}) => (
  video.tape_enabled === true
  || String(video.tape_enabled || "").toLowerCase() === "true"
);

/** Returns a stable numeric sort order for the VHS menu. */
const getTapeSortOrder = (video = {}) => {
  const order = Number.parseInt(video.tape_sort_order, 10);

  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
};

/** Sorts cassette rows by explicit order, creation time, then identifier. */
const compareTapeItems = (a, b) => {
  const orderDifference = getTapeSortOrder(a) - getTapeSortOrder(b);

  if (orderDifference) return orderDifference;

  return new Date(b.created_at || 0) - new Date(a.created_at || 0);
};

/** Selects the cassette-specific title with a portfolio-title fallback. */
const getTapeLabel = (video = {}) => (
  String(video.tape_title || video.title || "Untitled tape").trim() || "Untitled tape"
);

/** Filters and sorts public portfolio rows displayed as VHS tapes. */
const getTapeItems = (videos = []) => videos
  .filter(isTapeEnabled)
  .slice()
  .sort(compareTapeItems);

/** Builds one accessible draggable cassette button. */
const createTapeCassette = (video, index) => {
  const textureKey = normalizeTapeTextureKey(video.tape_texture);
  const title = getTapeLabel(video);
  const cassette = document.createElement("button");
  const image = document.createElement("img");
  const label = document.createElement("span");

  cassette.type = "button";
  cassette.className = "vhs-menu__cassette";
  cassette.dataset.tapeId = String(video.id || `tape-${index + 1}`);
  cassette.dataset.videoId = String(video.id || "");
  cassette.dataset.videoTitle = title;
  cassette.dataset.vimeoUrl = String(video.vimeo_url || "").trim();
  cassette.dataset.vimeoId = String(video.vimeo_url || "").trim();
  cassette.dataset.videoSrc = String(video.video_src || "").trim();
  cassette.dataset.tapeTexture = textureKey;
  cassette.setAttribute("aria-label", `${title} VHS tape`);

  image.className = "vhs-menu__cassette-image";
  image.src = getTapeTextureUrl(textureKey);
  image.alt = "";
  image.draggable = false;
  image.setAttribute("aria-hidden", "true");

  appendTapeLabel(label, title);

  cassette.append(image, label);

  return cassette;
};

/** Builds the VHS-specific empty state shown when no tapes are enabled. */
const createTapeEmptyState = () => {
  const empty = document.createElement("div");

  empty.className = "vhs-menu__empty";
  empty.textContent = "No tapes";

  return empty;
};

/** Rebuilds the cassette menu and resets any previously inserted tape. */
const renderVhsTapes = (videos = []) => {
  if (!vhsMenuContent) return;

  const tapes = getTapeItems(videos);

  resetVcrState();
  vhsMenuContent.replaceChildren();
  vhsMenu?.classList.toggle("has-tapes", Boolean(tapes.length));

  if (!tapes.length) {
    vhsMenuContent.append(createTapeEmptyState());
    return;
  }

  tapes.forEach((video, index) => {
    vhsMenuContent.append(createTapeCassette(video, index));
  });
};

// Inline player and shared-modal synchronization -----------------------------

/** Reads playback metadata stored on a rendered cassette. */
const getTapeVideo = (cassette) => ({
  id: cassette.dataset.tapeId || "",
  title: cassette.dataset.videoTitle || "Tape",
  vimeoId: (cassette.dataset.vimeoId || "").trim(),
  vimeoUrl: (cassette.dataset.vimeoUrl || "").trim(),
  videoSrc: (cassette.dataset.videoSrc || "").trim(),
});

/** Provides a legacy numeric-ID embed fallback when URL parsing fails. */
const getVimeoPlayerSrc = (vimeoId) => {
  const cleanId = vimeoId
    .replace(/^https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?/i, "")
    .split(/[/?#]/)[0];

  return `https://player.vimeo.com/video/${encodeURIComponent(cleanId)}?autoplay=1&muted=1&playsinline=1&title=0&byline=0&portrait=0&autopause=0&dnt=1&controls=0&api=1&player_id=vhs-tv-player`;
};

/** Shows inline audio/fullscreen controls only when a tape has playable media. */
const setTapeControlsVisible = (isVisible) => {
  if (!tapePlayerControls) return;

  tapePlayerControls.hidden = !isVisible;
};

/** Releases focus when pointer interaction leaves the floating tape controls. */
const releaseTapeControlsFocus = () => {
  if (!tapePlayerControls) return;

  const activeElement = document.activeElement;

  if (activeElement instanceof HTMLElement && tapePlayerControls.contains(activeElement)) {
    activeElement.blur();
  }
};

/** Sends a Vimeo postMessage command when the Player SDK is unavailable. */
const postVimeoPlayerCommand = (iframe, method, value) => {
  if (!iframe?.contentWindow) return;

  iframe.contentWindow.postMessage(JSON.stringify({ method, value }), "https://player.vimeo.com");
};

/** Synchronizes mute button styling and accessibility state. */
const syncTapeAudioButton = () => {
  if (!tapeUnmuteButton) return;

  const isSoundOn = !isTapeAudioMuted;

  tapeUnmuteButton.classList.toggle("is-active", isSoundOn);
  tapeUnmuteButton.setAttribute("aria-pressed", String(isSoundOn));
  tapeUnmuteButton.setAttribute("aria-label", isSoundOn ? "Mute tape video" : "Unmute tape video");
};

/** Applies mute state consistently to Vimeo SDK, iframe fallback, and HTML video. */
const setTapeAudioMuted = (isMuted) => {
  const iframe = tapePlayer?.querySelector("iframe");
  const video = tapePlayer?.querySelector("video");

  isTapeAudioMuted = Boolean(isMuted);

  if (tapeInlineVimeoPlayer) {
    tapeInlineVimeoPlayer.setMuted?.(isTapeAudioMuted)?.catch?.(() => {});
    tapeInlineVimeoPlayer.setVolume?.(isTapeAudioMuted ? 0 : 1)?.catch?.(() => {});
  }

  if (iframe) {
    postVimeoPlayerCommand(iframe, "setMuted", isTapeAudioMuted);
    postVimeoPlayerCommand(iframe, "setVolume", isTapeAudioMuted ? 0 : 1);
  }

  if (video) {
    video.muted = isTapeAudioMuted;
    video.volume = isTapeAudioMuted ? 0 : 1;

    if (!isTapeAudioMuted) {
      video.play().catch(() => {});
    }
  }

  syncTapeAudioButton();
};

/** Toggles the current inline tape audio state. */
const toggleTapePlayerAudio = () => {
  setTapeAudioMuted(!isTapeAudioMuted);
};

/** Pauses whichever inline playback implementation is active. */
const pauseTapeInlinePlayer = () => {
  const iframe = tapePlayer?.querySelector("iframe");
  const video = tapePlayer?.querySelector("video");

  if (tapeInlineVimeoPlayer) {
    tapeInlineVimeoPlayer.pause?.()?.catch?.(() => {});
  }

  if (iframe) {
    postVimeoPlayerCommand(iframe, "pause");
  }

  if (video) {
    video.pause();
  }
};

/** Reports whether an inserted cassette currently owns playable inline media. */
const hasTapeInlinePlayer = () => Boolean(
  tapePlayer?.classList.contains("has-player")
  && (tapeInlineVimeoPlayer || tapeInlineVideoElement || tapePlayer.querySelector("iframe, video"))
);

/** Captures playback state and silences the tape before leaving the home scene. */
const suspendTapeInlinePlaybackForSection = () => {
  if (!hasTapeInlinePlayer() || isTapeInlineSuspendedBySection || shouldResumeTapeAfterModalClose) return;

  isTapeInlineSuspendedBySection = true;
  shouldResumeTapeInlineAfterSection = isTapeVideoPlaying;
  tapeMutedBeforeSectionSuspend = isTapeAudioMuted;

  getTapeInlinePlaybackTime()
    .catch(() => tapePlaybackTime)
    .finally(() => {
      setTapeAudioMuted(true);
      pauseTapeInlinePlayer();
    });
};

/** Restores the tape state captured by section navigation. */
const resumeTapeInlinePlaybackForSection = () => {
  if (!isTapeInlineSuspendedBySection) return;

  const shouldResume = shouldResumeTapeInlineAfterSection;
  const shouldRestoreMuted = tapeMutedBeforeSectionSuspend;

  isTapeInlineSuspendedBySection = false;
  shouldResumeTapeInlineAfterSection = false;
  tapeMutedBeforeSectionSuspend = true;

  setTapeAudioMuted(shouldRestoreMuted);

  if (shouldResume && hasTapeInlinePlayer()) {
    seekAndResumeTapeInlinePlayer(tapePlaybackTime);
  }
};

/** Opens the shared modal and bridges its closing time back to inline playback. */
const openTapeFullscreen = async () => {
  const baseEmbedSrc = tapePlayer?.dataset.modalEmbedSrc || "";

  if (!baseEmbedSrc) return;

  const startTime = await getTapeInlinePlaybackTime();
  const embedSrc = addVimeoStartHash(baseEmbedSrc, startTime);

  shouldResumeTapeAfterModalClose = false;
  const didOpen = openPortfolioVideoModal({
    title: tapePlayer?.dataset.activeTape || "Tape video",
    embedSrc,
    trigger: tapeExpandButton,
    number: "VHS",
    syncPlayback: true,
    startTime,
    onClose: async (nextTapeTime) => {
      if (!shouldResumeTapeAfterModalClose) return;

      shouldResumeTapeAfterModalClose = false;
      await seekAndResumeTapeInlinePlayer(nextTapeTime);
    }
  });

  if (didOpen) {
    shouldResumeTapeAfterModalClose = true;
    pauseTapeInlinePlayer();
  }
};

/** Inserts cassette media into the TV using Vimeo or an HTML video fallback. */
const loadTapeVideo = (cassette) => {
  if (!tapePlayer || !cassette) return;

  const tape = getTapeVideo(cassette);
  const embedSrc = getVimeoEmbedSrc(tape.vimeoUrl || tape.vimeoId, {
    api: true,
    controls: false,
    muted: true,
    playerId: "vhs-tv-player"
  })
    || (tape.vimeoId ? getVimeoPlayerSrc(tape.vimeoId) : "");
  const modalEmbedSrc = getVimeoEmbedSrc(tape.vimeoUrl || tape.vimeoId, {
    api: true,
    playerId: "vhs-modal-player"
  });
  const hasTapeVideo = Boolean(embedSrc || tape.videoSrc);

  shouldResumeTapeAfterModalClose = false;
  isTapeInlineSuspendedBySection = false;
  shouldResumeTapeInlineAfterSection = false;
  tapeMutedBeforeSectionSuspend = true;
  tapePlaybackTime = 0;
  tapeInlineVimeoPlayer = null;
  tapeInlineVideoElement = null;
  isTapeVideoPlaying = hasTapeVideo;
  getTvPowerControllerCallback()?.powerOn({ startAudio: !hasTapeVideo });
  if (hasTapeVideo) {
    getTvNoiseControllerCallback()?.silence();
  }
  tapePlayer.replaceChildren();
  tapePlayer.classList.remove("has-player");
  setTapeAudioMuted(true);
  setTapeControlsVisible(false);
  delete tapePlayer.dataset.modalEmbedSrc;
  tapePlayer.dataset.activeTape = tape.title;
  tapePlayer.setAttribute("aria-label", `${tape.title} playback`);

  if (embedSrc) {
    const frame = document.createElement("div");
    const iframe = document.createElement("iframe");

    frame.className = "screen__video-frame";
    iframe.title = tape.title;
    iframe.src = embedSrc;
    iframe.allow = "autoplay; fullscreen; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.loading = "eager";

    frame.append(iframe);
    tapePlayer.append(frame);
    tapePlayer.classList.add("has-player");
    tapePlayer.dataset.modalEmbedSrc = modalEmbedSrc || embedSrc;
    tapeInlineVimeoPlayer = createVimeoPlayer(iframe);

    if (tapeInlineVimeoPlayer) {
      tapeInlineVimeoPlayer.on?.("timeupdate", (data) => {
        tapePlaybackTime = getSafePlaybackTime(data?.seconds);
      });
      tapeInlineVimeoPlayer.on?.("play", () => {
        isTapeVideoPlaying = true;
      });
      tapeInlineVimeoPlayer.on?.("pause", () => {
        if (!shouldResumeTapeAfterModalClose) {
          isTapeVideoPlaying = false;
        }
      });
    }

    setTapeControlsVisible(true);
  } else if (tape.videoSrc) {
    const video = document.createElement("video");

    video.src = tape.videoSrc;
    video.autoplay = true;
    video.controls = false;
    video.muted = true;
    video.playsInline = true;
    video.addEventListener("timeupdate", () => {
      tapePlaybackTime = getSafePlaybackTime(video.currentTime);
    });
    video.addEventListener("play", () => {
      isTapeVideoPlaying = true;
    });
    video.addEventListener("pause", () => {
      if (!shouldResumeTapeAfterModalClose) {
        isTapeVideoPlaying = false;
      }
    });

    tapePlayer.append(video);
    tapePlayer.classList.add("has-player");
    tapeInlineVideoElement = video;
    video.play().catch(() => {});
  }

  tapePlayer.classList.add("is-active");
};

/** Fully releases tape media, controls, playback state, and TV-noise ownership. */
const clearTapeVideo = () => {
  if (!tapePlayer) return;

  tapePlayer.querySelectorAll("video").forEach((video) => {
    video.pause();
    video.removeAttribute("src");
    video.load();
  });
  tapePlayer.replaceChildren();
  tapePlayer.classList.remove("has-player", "is-active");
  shouldResumeTapeAfterModalClose = false;
  isTapeInlineSuspendedBySection = false;
  shouldResumeTapeInlineAfterSection = false;
  tapeMutedBeforeSectionSuspend = true;
  isTapeVideoPlaying = false;
  tapePlaybackTime = 0;
  tapeInlineVimeoPlayer = null;
  tapeInlineVideoElement = null;
  delete tapePlayer.dataset.activeTape;
  delete tapePlayer.dataset.modalEmbedSrc;
  tapePlayer.removeAttribute("aria-label");
  setTapeAudioMuted(true);
  setTapeControlsVisible(false);
  getTvNoiseControllerCallback()?.fadeIn();
};

/** Registers inline tape audio/fullscreen controls. */
const initTapeControlEvents = () => {
  tapeUnmuteButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleTapePlayerAudio();
  });

  tapeExpandButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openTapeFullscreen();
  });

  tapePlayerControls?.addEventListener("pointerleave", releaseTapeControlsFocus);
};

// Cassette drawer and VCR drag interaction -----------------------------------

/** Closes the cassette menu without resetting an inserted tape. */
const closeVhsMenu = () => {
  vhsMenu?.classList.remove("is-open");
  vhsMenu?.setAttribute("aria-hidden", "true");
  vhsTrigger?.setAttribute("aria-expanded", "false");
};

/** Registers the desktop cassette menu and pointer-based VCR insertion flow. */
const initVhsDragAndDrop = () => {
  if (vhsTrigger && vhsMenu) {
    const tapeInsertDuration = 620;
    const tapeFlyAwayDuration = 780;
    const tapeReturnHomeDuration = 360;
    const slotCloseDuration = 520;
    let activeTapeDrag = null;
    let insertedCassette = null;
    let slotResetTimer;

    /** Opens the cassette drawer only in desktop interaction mode. */
    const openVhsMenu = () => {
      if (isMobileScene()) {
        closeVhsMenu();
        return;
      }

      vhsMenu.classList.add("is-open");
      vhsMenu.setAttribute("aria-hidden", "false");
      vhsTrigger.setAttribute("aria-expanded", "true");
    };

    /** Tests a pointer against a rectangle with an optional forgiving margin. */
    const pointInRect = (x, y, rect, padding = 0) => (
      x >= rect.left - padding
      && x <= rect.right + padding
      && y >= rect.top - padding
      && y <= rect.bottom + padding
    );

    /** Constrains drag interpolation values to a safe range. */
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    /** Reveals the VCR target while a cassette is being dragged. */
    const showVcrSlotTarget = () => {
      if (!vcrSlotTarget) return;

      window.clearTimeout(slotResetTimer);
      vcrSlotTarget.classList.remove("is-closing", "is-hot");
      vcrSlotTarget.classList.add("is-awaiting-tape");
    };

    /** Immediately clears every VCR target highlight state. */
    const hideVcrSlotTarget = () => {
      if (!vcrSlotTarget) return;

      window.clearTimeout(slotResetTimer);
      vcrSlotTarget.classList.remove("is-awaiting-tape", "is-closing", "is-hot");
    };

    /** Plays the slot-closing state after an accepted cassette insertion. */
    const closeVcrSlotTarget = () => {
      if (!vcrSlotTarget) return;

      window.clearTimeout(slotResetTimer);
      vcrSlotTarget.classList.remove("is-awaiting-tape", "is-hot");
      vcrSlotTarget.classList.add("is-closing");

      slotResetTimer = window.setTimeout(() => {
        vcrSlotTarget.classList.remove("is-closing");
      }, slotCloseDuration);
    };

    /** Cancels active drag state and ejects the currently inserted cassette. */
    resetVcrState = () => {
      if (activeTapeDrag) {
        const drag = activeTapeDrag;

        activeTapeDrag = null;
        removeTapeDragListeners();
        clearDragState(drag);
        drag.ghost.remove();
        drag.cassette.classList.remove("is-picked");
      }

      insertedCassette?.classList.remove("is-picked", "is-in-vcr");
      insertedCassette = null;
      hideVcrSlotTarget();
      clearTapeVideo();
      updateVcrDisplay("clock");
    };

    /** Calculates attraction, scale, and acceptance around the VCR slot. */
    const getSlotMetrics = (x, y, drag = activeTapeDrag) => {
      if (!vcrSlotTarget || !drag) {
        return {
          progress: 0,
          targetScale: 0.5,
          isAccepted: false,
          rect: null,
        };
      }

      const rect = vcrSlotTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(x - centerX, y - centerY);
      const attractionRadius = Math.max(rect.width * 3.2, 160);
      const progress = clamp(1 - distance / attractionRadius, 0, 1);
      const targetScale = clamp((rect.width / Math.max(drag.originalRect.width, 1)) * 1.04, 0.28, 0.55);
      const acceptancePadding = Math.max(rect.width * 0.56, 56);

      return {
        progress,
        targetScale,
        isAccepted: pointInRect(x, y, rect, acceptancePadding),
        rect,
      };
    };

    /** Moves and scales the drag ghost as it approaches the VCR. */
    const updateTapeGhost = (event) => {
      if (!activeTapeDrag) return;

      event.preventDefault?.();

      const { ghost } = activeTapeDrag;
      const x = event.clientX;
      const y = event.clientY;
      const metrics = getSlotMetrics(x, y);
      const pull = Math.pow(metrics.progress, 1.25);
      const scale = 1 - (1 - metrics.targetScale) * pull;
      const isNearVcr = metrics.progress > 0.62 || metrics.isAccepted;

      activeTapeDrag.x = x;
      activeTapeDrag.y = y;
      activeTapeDrag.currentScale = scale;
      ghost.style.left = `${x}px`;
      ghost.style.top = `${y}px`;
      ghost.style.setProperty("--vhs-drag-scale", scale.toFixed(3));
      ghost.classList.toggle("is-near-vcr", isNearVcr);
      vcrSlotTarget?.classList.toggle("is-hot", isNearVcr);

      if (!activeTapeDrag.menuHasClosed && vhsMenu.classList.contains("is-open")) {
        const menuRect = vhsMenu.getBoundingClientRect();

        if (!pointInRect(x, y, menuRect)) {
          activeTapeDrag.menuHasClosed = true;
          closeVhsMenu();
        }
      }
    };

    /** Removes document listeners installed for one active drag. */
    const removeTapeDragListeners = () => {
      document.removeEventListener("pointermove", updateTapeGhost);
      document.removeEventListener("pointerup", finishTapeDrag);
      document.removeEventListener("pointercancel", cancelTapeDrag);
    };

    /** Releases pointer capture and global drag CSS state. */
    const clearDragState = (drag) => {
      document.body.classList.remove("is-vhs-dragging");
      scene?.classList.remove("is-tape-dragging");

      if (
        typeof drag.cassette.hasPointerCapture === "function"
        && drag.cassette.hasPointerCapture(drag.pointerId)
      ) {
        drag.cassette.releasePointerCapture(drag.pointerId);
      }
    };

    /** Animates an accepted cassette into the slot and starts its media. */
    const insertTape = (drag) => {
      const metrics = getSlotMetrics(drag.x, drag.y, drag);

      closeVhsMenu();

      if (metrics.rect) {
        const centerX = metrics.rect.left + metrics.rect.width / 2;
        const centerY = metrics.rect.top + metrics.rect.height / 2;

        drag.ghost.style.left = `${centerX}px`;
        drag.ghost.style.top = `${centerY}px`;
        drag.ghost.style.setProperty("--vhs-drag-scale", metrics.targetScale.toFixed(3));
      }

      drag.ghost.classList.add("is-entering-vcr");
      closeVcrSlotTarget();
      playTapeInsertSound();

      if (insertedCassette && insertedCassette !== drag.cassette) {
        insertedCassette.classList.remove("is-picked", "is-in-vcr");
      }

      insertedCassette = drag.cassette;
      drag.cassette.classList.add("is-in-vcr");
      updateVcrDisplay("play");
      loadTapeVideo(drag.cassette);

      window.setTimeout(() => {
        drag.ghost.remove();
      }, tapeInsertDuration);
    };

    /** Returns a rejected cassette to its visible menu position. */
    const returnTapeHome = (drag) => {
      const homeRect = drag.cassette.getBoundingClientRect();
      const targetRect = homeRect.width && homeRect.height ? homeRect : drag.originalRect;
      const centerX = targetRect.left + targetRect.width / 2;
      const centerY = targetRect.top + targetRect.height / 2;

      hideVcrSlotTarget();
      drag.ghost.classList.remove("is-near-vcr", "is-flying-away");
      drag.ghost.classList.add("is-returning-home");
      drag.ghost.style.setProperty("--vhs-drag-scale", "1");
      drag.ghost.style.left = `${centerX}px`;
      drag.ghost.style.top = `${centerY}px`;
      updateVcrDisplay(drag.previousVcrMode === "play" ? "play" : "clock");

      window.setTimeout(() => {
        drag.ghost.remove();
        drag.cassette.classList.remove("is-picked");
      }, tapeReturnHomeDuration);
    };

    /** Chooses between return-home and fly-away rejection animations. */
    const rejectTape = (drag) => {
      if (!drag.menuHasClosed && vhsMenu.classList.contains("is-open")) {
        returnTapeHome(drag);
        return;
      }

      hideVcrSlotTarget();
      drag.ghost.classList.remove("is-near-vcr");
      drag.ghost.classList.add("is-flying-away");
      drag.ghost.style.setProperty("--vhs-drag-scale", Math.min(drag.currentScale || 1, 0.72).toFixed(3));
      drag.ghost.style.left = `${window.innerWidth + drag.originalRect.width}px`;
      drag.ghost.style.top = `${drag.y - Math.max(24, drag.originalRect.height * 0.24)}px`;
      updateVcrDisplay(drag.previousVcrMode === "play" ? "play" : "clock");

      window.setTimeout(() => {
        drag.ghost.remove();
        drag.cassette.classList.remove("is-picked");
      }, tapeFlyAwayDuration);
    };

    /** Commits or rejects a cassette when pointer input ends. */
    function finishTapeDrag(event) {
      if (!activeTapeDrag) return;

      event.preventDefault();
      event.stopPropagation();

      const drag = activeTapeDrag;
      const metrics = getSlotMetrics(drag.x, drag.y, drag);

      activeTapeDrag = null;
      removeTapeDragListeners();
      clearDragState(drag);

      if (metrics.isAccepted) {
        insertTape(drag);
        return;
      }

      rejectTape(drag);
    }

    /** Aborts an interrupted drag while preserving the previous VCR mode. */
    function cancelTapeDrag() {
      if (!activeTapeDrag) return;

      const drag = activeTapeDrag;

      activeTapeDrag = null;
      removeTapeDragListeners();
      clearDragState(drag);
      rejectTape(drag);
    }

    /** Creates the drag ghost and captures pointer state for one cassette. */
    const startTapeDrag = (event, cassette = event.currentTarget) => {
      if (isMobileScene()) return;
      if (!vcrSlotTarget) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (activeTapeDrag) return;
      if (!(cassette instanceof HTMLElement)) return;

      event.preventDefault();
      event.stopPropagation();

      const rect = cassette.getBoundingClientRect();
      const ghost = cassette.cloneNode(true);

      ghost.removeAttribute("id");
      ghost.classList.remove("is-picked", "is-in-vcr");
      ghost.classList.add("vhs-drag-ghost");
      ghost.setAttribute("aria-hidden", "true");
      ghost.setAttribute("tabindex", "-1");
      ghost.draggable = false;
      ghost.style.setProperty("--vhs-drag-width", `${rect.width}px`);
      ghost.querySelectorAll("img").forEach((image) => {
        image.draggable = false;
      });
      document.body.append(ghost);

      cassette.classList.add("is-picked");
      document.body.classList.add("is-vhs-dragging");
      scene?.classList.add("is-tape-dragging");

      activeTapeDrag = {
        cassette,
        ghost,
        originalRect: rect,
        pointerId: event.pointerId,
        previousVcrMode: readVcrDisplay(),
        menuHasClosed: false,
        x: event.clientX,
        y: event.clientY,
        currentScale: 1,
      };

      cassette.setPointerCapture?.(event.pointerId);
      updateVcrDisplay("ready");
      showVcrSlotTarget();
      updateTapeGhost(event);

      document.addEventListener("pointermove", updateTapeGhost, { passive: false });
      document.addEventListener("pointerup", finishTapeDrag);
      document.addEventListener("pointercancel", cancelTapeDrag);
    };

    vhsTrigger.addEventListener("click", () => {
      if (isMobileScene()) {
        closeVhsMenu();
        return;
      }

      if (vhsMenu.classList.contains("is-open")) {
        closeVhsMenu();
        return;
      }

      openVhsMenu();
    });

    vhsMenuContent?.addEventListener("pointerdown", (event) => {
      const target = event.target instanceof Element
        ? event.target.closest(".vhs-menu__cassette")
        : null;

      if (!target || !vhsMenuContent.contains(target)) return;

      startTapeDrag(event, target);
    });

    document.addEventListener("pointerdown", (event) => {
      if (activeTapeDrag) return;
      if (!vhsMenu.classList.contains("is-open")) return;
      if (vhsMenu.contains(event.target) || vhsTrigger.contains(event.target)) return;

      closeVhsMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      if (activeTapeDrag) {
        cancelTapeDrag();
        return;
      }

      closeVhsMenu();
    });
  }
};

// Public controller ----------------------------------------------------------

const vhsController = Object.freeze({
  render: renderVhsTapes,
  reset: () => resetVcrState(),
  closeMenu: closeVhsMenu,
  clear: clearTapeVideo,
  pauseInline: pauseTapeInlinePlayer,
  hasInlinePlayer: hasTapeInlinePlayer,
  isVideoPlaying: () => isTapeVideoPlaying,
  suspendForSection: suspendTapeInlinePlaybackForSection,
  resumeForSection: resumeTapeInlinePlaybackForSection
});

/**
 * Initializes VHS controls and returns the public bridge used by TV/navigation.
 */
export const initVhsPlayer = ({
  getTvNoiseController = () => null,
  getTvPowerController = () => null,
  setVcrDisplayMode = () => {},
  getVcrDisplayMode = () => "clock"
} = {}) => {
  getTvNoiseControllerCallback = getTvNoiseController;
  getTvPowerControllerCallback = getTvPowerController;
  updateVcrDisplay = setVcrDisplayMode;
  readVcrDisplay = getVcrDisplayMode;

  if (isVhsInitialized) return vhsController;

  isVhsInitialized = true;
  vcrTapeInsertSound.preload = "auto";
  vcrTapeInsertSound.src ||= vcrTapeInsertSoundSrc;
  vcrTapeInsertSound.volume = 0.65;
  initTapeControlEvents();
  initVhsDragAndDrop();

  return vhsController;
};
