/**
 * Contact form feature: placeholder copy, reference links, Turnstile, and submit.
 */

import { submitContactMessage } from "./api.js";
import { dom } from "./core.js";

// Copy and module state -------------------------------------------------------

const contactMessagePlaceholders = [
  "Hi, we're opening a coffee shop and need a cinematic promo video...",
  "Hello, I'd like to film a music video for my upcoming single...",
  "We need drone footage of a property for a real estate listing...",
  "I'm looking for a videographer for a documentary project...",
  "We are launching a new product and need commercial content...",
  "Hi, I'd like to discuss a creative collaboration...",
  "We need behind-the-scenes coverage for an upcoming production...",
  "I have a short film idea and I'm looking for a production team...",
  "We're planning an event and need video coverage...",
  "Hi, I found your work online and would like to know your availability...",
  "We'd like to create something similar to the references attached...",
  "Looking for a cinematic reel for social media...",
  "Hi, I don't know exactly what I need yet, but I have an idea...",
  "Just wanted to say hello and connect with fellow creators..."
];

const referenceLinks = [];
let turnstileToken = "";
let isContactSubmitting = false;
let isContactInitialized = false;

// Status, placeholder, and verification --------------------------------------

/** Updates the inline form message and its visual status. */
const setContactStatus = (message, type = "neutral") => {
  if (!dom.contactStatus) return;

  dom.contactStatus.textContent = message;
  dom.contactStatus.classList.toggle("is-success", type === "success");
  dom.contactStatus.classList.toggle("is-error", type === "error");
};

/** Rotates example messages only while the textarea is empty. */
const initDynamicPlaceholder = () => {
  const field = dom.dynamicPlaceholderField;

  if (!field || contactMessagePlaceholders.length < 2) return;

  let placeholderIndex = 0;
  let fadeTimer = null;
  let intervalId = null;

  /** Stops both placeholder timers and restores the stable visual state. */
  const stopRotation = () => {
    window.clearInterval(intervalId);
    window.clearTimeout(fadeTimer);
    intervalId = null;
    fadeTimer = null;
    field.classList.remove("is-placeholder-changing");
  };

  /** Fades to the next example unless the visitor has started typing. */
  const rotatePlaceholder = () => {
    if (field.value.trim()) {
      stopRotation();
      return;
    }

    field.classList.add("is-placeholder-changing");
    fadeTimer = window.setTimeout(() => {
      placeholderIndex = (placeholderIndex + 1) % contactMessagePlaceholders.length;
      field.setAttribute("placeholder", contactMessagePlaceholders[placeholderIndex]);
      field.classList.remove("is-placeholder-changing");
    }, 450);
  };

  /** Starts one rotation interval and avoids duplicate timers. */
  const startRotation = () => {
    if (intervalId || field.value.trim()) return;

    intervalId = window.setInterval(rotatePlaceholder, 5000);
  };

  field.setAttribute("placeholder", contactMessagePlaceholders[placeholderIndex]);
  startRotation();
  field.addEventListener("input", () => {
    if (field.value.trim()) {
      stopRotation();
    } else {
      startRotation();
    }
  });
};

/** Clears the cached token and asks Turnstile to render a fresh challenge. */
const resetTurnstile = () => {
  turnstileToken = "";

  if (window.turnstile && typeof window.turnstile.reset === "function") {
    window.turnstile.reset();
  }
};

/** Returns a token supplied either by FormData or the global Turnstile callback. */
const getCurrentTurnstileToken = (formData) => {
  const formToken = String(formData.get("cf-turnstile-response") || "").trim();

  return formToken || turnstileToken;
};

// Reference-link parsing and rendering ---------------------------------------

/** Removes sentence punctuation that commonly follows a pasted URL. */
const stripTrailingUrlPunctuation = (value) => {
  let url = String(value || "").trim();

  while (/[.,!?;:]$/.test(url)) {
    url = url.slice(0, -1);
  }

  while (url.endsWith(")") && (url.match(/\(/g) || []).length < (url.match(/\)/g) || []).length) {
    url = url.slice(0, -1);
  }

  return url;
};

/** Normalizes supported HTTP(S) reference URLs and rejects unsafe protocols. */
const normalizeReferenceUrl = (value) => {
  const url = stripTrailingUrlPunctuation(value);
  const normalized = /^www\./i.test(url) ? `https://${url}` : url;

  try {
    const parsed = new URL(normalized);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }

    return parsed.href;
  } catch {
    return "";
  }
};

/** Builds a short human-readable card title from a reference URL. */
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

/** Extracts the hostname displayed under each reference title. */
const getReferenceLinkHost = (value) => {
  try {
    return new URL(value).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
};

/** Finds and normalizes every URL in pasted free-form text. */
const extractReferenceUrls = (value) => {
  const text = String(value || "");
  const urlPattern = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;

  return Array.from(text.matchAll(urlPattern), (match) => normalizeReferenceUrl(match[0]))
    .filter(Boolean);
};

/** Rebuilds reference cards from the small in-memory URL collection. */
const renderReferenceCards = () => {
  if (!dom.referenceList) return;

  const fragment = document.createDocumentFragment();

  referenceLinks.forEach((item, index) => {
    const card = document.createElement("div");
    const number = document.createElement("span");
    const body = document.createElement("span");
    const title = document.createElement("span");
    const host = document.createElement("span");
    const remove = document.createElement("button");
    const removeMark = document.createElement("span");

    card.className = "reference-card";
    number.className = "reference-card__number";
    number.textContent = String(index + 1).padStart(2, "0");
    body.className = "reference-card__body";
    title.className = "reference-card__title";
    title.textContent = item.title;
    host.className = "reference-card__url";
    host.textContent = getReferenceLinkHost(item.url);
    remove.className = "reference-card__remove";
    remove.type = "button";
    remove.dataset.referenceRemove = String(index);
    remove.setAttribute("aria-label", `Remove reference ${index + 1}`);
    removeMark.setAttribute("aria-hidden", "true");
    removeMark.textContent = "x";

    body.append(title, host);
    remove.append(removeMark);
    card.append(number, body, remove);
    fragment.append(card);
  });

  dom.referenceList.replaceChildren(fragment);
};

/** Adds unique URLs and reports whether the reference collection changed. */
const addReferenceUrls = (urls) => {
  let added = false;

  urls.forEach((url) => {
    const exists = referenceLinks.some((item) => item.url.toLowerCase() === url.toLowerCase());

    if (!exists) {
      referenceLinks.push({
        url,
        title: getReferenceLinkTitle(url)
      });
      added = true;
    }
  });

  if (added) {
    renderReferenceCards();
  }

  return added;
};

/** Parses the current input and clears it after at least one valid URL. */
const commitReferenceInput = () => {
  if (!dom.referenceInput) return false;

  const urls = extractReferenceUrls(dom.referenceInput.value);
  addReferenceUrls(urls);

  if (urls.length) {
    dom.referenceInput.value = "";
  }

  return Boolean(urls.length);
};

/** Synchronizes the optional reference controls with the checkbox state. */
const setReferencePanelState = () => {
  if (!dom.referenceToggle || !dom.referencePanel) return;

  const isEnabled = dom.referenceToggle.checked;

  if (dom.referenceField) {
    dom.referenceField.hidden = !isEnabled;
  }

  dom.referencePanel.hidden = !isEnabled;

  if (dom.referenceInput) {
    dom.referenceInput.disabled = !isEnabled;
  }
};

/** Serializes references to the shape accepted by the contact endpoint. */
const getReferencePayload = () => referenceLinks.map((item) => item.url);

// Event registration and submission ------------------------------------------

/** Exposes the exact callback names referenced by the Turnstile widget markup. */
const registerTurnstileCallbacks = () => {
  window.onTurnstileSuccess = (token) => {
    turnstileToken = String(token || "").trim();

    if (turnstileToken) {
      setContactStatus("");
    }
  };

  window.onTurnstileExpired = () => {
    turnstileToken = "";
    setContactStatus("Verification expired. Please try again.", "error");
  };

  window.onTurnstileError = () => {
    turnstileToken = "";
    setContactStatus("Verification could not be completed. Please try again.", "error");
  };
};

/** Registers reference-field interactions. */
const initReferenceLinks = () => {
  setReferencePanelState();

  dom.referenceToggle?.addEventListener("change", () => {
    setReferencePanelState();

    if (dom.referenceToggle.checked) {
      dom.referenceInput?.focus();
    }
  });

  dom.referenceBox?.addEventListener("click", (event) => {
    if (event.target.closest("[data-reference-remove]")) return;

    dom.referenceInput?.focus();
  });

  dom.referenceList?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-reference-remove]");

    if (!removeButton) return;

    referenceLinks.splice(Number(removeButton.dataset.referenceRemove), 1);
    renderReferenceCards();
    dom.referenceInput?.focus();
  });

  dom.referenceInput?.addEventListener("paste", (event) => {
    const pastedText = event.clipboardData?.getData("text") || "";
    const urls = extractReferenceUrls(pastedText);

    if (!urls.length) return;

    event.preventDefault();
    addReferenceUrls(urls);
    dom.referenceInput.value = "";
  });

  dom.referenceInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== "," && event.key !== " ") return;

    if (commitReferenceInput()) {
      event.preventDefault();
    }
  });

  dom.referenceInput?.addEventListener("blur", () => {
    commitReferenceInput();
  });
};

/** Validates and submits the public contact form. */
const initContactForm = () => {
  if (!dom.contactForm) return;

  dom.contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isContactSubmitting) return;

    const hasReferences = Boolean(dom.referenceToggle?.checked);

    if (hasReferences) {
      commitReferenceInput();

      if (String(dom.referenceInput?.value || "").trim()) {
        setContactStatus("Please paste a valid reference link or clear the reference field.", "error");
        dom.referenceInput?.focus();
        return;
      }
    }

    const formData = new FormData(dom.contactForm);
    const currentTurnstileToken = getCurrentTurnstileToken(formData);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      contact: String(formData.get("contact") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      company: String(formData.get("company") || ""),
      turnstileToken: currentTurnstileToken
    };

    if (!payload.name || !payload.contact || !payload.message) {
      setContactStatus("Please fill in your name, contact, and message.", "error");
      return;
    }

    if (hasReferences && !referenceLinks.length) {
      setContactStatus("Please add at least one reference link or uncheck I have references.", "error");
      dom.referenceInput?.focus();
      return;
    }

    if (!currentTurnstileToken) {
      setContactStatus("Please complete the verification before sending.", "error");
      return;
    }

    turnstileToken = currentTurnstileToken;

    if (hasReferences) {
      payload.reference_links = getReferencePayload();
    }

    isContactSubmitting = true;
    dom.contactSubmit?.setAttribute("disabled", "true");
    setContactStatus("Sending...");

    try {
      await submitContactMessage(payload);
      dom.contactForm.reset();
      referenceLinks.length = 0;
      renderReferenceCards();
      setReferencePanelState();
      resetTurnstile();
      setContactStatus("Message sent. We will get back to you soon.", "success");
    } catch (error) {
      console.error("Contact form submit error:", error);
      resetTurnstile();
      setContactStatus(
        error.status === 403
          ? "Verification expired or was already used. Please complete the check again."
          : error.message || "Message could not be sent. Please try again later.",
        "error"
      );
    } finally {
      isContactSubmitting = false;
      dom.contactSubmit?.removeAttribute("disabled");
    }
  });
};

/** Initializes the complete contact feature once. */
export const initContact = () => {
  if (isContactInitialized) return;

  isContactInitialized = true;
  registerTurnstileCallbacks();
  initDynamicPlaceholder();
  initReferenceLinks();
  initContactForm();
};
