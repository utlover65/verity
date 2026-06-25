// ── Verity Express Server (Render-compatible) ─────────────────────────────────
// Converted from Cloudflare Worker. Run with: node server.js
// Deploy on Render as a Web Service (Node environment).
//
// Required environment variables (set in Render dashboard → Environment):
//   VERITY_SECRET
//   GROQ_API_KEY
//   GEMINI_API_KEY
//   POLLINATIONS_API_KEY          (optional – provider has no auth)
//   OPENROUTER_API_KEY
//   DISCORD_WEBHOOK_URL           (optional – general chat log)
//   DISCORD_MODERATION_WEBHOOK_URL (optional – flagged-message alerts)
//   MODERATION_BLOCK_FLAGGED      (optional – set "true" to block flagged msgs)
//   PORT                          (optional – Render sets this automatically)

import express from "express";

const app = express();
app.use(express.json());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// ── Providers ─────────────────────────────────────────────────────────────────
const PROVIDERS = {
  groq: {
    type: "openai",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    keyEnv: "GROQ_API_KEY",
  },
  gemini: {
    type: "gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    keyEnv: "GEMINI_API_KEY",
  },
  pollinations: {
    type: "openai",
    url: "https://gen.pollinations.ai/v1/chat/completions",
    model: "openai",
    keyEnv: "POLLINATIONS_API_KEY",
  },
  "or-qwen3-235b": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "qwen/qwen3-235b-a22b", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-nemotron-super-120b": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "nvidia/nemotron-3-super-120b-a12b", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-nemotron-reasoning-30b": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-owl-alpha": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "openrouter/owl-alpha", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-lfm-thinking": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "liquid/lfm-2.5-1.2b-thinking", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-lfm-instruct": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "liquid/lfm-2.5-1.2b-instruct", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-nemotron-nano-30b": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "nvidia/nemotron-3-nano-30b-a3b", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-qwen3-next-80b": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "qwen/qwen3-next-80b-a3b-instruct", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-nemotron-nano-9b": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "nvidia/nemotron-nano-9b-v2", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-gpt-oss-20b": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "openai/gpt-oss-20b", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-llama33-70b": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "meta-llama/llama-3.3-70b-instruct", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-hermes-405b": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "nousresearch/hermes-3-llama-3.1-405b", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-north-mini-code": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "cohere/north-mini-code", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-laguna-xs2": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "poolside/laguna-xs.2", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-qwen3-coder": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "qwen/qwen3-coder", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-deepseek-r1": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "deepseek/deepseek-r1", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-deepseek-chat": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "deepseek/deepseek-chat", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-llama4-scout": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "meta-llama/llama-4-scout", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-llama4-maverick": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "meta-llama/llama-4-maverick", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-mistral-7b": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "mistralai/mistral-7b-instruct", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-laguna-m1": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, family: "poolside/laguna-m.1", keyEnv: "OPENROUTER_API_KEY",
  },
  "or-gemma4-26b": {
    type: "openai", url: "https://openrouter.ai/api/v1/chat/completions",
    isOpenRouter: true, paid: true, family: "google/gemma-4-26b-a4b-it", keyEnv: "OPENROUTER_API_KEY",
  },
};

// ── OpenRouter free-model cache ───────────────────────────────────────────────
let orFreeModelsCache = { ids: [], fetchedAt: 0 };
const OR_CACHE_TTL_MS = 10 * 60 * 1000;

async function getFreeOpenRouterModels(key) {
  const now = Date.now();
  if (orFreeModelsCache.ids.length && now - orFreeModelsCache.fetchedAt < OR_CACHE_TTL_MS) {
    return orFreeModelsCache.ids;
  }
  const headers = key ? { Authorization: "Bearer " + key } : {};
  try {
    const resp = await fetch("https://openrouter.ai/api/v1/models", { headers });
    if (!resp.ok) return orFreeModelsCache.ids;
    const data = await resp.json();
    const freeIds = (data.data || [])
      .filter(m => m.pricing?.prompt === "0" && m.pricing?.completion === "0")
      .map(m => m.id);
    orFreeModelsCache = { ids: freeIds, fetchedAt: now };
    return freeIds;
  } catch {
    return orFreeModelsCache.ids;
  }
}

async function resolveOpenRouterModel(cfg, key) {
  const freeIds = await getFreeOpenRouterModels(key);
  if (!freeIds.length) return null;
  const exact = cfg.family + ":free";
  if (freeIds.includes(exact)) return exact;
  const vendorPrefix = cfg.family.split("/")[0] + "/";
  const sameVendor = freeIds.filter(id => id.startsWith(vendorPrefix));
  if (sameVendor.length) return pickRandom(sameVendor);
  return pickRandom(freeIds);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Discord logging ───────────────────────────────────────────────────────────
function logToDiscord(playerName, userMessage, providerName) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || "";
  if (!webhookUrl) return;
  const safeName = (playerName || "unknown").slice(0, 50);
  const safeMsg  = (userMessage || "").slice(0, 1800);
  const content  = `**${safeName}** (${providerName || "?"}): ${safeMsg}`;
  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.slice(0, 2000) }),
  }).catch(e => console.warn("[Verity] Discord log failed:", e?.message));
}

function alertModeration(playerName, message, categories) {
  const webhookUrl = process.env.DISCORD_MODERATION_WEBHOOK_URL || "";
  if (!webhookUrl) return;
  const safeName  = (playerName || "unknown").slice(0, 50);
  const safeMsg   = (message    || "").slice(0, 1000);
  const catEmojis = { slurs: "🤬", sexual: "🔞", threats: "⚠️" };
  const catDisplay = categories.map(c => (catEmojis[c] || "🚩") + " " + c).join("  ");
  const embed = {
    title: "🚨 Flagged player message",
    color: 0xFF3333,
    fields: [
      { name: "Minecraft gamertag", value: "`" + safeName + "`", inline: false },
      { name: "Categories",         value: catDisplay,            inline: false },
      { name: "Message",            value: safeMsg,               inline: false },
    ],
    timestamp: new Date().toISOString(),
  };
  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  }).catch(e => console.warn("[Verity] Moderation alert failed:", e?.message));
}

// ── Content moderation ────────────────────────────────────────────────────────
const MODERATION_CATEGORIES = {
  slurs: [
    /\bn[i1!]gg(?:er|a|ers|as)\b/i,
    /\bf[a@4]gg?[o0]t\b/i,
    /\bk[i1!]ke\b/i,
    /\bch[i1!]nk\b/i,
    /\bsp[i1!][ck]\b/i,
    /\bwetback\b/i,
    /\btr[a@]nn[yi]\b/i,
  ],
  sexual: [
    /\bporn(?:o|ography)?\b/i,
    /\bhentai\b/i,
    /\bnude(?:s)?\b/i,
    /\bboob(?:s)?\b/i,
    /\bdick\s*pic/i,
    /\bcum\s*(?:shot|on|inside)/i,
    /\bpenis\b/i,
    /\bvagina\b/i,
    /\bhorny\b/i,
    /\bmasturbat/i,
    /\bsend\s+(?:nudes?|pics?|feet)/i,
    /\bonlyfans?\b/i,
    /\bnsfw\b/i,
  ],
  threats: [
    /\bkys\b/i,
    /\bkill\s*your\s*self\b/i,
    /\bgo\s+(?:kill|hang|shoot)\s+your\s*self\b/i,
    /\bi(?:'?ll|'?m\s+going\s+to)\s+(?:kill|murder|stab|shoot)\s+(?:you|ur|u)\b/i,
    /\bi\s+will\s+(?:kill|murder|find)\s+you\b/i,
  ],
};

function scanMessage(text) {
  if (!text || typeof text !== "string") return [];
  return Object.entries(MODERATION_CATEGORIES)
    .filter(([, patterns]) => patterns.some(re => re.test(text)))
    .map(([category]) => category);
}

// ── Upstream request builders ─────────────────────────────────────────────────
function buildUpstreamRequest(cfg, key, systemPrompt, history, userMessage, resolvedModel) {
  if (cfg.type === "openai") {
    const modelName = cfg.isOpenRouter ? resolvedModel : cfg.model;
    if (!modelName) return null;
    const headers = { "Content-Type": "application/json" };
    if (key) headers["Authorization"] = "Bearer " + key;
    return {
      url: cfg.url,
      headers,
      body: JSON.stringify({
        model: modelName,
        max_tokens: 120,
        messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userMessage }],
      }),
    };
  }
  if (cfg.type === "gemini") {
    if (!key) return null;
    const contents = [...history, { role: "user", content: userMessage }].map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    return {
      url: cfg.url + "?key=" + key,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 120 },
      }),
    };
  }
  return null;
}

function extractText(cfg, parsed) {
  if (cfg.type === "openai") {
    return parsed?.choices?.[0]?.message?.content?.trim() || null;
  }
  if (cfg.type === "gemini") {
    return parsed?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  }
  return null;
}

// ── Main route ────────────────────────────────────────────────────────────────
app.post("/", async (req, res) => {
  const { secret, provider: providerName, playerName, systemPrompt, history = [], userMessage } = req.body;

  // Secret check
  const workerSecret = process.env.VERITY_SECRET || "";
  if (!workerSecret || secret !== workerSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Content moderation
  const flaggedCategories = scanMessage(userMessage);
  const isFlagged = flaggedCategories.length > 0;
  if (isFlagged) {
    alertModeration(playerName, userMessage, flaggedCategories);
    const shouldBlock = (process.env.MODERATION_BLOCK_FLAGGED || "").toLowerCase() === "true";
    if (shouldBlock) {
      return res.status(400).json({ flagged: true, categories: flaggedCategories });
    }
  }

  // Discord log (fire-and-forget)
  logToDiscord(playerName, userMessage, providerName);

  // Provider lookup
  const cfg = PROVIDERS[providerName];
  if (!cfg) {
    return res.status(400).json({ error: "Unknown provider: " + providerName });
  }

  const key = process.env[cfg.keyEnv] || "";

  // Resolve OpenRouter model
  let resolvedModel = null;
  if (cfg.isOpenRouter) {
    if (cfg.paid) {
      resolvedModel = cfg.family;
    } else {
      resolvedModel = await resolveOpenRouterModel(cfg, key);
      if (!resolvedModel) {
        return res.status(503).json({ error: `No free OpenRouter models currently available for '${providerName}'` });
      }
    }
  }

  // Build upstream request
  const upstreamReq = buildUpstreamRequest(cfg, key, systemPrompt, history, userMessage, resolvedModel);
  if (!upstreamReq) {
    return res.status(503).json({ error: `Provider '${providerName}' has no API key configured` });
  }

  // Forward to upstream
  let upstreamResp;
  try {
    upstreamResp = await fetch(upstreamReq.url, {
      method: "POST",
      headers: upstreamReq.headers,
      body: upstreamReq.body,
    });
  } catch (e) {
    return res.status(502).json({ error: "Upstream fetch failed: " + e.message });
  }

  let parsed;
  try {
    parsed = await upstreamResp.json();
  } catch {
    return res.status(502).json({ error: "Upstream returned non-JSON" });
  }

  if (!upstreamResp.ok) {
    const msg = parsed?.error?.message || parsed?.error || upstreamResp.statusText;
    return res.status(502).json({ error: `Upstream error (${upstreamResp.status}): ${msg}` });
  }

  const text = extractText(cfg, parsed);
  if (!text) {
    return res.status(502).json({ error: "Upstream returned empty content" });
  }

  const result = { text };
  if (isFlagged) {
    result.flagged = true;
    result.categories = flaggedCategories;
  }
  return res.json(result);
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok" }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Verity] Server running on port ${PORT}`));
