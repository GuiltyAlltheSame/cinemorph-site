/**
 * Video and VHS ordering, editor submission, upload, and form events.
 * Loaded in the explicit order declared by admin/index.html.
 */

// VHS menu-order drag interaction --------------------------------------------

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

// Portfolio-card drag interaction --------------------------------------------

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

// Video list and edit-modal events --------------------------------------------

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

  const closeTarget = event.target.closest("[data-video-edit-close]");

  if (closeTarget && (!isAdminModalBackdropElement(closeTarget) || isAdminMobile())) {
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


// New-video form synchronization ---------------------------------------------

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


// New-video submission --------------------------------------------------------

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
