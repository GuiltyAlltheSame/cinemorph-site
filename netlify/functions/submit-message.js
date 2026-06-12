const { createClient } = require("@supabase/supabase-js");

const jsonHeaders = {
  "Content-Type": "application/json"
};

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(payload)
});

const createHttpError = (message, statusCode = 400) => Object.assign(new Error(message), {
  statusCode
});

const parseJsonBody = (event) => {
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : event.body || "";

  if (!rawBody.trim()) {
    throw createHttpError("Request body is required.");
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw createHttpError("Request body must be valid JSON.");
  }
};

const validateTextField = (body, fieldName, options = {}) => {
  const value = body[fieldName];
  const label = options.label || fieldName;

  if (typeof value !== "string") {
    throw createHttpError(`${label} is required.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw createHttpError(`${label} is required.`);
  }

  if (options.minLength && trimmed.length < options.minLength) {
    throw createHttpError(`${label} must be at least ${options.minLength} characters.`);
  }

  if (options.maxLength && trimmed.length > options.maxLength) {
    throw createHttpError(`${label} must be ${options.maxLength} characters or fewer.`);
  }

  return trimmed;
};

const validateReferenceLinks = (value) => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw createHttpError("reference_links must be an array.");
  }

  if (value.length > 5) {
    throw createHttpError("reference_links can contain up to 5 links.");
  }

  return value.map((item) => {
    if (typeof item !== "string") {
      throw createHttpError("Each reference link must be a string.");
    }

    const trimmed = item.trim();

    if (!trimmed) {
      throw createHttpError("Each reference link must be a non-empty string.");
    }

    if (trimmed.length > 500) {
      throw createHttpError("Each reference link must be 500 characters or fewer.");
    }

    return trimmed;
  });
};

const isHoneypotTriggered = (body) => {
  if (!body || typeof body !== "object") {
    return false;
  }

  return String(body.company || "").trim() !== "";
};

const getTurnstileToken = (body) => {
  const token = typeof body?.turnstileToken === "string" ? body.turnstileToken.trim() : "";

  if (!token) {
    throw createHttpError("Verification token is required.");
  }

  return token;
};

const getRequestIp = (headers = {}) => {
  const normalizedHeaders = Object.entries(headers).reduce((result, [key, value]) => {
    result[key.toLowerCase()] = value;
    return result;
  }, {});
  const ipHeader = normalizedHeaders["cf-connecting-ip"]
    || normalizedHeaders["x-nf-client-connection-ip"]
    || normalizedHeaders["x-forwarded-for"]
    || normalizedHeaders["x-real-ip"]
    || normalizedHeaders["client-ip"]
    || "";

  return String(ipHeader).split(",")[0].trim();
};

const verifyTurnstile = async (token, remoteIp) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    throw createHttpError("Turnstile server configuration is missing.", 500);
  }

  const formData = new URLSearchParams({
    secret,
    response: token
  });

  if (remoteIp) {
    formData.set("remoteip", remoteIp);
  }

  let response;

  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });
  } catch (error) {
    console.error("Turnstile verification request failed:", {
      message: error.message
    });
    throw createHttpError("Could not verify request.", 502);
  }

  let result = {};

  try {
    result = await response.json();
  } catch {
    throw createHttpError("Could not verify request.", 502);
  }

  if (!response.ok || result.success !== true) {
    console.warn("Turnstile verification failed:", {
      status: response.status,
      errorCodes: Array.isArray(result["error-codes"]) ? result["error-codes"] : []
    });
    throw createHttpError("Verification failed.", 403);
  }
};

const validateMessagePayload = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createHttpError("Request body must be a JSON object.");
  }

  return {
    name: validateTextField(body, "name", { label: "name", maxLength: 120 }),
    contact: validateTextField(body, "contact", { label: "contact", maxLength: 200 }),
    message: validateTextField(body, "message", { label: "message", minLength: 5, maxLength: 3000 }),
    reference_links: validateReferenceLinks(body.reference_links)
  };
};

const normalizeTableName = (value, fallback) => String(value || fallback).replace(/^public\./, "");

const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw createHttpError("Server configuration is missing.", 500);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, {
      ok: false,
      error: "Method not allowed."
    });
  }

  try {
    const body = parseJsonBody(event);

    if (isHoneypotTriggered(body)) {
      console.log("Contact message honeypot triggered");
      return jsonResponse(200, { ok: true });
    }

    const payload = validateMessagePayload(body);
    const turnstileToken = getTurnstileToken(body);

    await verifyTurnstile(turnstileToken, getRequestIp(event.headers));

    const supabase = getSupabaseClient();
    const table = normalizeTableName(process.env.SUPABASE_MESSAGES_TABLE, "messages");
    const { error } = await supabase
      .from(table)
      .insert(payload);

    if (error) {
      console.error("Contact message insert error:", {
        message: error.message,
        code: error.code,
        status: error.status
      });

      throw createHttpError("Could not save message.", 502);
    }

    return jsonResponse(200, { ok: true });
  } catch (error) {
    const statusCode = Number(error.statusCode) || 500;

    if (statusCode >= 500) {
      console.error("Contact message function error:", {
        message: error.message,
        statusCode
      });
    }

    return jsonResponse(statusCode, {
      ok: false,
      error: error.message || "Could not submit message."
    });
  }
};
