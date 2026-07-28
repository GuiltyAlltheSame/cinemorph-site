/**
 * Gallery crop/focus editor, uploads, ordering, dragging, and form events.
 * Loaded in the explicit order declared by admin/index.html.
 */

// Format, focus, crop geometry, and image processing --------------------------

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

// Browser-side upload optimization -------------------------------------------

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


// Existing-card ordering and drag interaction --------------------------------

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


// Upload-form focus and crop controls -----------------------------------------

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


// Gallery upload submission ---------------------------------------------------

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
