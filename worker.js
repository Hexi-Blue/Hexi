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
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    if (!env.DISCORD_WEBHOOK) {
      return new Response("DISCORD_WEBHOOK secret not configured", { status: 500, headers: corsHeaders });
    }

    // Server-side rate limit by IP (only if KV is bound)
    if (env.RATE_LIMIT) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const hit = await env.RATE_LIMIT.get("rl:" + ip);
      if (hit) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders),
        });
      }
    }

    var payload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response("Bad request", { status: 400, headers: corsHeaders });
    }

    var discordRes = await fetch(env.DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if ((discordRes.ok || discordRes.status === 204) && env.RATE_LIMIT) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      await env.RATE_LIMIT.put("rl:" + ip, "1", { expirationTtl: COOLDOWN_SEC });
    }

    return new Response(null, {
      status: discordRes.status,
      headers: corsHeaders,
    });
  },
};
