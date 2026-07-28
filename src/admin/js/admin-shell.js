/**
 * Admin shell: panels, auth flow, refresh, dialogs, deletion, and global events.
 * Loaded in the explicit order declared by admin/index.html.
 */

// Delete, edit, and watcher modal lifecycle ----------------------------------

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
  syncAdminModalState();
};

const closeDeleteModal = () => {
  state.pendingDelete = null;

  if (dom.deleteModal) {
    dom.deleteModal.hidden = true;
  }

  syncAdminModalState();
};

const openWatcherModal = () => {
  if (!dom.watcherModal) return;

  renderWatcherModal();
  dom.watcherModal.hidden = false;
  syncAdminModalState();
};

const closeWatcherModal = () => {
  if (dom.watcherModal) {
    dom.watcherModal.hidden = true;
  }

  syncAdminModalState();
};

// Data refresh and cleanup-aware actions -------------------------------------

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

// Authentication lifecycle ---------------------------------------------------

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

// Shell navigation, link previews, and message actions -----------------------

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


// Dialog submissions and global keyboard handling ----------------------------

dom.deleteModal?.addEventListener("click", async (event) => {
  const cancelButton = event.target.closest("[data-delete-cancel]");
  const actionButton = event.target.closest("[data-delete-action]");

  if (cancelButton) {
    if (isAdminModalBackdropElement(cancelButton) && !isAdminMobile()) return;

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
  const closeTarget = event.target.closest("[data-watcher-close]");

  if (closeTarget && (!isAdminModalBackdropElement(closeTarget) || isAdminMobile())) {
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
