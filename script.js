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

      // Meta row: downloads + loader
      const meta = document.createElement("div");
      meta.className = "card-meta";
      const loader = (p.loaders && p.loaders[0]) ? p.loaders[0] : "Fabric";
      meta.innerHTML =
        `<span>⬇ <strong>${p.downloads.toLocaleString()}</strong> downloads</span>` +
        `<span>🧩 ${loader.charAt(0).toUpperCase() + loader.slice(1)}</span>`;
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