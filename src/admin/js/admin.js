const config = window.CINEMORPH_ADMIN_CONFIG || {};
const panelTitles = {
  messages: "Messages",
  gallery: "Gallery",
  videos: "Videos"
};
const linkPreviewStorageKey = "cinemorph-admin-link-preview";
const getInitialLinkPreviewEnabled = () => {
  try {
    return window.localStorage.getItem(linkPreviewStorageKey) !== "off";
  } catch {
    return true;
  }
};

const state = {
  activePanel: "messages",
  authSession: null,
  isSigningOut: false,
  messageFilter: "active",
  messages: [],
  gallery: [],
  galleryFocus: {
    x: 50,
    y: 50
  },
  galleryCrop: {
    x: 50,
    y: 50,
    zoom: 1
  },
  galleryPreview: {
    file: null,
    url: "",
    width: 0,
    height: 0,
    token: 0
  },
  videos: [],
  videoEdit: {
    id: null,
    isSaving: false
  },
  pendingDelete: null,
  posterPicker: {
    player: null,
    vimeoKey: "",
    duration: 0,
    currentTime: 0,
    selectedTime: null,
    mode: "",
    initToken: 0,
    seekToken: 0,
    urlTimer: null
  },
  videoPreview: {
    urls: []
  },
  linkPreview: {
    enabled: getInitialLinkPreviewEnabled(),
    activeAnchor: null,
    pointer: { x: 0, y: 0 },
    token: 0,
    showTimer: null,
    vimeoCache: new Map()
  }
};

const dom = {
  shell: document.querySelector("[data-admin-shell]"),
  authScreen: document.querySelector("[data-auth-screen]"),
  loginForm: document.querySelector("[data-login-form]"),
  loginSubmit: document.querySelector("[data-login-submit]"),
  authError: document.querySelector("[data-auth-error]"),
  mode: document.querySelector("[data-admin-mode]"),
  panelTitle: document.querySelector("[data-panel-title]"),
  navItems: Array.from(document.querySelectorAll("[data-panel-target]")),
  panels: Array.from(document.querySelectorAll("[data-panel]")),
  refresh: document.querySelector("[data-refresh]"),
  messageCount: document.querySelector("[data-message-count]"),
  videoTotal: document.querySelector("[data-video-total]"),
  photoTotal: document.querySelector("[data-photo-total]"),
  watcherOpen: document.querySelector("[data-watcher-open]"),
  linkPreviewToggle: document.querySelector("[data-link-preview-toggle]"),
  linkPreview: document.querySelector("[data-link-preview]"),
  watcherModal: document.querySelector("[data-watcher-modal]"),
  watcherSummary: document.querySelector("[data-watcher-summary]"),
  watcherList: document.querySelector("[data-watcher-list]"),
  messageFilters: document.querySelector("[data-message-filters]"),
  messageList: document.querySelector("[data-message-list]"),
  galleryForm: document.querySelector("[data-gallery-form]"),
  galleryPreview: document.querySelector("[data-gallery-preview]"),
  galleryFocusPanel: document.querySelector("[data-gallery-focus-panel]"),
  galleryFocusPreview: document.querySelector("[data-gallery-focus-preview]"),
  galleryFocusReadout: document.querySelector("[data-gallery-focus-readout]"),
  galleryFocusReset: document.querySelector("[data-gallery-focus-reset]"),
  galleryCropPanel: document.querySelector("[data-gallery-crop-panel]"),
  galleryCropStage: document.querySelector("[data-gallery-crop-stage]"),
  galleryCropReadout: document.querySelector("[data-gallery-crop-readout]"),
  galleryCropX: document.querySelector("[data-gallery-crop-x]"),
  galleryCropY: document.querySelector("[data-gallery-crop-y]"),
  galleryCropZoom: document.querySelector("[data-gallery-crop-zoom]"),
  galleryCropReset: document.querySelector("[data-gallery-crop-reset]"),
  galleryList: document.querySelector("[data-gallery-list]"),
  videoForm: document.querySelector("[data-video-form]"),
  videoPreview: document.querySelector("[data-video-preview]"),
  tapeOrderList: document.querySelector("[data-tape-order-list]"),
  tapeOrderCount: document.querySelector("[data-tape-order-count]"),
  tapeOrderStatus: document.querySelector("[data-tape-order-status]"),
  videoTapePreview: document.querySelector("[data-video-tape-preview]"),
  tapePicker: document.querySelector("[data-tape-picker]"),
  tapePickerMode: document.querySelector("[data-tape-picker-mode]"),
  tapeTextureOptions: document.querySelector("[data-tape-texture-options]"),
  tapeTitleInput: document.querySelector("[data-tape-title-input]"),
  posterPicker: document.querySelector("[data-poster-picker]"),
  posterPlayer: document.querySelector("[data-poster-player]"),
  posterControls: document.querySelector("[data-poster-controls]"),
  posterSlider: document.querySelector("[data-poster-time-slider]"),
  posterCurrentTime: document.querySelector("[data-poster-current-time]"),
  posterDuration: document.querySelector("[data-poster-duration]"),
  posterSelection: document.querySelector("[data-poster-selection]"),
  posterModeLabel: document.querySelector("[data-poster-mode-label]"),
  posterMessage: document.querySelector("[data-poster-picker-message]"),
  posterUseFrame: document.querySelector("[data-use-poster-frame]"),
  videoList: document.querySelector("[data-video-list]"),
  videoEditModal: document.querySelector("[data-video-edit-modal]"),
  videoEditSummary: document.querySelector("[data-video-edit-summary]"),
  videoEditForm: document.querySelector("[data-video-edit-form]"),
  logout: document.querySelector("[data-logout]"),
  toast: document.querySelector("[data-toast]"),
  deleteModal: document.querySelector("[data-delete-modal]"),
  deleteMessageTitle: document.querySelector("[data-delete-message-title]")
};

const hasSupabaseConfig = () => Boolean(config.supabase?.url && config.supabase?.anonKey);
const isAuthEnabled = () => config.authEnabled !== false;
const getPosterGenerationEndpoint = () => (
  config.posterGeneration?.endpoint || config.posterGenerationFunctionUrl || "/.netlify/functions/generate-vimeo-poster"
);

const setConnectionStatus = (status, message) => {
  if (!dom.mode) return;

  dom.mode.classList.remove("is-checking", "is-connected", "is-error", "is-warning");
  dom.mode.classList.add(`is-${status}`);
  dom.mode.textContent = message;
  dom.mode.removeAttribute("title");
};

const setAuthError = (message = "") => {
  if (!dom.authError) return;

  dom.authError.textContent = message;
  dom.authError.hidden = !message;
};

const setAuthLoading = (isLoading) => {
  if (dom.loginSubmit) {
    dom.loginSubmit.toggleAttribute("disabled", isLoading);
    const label = dom.loginSubmit.querySelector("span");

    if (label) {
      label.textContent = isLoading ? "Signing in" : "Sign in";
    }
  }
};

const setAdminVisibility = (isSignedIn) => {
  const shouldShowAdmin = !isAuthEnabled() || isSignedIn;

  if (dom.shell) {
    dom.shell.hidden = !shouldShowAdmin;
  }

  if (dom.authScreen) {
    dom.authScreen.hidden = shouldShowAdmin;
  }

  if (dom.logout) {
    dom.logout.hidden = !isAuthEnabled() || !isSignedIn;
  }
};

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const splitTrailingUrlPunctuation = (value) => {
  let url = value;
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

const getSafeMessageLinkHref = (value) => {
  const normalized = /^www\./i.test(value) ? `https://${value}` : value;

  try {
    const url = new URL(normalized);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    return url.href;
  } catch {
    return "";
  }
};

const renderMessageText = (value) => {
  const text = String(value ?? "");
  const urlPattern = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
  let output = "";
  let lastIndex = 0;

  for (const match of text.matchAll(urlPattern)) {
    const index = match.index ?? 0;
    const rawMatch = match[0];
    const { url, trailing } = splitTrailingUrlPunctuation(rawMatch);
    const href = getSafeMessageLinkHref(url);

    output += escapeHtml(text.slice(lastIndex, index));
    output += href
      ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${escapeHtml(url)}</a>${escapeHtml(trailing)}`
      : escapeHtml(rawMatch);

    lastIndex = index + rawMatch.length;
  }

  output += escapeHtml(text.slice(lastIndex));

  return output.replace(/\r?\n/g, "<br>");
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

const getStoredReferenceItems = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) return parsed;
    } catch {}

    return trimmed.split(/\s+/);
  }

  return [];
};

const normalizeReferenceLinks = (value) => {
  const links = [];

  getStoredReferenceItems(value).forEach((item) => {
    const rawUrl = typeof item === "string"
      ? item
      : item?.url || item?.href || item?.link || "";
    const { url } = splitTrailingUrlPunctuation(rawUrl);
    const href = getSafeMessageLinkHref(url);

    if (!href || links.some((link) => link.url.toLowerCase() === href.toLowerCase())) {
      return;
    }

    const rawTitle = typeof item === "object" && item?.title ? String(item.title).trim() : "";

    links.push({
      url: href,
      title: rawTitle || getReferenceLinkTitle(href)
    });
  });

  return links;
};

const renderReferenceLinks = (links) => {
  if (!links.length) return "";

  return `
    <div class="message-references" aria-label="Reference links">
      <span class="message-references__label">References</span>
      <div class="reference-card-list">
        ${links.map((link, index) => `
          <a class="reference-card" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer noopener" aria-label="Open reference ${escapeHtml(link.title)}">
            <span class="reference-card__number">${String(index + 1).padStart(2, "0")}</span>
            <span class="reference-card__body">
              <span class="reference-card__title">${escapeHtml(link.title)}</span>
              <span class="reference-card__url">${escapeHtml(getReferenceLinkHost(link.url))}</span>
            </span>
          </a>
        `).join("")}
      </div>
    </div>
  `;
};

const getMessageReferenceLinks = (message) => (
  normalizeReferenceLinks(message.reference_links ?? message.references ?? message.referenceLinks)
);

const getLinkPreviewHost = (value) => {
  try {
    return new URL(value).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
};

const isPreviewImageUrl = (value) => {
  try {
    const url = new URL(value);

    return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
};

const getYouTubeVideoId = (value) => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const segments = url.pathname.split("/").filter(Boolean);

    if (host === "youtu.be") return segments[0] || "";
    if (!host.endsWith("youtube.com")) return "";
    if (url.searchParams.get("v")) return url.searchParams.get("v") || "";
    if (["embed", "shorts", "live"].includes(segments[0])) return segments[1] || "";

    return "";
  } catch {
    return "";
  }
};

const getVimeoVideoId = (value) => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const segments = url.pathname.split("/").filter(Boolean);

    if (host !== "vimeo.com" && host !== "player.vimeo.com") return "";

    if (host === "player.vimeo.com") {
      const videoSegmentIndex = segments.indexOf("video");

      return /^\d+$/.test(segments[videoSegmentIndex + 1] || "") ? segments[videoSegmentIndex + 1] : "";
    }

    const manageVideosIndex = segments.findIndex((segment, index) => (
      segment === "manage" && segments[index + 1] === "videos"
    ));

    if (manageVideosIndex >= 0 && /^\d+$/.test(segments[manageVideosIndex + 2] || "")) {
      return segments[manageVideosIndex + 2];
    }

    const videoSegmentIndex = segments.indexOf("video");

    if (videoSegmentIndex >= 0 && /^\d+$/.test(segments[videoSegmentIndex + 1] || "")) {
      return segments[videoSegmentIndex + 1];
    }

    return segments.find((segment) => /^\d+$/.test(segment)) || "";
  } catch {
    return "";
  }
};

const getAnchorPreviewImage = (anchor) => {
  const explicitImage = String(anchor.dataset.linkPreviewImage || "").trim();

  if (explicitImage) return explicitImage;

  const image = anchor.querySelector("img");

  return image?.currentSrc || image?.src || "";
};

const getLinkPreviewDescriptor = (anchor) => {
  const href = getSafeMessageLinkHref(anchor.href || "");

  if (!href) return null;

  const host = getLinkPreviewHost(href);
  const anchorImage = getAnchorPreviewImage(anchor);

  if (anchorImage) {
    return {
      type: anchor.dataset.linkPreviewType || (getVimeoVideoId(href) ? "Vimeo" : "Image"),
      host,
      imageUrl: anchorImage,
      fallbackImageUrl: "",
      sourceUrl: href
    };
  }

  if (isPreviewImageUrl(href)) {
    return {
      type: "Image",
      host,
      imageUrl: href,
      fallbackImageUrl: "",
      sourceUrl: href
    };
  }

  const youTubeId = getYouTubeVideoId(href);

  if (youTubeId) {
    return {
      type: "YouTube",
      host,
      imageUrl: `https://i.ytimg.com/vi/${encodeURIComponent(youTubeId)}/maxresdefault.jpg`,
      fallbackImageUrl: `https://i.ytimg.com/vi/${encodeURIComponent(youTubeId)}/hqdefault.jpg`,
      sourceUrl: href
    };
  }

  const vimeoId = getVimeoVideoId(href);

  if (vimeoId) {
    return {
      type: "Vimeo",
      host,
      imageUrl: `https://vumbnail.com/${encodeURIComponent(vimeoId)}.jpg`,
      fallbackImageUrl: "",
      sourceUrl: href,
      vimeoId
    };
  }

  return null;
};

const getVimeoOembedPoster = async (descriptor) => {
  if (!descriptor?.vimeoId) return "";

  const cacheKey = descriptor.sourceUrl;

  if (state.linkPreview.vimeoCache.has(cacheKey)) {
    return state.linkPreview.vimeoCache.get(cacheKey);
  }

  try {
    const url = new URL("https://vimeo.com/api/oembed.json");

    url.searchParams.set("url", descriptor.sourceUrl);
    const response = await fetch(url);

    if (!response.ok) throw new Error("Vimeo oEmbed failed");

    const data = await response.json();
    const poster = String(data.thumbnail_url || "").trim();

    if (poster) {
      state.linkPreview.vimeoCache.set(cacheKey, poster);
      return poster;
    }
  } catch {}

  state.linkPreview.vimeoCache.set(cacheKey, descriptor.imageUrl);
  return descriptor.imageUrl;
};

const setLinkPreviewToggleState = () => {
  if (!dom.linkPreviewToggle) return;

  const isEnabled = state.linkPreview.enabled;

  dom.linkPreviewToggle.classList.toggle("is-connected", isEnabled);
  dom.linkPreviewToggle.classList.toggle("is-muted", !isEnabled);
  dom.linkPreviewToggle.setAttribute("aria-pressed", String(isEnabled));
  dom.linkPreviewToggle.textContent = isEnabled ? "H/Link: ON" : "H/Link: OFF";
};

const setLinkPreviewEnabled = (isEnabled) => {
  state.linkPreview.enabled = Boolean(isEnabled);

  try {
    window.localStorage.setItem(linkPreviewStorageKey, state.linkPreview.enabled ? "on" : "off");
  } catch {}

  setLinkPreviewToggleState();

  if (!state.linkPreview.enabled) {
    hideLinkPreview();
  }
};

const positionLinkPreview = (event) => {
  if (!dom.linkPreview || dom.linkPreview.hidden) return;

  const x = event?.clientX ?? state.linkPreview.pointer.x;
  const y = event?.clientY ?? state.linkPreview.pointer.y;

  state.linkPreview.pointer = { x, y };

  const gap = 18;
  const edge = 12;
  const rect = dom.linkPreview.getBoundingClientRect();
  let left = x + gap;
  let top = y + gap;

  if (left + rect.width > window.innerWidth - edge) {
    left = x - rect.width - gap;
  }

  if (top + rect.height > window.innerHeight - edge) {
    top = y - rect.height - gap;
  }

  dom.linkPreview.style.left = `${Math.max(edge, left)}px`;
  dom.linkPreview.style.top = `${Math.max(edge, top)}px`;
};

const renderLinkPreview = (descriptor) => {
  if (!dom.linkPreview || !descriptor?.imageUrl) return;

  const type = descriptor.type || "Preview";
  const host = descriptor.host || getLinkPreviewHost(descriptor.sourceUrl);

  dom.linkPreview.innerHTML = `
    <div class="link-preview-popover__media">
      <img src="${escapeHtml(descriptor.imageUrl)}" alt="" aria-hidden="true">
    </div>
    <div class="link-preview-popover__meta">
      <span class="link-preview-popover__type">${escapeHtml(type)}</span>
      <span class="link-preview-popover__host">${escapeHtml(host)}</span>
    </div>
  `;

  const image = dom.linkPreview.querySelector("img");

  if (image && descriptor.fallbackImageUrl) {
    image.addEventListener("error", () => {
      if (image.src !== descriptor.fallbackImageUrl) {
        image.src = descriptor.fallbackImageUrl;
      }
    }, { once: true });
  }

  dom.linkPreview.hidden = false;
  window.requestAnimationFrame(() => {
    positionLinkPreview();
    dom.linkPreview.classList.add("is-visible");
  });
};

function hideLinkPreview() {
  window.clearTimeout(state.linkPreview.showTimer);
  state.linkPreview.activeAnchor = null;
  state.linkPreview.token += 1;

  if (!dom.linkPreview) return;

  dom.linkPreview.classList.remove("is-visible");
  dom.linkPreview.hidden = true;
  dom.linkPreview.innerHTML = "";
}

const showLinkPreview = (anchor, event) => {
  if (!state.linkPreview.enabled || !dom.linkPreview || !anchor) return;

  const descriptor = getLinkPreviewDescriptor(anchor);

  if (!descriptor) return;

  window.clearTimeout(state.linkPreview.showTimer);
  state.linkPreview.activeAnchor = anchor;
  state.linkPreview.pointer = {
    x: event?.clientX ?? state.linkPreview.pointer.x,
    y: event?.clientY ?? state.linkPreview.pointer.y
  };

  const token = state.linkPreview.token + 1;
  state.linkPreview.token = token;
  state.linkPreview.showTimer = window.setTimeout(async () => {
    if (state.linkPreview.token !== token || state.linkPreview.activeAnchor !== anchor) return;

    renderLinkPreview(descriptor);

    if (descriptor.vimeoId) {
      const poster = await getVimeoOembedPoster(descriptor);

      if (poster && state.linkPreview.token === token && state.linkPreview.activeAnchor === anchor) {
        renderLinkPreview({ ...descriptor, imageUrl: poster });
      }
    }
  }, 120);
};

const isClientMessagePreviewAnchor = (anchor) => (
  Boolean(anchor)
  && Boolean(dom.messageList?.contains(anchor))
  && Boolean(anchor.closest(".message-card"))
  && (
    anchor.classList.contains("reference-card")
    || Boolean(anchor.closest(".message-text"))
  )
);

const getPreviewAnchorFromEvent = (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const anchor = target?.closest("a[href]");

  if (!anchor || dom.linkPreview?.contains(anchor)) return null;
  if (!isClientMessagePreviewAnchor(anchor)) return null;

  return anchor;
};

const isLinkPreviewSuppressed = () => (
  document.body.classList.contains("is-gallery-card-dragging")
  || document.body.classList.contains("is-video-card-dragging")
);

const handleLinkPreviewPointerOver = (event) => {
  if (event.pointerType === "touch") return;
  if (isLinkPreviewSuppressed()) return;

  const anchor = getPreviewAnchorFromEvent(event);

  if (!anchor || anchor === state.linkPreview.activeAnchor) return;

  showLinkPreview(anchor, event);
};

const handleLinkPreviewPointerMove = (event) => {
  if (event.pointerType === "touch") return;

  if (isLinkPreviewSuppressed()) {
    hideLinkPreview();
    return;
  }

  if (state.linkPreview.activeAnchor) {
    positionLinkPreview(event);
  }
};

const handleLinkPreviewPointerOut = (event) => {
  const anchor = state.linkPreview.activeAnchor;

  if (!anchor) return;
  if (event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget)) return;

  hideLinkPreview();
};

const formatDate = (value) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
}).format(new Date(value));

const showToast = (message) => {
  if (!dom.toast) return;

  window.clearTimeout(showToast.timer);
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");

  showToast.timer = window.setTimeout(() => {
    dom.toast.classList.remove("is-visible");
  }, 2600);
};

const getContactHref = (contact) => {
  const cleanContact = String(contact || "").trim();

  if (!cleanContact) return "#";
  if (cleanContact.includes("@")) return `mailto:${cleanContact}`;

  return `tel:${cleanContact.replace(/[^\d+]/g, "")}`;
};

const sanitizeFileName = (name) => String(name || "upload")
  .toLowerCase()
  .replace(/[^a-z0-9._-]+/g, "-")
  .replace(/^-+|-+$/g, "");

const galleryFormat = {
  placement: "17:9",
  label: "17:9",
  previewClass: "gallery",
  storageFolder: "stills"
};

const getGalleryFormat = () => galleryFormat;
const galleryFocusDefault = { x: 50, y: 50 };
const galleryCropDefault = { x: 50, y: 50, zoom: 1 };
const galleryCropMaxZoom = 3;
const galleryTargetRatio = 17 / 9;

const normalizeGalleryFocusValue = (value) => {
  const number = Number.parseFloat(value);

  if (!Number.isFinite(number)) return 50;

  return Math.max(0, Math.min(100, Math.round(number)));
};

const getGalleryFocus = (item = {}) => ({
  x: normalizeGalleryFocusValue(item.focus_x ?? item.x ?? galleryFocusDefault.x),
  y: normalizeGalleryFocusValue(item.focus_y ?? item.y ?? galleryFocusDefault.y)
});

const getGalleryFocusStyle = (item = {}) => {
  const focus = getGalleryFocus(item);

  return `object-position: ${focus.x}% ${focus.y}%; transform-origin: ${focus.x}% ${focus.y}%;`;
};

const normalizeGalleryCropValue = (value) => {
  const number = Number.parseFloat(value);

  if (!Number.isFinite(number)) return 50;

  return Math.max(0, Math.min(100, Math.round(number * 10) / 10));
};

const normalizeGalleryCropZoom = (value) => {
  const number = Number.parseFloat(value);

  if (!Number.isFinite(number)) return 1;

  return Math.max(1, Math.min(galleryCropMaxZoom, Math.round(number * 100) / 100));
};

const getGalleryCrop = (item = {}) => ({
  x: normalizeGalleryCropValue(item.x ?? galleryCropDefault.x),
  y: normalizeGalleryCropValue(item.y ?? galleryCropDefault.y),
  zoom: normalizeGalleryCropZoom(item.zoom ?? galleryCropDefault.zoom)
});

const getGalleryCropWindow = (source = state.galleryPreview, item = state.galleryCrop) => {
  const width = Number(source?.width) || 0;
  const height = Number(source?.height) || 0;
  const crop = getGalleryCrop(item);

  if (!width || !height) {
    return {
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      centerX: crop.x,
      centerY: crop.y
    };
  }

  const sourceRatio = width / height;
  let cropWidth = 100;
  let cropHeight = 100;

  if (sourceRatio > galleryTargetRatio) {
    cropWidth = (galleryTargetRatio / sourceRatio) * 100;
  } else if (sourceRatio < galleryTargetRatio) {
    cropHeight = (sourceRatio / galleryTargetRatio) * 100;
  }

  cropWidth /= crop.zoom;
  cropHeight /= crop.zoom;

  const left = Math.max(0, Math.min(crop.x - cropWidth / 2, 100 - cropWidth));
  const top = Math.max(0, Math.min(crop.y - cropHeight / 2, 100 - cropHeight));

  return {
    left,
    top,
    width: cropWidth,
    height: cropHeight,
    centerX: left + cropWidth / 2,
    centerY: top + cropHeight / 2
  };
};

const isGalleryCropWindow = (item = {}) => (
  Number.isFinite(Number(item.left))
  && Number.isFinite(Number(item.top))
  && Number.isFinite(Number(item.width))
  && Number.isFinite(Number(item.height))
);

const getGalleryCropPlacement = (cropWindow = getGalleryCropWindow()) => {
  const width = Math.max(0.0001, Number(cropWindow.width) || 100);
  const height = Math.max(0.0001, Number(cropWindow.height) || 100);
  const left = Number(cropWindow.left) || 0;
  const top = Number(cropWindow.top) || 0;

  return {
    imageWidth: `${10000 / width}%`,
    imageHeight: `${10000 / height}%`,
    imageLeft: `${-(left / width) * 100}%`,
    imageTop: `${-(top / height) * 100}%`
  };
};

const applyGalleryCropPlacement = (element, cropWindow) => {
  if (!element) return;

  const placement = getGalleryCropPlacement(cropWindow);

  element.style.setProperty("--crop-window-left", `${cropWindow.left}%`);
  element.style.setProperty("--crop-window-top", `${cropWindow.top}%`);
  element.style.setProperty("--crop-window-width", `${cropWindow.width}%`);
  element.style.setProperty("--crop-window-height", `${cropWindow.height}%`);
  element.style.setProperty("--crop-image-width", placement.imageWidth);
  element.style.setProperty("--crop-image-height", placement.imageHeight);
  element.style.setProperty("--crop-image-left", placement.imageLeft);
  element.style.setProperty("--crop-image-top", placement.imageTop);
};

const getGalleryCropPixelWindow = (sourceWidth, sourceHeight, item = state.galleryCrop) => {
  const cleanWidth = Math.max(1, Math.round(Number(sourceWidth) || 0));
  const cleanHeight = Math.max(1, Math.round(Number(sourceHeight) || 0));
  const sourceRatio = cleanWidth / cleanHeight;
  const crop = getGalleryCrop(item);
  let cropWidth = cleanWidth;
  let cropHeight = cleanHeight;
  let centerX = (crop.x / 100) * cleanWidth;
  let centerY = (crop.y / 100) * cleanHeight;

  if (isGalleryCropWindow(item)) {
    cropWidth = (Math.max(0.0001, Number(item.width)) / 100) * cleanWidth;
    cropHeight = (Math.max(0.0001, Number(item.height)) / 100) * cleanHeight;
    centerX = ((Number(item.centerX) || (Number(item.left) + Number(item.width) / 2)) / 100) * cleanWidth;
    centerY = ((Number(item.centerY) || (Number(item.top) + Number(item.height) / 2)) / 100) * cleanHeight;
  } else if (sourceRatio > galleryTargetRatio) {
    cropWidth = cleanHeight * galleryTargetRatio;
  } else if (sourceRatio < galleryTargetRatio) {
    cropHeight = cleanWidth / galleryTargetRatio;
  }

  if (!isGalleryCropWindow(item)) {
    cropWidth /= crop.zoom;
    cropHeight /= crop.zoom;
  }

  if (cropWidth / cropHeight > galleryTargetRatio) {
    cropWidth = cropHeight * galleryTargetRatio;
  } else {
    cropHeight = cropWidth / galleryTargetRatio;
  }

  let pixelWidth = Math.max(1, Math.min(cleanWidth, Math.round(cropWidth)));
  let pixelHeight = Math.max(1, Math.min(cleanHeight, Math.round(pixelWidth / galleryTargetRatio)));

  if (pixelHeight > cleanHeight) {
    pixelHeight = cleanHeight;
    pixelWidth = Math.max(1, Math.min(cleanWidth, Math.round(pixelHeight * galleryTargetRatio)));
  }

  const sourceX = Math.max(0, Math.min(Math.round(centerX - pixelWidth / 2), cleanWidth - pixelWidth));
  const sourceY = Math.max(0, Math.min(Math.round(centerY - pixelHeight / 2), cleanHeight - pixelHeight));

  return {
    sourceX,
    sourceY,
    sourceWidth: pixelWidth,
    sourceHeight: pixelHeight
  };
};

const getGalleryCropLabel = (crop = state.galleryCrop) => {
  const cleanCrop = getGalleryCrop(crop);

  return `${galleryFormat.label} / X ${cleanCrop.x}% / Y ${cleanCrop.y}% / Z ${cleanCrop.zoom.toFixed(2)}x`;
};

const syncGalleryFocusUi = () => {
  const focus = getGalleryFocus(state.galleryFocus);

  state.galleryFocus = focus;

  if (dom.galleryForm?.elements.focus_x) {
    dom.galleryForm.elements.focus_x.value = String(focus.x);
  }

  if (dom.galleryForm?.elements.focus_y) {
    dom.galleryForm.elements.focus_y.value = String(focus.y);
  }

  if (dom.galleryFocusPanel) {
    dom.galleryFocusPanel.style.setProperty("--focus-x", `${focus.x}%`);
    dom.galleryFocusPanel.style.setProperty("--focus-y", `${focus.y}%`);
  }

  if (dom.galleryPreview) {
    dom.galleryPreview.style.setProperty("--focus-x", `${focus.x}%`);
    dom.galleryPreview.style.setProperty("--focus-y", `${focus.y}%`);
    dom.galleryPreview
      .querySelector("[data-gallery-preview-focus]")
      ?.replaceChildren(document.createTextNode(`X ${focus.x}% / Y ${focus.y}%`));
  }

  if (dom.galleryFocusReadout) {
    dom.galleryFocusReadout.textContent = `X ${focus.x}% / Y ${focus.y}%`;
  }
};

const setGalleryFocus = (nextFocus = galleryFocusDefault) => {
  state.galleryFocus = {
    x: normalizeGalleryFocusValue(nextFocus.x ?? state.galleryFocus.x),
    y: normalizeGalleryFocusValue(nextFocus.y ?? state.galleryFocus.y)
  };

  syncGalleryFocusUi();
};

const resetGalleryFocus = () => setGalleryFocus(galleryFocusDefault);

const syncGalleryCropUi = () => {
  const crop = getGalleryCrop(state.galleryCrop);
  const cropWindow = getGalleryCropWindow(state.galleryPreview, crop);
  const actualCrop = {
    x: normalizeGalleryCropValue(cropWindow.centerX),
    y: normalizeGalleryCropValue(cropWindow.centerY),
    zoom: crop.zoom
  };

  state.galleryCrop = actualCrop;

  if (dom.galleryCropX) dom.galleryCropX.value = String(actualCrop.x);
  if (dom.galleryCropY) dom.galleryCropY.value = String(actualCrop.y);
  if (dom.galleryCropZoom) dom.galleryCropZoom.value = actualCrop.zoom.toFixed(2);

  [dom.galleryPreview, dom.galleryCropStage, dom.galleryFocusPreview].forEach((element) => {
    if (!element) return;

    element.style.setProperty("--crop-x", `${actualCrop.x}%`);
    element.style.setProperty("--crop-y", `${actualCrop.y}%`);
    element.style.setProperty("--crop-zoom", String(actualCrop.zoom));
    applyGalleryCropPlacement(element, cropWindow);
  });

  dom.galleryPreview
    ?.querySelector("[data-gallery-preview-crop]")
    ?.replaceChildren(document.createTextNode(getGalleryCropLabel(actualCrop)));

  if (dom.galleryCropReadout) {
    dom.galleryCropReadout.textContent = getGalleryCropLabel(actualCrop);
  }
};

const setGalleryCrop = (nextCrop = galleryCropDefault) => {
  state.galleryCrop = {
    x: normalizeGalleryCropValue(nextCrop.x ?? state.galleryCrop.x),
    y: normalizeGalleryCropValue(nextCrop.y ?? state.galleryCrop.y),
    zoom: normalizeGalleryCropZoom(nextCrop.zoom ?? state.galleryCrop.zoom)
  };

  syncGalleryCropUi();
};

const resetGalleryCrop = () => setGalleryCrop(galleryCropDefault);

const revokeGalleryPreviewUrl = () => {
  if (state.galleryPreview.url) {
    URL.revokeObjectURL(state.galleryPreview.url);
  }

  Object.assign(state.galleryPreview, {
    file: null,
    url: "",
    width: 0,
    height: 0
  });
};

const loadGalleryPreviewDimensions = (url) => new Promise((resolve) => {
  const image = new Image();

  image.addEventListener("load", () => {
    resolve({
      width: image.naturalWidth || image.width || 0,
      height: image.naturalHeight || image.height || 0
    });
  }, { once: true });

  image.addEventListener("error", () => {
    resolve({ width: 0, height: 0 });
  }, { once: true });

  image.src = url;
});

const getGalleryPreviewSource = async (file, token) => {
  if (!file) {
    revokeGalleryPreviewUrl();
    return null;
  }

  if (state.galleryPreview.file === file && state.galleryPreview.url) {
    return state.galleryPreview;
  }

  const url = URL.createObjectURL(file);
  const dimensions = await loadGalleryPreviewDimensions(url);

  if (state.galleryPreview.token !== token) {
    URL.revokeObjectURL(url);
    return null;
  }

  revokeGalleryPreviewUrl();

  Object.assign(state.galleryPreview, {
    file,
    url,
    width: dimensions.width,
    height: dimensions.height
  });

  return state.galleryPreview;
};

const imageUploadDefaults = {
  galleryMaxLongEdge: Number.POSITIVE_INFINITY,
  posterMaxLongEdge: Number.POSITIVE_INFINITY,
  quality: 1
};

const getOptimizedFileName = (fileName, extension = "webp") => {
  const cleanName = String(fileName || "upload").replace(/\.[^.]+$/, "");

  return `${cleanName || "upload"}.${extension}`;
};

const canOptimizeImageFile = (file) => (
  file
  && ["image/jpeg", "image/png", "image/webp"].includes(file.type)
);

const loadImageElement = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();

  image.addEventListener("load", () => {
    URL.revokeObjectURL(url);
    resolve(image);
  });

  image.addEventListener("error", () => {
    URL.revokeObjectURL(url);
    reject(new Error("Could not read image for optimization"));
  });

  image.src = url;
});

const getResizedDimensions = (width, height, maxLongEdge) => {
  const longEdge = Math.max(width, height);

  if (!longEdge || longEdge <= maxLongEdge) {
    return { width, height };
  }

  const scale = maxLongEdge / longEdge;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
};

const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => {
  canvas.toBlob(resolve, type, quality);
});

const canCropGalleryFile = (file) => {
  if (!file) return false;

  const type = String(file.type || "").toLowerCase();

  if (type.startsWith("image/")) return true;

  return /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(String(file.name || ""));
};

const optimizeImageFile = async (file, options = {}) => {
  if (!canOptimizeImageFile(file)) return file;

  const image = await loadImageElement(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const maxLongEdge = options.maxLongEdge || imageUploadDefaults.galleryMaxLongEdge;
  const quality = options.quality || imageUploadDefaults.quality;
  const dimensions = getResizedDimensions(sourceWidth, sourceHeight, maxLongEdge);
  const keepsOriginalDimensions = dimensions.width === sourceWidth && dimensions.height === sourceHeight;

  if (file.type === "image/webp" && keepsOriginalDimensions) {
    return file;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return file;

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

  const blob = await canvasToBlob(canvas, "image/webp", quality);

  if (!blob || (blob.size >= file.size && keepsOriginalDimensions)) {
    return file;
  }

  return new File([blob], getOptimizedFileName(file.name), {
    type: blob.type || "image/webp",
    lastModified: Date.now()
  });
};

const createCroppedGalleryUploadFile = async (file, cropState = state.galleryCrop) => {
  if (!canCropGalleryFile(file)) return file;

  const image = await loadImageElement(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const cropWindow = getGalleryCropPixelWindow(sourceWidth, sourceHeight, cropState);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare gallery crop");
  }

  canvas.width = cropWindow.sourceWidth;
  canvas.height = cropWindow.sourceHeight;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    cropWindow.sourceX,
    cropWindow.sourceY,
    cropWindow.sourceWidth,
    cropWindow.sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await canvasToBlob(canvas, "image/webp", imageUploadDefaults.quality);

  if (!blob) {
    throw new Error("Could not export gallery crop");
  }

  return new File([blob], getOptimizedFileName(file.name), {
    type: blob.type || "image/webp",
    lastModified: Date.now()
  });
};

const getSupabaseClient = () => {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase config is missing");
  }

  if (!window.supabase) {
    throw new Error("Supabase SDK is not loaded");
  }

  if (!getSupabaseClient.client && window.supabase && config.supabase?.url && config.supabase?.anonKey) {
    getSupabaseClient.client = window.supabase.createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      }
    });
  }

  return getSupabaseClient.client;
};

const getAuthUserLabel = (session) => session?.user?.email || "Admin";

const applyAuthSession = (session) => {
  state.authSession = session || null;
  setAdminVisibility(Boolean(session));

  if (session) {
    setConnectionStatus("connected", `Signed in: ${getAuthUserLabel(session)}`);
  } else if (isAuthEnabled()) {
    setConnectionStatus("warning", "Sign in required");
  }
};

const clearAdminData = () => {
  state.messages = [];
  state.gallery = [];
  state.videos = [];
  state.pendingDelete = null;
  closeDeleteModal();
  closeWatcherModal();
  renderAll();
};

const ensureAuthSession = async () => {
  if (!isAuthEnabled()) {
    setAdminVisibility(true);
    return true;
  }

  setConnectionStatus("checking", "Checking session");

  try {
    const { data, error } = await getSupabaseClient().auth.getSession();

    if (error) throw error;

    applyAuthSession(data.session);
    return Boolean(data.session);
  } catch (error) {
    setAdminVisibility(false);
    setConnectionStatus("error", "Auth error");
    setAuthError(error.message || "Could not check admin session");
    return false;
  }
};

const uploadSupabaseFile = async (bucket, folder, file) => {
  const client = getSupabaseClient();
  const path = `${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await client.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    upsert: false
  });

  if (error) throw error;

  const { data } = client.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl
  };
};

const getSupabaseStoragePathFromUrl = (fileUrl, bucket) => {
  const cleanUrl = String(fileUrl || "").trim();

  if (!cleanUrl || !bucket) return "";

  try {
    const url = new URL(cleanUrl);
    const pathMarkers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/render/image/public/${bucket}/`
    ];
    const marker = pathMarkers.find((item) => url.pathname.includes(item));

    if (!marker) return "";

    return decodeURIComponent(url.pathname.split(marker)[1] || "").replace(/^\/+/, "");
  } catch {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const path = cleanUrl.split(marker)[1] || "";

    return decodeURIComponent(path.split("?")[0] || "").replace(/^\/+/, "");
  }
};

const getVideoPreviewMp4Url = (video = {}) => String(
  video.preview_mp4_url
  || video.preview_video_url
  || video.thumbnail_mp4_url
  || ""
).trim();

const getVideoPreviewMp4StoragePath = (video = {}, bucket = "") => String(
  video.preview_mp4_storage_path
  || video.preview_video_storage_path
  || video.thumbnail_mp4_storage_path
  || getSupabaseStoragePathFromUrl(getVideoPreviewMp4Url(video), bucket)
  || ""
).trim();

const getVideoThumbnailGifUrl = (video = {}) => String(video.thumbnail_gif_url || "").trim();

const getPreviewFileState = (file) => {
  if (!file) {
    return {
      file: null,
      type: ""
    };
  }

  const mimeType = String(file.type || "").toLowerCase();
  const fileName = String(file.name || "").toLowerCase();
  const isMp4 = mimeType === "video/mp4" || fileName.endsWith(".mp4");
  const isGif = mimeType === "image/gif" || fileName.endsWith(".gif");

  if (isMp4) {
    return {
      file,
      type: "mp4"
    };
  }

  if (isGif) {
    return {
      file,
      type: "gif"
    };
  }

  throw new Error("Preview file must be GIF or MP4");
};

const hasVideoPreviewFile = (video = {}) => Boolean(
  getVideoPreviewMp4Url(video) || getVideoThumbnailGifUrl(video)
);

const normalizeStoragePaths = (paths) => Array.from(new Set(
  (Array.isArray(paths) ? paths : [paths])
    .map((path) => String(path || "").trim().replace(/^\/+/, ""))
    .filter(Boolean)
));

const removeSupabaseFiles = async (bucket, paths) => {
  const cleanPaths = normalizeStoragePaths(paths);

  if (!bucket) {
    throw new Error("Storage bucket is missing");
  }

  if (!cleanPaths.length) {
    throw new Error("Storage file path is missing");
  }

  console.info("Deleting Supabase storage files", { bucket, paths: cleanPaths });

  const { data, error } = await getSupabaseClient()
    .storage
    .from(bucket)
    .remove(cleanPaths);

  if (error) throw error;

  console.info("Deleted Supabase storage files", { bucket, paths: cleanPaths, deleted: data });

  if (Array.isArray(data) && data.length < cleanPaths.length) {
    throw new Error(`Storage file was not deleted: ${cleanPaths.join(", ")}`);
  }

  return data || [];
};

const removeSupabaseFilesSafely = async (bucket, paths, label = "Storage") => {
  const cleanPaths = normalizeStoragePaths(paths);

  if (!cleanPaths.length) {
    return { paths: cleanPaths, error: null };
  }

  try {
    await removeSupabaseFiles(bucket, cleanPaths);
    return { paths: cleanPaths, error: null };
  } catch (error) {
    console.error(`${label} cleanup error:`, { bucket, paths: cleanPaths, error });
    return { paths: cleanPaths, error };
  }
};

const service = {
  async loadAll() {
    const client = getSupabaseClient();
    const tables = config.supabase.tables;
    const [
      messagesResult,
      galleryResult,
      videosResult
    ] = await Promise.all([
      client.from(tables.messages).select("*").order("created_at", { ascending: false }),
      client.from(tables.gallery).select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
      client.from(tables.videos).select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false })
    ]);

    if (messagesResult.error) throw messagesResult.error;
    if (galleryResult.error) throw galleryResult.error;
    if (videosResult.error) throw videosResult.error;

    return {
      messages: messagesResult.data || [],
      gallery: galleryResult.data || [],
      videos: videosResult.data || []
    };
  },

  async toggleMessageRead(id) {
    const message = state.messages.find((item) => item.id === id);

    if (!message) return;

    const nextReadState = !message.is_read;

    const { error } = await getSupabaseClient()
      .from(config.supabase.tables.messages)
      .update({ is_read: nextReadState })
      .eq("id", id);

    if (error) throw error;

    message.is_read = nextReadState;
  },

  async archiveMessage(id) {
    const message = state.messages.find((item) => item.id === id);

    if (!message) return;

    const archivedAt = new Date().toISOString();

    const { error } = await getSupabaseClient()
      .from(config.supabase.tables.messages)
      .update({ archived_at: archivedAt })
      .eq("id", id);

    if (error) throw error;

    message.archived_at = archivedAt;
  },

  async restoreMessage(id) {
    const message = state.messages.find((item) => item.id === id);

    if (!message) return;

    const { error } = await getSupabaseClient()
      .from(config.supabase.tables.messages)
      .update({ archived_at: null })
      .eq("id", id);

    if (error) throw error;

    message.archived_at = null;
  },

  async deleteMessage(id) {
    const { error } = await getSupabaseClient()
      .from(config.supabase.tables.messages)
      .delete()
      .eq("id", id);

    if (error) throw error;

    state.messages = state.messages.filter((item) => item.id !== id);
  },

  async deleteGalleryItem(id) {
    const item = state.gallery.find((galleryItem) => galleryItem.id === id);

    if (!item) return;

    const bucket = item.storage_bucket || config.supabase.storage.galleryBucket;
    const imagePath = item.storage_path || getSupabaseStoragePathFromUrl(item.image_url, bucket);
    const cleanupWarnings = [];

    const { error } = await getSupabaseClient()
      .from(config.supabase.tables.gallery)
      .delete()
      .eq("id", id);

    if (error) throw error;

    state.gallery = state.gallery.filter((galleryItem) => galleryItem.id !== id);

    if (!imagePath) {
      cleanupWarnings.push(new Error("Gallery image storage path is missing"));
    } else {
      const cleanup = await removeSupabaseFilesSafely(bucket, [imagePath], "Gallery image");

      if (cleanup.error) {
        cleanupWarnings.push(cleanup.error);
      }
    }

    return { cleanupWarnings };
  },

  async updateGalleryOrder(placement, orderedIds) {
    const table = config.supabase.tables.gallery;
    const client = getSupabaseClient();
    const results = await Promise.all(orderedIds.map((id, index) => client
      .from(table)
      .update({ sort_order: index + 1 })
      .eq("id", id)));
    const errorResult = results.find((result) => result.error);

    if (errorResult?.error) {
      throw errorResult.error;
    }
  },

  async updateVideoOrder(orderedIds) {
    const table = config.supabase.tables.videos;
    const client = getSupabaseClient();
    const results = await Promise.all(orderedIds.map((id, index) => client
      .from(table)
      .update({ sort_order: index + 1 })
      .eq("id", id)));
    const errorResult = results.find((result) => result.error);

    if (errorResult?.error) {
      throw errorResult.error;
    }
  },

  async updateTapeOrder(orderedIds) {
    const table = config.supabase.tables.videos;
    const client = getSupabaseClient();
    const results = await Promise.all(orderedIds.map((id, index) => client
      .from(table)
      .update({ tape_sort_order: index + 1 })
      .eq("id", id)));
    const errorResult = results.find((result) => result.error);

    if (errorResult?.error) {
      throw errorResult.error;
    }
  },

  async deleteVideoItem(id) {
    const item = state.videos.find((videoItem) => videoItem.id === id);

    if (!item) return;

    const bucket = config.supabase.storage.videoBucket;
    const previewMp4Path = getVideoPreviewMp4StoragePath(item, bucket);
    const gifPath = item.thumbnail_gif_storage_path || getSupabaseStoragePathFromUrl(item.thumbnail_gif_url, bucket);
    const posterPath = item.poster_storage_path || getSupabaseStoragePathFromUrl(item.poster_url, bucket);
    const cleanupWarnings = [];

    const { error } = await getSupabaseClient()
      .from(config.supabase.tables.videos)
      .delete()
      .eq("id", id);

    if (error) throw error;

    state.videos = state.videos.filter((videoItem) => videoItem.id !== id);

    if (getVideoPreviewMp4Url(item) && !previewMp4Path) {
      cleanupWarnings.push(new Error("Video MP4 preview storage path is missing"));
    }

    if (item.thumbnail_gif_url && !gifPath) {
      cleanupWarnings.push(new Error("Video GIF storage path is missing"));
    }

    if (item.poster_url && !posterPath) {
      cleanupWarnings.push(new Error("Video poster storage path is missing"));
    }

    const cleanup = await removeSupabaseFilesSafely(bucket, [previewMp4Path, gifPath, posterPath], "Video media");

    if (cleanup.error) {
      cleanupWarnings.push(cleanup.error);
    }

    return { cleanupWarnings };
  },

  async createGalleryItem(payload, file, cropWindow = state.galleryCrop) {
    const uploadFile = await createCroppedGalleryUploadFile(file, cropWindow);

    const bucket = config.supabase.storage.galleryBucket;
    let upload = null;

    try {
      upload = await uploadSupabaseFile(bucket, getGalleryFormat().storageFolder, uploadFile);

      const item = {
        ...payload,
        image_url: upload.publicUrl,
        storage_bucket: bucket,
        storage_path: upload.path,
        file_name: uploadFile.name
      };
      const { data, error } = await getSupabaseClient()
        .from(config.supabase.tables.gallery)
        .insert(item)
        .select()
        .single();

      if (error) throw error;

      state.gallery.unshift(data);
      return data;
    } catch (error) {
      await removeSupabaseFilesSafely(
        bucket,
        [upload?.path],
        "Failed gallery create upload rollback"
      );
      throw error;
    }
  },

  async updateGalleryItem(id, payload) {
    const item = state.gallery.find((galleryItem) => galleryItem.id === id);

    if (!item) return null;

    const { data, error } = await getSupabaseClient()
      .from(config.supabase.tables.gallery)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    Object.assign(item, data);
    return data;
  },

  async createVideoItem(payload, files) {
    const previewFileState = getPreviewFileState(files.previewFile || null);
    const uploadFiles = {
      previewFile: previewFileState.file,
      previewType: previewFileState.type,
      poster: files.poster
        ? await optimizeImageFile(files.poster, {
            maxLongEdge: imageUploadDefaults.posterMaxLongEdge,
            quality: imageUploadDefaults.quality
          })
        : null
    };

    const bucket = config.supabase.storage.videoBucket;
    let previewMp4Upload = null;
    let gifUpload = null;
    let posterUpload = null;

    try {
      previewMp4Upload = uploadFiles.previewType === "mp4"
        ? await uploadSupabaseFile(bucket, "previews", uploadFiles.previewFile)
        : null;
      gifUpload = uploadFiles.previewType === "gif"
        ? await uploadSupabaseFile(bucket, "gifs", uploadFiles.previewFile)
        : null;
      posterUpload = uploadFiles.poster ? await uploadSupabaseFile(bucket, "posters", uploadFiles.poster) : null;

      const item = {
        ...payload,
        thumbnail_gif_url: gifUpload?.publicUrl || "",
        thumbnail_gif_storage_path: gifUpload?.path || "",
        thumbnail_gif_file_name: uploadFiles.previewType === "gif" ? uploadFiles.previewFile.name : "",
        poster_url: posterUpload?.publicUrl || "",
        poster_storage_path: posterUpload?.path || "",
        poster_file_name: uploadFiles.poster?.name || ""
      };

      if (previewMp4Upload) {
        item.preview_mp4_url = previewMp4Upload.publicUrl;
        item.preview_mp4_storage_path = previewMp4Upload.path;
        item.preview_mp4_file_name = uploadFiles.previewFile.name;
      }

      const { data, error } = await getSupabaseClient()
        .from(config.supabase.tables.videos)
        .insert(item)
        .select()
        .single();

      if (error) throw error;

      state.videos.unshift(data);
      return data;
    } catch (error) {
      await removeSupabaseFilesSafely(
        bucket,
        [previewMp4Upload?.path, gifUpload?.path, posterUpload?.path],
        "Failed video create upload rollback"
      );
      throw error;
    }
  },

  async generateVimeoPoster(video, posterState) {
    const endpoint = getPosterGenerationEndpoint();

    if (!endpoint) {
      throw new Error("Poster generation endpoint is missing");
    }

    const headers = {
      "Content-Type": "application/json"
    };

    if (state.authSession?.access_token) {
      headers.Authorization = `Bearer ${state.authSession.access_token}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        row_id: video.id,
        video_id: video.id,
        vimeo_url: video.vimeo_url,
        poster_time: posterState.time
      })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Could not generate Vimeo poster");
    }

    if (result.video?.id) {
      const item = state.videos.find((videoItem) => videoItem.id === result.video.id);

      if (item) {
        Object.assign(item, result.video);
      }
    }

    return result;
  },

  async updateVideoItem(id, payload, files = {}) {
    const item = state.videos.find((videoItem) => videoItem.id === id);

    if (!item) return null;

    const bucket = config.supabase.storage.videoBucket;
    const oldPreviewMp4Path = getVideoPreviewMp4StoragePath(item, bucket);
    const oldGifPath = item.thumbnail_gif_storage_path || getSupabaseStoragePathFromUrl(item.thumbnail_gif_url, bucket);
    const oldPosterPath = item.poster_storage_path || getSupabaseStoragePathFromUrl(item.poster_url, bucket);
    const cleanupWarnings = [];
    const previewFileState = getPreviewFileState(files.previewFile || null);
    const uploadFiles = {
      previewFile: previewFileState.file,
      previewType: previewFileState.type,
      poster: files.poster
        ? await optimizeImageFile(files.poster, {
            maxLongEdge: imageUploadDefaults.posterMaxLongEdge,
            quality: imageUploadDefaults.quality
          })
        : null
    };
    const nextPayload = { ...payload };
    let previewMp4Upload = null;
    let gifUpload = null;
    let posterUpload = null;

    try {
      if (uploadFiles.previewType === "mp4") {
        previewMp4Upload = await uploadSupabaseFile(bucket, "previews", uploadFiles.previewFile);

        nextPayload.preview_mp4_url = previewMp4Upload.publicUrl;
        nextPayload.preview_mp4_storage_path = previewMp4Upload.path;
        nextPayload.preview_mp4_file_name = uploadFiles.previewFile.name;
        nextPayload.thumbnail_gif_url = "";
        nextPayload.thumbnail_gif_storage_path = "";
        nextPayload.thumbnail_gif_file_name = "";
      }

      if (uploadFiles.previewType === "gif") {
        gifUpload = await uploadSupabaseFile(bucket, "gifs", uploadFiles.previewFile);

        nextPayload.thumbnail_gif_url = gifUpload.publicUrl;
        nextPayload.thumbnail_gif_storage_path = gifUpload.path;
        nextPayload.thumbnail_gif_file_name = uploadFiles.previewFile.name;
        nextPayload.preview_mp4_url = "";
        nextPayload.preview_mp4_storage_path = "";
        nextPayload.preview_mp4_file_name = "";
      }

      if (uploadFiles.poster) {
        posterUpload = await uploadSupabaseFile(bucket, "posters", uploadFiles.poster);

        nextPayload.poster_url = posterUpload.publicUrl;
        nextPayload.poster_storage_path = posterUpload.path;
        nextPayload.poster_file_name = uploadFiles.poster.name;
      }

      const { data, error } = await getSupabaseClient()
        .from(config.supabase.tables.videos)
        .update(nextPayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const replacedPaths = [];

      if (uploadFiles.previewType) {
        if (oldPreviewMp4Path) {
          replacedPaths.push(oldPreviewMp4Path);
        } else if (getVideoPreviewMp4Url(item)) {
          cleanupWarnings.push(new Error("Previous video MP4 preview storage path is missing"));
        }

        if (oldGifPath) {
          replacedPaths.push(oldGifPath);
        } else if (item.thumbnail_gif_url) {
          cleanupWarnings.push(new Error("Previous video GIF storage path is missing"));
        }
      }

      if (uploadFiles.poster) {
        if (oldPosterPath) {
          replacedPaths.push(oldPosterPath);
        } else if (item.poster_url) {
          cleanupWarnings.push(new Error("Previous video poster storage path is missing"));
        }
      }

      const cleanup = await removeSupabaseFilesSafely(
        bucket,
        replacedPaths.filter((path) => (
          path !== previewMp4Upload?.path
          && path !== gifUpload?.path
          && path !== posterUpload?.path
        )),
        "Replaced video media"
      );

      if (cleanup.error) {
        cleanupWarnings.push(cleanup.error);
      }

      Object.assign(item, data);
      return { ...data, cleanupWarnings };
    } catch (error) {
      await removeSupabaseFilesSafely(
        bucket,
        [previewMp4Upload?.path, gifUpload?.path, posterUpload?.path],
        "Failed video update upload rollback"
      );
      throw error;
    }
  }
};

const getFilteredMessages = () => state.messages.filter((message) => {
  const isArchived = Boolean(message.archived_at);

  if (state.messageFilter === "archived") return isArchived;
  if (state.messageFilter === "unread") return !isArchived && !message.is_read;
  if (state.messageFilter === "read") return !isArchived && message.is_read;

  return !isArchived;
});

const messageCollapseCharLimit = 420;
const messageCollapseLineLimit = 7;

const shouldCollapseMessage = (messageText = "", referenceCount = 0) => {
  const text = String(messageText ?? "");
  const lineCount = text.split(/\r?\n/).length;

  return text.length > messageCollapseCharLimit
    || lineCount > messageCollapseLineLimit
    || (referenceCount > 0 && text.length > 240);
};

const isBlank = (value) => !String(value ?? "").trim();

const getWatcherIssues = () => {
  const galleryIssues = state.gallery
    .map((item) => {
      const missing = [];

      if (isBlank(item.title)) {
        missing.push({ key: "title", label: "Title" });
      }

      if (isBlank(item.alt_text)) {
        missing.push({ key: "alt_text", label: "Alt text" });
      }

      return {
        id: item.id,
        type: "gallery",
        typeLabel: "Photo",
        item,
        label: item.title || item.file_name || "Untitled image",
        missing
      };
    })
    .filter((issue) => issue.missing.length);
  const videoIssues = state.videos
    .map((item) => {
      const missing = [];

      if (isBlank(item.title)) {
        missing.push({ key: "title", label: "Title" });
      }

      if (isBlank(item.vimeo_url)) {
        missing.push({ key: "vimeo_url", label: "Vimeo URL" });
      }

      if (!hasVideoPreviewFile(item)) {
        missing.push({ key: "preview_file", label: "Preview" });
      }

      if (isBlank(item.poster_url)) {
        missing.push({ key: "poster", label: "Poster" });
      }

      return {
        id: item.id,
        type: "video",
        typeLabel: "Video",
        item,
        label: item.title || item.vimeo_url || "Untitled video",
        missing
      };
    })
    .filter((issue) => issue.missing.length);

  return [...galleryIssues, ...videoIssues];
};

const renderWatcherFields = (issue) => {
  const hasMissing = (key) => issue.missing.some((item) => item.key === key);
  const fields = [];

  if (hasMissing("title")) {
    fields.push(`
      <label class="watcher-field">
        <span>Title</span>
        <input type="text" name="title" value="${escapeHtml(issue.item.title || "")}" placeholder="Project title">
      </label>
    `);
  }

  if (issue.type === "gallery" && hasMissing("alt_text")) {
    fields.push(`
      <label class="watcher-field">
        <span>Alt text</span>
        <input type="text" name="alt_text" value="${escapeHtml(issue.item.alt_text || "")}" placeholder="Image description">
      </label>
    `);
  }

  if (issue.type === "video" && hasMissing("vimeo_url")) {
    fields.push(`
      <label class="watcher-field">
        <span>Vimeo URL</span>
        <input type="url" name="vimeo_url" value="${escapeHtml(issue.item.vimeo_url || "")}" placeholder="https://vimeo.com/123456789">
      </label>
    `);
  }

  if (issue.type === "video" && hasMissing("preview_file")) {
    fields.push(`
      <label class="watcher-field watcher-field--file">
        <span>Preview</span>
        <input type="file" name="preview_file" accept="image/gif,video/mp4">
      </label>
    `);
  }

  if (issue.type === "video" && hasMissing("poster")) {
    fields.push(`
      <label class="watcher-field watcher-field--file">
        <span>Poster</span>
        <input type="file" name="poster" accept="image/png,image/jpeg,image/webp">
      </label>
    `);
  }

  return fields.join("");
};

const renderWatcherModal = () => {
  if (!dom.watcherList) return;

  const issues = getWatcherIssues();
  const previewMissing = issues.filter((issue) => issue.type === "video" && issue.missing.some((item) => item.key === "preview_file")).length;
  const posterMissing = issues.filter((issue) => issue.type === "video" && issue.missing.some((item) => item.key === "poster")).length;

  if (dom.watcherSummary) {
    dom.watcherSummary.textContent = issues.length
      ? `${issues.length} file${issues.length === 1 ? "" : "s"} need attention. Preview missing: ${previewMissing}. Poster missing: ${posterMissing}.`
      : "All portfolio files have the required data.";
  }

  if (!issues.length) {
    dom.watcherList.innerHTML = `<div class="empty-state watcher-empty">No missing data found</div>`;
    return;
  }

  dom.watcherList.innerHTML = issues.map((issue) => `
    <form class="watcher-row" data-watcher-form data-watcher-type="${escapeHtml(issue.type)}" data-watcher-id="${escapeHtml(issue.id)}">
      <div class="watcher-row__type">
        <span class="pill">${escapeHtml(issue.typeLabel)}</span>
      </div>
      <div class="watcher-row__name">
        <strong>${escapeHtml(issue.label)}</strong>
        <span>${escapeHtml(issue.item.file_name || issue.item.preview_mp4_file_name || issue.item.thumbnail_gif_file_name || issue.item.poster_file_name || issue.item.vimeo_url || "No file label")}</span>
      </div>
      <div class="watcher-row__missing">
        ${issue.missing.map((item) => `<span class="pill pill--warning">${escapeHtml(item.label)}</span>`).join("")}
      </div>
      <div class="watcher-row__fields">
        ${renderWatcherFields(issue)}
      </div>
      <button class="secondary-button watcher-row__save" type="submit">Save</button>
    </form>
  `).join("");
};

const renderPortfolioIndicators = () => {
  if (dom.videoTotal) {
    dom.videoTotal.textContent = `VIDEO: ${state.videos.length}`;
  }

  if (dom.photoTotal) {
    dom.photoTotal.textContent = `PHOTOS: ${state.gallery.length}`;
  }

  if (dom.watcherOpen) {
    const issues = getWatcherIssues();

    dom.watcherOpen.classList.toggle("is-warning", issues.length > 0);
    dom.watcherOpen.classList.toggle("is-connected", issues.length === 0);
    dom.watcherOpen.textContent = issues.length ? `WATCHER: ${issues.length}` : "WATCHER: OK";
    dom.watcherOpen.setAttribute(
      "title",
      issues.length ? `${issues.length} portfolio file${issues.length === 1 ? "" : "s"} need attention` : "Portfolio data is complete"
    );
  }

  if (dom.watcherModal && !dom.watcherModal.hidden) {
    renderWatcherModal();
  }
};

const renderMessages = () => {
  if (!dom.messageList) return;

  const messages = getFilteredMessages();
  const unreadCount = state.messages.filter((message) => !message.archived_at && !message.is_read).length;

  if (dom.messageCount) {
    dom.messageCount.textContent = String(unreadCount);
  }

  if (!messages.length) {
    dom.messageList.innerHTML = `<div class="empty-state">No messages in this view</div>`;
    return;
  }

  dom.messageList.innerHTML = messages.map((message) => {
    const readLabel = message.is_read ? "Mark as unread" : "Mark as read";
    const readIcon = message.is_read ? "icon-eye-off" : "icon-eye";
    const referenceLinks = getMessageReferenceLinks(message);
    const referenceCount = referenceLinks.length;
    const isCollapsible = shouldCollapseMessage(message.message, referenceCount);
    const restoreButton = message.archived_at
      ? `
          <button class="icon-button" type="button" data-restore-message="${escapeHtml(message.id)}" title="Restore from archive" aria-label="Restore from archive">
            <svg class="icon" aria-hidden="true"><use href="#icon-unarchive"></use></svg>
          </button>
        `
      : "";
    const archiveButton = message.archived_at
      ? ""
      : `
          <button class="icon-button" type="button" data-archive-message="${escapeHtml(message.id)}" title="Archive" aria-label="Archive">
            <svg class="icon" aria-hidden="true"><use href="#icon-archive"></use></svg>
          </button>
        `;

    return `
      <article class="message-card ${message.is_read ? "is-read" : ""} ${message.archived_at ? "is-archived" : ""} ${isCollapsible ? "is-collapsible" : ""}" data-message-card>
        <div class="message-meta">
          <h3>${escapeHtml(message.name)}</h3>
          <a href="${escapeHtml(getContactHref(message.contact))}">${escapeHtml(message.contact)}</a>
          <span class="message-date">${escapeHtml(formatDate(message.created_at))}</span>
        </div>
        <div class="message-body">
          ${referenceCount ? `<span class="message-reference-indicator">${referenceCount} reference${referenceCount === 1 ? "" : "s"}</span>` : ""}
          <div class="message-collapsible">
            <p class="message-text">${renderMessageText(message.message)}</p>
            ${renderReferenceLinks(referenceLinks)}
          </div>
          ${isCollapsible ? `
            <button class="message-expand" type="button" data-message-expand aria-expanded="false">
              <span>Expand</span>
            </button>
          ` : ""}
        </div>
        <div class="message-actions">
          <button class="icon-button" type="button" data-toggle-read="${escapeHtml(message.id)}" title="${readLabel}" aria-label="${readLabel}">
            <svg class="icon" aria-hidden="true"><use href="#${readIcon}"></use></svg>
          </button>
          ${archiveButton}
          ${restoreButton}
          <button class="icon-button" type="button" data-delete-message="${escapeHtml(message.id)}" title="Delete" aria-label="Delete">
            <svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>
          </button>
        </div>
      </article>
    `;
  }).join("");
};

const gallerySections = [
  { placement: galleryFormat.placement, title: "Stills" }
];

const getGallerySortOrder = (item = {}) => {
  const order = Number.parseInt(item.sort_order, 10);

  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
};

const compareGalleryItems = (a, b) => {
  const orderDifference = getGallerySortOrder(a) - getGallerySortOrder(b);

  if (orderDifference) return orderDifference;

  return new Date(b.created_at || 0) - new Date(a.created_at || 0);
};

const getOrderedGalleryItems = () => state.gallery
  .slice()
  .sort(compareGalleryItems);

const applyGalleryOrder = (placement, orderedIds) => {
  const orderById = new Map(orderedIds.map((id, index) => [String(id), index + 1]));

  state.gallery.forEach((item) => {
    const nextOrder = orderById.get(String(item.id));

    if (nextOrder) {
      item.sort_order = nextOrder;
    }
  });
};

const saveGalleryOrder = async (placement, orderedIds, successMessage = "") => {
  const previousGallery = state.gallery.map((item) => ({ ...item }));

  applyGalleryOrder(placement, orderedIds);
  renderGallery();

  try {
    await service.updateGalleryOrder(placement, orderedIds);

    if (successMessage) {
      showToast(successMessage);
    }
  } catch (error) {
    state.gallery = previousGallery;
    renderGallery();
    showToast(error.message || "Could not save gallery order");
    throw error;
  }
};

const moveGalleryItemToSectionStart = (item) => {
  const placement = galleryFormat.placement;
  const orderedIds = [
    String(item.id),
    ...getOrderedGalleryItems()
      .filter((galleryItem) => galleryItem.id !== item.id)
      .map((galleryItem) => String(galleryItem.id))
  ];

  return saveGalleryOrder(placement, orderedIds);
};

const getVideoSortOrder = (item = {}) => {
  const order = Number.parseInt(item.sort_order, 10);

  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
};

const compareVideoItems = (a, b) => {
  const orderDifference = getVideoSortOrder(a) - getVideoSortOrder(b);

  if (orderDifference) return orderDifference;

  return new Date(b.created_at || 0) - new Date(a.created_at || 0);
};

const getOrderedVideoItems = () => state.videos
  .slice()
  .sort(compareVideoItems);

const applyVideoOrder = (orderedIds) => {
  const orderById = new Map(orderedIds.map((id, index) => [String(id), index + 1]));

  state.videos.forEach((item) => {
    const nextOrder = orderById.get(String(item.id));

    if (nextOrder) {
      item.sort_order = nextOrder;
    }
  });
};

const saveVideoOrder = async (orderedIds, successMessage = "") => {
  const previousVideos = state.videos.map((item) => ({ ...item }));

  applyVideoOrder(orderedIds);
  renderVideos();

  try {
    await service.updateVideoOrder(orderedIds);

    if (successMessage) {
      showToast(successMessage);
    }
  } catch (error) {
    state.videos = previousVideos;
    renderVideos();
    showToast(error.message || "Could not save video order");
    throw error;
  }
};

const renderGallery = () => {
  if (!dom.galleryList) return;

  if (!state.gallery.length) {
    dom.galleryList.innerHTML = `<div class="empty-state">No gallery images yet</div>`;
    return;
  }

  dom.galleryList.innerHTML = gallerySections.map((section) => {
    const items = getOrderedGalleryItems();
    const cards = items.map((item, index) => {
      const focus = getGalleryFocus(item);

      return `
        <article class="media-card" data-gallery-card data-gallery-id="${escapeHtml(item.id)}" data-gallery-placement="${escapeHtml(section.placement)}">
          <div class="media-card__image">
            <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.alt_text || item.title || "Gallery image")}" style="${escapeHtml(getGalleryFocusStyle(item))}">
          </div>
          <div class="media-card__body">
            <h3>${escapeHtml(item.title || item.file_name || "Untitled image")}</h3>
            <div class="media-card__bottom">
              <div class="media-card__meta">
                <span class="pill">Order ${index + 1}</span>
                <span class="pill">Focus ${focus.x}/${focus.y}</span>
              </div>
              <button class="icon-button media-card__delete" type="button" data-delete-gallery="${escapeHtml(item.id)}" title="Delete image" aria-label="Delete image">
                <svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    return `
      <section class="gallery-section" data-gallery-section="${escapeHtml(section.placement)}">
        <div class="gallery-section__header">
          <h3 class="gallery-section__title">${escapeHtml(section.title)}</h3>
          <span class="pill">${items.length} image${items.length === 1 ? "" : "s"}</span>
        </div>
        <div class="media-list gallery-section__list" data-gallery-section-list="${escapeHtml(section.placement)}">
          ${cards || `<div class="empty-state gallery-section__empty">No gallery images yet</div>`}
        </div>
      </section>
    `;
  }).join("");
};

const getVideoMediaMarkup = (video) => {
  const previewMp4Url = getVideoPreviewMp4Url(video);
  const gifUrl = getVideoThumbnailGifUrl(video);
  const posterUrl = String(video.poster_url || "").trim();

  if (!previewMp4Url && !gifUrl && !posterUrl) {
    return "No image";
  }

  if (posterUrl && previewMp4Url) {
    return `
      <img class="media-card__poster" src="${escapeHtml(posterUrl)}" alt="${escapeHtml(video.title)}">
      <video class="media-card__preview" src="${escapeHtml(previewMp4Url)}" muted loop playsinline preload="metadata" aria-hidden="true"></video>
    `;
  }

  if (posterUrl && gifUrl) {
    return `
      <img class="media-card__poster" src="${escapeHtml(posterUrl)}" alt="${escapeHtml(video.title)}">
      <img class="media-card__gif" src="${escapeHtml(gifUrl)}" alt="" aria-hidden="true">
    `;
  }

  if (previewMp4Url) {
    return `<video class="media-card__preview is-primary" src="${escapeHtml(previewMp4Url)}" muted loop playsinline preload="metadata" aria-label="${escapeHtml(video.title)}"></video>`;
  }

  return `<img src="${escapeHtml(posterUrl || gifUrl)}" alt="${escapeHtml(video.title)}">`;
};

const renderVideos = () => {
  if (!dom.videoList) return;

  if (!state.videos.length) {
    dom.videoList.innerHTML = `<div class="empty-state">No videos yet</div>`;
    return;
  }

  dom.videoList.innerHTML = getOrderedVideoItems().map((video, index) => {
    const isTape = isVideoTapeEnabled(video);
    const tapeOrder = getVideoTapeSortOrder(video);
    const hasMp4Preview = Boolean(getVideoPreviewMp4Url(video));
    const hasGifPreview = Boolean(getVideoThumbnailGifUrl(video));

    return `
      <article class="media-card" data-video-card data-video-id="${escapeHtml(video.id)}">
        <a class="media-card__image" href="${escapeHtml(video.vimeo_url)}" target="_blank" rel="noreferrer">
          ${getVideoMediaMarkup(video)}
        </a>
        <div class="media-card__body">
          <h3>${escapeHtml(video.title)}</h3>
          <div class="media-card__bottom">
            <div class="media-card__meta">
              <span class="pill">Order ${index + 1}</span>
              ${video.featured ? `<span class="pill pill--featured">Featured</span>` : `<span class="pill">Standard</span>`}
              ${isTape ? `<span class="pill pill--tape">Tape${tapeOrder ? ` ${escapeHtml(tapeOrder)}` : ""}</span>` : ""}
              ${hasMp4Preview ? `<span class="pill">MP4</span>` : ""}
              ${hasGifPreview ? `<span class="pill">${hasMp4Preview ? "GIF fallback" : "GIF"}</span>` : ""}
              ${video.poster_url ? `<span class="pill">Poster</span>` : ""}
              ${!hasMp4Preview && !hasGifPreview && !video.poster_url ? `<span class="pill">No image</span>` : ""}
            </div>
            <div class="media-card__actions">
              <button class="icon-button media-card__edit" type="button" data-edit-video="${escapeHtml(video.id)}" title="Edit video" aria-label="Edit video">
                <svg class="icon" aria-hidden="true"><use href="#icon-pencil"></use></svg>
              </button>
              <button class="icon-button media-card__delete" type="button" data-delete-video="${escapeHtml(video.id)}" title="Delete video" aria-label="Delete video">
                <svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");
};

const renderAll = () => {
  renderMessages();
  renderGallery();
  renderTapeOrderBox();
  renderVideos();
  renderPortfolioIndicators();
};

const setPanel = (panelName) => {
  state.activePanel = panelName;

  dom.navItems.forEach((item) => {
    const isActive = item.dataset.panelTarget === panelName;

    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });

  dom.panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === panelName);
  });

  if (dom.panelTitle) {
    dom.panelTitle.textContent = panelTitles[panelName] || "Admin";
  }
};

const setMessageFilter = (filterName) => {
  state.messageFilter = filterName;

  dom.messageFilters?.querySelectorAll("[data-message-filter]").forEach((button) => {
    const isActive = button.dataset.messageFilter === filterName;

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  renderMessages();
};

const renderGalleryFocusPreview = (source, format) => {
  if (!dom.galleryFocusPreview) return;

  dom.galleryFocusPreview.className = `focus-control__stage focus-control__stage--${format.previewClass}`;

  if (!source?.url) {
    dom.galleryFocusPreview.innerHTML = `<div class="focus-control__empty">No image</div>`;
    return;
  }

  const sourceWidth = Math.max(1, Math.round(Number(source.width) || 16));
  const sourceHeight = Math.max(1, Math.round(Number(source.height) || 9));

  dom.galleryFocusPreview.innerHTML = `
    <div class="focus-control__frame focus-control__frame--${format.previewClass}">
      <div class="focus-control__source focus-control__source--cropped">
        <img class="focus-control__image focus-control__image--cropped" src="${escapeHtml(source.url)}" width="${sourceWidth}" height="${sourceHeight}" alt="">
        <span class="focus-control__target" aria-hidden="true"></span>
      </div>
    </div>
  `;
};

const renderGalleryCropPreview = (source) => {
  if (!dom.galleryCropStage) return;

  if (!source?.url) {
    dom.galleryCropStage.innerHTML = `<div class="crop-stage__empty">No image</div>`;
    return;
  }

  const sourceWidth = Math.max(1, Math.round(Number(source.width) || 16));
  const sourceHeight = Math.max(1, Math.round(Number(source.height) || 9));

  dom.galleryCropStage.innerHTML = `
    <div class="crop-stage__frame">
      <img class="crop-stage__image" src="${escapeHtml(source.url)}" width="${sourceWidth}" height="${sourceHeight}" alt="">
      <span class="crop-stage__edge crop-stage__edge--x" aria-hidden="true"></span>
      <span class="crop-stage__edge crop-stage__edge--y" aria-hidden="true"></span>
    </div>
  `;
};

const updateGalleryPreview = async () => {
  if (!dom.galleryPreview || !dom.galleryForm) return;

  const file = dom.galleryForm.elements.image.files[0];
  const format = getGalleryFormat();
  const title = dom.galleryForm.elements.title.value.trim();
  const altText = dom.galleryForm.elements.alt_text.value.trim();
  const token = state.galleryPreview.token + 1;
  const focus = getGalleryFocus(state.galleryFocus);
  state.galleryPreview.token = token;

  const source = await getGalleryPreviewSource(file, token);

  if (state.galleryPreview.token !== token) return;

  let previewContent = `<div class="media-preview media-preview--empty media-preview--${format.previewClass}">No image</div>`;

  if (source?.url) {
    previewContent = `
      <div class="media-preview media-preview--site-gallery media-preview--${format.previewClass}" aria-label="Site crop preview">
        <img src="${escapeHtml(source.url)}" alt="${escapeHtml(altText)}">
      </div>
    `;
  }

  dom.galleryPreview.innerHTML = `
    ${previewContent}
    <dl class="preview-meta">
      <div><dt>Title</dt><dd>${escapeHtml(title)}</dd></div>
      <div><dt>Alt text</dt><dd>${escapeHtml(altText)}</dd></div>
      <div><dt>File</dt><dd>${escapeHtml(file?.name || "No file selected")}</dd></div>
      <div><dt>Crop</dt><dd data-gallery-preview-crop>${escapeHtml(getGalleryCropLabel())}</dd></div>
      <div><dt>Focus</dt><dd data-gallery-preview-focus>X ${focus.x}% / Y ${focus.y}%</dd></div>
    </dl>
  `;

  renderGalleryFocusPreview(source, format);
  renderGalleryCropPreview(source);
  syncGalleryFocusUi();
  syncGalleryCropUi();
};

const parseVimeoUrl = (value) => {
  const rawValue = String(value || "").trim();

  if (!rawValue) return null;

  const source = /^https?:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`;

  try {
    const url = new URL(source);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const isVimeoHost = host === "vimeo.com" || host === "player.vimeo.com";

    if (!isVimeoHost) {
      console.debug("[Poster Picker] parseVimeoUrl", {
        originalUrl: rawValue,
        videoId: "",
        embedUrl: ""
      });
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    let videoId = "";

    if (host === "player.vimeo.com") {
      const videoSegmentIndex = segments.indexOf("video");

      videoId = /^\d+$/.test(segments[videoSegmentIndex + 1] || "") ? segments[videoSegmentIndex + 1] : "";
    }

    if (!videoId && host === "vimeo.com") {
      const manageVideosIndex = segments.findIndex((segment, index) => (
        segment === "manage" && segments[index + 1] === "videos"
      ));

      if (manageVideosIndex >= 0) {
        videoId = /^\d+$/.test(segments[manageVideosIndex + 2] || "") ? segments[manageVideosIndex + 2] : "";
      }
    }

    if (!videoId) {
      videoId = segments.find((segment) => /^\d+$/.test(segment)) || "";
    }

    if (!videoId) {
      console.debug("[Poster Picker] parseVimeoUrl", {
        originalUrl: rawValue,
        videoId: "",
        embedUrl: ""
      });
      return null;
    }

    const embedUrl = `https://player.vimeo.com/video/${videoId}`;

    console.debug("[Poster Picker] parseVimeoUrl", {
      originalUrl: rawValue,
      videoId,
      embedUrl
    });

    return {
      id: videoId,
      embedUrl
    };
  } catch {
    console.debug("[Poster Picker] parseVimeoUrl", {
      originalUrl: rawValue,
      videoId: "",
      embedUrl: ""
    });
    return null;
  }
};

const formatTimestamp = (value) => {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const normalizePosterMode = (value) => {
  const mode = String(value || "").trim();

  return mode === "manual" || mode === "vimeo_time" ? mode : "";
};

const isVideoFormPosterPickerEnabled = (form = dom.videoForm) => (
  Boolean(form?.elements.poster_picker_enabled?.checked)
);

const getPosterModeLabel = (mode, time = null) => {
  const posterMode = normalizePosterMode(mode);

  if (posterMode === "manual") return "Manual file";
  if (posterMode === "vimeo_time") return `Vimeo ${formatTimestamp(time)}`;

  return "None";
};

const getVideoPosterMode = (video) => {
  const posterMode = normalizePosterMode(video?.poster_mode);

  if (posterMode) return posterMode;
  if (video?.poster_url || video?.poster_file_name) return "manual";

  return "";
};

const getVideoManualPosterLabel = (video) => (
  video?.poster_file_name || video?.poster_storage_path || video?.poster_url || ""
);

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

const getTapeTextureUrl = (textureKey) => `../assets/img/${normalizeTapeTextureKey(textureKey)}.png`;

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

const getTapeLabelMarkup = (label) => {
  const splitLabel = splitTapeLabel(label);
  const className = [
    "tape-label",
    splitLabel.isSplit ? "is-split" : "",
    splitLabel.isLong ? "is-long" : "",
    splitLabel.isExtraLong ? "is-extra-long" : ""
  ].filter(Boolean).join(" ");

  return `
    <span class="${className}">
      ${splitLabel.lines.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
    </span>
  `;
};

const isVideoTapeEnabled = (video = {}) => (
  video.tape_enabled === true
  || String(video.tape_enabled || "").toLowerCase() === "true"
);

const getVideoTapeSortOrder = (video = {}) => {
  const order = Number.parseInt(video.tape_sort_order, 10);

  return Number.isFinite(order) ? order : null;
};

const getNextTapeSortOrder = (excludeId = "") => {
  const maxOrder = state.videos.reduce((max, video) => {
    if (String(video.id || "") === String(excludeId || "")) return max;
    if (!isVideoTapeEnabled(video)) return max;

    return Math.max(max, getVideoTapeSortOrder(video) || 0);
  }, 0);

  return maxOrder + 1;
};

const getVideoTapeTitle = (video = {}) => (
  String(video.tape_title || video.title || "Untitled tape").trim() || "Untitled tape"
);

const getTapeTextureOptionsMarkup = (selectedTexture = defaultTapeTextureKey) => tapeTextureKeys
  .map((textureKey) => `
    <option value="${escapeHtml(textureKey)}"${textureKey === selectedTexture ? " selected" : ""}>
      ${escapeHtml(textureKey.toUpperCase())}
    </option>
  `)
  .join("");

const getTapePreviewMarkup = ({ enabled = true, title = "Untitled tape", texture = defaultTapeTextureKey } = {}) => {
  const textureKey = normalizeTapeTextureKey(texture);
  const label = String(title || "Untitled tape").trim() || "Untitled tape";

  return `
    <div class="tape-preview__cassette${enabled ? "" : " is-disabled"}">
      <img src="${escapeHtml(getTapeTextureUrl(textureKey))}" alt="" aria-hidden="true">
      ${getTapeLabelMarkup(label)}
    </div>
  `;
};

const compareTapeOrderItems = (a, b) => {
  const orderA = getVideoTapeSortOrder(a) || Number.MAX_SAFE_INTEGER;
  const orderB = getVideoTapeSortOrder(b) || Number.MAX_SAFE_INTEGER;
  const orderDifference = orderA - orderB;

  if (orderDifference) return orderDifference;

  return new Date(b.created_at || 0) - new Date(a.created_at || 0);
};

const getOrderedTapeItems = () => state.videos
  .filter(isVideoTapeEnabled)
  .slice()
  .sort(compareTapeOrderItems);

const setTapeOrderStatus = (message = "", tone = "") => {
  if (!dom.tapeOrderStatus) return;

  dom.tapeOrderStatus.textContent = message || "Drag tapes to change menu order.";
  dom.tapeOrderStatus.classList.toggle("is-saving", tone === "saving");
  dom.tapeOrderStatus.classList.toggle("is-error", tone === "error");
};

const getTapeOrderIdsFromList = (list) => Array.from(list?.querySelectorAll("[data-tape-order-item]") || [])
  .map((item) => item.dataset.videoId)
  .filter(Boolean);

const applyTapeOrder = (orderedIds) => {
  const orderById = new Map(orderedIds.map((id, index) => [String(id), index + 1]));

  state.videos.forEach((item) => {
    const nextOrder = orderById.get(String(item.id));

    if (nextOrder) {
      item.tape_sort_order = nextOrder;
    }
  });
};

const renderTapeOrderBox = () => {
  if (!dom.tapeOrderList) return;

  const tapes = getOrderedTapeItems();

  if (dom.tapeOrderCount) {
    dom.tapeOrderCount.textContent = `${tapes.length} tape${tapes.length === 1 ? "" : "s"}`;
  }

  if (!tapes.length) {
    dom.tapeOrderList.innerHTML = `<div class="tape-order-box__empty">No tapes yet</div>`;
    setTapeOrderStatus("Mark videos as TAPE to build the box.");
    return;
  }

  dom.tapeOrderList.innerHTML = tapes.map((video, index) => {
    const texture = normalizeTapeTextureKey(video.tape_texture);
    const title = getVideoTapeTitle(video);

    return `
      <button
        class="tape-order-box__cassette"
        type="button"
        data-tape-order-item
        data-video-id="${escapeHtml(video.id)}"
        aria-label="Tape ${index + 1}: ${escapeHtml(title)}"
      >
        <img src="${escapeHtml(getTapeTextureUrl(texture))}" alt="" aria-hidden="true">
        ${getTapeLabelMarkup(title)}
      </button>
    `;
  }).join("");

  setTapeOrderStatus();
};

const saveTapeOrder = async (orderedIds, successMessage = "") => {
  const previousVideos = state.videos.map((item) => ({ ...item }));

  applyTapeOrder(orderedIds);
  renderTapeOrderBox();
  renderVideos();
  setTapeOrderStatus("Saving tape order...", "saving");

  try {
    await service.updateTapeOrder(orderedIds);

    setTapeOrderStatus(successMessage || "Tape order saved.");
    if (successMessage) {
      showToast(successMessage);
    }
  } catch (error) {
    state.videos = previousVideos;
    renderTapeOrderBox();
    renderVideos();
    setTapeOrderStatus(error.message || "Could not save tape order.", "error");
    showToast(error.message || "Could not save tape order");
    throw error;
  }
};

const getVideoFormTapeState = (form, sourceVideo = {}) => {
  const enabled = Boolean(form.elements.tape_enabled?.checked);
  const fallbackTitle = String(form.elements.title?.value || sourceVideo.title || "").trim();
  const title = String(form.elements.tape_title?.value || sourceVideo.tape_title || fallbackTitle || "Untitled tape").trim();
  const texture = normalizeTapeTextureKey(form.elements.tape_texture?.value || sourceVideo.tape_texture);

  return {
    enabled,
    title: title || "Untitled tape",
    texture
  };
};

const getVideoTapePayload = (tapeState, sourceVideo = {}) => {
  if (!tapeState.enabled) {
    return {
      tape_enabled: false,
      tape_title: null,
      tape_texture: null,
      tape_sort_order: null
    };
  }

  return {
    tape_enabled: true,
    tape_title: tapeState.title,
    tape_texture: tapeState.texture,
    tape_sort_order: getVideoTapeSortOrder(sourceVideo) || getNextTapeSortOrder(sourceVideo.id)
  };
};

const syncTapePickerUi = (tapeState) => {
  const texture = normalizeTapeTextureKey(tapeState.texture);

  if (dom.tapePickerMode) {
    dom.tapePickerMode.textContent = texture.toUpperCase();
  }

  dom.tapeTextureOptions?.querySelectorAll("[data-tape-texture-option]").forEach((button) => {
    const isActive = button.dataset.tapeTextureOption === texture;

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (dom.videoTapePreview) {
    dom.videoTapePreview.innerHTML = getTapePreviewMarkup(tapeState);
  }
};

const syncVideoTapePanel = () => {
  if (!dom.videoForm) return;

  const tapeState = getVideoFormTapeState(dom.videoForm);
  const tapeTextureInput = dom.videoForm.elements.tape_texture;

  if (tapeTextureInput) {
    tapeTextureInput.value = tapeState.texture;
  }

  if (dom.tapePicker) {
    dom.tapePicker.hidden = !tapeState.enabled;
  }

  syncTapePickerUi(tapeState);
};

const setVideoFormTapeTexture = (textureKey) => {
  if (!dom.videoForm) return;

  const tapeTextureInput = dom.videoForm.elements.tape_texture;

  if (tapeTextureInput) {
    tapeTextureInput.value = normalizeTapeTextureKey(textureKey);
  }

  syncVideoTapePanel();
  updateVideoPreview();
};

const getVideoEditStatus = () => dom.videoEditForm?.querySelector("[data-video-edit-status]");

const setVideoEditStatus = (message = "", tone = "") => {
  const status = getVideoEditStatus();

  if (!status) return;

  status.textContent = message;
  status.classList.toggle("is-saving", tone === "saving");
  status.classList.toggle("is-success", tone === "success");
  status.classList.toggle("is-error", tone === "error");
};

const getVideoById = (id) => state.videos.find((item) => String(item.id) === String(id));

const getOptionalPositiveInteger = (value) => {
  const cleanValue = String(value ?? "").trim();

  if (!cleanValue) return null;

  const number = Number.parseInt(cleanValue, 10);

  return Number.isFinite(number) && number > 0 ? number : null;
};

const getOptionalPosterTime = (value) => {
  const cleanValue = String(value ?? "").trim();

  if (!cleanValue) return null;

  const number = Number(cleanValue);

  return Number.isFinite(number) && number >= 0 ? number : null;
};

const getVideoEditOrderValue = (video = {}) => {
  const order = getVideoSortOrder(video);

  return order === Number.MAX_SAFE_INTEGER ? "" : String(order);
};

const getVideoCurrentFileLabel = (video = {}, type = "poster") => {
  if (type === "mp4") {
    return video.preview_mp4_file_name
      || video.preview_mp4_storage_path
      || (getVideoPreviewMp4Url(video) ? "Uploaded MP4 preview" : "None");
  }

  if (type === "gif") {
    return video.thumbnail_gif_file_name
      || video.thumbnail_gif_storage_path
      || (video.thumbnail_gif_url ? "Uploaded GIF" : "None");
  }

  return video.poster_file_name
    || video.poster_storage_path
    || (video.poster_url ? "Uploaded poster" : "None");
};

const getVideoCurrentPreviewLabel = (video = {}) => {
  if (getVideoPreviewMp4Url(video)) {
    return getVideoCurrentFileLabel(video, "mp4");
  }

  if (getVideoThumbnailGifUrl(video)) {
    return getVideoCurrentFileLabel(video, "gif");
  }

  return "None";
};

const getVideoCurrentPreviewTypeLabel = (video = {}) => {
  if (getVideoPreviewMp4Url(video)) return "MP4";
  if (getVideoThumbnailGifUrl(video)) return "GIF";

  return "None";
};

const getVideoEditMediaMarkup = (video = {}) => {
  const media = getVideoMediaMarkup(video);

  return media === "No image" ? `<span>No image</span>` : media;
};

const getVideoEditFormMarkup = (video) => {
  const posterMode = getVideoPosterMode(video);
  const posterTime = getOptionalPosterTime(video.poster_time);
  const isTape = isVideoTapeEnabled(video);
  const tapeTexture = normalizeTapeTextureKey(video.tape_texture);
  const tapeTitle = getVideoTapeTitle(video);
  const tapeSortOrder = getVideoTapeSortOrder(video);

  return `
    <div class="video-edit-form__grid">
      <section class="video-edit-form__details" aria-label="Video details">
        <div class="video-edit-form__section-heading">
          <h3>Details</h3>
          <span>Project</span>
        </div>

        <label class="field video-edit-form__wide">
          <span>Title</span>
          <input type="text" name="title" value="${escapeHtml(video.title || "")}" required>
        </label>

        <label class="field video-edit-form__wide">
          <span>Vimeo URL</span>
          <input type="url" name="vimeo_url" value="${escapeHtml(video.vimeo_url || "")}" required>
        </label>

        <label class="field">
          <span>Portfolio order</span>
          <input type="number" name="sort_order" min="1" step="1" value="${escapeHtml(getVideoEditOrderValue(video))}">
        </label>

        <label class="switch video-edit-form__featured">
          <input type="checkbox" name="featured"${video.featured ? " checked" : ""}>
          <span>Featured</span>
        </label>

        <label class="field">
          <span>Poster mode</span>
          <select name="poster_mode">
            <option value=""${posterMode ? "" : " selected"}>None</option>
            <option value="manual"${posterMode === "manual" ? " selected" : ""}>Manual file</option>
            <option value="vimeo_time"${posterMode === "vimeo_time" ? " selected" : ""}>Vimeo timestamp</option>
          </select>
        </label>

        <label class="field">
          <span>Poster time</span>
          <input type="number" name="poster_time" min="0" step="0.1" value="${posterTime === null ? "" : escapeHtml(posterTime)}" placeholder="Seconds">
        </label>
      </section>

      <section class="video-edit-form__media" aria-label="Video media">
        <div class="video-edit-form__section-heading">
          <h3>Media</h3>
          <span>Files</span>
        </div>

        <div class="video-edit-form__media-layout">
          <div class="video-edit-form__media-current">
            <div class="video-edit-preview" aria-label="Current video preview">
              ${getVideoEditMediaMarkup(video)}
            </div>

            <div class="video-edit-current">
              <dl class="preview-meta">
                <div><dt>Preview</dt><dd>${escapeHtml(getVideoCurrentPreviewLabel(video))}</dd></div>
                <div><dt>Preview type</dt><dd>${escapeHtml(getVideoCurrentPreviewTypeLabel(video))}</dd></div>
                <div><dt>Poster</dt><dd>${escapeHtml(getVideoCurrentFileLabel(video, "poster"))}</dd></div>
                <div><dt>Poster mode</dt><dd>${escapeHtml(getPosterModeLabel(posterMode, video.poster_time))}</dd></div>
              </dl>
            </div>
          </div>

          <div class="video-edit-form__media-files">
            <label class="field">
              <span>Preview (GIF, MP4)</span>
              <input type="file" name="preview_file" accept="image/gif,video/mp4">
            </label>

            <label class="field">
              <span>Poster frame</span>
              <input type="file" name="poster" accept="image/png,image/jpeg,image/webp">
            </label>
          </div>
        </div>
      </section>

      <section class="video-edit-form__tape${isTape ? " is-tape-enabled" : ""}" aria-label="Tape settings">
        <div class="video-edit-form__section-heading">
          <h3>Tape</h3>
          <span data-video-edit-tape-mode>${isTape ? "On" : "Off"}</span>
        </div>

        <div class="video-edit-form__tape-layout">
          <div class="video-edit-form__tape-fields">
            <label class="switch">
              <input type="checkbox" name="tape_enabled"${isTape ? " checked" : ""}>
              <span>TAPE</span>
            </label>

            <label class="field">
              <span>Tape order</span>
              <input type="number" name="tape_sort_order" min="1" step="1" value="${tapeSortOrder ? escapeHtml(tapeSortOrder) : ""}">
            </label>

            <label class="field video-edit-form__wide">
              <span>Tape title</span>
              <input type="text" name="tape_title" value="${escapeHtml(tapeTitle)}" placeholder="${escapeHtml(video.title || "Cassette label")}">
            </label>

            <label class="field video-edit-form__wide">
              <span>Texture</span>
              <select name="tape_texture">
                ${getTapeTextureOptionsMarkup(tapeTexture)}
              </select>
            </label>
          </div>

          <div class="video-edit-tape-preview" data-video-edit-tape-preview>
            ${getTapePreviewMarkup({ enabled: isTape, title: tapeTitle, texture: tapeTexture })}
          </div>
        </div>
      </section>

      <p class="video-edit-form__status" data-video-edit-status role="status" aria-live="polite"></p>

      <div class="video-edit-form__actions">
        <button class="secondary-button" type="button" data-video-edit-close>
          <svg class="icon" aria-hidden="true"><use href="#icon-close"></use></svg>
          <span>Close</span>
        </button>
        <button class="primary-button" type="submit" data-video-edit-save>
          <svg class="icon" aria-hidden="true"><use href="#icon-upload"></use></svg>
          <span>Save video</span>
        </button>
      </div>
    </div>
  `;
};

const syncVideoEditTapeUi = () => {
  const form = dom.videoEditForm;
  const video = getVideoById(state.videoEdit.id);

  if (!form || !video) return;

  const tapeState = getVideoFormTapeState(form, video);
  const tapeSection = form.querySelector(".video-edit-form__tape");
  const tapeMode = form.querySelector("[data-video-edit-tape-mode]");
  const preview = form.querySelector("[data-video-edit-tape-preview]");

  tapeSection?.classList.toggle("is-tape-enabled", tapeState.enabled);

  if (tapeMode) {
    tapeMode.textContent = tapeState.enabled ? "On" : "Off";
  }

  if (preview) {
    preview.innerHTML = getTapePreviewMarkup(tapeState);
  }
};

const syncVideoEditPosterUi = () => {
  const form = dom.videoEditForm;

  if (!form) return;

  const posterInput = form.elements.poster;
  const posterModeInput = form.elements.poster_mode;
  const posterTimeInput = form.elements.poster_time;
  const hasManualPoster = Boolean(posterInput?.files?.[0]);

  if (hasManualPoster && posterModeInput) {
    posterModeInput.value = "manual";
  }

  if (posterTimeInput) {
    posterTimeInput.toggleAttribute("disabled", posterModeInput?.value !== "vimeo_time");
  }
};

const getVideoPreviewState = (form) => getPreviewFileState(form.elements.preview_file?.files[0] || null);

const openVideoEditModal = (id, trigger = null) => {
  const video = getVideoById(id);

  if (!video || !dom.videoEditModal || !dom.videoEditForm) {
    showToast("Video was not found");
    return;
  }

  state.videoEdit.id = String(video.id);
  state.videoEdit.restoreFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
  state.videoEdit.isSaving = false;

  if (dom.videoEditSummary) {
    dom.videoEditSummary.textContent = video.title || video.vimeo_url || "Untitled video";
  }

  dom.videoEditForm.dataset.videoId = String(video.id);
  dom.videoEditForm.innerHTML = getVideoEditFormMarkup(video);
  dom.videoEditModal.hidden = false;
  syncVideoEditTapeUi();
  syncVideoEditPosterUi();

  window.requestAnimationFrame(() => {
    dom.videoEditForm?.elements.title?.focus({ preventScroll: true });
  });
};

const closeVideoEditModal = () => {
  if (!dom.videoEditModal) return;

  dom.videoEditModal.hidden = true;
  dom.videoEditForm?.replaceChildren();
  state.videoEdit.id = null;
  state.videoEdit.isSaving = false;

  const focusTarget = state.videoEdit.restoreFocus;
  state.videoEdit.restoreFocus = null;

  if (focusTarget instanceof HTMLElement && document.contains(focusTarget)) {
    focusTarget.focus({ preventScroll: true });
  }
};

const collectVideoEditPayload = (form, video) => {
  const title = form.elements.title.value.trim();
  const vimeoUrl = form.elements.vimeo_url.value.trim();
  const posterFile = form.elements.poster?.files[0] || null;
  const posterMode = posterFile ? "manual" : normalizePosterMode(form.elements.poster_mode?.value);
  const posterTime = posterMode === "vimeo_time" ? getOptionalPosterTime(form.elements.poster_time?.value) : null;
  const previewState = getVideoPreviewState(form);
  const sortOrder = getOptionalPositiveInteger(form.elements.sort_order?.value);
  const tapeOrder = getOptionalPositiveInteger(form.elements.tape_sort_order?.value);

  if (!title || !vimeoUrl) {
    throw new Error("Title and Vimeo URL are required");
  }

  if (posterMode === "vimeo_time" && posterTime === null) {
    throw new Error("Poster time is required for Vimeo timestamp mode");
  }

  const tapeState = getVideoFormTapeState(form, video);
  const tapePayload = getVideoTapePayload(tapeState, video);

  if (tapeState.enabled && tapeOrder !== null) {
    tapePayload.tape_sort_order = tapeOrder;
  }

  const payload = {
    title,
    vimeo_url: vimeoUrl,
    featured: Boolean(form.elements.featured?.checked),
    poster_mode: posterMode || null,
    poster_time: posterMode === "vimeo_time" ? posterTime : null,
    ...tapePayload
  };

  if (sortOrder !== null) {
    payload.sort_order = sortOrder;
  }

  return {
    payload,
    files: {
      previewFile: previewState.file,
      poster: posterMode === "manual" ? posterFile : null
    },
    posterMode,
    posterTime
  };
};

const getVideoFormPosterState = (form) => {
  const manualPosterFile = form.elements.poster?.files[0] || null;
  const posterMode = normalizePosterMode(form.elements.poster_mode?.value);
  const rawPosterTime = String(form.elements.poster_time?.value || "").trim();
  const posterTime = Number(rawPosterTime);
  const hasPosterTime = rawPosterTime !== "" && Number.isFinite(posterTime) && posterTime >= 0;
  const isPosterPickerEnabled = isVideoFormPosterPickerEnabled(form);

  if (!isPosterPickerEnabled && manualPosterFile) {
    return {
      mode: "manual",
      time: null,
      file: manualPosterFile
    };
  }

  if (isPosterPickerEnabled && posterMode === "vimeo_time" && hasPosterTime) {
    return {
      mode: "vimeo_time",
      time: posterTime,
      file: null
    };
  }

  return {
    mode: null,
    time: null,
    file: null
  };
};

const setPosterPickerMessage = (message = "", tone = "") => {
  if (!dom.posterMessage) return;

  dom.posterMessage.textContent = message;
  dom.posterMessage.classList.toggle("is-error", tone === "error");
};

const updatePosterModeUi = () => {
  const mode = state.posterPicker.mode;
  const selectedTime = state.posterPicker.selectedTime;
  const isManual = mode === "manual";
  const isVimeoTime = mode === "vimeo_time";

  if (dom.posterModeLabel) {
    dom.posterModeLabel.classList.toggle("is-manual", isManual);
    dom.posterModeLabel.classList.toggle("is-vimeo-time", isVimeoTime);
    dom.posterModeLabel.textContent = isManual
      ? "Manual poster"
      : isVimeoTime
        ? "Vimeo timestamp"
        : "No poster selected";
  }

  if (dom.posterSelection) {
    dom.posterSelection.textContent = isManual
      ? "Manual poster active"
      : `Selected poster time: ${isVimeoTime && selectedTime !== null ? formatTimestamp(selectedTime) : "None"}`;
  }
};

const setPosterMode = (mode, value = null) => {
  if (!dom.videoForm) return;

  const posterModeInput = dom.videoForm.elements.poster_mode;
  const posterTimeInput = dom.videoForm.elements.poster_time;
  let nextMode = "";
  let nextTime = "";

  if (mode === "manual") {
    nextMode = "manual";
  }

  if (mode === "vimeo_time") {
    const numericTime = Math.max(0, Number(value) || 0);

    nextMode = "vimeo_time";
    nextTime = numericTime.toFixed(2);
    state.posterPicker.selectedTime = numericTime;
  } else {
    state.posterPicker.selectedTime = null;
  }

  if (posterModeInput) posterModeInput.value = nextMode;
  if (posterTimeInput) posterTimeInput.value = nextTime;

  state.posterPicker.mode = nextMode;
  updatePosterModeUi();
  updateVideoPreview();
};

const syncPosterSlider = (seconds = state.posterPicker.currentTime, duration = state.posterPicker.duration) => {
  const currentTime = Math.max(0, Number(seconds) || 0);
  const videoDuration = Math.max(0, Number(duration) || state.posterPicker.duration || 0);
  const sliderMax = videoDuration || Math.max(1, currentTime);

  state.posterPicker.currentTime = Math.min(currentTime, sliderMax);
  state.posterPicker.duration = videoDuration;

  if (dom.posterSlider) {
    dom.posterSlider.max = sliderMax.toFixed(2);
    dom.posterSlider.value = state.posterPicker.currentTime.toFixed(2);
  }

  if (dom.posterCurrentTime) {
    dom.posterCurrentTime.value = formatTimestamp(state.posterPicker.currentTime);
    dom.posterCurrentTime.textContent = formatTimestamp(state.posterPicker.currentTime);
  }

  if (dom.posterDuration) {
    dom.posterDuration.textContent = formatTimestamp(videoDuration);
  }
};

const destroyPosterPlayer = () => {
  const player = state.posterPicker.player;

  if (player && typeof player.destroy === "function") {
    player.destroy().catch(() => {});
  }

  state.posterPicker.player = null;
  state.posterPicker.vimeoKey = "";
};

const resetPosterPicker = (options = {}) => {
  const keepVisible = Boolean(options.keepVisible);
  const emptyLabel = options.emptyLabel || "Paste a Vimeo URL";
  const message = options.message || "";

  state.posterPicker.initToken += 1;
  destroyPosterPlayer();
  state.posterPicker.duration = 0;
  state.posterPicker.currentTime = 0;
  state.posterPicker.seekToken = 0;

  if (dom.posterPicker) {
    dom.posterPicker.hidden = !keepVisible;
  }

  if (dom.posterPlayer) {
    dom.posterPlayer.innerHTML = `<div class="poster-picker__empty">${escapeHtml(emptyLabel)}</div>`;
  }

  if (dom.posterControls) {
    dom.posterControls.hidden = true;
  }

  syncPosterSlider(0, 0);
  setPosterPickerMessage(message, message ? "error" : "");

  if (state.posterPicker.mode === "vimeo_time") {
    setPosterMode("");
  } else {
    updatePosterModeUi();
  }

  return state.posterPicker.initToken;
};

const initPosterPicker = async () => {
  if (!dom.videoForm || !dom.posterPicker || !dom.posterPlayer) return;
  if (!isVideoFormPosterPickerEnabled(dom.videoForm)) {
    resetPosterPicker();
    return;
  }

  const rawUrl = dom.videoForm.elements.vimeo_url?.value.trim() || "";

  if (state.posterPicker.urlTimer) {
    window.clearTimeout(state.posterPicker.urlTimer);
    state.posterPicker.urlTimer = null;
  }

  if (!rawUrl) {
    resetPosterPicker({ keepVisible: true });
    return;
  }

  const parsedUrl = parseVimeoUrl(rawUrl);

  if (!parsedUrl) {
    resetPosterPicker({
      keepVisible: true,
      emptyLabel: "No preview",
      message: "Invalid Vimeo URL"
    });
    return;
  }

  console.debug("[Poster Picker] initPosterPicker", {
    originalUrl: rawUrl,
    videoId: parsedUrl.id,
    embedUrl: parsedUrl.embedUrl
  });

  if (state.posterPicker.player && state.posterPicker.vimeoKey === parsedUrl.embedUrl) {
    dom.posterPicker.hidden = false;
    setPosterPickerMessage("");
    return;
  }

  const token = resetPosterPicker({
    keepVisible: true,
    emptyLabel: "Loading preview"
  });

  if (!window.Vimeo?.Player) {
    setPosterPickerMessage("Vimeo Player API unavailable", "error");
    return;
  }

  dom.posterPlayer.innerHTML = "";

  const embed = document.createElement("div");
  embed.className = "poster-picker__embed";
  dom.posterPlayer.append(embed);

  try {
    const player = new window.Vimeo.Player(embed, {
      url: parsedUrl.embedUrl,
      responsive: true,
      dnt: true,
      title: false,
      byline: false,
      portrait: false
    });

    state.posterPicker.player = player;
    state.posterPicker.vimeoKey = parsedUrl.embedUrl;

    player.on("timeupdate", (data) => {
      if (token !== state.posterPicker.initToken) return;
      syncPosterSlider(data.seconds, data.duration);
    });

    player.on("seeked", (data) => {
      if (token !== state.posterPicker.initToken) return;
      syncPosterSlider(data.seconds);
    });

    await player.ready();

    if (token !== state.posterPicker.initToken) {
      player.destroy().catch(() => {});
      return;
    }

    const [duration, currentTime] = await Promise.all([
      player.getDuration(),
      player.getCurrentTime()
    ]);

    if (token !== state.posterPicker.initToken) return;

    if (dom.posterControls) {
      dom.posterControls.hidden = false;
    }

    syncPosterSlider(currentTime, duration);
    setPosterPickerMessage("");
  } catch {
    if (token !== state.posterPicker.initToken) return;

    resetPosterPicker({
      keepVisible: true,
      emptyLabel: "No preview",
      message: "Could not load Vimeo preview"
    });
  }
};

const queuePosterPickerInit = () => {
  if (!dom.videoForm) return;
  if (!isVideoFormPosterPickerEnabled(dom.videoForm)) {
    resetPosterPicker();
    return;
  }

  const rawUrl = dom.videoForm.elements.vimeo_url?.value.trim() || "";

  if (state.posterPicker.urlTimer) {
    window.clearTimeout(state.posterPicker.urlTimer);
  }

  if (!rawUrl) {
    resetPosterPicker({ keepVisible: true });
    return;
  }

  state.posterPicker.urlTimer = window.setTimeout(initPosterPicker, 250);
};

const handlePosterSliderInput = () => {
  if (!dom.posterSlider || !state.posterPicker.player) return;

  const seconds = Math.max(0, Number(dom.posterSlider.value) || 0);
  const seekToken = state.posterPicker.seekToken + 1;

  state.posterPicker.seekToken = seekToken;
  syncPosterSlider(seconds);

  state.posterPicker.player.setCurrentTime(seconds)
    .then((nextTime) => {
      if (seekToken !== state.posterPicker.seekToken) return;
      syncPosterSlider(nextTime);
      setPosterPickerMessage("");
    })
    .catch(() => {
      if (seekToken !== state.posterPicker.seekToken) return;
      setPosterPickerMessage("Could not seek Vimeo preview", "error");
    });
};

const handleUseCurrentFrame = async () => {
  if (!state.posterPicker.player) {
    setPosterPickerMessage("No Vimeo preview", "error");
    return;
  }

  try {
    const currentTime = await state.posterPicker.player.getCurrentTime();

    setPosterMode("vimeo_time", currentTime);
    setPosterPickerMessage("");
  } catch {
    setPosterPickerMessage("Could not read current frame time", "error");
  }
};

const handlePosterPickerToggle = () => {
  if (!dom.videoForm) return;

  const isEnabled = syncPosterPickerToggle();
  const posterInput = dom.videoForm.elements.poster;

  if (isEnabled) {
    if (posterInput) {
      posterInput.value = "";
    }

    setPosterMode("");
    initPosterPicker();
  } else {
    resetPosterPicker();
    setPosterMode("");
  }

  updateVideoPreview();
};

const revokeVideoPreviewUrls = () => {
  state.videoPreview.urls.forEach((url) => URL.revokeObjectURL(url));
  state.videoPreview.urls = [];
};

const createVideoPreviewUrl = (file) => {
  if (!file) return "";

  const url = URL.createObjectURL(file);

  state.videoPreview.urls.push(url);
  return url;
};

const updateVideoPreview = () => {
  if (!dom.videoPreview || !dom.videoForm) return;

  const title = dom.videoForm.elements.title.value.trim() || "Untitled";
  const isFeatured = dom.videoForm.elements.featured.checked;
  const isPosterPickerEnabled = syncPosterPickerToggle();
  const posterFile = isPosterPickerEnabled ? null : dom.videoForm.elements.poster.files[0];
  const posterState = getVideoFormPosterState(dom.videoForm);
  let previewState = {
    file: null,
    type: ""
  };
  let previewWarning = "";

  try {
    previewState = getVideoPreviewState(dom.videoForm);
  } catch (error) {
    previewWarning = error.message || "Preview file needs attention";
  }

  const tapeState = getVideoFormTapeState(dom.videoForm);
  const posterModeLabel = getPosterModeLabel(posterState.mode, posterState.time);
  const previewModeLabel = previewState.file
    ? `${previewState.type.toUpperCase()} ${previewState.file.name}`
    : "None";
  const posterMetaLabel = posterFile?.name
    || (posterState.mode === "vimeo_time" ? `Vimeo ${formatTimestamp(posterState.time)}` : "None");

  syncVideoTapePanel();
  revokeVideoPreviewUrls();

  const posterUrl = createVideoPreviewUrl(posterFile);
  const previewUrl = createVideoPreviewUrl(previewState.file);
  const hasPosterTime = posterState.mode === "vimeo_time";
  const hasHoverPreview = Boolean(previewUrl && (posterUrl || hasPosterTime));
  const isMp4Preview = previewState.type === "mp4";
  const isGifPreview = previewState.type === "gif";
  const primaryPreviewUrl = posterUrl || (!hasPosterTime ? previewUrl : "");
  let previewContent = `<div class="media-preview media-preview--empty media-preview--landscape">No image</div>`;

  if (primaryPreviewUrl || hasPosterTime || previewUrl) {
    const hoverClass = hasHoverPreview ? (isMp4Preview ? " has-hover-preview" : " has-hover-gif") : "";
    const primaryPreviewMarkup = isMp4Preview && primaryPreviewUrl === previewUrl
      ? `<video class="video-upload-preview__poster" src="${escapeHtml(primaryPreviewUrl)}" muted loop playsinline autoplay></video>`
      : `<img class="video-upload-preview__poster" src="${escapeHtml(primaryPreviewUrl)}" alt="">`;
    const hoverPreviewMarkup = hasHoverPreview
      ? isMp4Preview
        ? `<video class="video-upload-preview__motion" src="${escapeHtml(previewUrl)}" muted loop playsinline autoplay aria-hidden="true"></video>`
        : `<img class="video-upload-preview__gif" src="${escapeHtml(previewUrl)}" alt="" aria-hidden="true">`
      : "";
    const primaryBadge = posterUrl
      ? "Poster"
      : hasPosterTime
        ? "Vimeo frame"
        : isMp4Preview
          ? "MP4"
          : isGifPreview
            ? "GIF"
            : "Preview";
    const hoverBadge = hasHoverPreview ? `<span>Hover ${isMp4Preview ? "MP4" : "GIF"}</span>` : "";

    previewContent = `
      <div
        class="media-preview media-preview--landscape video-upload-preview${hoverClass}${hasPosterTime && !posterUrl ? " has-vimeo-poster" : ""}"
        ${hasHoverPreview ? "tabindex=\"0\"" : ""}
        aria-label="${escapeHtml(hasHoverPreview ? "Video upload preview, hover to show selected preview" : "Video upload preview")}"
      >
        ${primaryPreviewUrl ? primaryPreviewMarkup : `
          <div class="video-upload-preview__placeholder">
            <span>Vimeo poster</span>
            <strong>${escapeHtml(formatTimestamp(posterState.time))}</strong>
          </div>
        `}
        ${hoverPreviewMarkup}
        <div class="video-upload-preview__badges" aria-hidden="true">
          <span>${primaryBadge}</span>
          ${hoverBadge}
        </div>
      </div>
    `;
  }

  dom.videoPreview.innerHTML = `
    ${previewContent}
    <dl class="preview-meta">
      <div><dt>Title</dt><dd>${escapeHtml(title)}</dd></div>
      <div><dt>Card</dt><dd>${isFeatured ? "Featured" : "Standard"}</dd></div>
      <div><dt>Preview</dt><dd>${escapeHtml(previewModeLabel)}</dd></div>
      ${previewWarning ? `<div><dt>Preview warning</dt><dd>${escapeHtml(previewWarning)}</dd></div>` : ""}
      <div><dt>Poster</dt><dd>${escapeHtml(posterMetaLabel)}</dd></div>
      <div><dt>Poster mode</dt><dd>${escapeHtml(posterModeLabel)}</dd></div>
      <div><dt>Tape</dt><dd>${tapeState.enabled ? escapeHtml(`${tapeState.title} / ${tapeState.texture.toUpperCase()}`) : "Off"}</dd></div>
      ${posterState.mode === "vimeo_time" ? `<div><dt>Poster time</dt><dd>${formatTimestamp(posterState.time)}</dd></div>` : ""}
    </dl>
  `;
};

const syncPosterPickerToggle = () => {
  if (!dom.videoForm) return false;

  const isEnabled = isVideoFormPosterPickerEnabled(dom.videoForm);
  const posterInput = dom.videoForm.elements.poster;

  if (posterInput) {
    posterInput.disabled = isEnabled;
  }

  if (!isEnabled && dom.posterPicker) {
    dom.posterPicker.hidden = true;
  }

  return isEnabled;
};

const getDeleteContext = (type, id) => {
  if (type === "message") {
    const message = state.messages.find((item) => item.id === id);

    if (!message) return null;

    return {
      title: "Delete message?",
      description: `${message.name} - ${message.contact}`,
      permanentLabel: "Delete permanently",
      canArchive: !message.archived_at
    };
  }

  if (type === "gallery") {
    const item = state.gallery.find((galleryItem) => galleryItem.id === id);

    if (!item) return null;

    return {
      title: "Delete image?",
      description: item.title || item.file_name || "Untitled image",
      permanentLabel: "Delete image",
      canArchive: false
    };
  }

  if (type === "video") {
    const item = state.videos.find((videoItem) => videoItem.id === id);

    if (!item) return null;

    return {
      title: "Delete video?",
      description: item.title || item.vimeo_url || "Untitled video",
      permanentLabel: "Delete video",
      canArchive: false
    };
  }

  return null;
};

const openDeleteModal = (type, id) => {
  const context = getDeleteContext(type, id);

  if (!context || !dom.deleteModal) return;

  state.pendingDelete = { type, id };

  const title = dom.deleteModal.querySelector("[data-delete-title]");
  const archiveButton = dom.deleteModal.querySelector("[data-delete-action='archive']");
  const permanentLabel = dom.deleteModal.querySelector("[data-delete-action='permanent'] span");

  if (title) {
    title.textContent = context.title;
  }

  if (dom.deleteMessageTitle) {
    dom.deleteMessageTitle.textContent = context.description;
  }

  if (archiveButton) {
    archiveButton.hidden = !context.canArchive;
  }

  if (permanentLabel) {
    permanentLabel.textContent = context.permanentLabel;
  }

  dom.deleteModal.hidden = false;
};

const closeDeleteModal = () => {
  state.pendingDelete = null;

  if (dom.deleteModal) {
    dom.deleteModal.hidden = true;
  }
};

const openWatcherModal = () => {
  if (!dom.watcherModal) return;

  renderWatcherModal();
  dom.watcherModal.hidden = false;
};

const closeWatcherModal = () => {
  if (dom.watcherModal) {
    dom.watcherModal.hidden = true;
  }
};

const refreshData = async () => {
  if (isAuthEnabled() && !state.authSession) {
    const hasSession = await ensureAuthSession();

    if (!hasSession) return;
  }

  dom.refresh?.setAttribute("disabled", "true");
  setConnectionStatus("checking", "Checking Supabase");

  try {
    const nextState = await service.loadAll();

    state.messages = nextState.messages || [];
    state.gallery = nextState.gallery || [];
    state.videos = nextState.videos || [];
    renderAll();
    setConnectionStatus("connected", "Supabase connected");
  } catch (error) {
    const message = error.message || "Could not load admin data";

    setConnectionStatus("error", "Supabase error");
    dom.mode?.setAttribute("title", message);
    showToast(message);
  } finally {
    dom.refresh?.removeAttribute("disabled");
  }
};

const hasCleanupWarnings = (result) => (
  Array.isArray(result?.cleanupWarnings) && result.cleanupWarnings.length > 0
);

const showCleanupAwareToast = (message, result) => {
  showToast(hasCleanupWarnings(result) ? `${message}, storage cleanup warning` : message);
};

const deleteItemImmediately = async (type, id) => {
  try {
    if (type === "message") {
      await service.deleteMessage(id);
      showToast("Message deleted");
    } else if (type === "gallery") {
      const result = await service.deleteGalleryItem(id);

      showCleanupAwareToast("Image deleted", result);
    } else if (type === "video") {
      const result = await service.deleteVideoItem(id);

      showCleanupAwareToast("Video deleted", result);
    }

    renderAll();
  } catch (error) {
    console.error("Admin delete error:", error);
    showToast(error.message || "Could not delete item");
  }
};

const handleLogin = async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;

  setAuthError("");

  if (!email || !password) {
    setAuthError("Email and password are required");
    return;
  }

  setAuthLoading(true);

  try {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (!data.session) throw new Error("No admin session returned");

    applyAuthSession(data.session);
    form.reset();
    await refreshData();
    showToast("Signed in");
  } catch (error) {
    setAuthError(error.message || "Could not sign in");
  } finally {
    setAuthLoading(false);
  }
};

const handleLogout = async () => {
  dom.logout?.setAttribute("disabled", "true");
  state.isSigningOut = true;

  try {
    const { error } = await getSupabaseClient().auth.signOut();

    if (error) throw error;

    clearAdminData();
    applyAuthSession(null);
    setAuthError("");
    showToast("Signed out");
  } catch (error) {
    showToast(error.message || "Could not sign out");
  } finally {
    state.isSigningOut = false;
    dom.logout?.removeAttribute("disabled");
  }
};

const bindAuthStateChanges = () => {
  if (!isAuthEnabled()) return;

  try {
    getSupabaseClient().auth.onAuthStateChange((event, session) => {
      const hadSession = Boolean(state.authSession);

      if (session) {
        applyAuthSession(session);
        setAuthError("");
        return;
      }

      if (hadSession && event === "SIGNED_OUT" && !state.isSigningOut) {
        clearAdminData();
        showToast("Signed out");
      }

      applyAuthSession(null);
    });
  } catch (error) {
    setAdminVisibility(false);
    setConnectionStatus("error", "Auth error");
    setAuthError(error.message || "Could not bind admin session");
  }
};

dom.navItems.forEach((item) => {
  item.addEventListener("click", () => setPanel(item.dataset.panelTarget));
});

dom.loginForm?.addEventListener("submit", handleLogin);
dom.logout?.addEventListener("click", handleLogout);

dom.refresh?.addEventListener("click", async () => {
  await refreshData();

  if (!isAuthEnabled() || state.authSession) {
    showToast("Data refreshed");
  }
});

dom.watcherOpen?.addEventListener("click", openWatcherModal);
dom.linkPreviewToggle?.addEventListener("click", () => {
  setLinkPreviewEnabled(!state.linkPreview.enabled);
});
setLinkPreviewToggleState();
document.addEventListener("pointerover", handleLinkPreviewPointerOver);
document.addEventListener("pointermove", handleLinkPreviewPointerMove);
document.addEventListener("pointerout", handleLinkPreviewPointerOut);
document.addEventListener("focusin", (event) => {
  const anchor = getPreviewAnchorFromEvent(event);

  if (!anchor) return;

  const rect = anchor.getBoundingClientRect();

  showLinkPreview(anchor, {
    clientX: rect.left + Math.min(rect.width * .72, 260),
    clientY: rect.bottom
  });
});
document.addEventListener("focusout", (event) => {
  if (!state.linkPreview.activeAnchor) return;
  if (event.relatedTarget instanceof Node && state.linkPreview.activeAnchor.contains(event.relatedTarget)) return;

  hideLinkPreview();
});

dom.messageFilters?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-message-filter]");

  if (button) {
    setMessageFilter(button.dataset.messageFilter);
  }
});

dom.messageList?.addEventListener("click", async (event) => {
  const expandButton = event.target.closest("[data-message-expand]");
  const readButton = event.target.closest("[data-toggle-read]");
  const archiveButton = event.target.closest("[data-archive-message]");
  const restoreButton = event.target.closest("[data-restore-message]");
  const deleteButton = event.target.closest("[data-delete-message]");

  if (expandButton) {
    const card = expandButton.closest("[data-message-card]");
    const isExpanded = !card?.classList.contains("is-expanded");
    const label = expandButton.querySelector("span");

    card?.classList.toggle("is-expanded", isExpanded);
    expandButton.setAttribute("aria-expanded", String(isExpanded));
    if (label) {
      label.textContent = isExpanded ? "Collapse" : "Expand";
    }

    return;
  }

  if (readButton) {
    try {
      await service.toggleMessageRead(readButton.dataset.toggleRead);
      renderMessages();
    } catch (error) {
      showToast(error.message || "Could not update message");
    }

    return;
  }

  if (archiveButton) {
    try {
      await service.archiveMessage(archiveButton.dataset.archiveMessage);
      renderMessages();
      showToast("Message archived");
    } catch (error) {
      showToast(error.message || "Could not archive message");
    }

    return;
  }

  if (restoreButton) {
    try {
      await service.restoreMessage(restoreButton.dataset.restoreMessage);
      renderMessages();
      showToast("Message restored");
    } catch (error) {
      showToast(error.message || "Could not restore message");
    }

    return;
  }

  if (deleteButton) {
    openDeleteModal("message", deleteButton.dataset.deleteMessage);
  }
});

dom.galleryList?.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete-gallery]");

  if (deleteButton) {
    await deleteItemImmediately("gallery", deleteButton.dataset.deleteGallery);
  }
});

let galleryDragState = null;

const getGalleryIdsFromList = (list) => Array.from(list?.querySelectorAll("[data-gallery-card]") || [])
  .map((card) => card.dataset.galleryId)
  .filter(Boolean);

const moveGalleryDragGhost = (event) => {
  if (!galleryDragState?.ghost) return;

  galleryDragState.ghost.style.left = `${event.clientX - galleryDragState.offsetX}px`;
  galleryDragState.ghost.style.top = `${event.clientY - galleryDragState.offsetY}px`;
};

const createGalleryDragGhost = (card, event) => {
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);

  ghost.classList.add("gallery-drag-ghost");
  ghost.removeAttribute("data-gallery-card");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  document.body.append(ghost);

  galleryDragState.ghost = ghost;
  galleryDragState.offsetX = event.clientX - rect.left;
  galleryDragState.offsetY = event.clientY - rect.top;
  moveGalleryDragGhost(event);
};

const getGalleryDropTarget = (event, placement) => {
  const element = document.elementFromPoint(event.clientX, event.clientY);

  if (!(element instanceof Element)) return null;

  const card = element.closest("[data-gallery-card]");

  if (card) {
    const list = card.closest("[data-gallery-section-list]");

    if (card.dataset.galleryPlacement === placement && list?.dataset.gallerySectionList === placement) {
      return { card, list };
    }

    return null;
  }

  const list = element.closest("[data-gallery-section-list]");

  if (list?.dataset.gallerySectionList === placement) {
    return { card: null, list };
  }

  return null;
};

const moveGalleryDragCard = (event) => {
  if (!galleryDragState?.isDragging) return;

  const target = getGalleryDropTarget(event, galleryDragState.placement);

  if (!target || target.list !== galleryDragState.list) return;

  if (!target.card) {
    target.list.append(galleryDragState.card);
    return;
  }

  if (target.card === galleryDragState.card) return;

  const rect = target.card.getBoundingClientRect();
  const isSameRow = event.clientY >= rect.top && event.clientY <= rect.bottom;
  const insertBefore = isSameRow
    ? event.clientX < rect.left + (rect.width / 2)
    : event.clientY < rect.top + (rect.height / 2);

  target.list.insertBefore(galleryDragState.card, insertBefore ? target.card : target.card.nextSibling);
};

const cleanupGalleryDrag = () => {
  galleryDragState?.card?.classList.remove("is-drag-source");
  galleryDragState?.ghost?.remove();
  document.body.classList.remove("is-gallery-card-dragging");
  galleryDragState = null;
};

const handleGalleryDragMove = (event) => {
  if (!galleryDragState || galleryDragState.pointerId !== event.pointerId) return;

  const distance = Math.hypot(
    event.clientX - galleryDragState.startX,
    event.clientY - galleryDragState.startY
  );

  if (!galleryDragState.isDragging) {
    if (distance < 6) return;

    galleryDragState.isDragging = true;
    galleryDragState.card.classList.add("is-drag-source");
    document.body.classList.add("is-gallery-card-dragging");
    createGalleryDragGhost(galleryDragState.card, event);
  }

  event.preventDefault();
  moveGalleryDragGhost(event);
  moveGalleryDragCard(event);
};

const finishGalleryDrag = (event) => {
  if (!galleryDragState || galleryDragState.pointerId !== event.pointerId) return;

  const dragState = galleryDragState;

  if (
    typeof dragState.card.hasPointerCapture === "function"
    && dragState.card.hasPointerCapture(event.pointerId)
  ) {
    dragState.card.releasePointerCapture(event.pointerId);
  }

  const orderedIds = dragState.isDragging ? getGalleryIdsFromList(dragState.list) : dragState.originalIds;
  const isChanged = dragState.isDragging && orderedIds.join("|") !== dragState.originalIds.join("|");

  if (dragState.isDragging) {
    event.preventDefault();
  }

  cleanupGalleryDrag();

  if (isChanged) {
    saveGalleryOrder(dragState.placement, orderedIds, "Gallery order saved")
      .catch((error) => console.error("Gallery order save error:", error));
  }
};

dom.galleryList?.addEventListener("pointerdown", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const card = target?.closest("[data-gallery-card]");

  if (!card || target.closest("button, a, input, textarea, select")) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  const list = card.closest("[data-gallery-section-list]");
  const placement = card.dataset.galleryPlacement;

  if (!list || !placement) return;

  event.preventDefault();

  galleryDragState = {
    card,
    ghost: null,
    isDragging: false,
    list,
    offsetX: 0,
    offsetY: 0,
    originalIds: getGalleryIdsFromList(list),
    placement,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY
  };

  card.setPointerCapture?.(event.pointerId);
});

window.addEventListener("pointermove", handleGalleryDragMove, { passive: false });
window.addEventListener("pointerup", finishGalleryDrag);
window.addEventListener("pointercancel", finishGalleryDrag);

let tapeOrderDragState = null;

const moveTapeOrderDragGhost = (event) => {
  if (!tapeOrderDragState?.ghost) return;

  tapeOrderDragState.ghost.style.left = `${event.clientX - tapeOrderDragState.offsetX}px`;
  tapeOrderDragState.ghost.style.top = `${event.clientY - tapeOrderDragState.offsetY}px`;
};

const createTapeOrderDragGhost = (item, event) => {
  const rect = item.getBoundingClientRect();
  const ghost = item.cloneNode(true);

  ghost.classList.add("tape-order-drag-ghost");
  ghost.classList.remove("is-drag-source");
  ghost.removeAttribute("data-tape-order-item");
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("tabindex", "-1");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.querySelectorAll("img").forEach((image) => {
    image.draggable = false;
  });
  document.body.append(ghost);

  tapeOrderDragState.ghost = ghost;
  tapeOrderDragState.offsetX = event.clientX - rect.left;
  tapeOrderDragState.offsetY = event.clientY - rect.top;
  moveTapeOrderDragGhost(event);
};

const getTapeOrderDropTarget = (event) => {
  const element = document.elementFromPoint(event.clientX, event.clientY);

  if (!(element instanceof Element)) return null;

  const item = element.closest("[data-tape-order-item]");

  if (item && dom.tapeOrderList?.contains(item)) {
    return { item, list: dom.tapeOrderList };
  }

  const list = element.closest("[data-tape-order-list]");

  if (list && list === dom.tapeOrderList) {
    return { item: null, list };
  }

  return null;
};

const moveTapeOrderDragItem = (event) => {
  if (!tapeOrderDragState?.isDragging) return;

  const target = getTapeOrderDropTarget(event);

  if (!target || target.list !== tapeOrderDragState.list) return;

  if (!target.item) {
    target.list.append(tapeOrderDragState.item);
    return;
  }

  if (target.item === tapeOrderDragState.item) return;

  const rect = target.item.getBoundingClientRect();
  const insertBefore = event.clientY < rect.top + (rect.height / 2);

  target.list.insertBefore(tapeOrderDragState.item, insertBefore ? target.item : target.item.nextSibling);
};

const cleanupTapeOrderDrag = () => {
  tapeOrderDragState?.item?.classList.remove("is-drag-source");
  tapeOrderDragState?.ghost?.remove();
  tapeOrderDragState = null;
};

const handleTapeOrderDragMove = (event) => {
  if (!tapeOrderDragState || tapeOrderDragState.pointerId !== event.pointerId) return;

  const distance = Math.hypot(
    event.clientX - tapeOrderDragState.startX,
    event.clientY - tapeOrderDragState.startY
  );

  if (!tapeOrderDragState.isDragging) {
    if (distance < 5) return;

    tapeOrderDragState.isDragging = true;
    tapeOrderDragState.item.classList.add("is-drag-source");
    tapeOrderDragState.item.setPointerCapture?.(event.pointerId);
    createTapeOrderDragGhost(tapeOrderDragState.item, event);
  }

  event.preventDefault();
  moveTapeOrderDragGhost(event);
  moveTapeOrderDragItem(event);
};

const finishTapeOrderDrag = (event) => {
  if (!tapeOrderDragState || tapeOrderDragState.pointerId !== event.pointerId) return;

  const dragState = tapeOrderDragState;

  if (
    typeof dragState.item.hasPointerCapture === "function"
    && dragState.item.hasPointerCapture(event.pointerId)
  ) {
    dragState.item.releasePointerCapture(event.pointerId);
  }

  const orderedIds = dragState.isDragging ? getTapeOrderIdsFromList(dragState.list) : dragState.originalIds;
  const isChanged = dragState.isDragging && orderedIds.join("|") !== dragState.originalIds.join("|");

  if (dragState.isDragging) {
    event.preventDefault();
  }

  cleanupTapeOrderDrag();

  if (isChanged) {
    saveTapeOrder(orderedIds, "Tape order saved")
      .catch((error) => console.error("Tape order save error:", error));
  }
};

dom.tapeOrderList?.addEventListener("pointerdown", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const item = target?.closest("[data-tape-order-item]");

  if (!item || !dom.tapeOrderList?.contains(item)) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  tapeOrderDragState = {
    ghost: null,
    isDragging: false,
    item,
    list: dom.tapeOrderList,
    offsetX: 0,
    offsetY: 0,
    originalIds: getTapeOrderIdsFromList(dom.tapeOrderList),
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY
  };
});

window.addEventListener("pointermove", handleTapeOrderDragMove, { passive: false });
window.addEventListener("pointerup", finishTapeOrderDrag);
window.addEventListener("pointercancel", finishTapeOrderDrag);

let videoDragState = null;
let shouldSuppressVideoClick = false;

const getVideoIdsFromList = (list) => Array.from(list?.querySelectorAll("[data-video-card]") || [])
  .map((card) => card.dataset.videoId)
  .filter(Boolean);

const moveVideoDragGhost = (event) => {
  if (!videoDragState?.ghost) return;

  videoDragState.ghost.style.left = `${event.clientX - videoDragState.offsetX}px`;
  videoDragState.ghost.style.top = `${event.clientY - videoDragState.offsetY}px`;
};

const createVideoDragGhost = (card, event) => {
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);

  ghost.classList.add("video-drag-ghost");
  ghost.removeAttribute("data-video-card");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  document.body.append(ghost);

  videoDragState.ghost = ghost;
  videoDragState.offsetX = event.clientX - rect.left;
  videoDragState.offsetY = event.clientY - rect.top;
  moveVideoDragGhost(event);
};

const getVideoDropTarget = (event) => {
  const element = document.elementFromPoint(event.clientX, event.clientY);

  if (!(element instanceof Element)) return null;

  const card = element.closest("[data-video-card]");

  if (card) {
    const list = card.closest("[data-video-list]");

    return list ? { card, list } : null;
  }

  const list = element.closest("[data-video-list]");

  return list ? { card: null, list } : null;
};

const moveVideoDragCard = (event) => {
  if (!videoDragState?.isDragging) return;

  const target = getVideoDropTarget(event);

  if (!target || target.list !== videoDragState.list) return;

  if (!target.card) {
    target.list.append(videoDragState.card);
    return;
  }

  if (target.card === videoDragState.card) return;

  const rect = target.card.getBoundingClientRect();
  const isSameRow = event.clientY >= rect.top && event.clientY <= rect.bottom;
  const insertBefore = isSameRow
    ? event.clientX < rect.left + (rect.width / 2)
    : event.clientY < rect.top + (rect.height / 2);

  target.list.insertBefore(videoDragState.card, insertBefore ? target.card : target.card.nextSibling);
};

const cleanupVideoDrag = () => {
  videoDragState?.card?.classList.remove("is-drag-source");
  videoDragState?.ghost?.remove();
  document.body.classList.remove("is-video-card-dragging");
  videoDragState = null;
};

const handleVideoDragMove = (event) => {
  if (!videoDragState || videoDragState.pointerId !== event.pointerId) return;

  const distance = Math.hypot(
    event.clientX - videoDragState.startX,
    event.clientY - videoDragState.startY
  );

  if (!videoDragState.isDragging) {
    if (distance < 6) return;

    videoDragState.isDragging = true;
    videoDragState.card.classList.add("is-drag-source");
    document.body.classList.add("is-video-card-dragging");
    videoDragState.card.setPointerCapture?.(event.pointerId);
    createVideoDragGhost(videoDragState.card, event);
  }

  event.preventDefault();
  moveVideoDragGhost(event);
  moveVideoDragCard(event);
};

const finishVideoDrag = (event) => {
  if (!videoDragState || videoDragState.pointerId !== event.pointerId) return;

  const dragState = videoDragState;

  if (
    typeof dragState.card.hasPointerCapture === "function"
    && dragState.card.hasPointerCapture(event.pointerId)
  ) {
    dragState.card.releasePointerCapture(event.pointerId);
  }

  const orderedIds = dragState.isDragging ? getVideoIdsFromList(dragState.list) : dragState.originalIds;
  const isChanged = dragState.isDragging && orderedIds.join("|") !== dragState.originalIds.join("|");

  if (dragState.isDragging) {
    event.preventDefault();
    shouldSuppressVideoClick = true;
    window.setTimeout(() => {
      shouldSuppressVideoClick = false;
    }, 80);
  }

  cleanupVideoDrag();

  if (isChanged) {
    saveVideoOrder(orderedIds, "Video order saved")
      .catch((error) => console.error("Video order save error:", error));
  }
};

dom.videoList?.addEventListener("pointerdown", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const card = target?.closest("[data-video-card]");

  if (!card || target.closest("button, input, textarea, select, label")) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  const list = card.closest("[data-video-list]");

  if (!list) return;

  videoDragState = {
    card,
    ghost: null,
    isDragging: false,
    list,
    offsetX: 0,
    offsetY: 0,
    originalIds: getVideoIdsFromList(list),
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY
  };
});

window.addEventListener("pointermove", handleVideoDragMove, { passive: false });
window.addEventListener("pointerup", finishVideoDrag);
window.addEventListener("pointercancel", finishVideoDrag);

dom.videoList?.addEventListener("click", async (event) => {
  if (shouldSuppressVideoClick && event.target.closest("[data-video-card]")) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const editButton = event.target.closest("[data-edit-video]");
  const deleteButton = event.target.closest("[data-delete-video]");

  if (editButton) {
    openVideoEditModal(editButton.dataset.editVideo, editButton);
    return;
  }

  if (deleteButton) {
    await deleteItemImmediately("video", deleteButton.dataset.deleteVideo);
  }
});

dom.videoEditModal?.addEventListener("click", (event) => {
  if (state.videoEdit.isSaving) return;

  if (event.target.closest("[data-video-edit-close]")) {
    closeVideoEditModal();
  }
});

dom.videoEditForm?.addEventListener("input", (event) => {
  if (!event.target?.name) return;

  if (["tape_enabled", "tape_title", "tape_texture"].includes(event.target.name)) {
    syncVideoEditTapeUi();
  }

  if (["poster", "poster_mode"].includes(event.target.name)) {
    syncVideoEditPosterUi();
  }
});

dom.videoEditForm?.addEventListener("change", (event) => {
  if (!event.target?.name) return;

  if (["tape_enabled", "tape_title", "tape_texture"].includes(event.target.name)) {
    syncVideoEditTapeUi();
  }

  if (["poster", "poster_mode"].includes(event.target.name)) {
    syncVideoEditPosterUi();
  }
});

dom.videoEditForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (state.videoEdit.isSaving) return;

  const form = event.currentTarget;
  const id = form.dataset.videoId || state.videoEdit.id;
  const video = getVideoById(id);
  const submit = form.querySelector("[data-video-edit-save]");

  if (!video) {
    setVideoEditStatus("Video was not found", "error");
    return;
  }

  let editState;

  try {
    editState = collectVideoEditPayload(form, video);
  } catch (error) {
    setVideoEditStatus(error.message || "Could not read video fields", "error");
    return;
  }

  state.videoEdit.isSaving = true;
  submit?.setAttribute("disabled", "true");
  setVideoEditStatus("Saving video...", "saving");

  let didSaveVideo = false;

  try {
    let result = await service.updateVideoItem(id, editState.payload, editState.files);
    didSaveVideo = true;

    renderTapeOrderBox();
    renderVideos();
    renderPortfolioIndicators();

    if (editState.posterMode === "vimeo_time") {
      setVideoEditStatus("Video saved. Generating Vimeo poster...", "saving");
      const updatedVideo = getVideoById(id) || result;
      const posterResult = await service.generateVimeoPoster(updatedVideo, {
        time: editState.posterTime
      });

      if (posterResult?.cleanupWarnings?.length) {
        result = {
          ...result,
          cleanupWarnings: [
            ...(result?.cleanupWarnings || []),
            ...posterResult.cleanupWarnings
          ]
        };
      }
    }

    renderTapeOrderBox();
    renderVideos();
    renderPortfolioIndicators();
    setVideoEditStatus("Video saved successfully.", "success");
    showCleanupAwareToast("Video saved", result);
  } catch (error) {
    console.error("Video edit save error:", error);
    const message = didSaveVideo
      ? `Video saved, media update failed: ${error.message || "Unknown error"}`
      : error.message || "Could not save video";

    setVideoEditStatus(message, "error");
    showToast(message);
  } finally {
    state.videoEdit.isSaving = false;
    submit?.removeAttribute("disabled");
  }
});

dom.deleteModal?.addEventListener("click", async (event) => {
  const cancelButton = event.target.closest("[data-delete-cancel]");
  const actionButton = event.target.closest("[data-delete-action]");

  if (cancelButton) {
    closeDeleteModal();
    return;
  }

  if (!actionButton || !state.pendingDelete) return;

  const { type, id } = state.pendingDelete;

  try {
    if (actionButton.dataset.deleteAction === "archive") {
      if (type !== "message") return;

      await service.archiveMessage(id);
      showToast("Message archived");
    } else {
      if (type === "message") {
        await service.deleteMessage(id);
        showToast("Message deleted permanently");
      } else if (type === "gallery") {
        const result = await service.deleteGalleryItem(id);

        showCleanupAwareToast("Image deleted", result);
      } else if (type === "video") {
        const result = await service.deleteVideoItem(id);

        showCleanupAwareToast("Video deleted", result);
      }
    }

    closeDeleteModal();
    renderAll();
  } catch (error) {
    console.error("Admin delete error:", error);
    showToast(error.message || "Could not delete item");
  }
});

dom.watcherModal?.addEventListener("click", (event) => {
  if (event.target.closest("[data-watcher-close]")) {
    closeWatcherModal();
  }
});

dom.watcherModal?.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-watcher-form]");

  if (!form) return;

  event.preventDefault();

  const type = form.dataset.watcherType;
  const id = form.dataset.watcherId;
  const submit = form.querySelector("button[type='submit']");
  const payload = {};

  ["title", "alt_text", "vimeo_url"].forEach((field) => {
    if (form.elements[field]) {
      payload[field] = form.elements[field].value.trim();
    }
  });

  const files = {
    previewFile: form.elements.preview_file?.files[0] || null,
    poster: form.elements.poster?.files[0] || null
  };
  const hasFiles = Boolean(files.previewFile || files.poster);

  if (!Object.keys(payload).length && !hasFiles) {
    showToast("Nothing to save");
    return;
  }

  submit?.setAttribute("disabled", "true");

  try {
    let result = null;

    if (type === "gallery") {
      result = await service.updateGalleryItem(id, payload);
    } else if (type === "video") {
      result = await service.updateVideoItem(id, payload, files);
    }

    renderAll();
    showCleanupAwareToast("Watcher item saved", result);
  } catch (error) {
    console.error("Watcher save error:", error);
    showToast(error.message || "Could not save watcher item");
  } finally {
    submit?.removeAttribute("disabled");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDeleteModal();
    if (!state.videoEdit.isSaving) {
      closeVideoEditModal();
    }
    closeWatcherModal();
  }
});

let galleryFocusPointerId = null;

const getGalleryFocusSource = () => dom.galleryFocusPreview?.querySelector(".focus-control__source");

const setGalleryFocusFromPointer = (event) => {
  const source = getGalleryFocusSource();

  if (!source) return false;

  const rect = source.getBoundingClientRect();

  if (!rect.width || !rect.height) return false;

  setGalleryFocus({
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100
  });

  return true;
};

const stopGalleryFocusPointer = (event) => {
  if (galleryFocusPointerId === null || galleryFocusPointerId !== event.pointerId) return;

  if (
    typeof dom.galleryFocusPreview?.hasPointerCapture === "function"
    && dom.galleryFocusPreview.hasPointerCapture(event.pointerId)
  ) {
    dom.galleryFocusPreview.releasePointerCapture(event.pointerId);
  }

  galleryFocusPointerId = null;
  dom.galleryFocusPreview?.classList.remove("is-targeting");
};

dom.galleryFocusPreview?.addEventListener("pointerdown", (event) => {
  const target = event.target instanceof Element ? event.target : null;

  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (!target?.closest(".focus-control__source")) return;

  event.preventDefault();
  galleryFocusPointerId = event.pointerId;
  dom.galleryFocusPreview.classList.add("is-targeting");
  dom.galleryFocusPreview.setPointerCapture?.(event.pointerId);
  setGalleryFocusFromPointer(event);
});

dom.galleryFocusPreview?.addEventListener("pointermove", (event) => {
  if (galleryFocusPointerId !== event.pointerId) return;

  event.preventDefault();
  setGalleryFocusFromPointer(event);
});

dom.galleryFocusPreview?.addEventListener("pointerup", stopGalleryFocusPointer);
dom.galleryFocusPreview?.addEventListener("pointercancel", stopGalleryFocusPointer);
dom.galleryFocusPreview?.addEventListener("lostpointercapture", () => {
  galleryFocusPointerId = null;
  dom.galleryFocusPreview?.classList.remove("is-targeting");
});

let galleryCropPointerId = null;
let galleryCropDragStart = null;

const getGalleryCropFrame = () => dom.galleryCropStage?.querySelector(".crop-stage__frame");

const setGalleryCropFromDrag = (event) => {
  const frame = getGalleryCropFrame();

  if (!frame || !galleryCropDragStart || !state.galleryPreview.url) return false;

  const rect = frame.getBoundingClientRect();

  if (!rect.width || !rect.height) return false;

  const cropWindow = getGalleryCropWindow(state.galleryPreview, galleryCropDragStart.crop);
  const deltaX = ((event.clientX - galleryCropDragStart.x) / rect.width) * cropWindow.width;
  const deltaY = ((event.clientY - galleryCropDragStart.y) / rect.height) * cropWindow.height;

  setGalleryCrop({
    ...galleryCropDragStart.crop,
    x: galleryCropDragStart.crop.x - deltaX,
    y: galleryCropDragStart.crop.y - deltaY
  });

  return true;
};

const stopGalleryCropPointer = (event) => {
  if (galleryCropPointerId === null || galleryCropPointerId !== event.pointerId) return;

  if (
    typeof dom.galleryCropStage?.hasPointerCapture === "function"
    && dom.galleryCropStage.hasPointerCapture(event.pointerId)
  ) {
    dom.galleryCropStage.releasePointerCapture(event.pointerId);
  }

  galleryCropPointerId = null;
  galleryCropDragStart = null;
  dom.galleryCropStage?.classList.remove("is-cropping");
};

dom.galleryCropStage?.addEventListener("pointerdown", (event) => {
  const target = event.target instanceof Element ? event.target : null;

  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (!target?.closest(".crop-stage__frame") || !state.galleryPreview.url) return;

  event.preventDefault();
  galleryCropPointerId = event.pointerId;
  galleryCropDragStart = {
    x: event.clientX,
    y: event.clientY,
    crop: getGalleryCrop(state.galleryCrop)
  };
  dom.galleryCropStage.classList.add("is-cropping");
  dom.galleryCropStage.setPointerCapture?.(event.pointerId);
});

dom.galleryCropStage?.addEventListener("pointermove", (event) => {
  if (galleryCropPointerId !== event.pointerId) return;

  event.preventDefault();
  setGalleryCropFromDrag(event);
});

dom.galleryCropStage?.addEventListener("pointerup", stopGalleryCropPointer);
dom.galleryCropStage?.addEventListener("pointercancel", stopGalleryCropPointer);
dom.galleryCropStage?.addEventListener("lostpointercapture", () => {
  galleryCropPointerId = null;
  galleryCropDragStart = null;
  dom.galleryCropStage?.classList.remove("is-cropping");
});

dom.galleryFocusReset?.addEventListener("click", resetGalleryFocus);
dom.galleryCropPanel?.addEventListener("input", (event) => {
  const target = event.target instanceof HTMLInputElement ? event.target : null;

  if (!target) return;

  if (target === dom.galleryCropX || target === dom.galleryCropY || target === dom.galleryCropZoom) {
    setGalleryCrop({
      x: dom.galleryCropX?.value ?? state.galleryCrop.x,
      y: dom.galleryCropY?.value ?? state.galleryCrop.y,
      zoom: dom.galleryCropZoom?.value ?? state.galleryCrop.zoom
    });
  }
});
dom.galleryCropReset?.addEventListener("click", resetGalleryCrop);

dom.galleryForm?.addEventListener("change", (event) => {
  if (event.target?.name === "image") {
    resetGalleryFocus();
    resetGalleryCrop();
  }

  updateGalleryPreview();
});
dom.galleryForm?.addEventListener("input", updateGalleryPreview);

dom.videoForm?.addEventListener("change", (event) => {
  if (event.target?.name === "poster_picker_enabled") {
    handlePosterPickerToggle();
    return;
  }

  if (event.target?.name === "poster") {
    if (!isVideoFormPosterPickerEnabled(dom.videoForm) && event.target.files[0]) {
      setPosterMode("manual");
    } else if (state.posterPicker.mode === "manual") {
      setPosterMode("");
    }
  }

  if (event.target?.name === "vimeo_url") {
    if (isVideoFormPosterPickerEnabled(dom.videoForm)) {
      initPosterPicker();
    }
  }

  updateVideoPreview();
});

dom.videoForm?.addEventListener("input", (event) => {
  if (event.target?.name === "vimeo_url") {
    if (isVideoFormPosterPickerEnabled(dom.videoForm)) {
      queuePosterPickerInit();
    }
  }

  updateVideoPreview();
});

dom.posterSlider?.addEventListener("input", handlePosterSliderInput);
dom.posterUseFrame?.addEventListener("click", handleUseCurrentFrame);

dom.tapePicker?.addEventListener("input", (event) => {
  if (event.target?.name === "tape_title") {
    updateVideoPreview();
  }
});

dom.tapeTextureOptions?.addEventListener("click", (event) => {
  const option = event.target instanceof Element
    ? event.target.closest("[data-tape-texture-option]")
    : null;

  if (!option) return;

  setVideoFormTapeTexture(option.dataset.tapeTextureOption);
});

dom.galleryForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const submit = form.querySelector("button[type='submit']");
  const file = form.elements.image.files[0];

  if (!file) {
    showToast("Choose an image first");
    return;
  }

  submit?.setAttribute("disabled", "true");

  try {
    const previewToken = state.galleryPreview.token + 1;

    state.galleryPreview.token = previewToken;

    const previewSource = await getGalleryPreviewSource(file, previewToken);

    if (!previewSource) {
      throw new Error("Could not prepare image preview");
    }

    syncGalleryCropUi();

    const cropWindow = getGalleryCropWindow(previewSource, state.galleryCrop);
    const focus = getGalleryFocus(state.galleryFocus);
    const payload = {
      placement: galleryFormat.placement,
      title: form.elements.title.value.trim(),
      alt_text: form.elements.alt_text.value.trim(),
      sort_order: 1,
      focus_x: focus.x,
      focus_y: focus.y
    };
    const item = await service.createGalleryItem(payload, file, cropWindow);
    let isOrderSaved = true;

    try {
      await moveGalleryItemToSectionStart(item);
    } catch (error) {
      isOrderSaved = false;
      console.error("Gallery order save error:", error);
    }

    form.reset();
    resetGalleryFocus();
    resetGalleryCrop();
    updateGalleryPreview();
    renderGallery();
    renderPortfolioIndicators();
    showToast(isOrderSaved ? "Gallery image added" : "Image added, order not saved");
  } catch (error) {
    showToast(error.message || "Could not upload image");
  } finally {
    submit?.removeAttribute("disabled");
  }
});

dom.videoForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const submit = form.querySelector("button[type='submit']");
  const submitLabel = submit?.querySelector("span");
  const defaultSubmitLabel = submitLabel?.textContent || "Add video";
  const posterState = getVideoFormPosterState(form);
  const posterMode = posterState.mode;
  let previewState;
  const tapeState = getVideoFormTapeState(form);

  try {
    previewState = getVideoPreviewState(form);
  } catch (error) {
    showToast(error.message || "Could not read preview fields");
    return;
  }

  if (posterMode === "manual" && form.elements.poster_mode.value !== "manual") {
    setPosterMode("manual");
  }

  const payload = {
    title: form.elements.title.value.trim(),
    vimeo_url: form.elements.vimeo_url.value.trim(),
    featured: form.elements.featured.checked,
    sort_order: state.videos.length + 1,
    poster_time: posterMode === "vimeo_time" ? posterState.time : null,
    poster_mode: posterMode || null,
    ...getVideoTapePayload(tapeState)
  };
  const files = {
    previewFile: previewState.file,
    poster: posterMode === "manual" ? posterState.file : null
  };

  if (!payload.title || !payload.vimeo_url) {
    showToast("Title and Vimeo URL are required");
    return;
  }

  submit?.setAttribute("disabled", "true");

  try {
    const video = await service.createVideoItem(payload, files);
    form.reset();
    setPosterMode("");
    resetPosterPicker();
    updateVideoPreview();
    let didGenerateMedia = false;

    if (posterMode === "vimeo_time") {
      if (submitLabel) {
        submitLabel.textContent = "Generating poster...";
      }

      showToast("Generating poster...");

      try {
        await service.generateVimeoPoster(video, posterState);
        await refreshData();
        showToast("Video added, poster generated");
      } catch (posterError) {
        console.error("Vimeo poster generation error:", posterError);
        renderTapeOrderBox();
        renderVideos();
        renderPortfolioIndicators();
        showToast(`Video added, poster generation failed: ${posterError.message || "Unknown error"}`);
      }

      didGenerateMedia = true;
    }

    if (!didGenerateMedia) {
      renderTapeOrderBox();
      renderVideos();
      renderPortfolioIndicators();
      showToast("Video added");
    }
  } catch (error) {
    showToast(error.message || "Could not add video");
  } finally {
    submit?.removeAttribute("disabled");
    if (submitLabel) {
      submitLabel.textContent = defaultSubmitLabel;
    }
  }
});

const initAdmin = async () => {
  setAdminVisibility(false);
  setConnectionStatus("checking", isAuthEnabled() ? "Checking session" : "Checking Supabase");
  setPanel(state.activePanel);
  setMessageFilter(state.messageFilter);
  updateGalleryPreview();
  updateVideoPreview();

  if (!hasSupabaseConfig()) {
    setConnectionStatus("error", "Supabase config missing");
    setAuthError("Supabase config is missing");
    setAdminVisibility(!isAuthEnabled());
    return;
  }

  bindAuthStateChanges();

  const hasSession = await ensureAuthSession();

  if (!hasSession && isAuthEnabled()) {
    dom.loginForm?.elements.email?.focus();
    return;
  }

  await refreshData();
};

initAdmin();
