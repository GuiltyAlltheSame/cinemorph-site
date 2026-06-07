const config = window.CINEMORPH_ADMIN_CONFIG || {};
const panelTitles = {
  messages: "Messages",
  gallery: "Gallery",
  videos: "Videos"
};

const state = {
  activePanel: "messages",
  messageFilter: "active",
  messages: [],
  gallery: [],
  galleryFocus: {
    x: 50,
    y: 50
  },
  videos: [],
  pendingDelete: null
};

const dom = {
  mode: document.querySelector("[data-admin-mode]"),
  panelTitle: document.querySelector("[data-panel-title]"),
  navItems: Array.from(document.querySelectorAll("[data-panel-target]")),
  panels: Array.from(document.querySelectorAll("[data-panel]")),
  refresh: document.querySelector("[data-refresh]"),
  messageCount: document.querySelector("[data-message-count]"),
  videoTotal: document.querySelector("[data-video-total]"),
  photoTotal: document.querySelector("[data-photo-total]"),
  watcherOpen: document.querySelector("[data-watcher-open]"),
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
  galleryList: document.querySelector("[data-gallery-list]"),
  videoForm: document.querySelector("[data-video-form]"),
  videoPreview: document.querySelector("[data-video-preview]"),
  videoList: document.querySelector("[data-video-list]"),
  toast: document.querySelector("[data-toast]"),
  deleteModal: document.querySelector("[data-delete-modal]"),
  deleteMessageTitle: document.querySelector("[data-delete-message-title]")
};

const hasSupabaseConfig = () => Boolean(config.supabase?.url && config.supabase?.anonKey);

const setConnectionStatus = (status, message) => {
  if (!dom.mode) return;

  dom.mode.classList.remove("is-checking", "is-connected", "is-error");
  dom.mode.classList.add(`is-${status}`);
  dom.mode.textContent = message;
  dom.mode.removeAttribute("title");
};

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

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
  placement: "16:9",
  label: "16:9",
  previewClass: "landscape",
  storageFolder: "stills"
};

const getGalleryFormat = () => galleryFormat;
const galleryFocusDefault = { x: 50, y: 50 };

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

const imageUploadDefaults = {
  galleryMaxLongEdge: 1800,
  posterMaxLongEdge: 1600,
  quality: 0.82
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

const optimizeImageFile = async (file, options = {}) => {
  if (!canOptimizeImageFile(file)) return file;

  const image = await loadImageElement(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const maxLongEdge = options.maxLongEdge || imageUploadDefaults.galleryMaxLongEdge;
  const quality = options.quality || imageUploadDefaults.quality;
  const dimensions = getResizedDimensions(sourceWidth, sourceHeight, maxLongEdge);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) return file;

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

  const blob = await canvasToBlob(canvas, "image/webp", quality);

  if (!blob || (blob.size >= file.size && dimensions.width === sourceWidth && dimensions.height === sourceHeight)) {
    return file;
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
    getSupabaseClient.client = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);
  }

  return getSupabaseClient.client;
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

const removeSupabaseFiles = async (bucket, paths) => {
  const cleanPaths = Array.from(new Set(
    paths
      .map((path) => String(path || "").trim().replace(/^\/+/, ""))
      .filter(Boolean)
  ));

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
      client.from(tables.videos).select("*").order("featured", { ascending: false }).order("sort_order", { ascending: true }).order("created_at", { ascending: false })
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

    if (!imagePath) {
      throw new Error("Gallery image storage path is missing");
    }

    await removeSupabaseFiles(bucket, [imagePath]);

    const { error } = await getSupabaseClient()
      .from(config.supabase.tables.gallery)
      .delete()
      .eq("id", id);

    if (error) throw error;

    state.gallery = state.gallery.filter((galleryItem) => galleryItem.id !== id);
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

  async deleteVideoItem(id) {
    const item = state.videos.find((videoItem) => videoItem.id === id);

    if (!item) return;

    const bucket = config.supabase.storage.videoBucket;
    const gifPath = item.thumbnail_gif_storage_path || getSupabaseStoragePathFromUrl(item.thumbnail_gif_url, bucket);
    const posterPath = item.poster_storage_path || getSupabaseStoragePathFromUrl(item.poster_url, bucket);

    if (item.thumbnail_gif_url && !gifPath) {
      throw new Error("Video GIF storage path is missing");
    }

    if (item.poster_url && !posterPath) {
      throw new Error("Video poster storage path is missing");
    }

    if (gifPath || posterPath) {
      await removeSupabaseFiles(bucket, [gifPath, posterPath]);
    }

    const { error } = await getSupabaseClient()
      .from(config.supabase.tables.videos)
      .delete()
      .eq("id", id);

    if (error) throw error;

    state.videos = state.videos.filter((videoItem) => videoItem.id !== id);
  },

  async createGalleryItem(payload, file) {
    const uploadFile = await optimizeImageFile(file, {
      maxLongEdge: imageUploadDefaults.galleryMaxLongEdge,
      quality: imageUploadDefaults.quality
    });

    const bucket = config.supabase.storage.galleryBucket;
    const upload = await uploadSupabaseFile(bucket, getGalleryFormat().storageFolder, uploadFile);
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
    const uploadFiles = {
      thumbnailGif: files.thumbnailGif,
      poster: files.poster
        ? await optimizeImageFile(files.poster, {
            maxLongEdge: imageUploadDefaults.posterMaxLongEdge,
            quality: imageUploadDefaults.quality
          })
        : null
    };

    const bucket = config.supabase.storage.videoBucket;
    const gifUpload = uploadFiles.thumbnailGif ? await uploadSupabaseFile(bucket, "gifs", uploadFiles.thumbnailGif) : null;
    const posterUpload = uploadFiles.poster ? await uploadSupabaseFile(bucket, "posters", uploadFiles.poster) : null;
    const item = {
      ...payload,
      thumbnail_gif_url: gifUpload?.publicUrl || "",
      thumbnail_gif_storage_path: gifUpload?.path || "",
      thumbnail_gif_file_name: uploadFiles.thumbnailGif?.name || "",
      poster_url: posterUpload?.publicUrl || "",
      poster_storage_path: posterUpload?.path || "",
      poster_file_name: uploadFiles.poster?.name || ""
    };
    const { data, error } = await getSupabaseClient()
      .from(config.supabase.tables.videos)
      .insert(item)
      .select()
      .single();

    if (error) throw error;

    state.videos.unshift(data);
    return data;
  },

  async updateVideoItem(id, payload, files = {}) {
    const item = state.videos.find((videoItem) => videoItem.id === id);

    if (!item) return null;

    const uploadFiles = {
      thumbnailGif: files.thumbnailGif || null,
      poster: files.poster
        ? await optimizeImageFile(files.poster, {
            maxLongEdge: imageUploadDefaults.posterMaxLongEdge,
            quality: imageUploadDefaults.quality
          })
        : null
    };
    const nextPayload = { ...payload };

    const bucket = config.supabase.storage.videoBucket;

    if (uploadFiles.thumbnailGif) {
      const gifUpload = await uploadSupabaseFile(bucket, "gifs", uploadFiles.thumbnailGif);

      nextPayload.thumbnail_gif_url = gifUpload.publicUrl;
      nextPayload.thumbnail_gif_storage_path = gifUpload.path;
      nextPayload.thumbnail_gif_file_name = uploadFiles.thumbnailGif.name;
    }

    if (uploadFiles.poster) {
      const posterUpload = await uploadSupabaseFile(bucket, "posters", uploadFiles.poster);

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

    Object.assign(item, data);
    return data;
  }
};

const getFilteredMessages = () => state.messages.filter((message) => {
  const isArchived = Boolean(message.archived_at);

  if (state.messageFilter === "archived") return isArchived;
  if (state.messageFilter === "unread") return !isArchived && !message.is_read;
  if (state.messageFilter === "read") return !isArchived && message.is_read;

  return !isArchived;
});

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

      if (isBlank(item.thumbnail_gif_url)) {
        missing.push({ key: "thumbnail_gif", label: "GIF" });
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

  if (issue.type === "video" && hasMissing("thumbnail_gif")) {
    fields.push(`
      <label class="watcher-field watcher-field--file">
        <span>GIF</span>
        <input type="file" name="thumbnail_gif" accept="image/gif">
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
  const gifMissing = issues.filter((issue) => issue.type === "video" && issue.missing.some((item) => item.key === "thumbnail_gif")).length;
  const posterMissing = issues.filter((issue) => issue.type === "video" && issue.missing.some((item) => item.key === "poster")).length;

  if (dom.watcherSummary) {
    dom.watcherSummary.textContent = issues.length
      ? `${issues.length} file${issues.length === 1 ? "" : "s"} need attention. GIF missing: ${gifMissing}. Poster missing: ${posterMissing}.`
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
        <span>${escapeHtml(issue.item.file_name || issue.item.thumbnail_gif_file_name || issue.item.poster_file_name || issue.item.vimeo_url || "No file label")}</span>
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
      <article class="message-card ${message.is_read ? "is-read" : ""} ${message.archived_at ? "is-archived" : ""}">
        <div class="message-meta">
          <h3>${escapeHtml(message.name)}</h3>
          <a href="${escapeHtml(getContactHref(message.contact))}">${escapeHtml(message.contact)}</a>
          <span class="message-date">${escapeHtml(formatDate(message.created_at))}</span>
        </div>
        <p class="message-text">${escapeHtml(message.message)}</p>
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
  if (!video.thumbnail_gif_url && !video.poster_url) {
    return "No image";
  }

  if (video.poster_url && video.thumbnail_gif_url) {
    return `
      <img class="media-card__poster" src="${escapeHtml(video.poster_url)}" alt="${escapeHtml(video.title)}">
      <img class="media-card__gif" src="${escapeHtml(video.thumbnail_gif_url)}" alt="" aria-hidden="true">
    `;
  }

  return `<img src="${escapeHtml(video.poster_url || video.thumbnail_gif_url)}" alt="${escapeHtml(video.title)}">`;
};

const renderVideos = () => {
  if (!dom.videoList) return;

  if (!state.videos.length) {
    dom.videoList.innerHTML = `<div class="empty-state">No videos yet</div>`;
    return;
  }

  dom.videoList.innerHTML = state.videos.map((video) => {
    return `
      <article class="media-card">
        <a class="media-card__image" href="${escapeHtml(video.vimeo_url)}" target="_blank" rel="noreferrer">
          ${getVideoMediaMarkup(video)}
        </a>
        <div class="media-card__body">
          <h3>${escapeHtml(video.title)}</h3>
          <div class="media-card__bottom">
            <div class="media-card__meta">
              ${video.featured ? `<span class="pill pill--featured">Featured</span>` : `<span class="pill">Standard</span>`}
              ${video.thumbnail_gif_url ? `<span class="pill">GIF</span>` : ""}
              ${video.poster_url ? `<span class="pill">Poster</span>` : ""}
              ${!video.thumbnail_gif_url && !video.poster_url ? `<span class="pill">No image</span>` : ""}
            </div>
            <button class="icon-button media-card__delete" type="button" data-delete-video="${escapeHtml(video.id)}" title="Delete video" aria-label="Delete video">
              <svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
};

const renderAll = () => {
  renderMessages();
  renderGallery();
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

const renderGalleryFocusPreview = (file, format, url = "") => {
  if (!dom.galleryFocusPreview) return;

  dom.galleryFocusPreview.className = `focus-control__stage focus-control__stage--${format.previewClass}`;

  if (!file || !url) {
    dom.galleryFocusPreview.innerHTML = `<div class="focus-control__empty">No image</div>`;
    return;
  }

  dom.galleryFocusPreview.innerHTML = `
    <div class="focus-control__frame focus-control__frame--${format.previewClass}">
      <img class="focus-control__image" src="${escapeHtml(url)}" alt="">
      <span class="focus-control__target" aria-hidden="true"></span>
    </div>
  `;
};

const updateGalleryPreview = async () => {
  if (!dom.galleryPreview || !dom.galleryForm) return;

  const file = dom.galleryForm.elements.image.files[0];
  const format = getGalleryFormat();
  const title = dom.galleryForm.elements.title.value.trim();
  const altText = dom.galleryForm.elements.alt_text.value.trim();
  const url = file ? URL.createObjectURL(file) : "";
  let previewContent = `<div class="media-preview media-preview--empty media-preview--${format.previewClass}">No image</div>`;

  if (file) {
    previewContent = `
      <div class="media-preview media-preview--${format.previewClass}">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(altText)}">
      </div>
    `;
  }

  dom.galleryPreview.innerHTML = `
    ${previewContent}
    <dl class="preview-meta">
      <div><dt>Title</dt><dd>${escapeHtml(title)}</dd></div>
      <div><dt>Alt text</dt><dd>${escapeHtml(altText)}</dd></div>
      <div><dt>File</dt><dd>${escapeHtml(file?.name || "No file selected")}</dd></div>
    </dl>
  `;

  renderGalleryFocusPreview(file, format, url);
  syncGalleryFocusUi();
};

const updateVideoPreview = () => {
  if (!dom.videoPreview || !dom.videoForm) return;

  const title = dom.videoForm.elements.title.value.trim() || "Untitled";
  const isFeatured = dom.videoForm.elements.featured.checked;
  const gifFile = dom.videoForm.elements.thumbnail_gif.files[0];
  const posterFile = dom.videoForm.elements.poster.files[0];
  const mediaFile = gifFile || posterFile;
  let previewContent = `<div class="media-preview media-preview--empty media-preview--landscape">No image</div>`;

  if (mediaFile) {
    const url = URL.createObjectURL(mediaFile);

    previewContent = `
      <div class="media-preview media-preview--landscape">
        <img src="${url}" alt="">
      </div>
    `;
  }

  dom.videoPreview.innerHTML = `
    ${previewContent}
    <dl class="preview-meta">
      <div><dt>Title</dt><dd>${escapeHtml(title)}</dd></div>
      <div><dt>Card</dt><dd>${isFeatured ? "Featured" : "Standard"}</dd></div>
      <div><dt>GIF</dt><dd>${escapeHtml(gifFile?.name || "None")}</dd></div>
      <div><dt>Poster</dt><dd>${escapeHtml(posterFile?.name || "None")}</dd></div>
    </dl>
  `;
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

const deleteItemImmediately = async (type, id) => {
  try {
    if (type === "message") {
      await service.deleteMessage(id);
      showToast("Message deleted");
    } else if (type === "gallery") {
      await service.deleteGalleryItem(id);
      showToast("Image deleted");
    } else if (type === "video") {
      await service.deleteVideoItem(id);
      showToast("Video deleted");
    }

    renderAll();
  } catch (error) {
    console.error("Admin delete error:", error);
    showToast(error.message || "Could not delete item");
  }
};

dom.navItems.forEach((item) => {
  item.addEventListener("click", () => setPanel(item.dataset.panelTarget));
});

dom.refresh?.addEventListener("click", () => {
  refreshData();
  showToast("Data refreshed");
});

dom.watcherOpen?.addEventListener("click", openWatcherModal);

dom.messageFilters?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-message-filter]");

  if (button) {
    setMessageFilter(button.dataset.messageFilter);
  }
});

dom.messageList?.addEventListener("click", async (event) => {
  const readButton = event.target.closest("[data-toggle-read]");
  const archiveButton = event.target.closest("[data-archive-message]");
  const restoreButton = event.target.closest("[data-restore-message]");
  const deleteButton = event.target.closest("[data-delete-message]");

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

dom.videoList?.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete-video]");

  if (deleteButton) {
    await deleteItemImmediately("video", deleteButton.dataset.deleteVideo);
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
        await service.deleteGalleryItem(id);
        showToast("Image deleted");
      } else if (type === "video") {
        await service.deleteVideoItem(id);
        showToast("Video deleted");
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
    thumbnailGif: form.elements.thumbnail_gif?.files[0] || null,
    poster: form.elements.poster?.files[0] || null
  };
  const hasFiles = Boolean(files.thumbnailGif || files.poster);

  if (!Object.keys(payload).length && !hasFiles) {
    showToast("Nothing to save");
    return;
  }

  submit?.setAttribute("disabled", "true");

  try {
    if (type === "gallery") {
      await service.updateGalleryItem(id, payload);
    } else if (type === "video") {
      await service.updateVideoItem(id, payload, files);
    }

    renderAll();
    showToast("Watcher item saved");
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
    closeWatcherModal();
  }
});

let galleryFocusPointerId = null;

const getGalleryFocusFrame = () => dom.galleryFocusPreview?.querySelector(".focus-control__frame");

const setGalleryFocusFromPointer = (event) => {
  const frame = getGalleryFocusFrame();

  if (!frame) return false;

  const rect = frame.getBoundingClientRect();

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
  if (!target?.closest(".focus-control__frame")) return;

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

dom.galleryFocusReset?.addEventListener("click", resetGalleryFocus);

dom.galleryForm?.addEventListener("change", (event) => {
  if (event.target?.name === "image") {
    resetGalleryFocus();
  }

  updateGalleryPreview();
});
dom.galleryForm?.addEventListener("input", updateGalleryPreview);
dom.videoForm?.addEventListener("change", updateVideoPreview);
dom.videoForm?.addEventListener("input", updateVideoPreview);

dom.galleryForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const submit = form.querySelector("button[type='submit']");
  const file = form.elements.image.files[0];

  if (!file) {
    showToast("Choose an image first");
    return;
  }

  const payload = {
    placement: galleryFormat.placement,
    title: form.elements.title.value.trim(),
    alt_text: form.elements.alt_text.value.trim(),
    sort_order: 1,
    focus_x: normalizeGalleryFocusValue(form.elements.focus_x?.value),
    focus_y: normalizeGalleryFocusValue(form.elements.focus_y?.value)
  };

  submit?.setAttribute("disabled", "true");

  try {
    const item = await service.createGalleryItem(payload, file);
    let isOrderSaved = true;

    try {
      await moveGalleryItemToSectionStart(item);
    } catch (error) {
      isOrderSaved = false;
      console.error("Gallery order save error:", error);
    }

    form.reset();
    resetGalleryFocus();
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
  const payload = {
    title: form.elements.title.value.trim(),
    vimeo_url: form.elements.vimeo_url.value.trim(),
    featured: form.elements.featured.checked,
    sort_order: state.videos.length + 1
  };
  const files = {
    thumbnailGif: form.elements.thumbnail_gif.files[0] || null,
    poster: form.elements.poster.files[0] || null
  };

  if (!payload.title || !payload.vimeo_url) {
    showToast("Title and Vimeo URL are required");
    return;
  }

  submit?.setAttribute("disabled", "true");

  try {
    await service.createVideoItem(payload, files);
    form.reset();
    updateVideoPreview();
    renderVideos();
    renderPortfolioIndicators();
    showToast("Video added");
  } catch (error) {
    showToast(error.message || "Could not add video");
  } finally {
    submit?.removeAttribute("disabled");
  }
});

setConnectionStatus("checking", "Checking Supabase");

setPanel(state.activePanel);
setMessageFilter(state.messageFilter);
updateGalleryPreview();
updateVideoPreview();
refreshData();
