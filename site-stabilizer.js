(() => {
  const DOMAIN_HOST_RE = /^https?:\/\/(?:www\.)?aksska\.net/i;
  const WAYBACK_WRAP_RE = /^https?:\/\/web\.archive\.org\/web\/\d{6,14}(?:[a-z_]+)?\/(https?:\/\/.+)$/i;
  const WAYBACK_WRAP_REL_RE = /^\/web\/\d{6,14}(?:[a-z_]+)?\/(https?:\/\/.+)$/i;
  const SUPPORTED_LANGS = new Set(["ko", "en"]);
  const STORAGE_KEY = "aksska_lang";
  const FALLBACK_THUMB = "/images/icons/no-imgs.jpg";

  const HOMEPAGE_LINKS = [
    { href: "/002", ko: "코로나19 국내현황", en: "COVID-19 Korea Status" },
    { href: "/001/32", ko: "쿠팡", en: "Coupang" },
    { href: "/005", ko: "TV홈쇼핑", en: "TV Home Shopping" },
    { href: "/?q=국민은행", ko: "국민은행", en: "Kookmin Bank" },
    { href: "/?q=중고나라", ko: "중고나라", en: "Used Market" },
    { href: "/notice", ko: "공지사항", en: "Notices" },
    { href: "/?m=hot", ko: "실시간 인기글", en: "Trending Now" },
    { href: "/content/company", ko: "회사소개", en: "About Us" },
    { href: "/content/%EB%A7%81%ED%81%AC%EB%93%B1%EB%A1%9D%EC%8B%A0%EC%B2%AD/", ko: "링크등록신청", en: "Link Submission" }
  ];

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

  function ensureHomepageUsable(lang) {
    const pathname = window.location.pathname || "/";
    if (pathname !== "/") return;

    const hostNode = document.querySelector("main .wrap-items");
    if (!hostNode) return;

    if (document.getElementById("aksska-fallback-grid")) return;

    const style = document.createElement("style");
    style.textContent = `
      .aksska-fallback-wrap { margin-top: 12px; }
      .aksska-fallback-title {
        margin: 10px 0 12px;
        font-size: 18px;
        font-weight: 700;
        color: #2a2b45;
      }
      .aksska-fallback-subtitle {
        margin: 2px 0 14px;
        font-size: 13px;
        color: #666;
      }
      .aksska-fallback-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
        gap: 12px;
      }
      .aksska-fallback-card {
        display: block;
        border: 1px solid #e4e4e4;
        border-radius: 10px;
        overflow: hidden;
        background: #fff;
        text-decoration: none;
      }
      .aksska-fallback-card:hover { box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); }
      .aksska-fallback-thumb {
        width: 100%;
        height: 92px;
        object-fit: cover;
        display: block;
      }
      .aksska-fallback-label {
        display: block;
        padding: 10px;
        font-size: 13px;
        font-weight: 600;
        color: #2f3147;
      }
      @media (max-width: 640px) {
        .aksska-fallback-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
      }
    `;
    document.head.appendChild(style);

    const cseRoot = hostNode.querySelector(".gcse-search");
    const wrap = document.createElement("section");
    wrap.className = "aksska-fallback-wrap";
    wrap.id = "aksska-fallback-grid";
    wrap.style.display = "none";

    const title = document.createElement("h3");
    title.className = "aksska-fallback-title";
    title.textContent = lang === "ko" ? "빠른 바로가기" : "Quick Access";
    wrap.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.className = "aksska-fallback-subtitle";
    subtitle.textContent =
      lang === "ko"
        ? "실시간 위젯이 비어 있을 때 사용할 수 있는 추천 링크입니다."
        : "Recommended links you can use when the live widget is empty.";
    wrap.appendChild(subtitle);

    const grid = document.createElement("div");
    grid.className = "aksska-fallback-grid";

    for (const item of HOMEPAGE_LINKS) {
      const card = document.createElement("a");
      card.className = "aksska-fallback-card";
      card.href = item.href;
      card.setAttribute("aria-label", lang === "ko" ? item.ko : item.en);

      const thumb = document.createElement("img");
      thumb.className = "aksska-fallback-thumb";
      thumb.src = FALLBACK_THUMB;
      thumb.alt = "";
      thumb.loading = "lazy";
      card.appendChild(thumb);

      const label = document.createElement("span");
      label.className = "aksska-fallback-label";
      label.textContent = lang === "ko" ? item.ko : item.en;
      card.appendChild(label);

      grid.appendChild(card);
    }

    wrap.appendChild(grid);
    hostNode.appendChild(wrap);

    window.setTimeout(() => {
      const hasGoogleWidget = Boolean(
        cseRoot &&
        (cseRoot.querySelector(".gsc-control-cse") ||
          cseRoot.querySelector("iframe") ||
          cseRoot.querySelector(".gsc-resultsbox-visible"))
      );
      wrap.style.display = hasGoogleWidget ? "none" : "block";
    }, 1500);
  }

  document.addEventListener("DOMContentLoaded", () => {
    normalizeAssets();
    normalizeAnchors();
    improveForms();
    loadDictionaries().then((dictionaries) => {
      const lang = detectLanguage();
      if (!dictionaries) {
        ensureHomepageUsable(lang);
        return;
      }
      applyLanguage(lang, dictionaries);
      renderLanguageSwitcher(lang, dictionaries);
      ensureHomepageUsable(lang);
    });
  });
})();
