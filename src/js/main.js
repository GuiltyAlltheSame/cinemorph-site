const vhsTrigger = document.querySelector(".hotspot-vhs");
const vhsMenu = document.querySelector("#vhsMenu");
const vhsCassettes = document.querySelectorAll(".vhs-menu__cassette");
const vcrSlotTarget = document.querySelector("#vcrSlotTarget");
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
const tapePlayer = document.querySelector("[data-vhs-player]");
const vcrClock = document.querySelector("#vcrClock");
const vcrClockHours = document.querySelector(".vcr-clock__hours");
const vcrClockMinutes = document.querySelector(".vcr-clock__minutes");
const vcrClockStatus = document.querySelector(".vcr-clock__status");
const portfolioCategoryItems = document.querySelectorAll(".portfolio-categories__item");
const portfolioGrid = document.querySelector("[data-portfolio-grid]");
const galleryStage = document.querySelector("[data-gallery-stage]");
const galleryStrips = Array.from(document.querySelectorAll("[data-gallery-strip]"));
const galleryProgress = document.querySelector(".gallery-progress");
const contactForm = document.querySelector("[data-contact-form]");
const contactStatus = document.querySelector("[data-contact-status]");
const contactSubmit = document.querySelector("[data-contact-submit]");
let tvNoiseController;
let tvPowerController;
let setVcrDisplayMode = () => {};
let getVcrDisplayMode = () => "clock";
let resetVcrState = () => {};

const getSupabaseConfig = () => window.CINEMORPH_SUPABASE_CONFIG || {};

const isSupabaseConfigured = () => {
  const config = getSupabaseConfig();

  return Boolean(config.enabled && config.url && config.anonKey);
};

const setContactStatus = (message, type = "neutral") => {
  if (!contactStatus) return;

  contactStatus.textContent = message;
  contactStatus.classList.toggle("is-success", type === "success");
  contactStatus.classList.toggle("is-error", type === "error");
};

const postSupabaseRow = async (tableName, payload) => {
  const config = getSupabaseConfig();
  const baseUrl = config.url.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/${tableName}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(detail || "Supabase request failed");

    error.status = response.status;
    throw error;
  }
};

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      contact: String(formData.get("contact") || "").trim(),
      message: String(formData.get("message") || "").trim()
    };

    if (!payload.name || !payload.contact || !payload.message) {
      setContactStatus("Please fill in your name, contact, and message.", "error");
      return;
    }

    if (!isSupabaseConfigured()) {
      setContactStatus("Message system is not configured yet. Please use the contact details on this page.", "error");
      return;
    }

    contactSubmit?.setAttribute("disabled", "true");
    setContactStatus("Sending...");

    try {
      await postSupabaseRow(getSupabaseConfig().tables?.messages || "messages", payload);
      contactForm.reset();
      setContactStatus("Message sent. We will get back to you soon.", "success");
    } catch (error) {
      console.error("Contact form Supabase error:", error);
      setContactStatus(`Message could not be sent. Supabase status: ${error.status || "network"}.`, "error");
    } finally {
      contactSubmit?.removeAttribute("disabled");
    }
  });
}

if (portfolioCategoryItems.length) {
  portfolioCategoryItems.forEach((item) => {
    item.addEventListener("click", () => {
      portfolioCategoryItems.forEach((categoryItem) => {
        const isSelected = categoryItem === item;

        categoryItem.classList.toggle("is-active", isSelected);
        categoryItem.setAttribute("aria-pressed", String(isSelected));
      });
    });
  });
}

const createEmptyState = (message) => {
  const empty = document.createElement("div");

  empty.className = "media-empty";
  empty.textContent = message;

  return empty;
};

const getGalleryFormatType = () => "landscape";

const normalizeGalleryFocusValue = (value) => {
  const number = Number.parseFloat(value);

  if (!Number.isFinite(number)) return 50;

  return Math.max(0, Math.min(100, Math.round(number)));
};

const getGalleryFocus = (item = {}) => ({
  x: normalizeGalleryFocusValue(item.focus_x),
  y: normalizeGalleryFocusValue(item.focus_y)
});

const getSupabaseImagePreviewUrl = (imageUrl, options = {}) => {
  const url = String(imageUrl || "").trim();

  if (!url || !url.includes("/storage/v1/object/public/")) {
    return url;
  }

  try {
    const transformUrl = new URL(url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/"));
    const width = options.width || 1200;
    const quality = options.quality || 72;

    transformUrl.searchParams.set("width", String(width));
    transformUrl.searchParams.set("quality", String(quality));
    transformUrl.searchParams.set("resize", options.resize || "contain");

    return transformUrl.toString();
  } catch {
    return url;
  }
};

const setImageSourceWithFallback = (image, src, fallbackSrc) => {
  if (!image || !src) return;

  if (fallbackSrc && src !== fallbackSrc && !image.dataset.fallbackReady) {
    image.dataset.fallbackReady = "true";
    image.addEventListener("error", () => {
      if (image.dataset.fallbackSrc && image.src !== image.dataset.fallbackSrc) {
        image.src = image.dataset.fallbackSrc;
      }
    });
  }

  if (fallbackSrc) {
    image.dataset.fallbackSrc = fallbackSrc;
  }

  image.src = src;
};

const fetchSupabaseRows = async (tableName, order) => {
  if (!isSupabaseConfigured()) return [];

  const config = getSupabaseConfig();
  const baseUrl = config.url.replace(/\/$/, "");
  const url = new URL(`${baseUrl}/rest/v1/${tableName}`);

  url.searchParams.set("select", "*");
  if (order) {
    url.searchParams.set("order", order);
  }

  const response = await fetch(url, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(detail || "Supabase request failed");

    error.status = response.status;
    throw error;
  }

  return response.json();
};

const loadPublicMedia = async () => {
  const tables = getSupabaseConfig().tables || {};
  const [gallery, videos] = await Promise.all([
    fetchSupabaseRows(tables.gallery || "gallery_items", "sort_order.asc.nullslast,created_at.desc"),
    fetchSupabaseRows(tables.videos || "portfolio_videos", "sort_order.asc.nullslast,created_at.desc")
  ]);

  return { gallery, videos };
};

const createGalleryItem = (item) => {
  const imageUrl = String(item.image_url || "").trim();

  if (!imageUrl) return null;

  const formatType = getGalleryFormatType();
  const title = item.title || item.file_name || "Gallery image";
  const link = document.createElement("a");
  const image = document.createElement("img");
  const previewWidth = 1600;
  const previewUrl = getSupabaseImagePreviewUrl(imageUrl, {
    width: previewWidth,
    quality: 72
  });
  const focus = getGalleryFocus(item);

  link.className = `gallery-strip__item gallery-strip__item--${formatType}`;
  link.href = imageUrl;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.setAttribute("aria-label", title);

  image.dataset.src = previewUrl;
  image.dataset.fallbackSrc = imageUrl;
  image.alt = item.alt_text || title;
  image.loading = "lazy";
  image.decoding = "async";
  image.width = previewWidth;
  image.height = 900;
  image.style.setProperty("--gallery-focus-x", `${focus.x}%`);
  image.style.setProperty("--gallery-focus-y", `${focus.y}%`);

  link.append(image);

  return link;
};

const loadGalleryImage = (item) => {
  const image = item.querySelector("img[data-src]");

  if (!image) return;

  setImageSourceWithFallback(image, image.dataset.src, image.dataset.fallbackSrc);
  image.removeAttribute("data-src");
};

const renderGallery = (items) => {
  if (!galleryStrips.length || !galleryStage) return;

  const galleryItems = items.filter((item) => String(item.image_url || "").trim());

  galleryStage.classList.toggle("is-empty", !galleryItems.length);

  galleryStrips.forEach((strip) => {
    const rowItems = galleryItems;

    strip.replaceChildren();
    strip.classList.toggle("is-empty-row", !rowItems.length);

    rowItems.forEach((item) => {
      const galleryItem = createGalleryItem(item);

      if (galleryItem) {
        strip.append(galleryItem);
      }
    });
  });

  if (!galleryItems.length) {
    galleryStrips[0].classList.remove("is-empty-row");
    galleryStrips[0].append(createEmptyState("No gallery uploads yet"));
    galleryProgress?.toggleAttribute("hidden", true);
  }
};

const setupGalleryScroller = () => {
  if (!galleryStrips.length || !galleryProgress) return;

  const galleryProgressThumb = galleryProgress.querySelector(".gallery-progress__thumb");
  const frameMedia = window.matchMedia("(min-width: 701px)");
  const wheelThreshold = 80;
  const wheelCooldown = 140;
  let galleryRows = [];
  let activeFrame = 0;
  let progressPointerId = null;
  let wheelAccumulator = 0;
  let wheelDirection = 0;
  let wheelLocked = false;
  let wheelUnlockTimer;

  const buildGalleryRows = () => {
    galleryRows = galleryStrips
      .map((strip) => {
        const items = Array.from(strip.querySelectorAll(".gallery-strip__item"));
        const visibleCount = Math.max(1, Number.parseInt(strip.dataset.visibleCount || "5", 10));

        return {
          strip,
          items,
          visibleCount,
          maxFrame: Math.max(0, items.length - visibleCount)
        };
      })
      .filter(({ items }) => items.length);
  };

  const maxFrame = () => galleryRows.reduce((max, row) => Math.max(max, row.maxFrame), 0);
  const clampGalleryFrame = (frame) => Math.max(0, Math.min(frame, maxFrame()));
  const shouldUseGalleryFrames = () => frameMedia.matches && maxFrame() > 0;

  const updateGalleryProgressA11y = () => {
    const frameMax = maxFrame();

    galleryProgress.setAttribute("aria-valuemax", String(frameMax));
    galleryProgress.setAttribute("aria-valuenow", String(activeFrame));
    galleryProgress.setAttribute("aria-valuetext", `${activeFrame + 1} of ${frameMax + 1}`);
  };

  const updateGalleryProgressThumb = () => {
    const largestRow = galleryRows.reduce((best, row) => (
      row.items.length > best.items.length ? row : best
    ), { items: [], visibleCount: 1 });
    const thumbRatio = largestRow.items.length
      ? Math.max(0.12, Math.min(largestRow.visibleCount / largestRow.items.length, 1))
      : 1;

    galleryProgress.style.setProperty("--gallery-progress-size", `${thumbRatio * 100}%`);
  };

  const renderGalleryFrame = (frame = activeFrame) => {
    const frameMax = maxFrame();
    const shouldUseFrameMode = shouldUseGalleryFrames();

    activeFrame = clampGalleryFrame(frame);
    galleryProgress.toggleAttribute("hidden", !shouldUseFrameMode);
    galleryProgress.style.setProperty(
      "--gallery-progress",
      String(frameMax > 0 ? activeFrame / frameMax : 0)
    );
    updateGalleryProgressThumb();
    updateGalleryProgressA11y();

    galleryRows.forEach(({ strip, items, visibleCount, maxFrame: rowMaxFrame }) => {
      const rowFrame = Math.min(activeFrame, rowMaxFrame);

      strip.classList.toggle("is-frame-mode", shouldUseFrameMode);
      strip.dataset.activeFrame = String(rowFrame);

      items.forEach((item, index) => {
        const isVisible = !shouldUseFrameMode || (index >= rowFrame && index < rowFrame + visibleCount);
        const shouldPreload = !shouldUseFrameMode || (index >= rowFrame - 1 && index < rowFrame + visibleCount + 1);

        if (shouldPreload) {
          loadGalleryImage(item);
        }

        item.hidden = !isVisible;
        item.setAttribute("aria-hidden", String(!isVisible));
      });
    });
  };

  const getGalleryFrameFromProgress = (clientX) => {
    const progressRect = galleryProgress.getBoundingClientRect();
    const thumbWidth = galleryProgressThumb?.getBoundingClientRect().width || 0;
    const range = Math.max(1, progressRect.width - thumbWidth);
    const minX = progressRect.left + thumbWidth / 2;
    const progress = Math.max(0, Math.min((clientX - minX) / range, 1));

    return clampGalleryFrame(Math.round(progress * maxFrame()));
  };

  const setGallerySwitching = (isSwitching) => {
    galleryRows.forEach(({ strip }) => {
      strip.classList.toggle("is-switching", isSwitching);
    });
  };

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

  const canMoveGallery = (direction) => (
    direction > 0 ? activeFrame < maxFrame() : activeFrame > 0
  );

  const queueWheelUnlock = () => {
    window.clearTimeout(wheelUnlockTimer);

    wheelUnlockTimer = window.setTimeout(() => {
      wheelLocked = false;
      wheelAccumulator = 0;
      wheelDirection = 0;
    }, wheelCooldown);
  };

  const getGalleryWheelDelta = (event) => {
    const rawDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

    if (event.deltaMode === 1) return rawDelta * 16;
    if (event.deltaMode === 2) return rawDelta * window.innerWidth;

    return rawDelta;
  };

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

  const renderGalleryFromProgressPointer = (event) => {
    if (!shouldUseGalleryFrames()) return;

    event.preventDefault();
    event.stopPropagation();
    switchGalleryFrame(getGalleryFrameFromProgress(event.clientX));
  };

  const stopGalleryProgressDrag = (event) => {
    if (progressPointerId === null || progressPointerId !== event.pointerId) return;

    if (typeof galleryProgress.hasPointerCapture === "function" && galleryProgress.hasPointerCapture(event.pointerId)) {
      galleryProgress.releasePointerCapture(event.pointerId);
    }

    progressPointerId = null;
    galleryProgress.classList.remove("is-dragging");
    document.body.classList.remove("is-gallery-progress-dragging");
  };

  buildGalleryRows();

  galleryRows.forEach(({ strip }) => {
    strip.addEventListener("wheel", handleGalleryWheel, { passive: false });
  });

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
      nextFrame = maxFrame();
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

const getPortfolioHref = (url) => {
  const cleanUrl = String(url || "").trim();

  if (!cleanUrl) return "";
  if (/^https?:\/\//i.test(cleanUrl)) return cleanUrl;

  return `https://vimeo.com/${encodeURIComponent(cleanUrl)}`;
};

const gifFadeDuration = 490;
const stopTimers = new WeakMap();

const setupPortfolioGif = (card, thumb, gifSrc) => {
  if (!gifSrc) return;

  const image = document.createElement("img");

  image.className = "portfolio-gif";
  image.alt = "";
  image.decoding = "async";
  thumb.append(image);

  const playGif = () => {
    window.clearTimeout(stopTimers.get(image));

    if (!image.getAttribute("src")) {
      image.setAttribute("src", gifSrc);
    }

    window.requestAnimationFrame(() => {
      image.classList.add("is-playing");
    });
  };

  const pauseGif = () => {
    image.classList.remove("is-playing");

    const timer = window.setTimeout(() => {
      image.removeAttribute("src");
    }, gifFadeDuration);

    stopTimers.set(image, timer);
  };

  card.addEventListener("pointerenter", playGif);
  card.addEventListener("pointerleave", pauseGif);
  card.addEventListener("focusin", playGif);
  card.addEventListener("focusout", pauseGif);
};

const renderPortfolio = (videos) => {
  if (!portfolioGrid) return;

  portfolioGrid.replaceChildren();
  portfolioGrid.classList.toggle("is-empty", !videos.length);

  if (!videos.length) {
    portfolioGrid.append(createEmptyState("No portfolio uploads yet"));
    return;
  }

  videos.forEach((video) => {
    const card = document.createElement("article");
    const body = document.createElement("div");
    const title = document.createElement("h3");
    const thumb = document.createElement(video.vimeo_url ? "a" : "div");
    const posterUrl = String(video.poster_url || "").trim();
    const gifUrl = String(video.thumbnail_gif_url || "").trim();
    const projectTitle = video.title || "Untitled project";
    const href = getPortfolioHref(video.vimeo_url);

    card.className = video.featured ? "card card--feature" : "card";
    body.className = "card__body";
    title.textContent = projectTitle;
    thumb.className = "ph-thumb";

    if (href && thumb instanceof HTMLAnchorElement) {
      thumb.href = href;
      thumb.target = "_blank";
      thumb.rel = "noreferrer";
      thumb.setAttribute("aria-label", projectTitle);
    }

    if (posterUrl) {
      const poster = document.createElement("img");
      const posterPreviewUrl = getSupabaseImagePreviewUrl(posterUrl, {
        width: video.featured ? 1600 : 900,
        quality: 72
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

    setupPortfolioGif(card, thumb, gifUrl);
    body.append(title);
    card.append(body, thumb);
    portfolioGrid.append(card);
  });
};

if (galleryStrips.length || portfolioGrid) {
  loadPublicMedia()
    .then(({ gallery, videos }) => {
      renderGallery(gallery);
      renderPortfolio(videos);
      setupGalleryScroller();
    })
    .catch((error) => {
      console.error("Public media Supabase error:", error);
      renderGallery([]);
      renderPortfolio([]);
      setupGalleryScroller();
    });
}

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
    resetVcrState();
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

  tvPowerController = {
    powerOn: powerOnTv,
    powerOff: powerOffTv,
    isOn: () => tvPoweredOn,
  };
}

const getTapeVideo = (cassette) => ({
  id: cassette.dataset.tapeId || "",
  title: cassette.dataset.videoTitle || cassette.alt || "Tape",
  vimeoId: (cassette.dataset.vimeoId || "").trim(),
  videoSrc: (cassette.dataset.videoSrc || "").trim(),
});

const getVimeoPlayerSrc = (vimeoId) => {
  const cleanId = vimeoId
    .replace(/^https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?/i, "")
    .split(/[/?#]/)[0];

  return `https://player.vimeo.com/video/${encodeURIComponent(cleanId)}?autoplay=1&title=0&byline=0&portrait=0`;
};

const loadTapeVideo = (cassette) => {
  if (!tapePlayer || !cassette) return;

  const tape = getTapeVideo(cassette);

  tvPowerController?.powerOn();
  tapePlayer.replaceChildren();
  tapePlayer.classList.remove("has-player");
  tapePlayer.dataset.activeTape = tape.title;
  tapePlayer.setAttribute("aria-label", `${tape.title} playback`);

  if (tape.vimeoId) {
    const iframe = document.createElement("iframe");

    iframe.title = tape.title;
    iframe.src = getVimeoPlayerSrc(tape.vimeoId);
    iframe.allow = "autoplay; fullscreen; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.loading = "lazy";

    tapePlayer.append(iframe);
    tapePlayer.classList.add("has-player");
  } else if (tape.videoSrc) {
    const video = document.createElement("video");

    video.src = tape.videoSrc;
    video.autoplay = true;
    video.controls = true;
    video.playsInline = true;

    tapePlayer.append(video);
    tapePlayer.classList.add("has-player");
    video.play().catch(() => {});
  }

  tapePlayer.classList.add("is-active");
};

const clearTapeVideo = () => {
  if (!tapePlayer) return;

  tapePlayer.querySelectorAll("video").forEach((video) => {
    video.pause();
    video.removeAttribute("src");
    video.load();
  });
  tapePlayer.replaceChildren();
  tapePlayer.classList.remove("has-player", "is-active");
  delete tapePlayer.dataset.activeTape;
  tapePlayer.removeAttribute("aria-label");
};

if (vhsTrigger && vhsMenu) {
  const tapeInsertDuration = 620;
  const tapeFlyAwayDuration = 780;
  const slotCloseDuration = 520;
  let activeTapeDrag = null;
  let insertedCassette = null;
  let slotResetTimer;

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

  const pointInRect = (x, y, rect, padding = 0) => (
    x >= rect.left - padding
    && x <= rect.right + padding
    && y >= rect.top - padding
    && y <= rect.bottom + padding
  );

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const showVcrSlotTarget = () => {
    if (!vcrSlotTarget) return;

    window.clearTimeout(slotResetTimer);
    vcrSlotTarget.classList.remove("is-closing", "is-hot");
    vcrSlotTarget.classList.add("is-awaiting-tape");
  };

  const hideVcrSlotTarget = () => {
    if (!vcrSlotTarget) return;

    window.clearTimeout(slotResetTimer);
    vcrSlotTarget.classList.remove("is-awaiting-tape", "is-closing", "is-hot");
  };

  const closeVcrSlotTarget = () => {
    if (!vcrSlotTarget) return;

    window.clearTimeout(slotResetTimer);
    vcrSlotTarget.classList.remove("is-awaiting-tape", "is-hot");
    vcrSlotTarget.classList.add("is-closing");

    slotResetTimer = window.setTimeout(() => {
      vcrSlotTarget.classList.remove("is-closing");
    }, slotCloseDuration);
  };

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
    setVcrDisplayMode("clock");
  };

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

  const removeTapeDragListeners = () => {
    document.removeEventListener("pointermove", updateTapeGhost);
    document.removeEventListener("pointerup", finishTapeDrag);
    document.removeEventListener("pointercancel", cancelTapeDrag);
  };

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

    if (insertedCassette && insertedCassette !== drag.cassette) {
      insertedCassette.classList.remove("is-picked", "is-in-vcr");
    }

    insertedCassette = drag.cassette;
    drag.cassette.classList.add("is-in-vcr");
    setVcrDisplayMode("play");
    loadTapeVideo(drag.cassette);

    window.setTimeout(() => {
      drag.ghost.remove();
    }, tapeInsertDuration);
  };

  const rejectTape = (drag) => {
    hideVcrSlotTarget();
    drag.ghost.classList.remove("is-near-vcr");
    drag.ghost.classList.add("is-flying-away");
    drag.ghost.style.setProperty("--vhs-drag-scale", Math.min(drag.currentScale || 1, 0.72).toFixed(3));
    drag.ghost.style.left = `${window.innerWidth + drag.originalRect.width}px`;
    drag.ghost.style.top = `${drag.y - Math.max(24, drag.originalRect.height * 0.24)}px`;
    setVcrDisplayMode(drag.previousVcrMode === "play" ? "play" : "clock");

    window.setTimeout(() => {
      drag.ghost.remove();
      drag.cassette.classList.remove("is-picked");
    }, tapeFlyAwayDuration);
  };

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

  function cancelTapeDrag() {
    if (!activeTapeDrag) return;

    const drag = activeTapeDrag;

    activeTapeDrag = null;
    removeTapeDragListeners();
    clearDragState(drag);
    rejectTape(drag);
  }

  const startTapeDrag = (event) => {
    if (!vcrSlotTarget) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (activeTapeDrag) return;

    event.preventDefault();
    event.stopPropagation();

    const cassette = event.currentTarget;
    const rect = cassette.getBoundingClientRect();
    const ghost = cassette.cloneNode(false);

    ghost.removeAttribute("id");
    ghost.alt = "";
    ghost.className = "vhs-drag-ghost";
    ghost.setAttribute("aria-hidden", "true");
    ghost.draggable = false;
    ghost.style.setProperty("--vhs-drag-width", `${rect.width}px`);
    document.body.append(ghost);

    cassette.classList.add("is-picked");
    document.body.classList.add("is-vhs-dragging");
    scene?.classList.add("is-tape-dragging");

    activeTapeDrag = {
      cassette,
      ghost,
      originalRect: rect,
      pointerId: event.pointerId,
      previousVcrMode: getVcrDisplayMode(),
      menuHasClosed: false,
      x: event.clientX,
      y: event.clientY,
      currentScale: 1,
    };

    cassette.setPointerCapture?.(event.pointerId);
    setVcrDisplayMode("ready");
    showVcrSlotTarget();
    updateTapeGhost(event);

    document.addEventListener("pointermove", updateTapeGhost, { passive: false });
    document.addEventListener("pointerup", finishTapeDrag);
    document.addEventListener("pointercancel", cancelTapeDrag);
  };

  vhsTrigger.addEventListener("click", () => {
    if (vhsMenu.classList.contains("is-open")) {
      closeVhsMenu();
      return;
    }

    openVhsMenu();
  });

  vhsCassettes.forEach((cassette) => {
    cassette.addEventListener("pointerdown", startTapeDrag);
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

if (vcrClock && vcrClockHours && vcrClockMinutes && vcrClockStatus) {
  let vcrDisplayMode = "clock";
  let currentClockLabel = "VCR clock";

  setVcrDisplayMode = (mode = "clock") => {
    const nextMode = ["clock", "ready", "play"].includes(mode) ? mode : "clock";
    const statusText = nextMode === "ready" ? "READY" : "PLAY";

    vcrDisplayMode = nextMode;
    vcrClock.classList.toggle("is-status", nextMode !== "clock");
    vcrClockStatus.textContent = nextMode === "clock" ? "" : statusText;
    vcrClockStatus.setAttribute("aria-hidden", String(nextMode === "clock"));
    vcrClock.setAttribute("aria-label", nextMode === "clock" ? currentClockLabel : `VCR ${statusText}`);
  };

  getVcrDisplayMode = () => vcrDisplayMode;

  const updateVcrClock = () => {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes();
    const displayTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    vcrClockHours.textContent = String(hours).padStart(2, "0");
    vcrClockMinutes.textContent = String(minutes).padStart(2, "0");
    currentClockLabel = `VCR clock ${displayTime}`;

    if (vcrDisplayMode === "clock") {
      vcrClock.setAttribute("aria-label", currentClockLabel);
    }
  };

  updateVcrClock();
  setVcrDisplayMode("clock");
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
