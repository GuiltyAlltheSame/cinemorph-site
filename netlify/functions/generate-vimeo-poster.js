const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

let bundledFfmpeg = null;

try {
  bundledFfmpeg = require("@ffmpeg-installer/ffmpeg");
} catch {
  bundledFfmpeg = null;
}

const jsonHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": process.env.ADMIN_ORIGIN || "*",
  "Content-Type": "application/json"
};

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(payload)
});

const parseBody = (event) => {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { statusCode: 400 });
  }
};

const sanitizeFileNamePart = (value) => String(value || "poster")
  .toLowerCase()
  .replace(/[^a-z0-9._-]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 80) || "poster";

const normalizeTableName = (value, fallback) => String(value || fallback).replace(/^public\./, "");

const getVideoBucketName = () => process.env.SUPABASE_VIDEO_BUCKET || "cinemorph-video-media";

const normalizeStoragePaths = (paths) => Array.from(new Set(
  (Array.isArray(paths) ? paths : [paths])
    .map((item) => String(item || "").trim().replace(/^\/+/, ""))
    .filter(Boolean)
));

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
    const pathValue = cleanUrl.split(marker)[1] || "";

    return decodeURIComponent(pathValue.split("?")[0] || "").replace(/^\/+/, "");
  }
};

const parseVimeoVideoId = (value) => {
  const rawValue = String(value || "").trim();

  if (!rawValue) return "";

  const source = /^https?:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`;

  try {
    const url = new URL(source);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host !== "vimeo.com" && host !== "player.vimeo.com") return "";

    const segments = url.pathname.split("/").filter(Boolean);
    let videoId = "";

    if (host === "player.vimeo.com") {
      const videoSegmentIndex = segments.indexOf("video");

      videoId = /^\d+$/.test(segments[videoSegmentIndex + 1] || "") ? segments[videoSegmentIndex + 1] : "";
    }

    if (!videoId && host === "vimeo.com") {
      const manageVideosIndex = segments.findIndex((segment, index) => (
        segment === "manage" && segments[index + 1] === "videos"
      ));

      if (manageVideosIndex >= 0) {
        videoId = /^\d+$/.test(segments[manageVideosIndex + 2] || "") ? segments[manageVideosIndex + 2] : "";
      }
    }

    return videoId || segments.find((segment) => /^\d+$/.test(segment)) || "";
  } catch {
    return "";
  }
};

const getSupabaseServiceClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw Object.assign(new Error("Supabase function environment is missing"), { statusCode: 500 });
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

const requireAdminUser = async (event, supabase) => {
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw Object.assign(new Error("Admin authorization is required"), { statusCode: 401 });
  }

  const { data: userResult, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userResult?.user) {
    throw Object.assign(new Error("Invalid admin session"), { statusCode: 401 });
  }

  const adminTable = normalizeTableName(process.env.SUPABASE_ADMIN_TABLE, "admin_users");
  const { data: adminRows, error: adminError } = await supabase
    .from(adminTable)
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .limit(1);

  if (adminError) {
    throw Object.assign(new Error(`Could not verify admin user: ${adminError.message}`), { statusCode: 500 });
  }

  if (!adminRows?.length) {
    throw Object.assign(new Error("Admin access denied"), { statusCode: 403 });
  }

  return userResult.user;
};

const getVimeoAccessToken = () => {
  const token = process.env.VIMEO_ACCESS_TOKEN;

  if (!token) {
    throw Object.assign(new Error("VIMEO_ACCESS_TOKEN is required for poster generation"), { statusCode: 500 });
  }

  return token;
};

const getVimeoVideo = async (vimeoVideoId) => {
  const fields = encodeURIComponent("name,files,download");
  const response = await fetch(`https://api.vimeo.com/videos/${vimeoVideoId}?fields=${fields}`, {
    headers: {
      Authorization: `Bearer ${getVimeoAccessToken()}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4"
    }
  });

  if (!response.ok) {
    let message = `Vimeo source lookup failed (${response.status})`;

    try {
      const errorBody = await response.json();
      message = errorBody.error || errorBody.message || message;
    } catch {
      // Keep the HTTP status fallback.
    }

    throw Object.assign(new Error(message), { statusCode: response.status === 404 ? 404 : 502 });
  }

  return response.json();
};

const scoreVimeoSource = (source) => {
  const width = Number(source.width || 0);
  const height = Number(source.height || 0);
  const size = Number(source.size || 0);
  const qualityScores = {
    source: 100000,
    hd: 90000,
    "1080p": 80000,
    "720p": 70000,
    sd: 40000,
    "540p": 30000,
    "360p": 20000
  };

  return (qualityScores[source.quality] || 0) + (width * height) + Math.min(size, 999999);
};

const resolveVimeoSource = async (vimeoVideoId) => {
  const video = await getVimeoVideo(vimeoVideoId);
  const candidates = [
    ...(Array.isArray(video.download) ? video.download : []),
    ...(Array.isArray(video.files) ? video.files : [])
  ]
    .filter((source) => source?.link)
    .filter((source) => {
      const type = String(source.type || source.mime || "").toLowerCase();
      const link = String(source.link || "").toLowerCase();

      return type.includes("video") || link.includes(".mp4") || link.includes("video");
    })
    .sort((a, b) => scoreVimeoSource(b) - scoreVimeoSource(a));

  if (!candidates.length) {
    throw Object.assign(new Error("No Vimeo video file source was available. Check the Vimeo token scopes and video privacy/download settings."), { statusCode: 422 });
  }

  return {
    link: candidates[0].link,
    quality: candidates[0].quality || "",
    width: candidates[0].width || null,
    height: candidates[0].height || null
  };
};

const getFfmpegPath = () => {
  const ffmpegPath = process.env.FFMPEG_PATH || bundledFfmpeg?.path || "";

  if (!ffmpegPath) {
    throw Object.assign(new Error("ffmpeg is not available. Install @ffmpeg-installer/ffmpeg or set FFMPEG_PATH."), { statusCode: 500 });
  }

  return ffmpegPath;
};

const runFfmpegPosterCapture = (sourceUrl, posterTime, outputPath) => new Promise((resolve, reject) => {
  const maxWidth = Math.max(320, Number(process.env.POSTER_MAX_WIDTH || 1600) || 1600);
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    String(Math.max(0, posterTime)),
    "-i",
    sourceUrl,
    "-frames:v",
    "1",
    "-vf",
    `scale='min(${maxWidth},iw)':-2`,
    "-q:v",
    "2",
    outputPath
  ];
  const ffmpeg = spawn(getFfmpegPath(), args, {
    windowsHide: true
  });
  let stderr = "";

  ffmpeg.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  ffmpeg.on("error", (error) => {
    reject(Object.assign(new Error(`Could not start ffmpeg: ${error.message}`), { statusCode: 500 }));
  });

  ffmpeg.on("close", (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(Object.assign(new Error(`ffmpeg poster generation failed: ${stderr.trim() || `exit ${code}`}`), { statusCode: 502 }));
  });
});

const uploadGeneratedPoster = async (supabase, options) => {
  const bucket = getVideoBucketName();
  const fileBuffer = await fs.promises.readFile(options.outputPath);

  if (!fileBuffer.length) {
    throw Object.assign(new Error("Generated poster file is empty"), { statusCode: 502 });
  }

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(options.storagePath, fileBuffer, {
      cacheControl: "31536000",
      contentType: "image/jpeg",
      upsert: false
    });

  if (uploadError) {
    throw Object.assign(new Error(`Generated poster upload failed: ${uploadError.message}`), { statusCode: 502 });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(options.storagePath);

  return {
    bucket,
    publicUrl: data.publicUrl
  };
};

const removeStorageFilesSafely = async (supabase, bucket, paths, label = "Storage") => {
  const cleanPaths = normalizeStoragePaths(paths);

  if (!cleanPaths.length) {
    return { paths: cleanPaths, error: null };
  }

  const { error } = await supabase.storage
    .from(bucket)
    .remove(cleanPaths);

  if (error) {
    console.error(`${label} cleanup error:`, { bucket, paths: cleanPaths, error });
    return { paths: cleanPaths, error };
  }

  return { paths: cleanPaths, error: null };
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: jsonHeaders,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  let didUpdateRow = false;
  let generatedPosterUpload = null;
  let outputPath = "";
  let storagePath = "";
  let supabase = null;

  try {
    const body = parseBody(event);
    const rowId = String(body.row_id || body.video_id || "").trim();
    const posterTime = Number(body.poster_time);
    const vimeoUrl = String(body.vimeo_url || "").trim();
    const vimeoVideoId = parseVimeoVideoId(vimeoUrl);

    if (!rowId) {
      throw Object.assign(new Error("video row id is required"), { statusCode: 400 });
    }

    if (!vimeoVideoId) {
      throw Object.assign(new Error("Valid Vimeo URL is required"), { statusCode: 400 });
    }

    if (!Number.isFinite(posterTime) || posterTime < 0) {
      throw Object.assign(new Error("poster_time must be a non-negative number"), { statusCode: 400 });
    }

    supabase = getSupabaseServiceClient();

    await requireAdminUser(event, supabase);

    const bucket = getVideoBucketName();
    const table = normalizeTableName(process.env.SUPABASE_VIDEOS_TABLE, "portfolio_videos");
    const { data: previousVideo, error: previousVideoError } = await supabase
      .from(table)
      .select("poster_url,poster_storage_path")
      .eq("id", rowId)
      .single();

    if (previousVideoError) {
      throw Object.assign(new Error(`Video row lookup failed: ${previousVideoError.message}`), { statusCode: 502 });
    }

    const previousPosterPath = String(
      previousVideo?.poster_storage_path || getSupabaseStoragePathFromUrl(previousVideo?.poster_url, bucket)
    ).trim();
    const source = await resolveVimeoSource(vimeoVideoId);
    const timestampMs = Math.round(posterTime * 1000);
    const safeRowId = sanitizeFileNamePart(rowId);
    const safeVimeoId = sanitizeFileNamePart(vimeoVideoId);
    const fileName = `vimeo-${safeVimeoId}-${timestampMs}.jpg`;
    storagePath = `posters/generated/${safeRowId}/${Date.now()}-${fileName}`;

    outputPath = path.join(os.tmpdir(), `${crypto.randomUUID()}-${fileName}`);

    await runFfmpegPosterCapture(source.link, posterTime, outputPath);

    generatedPosterUpload = await uploadGeneratedPoster(supabase, {
      outputPath,
      storagePath
    });

    const updatePayload = {
      poster_url: generatedPosterUpload.publicUrl,
      poster_storage_path: storagePath,
      poster_file_name: fileName,
      poster_mode: "vimeo_time",
      poster_time: posterTime
    };
    const { data: video, error: updateError } = await supabase
      .from(table)
      .update(updatePayload)
      .eq("id", rowId)
      .select()
      .single();

    if (updateError) {
      throw Object.assign(new Error(`Video row update failed: ${updateError.message}`), { statusCode: 502 });
    }

    didUpdateRow = true;

    const cleanupWarnings = [];

    if (previousPosterPath && previousPosterPath !== storagePath) {
      const cleanup = await removeStorageFilesSafely(
        supabase,
        generatedPosterUpload.bucket,
        [previousPosterPath],
        "Previous video poster"
      );

      if (cleanup.error) {
        cleanupWarnings.push({
          message: cleanup.error.message || "Previous poster cleanup failed",
          paths: cleanup.paths
        });
      }
    }

    return jsonResponse(200, {
      ok: true,
      poster: {
        bucket: generatedPosterUpload.bucket,
        publicUrl: generatedPosterUpload.publicUrl,
        storagePath,
        fileName,
        posterTime,
        posterMode: "vimeo_time"
      },
      source: {
        vimeoVideoId,
        quality: source.quality,
        width: source.width,
        height: source.height
      },
      cleanupWarnings,
      video
    });
  } catch (error) {
    if (generatedPosterUpload && storagePath && !didUpdateRow && supabase) {
      await removeStorageFilesSafely(
        supabase,
        generatedPosterUpload.bucket,
        [storagePath],
        "Generated poster rollback"
      );
    }

    console.error("Vimeo poster generation error:", error);

    return jsonResponse(error.statusCode || 500, {
      error: error.message || "Could not generate Vimeo poster"
    });
  } finally {
    if (outputPath) {
      fs.promises.unlink(outputPath).catch(() => {});
    }
  }
};
