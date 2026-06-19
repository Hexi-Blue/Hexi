/**
 * Hexi report proxy — Cloudflare Worker
 *
 * Required bindings (set in Worker Settings):
 *   Secret  DISCORD_WEBHOOK  — your Discord webhook URL
 *   KV      RATE_LIMIT       — a KV namespace bound as "RATE_LIMIT"
 */

const COOLDOWN_SEC = 600; // 10 minutes

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
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

  // Check required bindings exist
  if (typeof DISCORD_WEBHOOK === "undefined") {
    return new Response("DISCORD_WEBHOOK secret not set", { status: 500, headers: cors });
  }

  // Server-side rate limit by IP
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const rlKey = `rl:${ip}`;

  if (typeof RATE_LIMIT !== "undefined") {
    const hit = await RATE_LIMIT.get(rlKey);
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

  const discordRes = await fetch(DISCORD_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if ((discordRes.ok || discordRes.status === 204) && typeof RATE_LIMIT !== "undefined") {
    await RATE_LIMIT.put(rlKey, "1", { expirationTtl: COOLDOWN_SEC });
  }

  return new Response(null, {
    status: discordRes.status,
    headers: cors,
  });
}
