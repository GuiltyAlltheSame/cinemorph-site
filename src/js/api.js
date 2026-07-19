/**
 * Public-site network boundary: contact delivery, Supabase reads, and image URLs.
 * UI modules should use these helpers instead of building requests directly.
 */

// Public configuration ---------------------------------------------------------

/** Returns the public Supabase configuration injected before the module entry. */
export const getSupabaseConfig = () => window.CINEMORPH_SUPABASE_CONFIG || {};

/** Checks that all values required by public read requests are present. */
export const isSupabaseConfigured = () => {
  const config = getSupabaseConfig();

  return Boolean(config.enabled && config.url && config.anonKey);
};

// Contact endpoint ------------------------------------------------------------

/** Submits the contact payload through the server-side anti-spam endpoint. */
export const submitContactMessage = async (payload) => {
  const response = await fetch("/.netlify/functions/submit-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  let result = {};

  try {
    result = await response.json();
  } catch {
    // The generic error below is safer than exposing a non-JSON server response.
  }

  if (!response.ok || !result.ok) {
    const error = new Error(result.error || "Message could not be sent. Please try again later.");

    error.status = response.status;
    throw error;
  }

  return result;
};

// Public Supabase reads --------------------------------------------------------

/** Fetches a public Supabase table using an optional PostgREST order clause. */
export const fetchSupabaseRows = async (tableName, order) => {
  if (!isSupabaseConfigured()) return [];

  const config = getSupabaseConfig();
  const baseUrl = config.url.replace(/\/$/, "");
  const url = new URL(`${baseUrl}/rest/v1/${tableName}`);

  url.searchParams.set("select", "*");
  if (order) {
    url.searchParams.set("order", order);
  }

  const response = await fetch(url, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(detail || "Supabase request failed");

    error.status = response.status;
    throw error;
  }

  return response.json();
};

/** Loads gallery and portfolio data concurrently to keep initial wait time low. */
export const loadPublicMedia = async () => {
  const tables = getSupabaseConfig().tables || {};
  const [gallery, videos] = await Promise.all([
    fetchSupabaseRows(tables.gallery || "gallery_items", "sort_order.asc.nullslast,created_at.desc"),
    fetchSupabaseRows(tables.videos || "portfolio_videos", "sort_order.asc.nullslast,created_at.desc")
  ]);

  return { gallery, videos };
};

// Supabase Storage images -----------------------------------------------------

/**
 * Converts a public Supabase Storage URL into an on-demand image transform URL.
 * Non-Supabase URLs pass through unchanged so local and external fallbacks work.
 */
export const getSupabaseImagePreviewUrl = (imageUrl, options = {}) => {
  const url = String(imageUrl || "").trim();

  if (!url || !url.includes("/storage/v1/object/public/")) {
    return url;
  }

  try {
    const transformUrl = new URL(url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/"));
    const width = options.width || 1200;
    const quality = options.quality || 100;

    transformUrl.searchParams.set("width", String(width));
    transformUrl.searchParams.set("quality", String(quality));
    transformUrl.searchParams.set("resize", options.resize || "contain");

    return transformUrl.toString();
  } catch {
    return url;
  }
};

/** Assigns an optimized image URL and falls back once if that request fails. */
export const setImageSourceWithFallback = (image, src, fallbackSrc) => {
  if (!image || !src) return;

  if (fallbackSrc && src !== fallbackSrc && !image.dataset.fallbackReady) {
    image.dataset.fallbackReady = "true";
    image.addEventListener("error", () => {
      if (image.dataset.fallbackSrc && image.src !== image.dataset.fallbackSrc) {
        image.src = image.dataset.fallbackSrc;
      }
    });
  }

  if (fallbackSrc) {
    image.dataset.fallbackSrc = fallbackSrc;
  }

  image.src = src;
};
