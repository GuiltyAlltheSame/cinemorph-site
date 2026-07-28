/**
 * Shared admin runtime: configuration, state, DOM registry, and UI helpers.
 * Loaded in the explicit order declared by admin/index.html.
 */

// Configuration and shared application state --------------------------------

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

// DOM registry ----------------------------------------------------------------

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

// Shared shell and accessibility helpers -------------------------------------

const syncAdminModalState = () => {
  document.body.classList.toggle("is-admin-modal-open", Boolean(
    dom.deleteModal && !dom.deleteModal.hidden
    || dom.videoEditModal && !dom.videoEditModal.hidden
    || dom.watcherModal && !dom.watcherModal.hidden
  ));
};

const adminMobileQuery = window.matchMedia("(max-width: 700px)");
const isAdminMobile = () => adminMobileQuery.matches;
const isAdminModalBackdropElement = (element) => (
  element instanceof HTMLElement && element.classList.contains("modal__backdrop")
);

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


// Formatting, notifications, and file names ----------------------------------

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
