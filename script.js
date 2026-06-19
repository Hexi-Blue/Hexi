/* ============================================================
   Hexi mod site — automatic mod loading + view counter.
   You normally never need to touch this file.
   ============================================================ */

/* ---------- 1. Footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();


/* ---------- 2. Load mods live from Modrinth ----------
   This asks Modrinth for every project on the Hexi account
   and builds a card for each. New mods show up on their own. */

const MODRINTH_USER = "Hexi";   // <- your Modrinth username

async function loadMods() {
  const mods = document.getElementById("mods");
  const status = document.getElementById("status");

  try {
    const res = await fetch(`https://api.modrinth.com/v2/user/${MODRINTH_USER}/projects`);
    if (!res.ok) throw new Error("Modrinth request failed");
    const projects = await res.json();

    // Show the most-downloaded mods first
    projects.sort((a, b) => b.downloads - a.downloads);

    status.remove();   // clear the "Loading…" text

    projects.forEach((p) => {
      const url = `https://modrinth.com/mod/${p.slug}`;

      const card = document.createElement("article");
      card.className = "card";

      // Mod icon (if the project has one)
      if (p.icon_url) {
        const icon = document.createElement("img");
        icon.className = "card-icon";
        icon.src = p.icon_url;
        icon.alt = "";
        card.appendChild(icon);
      }

      // Title
      const title = document.createElement("h2");
      title.className = "card-title";
      title.textContent = p.title;
      card.appendChild(title);

      // Description (Modrinth's short summary)
      const desc = document.createElement("p");
      desc.className = "card-desc";
      desc.textContent = p.description;
      card.appendChild(desc);

      // Meta row: downloads + loader + MC version + last updated
      const meta = document.createElement("div");
      meta.className = "card-meta";
      const loader = (p.loaders && p.loaders[0]) ? p.loaders[0] : "Fabric";
      const latestVersion = p.game_versions && p.game_versions.length
        ? p.game_versions[p.game_versions.length - 1]
        : null;
      const updatedDate = p.updated
        ? new Date(p.updated).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : null;
      meta.innerHTML =
        `<span>⬇ <strong>${p.downloads.toLocaleString()}</strong> downloads</span>` +
        `<span>🧩 ${loader.charAt(0).toUpperCase() + loader.slice(1)}</span>` +
        (latestVersion ? `<span>🎮 MC ${latestVersion}</span>` : "") +
        (updatedDate ? `<span>🕒 Updated ${updatedDate}</span>` : "");
      card.appendChild(meta);

      // Download link
      const link = document.createElement("a");
      link.className = "card-link";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Download on Modrinth →";
      card.appendChild(link);

      mods.appendChild(card);
    });

    if (projects.length === 0) {
      mods.innerHTML = '<p class="status">No mods published yet — check back soon!</p>';
    }
  } catch (err) {
    status.textContent = "Couldn't load mods right now. See them all on Modrinth →";
    status.style.cursor = "pointer";
    status.onclick = () => window.open(`https://modrinth.com/user/${MODRINTH_USER}`, "_blank");
  }
}
loadMods();


/* ---------- 3. View counter ----------
   A static site can't count visits itself, so this uses a free
   counter service (counterapi.dev) to store the running total. */

const viewsEl = document.getElementById("views");
const NS = "hexi-blue-github-io";   // your "namespace" (any unique label)
const KEY = "page-views";           // the counter's name

async function countView() {
  try {
    // Only add +1 once per browsing session, then just read the total
    const firstVisit = !sessionStorage.getItem("counted");
    const action = firstVisit ? "up" : "";   // "up" adds 1; "" just reads
    const res = await fetch(`https://api.counterapi.dev/v1/${NS}/${KEY}/${action}`);
    const data = await res.json();
    if (firstVisit) sessionStorage.setItem("counted", "1");

    const n = data.count ?? data.Count ?? data.value ?? 0;
    viewsEl.textContent = `👁 ${Number(n).toLocaleString()} views`;
  } catch (err) {
    viewsEl.textContent = "";   // hide it if the service is unreachable
  }
}
countView();


/* ---------- 4. Bug / feedback report widget ---------- */
const WEBHOOK_URL   = "https://discord.com/api/webhooks/1517045893914693724/shAfSPEEKQ3V9bxEesXpwfSCFNE1ako_lZqdRQia-r5-WKz7qV3e6ncOVCVuba5_Zllg";
const REPORT_CD_MS  = 10 * 60 * 1000;
const REPORT_CD_KEY = "report-last-sent";

const reportBtn    = document.getElementById("reportBtn");
const reportBubble = document.getElementById("reportBubble");
const reportPanel  = document.getElementById("reportPanel");
const reportClose  = document.getElementById("reportClose");
const reportForm   = document.getElementById("reportForm");
const reportSubmit = document.getElementById("reportSubmit");
const reportStatus = document.getElementById("reportStatus");

let cdTimer = null;
let _lastSentMs = 0; // in-memory; survives storage.clear() for the lifetime of the page

// Show the speech bubble 1s after load, auto-dismiss after 5s
setTimeout(() => {
  reportBubble.classList.add("visible");
  setTimeout(() => reportBubble.classList.remove("visible"), 5000);
}, 1000);

function msLeft() {
  const fromLocal   = parseInt(localStorage.getItem(REPORT_CD_KEY)   || "0", 10);
  const fromSession = parseInt(sessionStorage.getItem(REPORT_CD_KEY) || "0", 10);
  const last = Math.max(_lastSentMs, fromLocal, fromSession);
  return Math.max(0, REPORT_CD_MS - (Date.now() - last));
}

function fmtMs(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.ceil((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function tickCooldown() {
  clearTimeout(cdTimer);
  const rem = msLeft();
  if (rem > 0) {
    reportSubmit.disabled = true;
    reportStatus.style.color = "";
    reportStatus.textContent = `⏳ Wait ${fmtMs(rem)} before sending again.`;
    cdTimer = setTimeout(tickCooldown, 1000);
  } else {
    reportSubmit.disabled = false;
  }
}

reportBtn.addEventListener("click", () => {
  reportBubble.classList.remove("visible");
  const opening = reportPanel.hidden;
  reportPanel.hidden = !opening;
  if (opening) tickCooldown();
});

reportClose.addEventListener("click", () => {
  reportPanel.hidden = true;
  clearTimeout(cdTimer);
});

document.addEventListener("click", (e) => {
  if (!reportPanel.hidden && !reportPanel.contains(e.target) && e.target !== reportBtn) {
    reportPanel.hidden = true;
    clearTimeout(cdTimer);
  }
});

reportForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (msLeft() > 0) return;

  const type  = document.getElementById("reportType").value;
  const title = document.getElementById("reportTitle").value.trim();
  const desc  = document.getElementById("reportDesc").value.trim();
  if (!title || !desc) return;

  const labels = { bug: "🐛 Bug", feedback: "💬 Feedback", other: "📝 Other" };
  const colors = { bug: 0xe74c3c, feedback: 0x4f9cff, other: 0x8a5bff };

  reportSubmit.disabled = true;
  reportStatus.style.color = "";
  reportStatus.textContent = "Sending…";

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: `${labels[type]}: ${title}`,
          description: desc,
          color: colors[type],
          footer: { text: `hexi-site report · ${new Date().toUTCString()}` }
        }]
      })
    });

    if (res.ok || res.status === 204) {
      const now = Date.now();
      _lastSentMs = now;
      localStorage.setItem(REPORT_CD_KEY, String(now));
      sessionStorage.setItem(REPORT_CD_KEY, String(now));
      reportForm.reset();
      reportStatus.style.color = "var(--accent)";
      reportStatus.textContent = "✅ Sent — thanks!";
      setTimeout(tickCooldown, 2500);
    } else {
      throw new Error("non-2xx");
    }
  } catch {
    reportStatus.style.color = "#e74c3c";
    reportStatus.textContent = "❌ Couldn't send — try again.";
    reportSubmit.disabled = false;
  }
});