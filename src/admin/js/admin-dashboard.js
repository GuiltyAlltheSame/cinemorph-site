/**
 * Dashboard projections: messages, watcher, gallery/video cards, and previews.
 * Loaded in the explicit order declared by admin/index.html.
 */

// Message filters and portfolio integrity watcher ----------------------------

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

// Message list ----------------------------------------------------------------

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

// Gallery and video ordering projections -------------------------------------

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

// Gallery and video card rendering -------------------------------------------

const renderGallery = () => {
  if (!dom.galleryList) return;

  if (!state.gallery.length) {
    dom.galleryList.innerHTML = `<div class="empty-state">No gallery images yet</div>`;
    return;
  }

  const placement = galleryFormat.placement;
  const items = getOrderedGalleryItems();
  const cards = items.map((item, index) => {
    const focus = getGalleryFocus(item);

    return `
      <article class="media-card" data-gallery-card data-gallery-id="${escapeHtml(item.id)}" data-gallery-placement="${escapeHtml(placement)}">
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

  dom.galleryList.innerHTML = `
    <div class="media-list gallery-section__list" data-gallery-section-list="${escapeHtml(placement)}">
      ${cards || `<div class="empty-state gallery-section__empty">No gallery images yet</div>`}
    </div>
  `;
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

// Whole-dashboard rendering and panel state ----------------------------------

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

// Upload-form previews ---------------------------------------------------------

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
