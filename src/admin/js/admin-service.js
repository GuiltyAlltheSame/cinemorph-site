/**
 * Supabase authentication, database operations, storage uploads, and cleanup.
 * Loaded in the explicit order declared by admin/index.html.
 */

// Supabase client and authentication session ---------------------------------

const getSupabaseClient = () => {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase config is missing");
  }

  if (!window.supabase) {
    throw new Error("Supabase SDK is not loaded");
  }

  if (!getSupabaseClient.client && window.supabase && config.supabase?.url && config.supabase?.anonKey) {
    getSupabaseClient.client = window.supabase.createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      }
    });
  }

  return getSupabaseClient.client;
};

const getAuthUserLabel = (session) => session?.user?.email || "Admin";

const applyAuthSession = (session) => {
  state.authSession = session || null;
  setAdminVisibility(Boolean(session));

  if (session) {
    setConnectionStatus("connected", `Signed in: ${getAuthUserLabel(session)}`);
  } else if (isAuthEnabled()) {
    setConnectionStatus("warning", "Sign in required");
  }
};

const clearAdminData = () => {
  state.messages = [];
  state.gallery = [];
  state.videos = [];
  state.pendingDelete = null;
  closeDeleteModal();
  closeWatcherModal();
  renderAll();
};

const ensureAuthSession = async () => {
  if (!isAuthEnabled()) {
    setAdminVisibility(true);
    return true;
  }

  setConnectionStatus("checking", "Checking session");

  try {
    const { data, error } = await getSupabaseClient().auth.getSession();

    if (error) throw error;

    applyAuthSession(data.session);
    return Boolean(data.session);
  } catch (error) {
    setAdminVisibility(false);
    setConnectionStatus("error", "Auth error");
    setAuthError(error.message || "Could not check admin session");
    return false;
  }
};

// Storage upload, path normalization, and cleanup -----------------------------

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

// Stored video-media compatibility helpers -----------------------------------

const getVideoPreviewMp4Url = (video = {}) => String(
  video.preview_mp4_url
  || video.preview_video_url
  || video.thumbnail_mp4_url
  || ""
).trim();

const getVideoPreviewMp4StoragePath = (video = {}, bucket = "") => String(
  video.preview_mp4_storage_path
  || video.preview_video_storage_path
  || video.thumbnail_mp4_storage_path
  || getSupabaseStoragePathFromUrl(getVideoPreviewMp4Url(video), bucket)
  || ""
).trim();

const getVideoThumbnailGifUrl = (video = {}) => String(video.thumbnail_gif_url || "").trim();

const getPreviewFileState = (file) => {
  if (!file) {
    return {
      file: null,
      type: ""
    };
  }

  const mimeType = String(file.type || "").toLowerCase();
  const fileName = String(file.name || "").toLowerCase();
  const isMp4 = mimeType === "video/mp4" || fileName.endsWith(".mp4");
  const isGif = mimeType === "image/gif" || fileName.endsWith(".gif");

  if (isMp4) {
    return {
      file,
      type: "mp4"
    };
  }

  if (isGif) {
    return {
      file,
      type: "gif"
    };
  }

  throw new Error("Preview file must be GIF or MP4");
};

const hasVideoPreviewFile = (video = {}) => Boolean(
  getVideoPreviewMp4Url(video) || getVideoThumbnailGifUrl(video)
);

const normalizeStoragePaths = (paths) => Array.from(new Set(
  (Array.isArray(paths) ? paths : [paths])
    .map((path) => String(path || "").trim().replace(/^\/+/, ""))
    .filter(Boolean)
));

const removeSupabaseFiles = async (bucket, paths) => {
  const cleanPaths = normalizeStoragePaths(paths);

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

const removeSupabaseFilesSafely = async (bucket, paths, label = "Storage") => {
  const cleanPaths = normalizeStoragePaths(paths);

  if (!cleanPaths.length) {
    return { paths: cleanPaths, error: null };
  }

  try {
    await removeSupabaseFiles(bucket, cleanPaths);
    return { paths: cleanPaths, error: null };
  } catch (error) {
    console.error(`${label} cleanup error:`, { bucket, paths: cleanPaths, error });
    return { paths: cleanPaths, error };
  }
};

// Database and storage service facade -----------------------------------------

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
      client.from(tables.videos).select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false })
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
    const cleanupWarnings = [];

    const { error } = await getSupabaseClient()
      .from(config.supabase.tables.gallery)
      .delete()
      .eq("id", id);

    if (error) throw error;

    state.gallery = state.gallery.filter((galleryItem) => galleryItem.id !== id);

    if (!imagePath) {
      cleanupWarnings.push(new Error("Gallery image storage path is missing"));
    } else {
      const cleanup = await removeSupabaseFilesSafely(bucket, [imagePath], "Gallery image");

      if (cleanup.error) {
        cleanupWarnings.push(cleanup.error);
      }
    }

    return { cleanupWarnings };
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

  async updateVideoOrder(orderedIds) {
    const table = config.supabase.tables.videos;
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

  async updateTapeOrder(orderedIds) {
    const table = config.supabase.tables.videos;
    const client = getSupabaseClient();
    const results = await Promise.all(orderedIds.map((id, index) => client
      .from(table)
      .update({ tape_sort_order: index + 1 })
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
    const previewMp4Path = getVideoPreviewMp4StoragePath(item, bucket);
    const gifPath = item.thumbnail_gif_storage_path || getSupabaseStoragePathFromUrl(item.thumbnail_gif_url, bucket);
    const posterPath = item.poster_storage_path || getSupabaseStoragePathFromUrl(item.poster_url, bucket);
    const cleanupWarnings = [];

    const { error } = await getSupabaseClient()
      .from(config.supabase.tables.videos)
      .delete()
      .eq("id", id);

    if (error) throw error;

    state.videos = state.videos.filter((videoItem) => videoItem.id !== id);

    if (getVideoPreviewMp4Url(item) && !previewMp4Path) {
      cleanupWarnings.push(new Error("Video MP4 preview storage path is missing"));
    }

    if (item.thumbnail_gif_url && !gifPath) {
      cleanupWarnings.push(new Error("Video GIF storage path is missing"));
    }

    if (item.poster_url && !posterPath) {
      cleanupWarnings.push(new Error("Video poster storage path is missing"));
    }

    const cleanup = await removeSupabaseFilesSafely(bucket, [previewMp4Path, gifPath, posterPath], "Video media");

    if (cleanup.error) {
      cleanupWarnings.push(cleanup.error);
    }

    return { cleanupWarnings };
  },

  async createGalleryItem(payload, file, cropWindow = state.galleryCrop) {
    const uploadFile = await createCroppedGalleryUploadFile(file, cropWindow);

    const bucket = config.supabase.storage.galleryBucket;
    let upload = null;

    try {
      upload = await uploadSupabaseFile(bucket, getGalleryFormat().storageFolder, uploadFile);

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
    } catch (error) {
      await removeSupabaseFilesSafely(
        bucket,
        [upload?.path],
        "Failed gallery create upload rollback"
      );
      throw error;
    }
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
    const previewFileState = getPreviewFileState(files.previewFile || null);
    const uploadFiles = {
      previewFile: previewFileState.file,
      previewType: previewFileState.type,
      poster: files.poster
        ? await optimizeImageFile(files.poster, {
            maxLongEdge: imageUploadDefaults.posterMaxLongEdge,
            quality: imageUploadDefaults.quality
          })
        : null
    };

    const bucket = config.supabase.storage.videoBucket;
    let previewMp4Upload = null;
    let gifUpload = null;
    let posterUpload = null;

    try {
      previewMp4Upload = uploadFiles.previewType === "mp4"
        ? await uploadSupabaseFile(bucket, "previews", uploadFiles.previewFile)
        : null;
      gifUpload = uploadFiles.previewType === "gif"
        ? await uploadSupabaseFile(bucket, "gifs", uploadFiles.previewFile)
        : null;
      posterUpload = uploadFiles.poster ? await uploadSupabaseFile(bucket, "posters", uploadFiles.poster) : null;

      const item = {
        ...payload,
        thumbnail_gif_url: gifUpload?.publicUrl || "",
        thumbnail_gif_storage_path: gifUpload?.path || "",
        thumbnail_gif_file_name: uploadFiles.previewType === "gif" ? uploadFiles.previewFile.name : "",
        poster_url: posterUpload?.publicUrl || "",
        poster_storage_path: posterUpload?.path || "",
        poster_file_name: uploadFiles.poster?.name || ""
      };

      if (previewMp4Upload) {
        item.preview_mp4_url = previewMp4Upload.publicUrl;
        item.preview_mp4_storage_path = previewMp4Upload.path;
        item.preview_mp4_file_name = uploadFiles.previewFile.name;
      }

      const { data, error } = await getSupabaseClient()
        .from(config.supabase.tables.videos)
        .insert(item)
        .select()
        .single();

      if (error) throw error;

      state.videos.unshift(data);
      return data;
    } catch (error) {
      await removeSupabaseFilesSafely(
        bucket,
        [previewMp4Upload?.path, gifUpload?.path, posterUpload?.path],
        "Failed video create upload rollback"
      );
      throw error;
    }
  },

  async generateVimeoPoster(video, posterState) {
    const endpoint = getPosterGenerationEndpoint();

    if (!endpoint) {
      throw new Error("Poster generation endpoint is missing");
    }

    const headers = {
      "Content-Type": "application/json"
    };

    if (state.authSession?.access_token) {
      headers.Authorization = `Bearer ${state.authSession.access_token}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        row_id: video.id,
        video_id: video.id,
        vimeo_url: video.vimeo_url,
        poster_time: posterState.time
      })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Could not generate Vimeo poster");
    }

    if (result.video?.id) {
      const item = state.videos.find((videoItem) => videoItem.id === result.video.id);

      if (item) {
        Object.assign(item, result.video);
      }
    }

    return result;
  },

  async updateVideoItem(id, payload, files = {}) {
    const item = state.videos.find((videoItem) => videoItem.id === id);

    if (!item) return null;

    const bucket = config.supabase.storage.videoBucket;
    const oldPreviewMp4Path = getVideoPreviewMp4StoragePath(item, bucket);
    const oldGifPath = item.thumbnail_gif_storage_path || getSupabaseStoragePathFromUrl(item.thumbnail_gif_url, bucket);
    const oldPosterPath = item.poster_storage_path || getSupabaseStoragePathFromUrl(item.poster_url, bucket);
    const cleanupWarnings = [];
    const previewFileState = getPreviewFileState(files.previewFile || null);
    const uploadFiles = {
      previewFile: previewFileState.file,
      previewType: previewFileState.type,
      poster: files.poster
        ? await optimizeImageFile(files.poster, {
            maxLongEdge: imageUploadDefaults.posterMaxLongEdge,
            quality: imageUploadDefaults.quality
          })
        : null
    };
    const nextPayload = { ...payload };
    let previewMp4Upload = null;
    let gifUpload = null;
    let posterUpload = null;

    try {
      if (uploadFiles.previewType === "mp4") {
        previewMp4Upload = await uploadSupabaseFile(bucket, "previews", uploadFiles.previewFile);

        nextPayload.preview_mp4_url = previewMp4Upload.publicUrl;
        nextPayload.preview_mp4_storage_path = previewMp4Upload.path;
        nextPayload.preview_mp4_file_name = uploadFiles.previewFile.name;
        nextPayload.thumbnail_gif_url = "";
        nextPayload.thumbnail_gif_storage_path = "";
        nextPayload.thumbnail_gif_file_name = "";
      }

      if (uploadFiles.previewType === "gif") {
        gifUpload = await uploadSupabaseFile(bucket, "gifs", uploadFiles.previewFile);

        nextPayload.thumbnail_gif_url = gifUpload.publicUrl;
        nextPayload.thumbnail_gif_storage_path = gifUpload.path;
        nextPayload.thumbnail_gif_file_name = uploadFiles.previewFile.name;
        nextPayload.preview_mp4_url = "";
        nextPayload.preview_mp4_storage_path = "";
        nextPayload.preview_mp4_file_name = "";
      }

      if (uploadFiles.poster) {
        posterUpload = await uploadSupabaseFile(bucket, "posters", uploadFiles.poster);

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

      const replacedPaths = [];

      if (uploadFiles.previewType) {
        if (oldPreviewMp4Path) {
          replacedPaths.push(oldPreviewMp4Path);
        } else if (getVideoPreviewMp4Url(item)) {
          cleanupWarnings.push(new Error("Previous video MP4 preview storage path is missing"));
        }

        if (oldGifPath) {
          replacedPaths.push(oldGifPath);
        } else if (item.thumbnail_gif_url) {
          cleanupWarnings.push(new Error("Previous video GIF storage path is missing"));
        }
      }

      if (uploadFiles.poster) {
        if (oldPosterPath) {
          replacedPaths.push(oldPosterPath);
        } else if (item.poster_url) {
          cleanupWarnings.push(new Error("Previous video poster storage path is missing"));
        }
      }

      const cleanup = await removeSupabaseFilesSafely(
        bucket,
        replacedPaths.filter((path) => (
          path !== previewMp4Upload?.path
          && path !== gifUpload?.path
          && path !== posterUpload?.path
        )),
        "Replaced video media"
      );

      if (cleanup.error) {
        cleanupWarnings.push(cleanup.error);
      }

      Object.assign(item, data);
      return { ...data, cleanupWarnings };
    } catch (error) {
      await removeSupabaseFilesSafely(
        bucket,
        [previewMp4Upload?.path, gifUpload?.path, posterUpload?.path],
        "Failed video update upload rollback"
      );
      throw error;
    }
  }
};
