const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* =========================================================
   PipFury path helper
   Works on:
   - GitHub Pages repo path: https://pipfury.github.io/premium/
   - Cloudflare/root path:   https://pipfury.pages.dev/
========================================================= */

function isGitHubPremium() {
  return location.hostname.endsWith("github.io") &&
         location.pathname.split("/").filter(Boolean)[0] === "premium";
}

function rootPath() {
  return isGitHubPremium() ? "/premium/" : "/";
}

function pageDepthPrefix() {
  const parts = location.pathname.split("/").filter(Boolean);

  if (isGitHubPremium()) {
    // remove "premium"
    const inner = parts.slice(1);
    return inner.length > 0 ? "../" : "";
  }

  return parts.length > 0 ? "../" : "";
}

function dataPath(fileName) {
  return pageDepthPrefix() + "data/" + fileName;
}

function siteUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return rootPath() + clean;
}

function loadJSON(path) {
  return fetch(path).then((r) => {
    if (!r.ok) throw new Error("Could not load " + path);
    return r.json();
  });
}

/* =========================================================
   Mobile menu
========================================================= */

$("#menuBtn")?.addEventListener("click", () => {
  $("#navLinks")?.classList.toggle("open");
});

/* =========================================================
   Normalize links for GitHub Pages
========================================================= */

function normalizeGitHubPagesLinks() {
  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");

    if (
      !href ||
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("#") ||
      href.startsWith("../") ||
      href.startsWith("./")
    ) {
      return;
    }

    // Fix links beginning with "/" on GitHub Pages.
    if (href.startsWith("/")) {
      a.setAttribute("href", siteUrl(href));
      return;
    }

    // On GitHub homepage, normal relative links are already fine.
    // Example: vsa-course/ resolves to /premium/vsa-course/
  });
}

/* =========================================================
   Social links
========================================================= */

function renderSocials() {
  const box = $("[data-socials]");
  if (!box) return;

  loadJSON(dataPath("social-links.json"))
    .then((items) => {
      box.innerHTML = items
        .map(
          (x) =>
            `<a class="btn" href="${x.url}" target="_blank" rel="noopener">${x.name}</a>`
        )
        .join("");
    })
    .catch(() => {
      box.innerHTML = `<span class="muted">Social links will appear here after data is added.</span>`;
    });
}

/* =========================================================
   Risk calculator
========================================================= */

function riskCalc() {
  const out = $("#riskOut");
  if (!out) return;

  const bal = parseFloat($("#balance")?.value) || 0;
  const risk = parseFloat($("#risk")?.value) || 0;
  const stop = parseFloat($("#stop")?.value) || 0;
  const pip = parseFloat($("#pipvalue")?.value) || 10;

  const amt = (bal * risk) / 100;
  const lots = stop > 0 && pip > 0 ? amt / (stop * pip) : 0;

  out.innerHTML = `
    Risk amount: <strong>$${amt.toFixed(2)}</strong><br>
    Suggested lot estimate: <strong>${lots.toFixed(2)}</strong><br>
    <span class="muted">Educational estimate only. Confirm contract size and broker specifications.</span>
  `;
}

["balance", "risk", "stop", "pipvalue"].forEach((id) => {
  $("#" + id)?.addEventListener("input", riskCalc);
});

/* =========================================================
   VSA candle reader
========================================================= */

function candleRead() {
  const out = $("#candleOut");
  if (!out) return;

  const dir = $("#barDirection")?.value;
  const spread = $("#spread")?.value;
  const vol = $("#volume")?.value;
  const close = $("#close")?.value;
  const bg = $("#background")?.value;

  let text = "Read the bar in context. A single candle is never enough without background, level, and confirmation.";

  if (dir === "up" && spread === "narrow" && vol === "low" && bg === "weak") {
    text = "Possible No Demand: a narrow up bar on low volume in weak background. Wait for the next bar to confirm weakness.";
  } else if (dir === "down" && spread === "narrow" && vol === "low" && bg === "strong") {
    text = "Possible No Supply: a narrow down bar on low volume in strong background. Wait for confirmation before judging strength.";
  } else if (dir === "down" && vol === "ultra" && close !== "low") {
    text = "Possible Stopping Volume: heavy activity with poor downside result. Wait for a test or confirmation; do not enter blindly.";
  } else if (dir === "up" && vol === "ultra" && close !== "high") {
    text = "Possible supply entering: high activity but the bar fails to close strongly. Check resistance and background.";
  }

  out.textContent = text;
}

["barDirection", "spread", "volume", "close", "background"].forEach((id) => {
  $("#" + id)?.addEventListener("change", candleRead);
});

/* =========================================================
   Practice quiz
========================================================= */

async function quiz() {
  const box = $("#quizBox");
  if (!box) return;

  const data = await loadJSON(dataPath("vsa-quizzes.json")).catch(() => []);

  if (!data.length) {
    box.innerHTML = `<p class="muted">Quiz data will appear here after more questions are added.</p>`;
    return;
  }

  box.innerHTML = data
    .map(
      (q, i) => `
        <div class="card">
          <h3>Question ${i + 1}</h3>
          <p>${q.q || q.question || ""}</p>
          ${(q.options || [])
            .map(
              (o) =>
                `<button class="quiz-option" data-answer="${q.answer}" data-explain="${q.explain || q.explanation || ""}">${o}</button>`
            )
            .join("")}
          <div class="muted quizExplain"></div>
        </div>
      `
    )
    .join("");

  $$(".quiz-option").forEach((b) => {
    b.onclick = () => {
      const ok = b.textContent === b.dataset.answer;
      b.classList.add(ok ? "correct" : "wrong");
      b.parentElement.querySelector(".quizExplain").textContent =
        (ok ? "Correct. " : "Review: ") + (b.dataset.explain || "");
    };
  });
}

/* =========================================================
   Site search
========================================================= */

async function searchSite() {
  const input = $("#siteSearch");
  const res = $("#searchResults");
  if (!input || !res) return;

  const files = [
    "vsa-modules",
    "vsa-lessons",
    "vsa-signals",
    "vsa-case-files",
    "vsa-mistakes",
    "vsa-glossary",
    "resources",
    "trial-classes"
  ];

  let all = [];

  for (const f of files) {
    try {
      const d = await loadJSON(dataPath(f + ".json"));
      all = all.concat(d.map((x) => ({ section: f, ...x })));
    } catch (e) {}
  }

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase().trim();

    if (!q) {
      res.innerHTML =
        '<p class="muted">Type a term such as no demand, stopping volume, test, background, or journal.</p>';
      return;
    }

    const m = all
      .filter((x) => JSON.stringify(x).toLowerCase().includes(q))
      .slice(0, 30);

    res.innerHTML =
      m
        .map(
          (x) => `
            <div class="item">
              <div>
                <strong>${x.title || x.name || x.term || x.market || x.section}</strong>
                <p class="muted">${
                  x.desc ||
                  x.definition ||
                  x.simpleDefinition ||
                  x.simple ||
                  x.lesson ||
                  x.focus ||
                  x.fix ||
                  x.coreIdea ||
                  ""
                }</p>
              </div>
              <span class="pill">${x.section}</span>
            </div>
          `
        )
        .join("") || "<p>No result found. Add more data in JSON later.</p>";
  });
}

/* =========================================================
   Homepage module cards
========================================================= */

function renderLegacyModuleCards() {
  const box = document.querySelector("[data-modules]");
  if (!box) return;

  loadJSON(dataPath("vsa-modules.json"))
    .then((mods) => {
      box.innerHTML = mods
        .map((m, idx) => {
          const id = m.id || `module-${String(idx + 1).padStart(2, "0")}`;
          const title = m.title || `Module ${idx + 1}`;
          const level = m.level || `Level ${String(idx + 1).padStart(2, "0")}`;
          const desc = m.desc || m.summary || m.description || "";
          const count = m.lessonCount || m.lessons || 0;

          const href = siteUrl(`vsa-course/?module=${encodeURIComponent(id)}#lesson-library`);

          return `
            <a class="card card-link module-link-card" href="${href}" aria-label="Open ${title}">
              <span class="tag">${level}</span>
              <h3>${title}</h3>
              <p class="muted">${desc}</p>
              <div class="pill-row">
                <span class="pill">${count} lessons</span>
                <span class="pill">Open module</span>
              </div>
            </a>
          `;
        })
        .join("");
    })
    .catch(() => {});
}

/* =========================================================
   Course page lesson rendering
========================================================= */

async function renderCourseLessons() {
  const moduleBox = $("#courseModules");
  const lessonBox = $("#lessonLibrary");

  if (!moduleBox && !lessonBox) return;

  const modules = await loadJSON(dataPath("vsa-modules.json")).catch(() => []);
  const lessons = await loadJSON(dataPath("vsa-lessons.json")).catch(() => []);

  const params = new URLSearchParams(location.search);
  const selectedModule = params.get("module") || "all";

  if (moduleBox) {
    moduleBox.innerHTML = `
      <button class="filter-btn ${selectedModule === "all" ? "active" : ""}" data-module="all">All Modules</button>
      ${modules
        .map(
          (m) =>
            `<button class="filter-btn ${selectedModule === m.id ? "active" : ""}" data-module="${m.id}">${m.title}</button>`
        )
        .join("")}
    `;

    $$(".filter-btn", moduleBox).forEach((btn) => {
      btn.addEventListener("click", () => {
        const mod = btn.dataset.module;
        location.href =
          mod === "all"
            ? siteUrl("vsa-course/")
            : siteUrl(`vsa-course/?module=${encodeURIComponent(mod)}#lesson-library`);
      });
    });
  }

  function lessonTitle(l, i) {
    return l.title || l.name || `Lesson ${i + 1}`;
  }

  function lessonModule(l) {
    return l.moduleId || l.module || "";
  }

  function renderLessons(list) {
    if (!lessonBox) return;

    if (!list.length) {
      lessonBox.innerHTML = `<p class="muted">No lessons found for this module yet.</p>`;
      return;
    }

    lessonBox.innerHTML = list
      .map(
        (l, i) => `
          <details class="card lesson-card">
            <summary>
              <span>
                <strong>${lessonTitle(l, i)}</strong>
                <small class="muted">${l.level || ""} ${l.estimatedMinutes ? "• " + l.estimatedMinutes + " min" : ""}</small>
              </span>
              <span class="pill">Open</span>
            </summary>

            <div class="lesson-body">
              <h4>Core idea</h4>
              <p>${l.coreIdea || ""}</p>

              <h4>Chart reading commentary</h4>
              <p>${l.chartCommentary || l.conceptExplanation || l.whyItMatters || ""}</p>

              ${
                l.chartScenario
                  ? `<div class="chart-note"><strong>Chart scenario:</strong> ${l.chartScenario}</div>`
                  : ""
              }

              ${
                Array.isArray(l.vsaReadingRules)
                  ? `<h4>VSA reading rules</h4><ul>${l.vsaReadingRules.map((x) => `<li>${x}</li>`).join("")}</ul>`
                  : ""
              }

              ${
                Array.isArray(l.chartReadingSteps)
                  ? `<h4>Chart reading steps</h4><ol>${l.chartReadingSteps.map((x) => `<li>${x}</li>`).join("")}</ol>`
                  : ""
              }

              ${
                Array.isArray(l.commonMistakes)
                  ? `<h4>Common mistakes</h4><ul>${l.commonMistakes.map((x) => `<li>${x}</li>`).join("")}</ul>`
                  : ""
              }

              ${
                l.practiceTask
                  ? `<h4>Practice task</h4><p>${l.practiceTask}</p>`
                  : ""
              }

              ${
                l.keyTakeaway
                  ? `<h4>Key takeaway</h4><p>${l.keyTakeaway}</p>`
                  : ""
              }

              ${
                l.riskNote
                  ? `<p class="muted"><strong>Risk note:</strong> ${l.riskNote}</p>`
                  : ""
              }
            </div>
          </details>
        `
      )
      .join("");
  }

  const filtered =
    selectedModule === "all"
      ? lessons
      : lessons.filter((l) => lessonModule(l) === selectedModule);

  renderLessons(filtered);

  const search = $("#lessonSearch");
  const level = $("#lessonLevel");

  function applyLessonFilters() {
    let list =
      selectedModule === "all"
        ? lessons
        : lessons.filter((l) => lessonModule(l) === selectedModule);

    const q = search?.value.toLowerCase().trim() || "";
    const lev = level?.value || "all";

    if (q) {
      list = list.filter((l) => JSON.stringify(l).toLowerCase().includes(q));
    }

    if (lev !== "all") {
      list = list.filter((l) => String(l.level || "").toLowerCase() === lev.toLowerCase());
    }

    renderLessons(list);
  }

  search?.addEventListener("input", applyLessonFilters);
  level?.addEventListener("change", applyLessonFilters);
}

/* =========================================================
   Init
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  normalizeGitHubPagesLinks();
  renderSocials();
  riskCalc();
  candleRead();
  quiz();
  searchSite();
  renderLegacyModuleCards();
  renderCourseLessons();
});
