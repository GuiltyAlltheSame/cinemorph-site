/**
 * Message URL rendering and the optional hover/focus link-preview system.
 * Loaded in the explicit order declared by admin/index.html.
 */

// Safe message and reference-link rendering ----------------------------------

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

// Preview descriptors and provider detection ---------------------------------

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

// Preview state, positioning, and pointer/focus lifecycle ---------------------

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
