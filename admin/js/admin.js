const config = window.CINEMORPH_ADMIN_CONFIG || {};
const storageKey = "cinemorph-admin-mock-state-v1";
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
  videos: [],
  pendingDeleteId: null
};

const dom = {
  mode: document.querySelector("[data-admin-mode]"),
  mockMode: document.querySelector("[data-mock-mode]"),
  panelTitle: document.querySelector("[data-panel-title]"),
  navItems: Array.from(document.querySelectorAll("[data-panel-target]")),
  panels: Array.from(document.querySelectorAll("[data-panel]")),
  refresh: document.querySelector("[data-refresh]"),
  messageCount: document.querySelector("[data-message-count]"),
  messageFilters: document.querySelector("[data-message-filters]"),
  messageList: document.querySelector("[data-message-list]"),
  galleryForm: document.querySelector("[data-gallery-form]"),
  galleryPreview: document.querySelector("[data-gallery-preview]"),
  galleryList: document.querySelector("[data-gallery-list]"),
  videoForm: document.querySelector("[data-video-form]"),
  videoPreview: document.querySelector("[data-video-preview]"),
  videoList: document.querySelector("[data-video-list]"),
  toast: document.querySelector("[data-toast]"),
  deleteModal: document.querySelector("[data-delete-modal]"),
  deleteMessageTitle: document.querySelector("[data-delete-message-title]")
};

const isMockMode = () => Boolean(config.useMock);

const hasSupabaseConfig = () => Boolean(config.supabase?.url && config.supabase?.anonKey);

const setConnectionStatus = (status, message) => {
  if (!dom.mode) return;

  dom.mode.classList.remove("is-checking", "is-connected", "is-error", "is-mock");
  dom.mode.classList.add(`is-${status}`);
  dom.mode.textContent = message;
  dom.mode.removeAttribute("title");
};

const setMockStatus = () => {
  if (!dom.mockMode) return;

  const isEnabled = isMockMode();

  dom.mockMode.classList.toggle("is-mock-on", isEnabled);
  dom.mockMode.classList.toggle("is-mock-off", !isEnabled);
  dom.mockMode.textContent = isEnabled ? "Mock on" : "Mock off";
  dom.mockMode.setAttribute(
    "title",
    isEnabled ? "Admin uses local mock data" : "Admin uses Supabase data"
  );
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

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

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

const createMockImage = (label, background, foreground = "#e8edf1") => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <rect width="1280" height="720" fill="${background}"/>
      <path d="M0 560 280 360 440 480 660 260 1280 650v70H0z" fill="rgba(255,255,255,.14)"/>
      <text x="64" y="112" fill="${foreground}" font-family="Arial, sans-serif" font-size="54" font-weight="700" letter-spacing="4">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const galleryFormats = {
  "9:16": {
    label: "9:16",
    previewClass: "portrait",
    storageFolder: "9-16"
  },
  "16:9": {
    label: "16:9",
    previewClass: "landscape",
    storageFolder: "16-9"
  },
  strip: {
    label: "9:16",
    previewClass: "portrait",
    storageFolder: "9-16"
  },
  wide: {
    label: "16:9",
    previewClass: "landscape",
    storageFolder: "16-9"
  }
};

const getGalleryFormat = (placement) => galleryFormats[placement] || galleryFormats["9:16"];

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.addEventListener("load", () => resolve(String(reader.result || "")));
  reader.addEventListener("error", reject);
  reader.readAsDataURL(file);
});

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

const getDefaultMockState = () => ({
  messages: [
    {
      id: "msg_001",
      name: "Jordan Miles",
      contact: "jordan@example.com",
      message: "We need a short launch film and a few cutdowns for social. Timeline is flexible, references are ready.",
      is_read: false,
      archived_at: null,
      created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString()
    },
    {
      id: "msg_002",
      name: "Mina Park",
      contact: "+1 360 555 0142",
      message: "Can you help with a moody product shoot next month?",
      is_read: true,
      archived_at: null,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString()
    },
    {
      id: "msg_003",
      name: "Alex Rivera",
      contact: "alex.rivera@example.com",
      message: "Looking for editing and color for a music video. We have rough footage and a locked track.",
      is_read: false,
      archived_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
    }
  ],
  gallery: [
    {
      id: "gal_001",
      title: "16:9 still",
      alt_text: "16:9 gallery placeholder",
      placement: "16:9",
      image_url: createMockImage("16:9 STILL", "#18222b"),
      file_name: "mock-16-9.svg",
      sort_order: 1,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
    },
    {
      id: "gal_002",
      title: "9:16 still",
      alt_text: "9:16 gallery placeholder",
      placement: "9:16",
      image_url: createMockImage("9:16 STILL", "#211b24"),
      file_name: "mock-9-16.svg",
      sort_order: 2,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString()
    }
  ],
  videos: [
    {
      id: "vid_001",
      title: "Featured reel",
      vimeo_url: "https://vimeo.com/123456789",
      featured: true,
      thumbnail_gif_url: "",
      poster_url: "",
      thumbnail_gif_file_name: "",
      poster_file_name: "",
      sort_order: 1,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString()
    },
    {
      id: "vid_002",
      title: "Poster only test",
      vimeo_url: "https://vimeo.com/987654321",
      featured: false,
      thumbnail_gif_url: "",
      poster_url: createMockImage("POSTER", "#14231d"),
      thumbnail_gif_file_name: "",
      poster_file_name: "mock-poster.svg",
      sort_order: 2,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    }
  ]
});

const loadMockState = () => {
  const saved = localStorage.getItem(storageKey);

  if (!saved) {
    const defaults = getDefaultMockState();
    localStorage.setItem(storageKey, JSON.stringify(defaults));
    return defaults;
  }

  try {
    return JSON.parse(saved);
  } catch {
    const defaults = getDefaultMockState();
    localStorage.setItem(storageKey, JSON.stringify(defaults));
    return defaults;
  }
};

const saveMockState = () => {
  if (!isMockMode()) return;

  localStorage.setItem(storageKey, JSON.stringify({
    messages: state.messages,
    gallery: state.gallery,
    videos: state.videos
  }));
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

const service = {
  async loadAll() {
    if (isMockMode()) {
      return loadMockState();
    }

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

    if (isMockMode()) {
      message.is_read = nextReadState;
      saveMockState();
      return;
    }

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

    if (isMockMode()) {
      message.archived_at = archivedAt;
      saveMockState();
      return;
    }

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

    if (isMockMode()) {
      message.archived_at = null;
      saveMockState();
      return;
    }

    const { error } = await getSupabaseClient()
      .from(config.supabase.tables.messages)
      .update({ archived_at: null })
      .eq("id", id);

    if (error) throw error;

    message.archived_at = null;
  },

  async deleteMessage(id) {
    if (isMockMode()) {
      state.messages = state.messages.filter((item) => item.id !== id);
      saveMockState();
      return;
    }

    const { error } = await getSupabaseClient()
      .from(config.supabase.tables.messages)
      .delete()
      .eq("id", id);

    if (error) throw error;

    state.messages = state.messages.filter((item) => item.id !== id);
  },

  async createGalleryItem(payload, file) {
    if (isMockMode()) {
      const imageUrl = await readFileAsDataUrl(file);
      const item = {
        id: createId("gal"),
        ...payload,
        image_url: imageUrl,
        file_name: file.name,
        created_at: new Date().toISOString()
      };

      state.gallery.unshift(item);
      saveMockState();
      return item;
    }

    const bucket = config.supabase.storage.galleryBucket;
    const upload = await uploadSupabaseFile(bucket, getGalleryFormat(payload.placement).storageFolder, file);
    const item = {
      ...payload,
      image_url: upload.publicUrl,
      storage_bucket: bucket,
      storage_path: upload.path,
      file_name: file.name
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

  async createVideoItem(payload, files) {
    if (isMockMode()) {
      const thumbnailGifUrl = files.thumbnailGif ? await readFileAsDataUrl(files.thumbnailGif) : "";
      const posterUrl = files.poster ? await readFileAsDataUrl(files.poster) : "";
      const item = {
        id: createId("vid"),
        ...payload,
        thumbnail_gif_url: thumbnailGifUrl,
        poster_url: posterUrl,
        thumbnail_gif_file_name: files.thumbnailGif?.name || "",
        poster_file_name: files.poster?.name || "",
        created_at: new Date().toISOString()
      };

      state.videos.unshift(item);
      saveMockState();
      return item;
    }

    const bucket = config.supabase.storage.videoBucket;
    const gifUpload = files.thumbnailGif ? await uploadSupabaseFile(bucket, "gifs", files.thumbnailGif) : null;
    const posterUpload = files.poster ? await uploadSupabaseFile(bucket, "posters", files.poster) : null;
    const item = {
      ...payload,
      thumbnail_gif_url: gifUpload?.publicUrl || "",
      thumbnail_gif_storage_path: gifUpload?.path || "",
      thumbnail_gif_file_name: files.thumbnailGif?.name || "",
      poster_url: posterUpload?.publicUrl || "",
      poster_storage_path: posterUpload?.path || "",
      poster_file_name: files.poster?.name || ""
    };
    const { data, error } = await getSupabaseClient()
      .from(config.supabase.tables.videos)
      .insert(item)
      .select()
      .single();

    if (error) throw error;

    state.videos.unshift(data);
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
          ${restoreButton}
          <button class="icon-button" type="button" data-delete-message="${escapeHtml(message.id)}" title="Delete" aria-label="Delete">
            <svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>
          </button>
        </div>
      </article>
    `;
  }).join("");
};

const getGalleryPlacementLabel = (placement) => getGalleryFormat(placement).label;

const renderGallery = () => {
  if (!dom.galleryList) return;

  if (!state.gallery.length) {
    dom.galleryList.innerHTML = `<div class="empty-state">No gallery images yet</div>`;
    return;
  }

  dom.galleryList.innerHTML = state.gallery.map((item) => `
    <article class="media-card">
      <div class="media-card__image">
        <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.alt_text || item.title || "Gallery image")}">
      </div>
      <div class="media-card__body">
        <h3>${escapeHtml(item.title || item.file_name || "Untitled image")}</h3>
        <div class="media-card__meta">
          <span class="pill">${escapeHtml(getGalleryPlacementLabel(item.placement))}</span>
          <span class="pill">Order ${escapeHtml(item.sort_order ?? 0)}</span>
        </div>
      </div>
    </article>
  `).join("");
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
          <div class="media-card__meta">
            ${video.featured ? `<span class="pill pill--featured">Featured</span>` : `<span class="pill">Standard</span>`}
            ${video.thumbnail_gif_url ? `<span class="pill">GIF</span>` : ""}
            ${video.poster_url ? `<span class="pill">Poster</span>` : ""}
            ${!video.thumbnail_gif_url && !video.poster_url ? `<span class="pill">No image</span>` : ""}
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

const updateGalleryPreview = async () => {
  if (!dom.galleryPreview || !dom.galleryForm) return;

  const file = dom.galleryForm.elements.image.files[0];
  const placement = dom.galleryForm.elements.placement.value;
  const format = getGalleryFormat(placement);
  let previewContent = `<div class="media-preview media-preview--empty media-preview--${format.previewClass}">No image</div>`;

  if (file) {
    const url = URL.createObjectURL(file);

    previewContent = `
      <div class="media-preview media-preview--${format.previewClass}">
        <img src="${url}" alt="">
      </div>
    `;
  }

  dom.galleryPreview.innerHTML = `
    ${previewContent}
    <dl class="preview-meta">
      <div><dt>Format</dt><dd>${escapeHtml(format.label)}</dd></div>
      <div><dt>File</dt><dd>${escapeHtml(file?.name || "No file selected")}</dd></div>
    </dl>
  `;
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

const openDeleteModal = (id) => {
  const message = state.messages.find((item) => item.id === id);

  if (!message || !dom.deleteModal) return;

  state.pendingDeleteId = id;

  if (dom.deleteMessageTitle) {
    dom.deleteMessageTitle.textContent = `${message.name} - ${message.contact}`;
  }

  dom.deleteModal.hidden = false;
};

const closeDeleteModal = () => {
  state.pendingDeleteId = null;

  if (dom.deleteModal) {
    dom.deleteModal.hidden = true;
  }
};

const refreshData = async () => {
  dom.refresh?.setAttribute("disabled", "true");
  setConnectionStatus(
    isMockMode() ? "mock" : "checking",
    isMockMode() ? "Mock mode - Supabase off" : "Checking Supabase"
  );

  try {
    const nextState = await service.loadAll();

    state.messages = nextState.messages || [];
    state.gallery = nextState.gallery || [];
    state.videos = nextState.videos || [];
    renderAll();
    setConnectionStatus(
      isMockMode() ? "mock" : "connected",
      isMockMode() ? "Mock mode - Supabase off" : "Supabase connected"
    );
  } catch (error) {
    const message = error.message || "Could not load admin data";

    setConnectionStatus("error", "Supabase error");
    dom.mode?.setAttribute("title", message);
    showToast(message);
  } finally {
    dom.refresh?.removeAttribute("disabled");
  }
};

dom.navItems.forEach((item) => {
  item.addEventListener("click", () => setPanel(item.dataset.panelTarget));
});

dom.refresh?.addEventListener("click", () => {
  refreshData();
  showToast("Data refreshed");
});

dom.messageFilters?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-message-filter]");

  if (button) {
    setMessageFilter(button.dataset.messageFilter);
  }
});

dom.messageList?.addEventListener("click", async (event) => {
  const readButton = event.target.closest("[data-toggle-read]");
  const restoreButton = event.target.closest("[data-restore-message]");
  const deleteButton = event.target.closest("[data-delete-message]");

  if (readButton) {
    try {
      await service.toggleMessageRead(readButton.dataset.toggleRead);
      renderMessages();
    } catch (error) {
      showToast(error.message || "Could not update message");
    }
  }

  if (restoreButton) {
    try {
      await service.restoreMessage(restoreButton.dataset.restoreMessage);
      renderMessages();
      showToast("Message restored");
    } catch (error) {
      showToast(error.message || "Could not restore message");
    }
  }

  if (deleteButton) {
    openDeleteModal(deleteButton.dataset.deleteMessage);
  }
});

dom.deleteModal?.addEventListener("click", async (event) => {
  const cancelButton = event.target.closest("[data-delete-cancel]");
  const actionButton = event.target.closest("[data-delete-action]");

  if (cancelButton) {
    closeDeleteModal();
    return;
  }

  if (!actionButton || !state.pendingDeleteId) return;

  try {
    if (actionButton.dataset.deleteAction === "archive") {
      await service.archiveMessage(state.pendingDeleteId);
      showToast("Message archived");
    } else {
      await service.deleteMessage(state.pendingDeleteId);
      showToast("Message deleted permanently");
    }

    closeDeleteModal();
    renderMessages();
  } catch (error) {
    showToast(error.message || "Could not delete message");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDeleteModal();
  }
});

dom.galleryForm?.addEventListener("change", updateGalleryPreview);
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
    placement: form.elements.placement.value,
    title: form.elements.title.value.trim(),
    alt_text: form.elements.alt_text.value.trim(),
    sort_order: Number.parseInt(form.elements.sort_order.value || "0", 10)
  };

  submit?.setAttribute("disabled", "true");

  try {
    await service.createGalleryItem(payload, file);
    form.reset();
    updateGalleryPreview();
    renderGallery();
    showToast("Gallery image added");
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
    showToast("Video added");
  } catch (error) {
    showToast(error.message || "Could not add video");
  } finally {
    submit?.removeAttribute("disabled");
  }
});

setConnectionStatus(
  isMockMode() ? "mock" : "checking",
  isMockMode() ? "Mock mode - Supabase off" : "Checking Supabase"
);
setMockStatus();

setPanel(state.activePanel);
setMessageFilter(state.messageFilter);
updateGalleryPreview();
updateVideoPreview();
refreshData();
