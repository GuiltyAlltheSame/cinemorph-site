const vhsTrigger = document.querySelector(".hotspot-vhs");
const vhsMenu = document.querySelector("#vhsMenu");
const vhsMenuContent = document.querySelector("[data-vhs-menu-content]");
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
const vcrTapeInsertSoundSrc = "assets/sounds/edr-vcr-tape-eject.mp3?v=20260616";
const vcrTapeInsertSound = document.querySelector("#vcrTapeInsertSound") || new Audio(vcrTapeInsertSoundSrc);
const tvPowerButton = document.querySelector(".hotspot-tv-power");
const tvBloom = document.querySelector(".tv-bloom");
const tapePlayer = document.querySelector("[data-vhs-player]");
const tapePlayerControls = document.querySelector("[data-vhs-player-controls]");
const tapeUnmuteButton = document.querySelector("[data-vhs-unmute]");
const tapeExpandButton = document.querySelector("[data-vhs-expand]");
const vcrClock = document.querySelector("#vcrClock");
const vcrClockHours = document.querySelector(".vcr-clock__hours");
const vcrClockMinutes = document.querySelector(".vcr-clock__minutes");
const vcrClockStatus = document.querySelector(".vcr-clock__status");
const portfolioCategoryItems = document.querySelectorAll(".portfolio-categories__item");
const portfolioGrid = document.querySelector("[data-portfolio-grid]");
const videoModal = document.querySelector("[data-video-modal]");
const videoModalPlayer = document.querySelector("[data-video-modal-player]");
const videoModalTitle = document.querySelector("#video-modal-title");
const videoModalNumber = document.querySelector("[data-video-modal-number]");
const videoModalCloseButtons = document.querySelectorAll("[data-video-modal-close]");
const galleryModal = document.querySelector("[data-gallery-modal]");
const galleryModalImage = document.querySelector("[data-gallery-modal-image]");
const galleryModalTitle = document.querySelector("#gallery-modal-title");
const galleryModalNumber = document.querySelector("[data-gallery-modal-number]");
const galleryModalCloseButtons = document.querySelectorAll("[data-gallery-modal-close]");
const galleryModalPrev = document.querySelector("[data-gallery-modal-prev]");
const galleryModalNext = document.querySelector("[data-gallery-modal-next]");
const galleryStage = document.querySelector("[data-gallery-stage]");
const galleryStrips = Array.from(document.querySelectorAll("[data-gallery-strip]"));
const galleryProgress = document.querySelector(".gallery-progress");
const contactForm = document.querySelector("[data-contact-form]");
const contactStatus = document.querySelector("[data-contact-status]");
const contactSubmit = document.querySelector("[data-contact-submit]");
const dynamicPlaceholderField = document.querySelector("[data-dynamic-placeholder]");
const referenceToggle = document.querySelector("[data-reference-toggle]");
const referenceField = document.querySelector("[data-reference-field]");
const referencePanel = document.querySelector("[data-reference-panel]");
const referenceBox = document.querySelector("[data-reference-box]");
const referenceInput = document.querySelector("[data-reference-input]");
const referenceList = document.querySelector("[data-reference-list]");
const mobileSceneQuery = window.matchMedia("(max-width: 700px)");
let tvNoiseController;
let tvPowerController;
let setVcrDisplayMode = () => {};
let getVcrDisplayMode = () => "clock";
let resetVcrState = () => {};
let isTapeVideoPlaying = false;
let isTapeAudioMuted = true;
let shouldResumeTapeAfterModalClose = false;
let resumeTapeInlinePlayer = () => {};
let videoModalRestoreFocus = null;
let tapeInlineVimeoPlayer = null;
let tapeModalVimeoPlayer = null;
let tapeInlineVideoElement = null;
let tapePlaybackTime = 0;
let tapeModalPlaybackTime = 0;
let galleryModalItems = [];
let activeGalleryModalIndex = 0;
let galleryModalRestoreFocus = null;
let turnstileToken = "";
let isContactSubmitting = false;
const referenceLinks = [];
const contactMessagePlaceholders = [
  "Hi, we're opening a coffee shop and need a cinematic promo video...",
  "Hello, I'd like to film a music video for my upcoming single...",
  "We need drone footage of a property for a real estate listing...",
  "I'm looking for a videographer for a documentary project...",
  "We are launching a new product and need commercial content...",
  "Hi, I'd like to discuss a creative collaboration...",
  "We need behind-the-scenes coverage for an upcoming production...",
  "I have a short film idea and I'm looking for a production team...",
  "We're planning an event and need video coverage...",
  "Hi, I found your work online and would like to know your availability...",
  "We'd like to create something similar to the references attached...",
  "Looking for a cinematic reel for social media...",
  "Hi, I don't know exactly what I need yet, but I have an idea...",
  "Just wanted to say hello and connect with fellow creators..."
];

const isMobileScene = () => mobileSceneQuery.matches;
const mobileViewportEffectClass = "is-mobile-viewport-active";
const mobileViewportEffects = new Map();
let mobileViewportObserver = null;
let mobileViewportRefreshFrame = null;

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

const isElementInMobileFocusBand = (element) => {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const rect = element.getBoundingClientRect();
  const focusTop = viewportHeight * 0.32;
  const focusBottom = viewportHeight * 0.68;

  return rect.bottom >= focusTop && rect.top <= focusBottom;
};

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

const queueMobileViewportRefresh = () => {
  if (mobileViewportRefreshFrame) return;

  mobileViewportRefreshFrame = window.requestAnimationFrame(() => {
    mobileViewportRefreshFrame = null;
    refreshMobileViewportEffects();
  });
};

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

const observeMobileViewportEffect = (element, callbacks = {}) => {
  if (!(element instanceof Element)) return;

  mobileViewportEffects.set(element, {
    active: false,
    onEnter: callbacks.onEnter,
    onExit: callbacks.onExit
  });

  getMobileViewportObserver()?.observe(element);
  queueMobileViewportRefresh();
};

const unobserveMobileViewportEffectsWithin = (root) => {
  if (!(root instanceof Element)) return;

  mobileViewportEffects.forEach((effect, element) => {
    if (!root.contains(element)) return;

    setMobileViewportEffectActive(element, false);
    mobileViewportObserver?.unobserve(element);
    mobileViewportEffects.delete(element);
  });
};

document.querySelectorAll(".team-card").forEach((card) => {
  observeMobileViewportEffect(card);
});

window.addEventListener("scroll", queueMobileViewportRefresh, { passive: true });
window.addEventListener("resize", queueMobileViewportRefresh, { passive: true });

if (typeof mobileSceneQuery.addEventListener === "function") {
  mobileSceneQuery.addEventListener("change", queueMobileViewportRefresh);
} else if (typeof mobileSceneQuery.addListener === "function") {
  mobileSceneQuery.addListener(queueMobileViewportRefresh);
}

vcrTapeInsertSound.preload = "auto";
vcrTapeInsertSound.src ||= vcrTapeInsertSoundSrc;
vcrTapeInsertSound.volume = 0.65;

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

const getSupabaseConfig = () => window.CINEMORPH_SUPABASE_CONFIG || {};

const initDynamicPlaceholder = () => {
  if (!dynamicPlaceholderField || contactMessagePlaceholders.length < 2) return;

  let placeholderIndex = 0;
  let fadeTimer = null;
  let intervalId = null;

  const startRotation = () => {
    if (intervalId || dynamicPlaceholderField.value.trim()) return;

    intervalId = window.setInterval(rotatePlaceholder, 5000);
  };

  const stopRotation = () => {
    window.clearInterval(intervalId);
    window.clearTimeout(fadeTimer);
    intervalId = null;
    fadeTimer = null;
    dynamicPlaceholderField.classList.remove("is-placeholder-changing");
  };

  const rotatePlaceholder = () => {
    if (dynamicPlaceholderField.value.trim()) {
      stopRotation();
      return;
    }

    dynamicPlaceholderField.classList.add("is-placeholder-changing");

    fadeTimer = window.setTimeout(() => {
      placeholderIndex = (placeholderIndex + 1) % contactMessagePlaceholders.length;
      dynamicPlaceholderField.setAttribute("placeholder", contactMessagePlaceholders[placeholderIndex]);
      dynamicPlaceholderField.classList.remove("is-placeholder-changing");
    }, 450);
  };

  dynamicPlaceholderField.setAttribute("placeholder", contactMessagePlaceholders[placeholderIndex]);
  startRotation();
  dynamicPlaceholderField.addEventListener("input", () => {
    if (dynamicPlaceholderField.value.trim()) {
      stopRotation();
    } else {
      startRotation();
    }
  });
};

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

const resetTurnstile = () => {
  turnstileToken = "";

  if (window.turnstile && typeof window.turnstile.reset === "function") {
    window.turnstile.reset();
  }
};

window.onTurnstileSuccess = (token) => {
  turnstileToken = String(token || "").trim();

  if (turnstileToken) {
    setContactStatus("");
  }
};

window.onTurnstileExpired = () => {
  turnstileToken = "";
  setContactStatus("Verification expired. Please try again.", "error");
};

window.onTurnstileError = () => {
  turnstileToken = "";
  setContactStatus("Verification could not be completed. Please try again.", "error");
};

const getCurrentTurnstileToken = (formData) => {
  const formToken = String(formData.get("cf-turnstile-response") || "").trim();

  return formToken || turnstileToken;
};

const splitTrailingUrlPunctuation = (value) => {
  let url = String(value || "").trim();
  let trailing = "";

  while (/[.,!?;:]$/.test(url)) {
    trailing = `${url.slice(-1)}${trailing}`;
    url = url.slice(0, -1);
  }

  while (url.endsWith(")") && (url.match(/\(/g) || []).length < (url.match(/\)/g) || []).length) {
    trailing = `)${trailing}`;
    url = url.slice(0, -1);
  }

  return { url, trailing };
};

const normalizeReferenceUrl = (value) => {
  const { url } = splitTrailingUrlPunctuation(value);
  const normalized = /^www\./i.test(url) ? `https://${url}` : url;

  try {
    const parsed = new URL(normalized);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }

    return parsed.href;
  } catch {
    return "";
  }
};

const getReferenceLinkTitle = (value) => {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./i, "");
    const segments = url.pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "";
    const readableSegment = decodeURIComponent(lastSegment)
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/[-_]+/g, " ")
      .trim();

    if (readableSegment && !/^\d+$/.test(readableSegment)) {
      return readableSegment.slice(0, 34);
    }

    return host;
  } catch {
    return String(value || "").replace(/^https?:\/\//i, "").slice(0, 34);
  }
};

const getReferenceLinkHost = (value) => {
  try {
    return new URL(value).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
};

const extractReferenceUrls = (value) => {
  const text = String(value || "");
  const urlPattern = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;

  return Array.from(text.matchAll(urlPattern), (match) => normalizeReferenceUrl(match[0]))
    .filter(Boolean);
};

const renderReferenceCards = () => {
  if (!referenceList) return;

  const fragment = document.createDocumentFragment();

  referenceLinks.forEach((item, index) => {
    const card = document.createElement("div");
    const number = document.createElement("span");
    const body = document.createElement("span");
    const title = document.createElement("span");
    const host = document.createElement("span");
    const remove = document.createElement("button");
    const removeMark = document.createElement("span");

    card.className = "reference-card";
    number.className = "reference-card__number";
    number.textContent = String(index + 1).padStart(2, "0");
    body.className = "reference-card__body";
    title.className = "reference-card__title";
    title.textContent = item.title;
    host.className = "reference-card__url";
    host.textContent = getReferenceLinkHost(item.url);
    remove.className = "reference-card__remove";
    remove.type = "button";
    remove.dataset.referenceRemove = String(index);
    remove.setAttribute("aria-label", `Remove reference ${index + 1}`);
    removeMark.setAttribute("aria-hidden", "true");
    removeMark.textContent = "x";

    body.append(title, host);
    remove.append(removeMark);
    card.append(number, body, remove);
    fragment.append(card);
  });

  referenceList.replaceChildren(fragment);
};

const addReferenceUrls = (urls) => {
  let added = false;

  urls.forEach((url) => {
    const exists = referenceLinks.some((item) => item.url.toLowerCase() === url.toLowerCase());

    if (!exists) {
      referenceLinks.push({
        url,
        title: getReferenceLinkTitle(url)
      });
      added = true;
    }
  });

  if (added) {
    renderReferenceCards();
  }

  return added;
};

const commitReferenceInput = () => {
  if (!referenceInput) return false;

  const urls = extractReferenceUrls(referenceInput.value);
  addReferenceUrls(urls);

  if (urls.length) {
    referenceInput.value = "";
  }

  return Boolean(urls.length);
};

const setReferencePanelState = () => {
  if (!referenceToggle || !referencePanel) return;

  const isEnabled = referenceToggle.checked;

  if (referenceField) {
    referenceField.hidden = !isEnabled;
  }

  referencePanel.hidden = !isEnabled;

  if (referenceInput) {
    referenceInput.disabled = !isEnabled;
  }
};

const getReferencePayload = () => referenceLinks.map((item) => item.url);

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

const submitContactMessage = async (payload) => {
  const response = await fetch("/.netlify/functions/submit-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  let result = {};

  try {
    result = await response.json();
  } catch {}

  if (!response.ok || !result.ok) {
    const error = new Error(result.error || "Message could not be sent. Please try again later.");

    error.status = response.status;
    throw error;
  }

  return result;
};

initDynamicPlaceholder();
setReferencePanelState();

referenceToggle?.addEventListener("change", () => {
  setReferencePanelState();

  if (referenceToggle.checked) {
    referenceInput?.focus();
  }
});

referenceBox?.addEventListener("click", (event) => {
  if (event.target.closest("[data-reference-remove]")) return;

  referenceInput?.focus();
});

referenceList?.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-reference-remove]");

  if (!removeButton) return;

  referenceLinks.splice(Number(removeButton.dataset.referenceRemove), 1);
  renderReferenceCards();
  referenceInput?.focus();
});

referenceInput?.addEventListener("paste", (event) => {
  const pastedText = event.clipboardData?.getData("text") || "";
  const urls = extractReferenceUrls(pastedText);

  if (!urls.length) return;

  event.preventDefault();
  addReferenceUrls(urls);
  referenceInput.value = "";
});

referenceInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== "," && event.key !== " ") return;

  if (commitReferenceInput()) {
    event.preventDefault();
  }
});

referenceInput?.addEventListener("blur", () => {
  commitReferenceInput();
});

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isContactSubmitting) {
      return;
    }

    const hasReferences = Boolean(referenceToggle?.checked);

    if (hasReferences) {
      commitReferenceInput();

      if (String(referenceInput?.value || "").trim()) {
        setContactStatus("Please paste a valid reference link or clear the reference field.", "error");
        referenceInput?.focus();
        return;
      }
    }

    const formData = new FormData(contactForm);
    const currentTurnstileToken = getCurrentTurnstileToken(formData);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      contact: String(formData.get("contact") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      company: String(formData.get("company") || ""),
      turnstileToken: currentTurnstileToken
    };

    if (!payload.name || !payload.contact || !payload.message) {
      setContactStatus("Please fill in your name, contact, and message.", "error");
      return;
    }

    if (hasReferences && !referenceLinks.length) {
      setContactStatus("Please add at least one reference link or uncheck I have references.", "error");
      referenceInput?.focus();
      return;
    }

    if (!currentTurnstileToken) {
      setContactStatus("Please complete the verification before sending.", "error");
      return;
    }

    turnstileToken = currentTurnstileToken;

    if (hasReferences) {
      payload.reference_links = getReferencePayload();
    }

    isContactSubmitting = true;
    contactSubmit?.setAttribute("disabled", "true");
    setContactStatus("Sending...");

    try {
      await submitContactMessage(payload);
      contactForm.reset();
      referenceLinks.length = 0;
      renderReferenceCards();
      setReferencePanelState();
      resetTurnstile();
      setContactStatus("Message sent. We will get back to you soon.", "success");
    } catch (error) {
      console.error("Contact form submit error:", error);
      resetTurnstile();
      setContactStatus(
        error.status === 403
          ? "Verification expired or was already used. Please complete the check again."
          : error.message || "Message could not be sent. Please try again later.",
        "error"
      );
    } finally {
      isContactSubmitting = false;
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
    const quality = options.quality || 100;

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

const getGalleryModalPreviewUrl = (imageUrl) => getSupabaseImagePreviewUrl(imageUrl, {
  width: 2200,
  quality: 100
});

const createGalleryModalItem = (item) => {
  const imageUrl = String(item.image_url || "").trim();
  const title = item.title || item.file_name || "Gallery image";
  const focus = getGalleryFocus(item);

  return {
    alt: item.alt_text || title,
    fullSrc: imageUrl,
    previewSrc: getGalleryModalPreviewUrl(imageUrl),
    title,
    focus
  };
};

const createGalleryItem = (item, index = 0) => {
  const imageUrl = String(item.image_url || "").trim();

  if (!imageUrl) return null;

  const formatType = getGalleryFormatType();
  const title = item.title || item.file_name || "Gallery image";
  const link = document.createElement("a");
  const image = document.createElement("img");
  const previewWidth = 1600;
  const previewHeight = Math.round((previewWidth * 9) / 17);
  const previewUrl = getSupabaseImagePreviewUrl(imageUrl, {
    width: previewWidth,
    quality: 100
  });
  const focus = getGalleryFocus(item);

  link.className = `gallery-strip__item gallery-strip__item--${formatType}`;
  link.href = imageUrl;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.dataset.galleryIndex = String(index);
  link.setAttribute("aria-label", title);

  image.dataset.src = previewUrl;
  image.dataset.fallbackSrc = imageUrl;
  image.alt = item.alt_text || title;
  image.loading = "lazy";
  image.decoding = "async";
  image.width = previewWidth;
  image.height = previewHeight;
  image.style.setProperty("--gallery-focus-x", `${focus.x}%`);
  image.style.setProperty("--gallery-focus-y", `${focus.y}%`);

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

const loadGalleryImage = (item) => {
  const image = item.querySelector("img[data-src]");

  if (!image) return;

  setImageSourceWithFallback(image, image.dataset.src, image.dataset.fallbackSrc);
  image.removeAttribute("data-src");
};

const renderGallery = (items) => {
  if (!galleryStrips.length || !galleryStage) return;

  unobserveMobileViewportEffectsWithin(galleryStage);

  const galleryItems = items.filter((item) => String(item.image_url || "").trim());
  galleryModalItems = galleryItems.map(createGalleryModalItem);

  galleryStage.classList.toggle("is-empty", !galleryItems.length);

  galleryStrips.forEach((strip) => {
    const rowItems = galleryItems;

    strip.replaceChildren();
    strip.classList.toggle("is-empty-row", !rowItems.length);

    rowItems.forEach((item, index) => {
      const galleryItem = createGalleryItem(item, index);

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

const isGalleryModalOpen = () => Boolean(galleryModal?.classList.contains("is-open"));

const renderGalleryModalItem = () => {
  if (!galleryModal || !galleryModalImage || !galleryModalItems.length) return;

  const item = galleryModalItems[activeGalleryModalIndex];

  if (!item) return;

  galleryModalImage.removeAttribute("src");
  galleryModalImage.alt = item.alt || item.title || "Gallery image";
  galleryModalImage.style.setProperty("--gallery-focus-x", `${item.focus.x}%`);
  galleryModalImage.style.setProperty("--gallery-focus-y", `${item.focus.y}%`);
  setImageSourceWithFallback(galleryModalImage, item.previewSrc, item.fullSrc);

  if (galleryModalTitle) {
    galleryModalTitle.textContent = item.title || "Gallery image";
  }

  if (galleryModalNumber) {
    galleryModalNumber.textContent = String(activeGalleryModalIndex + 1).padStart(2, "0");
  }

  const hasMultipleItems = galleryModalItems.length > 1;

  galleryModalPrev?.toggleAttribute("hidden", !hasMultipleItems);
  galleryModalNext?.toggleAttribute("hidden", !hasMultipleItems);
};

const openGalleryModal = (index = 0, trigger = null) => {
  if (!galleryModal || !galleryModalItems.length) return false;

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

const closeGalleryModal = () => {
  if (!galleryModal) return;

  galleryModal.classList.remove("is-open");
  galleryModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-gallery-modal-open");

  if (galleryModalImage) {
    galleryModalImage.removeAttribute("src");
    galleryModalImage.removeAttribute("alt");
  }

  const focusTarget = galleryModalRestoreFocus;

  galleryModalRestoreFocus = null;

  if (focusTarget instanceof HTMLElement && document.contains(focusTarget)) {
    focusTarget.focus({ preventScroll: true });
  }
};

const moveGalleryModal = (direction) => {
  if (!galleryModalItems.length) return;

  activeGalleryModalIndex = (
    activeGalleryModalIndex + direction + galleryModalItems.length
  ) % galleryModalItems.length;
  renderGalleryModalItem();
};

galleryModalCloseButtons.forEach((button) => {
  button.addEventListener("click", closeGalleryModal);
});

galleryModalPrev?.addEventListener("click", () => moveGalleryModal(-1));
galleryModalNext?.addEventListener("click", () => moveGalleryModal(1));

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

  return `https://vimeo.com/${cleanUrl.replace(/^\/+/, "").split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
};

const getVimeoEmbedSrc = (url, options = {}) => {
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

const getVimeoPlayerApi = () => window.Vimeo?.Player || null;

const createVimeoPlayer = (iframe) => {
  const Player = getVimeoPlayerApi();

  if (!Player || !iframe) return null;

  try {
    return new Player(iframe);
  } catch (error) {
    console.warn("Vimeo player could not initialize:", error);
    return null;
  }
};

const getSafePlaybackTime = (value) => {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : 0;
};

const addVimeoStartHash = (src, seconds) => {
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

const getVimeoPlayerTime = async (player, fallback = 0) => {
  if (!player || typeof player.getCurrentTime !== "function") return getSafePlaybackTime(fallback);

  try {
    return getSafePlaybackTime(await player.getCurrentTime());
  } catch {
    return getSafePlaybackTime(fallback);
  }
};

const setVimeoPlayerTime = async (player, seconds) => {
  const time = getSafePlaybackTime(seconds);

  if (!player || typeof player.setCurrentTime !== "function" || time <= 0.05) return;

  try {
    await player.setCurrentTime(time);
  } catch (error) {
    console.warn("Vimeo player seek failed:", error);
  }
};

const isVideoModalOpen = () => Boolean(videoModal?.classList.contains("is-open"));

const getVideoModalFocusableElements = () => {
  if (!videoModal) return [];

  return Array.from(videoModal.querySelectorAll("button, iframe, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"))
    .filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);
};

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

const getTapeModalPlaybackTime = async () => {
  if (tapeModalVimeoPlayer) {
    tapeModalPlaybackTime = await getVimeoPlayerTime(tapeModalVimeoPlayer, tapeModalPlaybackTime);
  }

  return tapeModalPlaybackTime;
};

const resetTapeModalPlayer = () => {
  tapeModalVimeoPlayer = null;
  tapeModalPlaybackTime = 0;
};

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

const closePortfolioVideoModal = async () => {
  if (!videoModal) return;

  const resumeTapeAfterClose = shouldResumeTapeAfterModalClose;
  const nextTapeTime = resumeTapeAfterClose ? await getTapeModalPlaybackTime() : tapePlaybackTime;

  shouldResumeTapeAfterModalClose = false;
  resetTapeModalPlayer();
  videoModal.classList.remove("is-open");
  videoModal.setAttribute("aria-hidden", "true");
  videoModalPlayer?.replaceChildren();
  document.body.classList.remove("is-video-modal-open");

  const focusTarget = videoModalRestoreFocus;

  videoModalRestoreFocus = null;

  if (focusTarget instanceof HTMLElement && document.contains(focusTarget)) {
    focusTarget.focus({ preventScroll: true });
  }

  if (resumeTapeAfterClose) {
    await seekAndResumeTapeInlinePlayer(nextTapeTime);
  }
};

const openPortfolioVideoModal = ({
  title,
  embedSrc,
  trigger,
  number,
  syncTape = false,
  startTime = 0
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

  resetTapeModalPlayer();

  if (syncTape) {
    tapeModalPlaybackTime = modalStartTime;
    tapeModalVimeoPlayer = createVimeoPlayer(iframe);

    if (tapeModalVimeoPlayer) {
      const modalPlayerReady = tapeModalVimeoPlayer.ready?.() || Promise.resolve();

      modalPlayerReady
        .then(async () => {
          await setVimeoPlayerTime(tapeModalVimeoPlayer, modalStartTime);
          await tapeModalVimeoPlayer.play?.();
        })
        .catch(() => {});
      tapeModalVimeoPlayer.on?.("timeupdate", (data) => {
        tapeModalPlaybackTime = getSafePlaybackTime(data?.seconds);
      });
    }
  }

  window.requestAnimationFrame(() => {
    videoModal.querySelector(".video-modal__close")?.focus({ preventScroll: true });
  });

  return true;
};

videoModalCloseButtons.forEach((button) => {
  button.addEventListener("click", closePortfolioVideoModal);
});

document.addEventListener("keydown", (event) => {
  if (isGalleryModalOpen()) {
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

    const focusable = Array.from(galleryModal?.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])") || [])
      .filter((element) => !element.hasAttribute("disabled") && !element.hasAttribute("hidden") && element.tabIndex >= 0);

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

    return;
  }

  if (!isVideoModalOpen()) return;

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
  if (isGalleryModalOpen() && galleryModal) {
    if (event.target instanceof Node && galleryModal.contains(event.target)) return;

    galleryModal.querySelector(".gallery-modal__close")?.focus({ preventScroll: true });
    return;
  }

  if (!isVideoModalOpen() || !videoModal) return;
  if (event.target instanceof Node && videoModal.contains(event.target)) return;

  videoModal.querySelector(".video-modal__close")?.focus({ preventScroll: true });
});

const gifFadeDuration = 490;
const stopTimers = new WeakMap();

const setupPortfolioGif = (card, thumb, gifSrc) => {
  let playGif = null;
  let pauseGif = null;

  if (gifSrc) {
    const image = document.createElement("img");

    image.className = "portfolio-gif";
    image.alt = "";
    image.decoding = "async";
    thumb.append(image);

    playGif = () => {
      window.clearTimeout(stopTimers.get(image));

      if (!image.getAttribute("src")) {
        image.setAttribute("src", gifSrc);
      }

      window.requestAnimationFrame(() => {
        image.classList.add("is-playing");
      });
    };

    pauseGif = () => {
      image.classList.remove("is-playing");

      const timer = window.setTimeout(() => {
        image.removeAttribute("src");
      }, gifFadeDuration);

      stopTimers.set(image, timer);
    };

    const playGifOnDesktop = () => {
      if (!isMobileScene()) playGif();
    };
    const pauseGifOnDesktop = () => {
      if (!isMobileScene()) pauseGif();
    };

    card.addEventListener("pointerenter", playGifOnDesktop);
    card.addEventListener("pointerleave", pauseGifOnDesktop);
    card.addEventListener("focusin", playGifOnDesktop);
    card.addEventListener("focusout", pauseGifOnDesktop);
  }

  observeMobileViewportEffect(card, {
    onEnter: playGif,
    onExit: pauseGif
  });
};

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

const normalizeTapeTextureKey = (value) => {
  const cleanKey = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^.*\//, "")
    .replace(/\.(?:png|jpe?g|webp)$/i, "");

  return tapeTextureKeys.includes(cleanKey) ? cleanKey : defaultTapeTextureKey;
};

const getTapeTextureUrl = (textureKey) => `assets/img/${normalizeTapeTextureKey(textureKey)}.png`;

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

const isTapeEnabled = (video = {}) => (
  video.tape_enabled === true
  || String(video.tape_enabled || "").toLowerCase() === "true"
);

const getTapeSortOrder = (video = {}) => {
  const order = Number.parseInt(video.tape_sort_order, 10);

  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
};

const compareTapeItems = (a, b) => {
  const orderDifference = getTapeSortOrder(a) - getTapeSortOrder(b);

  if (orderDifference) return orderDifference;

  return new Date(b.created_at || 0) - new Date(a.created_at || 0);
};

const getTapeLabel = (video = {}) => (
  String(video.tape_title || video.title || "Untitled tape").trim() || "Untitled tape"
);

const getTapeItems = (videos = []) => videos
  .filter(isTapeEnabled)
  .slice()
  .sort(compareTapeItems);

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

const createTapeEmptyState = () => {
  const empty = document.createElement("div");

  empty.className = "vhs-menu__empty";
  empty.textContent = "No tapes";

  return empty;
};

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

const renderPortfolio = (videos) => {
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

    setupPortfolioGif(card, thumb, gifUrl);
    body.append(title);
    card.append(body, thumb);
    portfolioGrid.append(card);
  });
};

if (galleryStrips.length || portfolioGrid || vhsMenuContent) {
  loadPublicMedia()
    .then(({ gallery, videos }) => {
      renderGallery(gallery);
      renderPortfolio(videos);
      renderVhsTapes(videos);
      setupGalleryScroller();
    })
    .catch((error) => {
      console.error("Public media Supabase error:", error);
      renderGallery([]);
      renderPortfolio([]);
      renderVhsTapes([]);
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

  const syncMobileAudioMute = () => {
    const muted = isMobileScene();

    tvNoise.muted = muted;
    tvPowerClick.muted = muted;

    if (!muted) return;

    window.cancelAnimationFrame(noiseFadeFrame);
    noiseFadeFrame = null;
    noiseStarted = false;
    targetNoiseVolume = 0;
    tvNoise.volume = 0;
    tvNoise.pause();
    tvPowerClick.pause();
    tvPowerClick.currentTime = 0;
  };

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
    if (isMobileScene()) return;
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
    if (isMobileScene()) return;
    if (!tvPowerClick) return;

    tvPowerClick.pause();
    tvPowerClick.currentTime = 0;
    tvPowerClick.playbackRate = tvPowerClickPlaybackRate;
    tvPowerClick.play().catch(() => {});
  };

  const powerOnTv = ({ startAudio = true } = {}) => {
    window.clearTimeout(tvShutdownTimer);
    tvPoweredOn = true;
    tvContent.classList.remove("is-switching-off");
    tvContent.classList.add("is-on");
    tvBloom.classList.add("is-on");
    tvPowerButton.classList.add("is-on");
    tvPowerButton.setAttribute("aria-label", "Turn TV off");
    tvPowerButton.setAttribute("aria-pressed", "true");

    if (startAudio) {
      startNoise();
    }
  };

  const powerOffTv = () => {
    if (isMobileScene()) {
      powerOnTv({ startAudio: false });
      tvPowerButton.setAttribute("aria-label", "TV is on");
      return;
    }

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

    if (isMobileScene()) {
      powerOnTv({ startAudio: false });
      tvPowerButton.setAttribute("aria-label", "TV is on");
      return;
    }

    if (tvPoweredOn) {
      powerOffTv();
      return;
    }

    powerOnTv();
  });

  tvNoiseController = {
    fadeIn: () => {
      if (isMobileScene()) return;
      if (!tvPoweredOn) return;
      if (isTapeVideoPlaying) return;

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
    silence: () => {
      window.cancelAnimationFrame(noiseFadeFrame);
      noiseFadeFrame = null;
      targetNoiseVolume = 0;
      noiseStarted = false;
      tvNoise.volume = 0;
      tvNoise.pause();
    },
  };

  tvPowerController = {
    powerOn: powerOnTv,
    powerOff: powerOffTv,
    isOn: () => tvPoweredOn,
  };

  const syncMobileTvState = () => {
    syncMobileAudioMute();
    scene?.classList.toggle("is-mobile-scene", isMobileScene());

    if (!isMobileScene()) {
      tvPowerButton.setAttribute("aria-label", tvPoweredOn ? "Turn TV off" : "Turn TV on");
      return;
    }

    vhsMenu?.classList.remove("is-open");
    vhsMenu?.setAttribute("aria-hidden", "true");
    vhsTrigger?.setAttribute("aria-expanded", "false");
    resetVcrState();
    powerOnTv({ startAudio: false });
    tvPowerButton.setAttribute("aria-label", "TV is on");
  };

  syncMobileTvState();
  if (typeof mobileSceneQuery.addEventListener === "function") {
    mobileSceneQuery.addEventListener("change", syncMobileTvState);
  } else {
    mobileSceneQuery.addListener(syncMobileTvState);
  }
}

const getTapeVideo = (cassette) => ({
  id: cassette.dataset.tapeId || "",
  title: cassette.dataset.videoTitle || "Tape",
  vimeoId: (cassette.dataset.vimeoId || "").trim(),
  vimeoUrl: (cassette.dataset.vimeoUrl || "").trim(),
  videoSrc: (cassette.dataset.videoSrc || "").trim(),
});

const getVimeoPlayerSrc = (vimeoId) => {
  const cleanId = vimeoId
    .replace(/^https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?/i, "")
    .split(/[/?#]/)[0];

  return `https://player.vimeo.com/video/${encodeURIComponent(cleanId)}?autoplay=1&muted=1&playsinline=1&title=0&byline=0&portrait=0&autopause=0&dnt=1&controls=0&api=1&player_id=vhs-tv-player`;
};

const setTapeControlsVisible = (isVisible) => {
  if (!tapePlayerControls) return;

  tapePlayerControls.hidden = !isVisible;
};

const postVimeoPlayerCommand = (iframe, method, value) => {
  if (!iframe?.contentWindow) return;

  iframe.contentWindow.postMessage(JSON.stringify({ method, value }), "https://player.vimeo.com");
};

const syncTapeAudioButton = () => {
  if (!tapeUnmuteButton) return;

  const isSoundOn = !isTapeAudioMuted;

  tapeUnmuteButton.classList.toggle("is-active", isSoundOn);
  tapeUnmuteButton.setAttribute("aria-pressed", String(isSoundOn));
  tapeUnmuteButton.setAttribute("aria-label", isSoundOn ? "Mute tape video" : "Unmute tape video");
};

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

const toggleTapePlayerAudio = () => {
  setTapeAudioMuted(!isTapeAudioMuted);
};

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

resumeTapeInlinePlayer = () => {
  seekAndResumeTapeInlinePlayer(tapePlaybackTime);
};

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
    syncTape: true,
    startTime
  });

  if (didOpen) {
    shouldResumeTapeAfterModalClose = true;
    pauseTapeInlinePlayer();
  }
};

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
  tapePlaybackTime = 0;
  tapeInlineVimeoPlayer = null;
  tapeInlineVideoElement = null;
  resetTapeModalPlayer();
  isTapeVideoPlaying = hasTapeVideo;
  tvPowerController?.powerOn({ startAudio: !hasTapeVideo });
  if (hasTapeVideo) {
    tvNoiseController?.silence();
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
  isTapeVideoPlaying = false;
  tapePlaybackTime = 0;
  tapeInlineVimeoPlayer = null;
  tapeInlineVideoElement = null;
  resetTapeModalPlayer();
  delete tapePlayer.dataset.activeTape;
  delete tapePlayer.dataset.modalEmbedSrc;
  tapePlayer.removeAttribute("aria-label");
  setTapeAudioMuted(true);
  setTapeControlsVisible(false);
  tvNoiseController?.fadeIn();
};

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

if (vhsTrigger && vhsMenu) {
  const tapeInsertDuration = 620;
  const tapeFlyAwayDuration = 780;
  const tapeReturnHomeDuration = 360;
  const slotCloseDuration = 520;
  let activeTapeDrag = null;
  let insertedCassette = null;
  let slotResetTimer;

  const openVhsMenu = () => {
    if (isMobileScene()) {
      closeVhsMenu();
      return;
    }

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
    playTapeInsertSound();

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
    setVcrDisplayMode(drag.previousVcrMode === "play" ? "play" : "clock");

    window.setTimeout(() => {
      drag.ghost.remove();
      drag.cassette.classList.remove("is-picked");
    }, tapeReturnHomeDuration);
  };

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
  const pullThreshold = 420;
  const queuedScrollThreshold = 680;
  const queuedScrollStartDelay = 240;
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

  const shouldUseSectionScroller = () => !isMobileScene();
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
    siteMenu?.classList.toggle("is-contact-section", activeId === "contact");

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

  const resetQueuedScroll = () => {
    queuedScrollDirection = 0;
    queuedScrollAmount = 0;
  };

  const canMoveToTarget = (direction) => {
    const nextIndex = activeTargetIndex + direction;

    return nextIndex >= 0 && nextIndex < targets.length;
  };

  const canQueueChainedScroll = () => (
    !isTransitioning || performance.now() - transitionStartedAt >= queuedScrollStartDelay
  );

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

  const suppressTrailingInput = () => {
    if (postTransitionInputCooldown <= 0) return;

    trailingInputUntil = performance.now() + postTransitionInputCooldown;
  };

  const isTrailingInputSuppressed = () => performance.now() < trailingInputUntil;

  const clearTransitionFinish = () => {
    window.clearTimeout(transitionFinishTimer);

    if (transitionFinishFrame) {
      window.cancelAnimationFrame(transitionFinishFrame);
      transitionFinishFrame = null;
    }
  };

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

      if (isScrollLocked()) {
        event.preventDefault();
        resetPull();
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
        queueSectionScroll(direction, deltaY);
        return;
      }

      if (isTrailingInputSuppressed()) {
        event.preventDefault();
        resetPull();
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

  menuLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const sectionId = link.getAttribute("href")?.slice(1);
      const targetIndex = targets.findIndex((target) => target.id === sectionId);

      if (targetIndex === -1) return;
      if (!shouldUseSectionScroller()) return;

      event.preventDefault();
      goToTarget(targetIndex, { showLoader: false });
    });
  });

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

  if (typeof mobileSceneQuery.addEventListener === "function") {
    mobileSceneQuery.addEventListener("change", syncSectionScrollerMode);
  } else if (typeof mobileSceneQuery.addListener === "function") {
    mobileSceneQuery.addListener(syncSectionScrollerMode);
  }

  syncSectionScrollerMode();
}
