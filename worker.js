/**
 * Hexi report proxy — Cloudflare Worker
 *
 * Keeps the Discord webhook URL secret (stored as env var DISCORD_WEBHOOK).
 * Rate-limits submissions to one per IP per 10 minutes using a KV namespace
 * bound as RATE_LIMIT.
 *
 * Required Worker bindings:
 *   Secret  DISCORD_WEBHOOK  — your Discord webhook URL
 *   KV      RATE_LIMIT       — a KV namespace (any name)
 */

const COOLDOWN_SEC = 600; // 10 minutes

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    // Server-side rate limit by IP
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const rlKey = `rl:${ip}`;

    const already = await env.RATE_LIMIT.get(rlKey);
    if (already) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response("Bad request", { status: 400, headers: cors });
    }

    const discordRes = await fetch(env.DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (discordRes.ok || discordRes.status === 204) {
      await env.RATE_LIMIT.put(rlKey, "1", { expirationTtl: COOLDOWN_SEC });
    }

    return new Response(null, {
      status: discordRes.status,
      headers: cors,
    });
  },
};
