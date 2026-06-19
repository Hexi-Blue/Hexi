/**
 * Hexi report proxy — Cloudflare Worker (ES module format)
 *
 * Required bindings (set in Worker → Settings):
 *   Secret  DISCORD_WEBHOOK  — your Discord webhook URL
 *   KV      RATE_LIMIT       — a KV namespace bound as "RATE_LIMIT"
 */

const COOLDOWN_SEC = 600;

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

    if (!env.DISCORD_WEBHOOK) {
      return new Response("DISCORD_WEBHOOK secret not configured", { status: 500, headers: cors });
    }

    // Server-side rate limit by IP (only if KV is bound)
    if (env.RATE_LIMIT) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const hit = await env.RATE_LIMIT.get(`rl:${ip}`);
      if (hit) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
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

    if ((discordRes.ok || discordRes.status === 204) && env.RATE_LIMIT) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      await env.RATE_LIMIT.put(`rl:${ip}`, "1", { expirationTtl: COOLDOWN_SEC });
    }

    return new Response(null, {
      status: discordRes.status,
      headers: cors,
    });
  },
};
