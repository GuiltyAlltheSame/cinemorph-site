/**
 * Video/Vimeo editor, VHS metadata, Poster Picker, and preview state.
 * Loaded in the explicit order declared by admin/index.html.
 */

// Vimeo URL parsing and poster metadata --------------------------------------

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

// VHS cassette presentation and ordering -------------------------------------

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

// Existing-video editor modal -------------------------------------------------

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
  syncAdminModalState();
  syncVideoEditTapeUi();
  syncVideoEditPosterUi();

  window.requestAnimationFrame(() => {
    dom.videoEditForm?.elements.title?.focus({ preventScroll: true });
  });
};

const closeVideoEditModal = () => {
  if (!dom.videoEditModal) return;

  dom.videoEditModal.hidden = true;
  syncAdminModalState();
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

// Poster Picker state and Vimeo player lifecycle ------------------------------

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

// Local upload preview lifecycle ---------------------------------------------

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
