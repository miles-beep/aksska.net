(() => {
  const DOMAIN_HOST_RE = /^https?:\/\/(?:www\.)?aksska\.net/i;
  const WAYBACK_WRAP_RE = /^https?:\/\/web\.archive\.org\/web\/\d{6,14}(?:[a-z_]+)?\/(https?:\/\/.+)$/i;
  const WAYBACK_WRAP_REL_RE = /^\/web\/\d{6,14}(?:[a-z_]+)?\/(https?:\/\/.+)$/i;
  const SUPPORTED_LANGS = new Set(["ko", "en"]);
  const STORAGE_KEY = "aksska_lang";

  function decodeHref(href) {
    if (!href) return href;
    let out = href.trim();

    const wbAbs = out.match(WAYBACK_WRAP_RE);
    if (wbAbs) out = wbAbs[1];

    const wbRel = out.match(WAYBACK_WRAP_REL_RE);
    if (wbRel) out = wbRel[1];

    const wbMailto = out.match(/^https?:\/\/web\.archive\.org\/web\/\d{6,14}(?:[a-z_]+)?\/(mailto:.+)$/i);
    if (wbMailto) out = wbMailto[1];

    if (DOMAIN_HOST_RE.test(out)) {
      try {
        const u = new URL(out);
        out = u.pathname + u.search + u.hash;
      } catch {
        // no-op
      }
    }

    return out;
  }

  function normalizeAnchors() {
    const anchors = document.querySelectorAll("a[href]");
    for (const a of anchors) {
      const href = a.getAttribute("href");
      const normalized = decodeHref(href || "");
      if (normalized && normalized !== href) {
        a.setAttribute("href", normalized);
      }
    }
  }

  function normalizeAssets() {
    const elements = document.querySelectorAll("[src], [href]");
    for (const el of elements) {
      if (el.hasAttribute("src")) {
        const src = el.getAttribute("src");
        const normalized = decodeHref(src || "");
        if (normalized && normalized !== src) {
          el.setAttribute("src", normalized);
        }
      }

      if (el.hasAttribute("href")) {
        const href = el.getAttribute("href");
        const normalized = decodeHref(href || "");
        if (normalized && normalized !== href) {
          el.setAttribute("href", normalized);
        }
      }
    }
  }

  function improveForms() {
    const forms = document.querySelectorAll("form");
    for (const form of forms) {
      const action = (form.getAttribute("action") || "").trim();
      const hasAction = action.length > 0 && action !== "#";
      if (hasAction) continue;

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        window.alert("Form submission is not available in this restored archive site yet.");
      });
    }
  }

  function detectLanguage() {
    const params = new URLSearchParams(window.location.search);
    const queryLang = (params.get("lang") || "").toLowerCase();
    if (SUPPORTED_LANGS.has(queryLang)) return queryLang;

    const savedLang = (window.localStorage.getItem(STORAGE_KEY) || "").toLowerCase();
    if (SUPPORTED_LANGS.has(savedLang)) return savedLang;

    const preferred = (navigator.language || "").toLowerCase();
    if (preferred.startsWith("ko")) return "ko";

    const preferredList = Array.isArray(navigator.languages) ? navigator.languages : [];
    if (preferredList.some((lang) => String(lang).toLowerCase().startsWith("ko"))) return "ko";

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.toLowerCase().includes("seoul")) return "ko";

    return "en";
  }

  async function loadDictionaries() {
    try {
      const [koRes, enRes] = await Promise.all([
        fetch("/i18n/ko.json", { cache: "no-cache" }),
        fetch("/i18n/en.json", { cache: "no-cache" }),
      ]);
      if (!koRes.ok || !enRes.ok) return null;
      const [ko, en] = await Promise.all([koRes.json(), enRes.json()]);
      return { ko, en };
    } catch {
      return null;
    }
  }

  function replaceTextNode(textNode, phraseMap) {
    const raw = textNode.nodeValue;
    if (!raw) return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const next = phraseMap[trimmed];
    if (!next || next === trimmed) return;
    textNode.nodeValue = raw.replace(trimmed, next);
  }

  function applyLanguage(lang, dictionaries) {
    const dict = dictionaries?.[lang];
    const phraseMap = dict?.phrases || {};
    document.documentElement.lang = lang;

    if (phraseMap[document.title]) {
      document.title = phraseMap[document.title];
    }

    const textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const blockedTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);

    while (textWalker.nextNode()) {
      const node = textWalker.currentNode;
      const parent = node.parentElement;
      if (!parent || blockedTags.has(parent.tagName)) continue;
      replaceTextNode(node, phraseMap);
    }

    const placeholders = document.querySelectorAll("[placeholder]");
    for (const el of placeholders) {
      const placeholder = el.getAttribute("placeholder");
      const next = phraseMap[placeholder || ""];
      if (next) el.setAttribute("placeholder", next);
    }

    const valueInputs = document.querySelectorAll("input[value], button[value]");
    for (const el of valueInputs) {
      const value = el.getAttribute("value");
      const next = phraseMap[value || ""];
      if (next) el.setAttribute("value", next);
    }
  }

  function renderLanguageSwitcher(currentLang, dictionaries) {
    if (!dictionaries) return;
    const wrap = document.createElement("div");
    wrap.setAttribute("id", "aksska-lang-switcher");
    wrap.style.cssText =
      "position:fixed;right:12px;bottom:12px;z-index:99999;display:flex;gap:4px;background:#111;padding:4px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.35);";

    for (const lang of ["ko", "en"]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = lang.toUpperCase();
      const isActive = lang === currentLang;
      btn.style.cssText =
        `border:none;border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;` +
        (isActive ? "background:#4f46e5;color:#fff;" : "background:#e5e7eb;color:#111;");
      btn.addEventListener("click", () => {
        window.localStorage.setItem(STORAGE_KEY, lang);
        const url = new URL(window.location.href);
        url.searchParams.set("lang", lang);
        window.location.href = url.toString();
      });
      wrap.appendChild(btn);
    }

    document.body.appendChild(wrap);
  }

  document.addEventListener("DOMContentLoaded", () => {
    normalizeAssets();
    normalizeAnchors();
    improveForms();
    loadDictionaries().then((dictionaries) => {
      if (!dictionaries) return;
      const lang = detectLanguage();
      applyLanguage(lang, dictionaries);
      renderLanguageSwitcher(lang, dictionaries);
    });
  });
})();
